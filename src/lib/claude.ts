import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

type AuthMode = "subscription" | "api";

const CLAUDE_TIMEOUT_MS = 30_000;

function getAuthMode(): AuthMode {
  const raw = process.env.CLAUDE_AUTH_MODE;
  if (!raw) return "subscription";
  if (raw === "subscription" || raw === "api") return raw;
  throw new Error(`Invalid auth mode "${raw}": must be "subscription" or "api"`);
}

let apiClient: Anthropic | null = null;

function getApiClient(): Anthropic {
  if (apiClient) return apiClient;
  apiClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return apiClient;
}

// Backwards-compat export: some older callers imported getClaude() directly.
// Returns the REST SDK client (api mode); the adapter is the preferred entry point.
export function getClaude(): Anthropic {
  return getApiClient();
}

async function callClaudeApi(
  params: Anthropic.MessageCreateParamsNonStreaming
): Promise<Anthropic.Message> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLAUDE_TIMEOUT_MS);
  try {
    return await getApiClient().messages.create(params, {
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

type AgentUserMessage = {
  type: "user";
  message: {
    role: "user";
    content: Anthropic.MessageParam["content"];
  };
  parent_tool_use_id: null;
};

function systemToString(
  system: Anthropic.MessageCreateParamsNonStreaming["system"]
): string | undefined {
  if (system === undefined || system === null) return undefined;
  if (typeof system === "string") return system;
  if (Array.isArray(system)) {
    return system
      .map((block) => (typeof block === "string" ? block : block.text ?? ""))
      .join("\n\n");
  }
  return undefined;
}

async function callClaudeSubscription(
  params: Anthropic.MessageCreateParamsNonStreaming
): Promise<Anthropic.Message> {
  // Lazy import so the Agent SDK is only loaded when this mode is selected —
  // keeps the REST-only path light and avoids pulling the CLI subprocess
  // toolchain into every server boot.
  const { query } = await import("@anthropic-ai/claude-agent-sdk");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLAUDE_TIMEOUT_MS);

  async function* promptStream(): AsyncGenerator<AgentUserMessage, void, void> {
    for (const m of params.messages) {
      if (m.role !== "user") continue;
      yield {
        type: "user",
        message: { role: "user", content: m.content },
        parent_tool_use_id: null,
      };
    }
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q = query({
      prompt: promptStream() as never,
      options: {
        model: params.model,
        abortController: controller,
        systemPrompt: systemToString(params.system),
        maxTurns: 1,
        allowedTools: [],
        tools: [],
        env: {
          ...process.env,
          CLAUDE_CODE_OAUTH_TOKEN: process.env.CLAUDE_CODE_OAUTH_TOKEN ?? "",
        },
      },
    });

    const collected: Array<{ type: "text"; text: string; citations: null }> =
      [];
    let id = "msg_agent_sdk";
    let model = params.model;
    let stopReason: Anthropic.Message["stop_reason"] = "end_turn";
    let inputTokens = 0;
    let outputTokens = 0;
    let assistantErr: string | undefined;

    for await (const msg of q) {
      if (msg.type === "assistant") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const inner = (msg as any).message;
        if (inner?.id) id = inner.id;
        if (inner?.model) model = inner.model;
        if (inner?.stop_reason) stopReason = inner.stop_reason;
        if (Array.isArray(inner?.content)) {
          for (const block of inner.content) {
            if (block?.type === "text" && typeof block.text === "string") {
              collected.push({ type: "text", text: block.text, citations: null });
            }
          }
        }
        if (inner?.usage) {
          if (typeof inner.usage.input_tokens === "number")
            inputTokens = inner.usage.input_tokens;
          if (typeof inner.usage.output_tokens === "number")
            outputTokens = inner.usage.output_tokens;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((msg as any).error) assistantErr = String((msg as any).error);
      }
    }

    if (assistantErr && collected.length === 0) {
      throw new Error(`Claude Agent SDK error: ${assistantErr}`);
    }

    return {
      id,
      type: "message",
      role: "assistant",
      model,
      content: collected as unknown as Anthropic.Message["content"],
      stop_reason: stopReason,
      stop_sequence: null,
      usage: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
      } as Anthropic.Usage,
    } as Anthropic.Message;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Call Claude with a 30s timeout. Reads the auth-mode env var at request time
 * so operators can flip modes by redeploying with a changed env — no code
 * change required.
 *
 * - subscription (default): routes through the Claude Agent SDK using the
 *   Claude Max OAuth token — billed under the Max subscription.
 * - api: routes through the REST SDK using the prepaid API key — billed
 *   under prepaid API credits (a separate pot).
 *
 * The returned shape is Anthropic.Message-compatible either way so
 * parseClaudeJSON() and callers in src/lib/{recognize,describe,suggest-price}.ts
 * keep working unchanged.
 */
export async function callClaude(
  params: Anthropic.MessageCreateParamsNonStreaming
): Promise<Anthropic.Message> {
  const mode = getAuthMode();
  return mode === "api"
    ? callClaudeApi(params)
    : callClaudeSubscription(params);
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
