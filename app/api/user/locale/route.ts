import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  isSupportedLocale,
  normalizeLocale,
  SUPPORTED_LOCALES,
} from '@/i18n/normalize-locale'

/**
 * GET  /api/user/locale — Read user's locale preferences
 * POST /api/user/locale — Update user's UI language
 *
 * Security:
 * - User ID derived from Supabase auth session only (never from request body)
 * - Uses row-level client (anon key + user token), not service role
 * - Upstash Redis rate limit: 5 req/min per userId (or IP if unauthenticated)
 */

// ── Rate limiter ──────────────────────────────────────────────────────────
// Upstash Redis is mandatory in preview / staging / production / test.
// In-memory Map is allowed ONLY when NODE_ENV is the literal string 'development'
// and Upstash env vars are absent.
// Any value other than literal 'development' is treated as non-dev.

/** Exported for tests. True only when NODE_ENV is the exact string 'development'. */
export const isDevExact = process.env.NODE_ENV === 'development'

/** Exported so tests can assert on exact text without hard-coding. */
export const DEV_FALLBACK_WARNING =
  '[DEV] Using in-memory rate-limit fallback; NOT production-equivalent'

const _hasUpstash = !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN

if (!isDevExact && !_hasUpstash) {
  throw new Error(
    'Shared rate-limiting requires Upstash Redis in non-development environments.\n' +
    'Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN (see .env.example).'
  )
}

type RateLimitResult = { success: boolean; remaining: number; reset: number }

interface Limiter {
  limit(key: string): Promise<RateLimitResult>
}

function createLimiter(): Limiter {
  if (_hasUpstash) {
    // Lazy-load Upstash on first request. Dynamic import with variable
    // prevents webpack from resolving the module at build time, so the
    // build succeeds even when @upstash/* packages are not installed.
    let upstashLimiter: Limiter | null = null
    return {
      async limit(key: string): Promise<RateLimitResult> {
        if (!upstashLimiter) {
          const rlPkg = '@upstash/ratelimit'
          const redisPkg = '@upstash/redis'
          const { Ratelimit } = await import(/* webpackIgnore: true */ rlPkg)
          const { Redis } = await import(/* webpackIgnore: true */ redisPkg)
          upstashLimiter = new Ratelimit({
            redis: new Redis({
              url: process.env.UPSTASH_REDIS_REST_URL!,
              token: process.env.UPSTASH_REDIS_REST_TOKEN!,
            }),
            limiter: Ratelimit.slidingWindow(5, '60 s'),
            prefix: 'nf:locale',
          })
        }
        return upstashLimiter!.limit(key)
      },
    }
  }

  // Dev-only in-memory fallback (guard above ensures isDevExact is true here).
  // createLimiter() runs exactly once via module singleton, so warn fires once.
  // eslint-disable-next-line no-console
  console.warn(DEV_FALLBACK_WARNING)

  const buckets = new Map<string, { tokens: number; resetAt: number }>()
  return {
    async limit(key: string): Promise<RateLimitResult> {
      const now = Date.now()
      let entry = buckets.get(key)
      if (!entry || now >= entry.resetAt) {
        entry = { tokens: 4, resetAt: now + 60_000 }
        buckets.set(key, entry)
        return { success: true, remaining: entry.tokens, reset: entry.resetAt }
      }
      if (entry.tokens <= 0) {
        return { success: false, remaining: 0, reset: entry.resetAt }
      }
      entry.tokens -= 1
      return { success: true, remaining: entry.tokens, reset: entry.resetAt }
    },
  }
}

const limiter = createLimiter()

// ── Helpers ───────────────────────────────────────────────────────────────

const DEFAULT_RESPONSE = {
  ui_language: 'ja' as string,
  target_language: 'en' as string,
  target_region_slug: null as string | null,
  native_language: null as string | null,
}

function isValidLocaleInput(value: unknown): boolean {
  return typeof value === 'string' && isSupportedLocale(normalizeLocale(value))
}

function createAuthClient(token: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    }
  )
}

function extractToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim()
  return token && token.length > 0 ? token : null
}

import { getClientIp } from '@/lib/network/get-client-ip'
import { track } from '@/lib/metrics/umami'
import { hashIp } from '@/lib/metrics/hash-ip'

// ── GET: Read locale preferences ──────────────────────────────────────────

export async function GET(request: Request) {
  const token = extractToken(request)
  if (!token) {
    return NextResponse.json(DEFAULT_RESPONSE)
  }

  try {
    const supabase = createAuthClient(token)
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(DEFAULT_RESPONSE)
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('ui_language_code, target_language_code, target_region_slug, native_language_code')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile) {
      return NextResponse.json(DEFAULT_RESPONSE)
    }

    return NextResponse.json({
      ui_language: profile.ui_language_code ?? 'ja',
      target_language: profile.target_language_code ?? 'en',
      target_region_slug: profile.target_region_slug ?? null,
      native_language: profile.native_language_code ?? null,
    })
  } catch {
    return NextResponse.json(DEFAULT_RESPONSE)
  }
}

// ── POST: Update UI language ──────────────────────────────────────────────

export async function POST(request: Request) {
  const token = extractToken(request)
  if (!token) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const rawLocale = (body as Record<string, unknown>)?.ui_language
  if (typeof rawLocale !== 'string' || !isValidLocaleInput(rawLocale)) {
    return NextResponse.json(
      { error: `Invalid locale. Supported: ${SUPPORTED_LOCALES.join(', ')}` },
      { status: 400 }
    )
  }
  const ui_language = normalizeLocale(rawLocale)

  try {
    const supabase = createAuthClient(token)

    // Derive user_id from auth session — never trust body-supplied IDs
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Rate limit: 5 req/min keyed by userId (authenticated) or IP (fallback)
    const rateLimitKey = user.id ?? getClientIp(request) ?? 'unknown'
    const { success, remaining, reset } = await limiter.limit(rateLimitKey)

    if (!success) {
      const ip = getClientIp(request)
      const ipHash = hashIp(ip ?? 'unknown')
      const isAnonymousKey = rateLimitKey !== user.id

      if (isAnonymousKey) {
        // eslint-disable-next-line no-console
        console.info('[RATE_LIMIT] anonymous hit', { ipHash })
        void track('anon_rate_limit', { ipHash })
      }

      return NextResponse.json(
        { error: 'Too many locale changes. Please wait.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
            'X-RateLimit-Remaining': '0',
          },
        }
      )
    }

    // Row-level update: RLS ensures user can only update their own profile
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ ui_language_code: ui_language })
      .eq('id', user.id)

    if (updateError) {
      console.error('Locale update failed', updateError)
      return NextResponse.json({ error: 'Failed to update locale' }, { status: 500 })
    }

    // Also sync user_language_preferences if row exists (non-blocking)
    void supabase
      .from('user_language_preferences')
      .update({ app_locale: ui_language })
      .eq('user_id', user.id)

    return NextResponse.json(
      { success: true, ui_language },
      { headers: { 'X-RateLimit-Remaining': String(remaining) } }
    )
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
