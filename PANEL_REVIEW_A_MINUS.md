# Gap Analysis: D+ to A-
**Date:** 2026-04-12 | **Baseline:** PANEL_REVIEW_2026-04-12.md | **Target:** A-

---

## Verified FIXED since baseline

| Item | Evidence |
|------|----------|
| Path traversal `/api/recognize` | `recognize.ts:41-51` — rejects `..`, enforces `startsWith(UPLOADS_ROOT)` |
| Stored XSS via upload extension | `upload.ts:13,19` — allowlist `.jpg/.jpeg/.png/.webp` |
| `deleteUpload` path traversal | `upload.ts:31-35` — `startsWith(UPLOAD_DIR + path.sep)` guard |
| Real test suite | 21 vitest tests passing (recognize, upload, margin) |
| Dockerfile | Multi-stage, standalone output, non-root user, correct |
| validate.sh | tsc + lint + test + build, executable |
| `/api/health` | SELECT 1 + 503 on failure, exempt from auth in middleware |

---

## STILL MISSING for A- (18 items, 7 tickets)

### Cybersecurity (current: C-)

| # | Gap | Severity | File:Line |
|---|-----|----------|-----------|
| C1 | No try/catch on `JSON.parse` of Claude response — malformed response = unhandled 500 | P0 | `suggest-price.ts:68`, `recognize.ts:97` |
| C2 | No timeout/AbortController on Claude API calls — hanging call pins worker indefinitely | P1 | `claude.ts:5-11` |
| C3 | No rate limiting on LLM endpoints — leaked token = unbounded Claude spend | P1 | `middleware.ts` |
| C4 | No CSP/security headers — XSS surface if any user-generated content rendered | P1 | `next.config.ts:1-7` |
| C5 | Prompt injection — `describe.ts:184-193` inlines untrusted recognition fields into system prompt | P2 | `describe.ts:184-193` |
| C6 | Umami analytics loaded without GDPR consent mechanism | P1 | `layout.tsx:14` |

### QA (current: C-)

| # | Gap | Severity | File:Line |
|---|-----|----------|-----------|
| Q1 | 21 tests cover only 3 modules (recognize, upload, margin). Zero coverage for: `describe.ts`, `suggest-price.ts`, `claude.ts`, all 10 API route handlers, `db.ts` | P1 | `tests/` |
| Q2 | No Claude mock infrastructure — all LLM code untestable without network calls | P1 | (missing) |
| Q3 | `conftest.py` + `__pycache__/` orphaned dead files from old pytest suite | P2 | `tests/conftest.py` |
| Q4 | README says "18 vitest tests" — actual count is 21 | P2 | `README.md:58` |

### Marketing

| # | Gap | Severity |
|---|-----|----------|
| M1 | No positioning brief: differentiator (AI recognition + era-specific copy) vs Vendoo/Crosslist/ListPerfectly undocumented | P2 |

### Financial

| # | Gap | Severity | File:Line |
|---|-----|----------|-----------|
| F1 | eBay fee hardcoded at 13% — actual clothing category is 12.9%, varies by seller tier/country | P2 | `marketplace-fees.ts:19` |
| F2 | Vestiaire fee hardcoded at 15% — actual range is 15-25% tiered by price bracket | P2 | `marketplace-fees.ts:30` |
| F3 | Money stored as REAL (float) — rounding errors compound across inventory | P2 | schema |

### DEV

| # | Gap | Severity | File:Line |
|---|-----|----------|-----------|
| D1 | No input validation (zod) on any API route — raw `request.json()` trusted everywhere | P1 | all route.ts files |
| D2 | `describe.ts:208` returns raw Claude text with no length cap or sanitization | P2 | `describe.ts:208` |

### SRE

| # | Gap | Severity | File:Line |
|---|-----|----------|-----------|
| S1 | No structured logging — `claude.ts` has zero instrumentation (model, tokens, latency) | P2 | `claude.ts` |
| S2 | No graceful shutdown / SIGTERM handler for SQLite WAL | P2 | `db.ts:5-23` |

---

## Tickets to pm-jaco (7 tickets, est. 3.5 agent-hours total to A-)

### Ticket 1: Harden Claude call sites (P0, 25 min)
**What:** Wrap all `JSON.parse(cleaned)` calls in try/catch with descriptive error. Add AbortController with 30s timeout to all `claude.messages.create()` calls.
**Files:** `suggest-price.ts:68`, `recognize.ts:97`, `describe.ts:195`, `claude.ts`
**acceptance_checks:**
- [ ] `JSON.parse` wrapped in try/catch in `suggest-price.ts` and `recognize.ts`
- [ ] AbortController with timeout on every Claude call
- [ ] New test: malformed JSON response returns 500 with message, not unhandled crash
- [ ] `npm test` passes

