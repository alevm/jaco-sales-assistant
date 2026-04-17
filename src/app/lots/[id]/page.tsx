"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface LotItem {
  id: string;
  item_type: string | null;
  brand: string | null;
  cogs: number | null;
  sale_price: number | null;
  status: string;
  image_paths: string;
}

interface LotDetail {
  id: string;
  name: string;
  total_cogs: number;
  notes: string | null;
  item_count: number;
  cogs_per_item: number;
  items: LotItem[];
  created_at: string;
}

export default function LotDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [lot, setLot] = useState<LotDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [totalCogs, setTotalCogs] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchLot();
  }, [id]);

  async function fetchLot() {
    const res = await fetch(`/api/lots/${id}`);
    if (!res.ok) return;
    const data = await res.json();
    setLot(data);
    setName(data.name);
    setTotalCogs(data.total_cogs.toString());
    setNotes(data.notes || "");
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/lots/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        total_cogs: parseFloat(totalCogs),
        notes: notes || null,
        auto_split_cogs: true,
      }),
    });
    setSaving(false);
    setEditing(false);
    fetchLot();
  }

  async function handleDelete() {
    if (!confirm("Eliminare questo lotto? I capi non verranno eliminati.")) return;
    await fetch(`/api/lots/${id}`, { method: "DELETE" });
    router.push("/lots");
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);

  if (loading) {
    return <div className="h-48 bg-stone-200 rounded-xl animate-pulse" />;
  }

  if (!lot) {
    return (
      <div className="text-center py-16">
        <p className="text-stone-500">Lotto non trovato</p>
        <Link href="/lots" className="text-amber-600 text-sm mt-2 inline-block">
          Torna ai lotti
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <Link href="/lots" className="text-sm text-stone-500 hover:text-stone-700 mb-4 inline-block">
        &larr; Tutti i lotti
      </Link>

      <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 mb-6">
        {editing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">Nome</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">
                  Costo Totale (EUR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={totalCogs}
                  onChange={(e) => setTotalCogs(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">Note</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <p className="text-xs text-stone-400">
              Il salvataggio distribuirà il costo equamente tra i {lot.item_count} capi del lotto.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
              >
                {saving ? "Salvataggio..." : "Salva"}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="px-4 py-2 bg-stone-100 text-stone-600 rounded-lg text-sm hover:bg-stone-200"
              >
                Annulla
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-stone-800">{lot.name}</h1>
              {lot.notes && <p className="text-stone-500 mt-1">{lot.notes}</p>}
              <p className="text-xs text-stone-400 mt-2">
                Creato il {new Date(lot.created_at).toLocaleDateString("it-IT")}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-stone-800">{fmt(lot.total_cogs)}</p>
              <p className="text-sm text-stone-500">
                {lot.item_count} capi &middot; {fmt(lot.cogs_per_item)}/capo
              </p>
              <div className="flex gap-2 mt-3 justify-end">
                <button
                  onClick={() => setEditing(true)}
                  className="px-3 py-1.5 bg-stone-100 text-stone-600 rounded-lg text-sm hover:bg-stone-200"
                >
                  Modifica
                </button>
                <button
                  onClick={handleDelete}
                  className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100"
                >
                  Elimina
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <h2 className="text-lg font-semibold text-stone-800 mb-3">
        Capi nel lotto ({lot.items.length})
      </h2>

      {lot.items.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-stone-200">
          <p className="text-stone-500">Nessun capo in questo lotto</p>
          <Link href="/items/new" className="text-amber-600 text-sm mt-2 inline-block">
            Aggiungi un capo
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {lot.items.map((item) => {
            const images = JSON.parse(item.image_paths || "[]") as string[];
            return (
              <Link
                key={item.id}
                href={`/items/${item.id}`}
                className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 bg-white rounded-xl border border-stone-200 p-4 hover:shadow-sm transition-all"
              >
                <div className="w-12 h-12 rounded-lg bg-stone-100 overflow-hidden flex-shrink-0">
                  {images[0] ? (
                    <img
                      src={images[0]}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-400 text-lg">
                      👕
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-stone-800 truncate">
                    {item.item_type || "Capo"} {item.brand && `— ${item.brand}`}
                  </p>
                  <p className="text-xs text-stone-400">
                    COGS: {item.cogs != null ? fmt(item.cogs) : "—"}
                  </p>
                </div>
                <div className="text-right">
                  {item.sale_price != null && (
                    <p className="font-medium text-stone-800">{fmt(item.sale_price)}</p>
                  )}
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      item.status === "sold"
                        ? "bg-green-100 text-green-700"
                        : item.status === "listed"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-stone-100 text-stone-600"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
