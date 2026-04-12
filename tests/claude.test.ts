import { describe, it, expect } from "vitest";
import { parseClaudeJSON } from "@/lib/claude";

describe("parseClaudeJSON", () => {
  it("parses valid JSON", () => {
    const result = parseClaudeJSON<{ a: number }>('{"a": 1}', "test");
    expect(result).toEqual({ a: 1 });
  });

  it("strips markdown fences before parsing", () => {
    const result = parseClaudeJSON<{ a: number }>("```json\n{\"a\": 1}\n```", "test");
    expect(result).toEqual({ a: 1 });
  });

  it("throws descriptive error on malformed JSON", () => {
    expect(() => parseClaudeJSON("not json", "recognize")).toThrow(
      "Failed to parse Claude response as JSON (recognize)"
    );
  });

  it("includes truncated response in error message", () => {
    const longGarbage = "x".repeat(500);
    try {
      parseClaudeJSON(longGarbage, "test");
    } catch (e) {
      expect((e as Error).message).toContain("test");
      // Message is truncated to 200 chars
      expect((e as Error).message.length).toBeLessThan(300);
    }
  });
});
