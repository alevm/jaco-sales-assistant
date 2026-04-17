"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ItemWithTags, ItemStatus, Marketplace, Condition, CONDITION_LABELS } from "@/types/item";
import { ListingPanel } from "@/components/items/listing-panel";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const MARKETPLACE_FEES: Record<Marketplace, { pct: number; fixed: number; label: string }> = {
  vinted: { pct: 0, fixed: 0, label: "Vinted (0%)" },
  ebay: { pct: 13, fixed: 0.35, label: "eBay (13% + €0.35)" },
  depop: { pct: 10, fixed: 0, label: "Depop (10%)" },
  vestiaire: { pct: 15, fixed: 0, label: "Vestiaire (15%)" },
  wallapop: { pct: 0, fixed: 0, label: "Wallapop (0%)" },
  subito: { pct: 0, fixed: 0, label: "Subito (0%)" },
  facebook: { pct: 0, fixed: 0, label: "Facebook (0%)" },
};

const CONDITIONS: { value: Condition; label: string }[] = [
  { value: "nwt", label: "Nuovo con cartellino (NWT)" },
  { value: "nwot", label: "Nuovo senza cartellino (NWOT)" },
  { value: "excellent", label: "Eccellente" },
  { value: "good", label: "Buono" },
  { value: "fair", label: "Discreto" },
  { value: "poor", label: "Scarso" },
];

const STATUS_COLORS: Record<ItemStatus, string> = {
  draft: "bg-stone-200 text-stone-700",
  listed: "bg-amber-100 text-amber-800",
  sold: "bg-emerald-100 text-emerald-800",
};

const STATUS_ICONS: Record<ItemStatus, string> = {
  draft: "✎",
  listed: "▲",
  sold: "✓",
};

const STATUS_LABELS: Record<ItemStatus, string> = {
  draft: "Bozza",
  listed: "In vendita",
  sold: "Venduto",
};

const TAG_COLORS = [
  "bg-amber-100 text-amber-800",
  "bg-sky-100 text-sky-800",
  "bg-violet-100 text-violet-800",
  "bg-rose-100 text-rose-800",
  "bg-emerald-100 text-emerald-800",
  "bg-orange-100 text-orange-800",
  "bg-teal-100 text-teal-800",
  "bg-pink-100 text-pink-800",
];

type Tab = "details" | "pricing" | "descriptions" | "listing" | "status";

function eur(value: number | null): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value);
}

