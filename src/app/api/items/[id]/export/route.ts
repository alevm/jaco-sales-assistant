import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import JSZip from "jszip";
import { getDb } from "@/lib/db";
import { formatListing } from "@/lib/listing-formatter";
import type { Item, ItemWithTags, Marketplace, Tag } from "@/types/item";
import { buildReadme, buildListingText } from "@/lib/export-bundle";

const SUPPORTED: Marketplace[] = [
  "vinted", "ebay", "depop", "vestiaire", "wallapop", "subito", "facebook",
];

function getUploadsDir(): string {
  return process.env.UPLOADS_DIR || path.resolve("public/uploads");
}

/** Safely resolve an image path from item.image_paths (e.g. "/uploads/abc.jpg") to an
 *  absolute path rooted in the uploads dir. Returns null if traversal is detected. */
function resolveUpload(publicPath: string): string | null {
  const cleaned = publicPath.replace(/^\//, "");
  if (cleaned.includes("..") || !cleaned.startsWith("uploads/")) return null;
  const filename = cleaned.slice("uploads/".length);
  if (filename.includes("/") || filename.includes("\\")) return null;
  const uploadsDir = getUploadsDir();
  const fullPath = path.resolve(uploadsDir, filename);
  if (!fullPath.startsWith(uploadsDir + path.sep) && fullPath !== uploadsDir) return null;
  return fullPath;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const platform = request.nextUrl.searchParams.get("platform") as Marketplace | null;

  if (!platform || !SUPPORTED.includes(platform)) {
    return NextResponse.json(
      { error: `platform query param required (one of: ${SUPPORTED.join(", ")})` },
      { status: 400 },
    );
  }

  const db = getDb();
  const item = db.prepare("SELECT * FROM items WHERE id = ?").get(id) as Item | undefined;
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const tags = db.prepare("SELECT * FROM tags WHERE item_id = ?").all(id) as Tag[];
  const itemWithTags: ItemWithTags = { ...item, tags };

  const listing = formatListing(itemWithTags, platform);

  const zip = new JSZip();
  const photos = zip.folder("photos");
  if (!photos) {
    return NextResponse.json({ error: "Failed to init ZIP" }, { status: 500 });
  }

  let imagePaths: string[] = [];
  try {
    imagePaths = JSON.parse(item.image_paths || "[]");
  } catch {
    imagePaths = [];
  }

  for (const publicPath of imagePaths) {
    const full = resolveUpload(publicPath);
    if (!full || !fs.existsSync(full)) continue;
    const data = fs.readFileSync(full);
    const basename = path.basename(full);
    photos.file(basename, data);
  }

  zip.file("listing.txt", buildListingText(listing));
  zip.file("README.txt", buildReadme(platform));

  const zipBytes = await zip.generateAsync({ type: "uint8array" });
  // Copy into a fresh ArrayBuffer so the response body typing matches BodyInit.
  const body = new Uint8Array(zipBytes.byteLength);
  body.set(zipBytes);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="jaco-${id}-${platform}.zip"`,
      "Content-Length": String(body.byteLength),
    },
  });
}
