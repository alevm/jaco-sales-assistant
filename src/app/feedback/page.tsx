"use client";

import { useEffect, useState } from "react";

interface FeedbackItem {
  id: number;
  title: string;
  description: string;
  priority: "nice-to-have" | "important" | "urgent";
  status: string;
  pm_response: string | null;
  pm_responded_at: string | null;
  created_at: string;
}

const PRIORITY_LABELS: Record<string, { label: string; css: string }> = {
  "nice-to-have": { label: "Nice to have", css: "bg-stone-100 text-stone-600" },
  important: { label: "Importante", css: "bg-amber-100 text-amber-800" },
  urgent: { label: "Urgente", css: "bg-red-100 text-red-800" },
};

const STATUS_LABELS: Record<string, { label: string; css: string }> = {
  new: { label: "Nuovo", css: "bg-sky-100 text-sky-800" },
  under_review: { label: "In esame", css: "bg-indigo-100 text-indigo-800" },
  accepted: { label: "Accettato", css: "bg-emerald-100 text-emerald-800" },
  declined: { label: "Rifiutato", css: "bg-stone-200 text-stone-700" },
  done: { label: "Completato", css: "bg-green-100 text-green-800" },
  needs_info: { label: "Info richieste", css: "bg-amber-100 text-amber-800" },
};

export default function FeedbackPage() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<string>("nice-to-have");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fetchFeedback = () => {
    fetch("/api/feedback")
      .then((res) => {
        if (!res.ok) throw new Error("Errore nel caricamento");
        return res.json();
      })
      .then((data) => setItems(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim(), priority }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Errore nell'invio");
      }

      setTitle("");
      setDescription("");
      setPriority("nice-to-have");
      setSuccess(true);
      fetchFeedback();
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-stone-800">Feedback</h1>
        <p className="text-stone-500 text-sm mt-1">
          Suggerisci funzionalita o segnala problemi
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 space-y-4">
        <div>
          <label htmlFor="fb-title" className="block text-sm font-medium text-stone-700 mb-1">
            Titolo <span className="text-red-500">*</span>
          </label>
          <input
            id="fb-title"
            type="text"
            required
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Es: Aggiungere filtro per brand"
            className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>

        <div>
          <label htmlFor="fb-desc" className="block text-sm font-medium text-stone-700 mb-1">
            Descrizione
          </label>
          <textarea
            id="fb-desc"
            rows={4}
            maxLength={2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrivi la tua idea o il problema in dettaglio..."
            className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-y"
          />
        </div>

        <div>
          <label htmlFor="fb-priority" className="block text-sm font-medium text-stone-700 mb-1">
            Priorita
          </label>
          <select
            id="fb-priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
          >
            <option value="nice-to-have">Nice to have</option>
            <option value="important">Importante</option>
            <option value="urgent">Urgente</option>
          </select>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-red-700 text-sm" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-green-700 text-sm" role="status">
            Feedback inviato con successo!
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !title.trim()}
          className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? "Invio..." : "Invia feedback"}
        </button>
      </form>

      {/* List of past submissions */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-stone-700">Richieste precedenti</h2>

        {loading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-4 border-stone-300 border-t-amber-500 rounded-full animate-spin mx-auto" role="status" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-stone-400 text-sm py-4">Nessun feedback inviato ancora.</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl shadow-sm border border-stone-200 p-4"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <h3 className="text-sm font-medium text-stone-800">{item.title}</h3>
                  <div className="flex gap-2 shrink-0">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITY_LABELS[item.priority]?.css || "bg-stone-100 text-stone-600"}`}>
                      {PRIORITY_LABELS[item.priority]?.label || item.priority}
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_LABELS[item.status]?.css || "bg-stone-100 text-stone-500"}`}>
                      {STATUS_LABELS[item.status]?.label || item.status}
                    </span>
                  </div>
                </div>
                {item.description && (
                  <p className="text-sm text-stone-500 mt-2 whitespace-pre-line">{item.description}</p>
                )}
                {item.pm_response && (
                  <div className="mt-3 border-l-2 border-amber-400 pl-3">
                    <p className="text-xs font-semibold text-stone-700">Risposta del team</p>
                    <p className="text-sm text-stone-600 mt-1 whitespace-pre-line">{item.pm_response}</p>
                  </div>
                )}
                <p className="text-xs text-stone-400 mt-2">
                  {new Date(item.created_at).toLocaleDateString("it-IT", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
