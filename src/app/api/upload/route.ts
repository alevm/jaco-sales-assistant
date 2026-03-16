import { NextRequest, NextResponse } from "next/server";
import { saveUpload } from "@/lib/upload";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const files = formData.getAll("files") as File[];

  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const paths: string[] = [];
  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: `Invalid file type: ${file.type}` }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
    }
    const p = await saveUpload(file);
    paths.push(p);
  }

  return NextResponse.json({ paths });
}
