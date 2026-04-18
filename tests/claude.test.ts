import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { parseClaudeJSON } from "@/lib/claude";

// --- parseClaudeJSON unit tests ---

describe("parseClaudeJSON", () => {
  it("parses valid JSON", () => {
    const result = parseClaudeJSON<{ a: number }>('{"a": 1}', "test");
    expect(result).toEqual({ a: 1 });
  });

  it("strips markdown fences before parsing", () => {
    const result = parseClaudeJSON<{ a: number }>("```json\n{\"a\": 1}\n```", "test");
    expect(result).toEqual({ a: 1 });
  });

  it("throws descriptive error on malformed JSON", () => {
    expect(() => parseClaudeJSON("not json", "recognize")).toThrow(
      "Failed to parse Claude response as JSON (recognize)"
    );
  });

  it("includes truncated response in error message", () => {
    const longGarbage = "x".repeat(500);
    try {
      parseClaudeJSON(longGarbage, "test");
    } catch (e) {
      expect((e as Error).message).toContain("test");
      // Message is truncated to 200 chars
      expect((e as Error).message.length).toBeLessThan(300);
    }
  });
});

// --- callClaude auth-mode routing ---

// Hoisted so vi.mock() factories below can reference them at module-eval time.
const restMessagesCreate = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    id: "msg_rest",
    type: "message",
    role: "assistant",
    model: "claude-sonnet-4-20250514",
    content: [{ type: "text", text: "rest-response", citations: null }],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: {
      input_tokens: 1,
      output_tokens: 1,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    },
  })
);

const agentQuery = vi.hoisted(() =>
  vi.fn(() => {
    async function* gen() {
      yield {
        type: "assistant" as const,
        message: {
          id: "msg_agent",
          type: "message",
          role: "assistant",
          model: "claude-sonnet-4-20250514",
          content: [{ type: "text", text: "sub-response" }],
          stop_reason: "end_turn",
          usage: { input_tokens: 2, output_tokens: 3 },
        },
      };
    }
    return gen();
  })
);

vi.mock("@anthropic-ai/sdk", () => {
  class APIError extends Error {
    status: number;
    constructor(message: string, status = 500) {
      super(message);
      this.status = status;
    }
  }
  class MockAnthropic {
    messages = { create: restMessagesCreate };
  }
  // Static APIError so `e instanceof Anthropic.APIError` works in the adapter.
  (MockAnthropic as unknown as { APIError: typeof APIError }).APIError = APIError;
  return { default: MockAnthropic };
});

vi.mock("@anthropic-ai/claude-agent-sdk", () => ({
  query: agentQuery,
}));

describe("callClaude — auth-mode routing", () => {
  const params = {
    model: "claude-sonnet-4-20250514",
    max_tokens: 16,
    messages: [{ role: "user" as const, content: "ping" }],
  };

  beforeEach(() => {
    restMessagesCreate.mockClear();
    agentQuery.mockClear();
  });

  afterEach(() => {
    delete process.env.CLAUDE_AUTH_MODE;
  });

  it("routes to Agent SDK when CLAUDE_AUTH_MODE=subscription", async () => {
    process.env.CLAUDE_AUTH_MODE = "subscription";
    const { callClaude } = await import("@/lib/claude");

    const res = await callClaude(params);

    expect(agentQuery).toHaveBeenCalledOnce();
    expect(restMessagesCreate).not.toHaveBeenCalled();
    expect(res.content[0]).toMatchObject({ type: "text", text: "sub-response" });
    expect(res.usage.input_tokens).toBe(2);
    expect(res.usage.output_tokens).toBe(3);
  });

  it("defaults to Agent SDK when CLAUDE_AUTH_MODE is unset", async () => {
    const { callClaude } = await import("@/lib/claude");

    await callClaude(params);

    expect(agentQuery).toHaveBeenCalled();
    expect(restMessagesCreate).not.toHaveBeenCalled();
  });

  it("routes to REST SDK when CLAUDE_AUTH_MODE=api", async () => {
    process.env.CLAUDE_AUTH_MODE = "api";
    const { callClaude } = await import("@/lib/claude");

    const res = await callClaude(params);

    expect(restMessagesCreate).toHaveBeenCalledOnce();
    expect(agentQuery).not.toHaveBeenCalled();
    expect(res.content[0]).toMatchObject({ type: "text", text: "rest-response" });
  });

  it("throws when CLAUDE_AUTH_MODE is an unknown value", async () => {
    process.env.CLAUDE_AUTH_MODE = "bogus";
    const { callClaude } = await import("@/lib/claude");

    await expect(callClaude(params)).rejects.toThrow(/subscription.*api/);
  });

  it("passes the system prompt through as a string in subscription mode", async () => {
    process.env.CLAUDE_AUTH_MODE = "subscription";
    const { callClaude } = await import("@/lib/claude");

    await callClaude({ ...params, system: "you are a sommelier" });

    const calls = agentQuery.mock.calls as unknown as Array<
      [{ options?: { systemPrompt?: string } }]
    >;
    expect(calls[0][0].options?.systemPrompt).toBe("you are a sommelier");
  });
});
