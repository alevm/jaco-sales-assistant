import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

function getUploadDir(): string {
  return process.env.UPLOADS_DIR || path.resolve("public/uploads");
}

export function ensureUploadDir() {
  const dir = getUploadDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

export async function saveUpload(file: File): Promise<string> {
  ensureUploadDir();

  const ext = (path.extname(file.name) || ".jpg").toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error(`File extension not allowed: ${ext}`);
  }
  const filename = `${uuidv4()}${ext}`;
  const filepath = path.join(getUploadDir(), filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(filepath, buffer);

  return `/uploads/${filename}`;
}

export function deleteUpload(relativePath: string) {
  const uploadDir = getUploadDir();
  const cleaned = relativePath.replace(/^\//, "");
  if (cleaned.includes("..") || !cleaned.startsWith("uploads/")) {
    throw new Error("Path traversal blocked: file is outside upload directory");
  }
  const filename = cleaned.slice("uploads/".length);
  const fullPath = path.resolve(uploadDir, filename);
  if (!fullPath.startsWith(uploadDir + path.sep) && fullPath !== uploadDir) {
    throw new Error("Path traversal blocked: file is outside upload directory");
  }
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
}
