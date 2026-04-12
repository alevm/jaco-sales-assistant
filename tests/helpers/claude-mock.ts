import type Anthropic from "@anthropic-ai/sdk";

/**
 * Create a mock Claude message response from text content.
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
