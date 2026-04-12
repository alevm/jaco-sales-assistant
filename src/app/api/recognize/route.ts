import { NextRequest, NextResponse } from "next/server";
import { recognizeItem } from "@/lib/recognize";

export async function POST(request: NextRequest) {
  const { imagePath } = await request.json();

  if (!imagePath) {
    return NextResponse.json({ error: "imagePath required" }, { status: 400 });
  }

  try {
    const result = await recognizeItem(imagePath);
    return NextResponse.json(result);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.startsWith("Invalid image path")) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    throw e;
  }
}
