import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { UpdateLotSchema, validateBody } from "@/lib/schemas";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  const lot = db
    .prepare(
      `SELECT l.*, COUNT(i.id) as item_count,
       CASE WHEN COUNT(i.id) > 0 THEN l.total_cogs / COUNT(i.id) ELSE 0 END as cogs_per_item
       FROM lots l LEFT JOIN items i ON i.lot_id = l.id
       WHERE l.id = ? GROUP BY l.id`
    )
    .get(id);

  if (!lot) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const items = db.prepare("SELECT * FROM items WHERE lot_id = ?").all(id);
  return NextResponse.json({ ...lot, items });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const raw = await request.json();
  const parsed = validateBody(UpdateLotSchema, raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const body = parsed.data;

  const existing = db.prepare("SELECT * FROM lots WHERE id = ?").get(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  db.prepare(
    "UPDATE lots SET name = ?, total_cogs = ?, notes = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(body.name, body.total_cogs, body.notes || null, id);

  // Auto-split COGS to items in lot
  if (body.auto_split_cogs) {
    const itemCount = (
      db.prepare("SELECT COUNT(*) as c FROM items WHERE lot_id = ?").get(id) as { c: number }
    ).c;
    if (itemCount > 0) {
      const perItem = body.total_cogs / itemCount;
      db.prepare("UPDATE items SET cogs = ?, updated_at = datetime('now') WHERE lot_id = ?").run(
        perItem,
        id
      );
    }
  }

  const updated = db.prepare("SELECT * FROM lots WHERE id = ?").get(id);
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();

  const existing = db.prepare("SELECT * FROM lots WHERE id = ?").get(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Unlink items (don't delete them)
  db.prepare("UPDATE items SET lot_id = NULL WHERE lot_id = ?").run(id);
  db.prepare("DELETE FROM lots WHERE id = ?").run(id);
  return NextResponse.json({ deleted: true });
}
