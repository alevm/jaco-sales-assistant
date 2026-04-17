"use client";

import { useEffect, useState } from "react";
import { TrendLineChart, CHART_COLORS } from "./trend-chart";

interface TrendPoint {
  month: string;
  avg_price: number;
  count: number;
  total_revenue: number;
  total_margin: number;
  avg_margin: number;
}

interface CategoryTrend {
  category: string;
  points: TrendPoint[];
}

interface PlatformPerformance {
  platform: string;
  total_sold: number;
  total_revenue: number;
  avg_price: number;
  avg_margin: number;
  margin_percent: number;
}

interface TrendData {
  overall: TrendPoint[];
  by_category: CategoryTrend[];
  platform_performance: PlatformPerformance[];
  margin_trend: TrendPoint[];
  brand_performance: Array<{
    brand: string;
    count: number;
    avg_price: number;
    avg_margin: number;
  }>;
}

function eur(value: number): string {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value);
}

function marginPrefix(value: number): string {
  return value >= 0 ? "+" : "";
}

export function PriceTrends() {
  const [data, setData] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState(12);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/dashboard/trends?months=${months}`)
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [months]);

  if (loading) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-stone-700">Trend Prezzi</h2>
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-stone-300 border-t-amber-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!data || (data.overall.length === 0 && data.platform_performance.length === 0)) {
    return null; // No trend data to show
  }

  return (
    <section className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <h2 className="text-lg font-semibold text-stone-700">Trend Prezzi e Margini</h2>
        <div className="flex gap-1.5" role="group" aria-label="Periodo trend">
          {[
            [6, "6 mesi"],
            [12, "12 mesi"],
            [24, "24 mesi"],
          ].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setMonths(val as number)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                months === val
                  ? "bg-amber-600 text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Overall price trend chart */}
      {data.overall.length >= 2 && (
        <TrendLineChart
          title="Prezzo medio di vendita (rolling)"
          series={[
            {
              name: "Prezzo medio",
              data: data.overall.map((p) => ({ label: p.month, value: p.avg_price })),
              color: CHART_COLORS[0],
            },
          ]}
          formatValue={eur}
        />
      )}

      {/* Margin trend chart */}
      {data.margin_trend.length >= 2 && (
        <TrendLineChart
          title="Margine medio mensile"
          series={[
            {
              name: "Margine medio",
              data: data.margin_trend.map((p) => ({ label: p.month, value: p.avg_margin })),
              color: CHART_COLORS[4],
            },
            {
              name: "Margine totale",
              data: data.margin_trend.map((p) => ({ label: p.month, value: p.total_margin })),
              color: CHART_COLORS[2],
            },
          ]}
          formatValue={eur}
        />
      )}

      {/* Category price trends */}
      {data.by_category.length > 0 && data.by_category.some((c) => c.points.length >= 2) && (
        <TrendLineChart
          title="Prezzo medio per categoria"
          series={data.by_category
            .filter((c) => c.points.length >= 2)
            .slice(0, 6)
            .map((cat, i) => ({
              name: cat.category,
              data: cat.points.map((p) => ({ label: p.month, value: p.avg_price })),
              color: CHART_COLORS[i % CHART_COLORS.length],
            }))}
          formatValue={eur}
        />
      )}

      {/* Platform performance table */}
      {data.platform_performance.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="p-4 border-b border-stone-100">
            <h3 className="text-sm font-semibold text-stone-700">Performance per piattaforma</h3>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Classifica piattaforme per margine medio</caption>
            <thead>
              <tr className="bg-stone-50 text-stone-500 text-left">
                <th scope="col" className="px-4 py-3 font-medium whitespace-nowrap">Piattaforma</th>
                <th scope="col" className="px-4 py-3 font-medium whitespace-nowrap text-right">Venduti</th>
                <th scope="col" className="px-4 py-3 font-medium whitespace-nowrap text-right">Prezzo medio</th>
                <th scope="col" className="px-4 py-3 font-medium whitespace-nowrap text-right">Margine medio</th>
                <th scope="col" className="px-4 py-3 font-medium whitespace-nowrap text-right">Margine %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {data.platform_performance.map((p) => (
                <tr key={p.platform} className="hover:bg-stone-50">
                  <td className="px-4 py-3 font-medium text-stone-800 capitalize">{p.platform}</td>
                  <td className="px-4 py-3 text-right text-stone-600">{p.total_sold}</td>
                  <td className="px-4 py-3 text-right text-stone-600">{eur(p.avg_price)}</td>
                  <td className={`px-4 py-3 text-right font-medium ${p.avg_margin >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {marginPrefix(p.avg_margin)}{eur(p.avg_margin)}
                  </td>
                  <td className={`px-4 py-3 text-right ${p.margin_percent >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {marginPrefix(p.margin_percent)}{p.margin_percent.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Brand performance */}
      {data.brand_performance.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="p-4 border-b border-stone-100">
            <h3 className="text-sm font-semibold text-stone-700">Top brand per vendite</h3>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Top 10 brand per numero di vendite</caption>
            <thead>
              <tr className="bg-stone-50 text-stone-500 text-left">
                <th scope="col" className="px-4 py-3 font-medium whitespace-nowrap">Brand</th>
                <th scope="col" className="px-4 py-3 font-medium whitespace-nowrap text-right">Venduti</th>
                <th scope="col" className="px-4 py-3 font-medium whitespace-nowrap text-right">Prezzo medio</th>
                <th scope="col" className="px-4 py-3 font-medium whitespace-nowrap text-right">Margine medio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {data.brand_performance.map((b) => (
                <tr key={b.brand} className="hover:bg-stone-50">
                  <td className="px-4 py-3 font-medium text-stone-800">{b.brand}</td>
                  <td className="px-4 py-3 text-right text-stone-600">{b.count}</td>
                  <td className="px-4 py-3 text-right text-stone-600">{eur(b.avg_price)}</td>
                  <td className={`px-4 py-3 text-right font-medium ${b.avg_margin >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {marginPrefix(b.avg_margin)}{eur(b.avg_margin)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </section>
  );
}
