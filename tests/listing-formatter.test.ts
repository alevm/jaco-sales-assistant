import { describe, it, expect } from "vitest";
import {
  formatListing,
  formatForVinted,
  formatForDepop,
  formatForEbay,
  formatForVestiaire,
  formatForWallapop,
  LISTING_PLATFORMS,
  API_PLATFORMS,
  CLIPBOARD_PLATFORMS,
} from "@/lib/listing-formatter";
import type { ItemWithTags, Marketplace } from "@/types/item";

function makeItem(overrides: Partial<ItemWithTags> = {}): ItemWithTags {
  return {
    id: "test-1",
    lot_id: null,
    item_type: "Giacca",
    brand: "Levi's",
    era: "1990s",
    era_style: "grunge",
    material: "Denim",
    color: "Blu",
    size: "M",
    condition: "good",
    cogs: 15,
    sale_price: 55,
    sold_price: null,
    shipping_cost: null,
    marketplace: null,
    status: "listed",
    sold_at: null,
    description_it: null,
    description_en: null,
    recognition_raw: null,
    listed_platforms: "[]",
    image_paths: "[]",
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    tags: [
      { item_id: "test-1", category: "style", value: "casual" },
      { item_id: "test-1", category: "era", value: "90s" },
    ],
    ...overrides,
  };
}

describe("listing-formatter", () => {
  describe("formatForVinted", () => {
    it("generates short title with brand, type, era, size", () => {
      const listing = formatForVinted(makeItem());
      expect(listing.title).toContain("Levi's");
      expect(listing.title).toContain("Giacca");
      expect(listing.title).toContain("1990s");
      expect(listing.title).toContain("Tg. M");
    });

    it("includes hashtags in description", () => {
      const listing = formatForVinted(makeItem());
      expect(listing.description).toContain("#vintage");
      expect(listing.description).toContain("#levis");
    });

    it("sets platform to vinted", () => {
      const listing = formatForVinted(makeItem());
      expect(listing.platform).toBe("vinted");
    });

    it("uses existing description_it when available", () => {
      const listing = formatForVinted(makeItem({ description_it: "Bellissima giacca vintage" }));
      expect(listing.description).toContain("Bellissima giacca vintage");
    });

    it("truncates title to 100 chars", () => {
      const listing = formatForVinted(makeItem({
        brand: "A".repeat(50),
        item_type: "B".repeat(50),
      }));
      expect(listing.title.length).toBeLessThanOrEqual(100);
    });
  });

  describe("formatForDepop", () => {
    it("adds Depop-specific hashtags", () => {
      const listing = formatForDepop(makeItem());
      expect(listing.hashtags).toContain("#depopfinds");
      expect(listing.hashtags).toContain("#y2k");
    });

    it("truncates title to 80 chars", () => {
      const listing = formatForDepop(makeItem());
      expect(listing.title.length).toBeLessThanOrEqual(80);
    });
  });

  describe("formatForEbay", () => {
    it("generates keyword-rich title with Vintage prefix", () => {
      const listing = formatForEbay(makeItem());
      expect(listing.title).toContain("Vintage");
      expect(listing.title).toContain("Levi's");
    });

    it("includes item specifics in extras", () => {
      const listing = formatForEbay(makeItem());
      expect(listing.extras.condition).toBe("Pre-owned - Good");
      expect(listing.extras.brand).toBe("Levi's");
      expect(listing.extras.material).toBe("Denim");
    });

    it("maps condition to eBay format", () => {
      const nwt = formatForEbay(makeItem({ condition: "nwt" }));
      expect(nwt.extras.condition).toBe("New with tags");

      const excellent = formatForEbay(makeItem({ condition: "excellent" }));
      expect(excellent.extras.condition).toBe("Pre-owned - Excellent");
    });
  });

  describe("formatForVestiaire", () => {
    it("generates luxury-oriented title", () => {
      const listing = formatForVestiaire(makeItem({ material: "Lana" }));
      expect(listing.title).toContain("in Lana");
    });

    it("includes color in title", () => {
      const listing = formatForVestiaire(makeItem());
      expect(listing.title).toContain("Blu");
    });
  });

  describe("formatForWallapop", () => {
    it("generates direct listing", () => {
      const listing = formatForWallapop(makeItem());
      expect(listing.platform).toBe("wallapop");
      expect(listing.title).toBeTruthy();
    });
  });

  describe("formatListing", () => {
    it("dispatches to correct formatter for each platform", () => {
      const platforms: Marketplace[] = ["vinted", "depop", "wallapop", "ebay", "vestiaire"];
      for (const p of platforms) {
        const listing = formatListing(makeItem(), p);
        expect(listing.platform).toBe(p);
      }
    });

    it("falls back to vinted-style for subito and facebook", () => {
      const subito = formatListing(makeItem(), "subito");
      expect(subito.title).toBeTruthy();

      const fb = formatListing(makeItem(), "facebook");
      expect(fb.title).toBeTruthy();
    });
  });

  describe("category inference", () => {
    it("maps giacca to Giacche e cappotti", () => {
      const listing = formatForVinted(makeItem({ item_type: "Giacca" }));
      expect(listing.category).toBe("Giacche e cappotti");
    });

    it("maps camicia to Camicie", () => {
      const listing = formatForVinted(makeItem({ item_type: "Camicia" }));
      expect(listing.category).toBe("Camicie");
    });

    it("maps pantaloni to Pantaloni", () => {
      const listing = formatForVinted(makeItem({ item_type: "Pantaloni" }));
      expect(listing.category).toBe("Pantaloni");
    });

    it("defaults to Abbigliamento for unknown types", () => {
      const listing = formatForVinted(makeItem({ item_type: "Qualcosa" }));
      expect(listing.category).toBe("Abbigliamento");
    });
  });

  describe("hashtag generation", () => {
    it("always includes #vintage", () => {
      const listing = formatForVinted(makeItem());
      expect(listing.hashtags).toContain("#vintage");
    });

    it("includes brand hashtag without spaces", () => {
      const listing = formatForVinted(makeItem({ brand: "Ralph Lauren" }));
      expect(listing.hashtags).toContain("#ralphlauren");
    });

    it("includes item tags from db", () => {
      const listing = formatForVinted(makeItem());
      expect(listing.hashtags).toContain("#casual");
    });
  });

  describe("constants", () => {
    it("LISTING_PLATFORMS has 5 platforms", () => {
      expect(LISTING_PLATFORMS).toHaveLength(5);
    });

    it("API_PLATFORMS only includes ebay", () => {
      expect(API_PLATFORMS).toEqual(["ebay"]);
    });

    it("CLIPBOARD_PLATFORMS has 4 platforms", () => {
      expect(CLIPBOARD_PLATFORMS).toHaveLength(4);
    });
  });
});
