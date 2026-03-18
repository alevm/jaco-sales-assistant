import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getPlatformFee } from "@/lib/marketplace-fees";
import type { Marketplace } from "@/types/item";
import type { DashboardData, MarginByGroup, MarginSummary } from "@/types/dashboard";

export async function GET(request: NextRequest) {
  const db = getDb();
  const url = request.nextUrl;
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  let dateFilter = "";
  const dateParams: string[] = [];
  if (from) {
    dateFilter += " AND sold_at >= ?";
    dateParams.push(from);
  }
  if (to) {
    dateFilter += " AND sold_at <= ?";
    dateParams.push(to);
  }

  // Summary
  const soldItems = db
    .prepare(
      `SELECT * FROM items WHERE status = 'sold' AND sold_price IS NOT NULL ${dateFilter}`
    )
    .all(...dateParams) as Array<{
    sold_price: number;
    cogs: number | null;
    shipping_cost: number | null;
    marketplace: Marketplace | null;
  }>;

  const counts = db
    .prepare("SELECT status, COUNT(*) as c FROM items GROUP BY status")
    .all() as Array<{ status: string; c: number }>;

  const countMap: Record<string, number> = {};
  for (const r of counts) countMap[r.status] = r.c;

  let totalRevenue = 0;
  let totalCogs = 0;
  let totalFees = 0;
  let totalShipping = 0;

  for (const item of soldItems) {
    const fee = getPlatformFee(item.marketplace, item.sold_price);
    const shipping = item.shipping_cost || 0;
    totalRevenue += item.sold_price;
    totalCogs += item.cogs || 0;
    totalFees += fee;
    totalShipping += shipping;
  }

  const totalMargin = totalRevenue - totalCogs - totalFees - totalShipping;
  const summary: MarginSummary = {
    total_revenue: totalRevenue,
    total_cogs: totalCogs,
    total_fees: totalFees,
    total_shipping: totalShipping,
    total_margin: totalMargin,
    margin_percent: totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0,
    items_sold: countMap["sold"] || 0,
    items_listed: countMap["listed"] || 0,
    items_draft: countMap["draft"] || 0,
    avg_margin_per_item: soldItems.length > 0 ? totalMargin / soldItems.length : 0,
  };

  // By marketplace
  const byMarketplace: MarginByGroup[] = [];
  const marketplaceGroups = db
    .prepare(
      `SELECT marketplace, sold_price, cogs, shipping_cost FROM items
       WHERE status = 'sold' AND sold_price IS NOT NULL AND marketplace IS NOT NULL ${dateFilter}
       ORDER BY marketplace`
    )
    .all(...dateParams) as Array<{
    marketplace: Marketplace;
    sold_price: number;
    cogs: number | null;
    shipping_cost: number | null;
  }>;

  const mpMap = new Map<string, { revenue: number; cogs: number; fees: number; shipping: number; count: number }>();
  for (const item of marketplaceGroups) {
    const key = item.marketplace;
    const entry = mpMap.get(key) || { revenue: 0, cogs: 0, fees: 0, shipping: 0, count: 0 };
    const fee = getPlatformFee(item.marketplace, item.sold_price);
    entry.revenue += item.sold_price;
    entry.cogs += item.cogs || 0;
    entry.fees += fee;
    entry.shipping += item.shipping_cost || 0;
    entry.count += 1;
    mpMap.set(key, entry);
  }
  for (const [group, data] of mpMap) {
    const margin = data.revenue - data.cogs - data.fees - data.shipping;
    byMarketplace.push({
      group,
      ...data,
      margin,
      margin_percent: data.revenue > 0 ? (margin / data.revenue) * 100 : 0,
    });
  }

  // By period (monthly)
  const byPeriod: MarginByGroup[] = [];
  const periodGroups = db
    .prepare(
      `SELECT strftime('%Y-%m', sold_at) as period, sold_price, cogs, shipping_cost, marketplace
       FROM items WHERE status = 'sold' AND sold_price IS NOT NULL ${dateFilter}
       ORDER BY period`
    )
    .all(...dateParams) as Array<{
    period: string;
    sold_price: number;
    cogs: number | null;
    shipping_cost: number | null;
    marketplace: Marketplace | null;
  }>;

  const periodMap = new Map<
    string,
    { revenue: number; cogs: number; fees: number; shipping: number; count: number }
  >();
  for (const item of periodGroups) {
    const key = item.period;
    const entry = periodMap.get(key) || { revenue: 0, cogs: 0, fees: 0, shipping: 0, count: 0 };
    const fee = getPlatformFee(item.marketplace, item.sold_price);
    entry.revenue += item.sold_price;
    entry.cogs += item.cogs || 0;
    entry.fees += fee;
    entry.shipping += item.shipping_cost || 0;
    entry.count += 1;
    periodMap.set(key, entry);
  }
  for (const [group, data] of periodMap) {
    const margin = data.revenue - data.cogs - data.fees - data.shipping;
    byPeriod.push({
      group,
      ...data,
      margin,
      margin_percent: data.revenue > 0 ? (margin / data.revenue) * 100 : 0,
    });
  }

  // Recent sales
  const recentSales = db
    .prepare(
      `SELECT id, item_type, brand, sold_price, cogs, shipping_cost, marketplace, sold_at
       FROM items WHERE status = 'sold' AND sold_price IS NOT NULL
       ORDER BY sold_at DESC LIMIT 20`
    )
    .all() as Array<{
    id: string;
    item_type: string | null;
    brand: string | null;
    sold_price: number;
    cogs: number;
    shipping_cost: number | null;
    marketplace: string;
    sold_at: string;
  }>;

  const recentWithMargin = recentSales.map((s) => {
    const fee = getPlatformFee(s.marketplace as Marketplace, s.sold_price);
    const shipping = s.shipping_cost || 0;
    return { ...s, margin: s.sold_price - (s.cogs || 0) - fee - shipping };
  });

  // Inventory aging (P1-8)
  const agingItems = db
    .prepare(
      `SELECT id, item_type, brand, sale_price, marketplace, created_at,
       julianday('now') - julianday(created_at) as days_listed
       FROM items WHERE status = 'listed'
       ORDER BY days_listed DESC LIMIT 50`
    )
    .all() as Array<{
    id: string;
    item_type: string | null;
    brand: string | null;
    sale_price: number | null;
    marketplace: string | null;
    created_at: string;
    days_listed: number;
  }>;

  const staleCount = agingItems.filter((i) => i.days_listed >= 30).length;

  const data: DashboardData = {
    summary,
    by_marketplace: byMarketplace,
    by_period: byPeriod,
    recent_sales: recentWithMargin,
    aging: {
      items: agingItems.map((i) => ({ ...i, days_listed: Math.floor(i.days_listed) })),
      stale_count: staleCount,
      total_listed: summary.items_listed,
    },
  };

  return NextResponse.json(data);
}
