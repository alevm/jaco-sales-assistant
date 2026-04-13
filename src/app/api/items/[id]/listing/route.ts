import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { formatListing, LISTING_PLATFORMS } from "@/lib/listing-formatter";
import type { Item, ItemWithTags, Marketplace, Tag } from "@/types/item";
import { z } from "zod";
import { validateBody } from "@/lib/schemas";

const GenerateListingSchema = z.object({
  platform: z.enum(["vinted", "ebay", "depop", "vestiaire", "wallapop", "subito", "facebook"]),
});

const MarkListedSchema = z.object({
  platform: z.enum(["vinted", "ebay", "depop", "vestiaire", "wallapop", "subito", "facebook"]),
});

/** GET /api/items/:id/listing?platform=vinted
 *  Generate a formatted listing for the given platform
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const url = request.nextUrl;
  const platform = url.searchParams.get("platform") as Marketplace | null;

  const item = db.prepare("SELECT * FROM items WHERE id = ?").get(id) as Item | undefined;
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const tags = db.prepare("SELECT * FROM tags WHERE item_id = ?").all(id) as Tag[];
  const itemWithTags: ItemWithTags = { ...item, tags };

  if (platform) {
    const listing = formatListing(itemWithTags, platform);
    return NextResponse.json(listing);
  }

  // Generate for all 5 target platforms
  const listings = LISTING_PLATFORMS.map((p) => formatListing(itemWithTags, p));
  return NextResponse.json({ listings });
}

/** POST /api/items/:id/listing — mark item as listed on a platform */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const raw = await request.json();
  const parsed = validateBody(MarkListedSchema, raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const item = db.prepare("SELECT * FROM items WHERE id = ?").get(id) as Item | undefined;
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Parse existing listed_platforms
  let platforms: string[] = [];
  try {
    platforms = JSON.parse(item.listed_platforms || "[]");
  } catch {
    platforms = [];
  }

  const platform = parsed.data.platform;
  if (!platforms.includes(platform)) {
    platforms.push(platform);
  }

  db.prepare(`
    UPDATE items SET
      listed_platforms = ?,
      status = CASE WHEN status = 'draft' THEN 'listed' ELSE status END,
      marketplace = COALESCE(marketplace, ?),
      updated_at = datetime('now')
    WHERE id = ?
  `).run(JSON.stringify(platforms), platform, id);

  const updated = db.prepare("SELECT * FROM items WHERE id = ?").get(id) as Item;
  return NextResponse.json({
    ...updated,
    image_paths: JSON.parse(updated.image_paths || "[]"),
    listed_platforms: platforms,
  });
}

/** DELETE /api/items/:id/listing — remove item from a platform */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const url = request.nextUrl;
  const platform = url.searchParams.get("platform");

  if (!platform) {
    return NextResponse.json({ error: "platform query param required" }, { status: 400 });
  }

  const item = db.prepare("SELECT * FROM items WHERE id = ?").get(id) as Item | undefined;
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let platforms: string[] = [];
  try {
    platforms = JSON.parse(item.listed_platforms || "[]");
  } catch {
    platforms = [];
  }

  platforms = platforms.filter((p) => p !== platform);

  db.prepare(`
    UPDATE items SET listed_platforms = ?, updated_at = datetime('now') WHERE id = ?
  `).run(JSON.stringify(platforms), id);

  return NextResponse.json({ listed_platforms: platforms });
}
