import { callClaude, parseClaudeJSON } from "./claude";
import type { RecognitionResult } from "@/types/item";
import fs from "fs";
import path from "path";

const SYSTEM_PROMPT = `You are an expert vintage clothing appraiser and cataloger working the Italian/European resale market (Vinted IT, Depop, Wallapop, eBay, Vestiaire). You specialise in identifying brands from photos and pricing pieces for the second-hand market.

Analyse the garment photo and return ONLY valid JSON with this exact structure:

{
  "item_type": "string — garment type (e.g., jacket, shirt, dress, jeans, sweater, t-shirt)",
  "brand": "string or null — see BRAND RULES below. Prefer a best-guess with brand_confidence over null.",
  "brand_confidence": 0.0,
  "brand_hints": "string or null — see BRAND RULES below. When brand is null, describe what you see on labels/tags so the user can zoom/re-shoot.",
  "era": "string — estimated decade (e.g., 1970s, early 1990s, 2000s)",
  "era_style": "string or null — specific style movement. Examples: 60s mod, 70s disco, 70s punk, 80s power dressing, 80s new wave, 90s grunge, 90s minimalist, Y2K, 00s streetwear. Use null if no clear style movement applies.",
  "material": "string — best guess from visual (e.g., 100% cotton, wool blend, polyester)",
  "color": "string — primary color(s) (e.g., navy blue, red/white striped)",
  "size": "string or null — size if label visible (e.g., M, 42 EU, L)",
  "condition": "string — one of: nwt, nwot, excellent, good, fair, poor. Use nwt if tags still attached, nwot if unworn but no tags, excellent if minimal wear, good if normal wear, fair if visible wear/minor flaws, poor if significant damage.",
  "tags": [
    {"category": "type", "value": "..."},
    {"category": "style", "value": "..."},
    {"category": "era", "value": "..."},
    {"category": "material", "value": "..."},
    {"category": "color", "value": "..."},
    {"category": "pattern", "value": "..."},
    {"category": "occasion", "value": "..."}
  ],
  "confidence": 0.85,
  "price_suggestion_eur": {"low": 0, "mid": 0, "high": 0}
}

BRAND RULES — READ CAREFULLY, "brand": null IS OFTEN A FAILURE MODE:
- Actively look for brand indicators: visible neck / waistband / inside tags, stitched or printed wordmarks on chest / hem / back, distinctive brand motifs.
- Recognisable Italian/European resale-market motifs include: Nike swoosh, adidas trefoil / three-stripes, Carhartt square "C" label, Levi's red tab, Ralph Lauren polo pony, Tommy Hilfiger flag, Lacoste crocodile, Champion script, Stone Island compass patch, Diesel wordmark, Fila F-box, Kappa "Omini" logo, Ellesse half-dome, Burberry check, Fred Perry laurel, Fiorucci cherub, Moschino wordmark.
- If you see ANY of these motifs or a legible wordmark, return the brand name as a string. A 0.4-confidence "possibly Carhartt" is more useful to the seller than null.
- Use brand_confidence (0.0-1.0) to express how sure you are. 0.9 = wordmark fully legible; 0.6 = logo visible but partly obscured; 0.3 = distinctive stylistic cue but no wordmark; 0.0 = no brand signal at all.
- Only return brand: null when truly nothing readable is present. In that case brand_hints MUST be a non-empty string describing what you see (e.g., "white rectangular inside-collar tag visible but text illegible at this resolution — user can zoom").
- When brand is a string, brand_hints may be null.

PRICE RULES:
- price_suggestion_eur returns three EUR figures for the European second-hand market:
  - low  = quick-sale price (sells in 1-3 days on Vinted / Wallapop)
  - mid  = fair market value (sells in 1-2 weeks)
  - high = premium / collector price (may take 1+ months)
- Factor brand prestige, era desirability (Y2K, 90s grunge, 80s power, 70s disco command premiums), condition, material.
- Unbranded good-condition basics: low 5, mid 10, high 18.
- Mid-tier sportswear in good condition (Nike, adidas, Champion, Fila): low 15, mid 25, high 45.
- Heritage/streetwear (Carhartt, Stone Island, Ralph Lauren, Tommy Hilfiger): low 25, mid 45, high 90.
- Luxury (Burberry, Gucci, Prada, Moschino, Fiorucci): 3-10x the above bands.
- NWT/NWOT condition: add 20-50%. Poor/fair condition: halve.
- All figures are EUR, whole numbers, low <= mid <= high, all > 0. Never return zeros.

GENERAL RULES:
- Include 5-10 tags covering type, style, era, material, color, pattern, occasion.
- Tag values should be lowercase, searchable terms (e.g., "denim", "oversized", "retro").
- Be specific about era — use visual cues (stitching, labels, cut, fabric).
- For era_style, identify the specific fashion movement (mod, punk, grunge, Y2K, etc.).
- For condition, use ONLY one of: nwt, nwot, excellent, good, fair, poor.
- confidence (0-1) reflects how certain you are overall.
- Return ONLY the JSON, no markdown fences, no explanation.

WORKED EXAMPLE — a black streetwear t-shirt with a visible Carhartt square-C chest label, good condition:
{
  "item_type": "t-shirt",
  "brand": "Carhartt",
  "brand_confidence": 0.85,
  "brand_hints": null,
  "era": "2010s",
  "era_style": "10s streetwear",
  "material": "cotton",
  "color": "black",
  "size": null,
  "condition": "good",
  "tags": [
    {"category": "type", "value": "t-shirt"},
    {"category": "brand", "value": "carhartt"},
    {"category": "style", "value": "streetwear"},
    {"category": "era", "value": "10s"},
    {"category": "color", "value": "black"}
  ],
  "confidence": 0.82,
  "price_suggestion_eur": {"low": 18, "mid": 28, "high": 55}
}

WORKED EXAMPLE — a t-shirt where the inside label is folded and unreadable:
{
  "item_type": "t-shirt",
  "brand": null,
  "brand_confidence": 0.0,
  "brand_hints": "white rectangular inside-collar tag visible but text illegible at this resolution; user can zoom or re-shoot the tag",
  "era": "2000s",
  "era_style": "00s streetwear",
  "material": "cotton",
  "color": "black",
  "size": null,
  "condition": "good",
  "tags": [
    {"category": "type", "value": "t-shirt"},
    {"category": "style", "value": "streetwear"},
    {"category": "color", "value": "black"}
  ],
  "confidence": 0.6,
  "price_suggestion_eur": {"low": 6, "mid": 12, "high": 20}
}`;

function getUploadsRoot(): string {
  return process.env.UPLOADS_DIR || path.resolve("public/uploads");
}

export function validateImagePath(imagePath: string): string {
  const cleaned = imagePath.replace(/^\//, "");
  if (cleaned.includes("..")) {
    throw new Error("Invalid image path: path traversal not allowed");
  }
  if (!cleaned.startsWith("uploads/")) {
    throw new Error("Invalid image path: must be within uploads directory");
  }
  const filename = cleaned.slice("uploads/".length);
  const uploadsRoot = getUploadsRoot();
  const fullPath = path.resolve(uploadsRoot, filename);
  if (!fullPath.startsWith(uploadsRoot + path.sep) && fullPath !== uploadsRoot) {
    throw new Error("Invalid image path: must be within uploads directory");
  }
  return fullPath;
}

export async function recognizeItem(imagePath: string): Promise<RecognitionResult> {
  const fullPath = validateImagePath(imagePath);
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

  const response = await callClaude({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1536,
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
  return parseClaudeJSON<RecognitionResult>(text, "recognize");
}
