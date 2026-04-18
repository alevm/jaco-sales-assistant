import { NextRequest, NextResponse } from "next/server";
import { saveUpload } from "@/lib/upload";
import { recognizeItem } from "@/lib/recognize";
import { getDb } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export interface BatchUploadResult {
  filename: string;
  status: "ok" | "error";
  item_id?: string;
  image_path?: string;
  recognition?: Record<string, unknown>;
  error?: string;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const files = formData.getAll("files") as File[];
  const lotId = formData.get("lot_id") as string | null;

  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }
  if (files.length > 50) {
    return NextResponse.json({ error: "Max 50 files per batch" }, { status: 400 });
  }

  const db = getDb();
  const results: BatchUploadResult[] = [];

  for (const file of files) {
    const entry: BatchUploadResult = { filename: file.name, status: "ok" };

    try {
      if (!file.type.startsWith("image/")) {
        throw new Error(`Invalid file type: ${file.type}`);
      }
      if (file.size > 15 * 1024 * 1024) {
        throw new Error("File too large (max 15MB)");
      }

      // Save file
      const imagePath = await saveUpload(file);
      entry.image_path = imagePath;

      // AI recognition
      let recognition: Record<string, unknown> = {};
      try {
        recognition = await recognizeItem(imagePath) as unknown as Record<string, unknown>;
        entry.recognition = recognition;
      } catch (recError) {
        // Recognition failure is non-fatal; item still gets created
        recognition = {};
        entry.recognition = { error: (recError as Error).message };
      }

      // Create item record
      const id = uuidv4();
      const stmt = db.prepare(`
        INSERT INTO items (id, lot_id, item_type, brand, era, era_style, material, color, size, condition,
          status, recognition_raw, image_paths)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)
      `);
      stmt.run(
        id,
        lotId || null,
        (recognition.item_type as string) || null,
        (recognition.brand as string) || null,
        (recognition.era as string) || null,
        (recognition.era_style as string) || null,
        (recognition.material as string) || null,
        (recognition.color as string) || null,
        (recognition.size as string) || null,
        (recognition.condition as string) || null,
        JSON.stringify(recognition),
        JSON.stringify([imagePath])
      );

      // Insert tags from recognition
      const tags = recognition.tags as Array<{ category: string; value: string }> | undefined;
      if (tags && Array.isArray(tags)) {
        const tagStmt = db.prepare(
          "INSERT OR IGNORE INTO tags (item_id, category, value) VALUES (?, ?, ?)"
        );
        for (const tag of tags) {
          tagStmt.run(id, tag.category, tag.value);
        }
      }

      entry.item_id = id;
      entry.status = "ok";
    } catch (e) {
      entry.status = "error";
      entry.error = (e as Error).message;
    }

    results.push(entry);
  }

  const successCount = results.filter((r) => r.status === "ok").length;
  return NextResponse.json({
    total: files.length,
    success: successCount,
    failed: files.length - successCount,
    results,
  });
}
