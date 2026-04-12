import { callClaude, parseClaudeJSON } from "./claude";
import type { RecognitionResult, Marketplace, Condition } from "@/types/item";
import { MARKETPLACE_FEES } from "./marketplace-fees";

export interface PriceSuggestion {
  low: number;
  mid: number;
  high: number;
  reasoning: string;
}

const SYSTEM_PROMPT = `You are an expert vintage clothing appraiser specializing in the European resale market. Given a garment's attributes, suggest three price points in EUR.

Return ONLY valid JSON with this exact structure:
{
  "low": 0,
  "mid": 0,
  "high": 0,
  "reasoning": "Brief explanation of pricing rationale (1-2 sentences)"
}

Pricing rules:
- "low" = quick sale / competitive price (sell within 1-3 days)
- "mid" = fair market value (sell within 1-2 weeks)
- "high" = premium / collector price (may take 1+ months)
- Factor in: brand prestige, era desirability, condition, material quality
- High-demand eras: Y2K, 90s grunge, 80s power, 70s disco command premiums
- Luxury brands (Burberry, Gucci, Prada) price 3-10x higher than unbranded
- NWT/NWOT condition commands 20-50% premium over "good"
- Consider the target marketplace's typical price range
- All prices in EUR, whole numbers only
- Return ONLY the JSON, no markdown fences`;

export async function suggestPrice(
  recognition: RecognitionResult,
  marketplace: Marketplace
): Promise<PriceSuggestion> {
  const fee = MARKETPLACE_FEES[marketplace];

  const itemInfo = `
Type: ${recognition.item_type}
Brand: ${recognition.brand || "Unbranded"}
Era: ${recognition.era}${recognition.era_style ? ` (${recognition.era_style})` : ""}
Material: ${recognition.material}
Color: ${recognition.color}
Size: ${recognition.size || "Unknown"}
Condition: ${recognition.condition}
Target marketplace: ${fee.name} (${fee.feePercent}% seller fee)
Tags: ${recognition.tags.map((t) => t.value).join(", ")}
`.trim();

  const response = await callClaude({
    model: "claude-sonnet-4-20250514",
    max_tokens: 256,
    temperature: 0.3,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Suggest pricing for this vintage garment:\n\n${itemInfo}`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  return parseClaudeJSON<PriceSuggestion>(text, "suggest-price");
}
