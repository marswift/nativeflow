import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Integration test: /api/user/locale rate limiting.
 *
 * Mocks @upstash/ratelimit and @supabase/supabase-js to verify
 * the route returns 429 on the 6th request within a minute.
 */

// ── Mock Upstash ──────────────────────────────────────────────────────────

let limitCallCount = 0

vi.mock('@upstash/ratelimit', () => {
  return {
    Ratelimit: class {
      static slidingWindow() {
        return {}
      }
      async limit(_key: string) {
        limitCallCount++
        const allowed = limitCallCount <= 5
        return {
          success: allowed,
          remaining: Math.max(0, 5 - limitCallCount),
          reset: Date.now() + 60_000,
        }
      }
    },
  }
})

vi.mock('@upstash/redis', () => {
  return {
    Redis: class {
      constructor() {}
    },
  }
})

// ── Mock Supabase ─────────────────────────────────────────────────────────

const mockUser = { id: 'test-user-uuid', email: 'test@example.com' }

vi.mock('@supabase/supabase-js', () => {
  return {
    createClient: () => ({
      auth: {
        getUser: async () => ({ data: { user: mockUser }, error: null }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { ui_language_code: 'ja', target_language_code: 'en', target_region_slug: null, native_language_code: 'ja' },
              error: null,
            }),
          }),
        }),
        update: () => ({
          eq: () => ({ then: () => ({ catch: () => {} }) }),
        }),
      }),
    }),
  }
})

// ── Mock normalize-locale ─────────────────────────────────────────────────

vi.mock('@/i18n/normalize-locale', () => ({
  normalizeLocale: (raw: string) => (raw.startsWith('ja') ? 'ja' : 'en'),
  isSupportedLocale: (v: string) => v === 'ja' || v === 'en',
  SUPPORTED_LOCALES: ['ja', 'en'],
  DEFAULT_LOCALE: 'ja',
}))

// ── Set required env vars before import ───────────────────────────────────

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

// ── Tests ─────────────────────────────────────────────────────────────────

describe('POST /api/user/locale — rate limiting', () => {
  beforeEach(() => {
    limitCallCount = 0
  })

  async function callPost(locale = 'en') {
    // Dynamic import to pick up mocks
    const { POST } = await import('@/app/api/user/locale/route')
    const request = new Request('http://localhost/api/user/locale', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer fake-jwt-token',
      },
      body: JSON.stringify({ ui_language: locale }),
    })
    return POST(request)
  }

  it('allows 5 requests within the window', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await callPost()
      expect(res.status).toBe(200)
    }
  })

  it('returns 429 on the 6th request', async () => {
    // Exhaust the bucket
    for (let i = 0; i < 5; i++) {
      await callPost()
    }
    // 6th should be rate-limited
    const res = await callPost()
    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.error).toContain('Too many')
  })
})

describe('Module load — production without Upstash', () => {
  it('throws when NODE_ENV=production and Upstash vars are missing', async () => {
    // Save originals
    const origEnv = process.env.NODE_ENV
    const origUrl = process.env.UPSTASH_REDIS_REST_URL
    const origToken = process.env.UPSTASH_REDIS_REST_TOKEN

    try {
      // Simulate production without Upstash
      // Use Object.defineProperty to bypass readonly on NODE_ENV
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true, configurable: true })
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      // Reset module cache so the guard re-evaluates
      vi.resetModules()

      await expect(
        import('@/app/api/user/locale/route')
      ).rejects.toThrow('Shared rate-limiting requires Upstash Redis')
    } finally {
      // Restore
      Object.defineProperty(process.env, 'NODE_ENV', { value: origEnv, writable: true, configurable: true })
      if (origUrl) process.env.UPSTASH_REDIS_REST_URL = origUrl
      if (origToken) process.env.UPSTASH_REDIS_REST_TOKEN = origToken
      vi.resetModules()
    }
  })
})
