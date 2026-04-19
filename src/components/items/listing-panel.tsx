"use client";

import { useCallback, useEffect, useState } from "react";
import type { Marketplace } from "@/types/item";
import { detectCanShareFiles } from "@/lib/web-share";

interface FormattedListing {
  platform: Marketplace;
  title: string;
  description: string;
  hashtags: string[];
  category: string;
  price: number | null;
  extras: Record<string, string>;
}

const PLATFORM_CONFIG: Record<string, { label: string; color: string; icon: string; hasApi: boolean }> = {
  vinted: { label: "Vinted", color: "bg-teal-100 text-teal-800 border-teal-300", icon: "V", hasApi: false },
  depop: { label: "Depop", color: "bg-red-100 text-red-800 border-red-300", icon: "D", hasApi: false },
  wallapop: { label: "Wallapop", color: "bg-blue-100 text-blue-800 border-blue-300", icon: "W", hasApi: false },
  ebay: { label: "eBay", color: "bg-yellow-100 text-yellow-800 border-yellow-300", icon: "e", hasApi: true },
  vestiaire: { label: "Vestiaire", color: "bg-purple-100 text-purple-800 border-purple-300", icon: "VC", hasApi: false },
};

const LISTING_PLATFORMS: Marketplace[] = ["vinted", "depop", "wallapop", "ebay", "vestiaire"];

function eur(value: number | null): string {
  if (value == null) return "--";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value);
}

