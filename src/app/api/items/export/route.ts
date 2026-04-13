import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { Item, Tag, Marketplace } from "@/types/item";
import { MARKETPLACE_FEES } from "@/lib/marketplace-fees";

function escapeCSV(value: string | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  const db = getDb();
  const url = request.nextUrl;
  const format = url.searchParams.get("format") || "csv";
  const marketplace = url.searchParams.get("marketplace") as Marketplace | null;
  const status = url.searchParams.get("status") || "listed";
  const ids = url.searchParams.get("ids"); // comma-separated item IDs

  let query = "SELECT * FROM items WHERE 1=1";
  const params: unknown[] = [];

  if (ids) {
    const idList = ids.split(",").map((id) => id.trim()).filter(Boolean);
    if (idList.length === 0) {
      return NextResponse.json({ error: "No valid IDs provided" }, { status: 400 });
    }
    query += ` AND id IN (${idList.map(() => "?").join(",")})`;
    params.push(...idList);
  } else {
    if (status) {
      query += " AND status = ?";
      params.push(status);
    }
    if (marketplace) {
      query += " AND marketplace = ?";
      params.push(marketplace);
    }
  }

  query += " ORDER BY created_at DESC";

  const items = db.prepare(query).all(...params) as Item[];

  const tagStmt = db.prepare("SELECT * FROM tags WHERE item_id = ?");
  const itemsWithTags = items.map((item) => ({
    ...item,
    tags: tagStmt.all(item.id) as Tag[],
  }));

  if (format === "json") {
    const rows = itemsWithTags.map((item) => ({
      title: buildTitle(item),
      description: item.description_it || item.description_en || "",
      price: item.sale_price,
      brand: item.brand,
      size: item.size,
      condition: item.condition,
      color: item.color,
      marketplace: item.marketplace,
      tags: item.tags.map((t) => t.value).join(", "),
    }));
    return NextResponse.json(rows);
  }

  // CSV format
  const headers = ["Title", "Description", "Price", "Brand", "Size", "Condition", "Color", "Marketplace", "Tags"];
  const csvLines = [headers.join(",")];

  for (const item of itemsWithTags) {
    const title = buildTitle(item);
    const description = item.description_it || item.description_en || "";
    const tags = item.tags.map((t) => t.value).join("; ");

    csvLines.push(
      [
        escapeCSV(title),
        escapeCSV(description),
        escapeCSV(item.sale_price != null ? String(item.sale_price) : ""),
        escapeCSV(item.brand),
        escapeCSV(item.size),
        escapeCSV(item.condition),
        escapeCSV(item.color),
        escapeCSV(item.marketplace),
        escapeCSV(tags),
      ].join(",")
    );
  }

  const csv = csvLines.join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="listings-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

function buildTitle(item: Item): string {
  const parts: string[] = [];
  if (item.brand) parts.push(item.brand);
  if (item.item_type) parts.push(item.item_type);
  if (item.era) parts.push(item.era);
  if (item.color) parts.push(item.color);
  if (item.size) parts.push(`Taglia ${item.size}`);
  return parts.length > 0 ? parts.join(" - ") : `Item ${item.id.slice(0, 8)}`;
}
