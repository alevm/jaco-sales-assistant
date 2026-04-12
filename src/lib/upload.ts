import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const UPLOAD_DIR = path.resolve("public/uploads");

export function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
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
  const filepath = path.join(UPLOAD_DIR, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(filepath, buffer);

  return `/uploads/${filename}`;
}

export function deleteUpload(relativePath: string) {
  const fullPath = path.resolve("public", relativePath.replace(/^\//, ""));
  if (!fullPath.startsWith(UPLOAD_DIR + path.sep) && fullPath !== UPLOAD_DIR) {
    throw new Error("Path traversal blocked: file is outside upload directory");
  }
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
}
