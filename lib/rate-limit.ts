/**
 * Fixed-window rate limiter held in process memory.
 *
 * Deliberately simple: this is one Node process in the assignment's scope. A
 * multi-instance deployment would move this to Redis or a `RateLimit` table —
 * recorded as a known limitation in ADR 0008.
 */
type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();
const MAX_KEYS = 10_000;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

export function rateLimit(
  key: string,
  { limit = 10, windowMs = 60_000 } = {},
): RateLimitResult {
  const now = Date.now();
  const existing = windows.get(key);

  if (!existing || existing.resetAt <= now) {
    // Cheap eviction: the map only grows until it hits the cap, then we drop
    // everything already expired.
    if (windows.size >= MAX_KEYS) {
      for (const [k, w] of windows) if (w.resetAt <= now) windows.delete(k);
    }
    const window: Window = { count: 1, resetAt: now + windowMs };
    windows.set(key, window);
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: window.resetAt,
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    };
  }

  existing.count += 1;
  const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));

  return {
    allowed: existing.count <= limit,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
    retryAfterSeconds,
  };
}

/** Test helper — the limiter is module state, so suites must be able to reset it. */
export function resetRateLimits() {
  windows.clear();
}
