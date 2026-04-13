/**
 * POST /api/admin/audit
 *
 * Lightweight audit event writer for client-side security events.
 * Authenticates the caller and writes to admin_audit_log via service role.
 * Does NOT require admin role — any authenticated user can log their own security events.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const ALLOWED_EVENTS = new Set([
  'mfa_verify_success',
  'mfa_verify_failure',
  'mfa_enroll_start',
])

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseAnonKey || !serviceKey) {
      return NextResponse.json({ ok: false }, { status: 500 })
    }

    // Authenticate caller
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) return NextResponse.json({ ok: false }, { status: 401 })

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return NextResponse.json({ ok: false }, { status: 401 })

    const body = await request.json()
    const eventType = body.event_type as string

    if (!eventType || !ALLOWED_EVENTS.has(eventType)) {
      return NextResponse.json({ ok: false, error: 'Invalid event_type' }, { status: 400 })
    }

    // Write via service role (bypasses RLS)
    await fetch(`${supabaseUrl}/rest/v1/admin_audit_log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        actor_user_id: user.id,
        event_type: eventType,
        metadata: body.metadata ?? null,
      }),
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
