import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { suggestPrice } from "@/lib/suggest-price";
import type { Item, Marketplace, RecognitionResult } from "@/types/item";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const body = await request.json();
  const marketplace = (body.marketplace || "vinted") as Marketplace;

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
        era_style: item.era_style || null,
        material: item.material || "unknown",
        color: item.color || "unknown",
        size: item.size,
        condition: item.condition || "good",
        tags: [],
        confidence: 0.5,
      };

  const suggestion = await suggestPrice(recognition, marketplace);
  return NextResponse.json(suggestion);
}
