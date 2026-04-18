"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { RecognitionResult, Marketplace, Condition } from "@/types/item";
import type { Lot } from "@/types/lot";

/* ------------------------------------------------------------------ */
/*  Types & Constants                                                  */
/* ------------------------------------------------------------------ */

interface UploadedImage {
  file: File;
  preview: string;
  serverPath: string | null;
}

interface MarginResult {
  platformFee: number;
  netRevenue: number;
  netMargin: number;
  marginPercent: number;
}

type Step = 1 | 2 | 3 | 4;

const STEPS: { num: Step; label: string }[] = [
  { num: 1, label: "Foto" },
  { num: 2, label: "Riconoscimento" },
  { num: 3, label: "Dettagli" },
  { num: 4, label: "Descrizione" },
];

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

function calcMargin(salePrice: number, cogs: number, shippingCost: number, marketplace: Marketplace | null): MarginResult {
  const fee = marketplace ? (salePrice * MARKETPLACE_FEES[marketplace].pct) / 100 + MARKETPLACE_FEES[marketplace].fixed : 0;
  const netRevenue = salePrice - fee - shippingCost;
  const netMargin = netRevenue - cogs;
  const marginPercent = salePrice > 0 ? (netMargin / salePrice) * 100 : 0;
  return { platformFee: fee, netRevenue, netMargin, marginPercent };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function NewItemPage() {
  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2
  const [recognition, setRecognition] = useState<RecognitionResult | null>(null);
  const [recognizing, setRecognizing] = useState(false);
  const [recognizeError, setRecognizeError] = useState<string | null>(null);

  // Step 3
  const [itemType, setItemType] = useState("");
  const [brand, setBrand] = useState("");
  const [era, setEra] = useState("");
  const [eraStyle, setEraStyle] = useState("");
  const [material, setMaterial] = useState("");
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [condition, setCondition] = useState("");
  const [tags, setTags] = useState<{ category: string; value: string }[]>([]);
  const [cogs, setCogs] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [shippingCost, setShippingCost] = useState("");
  const [marketplace, setMarketplace] = useState<Marketplace>("vinted");
  const [lotId, setLotId] = useState("");
  const [lots, setLots] = useState<Lot[]>([]);

  // Step 4
  const [descriptionIt, setDescriptionIt] = useState<string | null>(null);
  const [descriptionEn, setDescriptionEn] = useState<string | null>(null);
  const [descTab, setDescTab] = useState<"it" | "en">("it");
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [descError, setDescError] = useState<string | null>(null);
  const [savedItemId, setSavedItemId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    fetch("/api/lots").then((r) => r.json()).then((data) => { if (Array.isArray(data)) setLots(data); }).catch(() => {});
  }, []);

  /* ---------- Step 1: Upload ---------- */

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    setUploadError(null);
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (arr.length === 0) { setUploadError("Seleziona file immagine validi."); return; }

    const newImages: UploadedImage[] = arr.map((f) => ({ file: f, preview: URL.createObjectURL(f), serverPath: null }));
    setImages((prev) => [...prev, ...newImages]);

    setUploading(true);
    try {
      const formData = new FormData();
      arr.forEach((f) => formData.append("files", f));
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Upload fallito"); }
      const { paths } = await res.json();
      setImages((prev) => {
        const updated = [...prev];
        let pathIdx = 0;
        for (let i = updated.length - arr.length; i < updated.length; i++) {
          if (pathIdx < paths.length) { updated[i] = { ...updated[i], serverPath: paths[pathIdx] }; pathIdx++; }
        }
        return updated;
      });
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : "Upload fallito");
    } finally {
      setUploading(false);
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const removeImage = (idx: number) => {
    setImages((prev) => { const copy = [...prev]; URL.revokeObjectURL(copy[idx].preview); copy.splice(idx, 1); return copy; });
  };

  /* ---------- Step 2: Recognition ---------- */

  const handleRecognize = async () => {
    const uploaded = images.find((img) => img.serverPath);
    if (!uploaded?.serverPath) return;
    setRecognizing(true); setRecognizeError(null);
    try {
      const res = await fetch("/api/recognize", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagePath: uploaded.serverPath }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Riconoscimento fallito"); }
      const result: RecognitionResult = await res.json();
      setRecognition(result);
      setItemType(result.item_type || "");
      setBrand(result.brand || "");
      setEra(result.era || "");
      setEraStyle(result.era_style || "");
      setMaterial(result.material || "");
      setColor(result.color || "");
      setSize(result.size || "");
      setCondition(result.condition || "");
      setTags(result.tags || []);
    } catch (e: unknown) {
      setRecognizeError(e instanceof Error ? e.message : "Riconoscimento fallito");
    } finally {
      setRecognizing(false);
    }
  };

  /* ---------- Step 4: Save & Generate ---------- */

  const buildPayload = () => ({
    lot_id: lotId || null,
    item_type: itemType || null,
    brand: brand || null,
    era: era || null,
    era_style: eraStyle || null,
    material: material || null,
    color: color || null,
    size: size || null,
    condition: condition || null,
    cogs: cogs ? parseFloat(cogs) : null,
    sale_price: salePrice ? parseFloat(salePrice) : null,
    shipping_cost: shippingCost ? parseFloat(shippingCost) : 0,
    marketplace: marketplace || null,
    status: "draft",
    recognition_raw: recognition || null,
    image_paths: images.filter((i) => i.serverPath).map((i) => i.serverPath),
    tags,
  });

  const handleGenerateDescriptions = async () => {
    setDescError(null); setGeneratingDesc(true);
    try {
      let itemId = savedItemId;
      if (!itemId) {
        setSaving(true);
        const res = await fetch("/api/items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildPayload()) });
        setSaving(false);
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Salvataggio fallito"); }
        const item = await res.json();
        itemId = item.id; setSavedItemId(item.id);
      }
      const resIt = await fetch(`/api/items/${itemId}/description`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketplace, locale: "it" }),
      });
      if (!resIt.ok) throw new Error("Generazione IT fallita");
      setDescriptionIt((await resIt.json()).description_it);

      const resEn = await fetch(`/api/items/${itemId}/description`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketplace, locale: "en" }),
      });
      if (!resEn.ok) throw new Error("Generazione EN fallita");
      setDescriptionEn((await resEn.json()).description_en);
    } catch (e: unknown) {
      setDescError(e instanceof Error ? e.message : "Errore generazione");
    } finally {
      setGeneratingDesc(false);
    }
  };

  const handleFinalSave = async () => {
    setSaving(true);
    try {
      if (savedItemId) {
        await fetch(`/api/items/${savedItemId}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload()),
        });
        window.location.href = `/items/${savedItemId}`;
      } else {
        const res = await fetch("/api/items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildPayload()) });
        if (!res.ok) throw new Error("Salvataggio fallito");
        const item = await res.json();
        window.location.href = `/items/${item.id}`;
      }
    } catch {
      window.location.href = "/items";
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field); setTimeout(() => setCopiedField(null), 2000);
  };

  /* --- Derived --- */
  const uploadedPaths = images.filter((i) => i.serverPath).map((i) => i.serverPath!);
  const canProceedStep1 = uploadedPaths.length > 0 && !uploading;
  const margin = calcMargin(parseFloat(salePrice) || 0, parseFloat(cogs) || 0, parseFloat(shippingCost) || 0, marketplace);

  const ConfidenceBadge = ({ value }: { value: number }) => {
    const pct = Math.round(value * 100);
    const clr = pct >= 80 ? "bg-green-100 text-green-800 border-green-300" : pct >= 50 ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-red-100 text-red-800 border-red-300";
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${clr}`}>Confidenza: {pct}%</span>;
  };

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-stone-800 mb-6">Nuovo Capo</h1>

      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-8" role="tablist" aria-label="Passaggi creazione capo">
        {STEPS.map((s, i) => (
          <div key={s.num} className="flex items-center">
            <button
              role="tab"
              aria-selected={s.num === step}
              aria-label={`Passo ${s.num}: ${s.label}`}
              onClick={() => { if (s.num <= step) setStep(s.num); }}
              disabled={s.num > step}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                s.num === step ? "bg-amber-600 text-white" : s.num < step ? "bg-amber-100 text-amber-800 hover:bg-amber-200 cursor-pointer" : "bg-stone-100 text-stone-400 cursor-not-allowed"
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                s.num === step ? "bg-white/20 text-white" : s.num < step ? "bg-amber-600 text-white" : "bg-stone-300 text-white"
              }`}>
                {s.num < step ? "\u2713" : s.num}
              </span>
              {s.label}
            </button>
            {i < STEPS.length - 1 && <div className={`w-6 h-0.5 mx-1 ${s.num < step ? "bg-amber-400" : "bg-stone-200"}`} />}
          </div>
        ))}
      </div>

      {/* ==================== STEP 1 ==================== */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-800 mb-4">Carica Foto</h2>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            aria-label="Area di caricamento foto: trascina o clicca per selezionare"
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
              dragOver ? "border-amber-500 bg-amber-50" : "border-stone-300 bg-stone-50 hover:border-amber-400 hover:bg-amber-50/50"
            }`}
          >
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
              onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = ""; }} />
            <div className="text-4xl mb-3 text-stone-400">{uploading ? <span className="inline-block animate-spin">&#8987;</span> : "\uD83D\uDCF7"}</div>
            <p className="text-stone-600 font-medium">{uploading ? "Caricamento..." : "Trascina le foto qui o clicca per selezionare"}</p>
            <p className="text-stone-400 text-sm mt-1">JPG, PNG, WebP — max 15MB per file</p>
          </div>

          {uploadError && <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{uploadError}</p>}

          {images.length > 0 && (
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {images.map((img, i) => (
                <div key={i} className="relative group rounded-xl overflow-hidden border border-stone-200 aspect-square bg-stone-100">
                  <img src={img.preview} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                  {!img.serverPath && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <span className="text-white text-xs animate-pulse">Caricamento...</span>
                    </div>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                    aria-label={`Rimuovi foto ${i + 1}`}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  >&times;</button>
                  {img.serverPath && <div className="absolute bottom-1.5 left-1.5 w-4 h-4 rounded-full bg-green-500 border-2 border-white" />}
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button disabled={!canProceedStep1} onClick={() => setStep(2)} aria-label="Vai al passo 2: Riconoscimento"
              className="px-5 py-2 rounded-xl bg-amber-600 text-white font-medium text-sm hover:bg-amber-700 transition-colors disabled:bg-stone-300 disabled:cursor-not-allowed">
              Avanti &rarr;
            </button>
          </div>
        </div>
      )}

      {/* ==================== STEP 2 ==================== */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-800 mb-4">Riconoscimento AI</h2>

          <div className="flex gap-2 mb-5 overflow-x-auto pb-2">
            {images.map((img, i) => (
              <div key={i} className="w-20 h-20 rounded-lg overflow-hidden border border-stone-200 flex-shrink-0">
                <img src={img.preview} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>

          {!recognition && (
            <button onClick={handleRecognize} disabled={recognizing || uploadedPaths.length === 0}
              className="w-full py-3 rounded-xl bg-amber-600 text-white font-semibold text-sm hover:bg-amber-700 transition-colors disabled:bg-stone-300 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {recognizing ? (<><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Analisi in corso...</>) : "Riconosci con AI"}
            </button>
          )}

          {recognizeError && <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{recognizeError}</p>}

          {recognition && (
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-stone-700">Risultati</h3>
                <ConfidenceBadge value={recognition.confidence} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: "Tipo", value: itemType, set: setItemType },
                  { label: "Brand", value: brand, set: setBrand },
                  { label: "Epoca", value: era, set: setEra },
                  { label: "Stile epoca", value: eraStyle, set: setEraStyle },
                  { label: "Materiale", value: material, set: setMaterial },
                  { label: "Colore", value: color, set: setColor },
                  { label: "Taglia", value: size, set: setSize },
                ].map((field) => (
                  <label key={field.label} className="block">
                    <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">{field.label}</span>
                    <input type="text" value={field.value} onChange={(e) => field.set(e.target.value)}
                      className="mt-1 block w-full rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  </label>
                ))}
                <label className="block">
                  <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">Condizione</span>
                  <select value={condition} onChange={(e) => setCondition(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500">
                    <option value="">— Seleziona —</option>
                    {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </label>
              </div>

              {tags.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">Tags</span>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {tags.map((tag, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-stone-100 text-stone-700 border border-stone-200">
                        <span className="text-stone-400">{tag.category}:</span>{tag.value}
                        <button onClick={() => setTags((prev) => prev.filter((_, j) => j !== i))} aria-label="Rimuovi tag" className="ml-0.5 text-stone-400 hover:text-red-500">&times;</button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between mt-4">
                <button onClick={() => setStep(1)} className="px-4 py-2 rounded-xl text-sm font-medium text-stone-600 border border-stone-300 hover:bg-stone-50 transition-colors">&larr; Indietro</button>
                <button onClick={() => setStep(3)} className="px-5 py-2 rounded-xl bg-amber-600 text-white font-medium text-sm hover:bg-amber-700 transition-colors">Avanti &rarr;</button>
              </div>
            </div>
          )}

          {!recognition && !recognizing && (
            <div className="mt-4 flex justify-start">
              <button onClick={() => setStep(1)} className="px-4 py-2 rounded-xl text-sm font-medium text-stone-600 border border-stone-300 hover:bg-stone-50 transition-colors">&larr; Indietro</button>
            </div>
          )}
        </div>
      )}

      {/* ==================== STEP 3 ==================== */}
      {step === 3 && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-6">
          <h2 className="text-lg font-semibold text-stone-800">Dettagli e Prezzi</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: "Tipo", value: itemType, set: setItemType },
              { label: "Brand", value: brand, set: setBrand },
              { label: "Epoca", value: era, set: setEra },
              { label: "Stile epoca", value: eraStyle, set: setEraStyle },
              { label: "Materiale", value: material, set: setMaterial },
              { label: "Colore", value: color, set: setColor },
              { label: "Taglia", value: size, set: setSize },
            ].map((field) => (
              <label key={field.label} className="block">
                <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">{field.label}</span>
                <input type="text" value={field.value} onChange={(e) => field.set(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </label>
            ))}
            <label className="block">
              <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">Condizione</span>
              <select value={condition} onChange={(e) => setCondition(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500">
                <option value="">— Seleziona —</option>
                {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </label>
          </div>

          {/* Pricing */}
          <div className="border-t border-stone-200 pt-5">
            <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide mb-3">Prezzi e Margine</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <label className="block">
                <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">Marketplace</span>
                <select value={marketplace} onChange={(e) => setMarketplace(e.target.value as Marketplace)}
                  className="mt-1 block w-full rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500">
                  {(Object.entries(MARKETPLACE_FEES) as [Marketplace, { label: string }][]).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">Costo (COGS) &euro;</span>
                <input type="number" step="0.01" min="0" value={cogs} onChange={(e) => setCogs(e.target.value)} placeholder="0.00"
                  className="mt-1 block w-full rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">Prezzo vendita &euro;</span>
                <input type="number" step="0.01" min="0" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} placeholder="0.00"
                  className="mt-1 block w-full rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">Spedizione &euro;</span>
                <input type="number" step="0.01" min="0" value={shippingCost} onChange={(e) => setShippingCost(e.target.value)} placeholder="0.00"
                  className="mt-1 block w-full rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </label>
            </div>

            {(parseFloat(salePrice) > 0 || parseFloat(cogs) > 0) && (
              <div className="mt-4 bg-stone-50 rounded-xl border border-stone-200 p-4" aria-live="polite">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center text-sm">
                  <div>
                    <p className="text-stone-400 text-xs uppercase">Fee piattaforma</p>
                    <p className="text-stone-700 font-semibold mt-1">&euro;{margin.platformFee.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-stone-400 text-xs uppercase">Ricavo netto</p>
                    <p className="text-stone-700 font-semibold mt-1">&euro;{margin.netRevenue.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-stone-400 text-xs uppercase">Margine netto</p>
                    <p className={`font-bold mt-1 ${margin.netMargin >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {margin.netMargin >= 0 ? "+" : ""}&euro;{margin.netMargin.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-stone-400 text-xs uppercase">Margine %</p>
                    <p className={`font-bold mt-1 ${margin.marginPercent >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {margin.marginPercent >= 0 ? "+" : ""}{margin.marginPercent.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Lot */}
          <div className="border-t border-stone-200 pt-5">
            <label className="block">
              <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">Lotto (opzionale)</span>
              <select value={lotId} onChange={(e) => setLotId(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500">
                <option value="">Nessun lotto</option>
                {lots.map((lot) => <option key={lot.id} value={lot.id}>{lot.name}</option>)}
              </select>
            </label>
          </div>

          <div className="flex justify-between pt-2">
            <button onClick={() => setStep(2)} className="px-4 py-2 rounded-xl text-sm font-medium text-stone-600 border border-stone-300 hover:bg-stone-50 transition-colors">&larr; Indietro</button>
            <button onClick={() => setStep(4)} aria-label="Vai al passo 4: Descrizione" className="px-5 py-2 rounded-xl bg-amber-600 text-white font-medium text-sm hover:bg-amber-700 transition-colors">Avanti &rarr;</button>
          </div>
        </div>
      )}

      {/* ==================== STEP 4 ==================== */}
      {step === 4 && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-5">
          <h2 className="text-lg font-semibold text-stone-800">Genera Descrizione</h2>

          {!descriptionIt && !descriptionEn && (
            <button onClick={handleGenerateDescriptions} disabled={generatingDesc || saving}
              className="w-full py-3 rounded-xl bg-amber-600 text-white font-semibold text-sm hover:bg-amber-700 transition-colors disabled:bg-stone-300 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {saving ? (<><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Salvataggio capo...</>) :
                generatingDesc ? (<><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generazione descrizioni AI...</>) : "Genera Descrizioni"}
            </button>
          )}

          {descError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{descError}</p>}

          {(descriptionIt || descriptionEn) && (
            <div>
              <div className="flex gap-1 border-b border-stone-200 mb-4">
                {(["it", "en"] as const).map((locale) => (
                  <button key={locale} onClick={() => setDescTab(locale)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                      descTab === locale ? "border-amber-600 text-amber-700" : "border-transparent text-stone-400 hover:text-stone-600"
                    }`}>
                    {locale === "it" ? "Italiano" : "English"}
                  </button>
                ))}
              </div>
              <div className="relative">
                <div className="bg-stone-50 rounded-xl border border-stone-200 p-4 min-h-[120px] text-sm text-stone-700 whitespace-pre-wrap">
                  {descTab === "it" ? descriptionIt || "Nessuna descrizione generata" : descriptionEn || "No description generated"}
                </div>
                <button
                  onClick={() => { const text = descTab === "it" ? descriptionIt : descriptionEn; if (text) copyToClipboard(text, descTab); }}
                  aria-label={`Copia descrizione ${descTab === "it" ? "italiana" : "inglese"}`}
                  className="absolute top-2 right-2 px-3 py-1.5 rounded-lg bg-white border border-stone-300 text-xs font-medium text-stone-600 hover:bg-stone-100 transition-colors shadow-sm">
                  {copiedField === descTab ? "Copiato!" : "Copia"}
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-2">
            <button onClick={() => setStep(3)} className="px-4 py-2 rounded-xl text-sm font-medium text-stone-600 border border-stone-300 hover:bg-stone-50 transition-colors">&larr; Indietro</button>
            <button onClick={handleFinalSave} disabled={saving}
              className="px-6 py-2 rounded-xl bg-green-600 text-white font-semibold text-sm hover:bg-green-700 transition-colors disabled:bg-stone-300 disabled:cursor-not-allowed flex items-center gap-2">
              {saving ? (<><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Salvataggio...</>) : "Salva"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
