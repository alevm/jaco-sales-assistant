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
cp .env.example .env.local  # Add your ANTHROPIC_API_KEY
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
  recognize.test.ts  # Recognition path traversal and validation tests
  upload.test.ts     # Upload extension whitelist tests
  margin.test.ts     # Margin calculation tests
```

## Testing

```bash
npm test
```

55 vitest tests covering security (path traversal, XSS via extension), Claude call hardening, rate limiting, zod validation, margin math, description generation, price suggestions, and upload validation.

## API Routes

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/upload` | Upload garment images (max 15MB) |
| POST | `/api/recognize` | AI recognition via Claude Vision |
| GET/POST | `/api/items` | List and create items |
| GET/PUT/DELETE | `/api/items/[id]` | Item CRUD |
| POST | `/api/items/[id]/description` | Generate marketplace descriptions |
| GET/POST | `/api/lots` | List and create lots |
| GET/PUT/DELETE | `/api/lots/[id]` | Lot CRUD with COGS auto-split |
| GET | `/api/health` | Health check (public, no auth) |
| GET | `/api/dashboard` | Margin analytics |

## Positioning

See [docs/POSITIONING.md](docs/POSITIONING.md) for value prop, target user, competitive differentiation, and unit economics.

## Roadmap

| Phase | Focus | PRD Requirements |
|-------|-------|-----------------|
| **MVP** (done) | Core pipeline | REL-01, REL-03, SEL-01, SRC-03, SEL-04, ANA-01 |
| v1.0 | Market intelligence + multi-platform | ANA-02, SEL-03, SEL-02, SEL-05, CLI-01 |
| v1.5 | Sourcing support + analytics | SRC-01, SRC-02, REL-02, ANA-03, CLI-03 |
| v2.0 | Trend detection + automations | ANA-04, CLI-02, SRC-04, SEL-06, ANA-05 |
