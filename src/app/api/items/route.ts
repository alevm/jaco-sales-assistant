import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import type { Item, Tag } from "@/types/item";
import { CreateItemSchema, validateBody } from "@/lib/schemas";

export async function GET(request: NextRequest) {
  const db = getDb();
  const url = request.nextUrl;
  const status = url.searchParams.get("status");
  const marketplace = url.searchParams.get("marketplace");
  const tag = url.searchParams.get("tag");
  const search = url.searchParams.get("q");

  let query = "SELECT * FROM items WHERE 1=1";
  const params: unknown[] = [];

  if (status) {
    query += " AND status = ?";
    params.push(status);
  }
  if (marketplace) {
    query += " AND marketplace = ?";
    params.push(marketplace);
  }
  if (tag) {
    query += " AND id IN (SELECT item_id FROM tags WHERE value = ?)";
    params.push(tag);
  }
  if (search) {
    query += " AND (item_type LIKE ? OR brand LIKE ? OR description_it LIKE ? OR description_en LIKE ?)";
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }

  query += " ORDER BY created_at DESC";

  const items = db.prepare(query).all(...params) as Item[];

  // Attach tags
  const tagStmt = db.prepare("SELECT * FROM tags WHERE item_id = ?");
  const itemsWithTags = items.map((item) => ({
    ...item,
    tags: tagStmt.all(item.id) as Tag[],
    image_paths: JSON.parse(item.image_paths || "[]"),
  }));

  return NextResponse.json(itemsWithTags);
}

export async function POST(request: NextRequest) {
  const db = getDb();
  const raw = await request.json();
  const parsed = validateBody(CreateItemSchema, raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const body = parsed.data;
  const id = uuidv4();

  const stmt = db.prepare(`
    INSERT INTO items (id, lot_id, item_type, brand, era, era_style, material, color, size, condition,
      cogs, sale_price, shipping_cost, marketplace, status, description_it, description_en,
      recognition_raw, image_paths)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    body.lot_id || null,
    body.item_type || null,
    body.brand || null,
    body.era || null,
    body.era_style || null,
    body.material || null,
    body.color || null,
    body.size || null,
    body.condition || null,
    body.cogs || null,
    body.sale_price || null,
    body.shipping_cost || 0,
    body.marketplace || null,
    body.status || "draft",
    body.description_it || null,
    body.description_en || null,
    body.recognition_raw ? JSON.stringify(body.recognition_raw) : null,
    JSON.stringify(body.image_paths)
  );

  // Insert tags
  if (body.tags && Array.isArray(body.tags)) {
    const tagStmt = db.prepare(
      "INSERT OR IGNORE INTO tags (item_id, category, value) VALUES (?, ?, ?)"
    );
    for (const tag of body.tags) {
      tagStmt.run(id, tag.category, tag.value);
    }
  }

  const item = db.prepare("SELECT * FROM items WHERE id = ?").get(id);
  return NextResponse.json(item, { status: 201 });
}
