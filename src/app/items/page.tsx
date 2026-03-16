"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import type { ItemWithTags, ItemStatus, Marketplace } from "@/types/item";

type ItemResponse = Omit<ItemWithTags, "image_paths"> & { image_paths: string[] };

const STATUS_BADGE: Record<ItemStatus, string> = {
  draft: "bg-stone-200 text-stone-700",
  listed: "bg-amber-100 text-amber-800",
  sold: "bg-green-100 text-green-800",
};

const STATUS_LABEL: Record<ItemStatus, string> = {
  draft: "Bozza",
  listed: "In vendita",
  sold: "Venduto",
};

const MARKETPLACE_BADGE: Record<string, string> = {
  vinted: "bg-teal-100 text-teal-800",
  ebay: "bg-blue-100 text-blue-800",
};

function formatEUR(cents: number | null): string {
  if (cents == null) return "—";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents);
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-stone-200 bg-white overflow-hidden animate-pulse">
      <div className="aspect-[4/3] bg-stone-200" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-stone-200 rounded w-3/4" />
        <div className="h-3 bg-stone-100 rounded w-1/2" />
        <div className="flex gap-2">
          <div className="h-5 bg-stone-100 rounded-full w-16" />
          <div className="h-5 bg-stone-100 rounded-full w-14" />
        </div>
      </div>
    </div>
  );
}

export default function ItemsPage() {
  const [items, setItems] = useState<ItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ItemStatus>("all");
  const [marketplaceFilter, setMarketplaceFilter] = useState<"all" | Marketplace>("all");

  useEffect(() => {
    async function fetchItems() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (marketplaceFilter !== "all") params.set("marketplace", marketplaceFilter);
        if (search.trim()) params.set("q", search.trim());

        const res = await fetch(`/api/items?${params.toString()}`);
        if (res.ok) {
          setItems(await res.json());
        }
      } finally {
        setLoading(false);
      }
    }

    const timeout = setTimeout(fetchItems, search ? 300 : 0);
    return () => clearTimeout(timeout);
  }, [statusFilter, marketplaceFilter, search]);

  const filteredItems = useMemo(() => items, [items]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Inventario</h1>
          {!loading && (
            <p className="text-sm text-stone-500 mt-0.5">
              {filteredItems.length} {filteredItems.length === 1 ? "capo" : "capi"}
            </p>
          )}
        </div>
        <Link
          href="/items/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-colors"
        >
          <span className="text-lg leading-none">+</span>
          Nuovo Capo
        </Link>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Cerca per tipo, marca, descrizione..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3.5 py-2 rounded-lg border border-stone-300 bg-white text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-colors"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | ItemStatus)}
          className="px-3 py-2 rounded-lg border border-stone-300 bg-white text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
        >
          <option value="all">Tutti gli stati</option>
          <option value="draft">Bozza</option>
          <option value="listed">In vendita</option>
          <option value="sold">Venduto</option>
        </select>

        <select
          value={marketplaceFilter}
          onChange={(e) => setMarketplaceFilter(e.target.value as "all" | Marketplace)}
          className="px-3 py-2 rounded-lg border border-stone-300 bg-white text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
        >
          <option value="all">Tutti i marketplace</option>
          <option value="vinted">Vinted</option>
          <option value="ebay">eBay</option>
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">👕</div>
          <h2 className="text-lg font-semibold text-stone-700">Nessun capo trovato</h2>
          <p className="text-sm text-stone-500 mt-1 mb-6">
            {search || statusFilter !== "all" || marketplaceFilter !== "all"
              ? "Prova a modificare i filtri di ricerca."
              : "Inizia aggiungendo il tuo primo capo vintage."}
          </p>
          {!search && statusFilter === "all" && marketplaceFilter === "all" && (
            <Link
              href="/items/new"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-colors"
            >
              <span className="text-lg leading-none">+</span>
              Aggiungi il primo capo
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <Link
              key={item.id}
              href={`/items/${item.id}`}
              className="group rounded-xl border border-stone-200 bg-white overflow-hidden hover:shadow-lg hover:border-amber-300 hover:-translate-y-0.5 transition-all duration-200"
            >
              {/* Image */}
              <div className="aspect-[4/3] bg-stone-100 relative overflow-hidden">
                {item.image_paths.length > 0 ? (
                  <img
                    src={item.image_paths[0]}
                    alt={item.item_type || "Item"}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-300">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4 space-y-2.5">
                <div>
                  <h3 className="font-semibold text-stone-900 truncate">
                    {[item.item_type, item.brand].filter(Boolean).join(" — ") || "Senza nome"}
                  </h3>
                  {item.era && (
                    <p className="text-xs text-stone-500 mt-0.5">{item.era}</p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-amber-700">
                    {formatEUR(item.sale_price)}
                  </span>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[item.status]}`}
                  >
                    {STATUS_LABEL[item.status]}
                  </span>
                  {item.marketplace && (
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${MARKETPLACE_BADGE[item.marketplace]}`}
                    >
                      {item.marketplace}
                    </span>
                  )}
                </div>

                {/* Tags */}
                {item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {item.tags.slice(0, 5).map((tag, i) => (
                      <span
                        key={i}
                        className="inline-block px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 text-[11px]"
                      >
                        {tag.value}
                      </span>
                    ))}
                    {item.tags.length > 5 && (
                      <span className="inline-block px-1.5 py-0.5 text-stone-400 text-[11px]">
                        +{item.tags.length - 5}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
