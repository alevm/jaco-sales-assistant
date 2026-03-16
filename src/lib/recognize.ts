import { getClaude } from "./claude";
import type { RecognitionResult } from "@/types/item";
import fs from "fs";
import path from "path";

const SYSTEM_PROMPT = `You are an expert vintage clothing appraiser and cataloger. Analyze the garment photo and return ONLY valid JSON with this exact structure:

{
  "item_type": "string — garment type (e.g., jacket, shirt, dress, jeans, sweater)",
  "brand": "string or null — brand if visible on labels/tags",
  "era": "string — estimated decade (e.g., 1970s, early 1990s, 2000s)",
  "material": "string — best guess from visual (e.g., 100% cotton, wool blend, polyester)",
  "color": "string — primary color(s) (e.g., navy blue, red/white striped)",
  "size": "string or null — size if label visible (e.g., M, 42 EU, L)",
  "condition": "string — excellent/good/fair/poor",
  "tags": [
    {"category": "type", "value": "..."},
    {"category": "style", "value": "..."},
    {"category": "era", "value": "..."},
    {"category": "material", "value": "..."},
    {"category": "color", "value": "..."},
    {"category": "pattern", "value": "..."},
    {"category": "occasion", "value": "..."}
  ],
  "confidence": 0.85
}

Rules:
- Include 5-10 tags covering type, style, era, material, color, pattern, occasion
- Tag values should be lowercase, searchable terms (e.g., "denim", "oversized", "retro")
- Be specific about era — use visual cues (stitching, labels, cut, fabric)
- For brand, only state what you can see on labels. If unsure, use null
- Confidence is 0-1 reflecting how certain you are overall
- Return ONLY the JSON, no markdown fences, no explanation`;

export async function recognizeItem(imagePath: string): Promise<RecognitionResult> {
  const claude = getClaude();

  const fullPath = path.resolve("public", imagePath.replace(/^\//, ""));
  const imageData = fs.readFileSync(fullPath);
  const base64 = imageData.toString("base64");

  const ext = path.extname(imagePath).toLowerCase();
  const mediaTypeMap: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
  };
  const mediaType = (mediaTypeMap[ext] || "image/jpeg") as "image/jpeg" | "image/png" | "image/gif" | "image/webp";

  const response = await claude.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: base64,
            },
          },
          {
            type: "text",
            text: "Analyze this vintage garment. Return structured JSON.",
          },
        ],
      },
    ],
    system: SYSTEM_PROMPT,
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const cleaned = text.replace(/```json\s*|\s*```/g, "").trim();
  return JSON.parse(cleaned) as RecognitionResult;
}
