import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { generateDescription } from "@/lib/describe";
import type { Item, Marketplace, RecognitionResult } from "@/types/item";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const body = await request.json();
  const marketplace = (body.marketplace || "vinted") as Marketplace;
  const locale = (body.locale || "it") as "it" | "en";

  const item = db.prepare("SELECT * FROM items WHERE id = ?").get(id) as Item | undefined;
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const recognition: RecognitionResult = item.recognition_raw
    ? JSON.parse(item.recognition_raw)
    : {
        item_type: item.item_type || "garment",
        brand: item.brand,
        era: item.era || "unknown",
        material: item.material || "unknown",
        color: item.color || "unknown",
        size: item.size,
        condition: item.condition || "good",
        tags: [],
        confidence: 0.5,
      };

  const description = await generateDescription(recognition, marketplace, locale);

  const field = locale === "it" ? "description_it" : "description_en";
  db.prepare(`UPDATE items SET ${field} = ?, updated_at = datetime('now') WHERE id = ?`).run(
    description,
    id
  );

  return NextResponse.json({ [field]: description });
}
