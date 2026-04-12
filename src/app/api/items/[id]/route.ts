import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { deleteUpload } from "@/lib/upload";
import type { Item, Tag } from "@/types/item";
import { UpdateItemSchema, validateBody } from "@/lib/schemas";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  const item = db.prepare("SELECT * FROM items WHERE id = ?").get(id) as Item | undefined;
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const tags = db.prepare("SELECT * FROM tags WHERE item_id = ?").all(id) as Tag[];
  return NextResponse.json({
    ...item,
    tags,
    image_paths: JSON.parse(item.image_paths || "[]"),
  });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const raw = await request.json();
  const parsed = validateBody(UpdateItemSchema, raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const body = parsed.data;

  const existing = db.prepare("SELECT * FROM items WHERE id = ?").get(id) as Item | undefined;
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const fields: string[] = [];
  const values: unknown[] = [];

  const updatable = [
    "lot_id", "item_type", "brand", "era", "era_style", "material", "color", "size",
    "condition", "cogs", "sale_price", "sold_price", "shipping_cost", "marketplace", "status",
    "sold_at", "description_it", "description_en",
  ];

  for (const field of updatable) {
    if (field in body) {
      fields.push(`${field} = ?`);
      values.push((body as Record<string, unknown>)[field]);
    }
  }

  if (body.image_paths !== undefined) {
    fields.push("image_paths = ?");
    values.push(JSON.stringify(body.image_paths));
  }

  if (fields.length > 0) {
    fields.push("updated_at = datetime('now')");
    values.push(id);
    db.prepare(`UPDATE items SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  }

  // Update tags if provided
  if (body.tags && Array.isArray(body.tags)) {
    db.prepare("DELETE FROM tags WHERE item_id = ?").run(id);
    const tagStmt = db.prepare(
      "INSERT OR IGNORE INTO tags (item_id, category, value) VALUES (?, ?, ?)"
    );
    for (const tag of body.tags) {
      tagStmt.run(id, tag.category, tag.value);
    }
  }

  const updated = db.prepare("SELECT * FROM items WHERE id = ?").get(id) as Record<string, unknown>;
  const tags = db.prepare("SELECT * FROM tags WHERE item_id = ?").all(id);
  return NextResponse.json({ ...updated, tags });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();

  const item = db.prepare("SELECT * FROM items WHERE id = ?").get(id) as Item | undefined;
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Delete images from disk
  const imagePaths = JSON.parse(item.image_paths || "[]") as string[];
  for (const p of imagePaths) {
    deleteUpload(p);
  }

  db.prepare("DELETE FROM items WHERE id = ?").run(id);
  return NextResponse.json({ deleted: true });
}
