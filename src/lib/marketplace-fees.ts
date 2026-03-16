import type { Marketplace } from "@/types/item";

export const MARKETPLACE_FEES: Record<Marketplace, { name: string; feePercent: number }> = {
  vinted: { name: "Vinted", feePercent: 0 },
  ebay: { name: "eBay", feePercent: 13 },
};

export function getPlatformFee(marketplace: Marketplace | null, salePrice: number): number {
  if (!marketplace) return 0;
  const fee = MARKETPLACE_FEES[marketplace];
  return (salePrice * fee.feePercent) / 100;
}
