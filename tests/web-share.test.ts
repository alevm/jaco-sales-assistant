import { describe, it, expect } from "vitest";
import { detectCanShareFiles } from "@/lib/web-share";

describe("detectCanShareFiles", () => {
  it("returns false when navigator has no canShare (desktop Firefox / Node)", () => {
    expect(detectCanShareFiles({})).toBe(false);
  });

  it("returns false when canShare returns false (desktop Chrome)", () => {
    expect(detectCanShareFiles({ canShare: () => false })).toBe(false);
  });

  it("returns true when canShare accepts a File array (iOS Safari / Android Chrome)", () => {
    expect(detectCanShareFiles({ canShare: () => true })).toBe(true);
  });

  it("returns false when canShare throws", () => {
    expect(detectCanShareFiles({
      canShare: () => {
        throw new Error("boom");
      },
    })).toBe(false);
  });

  it("returns false when nav arg is undefined and no global navigator", () => {
    // In the Node test runner navigator is undefined by default.
    expect(detectCanShareFiles()).toBe(false);
  });
});
