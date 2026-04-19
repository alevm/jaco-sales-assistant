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
COPY --from=builder /app/data ./data

# The @anthropic-ai/claude-agent-sdk package resolves its native CLI binary via a
# dynamic require of a platform-specific sibling (`@anthropic-ai/claude-agent-sdk-<plat>`).
# Next.js's standalone tracer misses that dynamic require, so the sibling is not
# emitted into .next/standalone/node_modules/. Copy it explicitly. This path
# assumes the Alpine (musl) base image — if the runner base changes, update here.
COPY --from=builder /app/node_modules/@anthropic-ai/claude-agent-sdk-linux-x64-musl ./node_modules/@anthropic-ai/claude-agent-sdk-linux-x64-musl

# Ensure uploads and data dirs are writable
RUN mkdir -p public/uploads data && chown -R nextjs:nodejs public/uploads data

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
