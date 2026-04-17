"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Lot {
  id: string;
  name: string;
  total_cogs: number;
  notes: string | null;
  item_count: number;
  cogs_per_item: number;
  created_at: string;
}

export default function LotsPage() {
  const [lots, setLots] = useState<Lot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [totalCogs, setTotalCogs] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchLots();
  }, []);

  async function fetchLots() {
    const res = await fetch("/api/lots");
    setLots(await res.json());
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/lots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, total_cogs: parseFloat(totalCogs), notes: notes || null }),
    });
    setName("");
    setTotalCogs("");
    setNotes("");
    setShowForm(false);
    setSaving(false);
    fetchLots();
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-stone-200 rounded animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-stone-200 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Lotti</h1>
          <p className="text-sm text-stone-500 mt-1">
            {lots.length} lott{lots.length === 1 ? "o" : "i"}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
        >
          + Nuovo Lotto
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-xl shadow-sm border border-stone-200 p-5 mb-6 space-y-4"
        >
          <h3 className="font-semibold text-stone-800">Nuovo Lotto</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">Nome</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="es. Mercatino Porta Portese"
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
                required
                placeholder="0.00"
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
              placeholder="Note opzionali sul lotto..."
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
            >
              {saving ? "Salvataggio..." : "Crea Lotto"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-stone-100 text-stone-600 rounded-lg text-sm hover:bg-stone-200"
            >
              Annulla
            </button>
          </div>
        </form>
      )}

      {lots.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-stone-200">
          <p className="text-4xl mb-3">📦</p>
          <p className="text-stone-600 font-medium">Nessun lotto</p>
          <p className="text-sm text-stone-400 mt-1">
            Crea il tuo primo lotto per tracciare i COGS
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {lots.map((lot) => (
            <Link
              key={lot.id}
              href={`/lots/${lot.id}`}
              className="block bg-white rounded-xl shadow-sm border border-stone-200 p-5 hover:shadow-md hover:border-stone-300 transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-stone-800">{lot.name}</h3>
                  {lot.notes && (
                    <p className="text-sm text-stone-500 mt-1">{lot.notes}</p>
                  )}
                  <p className="text-xs text-stone-400 mt-2">
                    {new Date(lot.created_at).toLocaleDateString("it-IT")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-stone-800">{fmt(lot.total_cogs)}</p>
                  <p className="text-sm text-stone-500">
                    {lot.item_count} cap{lot.item_count === 1 ? "o" : "i"}
                    {lot.item_count > 0 && (
                      <span className="text-stone-400"> ({fmt(lot.cogs_per_item)}/capo)</span>
                    )}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
