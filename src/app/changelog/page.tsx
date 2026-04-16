export default function ChangelogPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-stone-800">Changelog</h1>
        <p className="text-stone-500 text-sm mt-1">
          Cronologia delle funzionalita e miglioramenti di VintageAgent
        </p>
      </div>

      <Milestone
        title="v0.5 — Mobile, Feedback e Changelog"
        date="Aprile 2026"
        items={[
          "Layout responsive con menu hamburger per dispositivi mobili",
          "Pagina /changelog con cronologia completa delle funzionalita",
          "Pagina /feedback per richieste e segnalazioni da parte dell'utente",
          "Autenticazione Authelia (forward_auth) — accesso browser senza token Bearer",
        ]}
      />

      <Milestone
        title="v0.4 — Trend Analysis e Dashboard Avanzata"
        date="Aprile 2026"
        items={[
          "Grafici SVG per trend prezzi medi, margini e confronto categorie",
          "Tabella performance per marketplace con metriche dettagliate",
          "Classifica brand per fatturato e margine",
          "Filtro periodo dashboard: Questo mese, 30 giorni, Trimestre, Anno",
          "Inventario fermo: alert per capi in vendita da 30+ giorni",
        ]}
      />

      <Milestone
        title="v0.3 — Multi-piattaforma e Listing"
        date="Aprile 2026"
        items={[
          "Generazione listing per piattaforma: Vinted IT, Depop, Wallapop, eBay, Vestiaire Collective",
          "Tab \"Pubblica\" nella pagina dettaglio capo — genera, copia e traccia listing",
          "Tracciamento piattaforme dove un capo e in vendita",
          "Export CSV/JSON dei capi con filtro per stato",
          "Endpoint /api/items/duplicates — rilevamento capi simili per tipo, brand, colore, era, taglia",
        ]}
      />

      <Milestone
        title="v0.2 — Lotti, Vendite e AI"
        date="Marzo 2026"
        items={[
          "Gestione lotti/batch — raggruppamento capi per acquisto",
          "Upload batch fino a 50 foto con riconoscimento AI automatico",
          "Endpoint vendita con report margine (COGS, commissioni, netto)",
          "Suggerimento prezzo AI basato su attributi, brand, era, condizione",
          "Generazione descrizione AI con cap a 2000 caratteri",
          "Rate limiting 20 req/min sugli endpoint LLM",
        ]}
      />

      <Milestone
        title="v0.1 — MVP"
        date="Marzo 2026"
        items={[
          "CRUD completo per capi vintage (tipo, brand, taglia, colore, era, condizione)",
          "Upload immagini con validazione estensione (jpg, png, webp)",
          "Riconoscimento immagine AI — identifica tipo, brand, era, colore da foto",
          "Calcolo margine con COGS, prezzo vendita e commissioni marketplace",
          "Dashboard con riepilogo vendite, margini e statistiche",
          "Validazione Zod su tutte le API POST/PUT",
          "Header di sicurezza (CSP, X-Frame-Options, X-Content-Type-Options)",
          "Hardening Claude API: try/catch JSON.parse, timeout 30s con AbortController",
          "55 test Vitest con mock infrastruttura Claude",
          "Dockerfile multi-stage con output standalone",
          "Endpoint /api/health per monitoring",
        ]}
      />
    </div>
  );
}

function Milestone({
  title,
  date,
  items,
}: {
  title: string;
  date: string;
  items: string[];
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline gap-3 flex-wrap">
        <h2 className="text-lg font-semibold text-stone-800">{title}</h2>
        <span className="text-xs font-medium text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
          {date}
        </span>
      </div>
      <ul className="space-y-1.5 ml-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-stone-600">
            <span className="text-amber-500 mt-0.5 shrink-0">&#9679;</span>
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
