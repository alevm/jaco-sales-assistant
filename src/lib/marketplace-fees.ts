import type { Marketplace } from "@/types/item";

export interface FeeStructure {
  name: string;
  feePercent: number;
  fixedFee: number;
  notes: string;
}

export const MARKETPLACE_FEES: Record<Marketplace, FeeStructure> = {
  vinted: {
    name: "Vinted",
    feePercent: 0,
    fixedFee: 0,
    notes: "Nessuna commissione venditore",
  },
  ebay: {
    name: "eBay",
    feePercent: 13,
    fixedFee: 0.35,
    notes: "13% + €0.35 per inserzione (abbigliamento)",
  },
  depop: {
    name: "Depop",
    feePercent: 10,
    fixedFee: 0,
    notes: "10% commissione venditore",
  },
  vestiaire: {
    name: "Vestiaire Collective",
    feePercent: 15,
    fixedFee: 0,
    notes: "15% standard (varia per fascia di prezzo)",
  },
  wallapop: {
    name: "Wallapop",
    feePercent: 0,
    fixedFee: 0,
    notes: "Nessuna commissione (vendita diretta)",
  },
  subito: {
    name: "Subito",
    feePercent: 0,
    fixedFee: 0,
    notes: "Nessuna commissione (vendita diretta)",
  },
  facebook: {
    name: "Facebook Marketplace",
    feePercent: 0,
    fixedFee: 0,
    notes: "Nessuna commissione (vendita diretta)",
  },
};

export function getPlatformFee(marketplace: Marketplace | null, salePrice: number): number {
  if (!marketplace) return 0;
  const fee = MARKETPLACE_FEES[marketplace];
  return (salePrice * fee.feePercent) / 100 + fee.fixedFee;
}

export function getFeeLabel(marketplace: Marketplace): string {
  const fee = MARKETPLACE_FEES[marketplace];
  const parts: string[] = [];
  if (fee.feePercent > 0) parts.push(`${fee.feePercent}%`);
  if (fee.fixedFee > 0) parts.push(`€${fee.fixedFee.toFixed(2)}`);
  return parts.length > 0 ? parts.join(" + ") : "Gratis";
}
