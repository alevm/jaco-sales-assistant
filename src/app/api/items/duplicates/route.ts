import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { Item, Tag } from "@/types/item";

export interface DuplicateMatch {
  item_id: string;
  item_type: string | null;
  brand: string | null;
  color: string | null;
  era: string | null;
  size: string | null;
  image_paths: string[];
  score: number;
  reasons: string[];
}

export interface DuplicateCheckResult {
  query_item_id?: string;
  query: {
    item_type: string | null;
    brand: string | null;
    color: string | null;
    era: string | null;
    size: string | null;
  };
  matches: DuplicateMatch[];
}

/**
 * Check for duplicate/similar items.
 *
 * GET /api/items/duplicates?item_id=xxx  — find duplicates for an existing item
 * GET /api/items/duplicates?item_type=jacket&brand=Nike&color=blue — find by attributes
 */
export async function GET(request: NextRequest) {
  const db = getDb();
  const url = request.nextUrl;
  const itemId = url.searchParams.get("item_id");

  let queryType: string | null = null;
  let queryBrand: string | null = null;
  let queryColor: string | null = null;
  let queryEra: string | null = null;
  let querySize: string | null = null;
  let excludeId: string | null = null;

  if (itemId) {
    const item = db.prepare("SELECT * FROM items WHERE id = ?").get(itemId) as Item | undefined;
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    queryType = item.item_type;
    queryBrand = item.brand;
    queryColor = item.color;
    queryEra = item.era;
    querySize = item.size;
    excludeId = itemId;
  } else {
    queryType = url.searchParams.get("item_type");
    queryBrand = url.searchParams.get("brand");
    queryColor = url.searchParams.get("color");
    queryEra = url.searchParams.get("era");
    querySize = url.searchParams.get("size");
  }

  if (!queryType && !queryBrand && !queryColor) {
    return NextResponse.json(
      { error: "Provide item_id or at least one of: item_type, brand, color" },
      { status: 400 }
    );
  }

  // Fetch candidate items (broad match on any overlapping attribute)
  let candidateQuery = "SELECT * FROM items WHERE status != 'sold'";
  const candidateParams: unknown[] = [];

  if (excludeId) {
    candidateQuery += " AND id != ?";
    candidateParams.push(excludeId);
  }

  // Build OR conditions for broad retrieval
  const orClauses: string[] = [];
  if (queryType) {
    orClauses.push("LOWER(item_type) = LOWER(?)");
    candidateParams.push(queryType);
  }
  if (queryBrand) {
    orClauses.push("LOWER(brand) = LOWER(?)");
    candidateParams.push(queryBrand);
  }
  if (queryColor) {
    orClauses.push("LOWER(color) LIKE LOWER(?)");
    candidateParams.push(`%${queryColor}%`);
  }

  if (orClauses.length > 0) {
    candidateQuery += ` AND (${orClauses.join(" OR ")})`;
  }

  const candidates = db.prepare(candidateQuery).all(...candidateParams) as Item[];

  // Score each candidate
  const matches: DuplicateMatch[] = [];

  for (const candidate of candidates) {
    let score = 0;
    const reasons: string[] = [];

    if (queryType && candidate.item_type &&
        candidate.item_type.toLowerCase() === queryType.toLowerCase()) {
      score += 30;
      reasons.push(`Same type: ${candidate.item_type}`);
    }

    if (queryBrand && candidate.brand &&
        candidate.brand.toLowerCase() === queryBrand.toLowerCase()) {
      score += 30;
      reasons.push(`Same brand: ${candidate.brand}`);
    }

    if (queryColor && candidate.color) {
      const qColors = queryColor.toLowerCase().split(/[\/,\s]+/);
      const cColors = candidate.color.toLowerCase().split(/[\/,\s]+/);
      const overlap = qColors.filter((c) => cColors.some((cc) => cc.includes(c) || c.includes(cc)));
      if (overlap.length > 0) {
        score += 20;
        reasons.push(`Similar color: ${candidate.color}`);
      }
    }

    if (queryEra && candidate.era &&
        candidate.era.toLowerCase() === queryEra.toLowerCase()) {
      score += 10;
      reasons.push(`Same era: ${candidate.era}`);
    }

    if (querySize && candidate.size &&
        candidate.size.toLowerCase() === querySize.toLowerCase()) {
      score += 10;
      reasons.push(`Same size: ${candidate.size}`);
    }

    // Threshold: at least 2 matching attributes (score >= 40)
    if (score >= 40) {
      matches.push({
        item_id: candidate.id,
        item_type: candidate.item_type,
        brand: candidate.brand,
        color: candidate.color,
        era: candidate.era,
        size: candidate.size,
        image_paths: JSON.parse(candidate.image_paths || "[]"),
        score,
        reasons,
      });
    }
  }

  // Sort by score descending
  matches.sort((a, b) => b.score - a.score);

  const result: DuplicateCheckResult = {
    query_item_id: itemId || undefined,
    query: {
      item_type: queryType,
      brand: queryBrand,
      color: queryColor,
      era: queryEra,
      size: querySize,
    },
    matches: matches.slice(0, 20), // top 20
  };

  return NextResponse.json(result);
}
