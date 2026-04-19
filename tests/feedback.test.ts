import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";

const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "feedback-test-"));
process.env.DB_PATH = path.join(TMP_DIR, "test.db");

// Dynamic imports so the env var above is picked up by getDb() on first use.
// Handlers are typed loosely here so test-only `Request` objects can be passed
// in place of `NextRequest` without the DOM-vs-Next type friction.
let POST: (req: any) => Promise<Response>;
let GET: () => Promise<Response>;
let PATCH: (req: any, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;
let getDb: () => import("better-sqlite3").Database;

beforeAll(async () => {
  ({ POST, GET } = await import("@/app/api/feedback/route"));
  ({ PATCH } = await import("@/app/api/feedback/[id]/route"));
  ({ getDb } = await import("@/lib/db"));
});

beforeEach(() => {
  getDb().prepare("DELETE FROM feedback").run();
});

afterAll(() => {
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
});

function makeRequest(body: unknown, method = "POST"): Request {
  return new Request("http://localhost/api/feedback", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function createFeedback(
  body: { title: string; description?: string; priority?: string } = { title: "Test" }
) {
  const res = await POST(makeRequest(body));
  return (await res.json()) as { id: number; status: string; pm_response: string | null };
}

describe("POST /api/feedback", () => {
  it("creates a row with status='new' and pm_response=null", async () => {
    const created = await createFeedback({ title: "A request" });
    expect(created.status).toBe("new");
    expect(created.pm_response).toBeNull();
  });
});

describe("GET /api/feedback", () => {
  it("returns the new fields in each row", async () => {
    await createFeedback({ title: "Row 1" });
    const res = await GET();
    const rows = (await res.json()) as Array<{
      status: string;
      pm_response: string | null;
      pm_responded_at: string | null;
    }>;
    expect(rows.length).toBe(1);
    expect(rows[0].status).toBe("new");
    expect(rows[0].pm_response).toBeNull();
    expect(rows[0].pm_responded_at).toBeNull();
  });
});

describe("PATCH /api/feedback/[id]", () => {
  it("updates status and pm_response and sets pm_responded_at", async () => {
    const created = await createFeedback({ title: "Planned" });
    const req = new Request(`http://localhost/api/feedback/${created.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "accepted", pm_response: "Planned for 1.2" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: String(created.id) }) });
    expect(res.status).toBe(200);
    const row = (await res.json()) as {
      status: string;
      pm_response: string;
      pm_responded_at: string | null;
    };
    expect(row.status).toBe("accepted");
    expect(row.pm_response).toBe("Planned for 1.2");
    expect(row.pm_responded_at).not.toBeNull();
  });

  it("rejects an invalid status with 400", async () => {
    const created = await createFeedback({ title: "Bad" });
    const req = new Request(`http://localhost/api/feedback/${created.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "not-a-status" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: String(created.id) }) });
    expect(res.status).toBe(400);
  });

  it("rejects a body with neither status nor pm_response with 400", async () => {
    const created = await createFeedback({ title: "Empty" });
    const req = new Request(`http://localhost/api/feedback/${created.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: String(created.id) }) });
    expect(res.status).toBe(400);
  });

  it("returns 404 for an unknown id", async () => {
    const req = new Request(`http://localhost/api/feedback/99999`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "done" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "99999" }) });
    expect(res.status).toBe(404);
  });

  it("returns 400 for an invalid id format", async () => {
    const req = new Request(`http://localhost/api/feedback/abc`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "done" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "abc" }) });
    expect(res.status).toBe(400);
  });

  it("does not bump pm_responded_at when only status changes", async () => {
    const created = await createFeedback({ title: "Status only" });
    const req = new Request(`http://localhost/api/feedback/${created.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "under_review" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: String(created.id) }) });
    const row = (await res.json()) as {
      status: string;
      pm_responded_at: string | null;
    };
    expect(row.status).toBe("under_review");
    expect(row.pm_responded_at).toBeNull();
  });
});
