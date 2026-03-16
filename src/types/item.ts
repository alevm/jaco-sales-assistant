export interface Item {
  id: string;
  lot_id: string | null;
  item_type: string | null;
  brand: string | null;
  era: string | null;
  material: string | null;
  color: string | null;
  size: string | null;
  condition: string | null;
  cogs: number | null;
  sale_price: number | null;
  sold_price: number | null;
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
export type Marketplace = "vinted" | "ebay";

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
  material: string;
  color: string;
  size: string | null;
  condition: string;
  tags: { category: string; value: string }[];
  confidence: number;
}

export interface ItemWithTags extends Item {
  tags: Tag[];
}