function tagColor(category: string): string {
  let hash = 0;
  for (let i = 0; i < category.length; i++) hash = category.charCodeAt(i) + ((hash << 5) - hash);
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [item, setItem] = useState<ItemWithTags | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [regenerating, setRegenerating] = useState<"it" | "en" | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("details");
  const [priceSuggestion, setPriceSuggestion] = useState<{ low: number; mid: number; high: number; reasoning: string } | null>(null);
  const [suggestingPrice, setSuggestingPrice] = useState(false);

  const expandTriggerRef = useRef<HTMLButtonElement | null>(null);

  /* --- form fields --- */
  const [itemType, setItemType] = useState("");
  const [brand, setBrand] = useState("");
  const [era, setEra] = useState("");
  const [eraStyle, setEraStyle] = useState("");
  const [material, setMaterial] = useState("");
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [condition, setCondition] = useState("");
  const [cogs, setCogs] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [soldPrice, setSoldPrice] = useState("");
  const [shippingCost, setShippingCost] = useState("");
  const [marketplace, setMarketplace] = useState<Marketplace | "">("");
  const [status, setStatus] = useState<ItemStatus>("draft");
  const [prevStatus, setPrevStatus] = useState<ItemStatus>("draft");
  const [soldAt, setSoldAt] = useState("");
  const [descriptionIt, setDescriptionIt] = useState("");
  const [descriptionEn, setDescriptionEn] = useState("");

  const populateForm = useCallback((it: ItemWithTags) => {
    setItemType(it.item_type ?? "");
    setBrand(it.brand ?? "");
    setEra(it.era ?? "");
    setEraStyle(it.era_style ?? "");
    setMaterial(it.material ?? "");
    setColor(it.color ?? "");
    setSize(it.size ?? "");
    setCondition(it.condition ?? "");
    setCogs(it.cogs != null ? String(it.cogs) : "");
    setSalePrice(it.sale_price != null ? String(it.sale_price) : "");
    setSoldPrice(it.sold_price != null ? String(it.sold_price) : "");
    setShippingCost(it.shipping_cost != null ? String(it.shipping_cost) : "");
    setMarketplace(it.marketplace ?? "");
    setStatus(it.status);
    setPrevStatus(it.status);
    setSoldAt(it.sold_at ? it.sold_at.slice(0, 10) : "");
    setDescriptionIt(it.description_it ?? "");
    setDescriptionEn(it.description_en ?? "");
  }, []);

  useEffect(() => {
    fetch(`/api/items/${id}`)
      .then((res) => {
        if (res.status === 404) { setNotFound(true); return null; }
        if (!res.ok) throw new Error("Errore");
        return res.json();
      })
      .then((data: ItemWithTags | null) => {
        if (data) { setItem(data); populateForm(data); }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id, populateForm]);

  /* --- Margin calculator --- */
  const margin = useMemo(() => {
    const sp = parseFloat(salePrice) || 0;
    const c = parseFloat(cogs) || 0;
    const ship = parseFloat(shippingCost) || 0;
    const mp = marketplace as Marketplace | "";
    const fee = mp ? (sp * MARKETPLACE_FEES[mp].pct) / 100 + MARKETPLACE_FEES[mp].fixed : 0;
    const net = sp - fee - ship;
    const netMargin = net - c;
    const pct = sp > 0 ? (netMargin / sp) * 100 : 0;
    return { fee, ship, net, netMargin, pct };
  }, [salePrice, cogs, shippingCost, marketplace]);

  /* --- Status change handler --- */
  const handleStatusChange = (newStatus: ItemStatus) => {
    if (newStatus === "sold" && prevStatus !== "sold") {
      setSoldAt(new Date().toISOString().slice(0, 10));
    }
    setStatus(newStatus);
  };

  /* --- Save --- */
  async function handleSave() {
    if (status === "sold" && !soldPrice) {
      alert("Inserisci il prezzo di vendita prima di salvare come venduto.");
      setActiveTab("status");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        item_type: itemType || null,
        brand: brand || null,
        era: era || null,
        era_style: eraStyle || null,
        material: material || null,
        color: color || null,
        size: size || null,
        condition: condition || null,
        cogs: cogs !== "" ? parseFloat(cogs) : null,
        sale_price: salePrice !== "" ? parseFloat(salePrice) : null,
        shipping_cost: shippingCost !== "" ? parseFloat(shippingCost) : null,
        marketplace: marketplace || null,
        status,
        description_it: descriptionIt || null,
        description_en: descriptionEn || null,
      };
      if (status === "sold") {
        body.sold_price = soldPrice !== "" ? parseFloat(soldPrice) : null;
        body.sold_at = soldAt || null;
      }
      const res = await fetch(`/api/items/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Errore nel salvataggio");
      const updated = await res.json();
      setItem((prev) => (prev ? { ...prev, ...updated, image_paths: prev.image_paths, tags: updated.tags ?? prev.tags } : prev));
      setPrevStatus(status);
    } finally {
      setSaving(false);
    }
  }

  /* --- Delete --- */
  async function handleDelete() {
    if (!confirm("Sei sicuro di voler eliminare questo capo?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Errore");
      router.push("/items");
    } finally {
      setDeleting(false);
    }
  }

  /* --- Regenerate description --- */
  async function handleRegenerate(locale: "it" | "en") {
    setRegenerating(locale);
    try {
      const res = await fetch(`/api/items/${id}/description`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketplace: marketplace || "vinted", locale }),
      });
      if (!res.ok) throw new Error("Errore");
      const data = await res.json();
      if (locale === "it" && data.description_it) setDescriptionIt(data.description_it);
      if (locale === "en" && data.description_en) setDescriptionEn(data.description_en);
    } finally {
      setRegenerating(null);
    }
  }

  /* --- Suggest price --- */
  async function handleSuggestPrice() {
    setSuggestingPrice(true);
    setPriceSuggestion(null);
    try {
      const res = await fetch(`/api/items/${id}/suggest-price`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketplace: marketplace || "vinted" }),
      });
      if (!res.ok) throw new Error("Errore");
      setPriceSuggestion(await res.json());
    } finally {
      setSuggestingPrice(false);
    }
  }

  /* --- Loading / Not found --- */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-stone-300 border-t-amber-500 rounded-full animate-spin mx-auto" role="status" />
          <p className="text-stone-500 text-sm">Caricamento capo...</p>
        </div>
      </div>
    );
  }

  if (notFound || !item) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-3">
          <p className="text-5xl">404</p>
          <p className="text-stone-600 font-medium">Capo non trovato</p>
          <Link href="/items" className="inline-block mt-2 text-sm text-amber-600 hover:text-amber-700 font-medium">
            Torna all&apos;inventario
          </Link>
        </div>
      </div>
    );
  }

  const images: string[] = Array.isArray(item.image_paths)
    ? item.image_paths
    : typeof item.image_paths === "string"
      ? JSON.parse(item.image_paths || "[]")
      : [];

  /* ---------------------------------------------------------------- */
  /*  Render                                                          */
  /* ---------------------------------------------------------------- */

  return (
    <div className="max-w-5xl space-y-6 pb-16">
      <Link href="/items" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-amber-600 transition-colors">
        <span>&larr;</span> Torna all&apos;inventario
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">
            {item.item_type || "Capo"}{brand ? ` — ${brand}` : ""}
          </h1>
          <p className="text-xs text-stone-400 mt-1">ID: {item.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${STATUS_COLORS[item.status]}`}>
            <span aria-hidden="true">{STATUS_ICONS[item.status]}</span>
            {STATUS_LABELS[item.status]}
          </span>
        </div>
      </div>

      {/* Image gallery */}
      {images.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-stone-600 uppercase tracking-wide">Foto</h2>
          <div className="flex gap-3 flex-wrap">
            {images.map((src, i) => (
              <button
                key={i}
                ref={i === 0 ? expandTriggerRef : undefined}
                onClick={() => setExpandedImage(src)}
                aria-label={`Ingrandisci foto ${i + 1}`}
                className="rounded-xl overflow-hidden border border-stone-200 hover:border-amber-400 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <img src={src} alt={`Foto ${i + 1}`} className="w-24 h-24 sm:w-32 sm:h-32 object-cover" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Lightbox */}
      {expandedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8"
          onClick={() => { setExpandedImage(null); expandTriggerRef.current?.focus(); }}
          role="dialog"
          aria-label="Visualizzazione foto ingrandita"
        >
          <img
            src={expandedImage}
            alt="Dettaglio"
            className="max-h-[85vh] max-w-[90vw] rounded-xl shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => { setExpandedImage(null); expandTriggerRef.current?.focus(); }}
            aria-label="Chiudi visualizzazione foto"
            className="absolute top-6 right-6 text-white/80 hover:text-white text-3xl font-light leading-none"
          >
            &times;
          </button>
        </div>
      )}

      {/* Tags */}
      {item.tags && item.tags.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-stone-600 uppercase tracking-wide">Tag</h2>
          <div className="flex gap-2 flex-wrap">
            {item.tags.map((tag, i) => (
              <span key={i} className={`px-3 py-1 rounded-full text-xs font-medium ${tagColor(tag.category)}`}>
                {tag.category}: {tag.value}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-stone-200" role="tablist">
        {([
          ["details", "Dettagli"],
          ["pricing", "Prezzi e Margine"],
          ["descriptions", "Descrizioni"],
          ["listing", "Pubblica"],
          ["status", "Stato"],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={activeTab === key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === key
                ? "border-amber-600 text-amber-700"
                : "border-transparent text-stone-400 hover:text-stone-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Details */}
      {activeTab === "details" && (
        <section className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 space-y-5" role="tabpanel">
          <h2 className="text-lg font-semibold text-stone-800">Dettagli capo</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Tipo" value={itemType} onChange={setItemType} placeholder="es. Giacca, Camicia" />
            <Field label="Brand" value={brand} onChange={setBrand} placeholder="es. Levi's, Burberry" />
            <Field label="Era" value={era} onChange={setEra} placeholder="es. 1980s, 1990s" />
            <Field label="Stile epoca" value={eraStyle} onChange={setEraStyle} placeholder="es. grunge, mod, Y2K" />
            <Field label="Materiale" value={material} onChange={setMaterial} placeholder="es. Cotone, Lana" />
            <Field label="Colore" value={color} onChange={setColor} placeholder="es. Blu, Nero" />
            <Field label="Taglia" value={size} onChange={setSize} placeholder="es. M, L, 50" />
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">Condizioni</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
              >
                <option value="">— Seleziona —</option>
                {CONDITIONS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>
        </section>
      )}

      {/* Tab: Pricing */}
      {activeTab === "pricing" && (
        <section className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 space-y-5" role="tabpanel">
          <h2 className="text-lg font-semibold text-stone-800">Prezzi e margine</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">COGS (EUR)</label>
              <input type="number" step="0.01" value={cogs} onChange={(e) => setCogs(e.target.value)} placeholder="0.00"
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">Prezzo vendita (EUR)</label>
              <input type="number" step="0.01" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} placeholder="0.00"
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">Spedizione (EUR)</label>
              <input type="number" step="0.01" value={shippingCost} onChange={(e) => setShippingCost(e.target.value)} placeholder="0.00"
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">Marketplace</label>
              <select value={marketplace} onChange={(e) => setMarketplace(e.target.value as Marketplace | "")}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white">
                <option value="">— Nessuno —</option>
                {(Object.entries(MARKETPLACE_FEES) as [Marketplace, { label: string }][]).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Margin calculator */}
          {(parseFloat(salePrice) > 0 || parseFloat(cogs) > 0) && (
            <div className="bg-stone-50 rounded-lg p-4 grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm" aria-live="polite">
              <div>
                <p className="text-stone-500 text-xs uppercase tracking-wide">Commissione</p>
                <p className="font-semibold text-stone-700 mt-0.5">{eur(margin.fee)}</p>
              </div>
              <div>
                <p className="text-stone-500 text-xs uppercase tracking-wide">Spedizione</p>
                <p className="font-semibold text-stone-700 mt-0.5">{eur(margin.ship)}</p>
              </div>
              <div>
                <p className="text-stone-500 text-xs uppercase tracking-wide">Ricavo netto</p>
                <p className="font-semibold text-stone-700 mt-0.5">{eur(margin.net)}</p>
              </div>
              <div>
                <p className="text-stone-500 text-xs uppercase tracking-wide">Margine</p>
                <p className={`font-semibold mt-0.5 ${margin.netMargin >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {margin.netMargin >= 0 ? "+" : ""}{eur(margin.netMargin)}
                </p>
              </div>
              <div>
                <p className="text-stone-500 text-xs uppercase tracking-wide">Margine %</p>
                <p className={`font-semibold mt-0.5 ${margin.pct >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {margin.pct >= 0 ? "+" : ""}{margin.pct.toFixed(1)}%
                </p>
              </div>
            </div>
          )}

          {/* AI Price Suggestion */}
          <div className="border-t border-stone-200 pt-4 space-y-3">
            <button
              onClick={handleSuggestPrice}
              disabled={suggestingPrice}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-50 transition-colors"
            >
              {suggestingPrice ? "Analisi prezzi..." : "Suggerisci prezzo AI"}
            </button>

            {priceSuggestion && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  {([
                    ["low", "Veloce", "bg-emerald-50 border-emerald-200 hover:border-emerald-400"],
                    ["mid", "Medio", "bg-amber-50 border-amber-200 hover:border-amber-400"],
                    ["high", "Premium", "bg-purple-50 border-purple-200 hover:border-purple-400"],
                  ] as [keyof typeof priceSuggestion, string, string][]).map(([key, label, css]) => (
                    <button
                      key={key}
                      onClick={() => setSalePrice(String(priceSuggestion[key]))}
                      className={`rounded-xl border-2 p-4 text-center transition-all ${css}`}
                    >
                      <p className="text-xs font-medium text-stone-500 uppercase">{label}</p>
                      <p className="text-xl font-bold text-stone-800 mt-1">{eur(priceSuggestion[key] as number)}</p>
                    </button>
                  ))}
                </div>
                <p className="text-sm text-stone-500 italic">{priceSuggestion.reasoning}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Tab: Descriptions */}
      {activeTab === "descriptions" && (
        <section className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 space-y-5" role="tabpanel">
          <h2 className="text-lg font-semibold text-stone-800">Descrizioni</h2>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-stone-600">Italiano</label>
              <button
                onClick={() => handleRegenerate("it")}
                disabled={regenerating !== null}
                aria-label="Rigenera descrizione italiana"
                className="px-3 py-1 text-xs font-medium rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-50 transition-colors"
              >
                {regenerating === "it" ? "Generazione..." : "Rigenera IT"}
              </button>
            </div>
            <textarea value={descriptionIt} onChange={(e) => setDescriptionIt(e.target.value)} rows={4} placeholder="Descrizione in italiano..."
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-stone-600">English</label>
              <button
                onClick={() => handleRegenerate("en")}
                disabled={regenerating !== null}
                aria-label="Rigenera descrizione inglese"
                className="px-3 py-1 text-xs font-medium rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-50 transition-colors"
              >
                {regenerating === "en" ? "Generating..." : "Rigenera EN"}
              </button>
            </div>
            <textarea value={descriptionEn} onChange={(e) => setDescriptionEn(e.target.value)} rows={4} placeholder="English description..."
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
        </section>
      )}

      {/* Tab: Listing */}
      {activeTab === "listing" && (
        <ListingPanel
          itemId={item.id}
          listedPlatforms={(() => {
            try {
              return JSON.parse(item.listed_platforms || "[]");
            } catch {
              return [];
            }
          })()}
        />
      )}

      {/* Tab: Status */}
      {activeTab === "status" && (
        <section className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 space-y-5" role="tabpanel">
          <h2 className="text-lg font-semibold text-stone-800">Stato</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">Stato</label>
              <select value={status} onChange={(e) => handleStatusChange(e.target.value as ItemStatus)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white">
                <option value="draft">✎ Bozza</option>
                <option value="listed">▲ In vendita</option>
                <option value="sold">✓ Venduto</option>
              </select>
            </div>

            {status === "sold" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-stone-600 mb-1">
                    Prezzo venduto (EUR) <span className="text-red-500">*</span>
                  </label>
                  <input type="number" step="0.01" value={soldPrice} onChange={(e) => setSoldPrice(e.target.value)} placeholder="0.00"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-600 mb-1">Data vendita</label>
                  <input type="date" value={soldAt} onChange={(e) => setSoldAt(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                </div>
              </>
            )}

            {status === "sold" && prevStatus !== "sold" && (
              <div className="sm:col-span-2 lg:col-span-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800 font-medium">
                  Stai segnando questo capo come venduto. Compila il prezzo di vendita e la data prima di salvare.
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Salvataggio..." : "Salva"}
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          aria-label="Elimina questo capo"
          className="px-6 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {deleting ? "Eliminazione..." : "Elimina"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-stone-600 mb-1">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
    </div>
  );
}
