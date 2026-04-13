import { describe, it, expect } from "vitest";
import { getPlatformFee } from "@/lib/marketplace-fees";
import type { Marketplace } from "@/types/item";

/**
 * Test the trend calculation logic used by the trends API.
 * These are unit tests for the aggregation patterns, not integration tests.
 */

interface SoldItem {
  id: string;
  item_type: string | null;
  brand: string | null;
  sold_price: number;
  cogs: number | null;
  shipping_cost: number | null;
  marketplace: Marketplace | null;
  sold_at: string;
}

function computeMonthlyTrend(items: SoldItem[]) {
  const monthlyMap = new Map<string, { prices: number[]; margins: number[]; revenue: number }>();

  for (const item of items) {
    const month = item.sold_at.slice(0, 7);
    const entry = monthlyMap.get(month) || { prices: [], margins: [], revenue: 0 };
    const fee = getPlatformFee(item.marketplace, item.sold_price);
    const shipping = item.shipping_cost || 0;
    const margin = item.sold_price - (item.cogs || 0) - fee - shipping;
    entry.prices.push(item.sold_price);
    entry.margins.push(margin);
    entry.revenue += item.sold_price;
    monthlyMap.set(month, entry);
  }

  return Array.from(monthlyMap.entries())
    .sort()
    .map(([month, data]) => ({
      month,
      avg_price: Math.round((data.prices.reduce((a, b) => a + b, 0) / data.prices.length) * 100) / 100,
      count: data.prices.length,
      total_revenue: Math.round(data.revenue * 100) / 100,
      total_margin: Math.round(data.margins.reduce((a, b) => a + b, 0) * 100) / 100,
      avg_margin: Math.round((data.margins.reduce((a, b) => a + b, 0) / data.margins.length) * 100) / 100,
    }));
}

function computePlatformPerformance(items: SoldItem[]) {
  const platformMap = new Map<string, { prices: number[]; margins: number[] }>();

  for (const item of items) {
    const mp = item.marketplace || "unknown";
    const entry = platformMap.get(mp) || { prices: [], margins: [] };
    const fee = getPlatformFee(item.marketplace, item.sold_price);
    const shipping = item.shipping_cost || 0;
    const margin = item.sold_price - (item.cogs || 0) - fee - shipping;
    entry.prices.push(item.sold_price);
    entry.margins.push(margin);
    platformMap.set(mp, entry);
  }

  return Array.from(platformMap.entries())
    .map(([platform, data]) => {
      const totalRevenue = data.prices.reduce((a, b) => a + b, 0);
      const totalMargin = data.margins.reduce((a, b) => a + b, 0);
      return {
        platform,
        total_sold: data.prices.length,
        avg_price: Math.round((totalRevenue / data.prices.length) * 100) / 100,
        avg_margin: Math.round((totalMargin / data.margins.length) * 100) / 100,
        margin_percent: totalRevenue > 0 ? Math.round((totalMargin / totalRevenue) * 10000) / 100 : 0,
      };
    })
    .sort((a, b) => b.avg_margin - a.avg_margin);
}

function computeCategoryTrend(items: SoldItem[]) {
  const catMonthMap = new Map<string, Map<string, number[]>>();

  for (const item of items) {
    const cat = item.item_type || "Altro";
    const month = item.sold_at.slice(0, 7);
    if (!catMonthMap.has(cat)) catMonthMap.set(cat, new Map());
    const catEntry = catMonthMap.get(cat)!;
    if (!catEntry.has(month)) catEntry.set(month, []);
    catEntry.get(month)!.push(item.sold_price);
  }

  return Array.from(catMonthMap.entries()).map(([category, months]) => ({
    category,
    points: Array.from(months.entries())
      .sort()
      .map(([month, prices]) => ({
        month,
        avg_price: Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100,
        count: prices.length,
      })),
  }));
}

const SAMPLE_ITEMS: SoldItem[] = [
  { id: "1", item_type: "Giacca", brand: "Levi's", sold_price: 50, cogs: 10, shipping_cost: 5, marketplace: "vinted", sold_at: "2026-01-15" },
  { id: "2", item_type: "Giacca", brand: "Levi's", sold_price: 60, cogs: 12, shipping_cost: 5, marketplace: "vinted", sold_at: "2026-01-20" },
  { id: "3", item_type: "Camicia", brand: "Ralph Lauren", sold_price: 35, cogs: 8, shipping_cost: 4, marketplace: "depop", sold_at: "2026-02-10" },
  { id: "4", item_type: "Giacca", brand: "Burberry", sold_price: 120, cogs: 30, shipping_cost: 8, marketplace: "ebay", sold_at: "2026-02-15" },
  { id: "5", item_type: "Pantaloni", brand: "Levi's", sold_price: 40, cogs: 10, shipping_cost: 5, marketplace: "wallapop", sold_at: "2026-03-01" },
  { id: "6", item_type: "Camicia", brand: "Ralph Lauren", sold_price: 45, cogs: 10, shipping_cost: 5, marketplace: "vinted", sold_at: "2026-03-10" },
];

