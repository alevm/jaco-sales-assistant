/**
 * In-memory sliding-window rate limiter.
 * 20 requests per 60 seconds per token (API_SECRET bearer).
 */

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;

interface Entry {
  timestamps: number[];
}

const store = new Map<string, Entry>();

/**
 * Check if a request is allowed under the rate limit.
 * Returns { allowed: true } or { allowed: false, retryAfterMs }.
 */
export function checkRateLimit(key: string): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  let entry = store.get(key);

  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Evict timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => now - t < WINDOW_MS);

  if (entry.timestamps.length >= MAX_REQUESTS) {
    const oldest = entry.timestamps[0];
    const retryAfterMs = WINDOW_MS - (now - oldest);
    return { allowed: false, retryAfterMs };
  }

  entry.timestamps.push(now);
  return { allowed: true };
}

/** LLM endpoint paths that should be rate-limited */
export const LLM_PATHS = [
  "/api/recognize",
  "/api/items/", // matches /api/items/[id]/description and /api/items/[id]/suggest-price
];

/** Check if a pathname is an LLM endpoint */
export function isLLMEndpoint(pathname: string): boolean {
  if (pathname === "/api/recognize") return true;
  if (pathname.endsWith("/description") || pathname.endsWith("/suggest-price")) return true;
  return false;
}
