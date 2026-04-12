import { describe, it, expect } from "vitest";
import { calculateMargin } from "@/lib/margin";

describe("calculateMargin", () => {
  it("computes eBay margin correctly (13% + €0.35)", () => {
    const result = calculateMargin(100, 30, "ebay");
    // platformFee = (100 * 13) / 100 + 0.35 = 13.35
    expect(result.platformFee).toBeCloseTo(13.35);
    // netRevenue = 100 - 13.35 - 0 = 86.65
    expect(result.netRevenue).toBeCloseTo(86.65);
    // netMargin = 86.65 - 30 = 56.65
    expect(result.netMargin).toBeCloseTo(56.65);
    // marginPercent = (56.65 / 100) * 100 = 56.65
    expect(result.marginPercent).toBeCloseTo(56.65);
  });

  it("computes Vinted margin (0% fee)", () => {
    const result = calculateMargin(50, 10, "vinted");
    expect(result.platformFee).toBe(0);
    expect(result.netRevenue).toBe(50); // 50 - 0 fee - 0 shipping
    expect(result.netMargin).toBe(40);  // 50 - 10 cogs
    expect(result.marginPercent).toBe(80);
  });

  it("handles null marketplace (no fee)", () => {
    const result = calculateMargin(80, 20, null);
    expect(result.platformFee).toBe(0);
    expect(result.netRevenue).toBe(80);
    expect(result.netMargin).toBe(60);
    expect(result.marginPercent).toBe(75);
  });

  it("handles zero sale price without division error", () => {
    const result = calculateMargin(0, 10, "ebay");
    expect(result.marginPercent).toBe(0);
  });

  it("accounts for shipping cost", () => {
    const result = calculateMargin(100, 30, "vinted", 8);
    expect(result.shippingCost).toBe(8);
    expect(result.netRevenue).toBe(92); // 100 - 0 - 8
    expect(result.netMargin).toBe(62); // 92 - 30
  });

  it("computes Depop margin (10%)", () => {
    const result = calculateMargin(100, 25, "depop");
    expect(result.platformFee).toBe(10);
    expect(result.netRevenue).toBe(90);
    expect(result.netMargin).toBe(65);
  });
});