describe("price trend calculations", () => {
  describe("monthly trend", () => {
    it("groups items by month", () => {
      const trend = computeMonthlyTrend(SAMPLE_ITEMS);
      expect(trend).toHaveLength(3); // Jan, Feb, Mar
      expect(trend[0].month).toBe("2026-01");
      expect(trend[1].month).toBe("2026-02");
      expect(trend[2].month).toBe("2026-03");
    });

    it("calculates correct average price per month", () => {
      const trend = computeMonthlyTrend(SAMPLE_ITEMS);
      // January: (50 + 60) / 2 = 55
      expect(trend[0].avg_price).toBe(55);
      expect(trend[0].count).toBe(2);
    });

    it("calculates correct revenue per month", () => {
      const trend = computeMonthlyTrend(SAMPLE_ITEMS);
      // January: 50 + 60 = 110
      expect(trend[0].total_revenue).toBe(110);
    });

    it("calculates margin considering fees", () => {
      const trend = computeMonthlyTrend(SAMPLE_ITEMS);
      // Jan item 1: 50 - 10 - 0 (vinted fee) - 5 = 35
      // Jan item 2: 60 - 12 - 0 (vinted fee) - 5 = 43
      // avg margin = (35 + 43) / 2 = 39
      expect(trend[0].avg_margin).toBe(39);
    });

    it("handles ebay fees in margin calculation", () => {
      const trend = computeMonthlyTrend(SAMPLE_ITEMS);
      // Feb item (ebay): 120 - 30 - (120*0.13+0.35) - 8 = 120 - 30 - 15.95 - 8 = 66.05
      // Feb item (depop): 35 - 8 - (35*0.10) - 4 = 35 - 8 - 3.5 - 4 = 19.5
      // avg margin: (66.05 + 19.5) / 2 = 42.775 ~ 42.78
      expect(trend[1].avg_margin).toBeCloseTo(42.78, 1);
    });
  });

  describe("platform performance", () => {
    it("ranks platforms by avg margin", () => {
      const perf = computePlatformPerformance(SAMPLE_ITEMS);
      // Should be sorted by avg_margin descending
      for (let i = 0; i < perf.length - 1; i++) {
        expect(perf[i].avg_margin).toBeGreaterThanOrEqual(perf[i + 1].avg_margin);
      }
    });

    it("counts correct number of sales per platform", () => {
      const perf = computePlatformPerformance(SAMPLE_ITEMS);
      const vintedPerf = perf.find((p) => p.platform === "vinted");
      expect(vintedPerf?.total_sold).toBe(3); // items 1, 2, 6
    });

    it("calculates correct avg price per platform", () => {
      const perf = computePlatformPerformance(SAMPLE_ITEMS);
      const wallapopPerf = perf.find((p) => p.platform === "wallapop");
      expect(wallapopPerf?.avg_price).toBe(40);
    });
  });

  describe("category trend", () => {
    it("groups items by item_type", () => {
      const categories = computeCategoryTrend(SAMPLE_ITEMS);
      const catNames = categories.map((c) => c.category).sort();
      expect(catNames).toContain("Giacca");
      expect(catNames).toContain("Camicia");
      expect(catNames).toContain("Pantaloni");
    });

    it("has monthly data points per category", () => {
      const categories = computeCategoryTrend(SAMPLE_ITEMS);
      const giacca = categories.find((c) => c.category === "Giacca");
      // Giacca: Jan (50, 60) and Feb (120)
      expect(giacca?.points).toHaveLength(2);
      expect(giacca?.points[0].month).toBe("2026-01");
      expect(giacca?.points[0].avg_price).toBe(55);
      expect(giacca?.points[1].month).toBe("2026-02");
      expect(giacca?.points[1].avg_price).toBe(120);
    });
  });

  describe("edge cases", () => {
    it("handles empty input", () => {
      const trend = computeMonthlyTrend([]);
      expect(trend).toHaveLength(0);
    });

    it("handles single item", () => {
      const trend = computeMonthlyTrend([SAMPLE_ITEMS[0]]);
      expect(trend).toHaveLength(1);
      expect(trend[0].count).toBe(1);
    });

    it("handles null marketplace", () => {
      const items: SoldItem[] = [
        { id: "x", item_type: "Test", brand: null, sold_price: 50, cogs: 10, shipping_cost: 0, marketplace: null, sold_at: "2026-01-01" },
      ];
      const perf = computePlatformPerformance(items);
      expect(perf[0].platform).toBe("unknown");
    });

    it("handles null item_type", () => {
      const items: SoldItem[] = [
        { id: "x", item_type: null, brand: null, sold_price: 50, cogs: 10, shipping_cost: 0, marketplace: "vinted", sold_at: "2026-01-01" },
      ];
      const cats = computeCategoryTrend(items);
      expect(cats[0].category).toBe("Altro");
    });
  });
});
