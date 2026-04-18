import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getPlatformFee } from "@/lib/marketplace-fees";
import type { Marketplace } from "@/types/item";

export interface TrendPoint {
  month: string; // YYYY-MM
  avg_price: number;
  count: number;
  total_revenue: number;
  total_margin: number;
  avg_margin: number;
}

export interface CategoryTrend {
  category: string;
  points: TrendPoint[];
}

export interface PlatformPerformance {
  platform: string;
  total_sold: number;
  total_revenue: number;
  avg_price: number;
  avg_margin: number;
  margin_percent: number;
}

export interface TrendData {
  /** Overall rolling avg price by month */
  overall: TrendPoint[];
  /** Avg price by category per month */
  by_category: CategoryTrend[];
  /** Best-performing platforms ranked by avg margin */
  platform_performance: PlatformPerformance[];
  /** Margin trend over time (monthly) */
  margin_trend: TrendPoint[];
  /** Brand performance (top 10 by count) */
  brand_performance: Array<{
    brand: string;
    count: number;
    avg_price: number;
    avg_margin: number;
  }>;
}

export async function GET(request: NextRequest) {
  const db = getDb();
  const url = request.nextUrl;
  const months = parseInt(url.searchParams.get("months") || "12", 10);

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  // All sold items with date
  const soldItems = db
    .prepare(
      `SELECT id, item_type, brand, era, sold_price, cogs, shipping_cost, marketplace, sold_at
       FROM items
       WHERE status = 'sold' AND sold_price IS NOT NULL AND sold_at IS NOT NULL AND sold_at >= ?
       ORDER BY sold_at`
    )
    .all(cutoffStr) as Array<{
    id: string;
    item_type: string | null;
    brand: string | null;
    era: string | null;
    sold_price: number;
    cogs: number | null;
    shipping_cost: number | null;
    marketplace: Marketplace | null;
    sold_at: string;
  }>;

  // --- Overall monthly trend ---
  const monthlyMap = new Map<string, { prices: number[]; margins: number[]; revenue: number }>();

  for (const item of soldItems) {
    const month = item.sold_at.slice(0, 7); // YYYY-MM
    const entry = monthlyMap.get(month) || { prices: [], margins: [], revenue: 0 };
    const fee = getPlatformFee(item.marketplace, item.sold_price);
    const shipping = item.shipping_cost || 0;
    const margin = item.sold_price - (item.cogs || 0) - fee - shipping;
    entry.prices.push(item.sold_price);
    entry.margins.push(margin);
    entry.revenue += item.sold_price;
    monthlyMap.set(month, entry);
  }

  const overall: TrendPoint[] = [];
  const marginTrend: TrendPoint[] = [];
  for (const [month, data] of Array.from(monthlyMap.entries()).sort()) {
    const avgPrice = data.prices.reduce((a, b) => a + b, 0) / data.prices.length;
    const avgMargin = data.margins.reduce((a, b) => a + b, 0) / data.margins.length;
    const totalMargin = data.margins.reduce((a, b) => a + b, 0);
    overall.push({
      month,
      avg_price: Math.round(avgPrice * 100) / 100,
      count: data.prices.length,
      total_revenue: Math.round(data.revenue * 100) / 100,
      total_margin: Math.round(totalMargin * 100) / 100,
      avg_margin: Math.round(avgMargin * 100) / 100,
    });
    marginTrend.push({
      month,
      avg_price: Math.round(avgPrice * 100) / 100,
      count: data.prices.length,
      total_revenue: Math.round(data.revenue * 100) / 100,
      total_margin: Math.round(totalMargin * 100) / 100,
      avg_margin: Math.round(avgMargin * 100) / 100,
    });
  }

  // --- By category (item_type) per month ---
  const catMonthMap = new Map<string, Map<string, { prices: number[]; margins: number[] }>>();
  for (const item of soldItems) {
    const cat = item.item_type || "Altro";
    const month = item.sold_at.slice(0, 7);
    if (!catMonthMap.has(cat)) catMonthMap.set(cat, new Map());
    const catEntry = catMonthMap.get(cat)!;
    if (!catEntry.has(month)) catEntry.set(month, { prices: [], margins: [] });
    const bucket = catEntry.get(month)!;
    const fee = getPlatformFee(item.marketplace, item.sold_price);
    const shipping = item.shipping_cost || 0;
    const margin = item.sold_price - (item.cogs || 0) - fee - shipping;
    bucket.prices.push(item.sold_price);
    bucket.margins.push(margin);
  }

  const byCategory: CategoryTrend[] = [];
  for (const [category, months_data] of catMonthMap) {
    const points: TrendPoint[] = [];
    for (const [month, bucket] of Array.from(months_data.entries()).sort()) {
      const totalRevenue = bucket.prices.reduce((a, b) => a + b, 0);
      const totalMargin = bucket.margins.reduce((a, b) => a + b, 0);
      points.push({
        month,
        avg_price: Math.round((totalRevenue / bucket.prices.length) * 100) / 100,
        count: bucket.prices.length,
        total_revenue: Math.round(totalRevenue * 100) / 100,
        total_margin: Math.round(totalMargin * 100) / 100,
        avg_margin: Math.round((totalMargin / bucket.margins.length) * 100) / 100,
      });
    }
    byCategory.push({ category, points });
  }
  // Sort by total items sold descending
  byCategory.sort((a, b) => {
    const totalA = a.points.reduce((s, p) => s + p.count, 0);
    const totalB = b.points.reduce((s, p) => s + p.count, 0);
    return totalB - totalA;
  });

  // --- Platform performance ---
  const platformMap = new Map<string, { prices: number[]; margins: number[] }>();
  for (const item of soldItems) {
    const mp = item.marketplace || "unknown";
    const entry = platformMap.get(mp) || { prices: [], margins: [] };
    const fee = getPlatformFee(item.marketplace, item.sold_price);
    const shipping = item.shipping_cost || 0;
    const margin = item.sold_price - (item.cogs || 0) - fee - shipping;
    entry.prices.push(item.sold_price);
    entry.margins.push(margin);
    platformMap.set(mp, entry);
  }

  const platformPerformance: PlatformPerformance[] = [];
  for (const [platform, data] of platformMap) {
    const totalRevenue = data.prices.reduce((a, b) => a + b, 0);
    const avgPrice = totalRevenue / data.prices.length;
    const totalMargin = data.margins.reduce((a, b) => a + b, 0);
    const avgMargin = totalMargin / data.margins.length;
    platformPerformance.push({
      platform,
      total_sold: data.prices.length,
      total_revenue: Math.round(totalRevenue * 100) / 100,
      avg_price: Math.round(avgPrice * 100) / 100,
      avg_margin: Math.round(avgMargin * 100) / 100,
      margin_percent: totalRevenue > 0 ? Math.round((totalMargin / totalRevenue) * 10000) / 100 : 0,
    });
  }
  platformPerformance.sort((a, b) => b.avg_margin - a.avg_margin);

  // --- Brand performance (top 10) ---
  const brandMap = new Map<string, { prices: number[]; margins: number[] }>();
  for (const item of soldItems) {
    const brand = item.brand || "Sconosciuto";
    const entry = brandMap.get(brand) || { prices: [], margins: [] };
    const fee = getPlatformFee(item.marketplace, item.sold_price);
    const shipping = item.shipping_cost || 0;
    const margin = item.sold_price - (item.cogs || 0) - fee - shipping;
    entry.prices.push(item.sold_price);
    entry.margins.push(margin);
    brandMap.set(brand, entry);
  }

  const brandPerformance = Array.from(brandMap.entries())
    .map(([brand, data]) => ({
      brand,
      count: data.prices.length,
      avg_price: Math.round(
        (data.prices.reduce((a, b) => a + b, 0) / data.prices.length) * 100
      ) / 100,
      avg_margin: Math.round(
        (data.margins.reduce((a, b) => a + b, 0) / data.margins.length) * 100
      ) / 100,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const trendData: TrendData = {
    overall,
    by_category: byCategory.slice(0, 8), // Top 8 categories
    platform_performance: platformPerformance,
    margin_trend: marginTrend,
    brand_performance: brandPerformance,
  };

  return NextResponse.json(trendData);
}
