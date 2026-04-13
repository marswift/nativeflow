import { vi } from 'vitest'

/**
 * Shared helpers for tests that dynamically import app/api/user/locale/route.
 * Centralises mock setup, env manipulation, and teardown.
 */

// ── Mocks (call once at file scope) ───────────────────────────────────────

export function registerLocaleMocks() {
  vi.mock('@upstash/ratelimit', () => ({
    Ratelimit: class {
      static slidingWindow() { return {} }
      async limit() { return { success: true, remaining: 4, reset: Date.now() + 60_000 } }
    },
  }))
  vi.mock('@upstash/redis', () => ({ Redis: class {} }))
  vi.mock('@supabase/supabase-js', () => ({
    createClient: () => ({
      auth: { getUser: async () => ({ data: { user: { id: 'u1' } }, error: null }) },
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
        update: () => ({ eq: () => ({ then: () => ({ catch: () => {} }) }) }),
      }),
    }),
  }))
  vi.mock('@/i18n/normalize-locale', () => ({
    normalizeLocale: (r: string) => (r.startsWith('ja') ? 'ja' : 'en'),
    isSupportedLocale: (v: string) => v === 'ja' || v === 'en',
    SUPPORTED_LOCALES: ['ja', 'en'],
    DEFAULT_LOCALE: 'ja',
  }))
  vi.mock('@/lib/network/get-client-ip', () => ({
    getClientIp: () => '127.0.0.1',
  }))
}

// ── Env snapshot / restore ────────────────────────────────────────────────

type EnvSnapshot = {
  NODE_ENV: string | undefined
  UPSTASH_REDIS_REST_URL: string | undefined
  UPSTASH_REDIS_REST_TOKEN: string | undefined
  NEXT_PUBLIC_SUPABASE_URL: string | undefined
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string | undefined
}

let _snapshot: EnvSnapshot | null = null

/** Take a snapshot of current env. Call in beforeEach. */
export function snapshotEnv(): void {
  _snapshot = {
    NODE_ENV: process.env.NODE_ENV,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  }
}

/** Restore env from snapshot + reset warn mock. Call in afterEach. */
export function restoreSnapshot(): void {
  if (!_snapshot) return
  for (const [key, value] of Object.entries(_snapshot)) {
    if (value !== undefined) {
      if (key === 'NODE_ENV') {
        setNodeEnv(value)
      } else {
        process.env[key] = value
      }
    } else {
      delete process.env[key]
    }
  }
  _snapshot = null
}

/** Reset console.warn spy. Safe to call even if no spy is active. */
export function restoreWarnMock(): void {
  vi.restoreAllMocks()
}

// ── Env setters ───────────────────────────────────────────────────────────

export function setNodeEnv(value: string) {
  Object.defineProperty(process.env, 'NODE_ENV', {
    value,
    writable: true,
    configurable: true,
  })
}

export function setMinimalPublicEnv() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
}

export function clearUpstash() {
  delete process.env.UPSTASH_REDIS_REST_URL
  delete process.env.UPSTASH_REDIS_REST_TOKEN
}

export function setUpstash() {
  process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'
}

// ── Composite helpers ─────────────────────────────────────────────────────

/** Reset modules + set env for a fresh dev-fallback import. */
export function prepareDevFallback() {
  vi.resetModules()
  setNodeEnv('development')
  clearUpstash()
  setMinimalPublicEnv()
}

/** Reset modules + set env for a non-dev env that should throw. */
export function prepareNonDevThrow(env: string) {
  vi.resetModules()
  setNodeEnv(env)
  clearUpstash()
  setMinimalPublicEnv()
}

/** Legacy compat — restores env from captured originals. */
export function restoreEnv() {
  restoreSnapshot()
}
