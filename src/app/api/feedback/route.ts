import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { notifyFeedbackTelegram } from "@/lib/notify-telegram";
import { z } from "zod";

const feedbackSchema = z.object({
  title: z.string().min(1, "Il titolo e obbligatorio").max(200),
  description: z.string().max(2000).default(""),
  priority: z.enum(["nice-to-have", "important", "urgent"]).default("nice-to-have"),
});

const FEEDBACK_COLUMNS =
  "id, title, description, priority, status, pm_response, pm_responded_at, created_at";

export async function GET() {
  try {
    const db = getDb();
    const rows = db
      .prepare(`SELECT ${FEEDBACK_COLUMNS} FROM feedback ORDER BY created_at DESC`)
      .all();
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch feedback" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = feedbackSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { title, description, priority } = parsed.data;
    const db = getDb();
    const result = db
      .prepare(
        "INSERT INTO feedback (title, description, priority, status) VALUES (?, ?, ?, 'new')"
      )
      .run(title, description, priority);

    const created = db
      .prepare(`SELECT ${FEEDBACK_COLUMNS} FROM feedback WHERE id = ?`)
      .get(result.lastInsertRowid);

    void notifyFeedbackTelegram({ title, description, priority });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create feedback" },
      { status: 500 }
    );
  }
}
