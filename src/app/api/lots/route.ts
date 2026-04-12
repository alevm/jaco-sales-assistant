import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { CreateLotSchema, validateBody } from "@/lib/schemas";

export async function GET() {
  const db = getDb();
  const lots = db
    .prepare(
      `SELECT l.*, COUNT(i.id) as item_count,
       CASE WHEN COUNT(i.id) > 0 THEN l.total_cogs / COUNT(i.id) ELSE 0 END as cogs_per_item
       FROM lots l LEFT JOIN items i ON i.lot_id = l.id
       GROUP BY l.id ORDER BY l.created_at DESC`
    )
    .all();
  return NextResponse.json(lots);
}

export async function POST(request: NextRequest) {
  const db = getDb();
  const raw = await request.json();
  const parsed = validateBody(CreateLotSchema, raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const body = parsed.data;
  const id = uuidv4();

  db.prepare("INSERT INTO lots (id, name, total_cogs, notes) VALUES (?, ?, ?, ?)").run(
    id,
    body.name,
    body.total_cogs,
    body.notes || null
  );

  const lot = db.prepare("SELECT * FROM lots WHERE id = ?").get(id);
  return NextResponse.json(lot, { status: 201 });
}
