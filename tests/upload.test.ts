import { describe, it, expect } from "vitest";

// We test the ALLOWED_EXTENSIONS logic by importing saveUpload
// and using a mock File. Since saveUpload writes to disk, we test
// the extension validation by checking the thrown error.
import { saveUpload } from "@/lib/upload";
import fs from "fs";
import path from "path";

function makeFile(name: string, content = "fake", type = "image/jpeg"): File {
  const blob = new Blob([content], { type });
  return new File([blob], name, { type });
}

describe("saveUpload extension whitelist", () => {
  it("accepts .jpg files", async () => {
    const result = await saveUpload(makeFile("photo.jpg"));
    expect(result).toMatch(/^\/uploads\/.*\.jpg$/);
    // Clean up
    const fullPath = path.resolve("public", result.replace(/^\//, ""));
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  });

  it("accepts .jpeg files", async () => {
    const result = await saveUpload(makeFile("photo.jpeg"));
    expect(result).toMatch(/^\/uploads\/.*\.jpeg$/);
    const fullPath = path.resolve("public", result.replace(/^\//, ""));
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  });

  it("accepts .png files", async () => {
    const result = await saveUpload(makeFile("photo.png"));
    expect(result).toMatch(/^\/uploads\/.*\.png$/);
    const fullPath = path.resolve("public", result.replace(/^\//, ""));
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  });

  it("accepts .webp files", async () => {
    const result = await saveUpload(makeFile("photo.webp"));
    expect(result).toMatch(/^\/uploads\/.*\.webp$/);
    const fullPath = path.resolve("public", result.replace(/^\//, ""));
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  });

  it("rejects .html files", async () => {
    await expect(saveUpload(makeFile("evil.html"))).rejects.toThrow(
      "File extension not allowed: .html"
    );
  });

  it("rejects .svg files", async () => {
    await expect(saveUpload(makeFile("evil.svg"))).rejects.toThrow(
      "File extension not allowed: .svg"
    );
  });

  it("rejects .exe files", async () => {
    await expect(saveUpload(makeFile("evil.exe"))).rejects.toThrow(
      "File extension not allowed: .exe"
    );
  });
});
