import { getClaude } from "./claude";
import type { RecognitionResult, Marketplace } from "@/types/item";

const PROMPTS: Record<Marketplace, Record<string, string>> = {
  vinted: {
    it: `Sei un esperto venditore vintage su Vinted Italia. Scrivi una descrizione accattivante per questo capo.

STILE: casual, diretto, con emoji. Usa hashtag alla fine. Max 800 caratteri.
STRUTTURA:
- Titolo accattivante (1 riga)
- Descrizione del capo (2-3 righe)
- Dettagli: brand, era, materiale, taglia, condizione
- Hashtag rilevanti

Rispondi SOLO con la descrizione, niente altro.`,
    en: `You are an expert vintage seller on Vinted. Write a compelling listing description.

STYLE: casual, direct, with emoji. Hashtags at the end. Max 800 characters.
STRUCTURE:
- Catchy title (1 line)
- Garment description (2-3 lines)
- Details: brand, era, material, size, condition
- Relevant hashtags

Reply ONLY with the description, nothing else.`,
  },
  ebay: {
    it: `Sei un esperto venditore vintage su eBay. Scrivi una descrizione professionale per questo capo.

STILE: dettagliato, professionale, SEO-friendly. Max 1200 caratteri.
STRUTTURA:
- Titolo con keywords (brand + tipo + era + taglia)
- Descrizione dettagliata del capo
- Specifiche: brand, periodo, materiale, taglia, condizioni, difetti
- Parole chiave per la ricerca

Rispondi SOLO con la descrizione, niente altro.`,
    en: `You are an expert vintage seller on eBay. Write a professional listing description.

STYLE: detailed, professional, SEO-friendly. Max 1200 characters.
STRUCTURE:
- Keyword-rich title (brand + type + era + size)
- Detailed garment description
- Specs: brand, period, material, size, condition, any flaws
- Search-friendly keywords

Reply ONLY with the description, nothing else.`,
  },
};

export async function generateDescription(
  recognition: RecognitionResult,
  marketplace: Marketplace,
  locale: "it" | "en"
): Promise<string> {
  const claude = getClaude();
  const systemPrompt = PROMPTS[marketplace][locale];

  const itemInfo = `
Tipo: ${recognition.item_type}
Brand: ${recognition.brand || "Non identificato"}
Era: ${recognition.era}
Materiale: ${recognition.material}
Colore: ${recognition.color}
Taglia: ${recognition.size || "Non specificata"}
Condizione: ${recognition.condition}
Tags: ${recognition.tags.map((t) => t.value).join(", ")}
`.trim();

  const response = await claude.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    temperature: 0.7,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Genera la descrizione per questo capo vintage:\n\n${itemInfo}`,
      },
    ],
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}