### Ticket 2: Add rate limiting to LLM endpoints (P1, 30 min)
**What:** Add in-memory sliding-window rate limiter (20 req/min per token) to `/api/recognize`, `/api/items/[id]/description`, `/api/items/[id]/suggest-price`. Can be middleware-level or per-route.
**Files:** `middleware.ts` or new `src/lib/rate-limit.ts`
**acceptance_checks:**
- [ ] 21st request within 60s returns 429
- [ ] Non-LLM endpoints unaffected
- [ ] Health endpoint unaffected
- [ ] Test covering rate limit behavior

### Ticket 3: Add CSP + security headers + fix GDPR (P1, 20 min)
**What:** Add `headers()` to `next.config.ts` with CSP, X-Frame-Options, X-Content-Type-Options. For GDPR: either switch Umami to cookieless mode (`data-do-not-track="true"`) or remove the script entirely. Cookieless mode is the recommendation (keeps analytics, no consent needed).
**Files:** `next.config.ts`, `layout.tsx:14`
**acceptance_checks:**
- [ ] `curl -I localhost:3000` shows CSP, X-Frame-Options, X-Content-Type-Options headers
- [ ] Umami script has `data-do-not-track="true"` or is removed
- [ ] App still renders correctly

### Ticket 4: Add Claude mock + test describe/suggest-price (P1, 40 min)
**What:** Create a mock for `getClaude()` that returns canned responses. Add tests for `describe.ts` (returns string, handles error), `suggest-price.ts` (returns valid PriceSuggestion, handles malformed JSON). Target: 30+ total tests.
**Files:** new `tests/helpers/claude-mock.ts`, new `tests/describe.test.ts`, new `tests/suggest-price.test.ts`
**acceptance_checks:**
- [ ] Mock intercepts `getClaude()` — no network calls in tests
- [ ] `describe.test.ts` has >= 3 tests (happy path, error, length)
- [ ] `suggest-price.test.ts` has >= 3 tests (happy path, malformed JSON, missing fields)
- [ ] Total test count >= 30
- [ ] `npm test` passes

### Ticket 5: Add zod validation to API routes (P1, 45 min)
**What:** Install zod. Add request body validation schemas for POST/PUT routes: `/api/upload`, `/api/recognize`, `/api/items`, `/api/items/[id]`, `/api/lots`, `/api/lots/[id]`. Return 400 with validation errors on invalid input.
**Files:** new `src/lib/schemas.ts`, all `route.ts` files
**acceptance_checks:**
- [ ] `zod` in package.json dependencies
- [ ] Every POST/PUT route validates body with zod schema
- [ ] Invalid body returns 400 with `{ error: "..." }` describing the validation failure
- [ ] Test covering at least one route's validation rejection

### Ticket 6: Cleanup + README accuracy (P0, 10 min)
**What:** Delete `tests/conftest.py` and `tests/__pycache__/`. Update README test count from "18" to actual count. Add `/api/health` to the API routes table.
**Files:** `tests/conftest.py`, `tests/__pycache__/`, `README.md`
**acceptance_checks:**
- [ ] `tests/conftest.py` deleted
- [ ] `tests/__pycache__/` deleted
- [ ] README test count matches `npm test` output
- [ ] `/api/health` listed in API routes table
- [ ] `npm test` still passes

### Ticket 7: Write positioning brief (P2, 15 min)
**What:** Create `docs/POSITIONING.md` with: one-liner value prop, target user (vintage resellers doing 20-200 items/month), differentiator vs Vendoo/Crosslist/ListPerfectly (AI recognition + era-specific copy + margin tracking, not just cross-listing), API cost model (~$0.03-0.06/item, healthy margin at any SaaS price > $5/mo).
**Files:** new `docs/POSITIONING.md`
**acceptance_checks:**
- [ ] File exists with value prop, target user, competitive diff, unit economics
- [ ] Referenced from README.md (one-line link)

---

## Grading projection after all 7 tickets

| Dimension | Current | Projected |
|-----------|---------|-----------|
| Security | C- | B+ (rate limit + CSP + hardened calls; prompt injection remains P2 risk) |
| Product readiness | D+ | A- (Dockerfile, validate.sh, health, 30+ tests, accurate docs, positioning) |
| **Combined** | **C-/D+** | **B+/A-** |

Remaining P2 items (prompt injection, float money, fee accuracy, structured logging, SIGTERM) are acceptable at A- for a single-tenant MVP behind auth. They become blockers at A or for multi-tenant.

---

**Go/No-Go after tickets 1-6: CONDITIONAL GO** (single trusted operator, behind VPN/basic_auth).
**Go/No-Go after all 7: GO** for MVP launch.

-- Architect, 2026-04-12
