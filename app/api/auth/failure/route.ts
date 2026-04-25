/**
 * POST /api/auth/failure
 *
 * Fire-and-forget auth failure logger for client-side auth errors.
 * Unauthenticated by design — failures happen before session exists.
 * Writes to admin_audit_log via service role.
 *
 * Security:
 *   - Only accepts 'auth_failure' event_type (hardcoded, not from client)
 *   - Never stores raw passwords or tokens
 *   - Email is masked before storage (first 2 chars + domain)
 *   - Body is validated and capped
 */

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

/** Mask email: "ab***@example.com" */
function maskEmail(email: string | undefined | null): string | null {
  if (!email || typeof email !== 'string') return null
  const parts = email.split('@')
  if (parts.length !== 2) return null
  const local = parts[0]
  const masked = local.length <= 2 ? local : local.slice(0, 2) + '***'
  return `${masked}@${parts[1]}`
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ ok: false }, { status: 500 })
    }

    const body = await request.json()

    // Validate required fields
    const reason = typeof body.reason === 'string' ? body.reason.slice(0, 200) : 'unknown'
    const provider = typeof body.provider === 'string' ? body.provider.slice(0, 30) : 'unknown'
    const route = typeof body.route === 'string' ? body.route.slice(0, 100) : null
    const source = typeof body.source === 'string' ? body.source.slice(0, 50) : null
    const maskedEmail = maskEmail(body.email)

    // Best-effort insert — never throw
    await fetch(`${supabaseUrl}/rest/v1/admin_audit_log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        actor_user_id: null,
        event_type: 'auth_failure',
        metadata: {
          reason,
          provider,
          route,
          source,
          masked_email: maskedEmail,
          timestamp: new Date().toISOString(),
        },
      }),
    }).catch(() => { /* non-blocking */ })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