export function ListingPanel({
  itemId,
  listedPlatforms: initialListed,
}: {
  itemId: string;
  listedPlatforms: string[];
}) {
  const [selectedPlatform, setSelectedPlatform] = useState<Marketplace | null>(null);
  const [listing, setListing] = useState<FormattedListing | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [listedPlatforms, setListedPlatforms] = useState<string[]>(initialListed);
  const [marking, setMarking] = useState(false);
  const [canShareFiles, setCanShareFiles] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    setCanShareFiles(detectCanShareFiles());
  }, []);

  const downloadZip = useCallback((platform: Marketplace) => {
    window.location.href = `/api/items/${itemId}/export?platform=${platform}`;
  }, [itemId]);

  const shareListing = useCallback(async (platform: Marketplace) => {
    if (!canShareFiles) return;
    setSharing(true);
    try {
      const listingRes = await fetch(`/api/items/${itemId}/listing?platform=${platform}`);
      if (!listingRes.ok) throw new Error("listing fetch failed");
      const l: FormattedListing = await listingRes.json();

      const imgRes = await fetch(`/api/items/${itemId}`);
      if (!imgRes.ok) throw new Error("item fetch failed");
      const itemData = await imgRes.json();
      const rawPaths: unknown = itemData.image_paths;
      const imagePaths: string[] = Array.isArray(rawPaths)
        ? rawPaths
        : typeof rawPaths === "string"
          ? (() => { try { return JSON.parse(rawPaths || "[]"); } catch { return []; } })()
          : [];

      const files: File[] = [];
      for (const p of imagePaths) {
        try {
          const r = await fetch(p);
          if (!r.ok) continue;
          const blob = await r.blob();
          const name = p.split("/").pop() || "photo.jpg";
          files.push(new File([blob], name, { type: blob.type || "image/jpeg" }));
        } catch {
          // skip individual failure
        }
      }

      const nav = navigator as Navigator & {
        canShare?: (data?: { files?: File[] }) => boolean;
        share?: (data: { title?: string; text?: string; files?: File[] }) => Promise<void>;
      };
      if (!nav.share) return;

      const payload = {
        title: l.title,
        text: `${l.description}\n\n${l.hashtags.join(" ")}`,
        files: files.length > 0 && nav.canShare?.({ files }) ? files : undefined,
      };

      await nav.share(payload);
    } catch {
      // User cancelled or a file was unavailable — stay silent per spec.
    } finally {
      setSharing(false);
    }
  }, [itemId, canShareFiles]);

  const generateListing = useCallback(async (platform: Marketplace) => {
    setSelectedPlatform(platform);
    setLoading(true);
    setListing(null);
    try {
      const res = await fetch(`/api/items/${itemId}/listing?platform=${platform}`);
      if (!res.ok) throw new Error("Errore");
      const data = await res.json();
      setListing(data);
    } catch {
      setListing(null);
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  const copyToClipboard = useCallback(async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(field);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(field);
      setTimeout(() => setCopied(null), 2000);
    }
  }, []);

  const markAsListed = useCallback(async (platform: Marketplace) => {
    setMarking(true);
    try {
      const res = await fetch(`/api/items/${itemId}/listing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });
      if (!res.ok) throw new Error("Errore");
      const data = await res.json();
      setListedPlatforms(data.listed_platforms || []);
    } finally {
      setMarking(false);
    }
  }, [itemId]);

  const removeListing = useCallback(async (platform: string) => {
    try {
      const res = await fetch(`/api/items/${itemId}/listing?platform=${platform}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Errore");
      const data = await res.json();
      setListedPlatforms(data.listed_platforms || []);
    } catch {
      // ignore
    }
  }, [itemId]);

  return (
    <section className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 space-y-5" role="tabpanel">
      <h2 className="text-lg font-semibold text-stone-800">Pubblica su piattaforma</h2>

      {/* Listed platforms badges */}
      {listedPlatforms.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">Pubblicato su</p>
          <div className="flex gap-2 flex-wrap">
            {listedPlatforms.map((p) => {
              const cfg = PLATFORM_CONFIG[p];
              return (
                <span key={p} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${cfg?.color || "bg-stone-100 text-stone-700 border-stone-300"}`}>
                  {cfg?.label || p}
                  <button
                    onClick={() => removeListing(p)}
                    className="ml-1 hover:opacity-70"
                    aria-label={`Rimuovi da ${cfg?.label || p}`}
                  >
                    x
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Platform buttons */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">Genera inserzione per</p>
        <div className="flex gap-2 flex-wrap">
          {LISTING_PLATFORMS.map((platform) => {
            const cfg = PLATFORM_CONFIG[platform];
            const isListed = listedPlatforms.includes(platform);
            return (
              <button
                key={platform}
                onClick={() => generateListing(platform)}
                disabled={loading && selectedPlatform === platform}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  selectedPlatform === platform
                    ? "bg-amber-600 text-white border-amber-600"
                    : `${cfg.color} hover:opacity-80 border`
                } ${isListed ? "ring-2 ring-emerald-400" : ""}`}
              >
                {cfg.label}
                {isListed && <span className="ml-1 text-xs" aria-label="Pubblicato"> (online)</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-2 text-stone-500 text-sm">
          <div className="w-4 h-4 border-2 border-stone-300 border-t-amber-500 rounded-full animate-spin" />
          Generazione inserzione...
        </div>
      )}

      {/* Listing preview */}
      {listing && !loading && (
        <div className="space-y-4 border-t border-stone-200 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-stone-700">
              Inserzione per {PLATFORM_CONFIG[listing.platform]?.label || listing.platform}
            </h3>
            {!PLATFORM_CONFIG[listing.platform]?.hasApi && (
              <span className="text-xs text-stone-400">Copia e incolla</span>
            )}
          </div>

          {/* Title */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Titolo</label>
              <button
                onClick={() => copyToClipboard(listing.title, "title")}
                className="text-xs text-amber-600 hover:text-amber-700 font-medium"
              >
                {copied === "title" ? "Copiato!" : "Copia"}
              </button>
            </div>
            <div className="bg-stone-50 rounded-lg p-3 text-sm text-stone-800 font-medium">
              {listing.title}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Descrizione</label>
              <button
                onClick={() => copyToClipboard(listing.description, "desc")}
                className="text-xs text-amber-600 hover:text-amber-700 font-medium"
              >
                {copied === "desc" ? "Copiato!" : "Copia"}
              </button>
            </div>
            <div className="bg-stone-50 rounded-lg p-3 text-sm text-stone-700 whitespace-pre-wrap max-h-48 overflow-y-auto">
              {listing.description}
            </div>
          </div>

          {/* Hashtags */}
          {listing.hashtags.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Hashtag</label>
                <button
                  onClick={() => copyToClipboard(listing.hashtags.join(" "), "hashtags")}
                  className="text-xs text-amber-600 hover:text-amber-700 font-medium"
                >
                  {copied === "hashtags" ? "Copiato!" : "Copia"}
                </button>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {listing.hashtags.map((h, i) => (
                  <span key={i} className="bg-stone-100 text-stone-600 px-2 py-0.5 rounded text-xs">{h}</span>
                ))}
              </div>
            </div>
          )}

          {/* Category + Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Categoria</label>
              <p className="text-sm text-stone-700 mt-1">{listing.category}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Prezzo</label>
              <p className="text-sm text-stone-700 font-semibold mt-1">{eur(listing.price)}</p>
            </div>
          </div>

          {/* eBay specifics */}
          {listing.platform === "ebay" && Object.keys(listing.extras).length > 0 && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Item Specifics (eBay)</label>
              <div className="bg-stone-50 rounded-lg p-3 grid grid-cols-2 gap-2 text-sm">
                {Object.entries(listing.extras).filter(([, v]) => v).map(([k, v]) => (
                  <div key={k}>
                    <span className="text-stone-500 capitalize">{k.replace(/_/g, " ")}:</span>{" "}
                    <span className="text-stone-700">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Copy all + Mark as listed + ZIP + Share */}
          <div className="flex gap-3 pt-2 flex-wrap">
            <button
              onClick={() => copyToClipboard(
                `${listing.title}\n\n${listing.description}`,
                "all"
              )}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors"
            >
              {copied === "all" ? "Copiato tutto!" : "Copia tutto"}
            </button>
            <button
              data-testid="download-zip"
              onClick={() => downloadZip(listing.platform)}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-sky-600 text-white hover:bg-sky-700 transition-colors"
            >
              Scarica pacchetto
            </button>
            {canShareFiles && (
              <button
                data-testid="share-listing"
                onClick={() => shareListing(listing.platform)}
                disabled={sharing}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
              >
                {sharing ? "Condivisione..." : "Condividi"}
              </button>
            )}
            {!listedPlatforms.includes(listing.platform) && (
              <button
                onClick={() => markAsListed(listing.platform)}
                disabled={marking}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {marking ? "Salvataggio..." : `Segna come pubblicato su ${PLATFORM_CONFIG[listing.platform]?.label}`}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
