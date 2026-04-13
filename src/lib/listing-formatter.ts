import type { ItemWithTags, Marketplace, Condition } from "@/types/item";

/** Platform-specific listing output */
export interface FormattedListing {
  platform: Marketplace;
  title: string;
  description: string;
  hashtags: string[];
  category: string;
  price: number | null;
  /** Extra structured fields specific to the platform */
  extras: Record<string, string>;
}

const CONDITION_MAP_IT: Record<string, string> = {
  nwt: "Nuovo con cartellino",
  nwot: "Nuovo senza cartellino",
  excellent: "Eccellente",
  good: "Buono",
  fair: "Discreto",
  poor: "Scarso",
};

const CONDITION_MAP_VINTED: Record<string, string> = {
  nwt: "Nuovo con etichetta",
  nwot: "Nuovo senza etichetta",
  excellent: "Molto buono",
  good: "Buono",
  fair: "Soddisfacente",
  poor: "Soddisfacente",
};

const CONDITION_MAP_EBAY: Record<string, string> = {
  nwt: "New with tags",
  nwot: "New without tags",
  excellent: "Pre-owned - Excellent",
  good: "Pre-owned - Good",
  fair: "Pre-owned - Fair",
  poor: "Pre-owned - Fair",
};

function buildHashtags(item: ItemWithTags): string[] {
  const tags: string[] = ["#vintage"];
  if (item.brand) tags.push(`#${item.brand.replace(/[\s']/g, "").toLowerCase()}`);
  if (item.item_type) tags.push(`#${item.item_type.replace(/\s+/g, "").toLowerCase()}`);
  if (item.era) tags.push(`#${item.era.replace(/\s+/g, "")}`);
  if (item.era_style) tags.push(`#${item.era_style.replace(/\s+/g, "").toLowerCase()}`);
  if (item.color) tags.push(`#${item.color.replace(/\s+/g, "").toLowerCase()}`);
  if (item.material) tags.push(`#${item.material.replace(/\s+/g, "").toLowerCase()}`);
  // Add tags from the item's tag list
  for (const t of (item.tags || [])) {
    const tag = `#${t.value.replace(/\s+/g, "").toLowerCase()}`;
    if (!tags.includes(tag)) tags.push(tag);
  }
  tags.push("#secondhand", "#thrift", "#vintageclothing");
  return tags;
}

function inferCategory(item: ItemWithTags): string {
  const type = (item.item_type || "").toLowerCase();
  if (/giacca|jacket|blazer|coat|cappotto/.test(type)) return "Giacche e cappotti";
  if (/camicia|shirt|blouse/.test(type)) return "Camicie";
  if (/pantalon|jeans|pants|trousers/.test(type)) return "Pantaloni";
  if (/maglion|sweater|pullover|felpa/.test(type)) return "Maglieria";
  if (/vestit|dress|abito/.test(type)) return "Vestiti";
  if (/gonna|skirt/.test(type)) return "Gonne";
  if (/t-shirt|maglietta|tee/.test(type)) return "T-shirt";
  if (/scarpe|shoes|boots|stivali/.test(type)) return "Scarpe";
  if (/borsa|bag|zaino/.test(type)) return "Borse";
  if (/accessori|cintura|belt|sciarpa|scarf|cappello|hat/.test(type)) return "Accessori";
  return "Abbigliamento";
}

function shortTitle(item: ItemWithTags): string {
  const parts: string[] = [];
  if (item.brand) parts.push(item.brand);
  if (item.item_type) parts.push(item.item_type);
  if (item.era) parts.push(item.era);
  if (item.size) parts.push(`Tg. ${item.size}`);
  return parts.length > 0 ? parts.join(" ") : "Capo Vintage";
}

export function formatForVinted(item: ItemWithTags): FormattedListing {
  const hashtags = buildHashtags(item);
  const condLabel = CONDITION_MAP_VINTED[item.condition || ""] || "";
  const title = shortTitle(item);

  let desc = item.description_it || "";
  if (!desc) {
    const lines: string[] = [];
    if (item.brand) lines.push(`Brand: ${item.brand}`);
    if (item.era) lines.push(`Epoca: ${item.era}${item.era_style ? ` (${item.era_style})` : ""}`);
    if (item.material) lines.push(`Materiale: ${item.material}`);
    if (item.color) lines.push(`Colore: ${item.color}`);
    if (item.size) lines.push(`Taglia: ${item.size}`);
    if (condLabel) lines.push(`Condizioni: ${condLabel}`);
    desc = lines.join("\n");
  }
  desc += "\n\n" + hashtags.join(" ");

  return {
    platform: "vinted",
    title: title.slice(0, 100),
    description: desc.slice(0, 2000),
    hashtags,
    category: inferCategory(item),
    price: item.sale_price,
    extras: {
      condition: condLabel,
      size: item.size || "",
      brand: item.brand || "",
      color: item.color || "",
      material: item.material || "",
    },
  };
}

export function formatForDepop(item: ItemWithTags): FormattedListing {
  const hashtags = buildHashtags(item);
  // Depop: add extra trendy hashtags
  hashtags.push("#y2k", "#retro", "#depopfinds");
  const title = shortTitle(item);

  let desc = item.description_en || item.description_it || "";
  if (!desc) {
    const lines: string[] = [];
    lines.push(title);
    if (item.material) lines.push(`Material: ${item.material}`);
    if (item.size) lines.push(`Size: ${item.size}`);
    if (item.condition) lines.push(`Condition: ${CONDITION_MAP_IT[item.condition] || item.condition}`);
    desc = lines.join("\n");
  }
  desc += "\n\n" + hashtags.join(" ");

  return {
    platform: "depop",
    title: title.slice(0, 80),
    description: desc.slice(0, 1000),
    hashtags,
    category: inferCategory(item),
    price: item.sale_price,
    extras: {
      size: item.size || "",
      brand: item.brand || "",
      condition: CONDITION_MAP_IT[item.condition || ""] || "",
    },
  };
}

