import { describe, it, expect } from "vitest";

function escapeCSV(value: string | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildTitle(item: {
  brand: string | null;
  item_type: string | null;
  era: string | null;
  color: string | null;
  size: string | null;
  id: string;
}): string {
  const parts: string[] = [];
  if (item.brand) parts.push(item.brand);
  if (item.item_type) parts.push(item.item_type);
  if (item.era) parts.push(item.era);
  if (item.color) parts.push(item.color);
  if (item.size) parts.push(`Taglia ${item.size}`);
  return parts.length > 0 ? parts.join(" - ") : `Item ${item.id.slice(0, 8)}`;
}

describe("CSV export helpers", () => {
  describe("escapeCSV", () => {
    it("returns empty string for null/undefined", () => {
      expect(escapeCSV(null)).toBe("");
      expect(escapeCSV(undefined)).toBe("");
    });

    it("passes through simple strings", () => {
      expect(escapeCSV("hello")).toBe("hello");
    });

    it("wraps strings with commas in quotes", () => {
      expect(escapeCSV("hello, world")).toBe('"hello, world"');
    });

    it("escapes double quotes", () => {
      expect(escapeCSV('say "hi"')).toBe('"say ""hi"""');
    });

    it("wraps strings with newlines", () => {
      expect(escapeCSV("line1\nline2")).toBe('"line1\nline2"');
    });
  });

  describe("buildTitle", () => {
    it("builds title from all fields", () => {
      const title = buildTitle({
        brand: "Nike",
        item_type: "jacket",
        era: "1990s",
        color: "blue",
        size: "M",
        id: "12345678-abcd",
      });
      expect(title).toBe("Nike - jacket - 1990s - blue - Taglia M");
    });

    it("skips null fields", () => {
      const title = buildTitle({
        brand: "Adidas",
        item_type: "shirt",
        era: null,
        color: null,
        size: "L",
        id: "abcdef",
      });
      expect(title).toBe("Adidas - shirt - Taglia L");
    });

    it("uses item ID fallback if all fields null", () => {
      const title = buildTitle({
        brand: null,
        item_type: null,
        era: null,
        color: null,
        size: null,
        id: "12345678-xxxx",
      });
      expect(title).toBe("Item 12345678");
    });
  });
});

describe("CSV format validation", () => {
  it("generates valid CSV with headers", () => {
    const headers = ["Title", "Description", "Price", "Brand", "Size", "Condition", "Color", "Marketplace", "Tags"];
    const row = [
      escapeCSV("Nike - jacket"),
      escapeCSV("Vintage Nike jacket, excellent condition"),
      escapeCSV("45"),
      escapeCSV("Nike"),
      escapeCSV("M"),
      escapeCSV("excellent"),
      escapeCSV("blue"),
      escapeCSV("vinted"),
      escapeCSV("denim; retro"),
    ];

    const csv = [headers.join(","), row.join(",")].join("\n");
    const lines = csv.split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe("Title,Description,Price,Brand,Size,Condition,Color,Marketplace,Tags");
  });
});
