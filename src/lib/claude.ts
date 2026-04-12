import Anthropic from "@anthropic-ai/sdk";

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
