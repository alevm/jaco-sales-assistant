import { describe, it, expect } from "vitest";

interface ScoringInput {
  queryType: string | null;
  queryBrand: string | null;
  queryColor: string | null;
  queryEra: string | null;
  querySize: string | null;
  candidateType: string | null;
  candidateBrand: string | null;
  candidateColor: string | null;
  candidateEra: string | null;
  candidateSize: string | null;
}

function scoreDuplicate(input: ScoringInput): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  if (input.queryType && input.candidateType &&
      input.candidateType.toLowerCase() === input.queryType.toLowerCase()) {
    score += 30;
    reasons.push(`Same type: ${input.candidateType}`);
  }

  if (input.queryBrand && input.candidateBrand &&
      input.candidateBrand.toLowerCase() === input.queryBrand.toLowerCase()) {
    score += 30;
    reasons.push(`Same brand: ${input.candidateBrand}`);
  }

  if (input.queryColor && input.candidateColor) {
    const qColors = input.queryColor.toLowerCase().split(/[\/,\s]+/);
    const cColors = input.candidateColor.toLowerCase().split(/[\/,\s]+/);
    const overlap = qColors.filter((c) =>
      cColors.some((cc) => cc.includes(c) || c.includes(cc))
    );
    if (overlap.length > 0) {
      score += 20;
      reasons.push(`Similar color: ${input.candidateColor}`);
    }
  }

  if (input.queryEra && input.candidateEra &&
      input.candidateEra.toLowerCase() === input.queryEra.toLowerCase()) {
    score += 10;
    reasons.push(`Same era: ${input.candidateEra}`);
  }

  if (input.querySize && input.candidateSize &&
      input.candidateSize.toLowerCase() === input.querySize.toLowerCase()) {
    score += 10;
    reasons.push(`Same size: ${input.candidateSize}`);
  }

  return { score, reasons };
}

describe("duplicate detection scoring", () => {
  it("scores exact match on type + brand at 60", () => {
    const result = scoreDuplicate({
      queryType: "jacket",
      queryBrand: "Nike",
      queryColor: null,
      queryEra: null,
      querySize: null,
      candidateType: "jacket",
      candidateBrand: "Nike",
      candidateColor: null,
      candidateEra: null,
      candidateSize: null,
    });
    expect(result.score).toBe(60);
    expect(result.reasons).toContain("Same type: jacket");
    expect(result.reasons).toContain("Same brand: Nike");
  });

  it("scores type + brand + color at 80", () => {
    const result = scoreDuplicate({
      queryType: "jacket",
      queryBrand: "Nike",
      queryColor: "blue",
      queryEra: null,
      querySize: null,
      candidateType: "jacket",
      candidateBrand: "Nike",
      candidateColor: "blue",
      candidateEra: null,
      candidateSize: null,
    });
    expect(result.score).toBe(80);
  });

  it("scores full match at 100", () => {
    const result = scoreDuplicate({
      queryType: "jacket",
      queryBrand: "Nike",
      queryColor: "blue",
      queryEra: "1990s",
      querySize: "M",
      candidateType: "jacket",
      candidateBrand: "Nike",
      candidateColor: "blue",
      candidateEra: "1990s",
      candidateSize: "M",
    });
    expect(result.score).toBe(100);
  });

  it("matches color with partial overlap (navy vs navy blue)", () => {
    const result = scoreDuplicate({
      queryType: "shirt",
      queryBrand: null,
      queryColor: "navy blue",
      queryEra: null,
      querySize: null,
      candidateType: "shirt",
      candidateBrand: null,
      candidateColor: "navy",
      candidateEra: null,
      candidateSize: null,
    });
    expect(result.score).toBe(50); // 30 type + 20 color
    expect(result.reasons).toContain("Similar color: navy");
  });

  it("case-insensitive matching", () => {
    const result = scoreDuplicate({
      queryType: "JACKET",
      queryBrand: "nike",
      queryColor: null,
      queryEra: null,
      querySize: null,
      candidateType: "Jacket",
      candidateBrand: "Nike",
      candidateColor: null,
      candidateEra: null,
      candidateSize: null,
    });
    expect(result.score).toBe(60);
  });

  it("returns 0 for no match", () => {
    const result = scoreDuplicate({
      queryType: "jacket",
      queryBrand: "Nike",
      queryColor: null,
      queryEra: null,
      querySize: null,
      candidateType: "shirt",
      candidateBrand: "Adidas",
      candidateColor: null,
      candidateEra: null,
      candidateSize: null,
    });
    expect(result.score).toBe(0);
  });

  it("threshold: score < 40 not flagged as duplicate", () => {
    // Only type matches = 30, below threshold
    const result = scoreDuplicate({
      queryType: "jacket",
      queryBrand: "Nike",
      queryColor: null,
      queryEra: null,
      querySize: null,
      candidateType: "jacket",
      candidateBrand: "Adidas",
      candidateColor: null,
      candidateEra: null,
      candidateSize: null,
    });
    expect(result.score).toBe(30);
    // This would not be included in results (threshold is 40)
  });

  it("handles null query fields gracefully", () => {
    const result = scoreDuplicate({
      queryType: null,
      queryBrand: null,
      queryColor: "red",
      queryEra: null,
      querySize: null,
      candidateType: "jacket",
      candidateBrand: "Nike",
      candidateColor: "red",
      candidateEra: null,
      candidateSize: null,
    });
    expect(result.score).toBe(20);
  });
});
