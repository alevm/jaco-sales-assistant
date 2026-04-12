import { describe, it, expect } from "vitest";
import { validateImagePath } from "@/lib/recognize";

describe("validateImagePath", () => {
  it("accepts a valid uploads path", () => {
    const result = validateImagePath("uploads/abc.jpg");
    expect(result).toContain("public/uploads/abc.jpg");
  });

  it("accepts a path with leading slash", () => {
    const result = validateImagePath("/uploads/abc.png");
    expect(result).toContain("public/uploads/abc.png");
  });

  it("rejects paths containing ..", () => {
    expect(() => validateImagePath("uploads/../../../etc/passwd")).toThrow(
      "path traversal not allowed"
    );
  });

  it("rejects paths outside uploads directory", () => {
    expect(() => validateImagePath("secret/data.jpg")).toThrow(
      "must be within uploads directory"
    );
  });

  it("rejects direct public-root paths", () => {
    expect(() => validateImagePath("favicon.ico")).toThrow(
      "must be within uploads directory"
    );
  });
});
