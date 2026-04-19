import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { FEEDBACK_STATUSES } from "@/lib/feedback-status";

const patchSchema = z
  .object({
    status: z.enum(FEEDBACK_STATUSES).optional(),
    pm_response: z.string().max(4000).nullable().optional(),
  })
  .refine((data) => data.status !== undefined || data.pm_response !== undefined, {
    message: "At least one of status or pm_response is required",
  });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const db = getDb();
  const existing = db
    .prepare("SELECT * FROM feedback WHERE id = ?")
    .get(numericId) as { pm_response: string | null } | undefined;

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const fields: string[] = [];
  const values: unknown[] = [];

  if (parsed.data.status !== undefined) {
    fields.push("status = ?");
    values.push(parsed.data.status);
  }

  if (parsed.data.pm_response !== undefined) {
    fields.push("pm_response = ?");
    values.push(parsed.data.pm_response);
    if (parsed.data.pm_response !== existing.pm_response) {
      fields.push("pm_responded_at = datetime('now')");
    }
  }

  values.push(numericId);
  db.prepare(`UPDATE feedback SET ${fields.join(", ")} WHERE id = ?`).run(...values);

  const updated = db.prepare("SELECT * FROM feedback WHERE id = ?").get(numericId);
  return NextResponse.json(updated);
}
