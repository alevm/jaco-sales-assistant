export interface MarginSummary {
  total_revenue: number;
  total_cogs: number;
  total_fees: number;
  total_shipping: number;
  total_margin: number;
  margin_percent: number;
  items_sold: number;
  items_listed: number;
  items_draft: number;
  avg_margin_per_item: number;
}

export interface MarginByGroup {
  group: string;
  revenue: number;
  cogs: number;
  fees: number;
  shipping: number;
  margin: number;
  margin_percent: number;
  count: number;
}

export interface AgingItem {
  id: string;
  item_type: string | null;
  brand: string | null;
  sale_price: number | null;
  marketplace: string | null;
  created_at: string;
  days_listed: number;
}

export interface AgingData {
  items: AgingItem[];
  stale_count: number;
  total_listed: number;
}

export interface DashboardData {
  summary: MarginSummary;
  by_marketplace: MarginByGroup[];
  by_period: MarginByGroup[];
  recent_sales: Array<{
    id: string;
    item_type: string | null;
    brand: string | null;
    sold_price: number;
    cogs: number;
    shipping_cost: number | null;
    marketplace: string;
    sold_at: string;
    margin: number;
  }>;
  aging: AgingData;
}
