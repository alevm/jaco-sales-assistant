import { describe, it, expect } from "vitest";
import { getPlatformFee } from "@/lib/marketplace-fees";
import type { Marketplace } from "@/types/item";

describe("sold item margin calculation", () => {
  it("calculates margin correctly for vinted (0% fee)", () => {
    const soldPrice = 50;
    const cogs = 10;
    const fee = getPlatformFee("vinted", soldPrice);
    const shipping = 5;
    const margin = soldPrice - cogs - fee - shipping;

    expect(fee).toBe(0);
    expect(margin).toBe(35);
  });

  it("calculates margin correctly for ebay (13% + 0.35)", () => {
    const soldPrice = 100;
    const cogs = 20;
    const fee = getPlatformFee("ebay", soldPrice);
    const shipping = 8;
    const margin = soldPrice - cogs - fee - shipping;

    expect(fee).toBe(13.35); // 13% of 100 + 0.35
    expect(margin).toBeCloseTo(58.65, 2);
  });

  it("calculates margin correctly for depop (10%)", () => {
    const soldPrice = 80;
    const cogs = 15;
    const fee = getPlatformFee("depop", soldPrice);
    const shipping = 0;
    const margin = soldPrice - cogs - fee - shipping;

    expect(fee).toBe(8); // 10% of 80
    expect(margin).toBe(57);
  });

  it("calculates margin percent correctly", () => {
    const soldPrice = 100;
    const cogs = 20;
    const fee = getPlatformFee("vinted", soldPrice);
    const shipping = 5;
    const margin = soldPrice - cogs - fee - shipping;
    const marginPercent = soldPrice > 0 ? (margin / soldPrice) * 100 : 0;

    expect(marginPercent).toBe(75);
  });

  it("handles zero sold_price gracefully", () => {
    const soldPrice = 0;
    const cogs = 10;
    const fee = getPlatformFee("vinted", soldPrice);
    const margin = soldPrice - cogs - fee - 0;
    const marginPercent = soldPrice > 0 ? (margin / soldPrice) * 100 : 0;

    expect(margin).toBe(-10);
    expect(marginPercent).toBe(0);
  });

  it("calculates fees for all marketplaces", () => {
    const marketplaces: Marketplace[] = [
      "vinted", "ebay", "depop", "vestiaire", "wallapop", "subito", "facebook",
    ];
    const price = 50;

    for (const mp of marketplaces) {
      const fee = getPlatformFee(mp, price);
      expect(fee).toBeGreaterThanOrEqual(0);
      expect(typeof fee).toBe("number");
    }
  });

  it("vestiaire takes 15%", () => {
    expect(getPlatformFee("vestiaire", 200)).toBe(30);
  });
});
