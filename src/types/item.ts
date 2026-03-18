export interface Item {
  id: string;
  lot_id: string | null;
  item_type: string | null;
  brand: string | null;
  era: string | null;
  era_style: string | null;
  material: string | null;
  color: string | null;
  size: string | null;
  condition: string | null;
  cogs: number | null;
  sale_price: number | null;
  sold_price: number | null;
  shipping_cost: number | null;
  marketplace: Marketplace | null;
  status: ItemStatus;
  sold_at: string | null;
  description_it: string | null;
  description_en: string | null;
  recognition_raw: string | null;
  image_paths: string;
  created_at: string;
  updated_at: string;
}

export type ItemStatus = "draft" | "listed" | "sold";

export type Marketplace =
  | "vinted"
  | "ebay"
  | "depop"
  | "vestiaire"
  | "wallapop"
  | "subito"
  | "facebook";

export type Condition = "nwt" | "nwot" | "excellent" | "good" | "fair" | "poor";

export const CONDITION_LABELS: Record<Condition, string> = {
  nwt: "Nuovo con cartellino (NWT)",
  nwot: "Nuovo senza cartellino (NWOT)",
  excellent: "Eccellente",
  good: "Buono",
  fair: "Discreto",
  poor: "Scarso",
};

export const ERA_STYLES: Record<string, string[]> = {
  "1950s": ["rockabilly", "new look", "beatnik"],
  "1960s": ["mod", "hippie", "space age", "psychedelic"],
  "1970s": ["disco", "punk", "bohemian", "glam rock"],
  "1980s": ["power dressing", "new wave", "preppy", "athleisure"],
  "1990s": ["grunge", "minimalist", "hip hop", "rave"],
  "2000s": ["Y2K", "boho chic", "emo", "streetwear"],
};

export interface Tag {
  id?: number;
  item_id: string;
  category: string;
  value: string;
}

export interface RecognitionResult {
  item_type: string;
  brand: string | null;
  era: string;
  era_style: string | null;
  material: string;
  color: string;
  size: string | null;
  condition: Condition;
  tags: { category: string; value: string }[];
  confidence: number;
}

export interface ItemWithTags extends Item {
  tags: Tag[];
}

export interface ItemListing {
  id: string;
  item_id: string;
  marketplace: Marketplace;
  sale_price: number | null;
  sold_price: number | null;
  shipping_cost: number | null;
  status: ItemStatus;
  listed_at: string | null;
  sold_at: string | null;
  description_it: string | null;
  description_en: string | null;
  created_at: string;
  updated_at: string;
}
