/**
 * Rate Limiter — pluggable store with atomic increment contract.
 *
 * Default: in-memory (single-instance baseline).
 * Swappable: implement RateLimitStore for Redis/KV with atomic INCR.
 *
 * The store contract uses a single `increment` method instead of
 * separate get/set to prevent TOCTOU races in distributed backends.
 */

// ── Store interface ──

export type IncrementResult = {
  /** Count AFTER this increment */
  count: number
  /** When this window resets (epoch ms) */
  resetAt: number
}

/**
 * Abstract store for rate limit state.
 *
 * Implementations must ensure `increment` is atomic:
 * - In-memory: trivially safe (single-threaded JS)
 * - Redis: use INCR + PEXPIRE in a pipeline or Lua script
 * - Vercel KV: use atomic INCR
 */
export interface RateLimitStore {
  /**
   * Atomically increment the counter for `key`.
   * If key doesn't exist or has expired, create a new window.
   *
   * @param key - rate limit bucket key
   * @param windowMs - window duration for new entries
   * @returns count after increment + window reset time
   */
  increment(key: string, windowMs: number): IncrementResult | Promise<IncrementResult>
}

// ── In-memory store (default) ──

type MemoryEntry = {
  count: number
  resetAt: number
}

const CLEANUP_INTERVAL = 60_000

class MemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, MemoryEntry>()
  private lastCleanup = Date.now()

  private cleanup(): void {
    const now = Date.now()
    if (now - this.lastCleanup < CLEANUP_INTERVAL) return
    this.lastCleanup = now
    for (const [key, entry] of this.store) {
      if (entry.resetAt < now) this.store.delete(key)
    }
  }

  increment(key: string, windowMs: number): IncrementResult {
    this.cleanup()
    const now = Date.now()
    const existing = this.store.get(key)

    if (!existing || existing.resetAt < now) {
      // New window
      const entry: MemoryEntry = { count: 1, resetAt: now + windowMs }
      this.store.set(key, entry)
      return { count: 1, resetAt: entry.resetAt }
    }

    // Increment within window
    existing.count++
    return { count: existing.count, resetAt: existing.resetAt }
  }
}

// ── Singleton store instance ──

let activeStore: RateLimitStore = new MemoryRateLimitStore()

/**
 * Replace the rate limit store with a persistent backend.
 *
 * Example:
 *   setRateLimitStore(new RedisRateLimitStore(client))
 */
export function setRateLimitStore(store: RateLimitStore): void {
  activeStore = store
}

/**
 * Get the active store (for testing or inspection).
 */
export function getRateLimitStore(): RateLimitStore {
  return activeStore
}

// ── Config + Result types ──

export type RateLimitConfig = {
  /** Maximum requests allowed in the window */
  maxRequests: number
  /** Window duration in milliseconds */
  windowMs: number
}

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  resetAt: number
}

// ── Core check function ──

/**
 * Check and consume a rate limit token.
 * Delegates to the store's atomic increment — no separate get/set race.
 */
export async function checkRateLimit(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
  const { count, resetAt } = await activeStore.increment(key, config.windowMs)

  const allowed = count <= config.maxRequests
  const remaining = Math.max(0, config.maxRequests - count)

  return { allowed, remaining, resetAt }
}

// ── Preset configs ──

/** Admin routes: strict — 30 requests per minute */
export const RATE_LIMIT_ADMIN: RateLimitConfig = {
  maxRequests: 30,
  windowMs: 60_000,
}

/** Auth-sensitive routes: moderate — 10 requests per minute */
export const RATE_LIMIT_AUTH: RateLimitConfig = {
  maxRequests: 10,
  windowMs: 60_000,
}

/** Billing routes: strict — 10 requests per minute */
export const RATE_LIMIT_BILLING: RateLimitConfig = {
  maxRequests: 10,
  windowMs: 60_000,
}

/** General API: permissive — 60 requests per minute */
export const RATE_LIMIT_GENERAL: RateLimitConfig = {
  maxRequests: 60,
  windowMs: 60_000,
}
