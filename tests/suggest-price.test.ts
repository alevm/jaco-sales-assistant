import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeClaudeResponse, SAMPLE_PRICE_JSON } from "./helpers/claude-mock";
import type { RecognitionResult } from "@/types/item";

// Mock callClaude and parseClaudeJSON
const mockCallClaude = vi.fn();
vi.mock("@/lib/claude", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/claude")>();
  return {
    ...actual,
    callClaude: mockCallClaude,
  };
});

const SAMPLE_RECOGNITION: RecognitionResult = {
  item_type: "jacket",
  brand: "Levi's",
  era: "1990s",
  era_style: "grunge",
  material: "denim",
  color: "blue",
  size: "M",
  condition: "good",
  tags: [
    { category: "type", value: "jacket" },
    { category: "style", value: "grunge" },
  ],
  confidence: 0.85,
};

describe("suggestPrice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns valid PriceSuggestion on happy path", async () => {
    mockCallClaude.mockResolvedValueOnce(makeClaudeResponse(SAMPLE_PRICE_JSON));

    const { suggestPrice } = await import("@/lib/suggest-price");
    const result = await suggestPrice(SAMPLE_RECOGNITION, "vinted");

    expect(result).toHaveProperty("low", 25);
    expect(result).toHaveProperty("mid", 40);
    expect(result).toHaveProperty("high", 65);
    expect(result).toHaveProperty("reasoning");
    expect(typeof result.reasoning).toBe("string");
  });

  it("throws descriptive error on malformed JSON", async () => {
    mockCallClaude.mockResolvedValueOnce(makeClaudeResponse("this is not json at all"));

    const { suggestPrice } = await import("@/lib/suggest-price");
    await expect(suggestPrice(SAMPLE_RECOGNITION, "ebay")).rejects.toThrow(
      "Failed to parse Claude response as JSON (suggest-price)"
    );
  });

  it("handles JSON wrapped in markdown fences", async () => {
    const fencedJSON = "```json\n" + SAMPLE_PRICE_JSON + "\n```";
    mockCallClaude.mockResolvedValueOnce(makeClaudeResponse(fencedJSON));

    const { suggestPrice } = await import("@/lib/suggest-price");
    const result = await suggestPrice(SAMPLE_RECOGNITION, "depop");

    expect(result.low).toBe(25);
    expect(result.mid).toBe(40);
    expect(result.high).toBe(65);
  });

  it("propagates AbortError from timed-out call", async () => {
    mockCallClaude.mockRejectedValueOnce(new DOMException("The operation was aborted", "AbortError"));

    const { suggestPrice } = await import("@/lib/suggest-price");
    await expect(suggestPrice(SAMPLE_RECOGNITION, "vinted")).rejects.toThrow("aborted");
  });
});
