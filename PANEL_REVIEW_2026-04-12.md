# 24-Role Expert Panel Review (DELTA)
**Date:** 2026-04-12 | **Baseline:** ARCHITECT_REVIEW_2026-04-11.md | **Scope:** Commercial product (pre-launch)

---

## Blocking Fix Verification

| # | Issue | Baseline | Status | Evidence |
|---|-------|----------|--------|----------|
| 1 | Path traversal `/api/recognize` | CRITICAL | **FIXED** | `src/lib/recognize.ts:41-51` — `validateImagePath()` rejects `..`, enforces `startsWith(UPLOADS_ROOT)`. Route handler (`src/app/api/recognize/route.ts:14-18`) catches and returns 400. |
| 2 | Stored XSS via upload extension | CRITICAL | **FIXED** | `src/lib/upload.ts:13,19` — `ALLOWED_EXTENSIONS` allowlist (`.jpg/.jpeg/.png/.webp`), rejects all others with thrown error. |
| 3 | Fake test suite → real tests | CRITICAL | **FIXED (partial)** | Old `test_jaco.py` grep-based suite replaced by 3 vitest files: `recognize.test.ts` (5 tests), `upload.test.ts` (7 tests), `margin.test.ts` (6 tests). 18 runtime tests, all passing. **BUT:** `conftest.py` still present (dead file), `test_jaco.py` removed (good), `README.md:47,56` still claims "192 QA tests" — **stale and misleading**. Coverage is security-focused (path traversal, XSS, margin math) which is correct priority but no API route integration tests, no Claude mock tests, no describe/suggest-price coverage. |

---

## Panel Verdicts (delta from baseline — unchanged findings omitted)

### PM
**Verdict: CONCERNING → CONCERNING (no change)**
- `README.md:17` still says `cp .env.local.example .env.local` — file is `.env.example`. **Unfixed.** `README.md:17`
- `README.md:47,56` still claims "192 tests" — now 18 vitest tests. **Stale claim.** `README.md:47`
- `CLAUDE.md` now exists with PM role section and NO-GO checklist. **Improvement.** `CLAUDE.md:25-29`
- from: architect (PM)

### DEV
**Verdict: CRITICAL → CONCERNING (improved)**
- Path traversal and XSS fixed (see verification table).
- `src/lib/suggest-price.ts:68` — `JSON.parse(cleaned)` still has no try/catch. Malformed Claude response = unhandled 500. `suggest-price.ts:68`
- `src/lib/describe.ts:208` — raw Claude text returned with no length cap or sanitization. **Unfixed.** `describe.ts:208`
- `src/lib/claude.ts:5-11` — still no timeout, no AbortController, no retry. Hanging Claude call pins worker. **Unfixed.** `claude.ts:5-11`
- `src/lib/upload.ts:31-36` — `deleteUpload()` does `path.resolve("public", relativePath)` with no path traversal guard. Attacker with PUT access could delete arbitrary files via crafted `image_paths`. **NEW finding.** `upload.ts:31-36`
- No zod validation anywhere. **Unfixed.**
- from: architect (DEV)

### Cybersecurity
**Verdict: CRITICAL → CONCERNING (improved)**
- Path traversal: **FIXED.** Regex + startsWith guard. `recognize.ts:41-51`
- Stored XSS: **FIXED.** Extension allowlist. `upload.ts:13,19`
- No rate limiting on LLM endpoints: **Unfixed.** `middleware.ts` auth-only. `middleware.ts:1-31`
- No CSP headers: **Unfixed.** `next.config.ts:1-7` — bare config, no `headers()`.
- Prompt injection: **Unfixed.** `describe.ts:184-193` inlines untrusted recognition fields.
- `deleteUpload` path traversal: **NEW.** `upload.ts:31-36` — same class of bug that was fixed in recognize. No `startsWith` guard.
- from: architect (Cybersecurity)

### QA
**Verdict: CRITICAL → CONCERNING (improved)**
- Old pytest grep suite replaced with vitest runtime tests. 18 tests, all pass (321ms). **Major improvement.**
- `conftest.py` orphaned — dead file, should be removed. `tests/conftest.py`
- No test coverage for: `describe.ts`, `suggest-price.ts`, `claude.ts`, any API route handler, DB operations. **Gap.**
- No Claude mock infrastructure — all LLM-touching code untestable without network. **Gap.**
- from: architect (QA)

### SRE
**Verdict: CRITICAL → CRITICAL (no change)**
- No `Dockerfile`. **Unfixed.** Handoff blocker.
- No `validate.sh`. **Unfixed.** Handoff blocker.
- No `/api/health` endpoint. **Unfixed.**
- No structured logging. **Unfixed.** `claude.ts` has zero instrumentation.
- No rate limiting. **Unfixed.**
- No graceful shutdown / SIGTERM handling for SQLite. **Unfixed.** `db.ts:5-23`
- from: architect (SRE)

