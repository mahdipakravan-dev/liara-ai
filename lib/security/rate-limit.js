/**
 * Fixed-window rate limiting.
 *
 * ┌─ PRODUCTION NOTE ──────────────────────────────────────────────────────┐
 * │ The default store is a Map in the Node process. That is correct for a  │
 * │ single dev server and wrong for anything else: every serverless        │
 * │ instance or replica gets its own counter, so the effective limit is    │
 * │ `limit × instances`, and the counters reset on deploy.                 │
 * │                                                                        │
 * │ To move to Redis, implement the three-method `store` interface below   │
 * │ and pass it to `createRateLimiter`. Nothing else changes. A Redis      │
 * │ version should use INCR with EXPIRE on the window key, which is atomic │
 * │ and needs no sweeping:                                                 │
 * │                                                                        │
 * │   const count = await redis.incr(key);                                 │
 * │   if (count === 1) await redis.pexpire(key, windowMs);                 │
 * │                                                                        │
 * │ Also consider moving the limit to the edge (Liara/CDN/WAF) so abusive  │
 * │ traffic never reaches the Node process at all.                         │
 * └────────────────────────────────────────────────────────────────────────┘
 */

export const DEFAULT_LIMIT = 20;
export const DEFAULT_WINDOW_MS = 60_000;

/**
 * @typedef {object} RateLimitStore
 * @property {(key: string) => {count: number, resetAt: number} | undefined} get
 * @property {(key: string, entry: {count: number, resetAt: number}) => void} set
 * @property {(now: number) => void} sweep  Drop expired windows.
 */

/** In-process store. Swap for Redis in production — see the note above. */
export function createMemoryStore() {
  const windows = new Map();

  return {
    get: (key) => windows.get(key),
    set: (key, entry) => windows.set(key, entry),
    sweep: (now) => {
      for (const [key, entry] of windows) {
        if (entry.resetAt <= now) windows.delete(key);
      }
    },
    get size() {
      return windows.size;
    },
  };
}

/**
 * @param {object}  options
 * @param {number=} options.limit     Requests allowed per window.
 * @param {number=} options.windowMs  Window length in milliseconds.
 * @param {RateLimitStore=} options.store
 */
export function createRateLimiter({
  limit = DEFAULT_LIMIT,
  windowMs = DEFAULT_WINDOW_MS,
  store = createMemoryStore(),
} = {}) {
  let lastSweep = 0;

  /**
   * @returns {{allowed: boolean, limit: number, remaining: number, resetAt: number, retryAfterSeconds: number}}
   */
  return function check(key, now = Date.now()) {
    // Amortized cleanup: without it the map grows one entry per unique client.
    if (now - lastSweep > windowMs) {
      store.sweep(now);
      lastSweep = now;
    }

    const existing = store.get(key);
    const entry =
      existing && existing.resetAt > now
        ? { count: existing.count + 1, resetAt: existing.resetAt }
        : { count: 1, resetAt: now + windowMs };

    store.set(key, entry);

    const allowed = entry.count <= limit;
    return {
      allowed,
      limit,
      remaining: Math.max(0, limit - entry.count),
      resetAt: entry.resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  };
}

/**
 * Best-effort client identity.
 *
 * There is no auth in this project yet, so this falls back to the proxy headers
 * Liara sets. Those are spoofable by a determined caller — once real user
 * sessions exist, key the limiter on the user id instead and treat the IP only
 * as a secondary signal.
 */
export function clientKeyFrom(request) {
  const headers = request?.headers;
  const forwarded = headers?.get?.("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    headers?.get?.("x-real-ip") ||
    headers?.get?.("cf-connecting-ip") ||
    "unknown";

  return `chat:${ip}`;
}

/** Headers describing the current window, for clients that want to back off. */
export function rateLimitHeaders(result) {
  return {
    "x-ratelimit-limit": String(result.limit),
    "x-ratelimit-remaining": String(result.remaining),
    "x-ratelimit-reset": String(Math.ceil(result.resetAt / 1000)),
  };
}
