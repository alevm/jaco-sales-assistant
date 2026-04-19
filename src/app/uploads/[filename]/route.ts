import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";

function getUploadsDir(): string {
  return process.env.UPLOADS_DIR || path.resolve("public/uploads");
}

const MIME_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ filename: string }> }
) {
  const { filename } = await context.params;

  // Reject anything that looks like traversal or a subpath.
  if (filename.includes("/") || filename.includes("..") || filename.includes("\\")) {
    return new Response("Not found", { status: 404 });
  }

  const uploadsDir = getUploadsDir();
  const fullPath = path.resolve(uploadsDir, filename);
  if (!fullPath.startsWith(uploadsDir + path.sep) && fullPath !== uploadsDir) {
    return new Response("Not found", { status: 404 });
  }
  if (!fs.existsSync(fullPath)) {
    return new Response("Not found", { status: 404 });
  }

  const ext = path.extname(filename).toLowerCase();
  const contentType = MIME_MAP[ext] || "application/octet-stream";
  const stat = fs.statSync(fullPath);
  const data = fs.readFileSync(fullPath);

  return new Response(data, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(stat.size),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
