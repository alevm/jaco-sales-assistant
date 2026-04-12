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

**This project is NO-GO for deploy.** Before any deploy handoff:
- [ ] Fix path traversal in `src/lib/recognize.ts:42` (CRITICAL)
- [ ] Fix stored XSS in `src/lib/upload.ts:16` (CRITICAL)
- [ ] Replace fake test suite (`tests/test_jaco.py` is regex grep, not runtime tests)
- [ ] Write `Dockerfile` and `validate.sh` per Sisyphus onboarding guide
- [ ] Marketing positioning brief

See `ARCHITECT_REVIEW_2026-04-11.md` for full findings.
