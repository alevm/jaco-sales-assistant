# Sisyphus Deployment Rules

> **What is this file?** This defines how this project is deployed on [Sisyphus](https://sisyphus.levm.eu), the hosting platform. It is read automatically by Claude Code (AI coding assistant) to enforce deployment constraints. Humans: read the rules below — they apply to you too.

This project is a **Next.js 15 full-stack app** deployed on Sisyphus. These rules apply when creating, editing, or reviewing code.

## Deployment Target

- **Platform:** Containerized Next.js on Flatcar Container Linux
- **Runtime:** Node.js with Next.js server (SSR + API routes)
- **HTTPS:** Automatic (Let's Encrypt) — never handle TLS in application code
- **Monitoring:** SRE agent with health checks every 60s, auto-restart, Telegram alerts
- **Health check:** `GET /` must return HTTP 200
- **Database:** SQLite (better-sqlite3) — file-based, stored at `DB_PATH`

## Hard Rules — deployment fails without these

1. `next build` MUST succeed without errors
2. ALL environment variables required at runtime MUST be set in `.env.local` on the VPS
3. NO secrets in code or git history — use environment variables
4. NO sensitive files committed: `.env.local`, `*.key`, `*.pem`, `*.p12`, `credentials.*`, `*secret*`
5. ALL `/api/*` routes MUST be protected by authentication middleware (`API_SECRET` Bearer token)
6. `node_modules/` and `.next/` MUST be gitignored — never commit build artifacts or dependencies

## Security Rules

- NEVER hardcode API keys, tokens, passwords, or connection strings
- NEVER commit sensitive files (see rule 4 above)
- ALL API routes require `Authorization: Bearer <API_SECRET>` header — enforced by `src/middleware.ts`
- Validate and sanitize all user input (request bodies, query parameters, URL segments)
- SQL queries MUST use parameterized statements (already enforced via better-sqlite3)

## Environment Variables

| Variable | Required | Description |
|----------|:---:|-------------|
| `ANTHROPIC_API_KEY` | Yes | Claude API key for image recognition and descriptions |
| `API_SECRET` | Yes | Bearer token for API route authentication |
| `DB_PATH` | No | SQLite database path (default: `./data/vintage.db`) |

## Git Conventions

- Commit messages: imperative mood, under 72 characters (e.g., "Add auth middleware", "Fix margin calculation")
- Commit frequently — small, focused commits
- `main` is the deployment branch — push to `main` to deploy
- NEVER force-push to `main`
- NEVER commit generated files, build artifacts, or dependencies

## What NOT to Do

- Do NOT commit `node_modules/`, `.next/`, or `data/*.db`
- Do NOT add analytics or tracking without explicit user request
- Do NOT create Docker or CI/CD configuration — Sisyphus handles this
- Do NOT handle TLS/SSL — Caddy provides automatic HTTPS

## Quality Assurance — Before Handover

Every project MUST include tests that validate quality before deployment.

| Category | What to test | Required |
|----------|-------------|:---:|
| **Regression tests** | All pages render, all API endpoints respond correctly | Yes |
| **Unit tests** | Individual functions, components, modules | Yes |
| **Security tests** | Auth middleware, injection, secrets exposure | Yes |
| **Accessibility tests** | WCAG AA, keyboard navigation, screen readers | Yes |
| **Performance tests** | Page load < 3s, API response times reasonable | Yes |

Tests must be runnable with a single command, documented in README under `## Testing`.

## Sisyphus Platform

- **Docs:** https://sisyphus.levm.eu — architecture, SLOs, incident API, deploy flow
- **SRE agent:** https://sisyphus.levm.eu/sre-agent.html — monitoring, incident lifecycle, troubleshooting
- **Your dashboard:** see `.sisyphus-token` in project root (created during onboarding, gitignored)
- **Report incidents:** `curl -X POST "https://sisyphus.levm.eu/api/incidents/<project>?token=<token>" -H "Content-Type: application/json" -d '{"type":"error_spike","description":"..."}'`
- **Check deployed version:** `curl -s https://sisyphus.levm.eu/api/status | jq '.projects[] | select(.id=="<project>")'`
