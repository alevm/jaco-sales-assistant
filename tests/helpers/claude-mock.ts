import type Anthropic from "@anthropic-ai/sdk";

/**
 * Create a mock Claude message response from text content.
 * Shape is identical whether the adapter ran in `api` or `subscription` mode —
 * the adapter normalizes the Agent SDK stream into this REST-SDK-compatible
 * shape, so tests of callers (describe/suggest-price/recognize) don't need to
 * know which mode was used.
 */
export function makeClaudeResponse(text: string): Anthropic.Message {
  return {
    id: "msg_mock_001",
    type: "message",
    role: "assistant",
    model: "claude-sonnet-4-20250514",
    content: [{ type: "text", text, citations: null }],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: {
      input_tokens: 100,
      output_tokens: 50,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    } as Anthropic.Usage,
  } as Anthropic.Message;
}

/**
 * Build an Agent-SDK-style async iterator that yields a single assistant
 * message carrying `text`, matching the subset of SDKMessage that
 * callClaudeSubscription() consumes. Use in tests that mock
 * `@anthropic-ai/claude-agent-sdk`'s `query()` export.
 */
export function makeAgentSdkStream(text: string) {
  return async function* () {
    yield {
      type: "assistant" as const,
      message: {
        id: "msg_agent_mock",
        type: "message",
        role: "assistant",
        model: "claude-sonnet-4-20250514",
        content: [{ type: "text", text }],
        stop_reason: "end_turn",
        usage: { input_tokens: 10, output_tokens: 5 },
      },
    };
  };
}

/** Sample valid recognition result JSON */
export const SAMPLE_RECOGNITION_JSON = JSON.stringify({
  item_type: "jacket",
  brand: "Levi's",
  era: "1990s",
  era_style: "grunge",
  material: "denim",
  color: "blue",
  size: "M",
  condition: "good",
  tags: [
    { category: "type", value: "jacket" },
    { category: "style", value: "grunge" },
    { category: "era", value: "90s" },
    { category: "material", value: "denim" },
    { category: "color", value: "blue" },
  ],
  confidence: 0.85,
});

/** Sample valid price suggestion JSON */
export const SAMPLE_PRICE_JSON = JSON.stringify({
  low: 25,
  mid: 40,
  high: 65,
  reasoning: "Classic 90s denim jacket, good condition, strong demand for grunge era pieces.",
});