### GDPR
**Verdict: CONCERNING**
- Umami analytics loaded in `layout.tsx:14` — third-party script (`analytics.levm.eu`). No cookie banner, no consent mechanism, no privacy policy. If Umami is configured with cookies, this violates GDPR Art. 7 (consent) for EU users. `src/app/layout.tsx:14`
- User-uploaded garment images stored on local filesystem with no retention policy, no deletion workflow beyond item delete. If images contain faces/personal data, no data subject access/erasure procedure exists.
- No DPA (Data Processing Agreement) with Anthropic documented for image data sent to Claude API.
- from: architect (GDPR)

### Marketing
**Verdict: N/A → CONCERNING**
- Baseline dismissed this as "internal tool" — but this is a **sales assistant** for a commercial vintage reselling business. Positioning matters.
- No value proposition statement anywhere user-facing. The tool generates marketplace listings but has no branding for the operator's business.
- Competitive landscape undocumented: Vendoo ($20-50/mo), Crosslist ($30/mo), List Perfectly ($25-50/mo) all do multi-platform listing. Jaco's differentiator is AI recognition + era-specific copy — this should be stated explicitly.
- No pricing model for potential SaaS pivot. Claude API cost per item (~$0.02-0.05 recognition + $0.01 description) means margin is healthy at any price point above $5/mo.
- from: architect (Marketing)

### Financial
**Verdict: CONCERNING**
- Fee model in `marketplace-fees.ts` is flat-rate approximation. eBay fees vary by category (clothing = 12.9% not 13%), seller tier, and country. Vestiaire uses tiered fees (15-25% depending on price bracket). Margin calculations will be systematically wrong. `src/lib/marketplace-fees.ts:11-53`
- Money stored as floating-point REAL (per baseline DBA finding). Rounding errors compound across inventory. **Unfixed.**
- No tax handling. Italian vintage resellers above threshold need IVA tracking. Not MVP-blocking but needs roadmap entry.
- from: architect (Financial)

### Solution Architect
**Verdict: OK → OK (no change)**
- Architecture remains appropriate for single-tenant MVP. No structural regressions.
- Multi-marketplace prompts in `describe.ts` (7 platforms) now match `marketplace-fees.ts` (7 platforms) and the `Marketplace` type. Scope creep concern from baseline is **resolved** — all 7 are intentional.
- from: architect (Solution Architect)

---

## Dual Grade

| Dimension | Grade | Rationale |
|-----------|-------|-----------|
| **Security** | **C-** | Two CRITs fixed. New `deleteUpload` path traversal found. No rate limiting, no CSP, no prompt-injection guard. Deployable behind VPN with single trusted operator; not safe for public exposure. |
| **Product readiness** | **D+** | No Dockerfile, no validate.sh, no health endpoint. README stale. 18 real tests (up from 0) but major gaps. GDPR non-compliant (analytics without consent). |

**Combined: C-/D+** (was D+ overall)

---

## Top 5 Risk Score

| Rank | Risk | Likelihood | Impact | Score | File:Line |
|------|------|:---:|:---:|:---:|-----------|
| 1 | No Dockerfile/validate.sh — cannot deploy | Certain | Blocker | **10** | (missing files) |
| 2 | `deleteUpload` path traversal — arbitrary file deletion | Medium | High | **7** | `src/lib/upload.ts:31-36` |
| 3 | No rate limiting — leaked token = unbounded Claude spend | Medium | High | **7** | `src/middleware.ts` |
| 4 | No try/catch on Claude calls — unhandled 500s crash workers | High | Medium | **6** | `src/lib/suggest-price.ts:68`, `src/lib/recognize.ts:97` |
| 5 | Umami analytics without GDPR consent | High | Medium | **6** | `src/app/layout.tsx:14` |

---

## Tickets (max 10)

| # | Priority | Title | Owner | Est. | Ref |
|---|----------|-------|-------|------|-----|
| 1 | P0 | Write `Dockerfile` (multi-stage, standalone output, non-root) | pm-jaco | 30 min | SRE |
| 2 | P0 | Write `validate.sh` (build + lint + vitest + type-check) | pm-jaco | 15 min | SRE |
| 3 | P0 | Fix `deleteUpload` path traversal — add `startsWith(UPLOAD_DIR)` guard | pm-jaco | 10 min | Cybersecurity |
| 4 | P0 | Add `/api/health` endpoint (SELECT 1 + exempt from auth) | pm-jaco | 15 min | SRE |
| 5 | P1 | Wrap all Claude calls in try/catch + AbortController (20s timeout) | pm-jaco | 20 min | DEV |
| 6 | P1 | Add per-token rate limiter on LLM endpoints (20/min) | pm-jaco | 30 min | Cybersecurity |
| 7 | P1 | Fix `README.md` — `.env.local.example` → `.env.example`, "192 tests" → "18 vitest tests" | pm-jaco | 5 min | PM |
| 8 | P1 | Add GDPR consent for Umami analytics or switch to cookieless mode | pm-jaco | 20 min | GDPR |
| 9 | P2 | Add structured logging (pino) for Claude calls — model, tokens, latency | pm-jaco | 30 min | SRE |
| 10 | P2 | Add CSP + security headers in `next.config.ts` | pm-jaco | 15 min | Cybersecurity |

---

**Go/No-Go: NO-GO** (unchanged). Tickets 1-4 are deploy blockers. Estimated total to reach GO: **2-3 agent-hours**.

-- Architect, 2026-04-12
