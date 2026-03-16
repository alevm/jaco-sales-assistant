export interface MarginSummary {
  total_revenue: number;
  total_cogs: number;
  total_fees: number;
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
  margin: number;
  margin_percent: number;
  count: number;
}

export interface DashboardData {
  summary: MarginSummary;
  by_marketplace: MarginByGroup[];
  by_period: MarginByGroup[];
  recent_sales: {
    id: string;
    item_type: string | null;
    brand: string | null;
    sold_price: number;
    cogs: number;
    margin: number;
    marketplace: string;
    sold_at: string;
  }[];
}