export function formatForWallapop(item: ItemWithTags): FormattedListing {
  const hashtags = buildHashtags(item);
  const title = shortTitle(item);

  let desc = item.description_it || "";
  if (!desc) {
    const lines: string[] = [];
    if (item.brand) lines.push(`Brand: ${item.brand}`);
    if (item.material) lines.push(`Materiale: ${item.material}`);
    if (item.size) lines.push(`Taglia: ${item.size}`);
    if (item.condition) lines.push(`Condizioni: ${CONDITION_MAP_IT[item.condition] || item.condition}`);
    lines.push("Spedizione disponibile. Contattami per info!");
    desc = lines.join("\n");
  }

  return {
    platform: "wallapop",
    title: title.slice(0, 100),
    description: desc.slice(0, 650),
    hashtags,
    category: inferCategory(item),
    price: item.sale_price,
    extras: {
      condition: CONDITION_MAP_IT[item.condition || ""] || "",
    },
  };
}

export function formatForEbay(item: ItemWithTags): FormattedListing {
  const hashtags = buildHashtags(item);
  const condLabel = CONDITION_MAP_EBAY[item.condition || ""] || "Pre-owned";

  // eBay: keyword-rich title
  const titleParts: string[] = [];
  if (item.brand) titleParts.push(item.brand);
  if (item.item_type) titleParts.push(item.item_type);
  if (item.era) titleParts.push(`Vintage ${item.era}`);
  if (item.material) titleParts.push(item.material);
  if (item.color) titleParts.push(item.color);
  if (item.size) titleParts.push(`Size ${item.size}`);
  const title = titleParts.join(" ") || "Vintage Garment";

  let desc = item.description_en || item.description_it || "";
  if (!desc) {
    const lines: string[] = [];
    lines.push(title);
    lines.push("");
    lines.push("Item Specifics:");
    if (item.brand) lines.push(`  Brand: ${item.brand}`);
    if (item.era) lines.push(`  Era: ${item.era}${item.era_style ? ` (${item.era_style})` : ""}`);
    if (item.material) lines.push(`  Material: ${item.material}`);
    if (item.color) lines.push(`  Color: ${item.color}`);
    if (item.size) lines.push(`  Size: ${item.size}`);
    lines.push(`  Condition: ${condLabel}`);
    desc = lines.join("\n");
  }

  return {
    platform: "ebay",
    title: title.slice(0, 80),
    description: desc.slice(0, 2000),
    hashtags,
    category: inferCategory(item),
    price: item.sale_price,
    extras: {
      condition: condLabel,
      brand: item.brand || "Unbranded",
      size: item.size || "",
      color: item.color || "",
      material: item.material || "",
      era: item.era || "",
      style: item.era_style || "",
      item_specifics_type: item.item_type || "",
    },
  };
}

export function formatForVestiaire(item: ItemWithTags): FormattedListing {
  const hashtags = buildHashtags(item);

  const titleParts: string[] = [];
  if (item.brand) titleParts.push(item.brand);
  if (item.item_type) titleParts.push(item.item_type);
  if (item.material) titleParts.push(`in ${item.material}`);
  if (item.color) titleParts.push(item.color);
  const title = titleParts.join(" ") || "Vintage Piece";

  let desc = item.description_en || item.description_it || "";
  if (!desc) {
    const lines: string[] = [];
    lines.push(`${title} - Vintage${item.era ? ` ${item.era}` : ""}`);
    if (item.material) lines.push(`Fabric: ${item.material}`);
    if (item.size) lines.push(`Size: ${item.size}`);
    if (item.condition) lines.push(`Condition: ${CONDITION_MAP_EBAY[item.condition] || item.condition}`);
    if (item.era_style) lines.push(`Style: ${item.era_style}`);
    desc = lines.join("\n");
  }

  return {
    platform: "vestiaire",
    title: title.slice(0, 100),
    description: desc.slice(0, 1500),
    hashtags,
    category: inferCategory(item),
    price: item.sale_price,
    extras: {
      condition: CONDITION_MAP_EBAY[item.condition || ""] || "Good",
      brand: item.brand || "",
      size: item.size || "",
      color: item.color || "",
      material: item.material || "",
    },
  };
}

/** Format a listing for any supported platform */
export function formatListing(item: ItemWithTags, platform: Marketplace): FormattedListing {
  switch (platform) {
    case "vinted": return formatForVinted(item);
    case "depop": return formatForDepop(item);
    case "wallapop": return formatForWallapop(item);
    case "ebay": return formatForEbay(item);
    case "vestiaire": return formatForVestiaire(item);
    case "subito": return formatForWallapop({ ...item }); // Similar format to Wallapop
    case "facebook": return formatForWallapop({ ...item }); // Similar format to Wallapop
    default:
      return formatForVinted(item);
  }
}

/** The 5 target platforms for listing */
export const LISTING_PLATFORMS: Marketplace[] = [
  "vinted", "depop", "wallapop", "ebay", "vestiaire",
];

/** Platforms that support direct API publishing */
export const API_PLATFORMS: Marketplace[] = ["ebay"];

/** Platforms that need copy-paste export */
export const CLIPBOARD_PLATFORMS: Marketplace[] = ["vinted", "depop", "wallapop", "vestiaire"];
