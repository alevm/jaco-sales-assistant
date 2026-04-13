"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { DashboardData } from "@/types/dashboard";
import { PriceTrends } from "@/components/dashboard/price-trends";

function eur(value: number): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function pct(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function marginPrefix(value: number): string {
  return value >= 0 ? "+" : "";
}

type DatePreset = "all" | "month" | "30d" | "quarter" | "year";

function getDateRange(preset: DatePreset): { from?: string; to?: string } {
  if (preset === "all") return {};
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  let from: string;
  switch (preset) {
    case "month":
      from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      break;
    case "30d":
      from = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10);
      break;
    case "quarter": {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      from = new Date(now.getFullYear(), qMonth, 1).toISOString().slice(0, 10);
      break;
    }
    case "year":
      from = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
      break;
  }
  return { from, to };
}

function agingColor(days: number): string {
  if (days >= 30) return "text-red-600 bg-red-50";
  if (days >= 15) return "text-amber-600 bg-amber-50";
  return "text-emerald-600 bg-emerald-50";
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [datePreset, setDatePreset] = useState<DatePreset>("all");

  useEffect(() => {
    setLoading(true);
    const range = getDateRange(datePreset);
    const params = new URLSearchParams();
    if (range.from) params.set("from", range.from);
    if (range.to) params.set("to", range.to);

    fetch(`/api/dashboard?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Errore nel caricamento dei dati");
        return res.json();
      })
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [datePreset]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-stone-300 border-t-amber-500 rounded-full animate-spin mx-auto" role="status" />
          <p className="text-stone-500 text-sm">Caricamento dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="bg-red-50 border border-red-200 rounded-xl px-6 py-4 text-red-700 text-sm" role="alert">
          {error}
        </div>
      </div>
    );
  }

  if (
    !data ||
    (data.summary.items_sold === 0 &&
      data.summary.items_listed === 0 &&
      data.summary.items_draft === 0)
  ) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-2">
          <p className="text-4xl">📊</p>
          <p className="text-stone-600 font-medium">Nessun dato disponibile</p>
          <p className="text-stone-400 text-sm">
            Inizia aggiungendo capi e registrando vendite per visualizzare le
            analisi dei margini.
          </p>
        </div>
      </div>
    );
  }

  const { summary, by_marketplace, by_period, recent_sales, aging } = data;

  return (
    <div className="space-y-8">
      {/* Header + Date Picker */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Dashboard</h1>
          <p className="text-stone-500 text-sm mt-1">Analisi margini e vendite</p>
        </div>
        <div className="flex gap-1.5" role="group" aria-label="Filtro periodo">
          {([
            ["all", "Tutto"],
            ["month", "Questo mese"],
            ["30d", "30 giorni"],
            ["quarter", "Trimestre"],
            ["year", "Anno"],
          ] as [DatePreset, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setDatePreset(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                datePreset === key
                  ? "bg-amber-600 text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" aria-live="polite">
        <SummaryCard
          label="Ricavo Totale"
          value={eur(summary.total_revenue)}
          sub={`${summary.items_sold} venduti`}
        />
        <SummaryCard
          label="Costo Merce (COGS)"
          value={eur(summary.total_cogs)}
        />
        <SummaryCard
          label="Commissioni"
          value={eur(summary.total_fees)}
        />
        <SummaryCard
          label="Spedizioni"
          value={eur(summary.total_shipping)}
        />
        <SummaryCard
          label="Margine Netto"
          value={`${marginPrefix(summary.total_margin)}${eur(summary.total_margin)}`}
          sub={pct(summary.margin_percent)}
          highlight
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          label="Capi Venduti"
          value={String(summary.items_sold)}
          sub={`Media ${eur(summary.avg_margin_per_item)} / capo`}
        />
        <SummaryCard
          label="Capi in Vendita"
          value={String(summary.items_listed)}
        />
        <SummaryCard
          label="Bozze"
          value={String(summary.items_draft)}
        />
      </div>

      {/* Inventory Aging */}
      {aging && aging.items.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-stone-700">Inventario Fermo</h2>
            {aging.stale_count > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                ⚠ {aging.stale_count} da 30+ giorni
              </span>
            )}
          </div>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-stone-200">
            <table className="w-full text-sm">
              <caption className="sr-only">Capi in vendita ordinati per tempo di giacenza</caption>
              <thead>
                <tr className="bg-stone-50 text-stone-500 text-left">
                  <th scope="col" className="px-4 py-3 font-medium">Capo</th>
                  <th scope="col" className="px-4 py-3 font-medium">Brand</th>
                  <th scope="col" className="px-4 py-3 font-medium">Marketplace</th>
                  <th scope="col" className="px-4 py-3 font-medium text-right">Prezzo</th>
                  <th scope="col" className="px-4 py-3 font-medium text-right">Giorni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {aging.items.slice(0, 10).map((item) => (
                  <tr key={item.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3">
                      <Link href={`/items/${item.id}`} className="text-amber-700 hover:underline font-medium">
                        {item.item_type || "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-stone-600">{item.brand || "—"}</td>
                    <td className="px-4 py-3 text-stone-600 capitalize">{item.marketplace || "—"}</td>
                    <td className="px-4 py-3 text-right text-stone-600">
                      {item.sale_price != null ? eur(item.sale_price) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${agingColor(item.days_listed)}`}>
                        {item.days_listed}g
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Marketplace Breakdown */}
      {by_marketplace.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-stone-700">Per Marketplace</h2>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-stone-200">
            <table className="w-full text-sm">
              <caption className="sr-only">Ripartizione vendite per marketplace</caption>
              <thead>
                <tr className="bg-stone-50 text-stone-500 text-left">
                  <th scope="col" className="px-4 py-3 font-medium">Marketplace</th>
                  <th scope="col" className="px-4 py-3 font-medium text-right">Ricavo</th>
                  <th scope="col" className="px-4 py-3 font-medium text-right">COGS</th>
                  <th scope="col" className="px-4 py-3 font-medium text-right">Commissioni</th>
                  <th scope="col" className="px-4 py-3 font-medium text-right">Spedizioni</th>
                  <th scope="col" className="px-4 py-3 font-medium text-right">Margine</th>
                  <th scope="col" className="px-4 py-3 font-medium text-right">Margine %</th>
                  <th scope="col" className="px-4 py-3 font-medium text-right">Vendite</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {by_marketplace.map((row) => (
                  <tr key={row.group} className="hover:bg-stone-50">
                    <td className="px-4 py-3 font-medium text-stone-800 capitalize">{row.group}</td>
                    <td className="px-4 py-3 text-right text-stone-600">{eur(row.revenue)}</td>
                    <td className="px-4 py-3 text-right text-stone-600">{eur(row.cogs)}</td>
                    <td className="px-4 py-3 text-right text-stone-600">{eur(row.fees)}</td>
                    <td className="px-4 py-3 text-right text-stone-600">{eur(row.shipping)}</td>
                    <td className={`px-4 py-3 text-right font-medium ${row.margin >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {marginPrefix(row.margin)}{eur(row.margin)}
                    </td>
                    <td className={`px-4 py-3 text-right ${row.margin_percent >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {pct(row.margin_percent)}
                    </td>
                    <td className="px-4 py-3 text-right text-stone-600">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Price Trend Analysis */}
      <PriceTrends />

      {/* Monthly Breakdown */}
      {by_period.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-stone-700">Per Periodo</h2>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-stone-200">
            <table className="w-full text-sm">
              <caption className="sr-only">Ripartizione vendite per periodo mensile</caption>
              <thead>
                <tr className="bg-stone-50 text-stone-500 text-left">
                  <th scope="col" className="px-4 py-3 font-medium">Periodo</th>
                  <th scope="col" className="px-4 py-3 font-medium text-right">Ricavo</th>
                  <th scope="col" className="px-4 py-3 font-medium text-right">COGS</th>
                  <th scope="col" className="px-4 py-3 font-medium text-right">Commissioni</th>
                  <th scope="col" className="px-4 py-3 font-medium text-right">Spedizioni</th>
                  <th scope="col" className="px-4 py-3 font-medium text-right">Margine</th>
                  <th scope="col" className="px-4 py-3 font-medium text-right">Margine %</th>
                  <th scope="col" className="px-4 py-3 font-medium text-right">Vendite</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {by_period.map((row) => (
                  <tr key={row.group} className="hover:bg-stone-50">
                    <td className="px-4 py-3 font-medium text-stone-800">{row.group}</td>
                    <td className="px-4 py-3 text-right text-stone-600">{eur(row.revenue)}</td>
                    <td className="px-4 py-3 text-right text-stone-600">{eur(row.cogs)}</td>
                    <td className="px-4 py-3 text-right text-stone-600">{eur(row.fees)}</td>
                    <td className="px-4 py-3 text-right text-stone-600">{eur(row.shipping)}</td>
                    <td className={`px-4 py-3 text-right font-medium ${row.margin >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {marginPrefix(row.margin)}{eur(row.margin)}
                    </td>
                    <td className={`px-4 py-3 text-right ${row.margin_percent >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {pct(row.margin_percent)}
                    </td>
                    <td className="px-4 py-3 text-right text-stone-600">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Recent Sales */}
      {recent_sales.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-stone-700">Vendite Recenti</h2>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-stone-200">
            <table className="w-full text-sm">
              <caption className="sr-only">Ultime 20 vendite con margini</caption>
              <thead>
                <tr className="bg-stone-50 text-stone-500 text-left">
                  <th scope="col" className="px-4 py-3 font-medium">Capo</th>
                  <th scope="col" className="px-4 py-3 font-medium">Brand</th>
                  <th scope="col" className="px-4 py-3 font-medium">Marketplace</th>
                  <th scope="col" className="px-4 py-3 font-medium text-right">Prezzo Vendita</th>
                  <th scope="col" className="px-4 py-3 font-medium text-right">COGS</th>
                  <th scope="col" className="px-4 py-3 font-medium text-right">Margine</th>
                  <th scope="col" className="px-4 py-3 font-medium">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {recent_sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3 text-stone-800">{sale.item_type || "—"}</td>
                    <td className="px-4 py-3 text-stone-600">{sale.brand || "—"}</td>
                    <td className="px-4 py-3 text-stone-600 capitalize">{sale.marketplace}</td>
                    <td className="px-4 py-3 text-right text-stone-600">{eur(sale.sold_price)}</td>
                    <td className="px-4 py-3 text-right text-stone-600">{eur(sale.cogs)}</td>
                    <td className={`px-4 py-3 text-right font-medium ${sale.margin >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {marginPrefix(sale.margin)}{eur(sale.margin)}
                    </td>
                    <td className="px-4 py-3 text-stone-500">
                      {new Date(sale.sold_at).toLocaleDateString("it-IT")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl shadow-sm border p-5 ${
        highlight
          ? "bg-amber-50 border-amber-200"
          : "bg-white border-stone-200"
      }`}
    >
      <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">
        {label}
      </p>
      <p
        className={`text-2xl font-bold mt-1 ${
          highlight ? "text-amber-700" : "text-stone-800"
        }`}
      >
        {value}
      </p>
      {sub && (
        <p
          className={`text-sm mt-0.5 ${
            highlight ? "text-amber-600" : "text-stone-400"
          }`}
        >
          {sub}
        </p>
      )}
    </div>
  );
}
