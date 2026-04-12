import { describe, it, expect } from "vitest";
import { checkRateLimit, isLLMEndpoint } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  it("allows requests under the limit", () => {
    const key = "test-token-allow-" + Date.now();
    for (let i = 0; i < 20; i++) {
      const result = checkRateLimit(key);
      expect(result.allowed).toBe(true);
    }
  });

  it("rejects the 21st request within the window", () => {
    const key = "test-token-reject-" + Date.now();
    for (let i = 0; i < 20; i++) {
      checkRateLimit(key);
    }
    const result = checkRateLimit(key);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it("different keys have independent limits", () => {
    const key1 = "test-key1-" + Date.now();
    const key2 = "test-key2-" + Date.now();
    for (let i = 0; i < 20; i++) {
      checkRateLimit(key1);
    }
    const result = checkRateLimit(key2);
    expect(result.allowed).toBe(true);
  });
});

describe("isLLMEndpoint", () => {
  it("identifies /api/recognize as LLM endpoint", () => {
    expect(isLLMEndpoint("/api/recognize")).toBe(true);
  });

  it("identifies description endpoint", () => {
    expect(isLLMEndpoint("/api/items/abc-123/description")).toBe(true);
  });

  it("identifies suggest-price endpoint", () => {
    expect(isLLMEndpoint("/api/items/abc-123/suggest-price")).toBe(true);
  });

  it("does not flag /api/items as LLM", () => {
    expect(isLLMEndpoint("/api/items")).toBe(false);
  });

  it("does not flag /api/health as LLM", () => {
    expect(isLLMEndpoint("/api/health")).toBe(false);
  });
});
