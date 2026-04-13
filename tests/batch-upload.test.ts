import { describe, it, expect } from "vitest";
import { saveUpload } from "@/lib/upload";
import fs from "fs";
import path from "path";

function makeFile(name: string, content = "fake-image-data", type = "image/jpeg"): File {
  const blob = new Blob([content], { type });
  return new File([blob], name, { type });
}

describe("batch upload — file handling", () => {
  it("saves multiple files and returns unique paths", async () => {
    const files = [
      makeFile("item1.jpg"),
      makeFile("item2.jpg"),
      makeFile("item3.png", "png-data", "image/png"),
    ];

    const paths: string[] = [];
    for (const file of files) {
      const p = await saveUpload(file);
      paths.push(p);
    }

    expect(paths).toHaveLength(3);
    // All paths are unique
    expect(new Set(paths).size).toBe(3);
    // All are valid upload paths
    for (const p of paths) {
      expect(p).toMatch(/^\/uploads\//);
    }

    // Cleanup
    for (const p of paths) {
      const fullPath = path.resolve("public", p.replace(/^\//, ""));
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }
  });

  it("rejects non-image files in a batch", async () => {
    const badFile = makeFile("malware.exe", "bad", "application/octet-stream");
    await expect(saveUpload(badFile)).rejects.toThrow("File extension not allowed");
  });

  it("handles 20+ files without error", async () => {
    const files = Array.from({ length: 20 }, (_, i) => makeFile(`batch-${i}.jpg`));
    const paths: string[] = [];

    for (const file of files) {
      const p = await saveUpload(file);
      paths.push(p);
    }

    expect(paths).toHaveLength(20);

    // Cleanup
    for (const p of paths) {
      const fullPath = path.resolve("public", p.replace(/^\//, ""));
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }
  });
});
