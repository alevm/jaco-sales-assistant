import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getPlatformFee } from "@/lib/marketplace-fees";
import type { Item, Marketplace } from "@/types/item";
import { z } from "zod";
import { validateBody } from "@/lib/schemas";

const SellItemSchema = z.object({
  sold_price: z.number().min(0, "sold_price must be >= 0"),
  marketplace: z.enum(["vinted", "ebay", "depop", "vestiaire", "wallapop", "subito", "facebook"]).optional(),
  shipping_cost: z.number().min(0).optional(),
  sold_at: z.string().optional(), // ISO date, defaults to now
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const raw = await request.json();
  const parsed = validateBody(SellItemSchema, raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const body = parsed.data;

  const item = db.prepare("SELECT * FROM items WHERE id = ?").get(id) as Item | undefined;
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const marketplace = (body.marketplace || item.marketplace) as Marketplace | null;
  const shippingCost = body.shipping_cost ?? item.shipping_cost ?? 0;
  const soldAt = body.sold_at || new Date().toISOString();

  db.prepare(`
    UPDATE items SET
      status = 'sold',
      sold_price = ?,
      marketplace = ?,
      shipping_cost = ?,
      sold_at = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(body.sold_price, marketplace, shippingCost, soldAt, id);

  // Calculate margin
  const fee = getPlatformFee(marketplace, body.sold_price);
  const cogs = item.cogs || 0;
  const margin = body.sold_price - cogs - fee - shippingCost;

  const updated = db.prepare("SELECT * FROM items WHERE id = ?").get(id) as Item;

  return NextResponse.json({
    ...updated,
    image_paths: JSON.parse(updated.image_paths || "[]"),
    margin_report: {
      sold_price: body.sold_price,
      cogs,
      platform_fee: Math.round(fee * 100) / 100,
      shipping_cost: shippingCost,
      net_margin: Math.round(margin * 100) / 100,
      margin_percent: body.sold_price > 0 ? Math.round((margin / body.sold_price) * 10000) / 100 : 0,
      marketplace: marketplace || "unknown",
    },
  });
}
