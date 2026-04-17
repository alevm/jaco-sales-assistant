"use client";

interface DataPoint {
  label: string;
  value: number;
}

interface Series {
  name: string;
  data: DataPoint[];
  color: string;
}

const CHART_COLORS = [
  "#d97706", // amber-600
  "#0891b2", // cyan-600
  "#7c3aed", // violet-600
  "#e11d48", // rose-600
  "#059669", // emerald-600
  "#ea580c", // orange-600
  "#2563eb", // blue-600
  "#c026d3", // fuchsia-600
];

function eur(value: number): string {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value);
}

export function TrendLineChart({
  series,
  title,
  height = 280,
  valuePrefix = "",
  formatValue,
}: {
  series: Series[];
  title: string;
  height?: number;
  valuePrefix?: string;
  formatValue?: (v: number) => string;
}) {
  if (series.length === 0 || series.every((s) => s.data.length === 0)) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
        <h3 className="text-sm font-semibold text-stone-700 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-40 text-stone-400 text-sm">
          Dati insufficienti
        </div>
      </div>
    );
  }

  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const width = 350;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Collect all labels (months)
  const allLabels = Array.from(new Set(series.flatMap((s) => s.data.map((d) => d.label)))).sort();

  // Find min/max values
  const allValues = series.flatMap((s) => s.data.map((d) => d.value));
  const minVal = Math.min(0, ...allValues);
  const maxVal = Math.max(...allValues);
  const range = maxVal - minVal || 1;
  const yPad = range * 0.1;
  const yMin = minVal - yPad;
  const yMax = maxVal + yPad;

  const xScale = (i: number) => padding.left + (i / Math.max(allLabels.length - 1, 1)) * chartWidth;
  const yScale = (v: number) => padding.top + chartHeight - ((v - yMin) / (yMax - yMin)) * chartHeight;

  // Y-axis grid lines (5 ticks)
  const yTicks: number[] = [];
  const tickStep = (yMax - yMin) / 4;
  for (let i = 0; i <= 4; i++) {
    yTicks.push(yMin + tickStep * i);
  }

  const fmt = formatValue || ((v: number) => `${valuePrefix}${v.toFixed(0)}`);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
      <h3 className="text-sm font-semibold text-stone-700 mb-4">{title}</h3>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" aria-label={title}>
        {/* Grid lines */}
        {yTicks.map((tick, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={yScale(tick)}
              x2={width - padding.right}
              y2={yScale(tick)}
              stroke="#e7e5e4"
              strokeDasharray="4,4"
            />
            <text
              x={padding.left - 8}
              y={yScale(tick) + 4}
              textAnchor="end"
              className="fill-stone-400"
              fontSize="10"
            >
              {fmt(tick)}
            </text>
          </g>
        ))}

        {/* X-axis labels */}
        {allLabels.map((label, i) => (
          <text
            key={label}
            x={xScale(i)}
            y={height - 8}
            textAnchor="middle"
            className="fill-stone-400"
            fontSize="10"
          >
            {label.slice(5)} {/* Show MM only */}
          </text>
        ))}

        {/* Series lines + dots */}
        {series.map((s, si) => {
          // Map series data to ordered label positions
          const dataMap = new Map(s.data.map((d) => [d.label, d.value]));
          const points: { x: number; y: number; value: number }[] = [];

          for (let i = 0; i < allLabels.length; i++) {
            const val = dataMap.get(allLabels[i]);
            if (val !== undefined) {
              points.push({ x: xScale(i), y: yScale(val), value: val });
            }
          }

          if (points.length < 2) return null;

          const pathD = points
            .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
            .join(" ");

          return (
            <g key={si}>
              <path d={pathD} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              {points.map((p, i) => (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r="4" fill={s.color} stroke="white" strokeWidth="2" />
                  <title>{`${s.name}: ${fmt(p.value)} (${allLabels[allLabels.indexOf(s.data[i]?.label ?? "")]})`}</title>
                </g>
              ))}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      {series.length > 1 && (
        <div className="flex gap-4 mt-3 flex-wrap">
          {series.map((s, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-stone-600">
              <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: s.color }} />
              {s.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export { CHART_COLORS };
