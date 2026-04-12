import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeClaudeResponse } from "./helpers/claude-mock";
import type { RecognitionResult } from "@/types/item";

// Mock callClaude before importing describe module
const mockCallClaude = vi.fn();
vi.mock("@/lib/claude", () => ({
  getClaude: vi.fn(),
  callClaude: mockCallClaude,
  parseClaudeJSON: vi.fn(), // not used by describe
}));

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

describe("generateDescription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a description string on happy path", async () => {
    const descriptionText = "Giacca denim Levi's anni 90 stile grunge, taglia M, condizione buona.";
    mockCallClaude.mockResolvedValueOnce(makeClaudeResponse(descriptionText));

    const { generateDescription } = await import("@/lib/describe");
    const result = await generateDescription(SAMPLE_RECOGNITION, "vinted", "it");

    expect(typeof result).toBe("string");
    expect(result).toBe(descriptionText);
    expect(mockCallClaude).toHaveBeenCalledOnce();
  });

  it("caps description at 2000 characters", async () => {
    const longText = "A".repeat(3000);
    mockCallClaude.mockResolvedValueOnce(makeClaudeResponse(longText));

    const { generateDescription } = await import("@/lib/describe");
    const result = await generateDescription(SAMPLE_RECOGNITION, "ebay", "en");

    expect(result.length).toBeLessThanOrEqual(2000);
  });

  it("returns empty string when Claude returns non-text content", async () => {
    const emptyResponse = makeClaudeResponse("");
    // Simulate non-text block
    emptyResponse.content = [{ type: "text", text: "", citations: null } as never];
    mockCallClaude.mockResolvedValueOnce(emptyResponse);

    const { generateDescription } = await import("@/lib/describe");
    const result = await generateDescription(SAMPLE_RECOGNITION, "vinted", "it");

    expect(result).toBe("");
  });

  it("calls Claude with correct marketplace prompt", async () => {
    mockCallClaude.mockResolvedValueOnce(makeClaudeResponse("test"));

    const { generateDescription } = await import("@/lib/describe");
    await generateDescription(SAMPLE_RECOGNITION, "ebay", "en");

    const callArgs = mockCallClaude.mock.calls[0][0];
    expect(callArgs.system).toContain("eBay");
  });
});
