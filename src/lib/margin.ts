import type { Marketplace } from "@/types/item";
import { getPlatformFee } from "./marketplace-fees";

export interface MarginResult {
  platformFee: number;
  netRevenue: number;
  netMargin: number;
  marginPercent: number;
}

export function calculateMargin(
  salePrice: number,
  cogs: number,
  marketplace: Marketplace | null
): MarginResult {
  const platformFee = getPlatformFee(marketplace, salePrice);
  const netRevenue = salePrice - platformFee;
  const netMargin = netRevenue - cogs;
  const marginPercent = salePrice > 0 ? (netMargin / salePrice) * 100 : 0;

  return { platformFee, netRevenue, netMargin, marginPercent };
}
