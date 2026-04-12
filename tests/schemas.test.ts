import { describe, it, expect } from "vitest";
import {
  RecognizeBodySchema,
  CreateItemSchema,
  CreateLotSchema,
  UpdateLotSchema,
  DescriptionBodySchema,
  SuggestPriceBodySchema,
  validateBody,
} from "@/lib/schemas";

describe("RecognizeBodySchema", () => {
  it("accepts valid body", () => {
    const result = validateBody(RecognizeBodySchema, { imagePath: "uploads/img.jpg" });
    expect(result.success).toBe(true);
  });

  it("rejects missing imagePath", () => {
    const result = validateBody(RecognizeBodySchema, {});
    expect(result.success).toBe(false);
  });

  it("rejects empty imagePath", () => {
    const result = validateBody(RecognizeBodySchema, { imagePath: "" });
    expect(result.success).toBe(false);
  });
});

describe("CreateItemSchema", () => {
  it("accepts minimal body (all optional except defaults)", () => {
    const result = validateBody(CreateItemSchema, {});
    expect(result.success).toBe(true);
  });

  it("accepts full body", () => {
    const result = validateBody(CreateItemSchema, {
      item_type: "jacket",
      brand: "Levi's",
      era: "1990s",
      condition: "good",
      marketplace: "vinted",
      status: "draft",
      image_paths: ["/uploads/a.jpg"],
      tags: [{ category: "type", value: "jacket" }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid marketplace", () => {
    const result = validateBody(CreateItemSchema, { marketplace: "amazon" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid condition", () => {
    const result = validateBody(CreateItemSchema, { condition: "destroyed" });
    expect(result.success).toBe(false);
  });
});

describe("CreateLotSchema", () => {
  it("accepts valid lot", () => {
    const result = validateBody(CreateLotSchema, { name: "Summer lot", total_cogs: 50 });
    expect(result.success).toBe(true);
  });

  it("rejects missing name", () => {
    const result = validateBody(CreateLotSchema, { total_cogs: 50 });
    expect(result.success).toBe(false);
  });

  it("rejects negative total_cogs", () => {
    const result = validateBody(CreateLotSchema, { name: "Lot", total_cogs: -10 });
    expect(result.success).toBe(false);
  });
});

describe("UpdateLotSchema", () => {
  it("accepts valid update with auto_split_cogs", () => {
    const result = validateBody(UpdateLotSchema, {
      name: "Updated lot",
      total_cogs: 100,
      auto_split_cogs: true,
    });
    expect(result.success).toBe(true);
  });
});

describe("DescriptionBodySchema", () => {
  it("defaults to vinted/it when empty", () => {
    const result = validateBody(DescriptionBodySchema, {});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.marketplace).toBe("vinted");
      expect(result.data.locale).toBe("it");
    }
  });

  it("rejects invalid locale", () => {
    const result = validateBody(DescriptionBodySchema, { locale: "de" });
    expect(result.success).toBe(false);
  });
});

describe("SuggestPriceBodySchema", () => {
  it("defaults to vinted when empty", () => {
    const result = validateBody(SuggestPriceBodySchema, {});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.marketplace).toBe("vinted");
    }
  });
});
