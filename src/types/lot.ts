export interface Lot {
  id: string;
  name: string;
  total_cogs: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LotWithItems extends Lot {
  item_count: number;
  cogs_per_item: number;
}
