# VintageAgent — AI Sales Assistant

AI-powered sales assistant for vintage clothing. Supports the full lifecycle: image recognition, auto-tagging, description generation, COGS tracking, margin calculation, and multi-platform listing.

## Tech Stack

- **Framework**: Next.js 14+ (App Router, TypeScript)
- **AI**: Claude API (Vision for recognition, text for descriptions)
- **Database**: SQLite via better-sqlite3 (WAL mode, auto-migrations)
- **Styling**: Tailwind CSS
- **Marketplaces**: Vinted (0% fee), eBay (13% fee)

## Setup

```bash
npm install
cp .env.local.example .env.local  # Add your ANTHROPIC_API_KEY
npm run dev
```

## Features (MVP)

| Feature | PRD Ref | Description |
|---------|---------|-------------|
| Image Recognition | REL-01 | Claude Vision identifies type, brand, era, material, color, size, condition |
| Auto-tagging | REL-03 | Machine-readable structured tags for search and filtering |
| Description Generation | SEL-01 | Marketplace-optimized descriptions (Vinted/eBay) in IT and EN |
| COGS Tracking | SRC-03 | Per-item or per-lot cost tracking with auto-split |
| Margin Calculator | SEL-04 | Real-time: sale price - platform fee - COGS = net margin |
| Dashboard | ANA-01 | Margins by item, lot, marketplace, and period |

## Project Structure

```
src/
  app/
    api/          # 8 API route handlers (items, lots, upload, recognize, dashboard)
    items/        # Inventory list, new item wizard, item detail pages
    lots/         # Lot management pages
    page.tsx      # Dashboard
  lib/            # Core logic (db, claude, recognize, describe, margin, upload)
  types/          # TypeScript interfaces
  components/     # Sidebar, layout
data/
  migrations/     # SQLite schema (auto-applied on first run)
tests/
  test_jaco.py    # 192 QA tests (regression, security, a11y, perf, scalability, unit)
```

## Testing

```bash
pytest tests/ -v
```

192 tests across 6 categories required by [Sisyphus](https://github.com/alevm/Sisyphus) QA:

| Category | Tests | What's checked |
|----------|-------|---------------|
| Regression | 95 | File structure, API contracts, database schema |
| Security | 22 | No hardcoded secrets, input validation, file handling |
| Accessibility | 18 | Semantic HTML, labels, alt attributes, color contrast |
| Performance | 9 | Token limits, WAL mode, indexes, file size limits |
| Scalability | 7 | Singletons, idempotent migrations, stateless APIs |
| Unit | 38 | Margin calculation, recognition prompt, description prompt, fees |

## API Routes

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/upload` | Upload garment images (max 5MB) |
| POST | `/api/recognize` | AI recognition via Claude Vision |
| GET/POST | `/api/items` | List and create items |
| GET/PUT/DELETE | `/api/items/[id]` | Item CRUD |
| POST | `/api/items/[id]/description` | Generate marketplace descriptions |
| GET/POST | `/api/lots` | List and create lots |
| GET/PUT/DELETE | `/api/lots/[id]` | Lot CRUD with COGS auto-split |
| GET | `/api/dashboard` | Margin analytics |

## Roadmap

| Phase | Focus | PRD Requirements |
|-------|-------|-----------------|
| **MVP** (done) | Core pipeline | REL-01, REL-03, SEL-01, SRC-03, SEL-04, ANA-01 |
| v1.0 | Market intelligence + multi-platform | ANA-02, SEL-03, SEL-02, SEL-05, CLI-01 |
| v1.5 | Sourcing support + analytics | SRC-01, SRC-02, REL-02, ANA-03, CLI-03 |
| v2.0 | Trend detection + automations | ANA-04, CLI-02, SRC-04, SEL-06, ANA-05 |
