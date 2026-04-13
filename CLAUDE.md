> **Role.** If you're a Claude Code session that started in this directory, **you are `pm-jaco-sales-assistant`** — the Project Manager agent for this project, and only for this project. Your full role contract is in `~/Current/Sisyphus/bus/personas/pm.md` (read it now if you haven't this session). The technical contract for this specific project is the rest of *this* file.
>
> **Session-start ritual:**
> ```bash
> pwd                                                     # confirm you're in the project dir
> ls -1 ~/Current/.bus/tickets/to_pm-jaco-sales-assistant/ 2>/dev/null # any open work?
> ```
> If a ticket is open, address it before doing anything spontaneous. See `~/Current/Sisyphus/bus/protocol.md` for the protocol (also reachable as `~/Current/.bus/README.md` via symlink).
>
> **Hard role boundaries:** you may edit/build/test/commit/push **only** files inside this project's directory. You may not touch `~/Current/Sisyphus/`, any other project, or the VPS. If you need any of those, write a ticket to `operator` or `architect` in `~/Current/.bus/tickets/to_<role>/`. The full forbidden-moves list is in `~/Current/Sisyphus/bus/personas/pm.md`.

---

# VintageAgent — AI Sales Assistant

AI-powered sales assistant for vintage clothing (Jacopo's business). Supports: image recognition, auto-tagging, description generation, COGS tracking, margin calculation, multi-platform listing.

## Stack

Next.js 14+ (App Router, TypeScript), Claude API (Vision + text), SQLite (better-sqlite3), Tailwind CSS.

## Critical notes (from 2026-04-12 panel review)

**Status: CONDITIONAL GO** (single trusted operator, behind VPN/basic_auth).

Completed:
- [x] Fix path traversal in `src/lib/recognize.ts:42` (CRITICAL) — fixed
- [x] Fix stored XSS in `src/lib/upload.ts:16` (CRITICAL) — fixed
- [x] Fix path traversal in `deleteUpload` (`src/lib/upload.ts:31-36`) — fixed
- [x] Replace fake test suite — 55 vitest tests now
- [x] Write `Dockerfile` and `validate.sh` per Sisyphus onboarding guide
- [x] Add `/api/health` endpoint
- [x] Harden Claude call sites (try/catch JSON.parse, 30s AbortController timeout)
- [x] Add rate limiting on LLM endpoints (20 req/min per token)
- [x] Add CSP + security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
- [x] Fix GDPR: Umami cookieless mode (`data-do-not-track="true"`)
- [x] Add zod validation on all POST/PUT API routes
- [x] Add Claude mock infrastructure + tests for describe/suggest-price
- [x] Cleanup dead files (conftest.py, __pycache__)
- [x] README accuracy (test count, /api/health in routes table)
- [x] Marketing positioning brief (`docs/POSITIONING.md`)
- [x] Description output length cap (2000 chars)

New feature endpoints (T3):
- [x] `POST /api/batch-upload` — upload up to 50 photos, AI recognizes each, creates draft items
- [x] `GET /api/items/export?format=csv|json&status=listed` — export listings for Vinted/Depop cross-posting
- [x] `POST /api/items/:id/sell` — mark sold with price, returns margin report (COGS, fees, net)
- [x] `GET /api/items/duplicates?item_id=x` — flag similar items by type/brand/color/era/size scoring

T3 Feature additions:
- [x] `GET /api/items/:id/listing?platform=X` — generate platform-specific formatted listing (title, description, hashtags, category, price)
- [x] `POST /api/items/:id/listing` — mark item as listed on a platform, track in `listed_platforms` column
- [x] `DELETE /api/items/:id/listing?platform=X` — remove listing from platform tracking
- [x] Platforms: Vinted IT, Depop, Wallapop, eBay (structured specifics), Vestiaire Collective
- [x] "Pubblica" tab on item detail page — generate, copy-paste, and track listings per platform
- [x] `GET /api/dashboard/trends?months=N` — price trend analysis: avg price by category/month, platform performance, margin trends, brand ranking
- [x] SVG line charts on dashboard (no chart library): rolling avg price, margin trend, category comparison
- [x] Platform performance table + top brand table on dashboard

Remaining P2 items (prompt injection, float money, fee accuracy, structured logging, SIGTERM) are acceptable at A- for single-tenant MVP behind auth.

See `PANEL_REVIEW_A_MINUS.md` for full gap analysis and `ARCHITECT_REVIEW_2026-04-11.md` for original findings.
