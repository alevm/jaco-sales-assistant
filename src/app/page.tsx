"use client";

import { useEffect, useState } from "react";
import type { DashboardData } from "@/types/dashboard";

function eur(value: number): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function pct(value: number): string {
  return `${value.toFixed(1)}%`;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => {
        if (!res.ok) throw new Error("Errore nel caricamento dei dati");
        return res.json();
      })
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-stone-300 border-t-amber-500 rounded-full animate-spin mx-auto" />
          <p className="text-stone-500 text-sm">Caricamento dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="bg-red-50 border border-red-200 rounded-xl px-6 py-4 text-red-700 text-sm">
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

  const { summary, by_marketplace, by_period, recent_sales } = data;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-800">Dashboard</h1>
        <p className="text-stone-500 text-sm mt-1">Analisi margini e vendite</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          label="Margine Netto"
          value={eur(summary.total_margin)}
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

      {/* Marketplace Breakdown */}
      {by_marketplace.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-stone-700">
            Per Marketplace
          </h2>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-stone-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 text-stone-500 text-left">
                  <th className="px-4 py-3 font-medium">Marketplace</th>
                  <th className="px-4 py-3 font-medium text-right">Ricavo</th>
                  <th className="px-4 py-3 font-medium text-right">COGS</th>
                  <th className="px-4 py-3 font-medium text-right">
                    Commissioni
                  </th>
                  <th className="px-4 py-3 font-medium text-right">Margine</th>
                  <th className="px-4 py-3 font-medium text-right">
                    Margine %
                  </th>
                  <th className="px-4 py-3 font-medium text-right">Vendite</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {by_marketplace.map((row) => (
                  <tr key={row.group} className="hover:bg-stone-50">
                    <td className="px-4 py-3 font-medium text-stone-800">
                      {row.group}
                    </td>
                    <td className="px-4 py-3 text-right text-stone-600">
                      {eur(row.revenue)}
                    </td>
                    <td className="px-4 py-3 text-right text-stone-600">
                      {eur(row.cogs)}
                    </td>
                    <td className="px-4 py-3 text-right text-stone-600">
                      {eur(row.fees)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-medium ${
                        row.margin >= 0 ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {eur(row.margin)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right ${
                        row.margin_percent >= 0
                          ? "text-emerald-600"
                          : "text-red-600"
                      }`}
                    >
                      {pct(row.margin_percent)}
                    </td>
                    <td className="px-4 py-3 text-right text-stone-600">
                      {row.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Monthly Breakdown */}
      {by_period.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-stone-700">Per Periodo</h2>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-stone-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 text-stone-500 text-left">
                  <th className="px-4 py-3 font-medium">Periodo</th>
                  <th className="px-4 py-3 font-medium text-right">Ricavo</th>
                  <th className="px-4 py-3 font-medium text-right">COGS</th>
                  <th className="px-4 py-3 font-medium text-right">
                    Commissioni
                  </th>
                  <th className="px-4 py-3 font-medium text-right">Margine</th>
                  <th className="px-4 py-3 font-medium text-right">
                    Margine %
                  </th>
                  <th className="px-4 py-3 font-medium text-right">Vendite</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {by_period.map((row) => (
                  <tr key={row.group} className="hover:bg-stone-50">
                    <td className="px-4 py-3 font-medium text-stone-800">
                      {row.group}
                    </td>
                    <td className="px-4 py-3 text-right text-stone-600">
                      {eur(row.revenue)}
                    </td>
                    <td className="px-4 py-3 text-right text-stone-600">
                      {eur(row.cogs)}
                    </td>
                    <td className="px-4 py-3 text-right text-stone-600">
                      {eur(row.fees)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-medium ${
                        row.margin >= 0 ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {eur(row.margin)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right ${
                        row.margin_percent >= 0
                          ? "text-emerald-600"
                          : "text-red-600"
                      }`}
                    >
                      {pct(row.margin_percent)}
                    </td>
                    <td className="px-4 py-3 text-right text-stone-600">
                      {row.count}
                    </td>
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
          <h2 className="text-lg font-semibold text-stone-700">
            Vendite Recenti
          </h2>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-stone-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 text-stone-500 text-left">
                  <th className="px-4 py-3 font-medium">Capo</th>
                  <th className="px-4 py-3 font-medium">Brand</th>
                  <th className="px-4 py-3 font-medium">Marketplace</th>
                  <th className="px-4 py-3 font-medium text-right">
                    Prezzo Vendita
                  </th>
                  <th className="px-4 py-3 font-medium text-right">COGS</th>
                  <th className="px-4 py-3 font-medium text-right">Margine</th>
                  <th className="px-4 py-3 font-medium">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {recent_sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3 text-stone-800">
                      {sale.item_type || "—"}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {sale.brand || "—"}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {sale.marketplace}
                    </td>
                    <td className="px-4 py-3 text-right text-stone-600">
                      {eur(sale.sold_price)}
                    </td>
                    <td className="px-4 py-3 text-right text-stone-600">
                      {eur(sale.cogs)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-medium ${
                        sale.margin >= 0 ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {eur(sale.margin)}
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
