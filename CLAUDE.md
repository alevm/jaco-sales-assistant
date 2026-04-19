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

## Claude auth adapter

`src/lib/claude.ts` exposes `callClaude(params)` with a single call signature (Anthropic.Message-compatible) and reads the `CLAUDE_AUTH_MODE` env var at request time to pick a backend:

- `subscription` (default when unset) → `@anthropic-ai/claude-agent-sdk` with `CLAUDE_CODE_OAUTH_TOKEN`. Billed under the Claude Max subscription Andrea already pays for.
- `api` → `@anthropic-ai/sdk` with `ANTHROPIC_API_KEY`. Billed under prepaid API credits (a separate pot — do not use as the default).
- Any other value throws a clear error.

Flip modes by changing the env var and redeploying — no code change required. Both SDKs are in `dependencies` so either path works at runtime. Rationale: see `~/Current/Sisyphus/docs/decisions/20260418-ai-integration-switchable.md`.

## Persistence model

Everything that must survive a `docker compose up --force-recreate` lives under `/data`, which compose mounts as the named volume `jaco-data`. Everything under `/app` is rebuilt from the image on every deploy.

- `DB_PATH=/data/vintage.db` — SQLite file + its `-wal` / `-shm` sidecars.
- `UPLOADS_DIR=/data/uploads` — user-uploaded photos.
- `/app/data/migrations/` ships in the image (read-only SQL files, applied on first boot against the mounted DB).

Both env vars have a local-dev fallback (`./data/vintage.db`, `./public/uploads`) so `npm run dev` and `npm test` work unchanged. The Dockerfile sets them explicitly for production. The public URL for photos is still `/uploads/<uuid>.<ext>`; `src/app/uploads/[filename]/route.ts` streams the file from `UPLOADS_DIR` because `public/uploads/` no longer holds user content in the image.

## Deployment notes

Next.js `output: "standalone"` uses node-file-trace to bundle only modules it judges reachable. The Anthropic SDKs (`@anthropic-ai/claude-agent-sdk`, `@anthropic-ai/sdk`) — one loaded via dynamic import in `src/lib/claude.ts`, one statically imported — must be listed in `serverExternalPackages` in `next.config.ts` so they're emitted to `.next/standalone/node_modules/`. A future refactor that drops them from that array will silently break `/api/recognize`, `/api/describe`, `/api/suggest-price`, and `/api/batch-upload` at runtime in the Docker image.

The `runner` stage of the `Dockerfile` explicitly copies `@anthropic-ai/claude-agent-sdk-linux-x64-musl` from the builder, because the claude-agent-sdk resolves its native CLI binary via a dynamic `require("@anthropic-ai/claude-agent-sdk-" + platform)` that the standalone tracer misses. This path is tied to the `node:20-alpine` (musl) runner base — if the base image changes, update the COPY to the matching platform package (e.g. `-linux-x64` for glibc).

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

## Feedback loop (2026-04-19)

Jacopo submits feedback at `/feedback`; pm-jaco-sales-assistant replies via a bus-response-sync daemon (architect-owned, laptop-side — wired separately) that PATCHes `/api/feedback/:id` whenever a bus ticket for a feedback item is closed. The UI surfaces the reply back to Jacopo — closed loop without email.

Schema (migration `005_feedback_pm_response.sql`):

- `status` enum: `new` (default) / `under_review` / `accepted` / `declined` / `done` / `needs_info`. Legacy rows with `status='open'` were migrated to `'new'` in-place.
- `pm_response` TEXT nullable — plaintext, rendered as-is in the UI (no markdown parser).
- `pm_responded_at` TEXT nullable — ISO timestamp, auto-set whenever `pm_response` actually changes (not when only `status` changes).

Endpoints:

- `GET /api/feedback` — returns all rows including the three new fields.
- `POST /api/feedback` — unchanged body (`title`, `description`, `priority`); new rows get `status='new'` and `pm_response=null`.
- `PATCH /api/feedback/:id` — auth-guarded by the same middleware as every other `/api` route (Authelia or Bearer `API_SECRET`). Body: `{status?, pm_response?}` — zod-validated, at least one required. Returns the full updated row; `404` if id missing, `400` on validation/id-format error.

UI (`/feedback`): status chip next to the priority chip, and `pm_response` rendered under the description as "Risposta del team" when non-null (silent otherwise).

Remaining P2 items (prompt injection, float money, fee accuracy, structured logging, SIGTERM) are acceptable at A- for single-tenant MVP behind auth.

## Recognize pipeline: brand + price fields (2026-04-19)

`/api/recognize` now returns three extra fields alongside the existing ones so Jacopo can actually publish a listing without hand-filling brand/price:

- `brand_confidence` (0.0–1.0) — how sure Claude is about `brand`. Populated whenever `brand` is a non-null string.
- `brand_hints` (string or null) — set when `brand` is null, describing what the model sees on labels/tags so the user can zoom or re-shoot. Null when brand is populated.
- `price_suggestion_eur` — `{low, mid, high}` EUR figures for the European second-hand market (Vinted IT / Depop / Wallapop / eBay / Vestiaire). Always present.

Prompt changes (`src/lib/recognize.ts`) discourage `brand: null` — a low-confidence guess is preferred over null. Prompt includes two worked examples and a brand-recognition primer weighted to Italian/European market brands (Carhartt, Stone Island, Fila, Kappa, Ellesse, Levi's, Fiorucci, etc.). `max_tokens` bumped to 1536 to fit the longer response.

Draft flow (`src/app/api/batch-upload/route.ts`, `src/app/items/new/page.tsx`) now defaults `sale_price = price_suggestion_eur.mid` so the generated listing has a non-null starting price. User can override before listing. `recognize.ts` is downstream of `RecognitionResult` in `src/types/item.ts` — the three new fields are optional on the type so existing callers (describe, suggest-price, mocks) stay backward-compatible.

See `PANEL_REVIEW_A_MINUS.md` for full gap analysis and `ARCHITECT_REVIEW_2026-04-11.md` for original findings.
