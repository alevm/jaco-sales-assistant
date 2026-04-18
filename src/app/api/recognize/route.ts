import { NextRequest, NextResponse } from "next/server";
import { recognizeItem } from "@/lib/recognize";
import { RecognizeBodySchema, validateBody } from "@/lib/schemas";
import { claudeErrorResponse } from "@/lib/claude";

export async function POST(request: NextRequest) {
  const raw = await request.json();
  const parsed = validateBody(RecognizeBodySchema, raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const result = await recognizeItem(parsed.data.imagePath);
    return NextResponse.json(result);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.startsWith("Invalid image path") || msg.startsWith("Failed to parse Claude")) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    return claudeErrorResponse(e);
  }
}
