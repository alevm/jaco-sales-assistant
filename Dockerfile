FROM node:20-alpine AS base

# Stage 1: Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Production
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# Ship migration SQL files only — the DB file lives on the /data volume (see below).
COPY --from=builder /app/data/migrations ./data/migrations

# The @anthropic-ai/claude-agent-sdk package resolves its native CLI binary via a
# dynamic require of a platform-specific sibling (`@anthropic-ai/claude-agent-sdk-<plat>`).
# Next.js's standalone tracer misses that dynamic require, so the sibling is not
# emitted into .next/standalone/node_modules/. Copy it explicitly. This path
# assumes the Alpine (musl) base image — if the runner base changes, update here.
COPY --from=builder /app/node_modules/@anthropic-ai/claude-agent-sdk-linux-x64-musl ./node_modules/@anthropic-ai/claude-agent-sdk-linux-x64-musl

# Persistence paths — both live on the jaco-data volume mounted at /data.
# Without these, every `docker compose up --force-recreate` wipes inventory/feedback/uploads.
ENV DB_PATH=/data/vintage.db
ENV UPLOADS_DIR=/data/uploads

RUN mkdir -p /data /data/uploads && chown -R nextjs:nodejs /data

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
