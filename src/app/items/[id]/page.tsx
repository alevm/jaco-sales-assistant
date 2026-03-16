"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ItemWithTags, ItemStatus, Marketplace } from "@/types/item";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function eur(value: number | null): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

const MARKETPLACE_FEES: Record<Marketplace, number> = {
  vinted: 0,
  ebay: 13,
};

const STATUS_COLORS: Record<ItemStatus, string> = {
  draft: "bg-stone-200 text-stone-700",
  listed: "bg-amber-100 text-amber-800",
  sold: "bg-emerald-100 text-emerald-800",
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

function tagColor(category: string): string {
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
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

  /* --- form fields (flat mirrors of item) --- */
  const [itemType, setItemType] = useState("");
  const [brand, setBrand] = useState("");
  const [era, setEra] = useState("");
  const [material, setMaterial] = useState("");
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [condition, setCondition] = useState("");
  const [cogs, setCogs] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [soldPrice, setSoldPrice] = useState("");
  const [marketplace, setMarketplace] = useState<Marketplace | "">("");
  const [status, setStatus] = useState<ItemStatus>("draft");
  const [soldAt, setSoldAt] = useState("");
  const [descriptionIt, setDescriptionIt] = useState("");
  const [descriptionEn, setDescriptionEn] = useState("");

  /* --- Populate form from item --- */
  const populateForm = useCallback((it: ItemWithTags) => {
    setItemType(it.item_type ?? "");
    setBrand(it.brand ?? "");
    setEra(it.era ?? "");
    setMaterial(it.material ?? "");
    setColor(it.color ?? "");
    setSize(it.size ?? "");
    setCondition(it.condition ?? "");
    setCogs(it.cogs != null ? String(it.cogs) : "");
    setSalePrice(it.sale_price != null ? String(it.sale_price) : "");
    setSoldPrice(it.sold_price != null ? String(it.sold_price) : "");
    setMarketplace(it.marketplace ?? "");
    setStatus(it.status);
    setSoldAt(it.sold_at ? it.sold_at.slice(0, 10) : "");
    setDescriptionIt(it.description_it ?? "");
    setDescriptionEn(it.description_en ?? "");
  }, []);

  /* --- Fetch item --- */
  useEffect(() => {
    fetch(`/api/items/${id}`)
      .then((res) => {
        if (res.status === 404) {
          setNotFound(true);
          return null;
        }
        if (!res.ok) throw new Error("Errore nel caricamento");
        return res.json();
      })
      .then((data: ItemWithTags | null) => {
        if (data) {
          setItem(data);
          populateForm(data);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id, populateForm]);

  /* --- Margin calculator --- */
  const margin = useMemo(() => {
    const sp = parseFloat(salePrice) || 0;
    const c = parseFloat(cogs) || 0;
    const mp = marketplace as Marketplace | "";
    const feePercent = mp ? MARKETPLACE_FEES[mp] : 0;
    const fee = (sp * feePercent) / 100;
    const net = sp - fee;
    const netMargin = net - c;
    const pct = sp > 0 ? (netMargin / sp) * 100 : 0;
    return { fee, net, netMargin, pct };
  }, [salePrice, cogs, marketplace]);

  /* --- Save --- */
  async function handleSave() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        item_type: itemType || null,
        brand: brand || null,
        era: era || null,
        material: material || null,
        color: color || null,
        size: size || null,
        condition: condition || null,
        cogs: cogs !== "" ? parseFloat(cogs) : null,
        sale_price: salePrice !== "" ? parseFloat(salePrice) : null,
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
    } finally {
      setSaving(false);
    }
  }

  /* --- Delete --- */
  async function handleDelete() {
    if (!confirm("Sei sicuro di voler eliminare questo capo? L'azione e' irreversibile.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Errore nell'eliminazione");
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
      if (!res.ok) throw new Error("Errore nella generazione");
      const data = await res.json();
      if (locale === "it" && data.description_it) setDescriptionIt(data.description_it);
      if (locale === "en" && data.description_en) setDescriptionEn(data.description_en);
    } finally {
      setRegenerating(null);
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Loading state                                                   */
  /* ---------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-stone-300 border-t-amber-500 rounded-full animate-spin mx-auto" />
          <p className="text-stone-500 text-sm">Caricamento capo...</p>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Not found state                                                 */
  /* ---------------------------------------------------------------- */

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
    <div className="max-w-5xl space-y-8 pb-16">
      {/* ---- Back link ---- */}
      <Link
        href="/items"
        className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-amber-600 transition-colors"
      >
        <span>&larr;</span> Torna all&apos;inventario
      </Link>

      {/* ---- Header ---- */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">
            {item.item_type || "Capo"}{brand ? ` — ${brand}` : ""}
          </h1>
          <p className="text-xs text-stone-400 mt-1">ID: {item.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[item.status]}`}>
            {STATUS_LABELS[item.status]}
          </span>
          {item.marketplace && (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-700">
              {item.marketplace === "vinted" ? "Vinted" : "eBay"}
            </span>
          )}
        </div>
      </div>

      {/* ---- Image gallery ---- */}
      {images.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-stone-600 uppercase tracking-wide">Foto</h2>
          <div className="flex gap-3 flex-wrap">
            {images.map((src, i) => (
              <button
                key={i}
                onClick={() => setExpandedImage(src)}
                className="rounded-xl overflow-hidden border border-stone-200 hover:border-amber-400 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <img
                  src={src}
                  alt={`Foto ${i + 1}`}
                  className="w-32 h-32 object-cover"
                />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ---- Lightbox ---- */}
      {expandedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8"
          onClick={() => setExpandedImage(null)}
        >
          <img
            src={expandedImage}
            alt="Dettaglio"
            className="max-h-[85vh] max-w-[90vw] rounded-xl shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setExpandedImage(null)}
            className="absolute top-6 right-6 text-white/80 hover:text-white text-3xl font-light leading-none"
          >
            &times;
          </button>
        </div>
      )}

      {/* ---- Tags ---- */}
      {item.tags && item.tags.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-stone-600 uppercase tracking-wide">Tag</h2>
          <div className="flex gap-2 flex-wrap">
            {item.tags.map((tag, i) => (
              <span
                key={i}
                className={`px-3 py-1 rounded-full text-xs font-medium ${tagColor(tag.category)}`}
              >
                {tag.category}: {tag.value}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* ---- Item details form ---- */}
      <section className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 space-y-5">
        <h2 className="text-lg font-semibold text-stone-800">Dettagli capo</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Tipo" value={itemType} onChange={setItemType} placeholder="es. Giacca, Camicia" />
          <Field label="Brand" value={brand} onChange={setBrand} placeholder="es. Levi's, Burberry" />
          <Field label="Era" value={era} onChange={setEra} placeholder="es. '80, '90, Y2K" />
          <Field label="Materiale" value={material} onChange={setMaterial} placeholder="es. Cotone, Lana" />
          <Field label="Colore" value={color} onChange={setColor} placeholder="es. Blu, Nero" />
          <Field label="Taglia" value={size} onChange={setSize} placeholder="es. M, L, 50" />
          <Field label="Condizioni" value={condition} onChange={setCondition} placeholder="es. Ottime, Buone" />
        </div>
      </section>

      {/* ---- Pricing ---- */}
      <section className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 space-y-5">
        <h2 className="text-lg font-semibold text-stone-800">Prezzi e margine</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">COGS (EUR)</label>
            <input
              type="number"
              step="0.01"
              value={cogs}
              onChange={(e) => setCogs(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">Prezzo vendita (EUR)</label>
            <input
              type="number"
              step="0.01"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">Marketplace</label>
            <select
              value={marketplace}
              onChange={(e) => setMarketplace(e.target.value as Marketplace | "")}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
            >
              <option value="">— Nessuno —</option>
              <option value="vinted">Vinted (0% commissione)</option>
              <option value="ebay">eBay (13% commissione)</option>
            </select>
          </div>
        </div>

        {/* Margin calculator */}
        {(parseFloat(salePrice) > 0 || parseFloat(cogs) > 0) && (
          <div className="bg-stone-50 rounded-lg p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-stone-500 text-xs uppercase tracking-wide">Commissione</p>
              <p className="font-semibold text-stone-700 mt-0.5">{eur(margin.fee)}</p>
            </div>
            <div>
              <p className="text-stone-500 text-xs uppercase tracking-wide">Ricavo netto</p>
              <p className="font-semibold text-stone-700 mt-0.5">{eur(margin.net)}</p>
            </div>
            <div>
              <p className="text-stone-500 text-xs uppercase tracking-wide">Margine</p>
              <p className={`font-semibold mt-0.5 ${margin.netMargin >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {eur(margin.netMargin)}
              </p>
            </div>
            <div>
              <p className="text-stone-500 text-xs uppercase tracking-wide">Margine %</p>
              <p className={`font-semibold mt-0.5 ${margin.pct >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {margin.pct.toFixed(1)}%
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ---- Status ---- */}
      <section className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 space-y-5">
        <h2 className="text-lg font-semibold text-stone-800">Stato</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">Stato</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ItemStatus)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
            >
              <option value="draft">Bozza</option>
              <option value="listed">In vendita</option>
              <option value="sold">Venduto</option>
            </select>
          </div>
          {status === "sold" && (
            <>
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">Prezzo venduto (EUR)</label>
                <input
                  type="number"
                  step="0.01"
                  value={soldPrice}
                  onChange={(e) => setSoldPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">Data vendita</label>
                <input
                  type="date"
                  value={soldAt}
                  onChange={(e) => setSoldAt(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </>
          )}
        </div>
      </section>

      {/* ---- Descriptions ---- */}
      <section className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 space-y-5">
        <h2 className="text-lg font-semibold text-stone-800">Descrizioni</h2>

        {/* IT */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-stone-600">Italiano</label>
            <button
              onClick={() => handleRegenerate("it")}
              disabled={regenerating !== null}
              className="px-3 py-1 text-xs font-medium rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-50 transition-colors"
            >
              {regenerating === "it" ? "Generazione..." : "Rigenera IT"}
            </button>
          </div>
          <textarea
            value={descriptionIt}
            onChange={(e) => setDescriptionIt(e.target.value)}
            rows={4}
            placeholder="Descrizione in italiano..."
            className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* EN */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-stone-600">English</label>
            <button
              onClick={() => handleRegenerate("en")}
              disabled={regenerating !== null}
              className="px-3 py-1 text-xs font-medium rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-50 transition-colors"
            >
              {regenerating === "en" ? "Generating..." : "Rigenera EN"}
            </button>
          </div>
          <textarea
            value={descriptionEn}
            onChange={(e) => setDescriptionEn(e.target.value)}
            rows={4}
            placeholder="English description..."
            className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </section>

      {/* ---- Actions ---- */}
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
          className="px-6 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {deleting ? "Eliminazione..." : "Elimina"}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Field helper                                                      */
/* ------------------------------------------------------------------ */

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-stone-600 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
      />
    </div>
  );
}
