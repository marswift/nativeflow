/**
 * Next.js Middleware — locale detection + rate limiting.
 *
 * Locale precedence: route param › DB (via cookie) › NEXT_LOCALE cookie › Accept-Language › 'ja'
 *
 * Rate limits by route group:
 * - /api/admin/*           → strict (30/min)
 * - /api/stripe/*          → billing-strict (10/min)
 * - /api/pronunciation/*   → auth-sensitive (10/min)
 * - /api/ai-conversation/* → auth-sensitive (10/min)
 * - /api/user/locale       → locale-write (5/min)
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  checkRateLimit,
  RATE_LIMIT_ADMIN,
  RATE_LIMIT_AUTH,
  RATE_LIMIT_BILLING,
  type RateLimitConfig,
} from './lib/rate-limit'

// ── Locale (centralized normalization) ────────────────────────────────────

import {
  normalizeLocale,
  isSupportedLocale,
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
} from './i18n/normalize-locale'

function negotiateLocale(request: NextRequest): string {
  // 1. NEXT_LOCALE cookie (set by language switcher)
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value
  if (cookieLocale && isSupportedLocale(cookieLocale)) return cookieLocale

  // 2. Accept-Language header — normalize all variants
  const acceptLang = request.headers.get('accept-language')
  if (acceptLang) {
    for (const part of acceptLang.split(',')) {
      const tag = part.split(';')[0]?.trim()
      if (!tag) continue
      const normalized = normalizeLocale(tag)
      if (isSupportedLocale(normalized)) return normalized
    }
  }

  return DEFAULT_LOCALE
}

// ── Rate-limit helpers ────────────────────────────────────────────────────

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  )
}

type IdentityResult = {
  key: string
  source: 'bearer' | 'cookie' | 'ip'
  label: string
}

function resolveIdentity(request: NextRequest): IdentityResult {
  const ip = getClientIp(request)

  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      const payload = JSON.parse(atob(token.split('.')[1]))
      if (typeof payload.sub === 'string') {
        return { key: `user:${payload.sub}`, source: 'bearer', label: payload.sub.slice(0, 8) }
      }
    }

    const cookieHeader = request.headers.get('cookie') ?? ''
    const match = cookieHeader.match(/sb-[^=]+-auth-token=([^;]+)/)
    if (match) {
      const parsed = JSON.parse(decodeURIComponent(match[1]))
      const token = Array.isArray(parsed) ? parsed[0] : parsed?.access_token
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]))
        if (typeof payload.sub === 'string') {
          return { key: `user:${payload.sub}`, source: 'cookie', label: payload.sub.slice(0, 8) }
        }
      }
    }
  } catch { /* decode failed — fall through to IP */ }

  return { key: `ip:${ip}`, source: 'ip', label: ip }
}

// ── Rate-limit policies ───────────────────────────────────────────────────

type RoutePolicy = {
  prefix: string
  config: RateLimitConfig
  group: string
  exclude?: string[]
  auditOnDeny?: boolean
}

const POLICIES: RoutePolicy[] = [
  {
    prefix: '/api/admin/',
    config: RATE_LIMIT_ADMIN,
    group: 'admin',
    auditOnDeny: true,
  },
  {
    prefix: '/api/stripe/',
    config: RATE_LIMIT_BILLING,
    group: 'billing',
    auditOnDeny: true,
    exclude: ['/api/stripe/webhook'],
  },
  {
    prefix: '/api/pronunciation/',
    config: RATE_LIMIT_AUTH,
    group: 'pronunciation',
  },
  {
    prefix: '/api/ai-conversation/',
    config: RATE_LIMIT_AUTH,
    group: 'ai-conversation',
  },
]

// ── Middleware ─────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // ── API routes: rate limiting only (no locale prefix) ──
  if (path.startsWith('/api/')) {
    for (const policy of POLICIES) {
      if (!path.startsWith(policy.prefix)) continue
      if (policy.exclude?.some((ex) => path === ex)) continue

      const identity = resolveIdentity(request)
      const key = `${policy.group}:${identity.key}`
      const result = await checkRateLimit(key, policy.config)

      if (!result.allowed) {
        const retryAfterSec = Math.ceil((result.resetAt - Date.now()) / 1000)

        // eslint-disable-next-line no-console
        console.warn('[rate-limit]', {
          group: policy.group,
          source: identity.source,
          id: identity.label,
          path,
          remaining: 0,
          retryAfterSec,
        })

        if (policy.auditOnDeny) {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
          const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
          if (supabaseUrl && serviceKey) {
            const userId = identity.source !== 'ip' ? identity.key.replace('user:', '') : null
            fetch(`${supabaseUrl}/rest/v1/admin_audit_log`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                apikey: serviceKey,
                Authorization: `Bearer ${serviceKey}`,
                Prefer: 'return=minimal',
              },
              body: JSON.stringify({
                actor_user_id: userId,
                event_type: 'rate_limit_denied',
                metadata: { group: policy.group, source: identity.source, path, retryAfterSec },
              }),
            }).catch(() => { /* non-blocking */ })
          }
        }

        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          {
            status: 429,
            headers: {
              'Retry-After': String(retryAfterSec),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
            },
          }
        )
      }

      const response = NextResponse.next()
      response.headers.set('X-RateLimit-Remaining', String(result.remaining))
      response.headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)))
      return response
    }

    return NextResponse.next()
  }

  // ── i18n locale routing: DISABLED (rollback for stability) ──
  // app/[locale]/ files remain for future re-activation.

  // ── A/B LP split: root path only ──────────────────────────────────────
  if (path === '/') {
    const COOKIE_NAME = 'lp_variant'
    const MAX_AGE = 60 * 60 * 24 * 7 // 7 days

    // QA override: /?lp_variant=a or /?lp_variant=b
    const overrideParam = request.nextUrl.searchParams.get('lp_variant')?.toLowerCase()
    const override = overrideParam === 'a' ? 'A' : overrideParam === 'b' ? 'B' : null

    // Determine variant: override > cookie > random
    let variant: 'A' | 'B'
    if (override) {
      variant = override
    } else {
      const cookieVal = request.cookies.get(COOKIE_NAME)?.value
      if (cookieVal === 'A' || cookieVal === 'B') {
        variant = cookieVal
      } else {
        variant = Math.random() < 0.5 ? 'A' : 'B'
      }
    }

    // Rewrite to /lp/a or /lp/b (URL stays "/")
    const rewriteUrl = request.nextUrl.clone()
    rewriteUrl.pathname = variant === 'A' ? '/lp/a' : '/lp/b'
    rewriteUrl.searchParams.delete('lp_variant')
    const response = NextResponse.rewrite(rewriteUrl)

    // Set/refresh cookie
    response.cookies.set(COOKIE_NAME, variant, {
      path: '/',
      maxAge: MAX_AGE,
      sameSite: 'lax',
      httpOnly: false, // readable by client analytics if needed
    })

    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/',
    '/api/admin/:path*',
    '/api/stripe/:path*',
    '/api/pronunciation/:path*',
    '/api/ai-conversation/:path*',
  ],
}
