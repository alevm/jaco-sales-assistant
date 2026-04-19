import type { Marketplace } from "@/types/item";
import type { FormattedListing } from "@/lib/listing-formatter";

/** Italian platform names used in the localized README instructions */
const PLATFORM_LABEL_IT: Record<Marketplace, string> = {
  vinted: "Vinted",
  depop: "Depop",
  wallapop: "Wallapop",
  ebay: "eBay",
  vestiaire: "Vestiaire Collective",
  subito: "Subito",
  facebook: "Facebook Marketplace",
};

const PLATFORM_URL: Record<Marketplace, string> = {
  vinted: "vinted.it",
  depop: "depop.com",
  wallapop: "wallapop.com",
  ebay: "ebay.it",
  vestiaire: "vestiairecollective.com",
  subito: "subito.it",
  facebook: "facebook.com/marketplace",
};

/** Localized 3-step README for a platform. eBay uses English because sellers there work in EN;
 *  every other platform uses Italian since that is Jacopo's working language. */
export function buildReadme(platform: Marketplace): string {
  const label = PLATFORM_LABEL_IT[platform];
  const url = PLATFORM_URL[platform];
  if (platform === "ebay") {
    return [
      `1. Open the ${label} app (or ${url}) and tap "Sell".`,
      `2. Drag or select every photo inside the photos/ folder.`,
      `3. Copy and paste the content of listing.txt into the title and description fields.`,
      "",
    ].join("\n");
  }
  return [
    `1. Apri l'app ${label} (o ${url}) e premi "Vendi".`,
    `2. Trascina o seleziona tutte le foto nella cartella photos/.`,
    `3. Copia e incolla il contenuto di listing.txt nei campi titolo e descrizione.`,
    "",
  ].join("\n");
}

/** Render a FormattedListing as a plain-text block that fits in a single copy-paste. */
export function buildListingText(listing: FormattedListing): string {
  const lines: string[] = [];
  lines.push(`Titolo: ${listing.title}`);
  lines.push("");
  lines.push("Descrizione:");
  lines.push(listing.description);
  lines.push("");
  if (listing.hashtags.length > 0) {
    lines.push(`Hashtag: ${listing.hashtags.join(" ")}`);
  }
  lines.push(`Categoria: ${listing.category}`);
  if (listing.price != null) {
    lines.push(`Prezzo: EUR ${listing.price.toFixed(2)}`);
  }
  const extras = Object.entries(listing.extras).filter(([, v]) => v);
  if (extras.length > 0) {
    lines.push("");
    lines.push("Dettagli:");
    for (const [k, v] of extras) {
      lines.push(`  ${k}: ${v}`);
    }
  }
  return lines.join("\n") + "\n";
}
