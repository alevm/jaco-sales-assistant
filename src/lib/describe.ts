import { getClaude } from "./claude";
import type { RecognitionResult, Marketplace } from "@/types/item";

function getSeason(): string {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return "primavera";
  if (month >= 5 && month <= 7) return "estate";
  if (month >= 8 && month <= 10) return "autunno";
  return "inverno";
}

function getSeasonalHint(season: string): string {
  return `Siamo in ${season}. Adatta il tono e i suggerimenti di styling alla stagione corrente. Se il capo è fuori stagione, suggerisci di acquistarlo ora a un buon prezzo per la prossima stagione.`;
}

const PROMPTS: Record<string, Record<string, string>> = {
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
  depop: {
    it: `Sei un venditore vintage su Depop, specializzato in streetwear e moda Y2K. Scrivi una descrizione trendy.

STILE: informale, giovane, con emoji. Hashtag importanti alla fine. Max 600 caratteri.
STRUTTURA:
- Titolo catchy e diretto
- Descrizione breve e di impatto
- Dettagli essenziali: brand, era, taglia, condizione
- Hashtag (minimo 5)

Rispondi SOLO con la descrizione, niente altro.`,
    en: `You are a vintage seller on Depop, specializing in streetwear and Y2K fashion. Write a trendy description.

STYLE: informal, youthful, with emoji. Important hashtags at the end. Max 600 characters.
STRUCTURE:
- Catchy, direct title
- Short, impactful description
- Essential details: brand, era, size, condition
- Hashtags (minimum 5)

Reply ONLY with the description, nothing else.`,
  },
  vestiaire: {
    it: `Sei un esperto venditore di lusso vintage su Vestiaire Collective. Scrivi una descrizione elegante e dettagliata.

STILE: raffinato, professionale, orientato al lusso. Max 1000 caratteri.
STRUTTURA:
- Titolo elegante (brand + tipo + dettaglio distintivo)
- Descrizione del capo con focus su qualità e rarità
- Specifiche precise: brand, epoca, materiale, taglia, stato di conservazione
- Autenticità e provenienza se disponibili

Rispondi SOLO con la descrizione, niente altro.`,
    en: `You are a luxury vintage expert on Vestiaire Collective. Write an elegant, detailed description.

STYLE: refined, professional, luxury-oriented. Max 1000 characters.
STRUCTURE:
- Elegant title (brand + type + distinctive detail)
- Description focused on quality and rarity
- Precise specs: brand, era, material, size, conservation state
- Authenticity and provenance if available

Reply ONLY with the description, nothing else.`,
  },
  wallapop: {
    it: `Sei un venditore su Wallapop. Scrivi una descrizione semplice e diretta per vendita locale.

STILE: diretto, amichevole, orientato alla vendita rapida. Max 600 caratteri.
STRUTTURA:
- Titolo chiaro (tipo + brand se presente)
- Descrizione concisa
- Dettagli: taglia, condizione, materiale
- Invito a contattare per info

Rispondi SOLO con la descrizione, niente altro.`,
    en: `You are a seller on Wallapop. Write a simple, direct description for local selling.

STYLE: direct, friendly, quick-sale oriented. Max 600 characters.
STRUCTURE:
- Clear title (type + brand if applicable)
- Concise description
- Details: size, condition, material
- Invitation to contact for info

Reply ONLY with the description, nothing else.`,
  },
  subito: {
    it: `Sei un venditore su Subito.it. Scrivi una descrizione chiara e completa per vendita in Italia.

STILE: chiaro, completo, affidabile. Max 800 caratteri.
STRUTTURA:
- Titolo descrittivo (tipo + brand + taglia)
- Descrizione del capo
- Dettagli: brand, materiale, taglia, condizioni
- Info su spedizione/ritiro

Rispondi SOLO con la descrizione, niente altro.`,
    en: `You are a seller on Subito.it. Write a clear, complete description for selling in Italy.

STYLE: clear, complete, trustworthy. Max 800 characters.
STRUCTURE:
- Descriptive title (type + brand + size)
- Garment description
- Details: brand, material, size, condition
- Shipping/pickup info

Reply ONLY with the description, nothing else.`,
  },
  facebook: {
    it: `Sei un venditore su Facebook Marketplace. Scrivi una descrizione breve e accattivante.

STILE: informale, diretto, amichevole. Max 500 caratteri.
STRUTTURA:
- Titolo chiaro
- Descrizione essenziale
- Taglia e condizione
- Prezzo trattabile / info

Rispondi SOLO con la descrizione, niente altro.`,
    en: `You are a seller on Facebook Marketplace. Write a short, catchy description.

STYLE: informal, direct, friendly. Max 500 characters.
STRUCTURE:
- Clear title
- Essential description
- Size and condition
- Price negotiable / info

Reply ONLY with the description, nothing else.`,
  },
};

export async function generateDescription(
  recognition: RecognitionResult,
  marketplace: Marketplace,
  locale: "it" | "en"
): Promise<string> {
  const claude = getClaude();
  const basePrompt = PROMPTS[marketplace]?.[locale] || PROMPTS.vinted[locale];
  const season = getSeason();
  const seasonalHint = getSeasonalHint(season);
  const systemPrompt = `${basePrompt}\n\n${seasonalHint}`;

  const itemInfo = `
Tipo: ${recognition.item_type}
Brand: ${recognition.brand || "Non identificato"}
Era: ${recognition.era}${recognition.era_style ? ` (${recognition.era_style})` : ""}
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
