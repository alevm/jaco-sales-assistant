import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

let client: Anthropic | null = null;

export function getClaude(): Anthropic {
  if (client) return client;
  client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
  return client;
}

const CLAUDE_TIMEOUT_MS = 30_000;

/**
 * Call Claude with a timeout via AbortController.
 * Wraps claude.messages.create with a 30s abort signal.
 */
export async function callClaude(
  params: Anthropic.MessageCreateParamsNonStreaming
): Promise<Anthropic.Message> {
  const claude = getClaude();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLAUDE_TIMEOUT_MS);
  try {
    const response = await claude.messages.create(params, {
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Convert any Claude/Anthropic/Claude-wrapper error into a JSON NextResponse
 * the frontend can reliably parse. Without this, Anthropic SDK errors cascade
 * as bodiless 500s and Safari's JSON.parse throws "The string did not match
 * the expected pattern," masking the real cause (e.g. billing, rate limit).
 */
export function claudeErrorResponse(e: unknown): NextResponse {
  if (e instanceof Anthropic.APIError) {
    const body = (e as unknown as { error?: { error?: { message?: string } } }).error;
    const inner = body?.error?.message || e.message;
    const status = typeof e.status === "number" ? e.status : 502;
    return NextResponse.json({ error: `Claude API: ${inner}` }, { status });
  }
  if (e instanceof Error && e.name === "AbortError") {
    return NextResponse.json({ error: "Claude API: request timed out" }, { status: 504 });
  }
  const msg = e instanceof Error ? e.message : "Unknown error";
  return NextResponse.json({ error: msg }, { status: 500 });
}

/**
 * Safely parse JSON from Claude's text response.
 * Strips markdown fences, returns parsed object or throws descriptive error.
 */
export function parseClaudeJSON<T>(text: string, context: string): T {
  const cleaned = text.replace(/```json\s*|\s*```/g, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error(
      `Failed to parse Claude response as JSON (${context}): ${cleaned.slice(0, 200)}`
    );
  }
}
