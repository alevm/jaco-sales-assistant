import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { buildReadme, buildListingText } from "@/lib/export-bundle";
import { formatListing } from "@/lib/listing-formatter";
import type { ItemWithTags, Marketplace } from "@/types/item";

function makeItem(overrides: Partial<ItemWithTags> = {}): ItemWithTags {
  return {
    id: "abc",
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
    tags: [],
    ...overrides,
  };
}

describe("buildReadme", () => {
  it("uses Italian instructions for non-eBay platforms", () => {
    const readme = buildReadme("vinted");
    expect(readme).toContain("Apri l'app Vinted");
    expect(readme).toContain("Trascina o seleziona tutte le foto nella cartella photos/");
    expect(readme).toContain("Copia e incolla il contenuto di listing.txt");
  });

  it("uses English instructions for eBay", () => {
    const readme = buildReadme("ebay");
    expect(readme).toContain("Open the eBay app");
    expect(readme).toContain("photos/ folder");
    expect(readme).toContain("listing.txt");
  });

  it("includes the platform URL", () => {
    expect(buildReadme("vinted")).toContain("vinted.it");
    expect(buildReadme("depop")).toContain("depop.com");
    expect(buildReadme("wallapop")).toContain("wallapop.com");
    expect(buildReadme("vestiaire")).toContain("vestiairecollective.com");
    expect(buildReadme("subito")).toContain("subito.it");
    expect(buildReadme("facebook")).toContain("facebook.com/marketplace");
  });
});

describe("buildListingText", () => {
  it("renders a single copy-pasteable block with title, description, hashtags, price", () => {
    const listing = formatListing(makeItem(), "vinted");
    const text = buildListingText(listing);
    expect(text).toContain(`Titolo: ${listing.title}`);
    expect(text).toContain("Descrizione:");
    expect(text).toContain(listing.description);
    if (listing.hashtags.length > 0) {
      expect(text).toContain(`Hashtag: ${listing.hashtags.join(" ")}`);
    }
    expect(text).toContain(`Categoria: ${listing.category}`);
    expect(text).toContain("Prezzo: EUR 55.00");
  });

  it("omits price line when price is null", () => {
    const listing = formatListing(makeItem({ sale_price: null }), "vinted");
    const text = buildListingText(listing);
    expect(text).not.toContain("Prezzo:");
  });
});

describe("ZIP bundle round-trip", () => {
  it("writes photos/ + listing.txt + README.txt and reads them back", async () => {
    const listing = formatListing(makeItem(), "vinted");
    const zip = new JSZip();
    zip.folder("photos")?.file("test.jpg", new Uint8Array([0xff, 0xd8, 0xff, 0xe0]));
    zip.file("listing.txt", buildListingText(listing));
    zip.file("README.txt", buildReadme("vinted"));

    const bytes = await zip.generateAsync({ type: "uint8array" });

    const reopened = await JSZip.loadAsync(bytes);
    expect(reopened.file("photos/test.jpg")).not.toBeNull();
    expect(reopened.file("listing.txt")).not.toBeNull();
    expect(reopened.file("README.txt")).not.toBeNull();

    const listingTxt = await reopened.file("listing.txt")!.async("string");
    expect(listingTxt).toContain("Titolo:");
    const readme = await reopened.file("README.txt")!.async("string");
    expect(readme).toContain("Vinted");
  });

  it("listing.txt content matches what /api/items/:id/listing?platform=X returns (shape)", async () => {
    const item = makeItem();
    const platform: Marketplace = "depop";
    const listing = formatListing(item, platform);
    const zipText = buildListingText(listing);

    // The listing.txt must contain the same title/description/price/category
    // that the formatListing output would hand to the /listing endpoint.
    expect(zipText).toContain(listing.title);
    expect(zipText).toContain(listing.description);
    expect(zipText).toContain(listing.category);
    if (listing.price != null) {
      expect(zipText).toContain(listing.price.toFixed(2));
    }
  });
});
