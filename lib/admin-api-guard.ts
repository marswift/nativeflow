/**
 * Admin API Guard — server-side auth check for admin API routes.
 *
 * Extracts user from Supabase auth header and checks is_admin.
 * Returns userId if admin, null if not.
 * Logs admin access attempts to admin_audit_log.
 */

import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Verify the request comes from an admin user.
 * Uses the access token from the Authorization header or cookie.
 * Returns the userId if admin, null otherwise.
 * Logs access success/failure to audit log.
 */
export async function verifyAdminRequest(request: NextRequest): Promise<string | null> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) return null

    // Extract access token from Authorization header or cookie
    let accessToken: string | null = null

    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      accessToken = authHeader.slice(7)
    }

    if (!accessToken) {
      const cookieHeader = request.headers.get('cookie') ?? ''
      const match = cookieHeader.match(/sb-[^=]+-auth-token=([^;]+)/)
      if (match) {
        try {
          const parsed = JSON.parse(decodeURIComponent(match[1]))
          accessToken = Array.isArray(parsed) ? parsed[0] : parsed?.access_token
        } catch { /* ignore */ }
      }
    }

    if (!accessToken) return null

    // Verify the token and get user
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    })

    const { data: { user } } = await supabase.auth.getUser(accessToken)
    if (!user) return null

    // Check is_admin via service role (bypasses RLS)
    const server = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data } = await server
      .from('user_profiles')
      .select('is_admin, role')
      .eq('id', user.id)
      .maybeSingle()

    const role = data?.role as string | undefined
    const isAdmin = role === 'owner' || role === 'admin' || data?.is_admin === true
    const route = request.nextUrl.pathname

    // Check AAL level from JWT for MFA enforcement
    let aal = 'aal1'
    try {
      if (accessToken) {
        const payload = JSON.parse(atob(accessToken.split('.')[1]))
        aal = payload.aal ?? 'aal1'
      }
    } catch { /* fallback to aal1 */ }

    const mfaDenied = isAdmin && aal !== 'aal2'

    // Audit log (non-blocking, fire-and-forget)
    try {
      const eventType = !isAdmin ? 'admin_access_denied'
        : mfaDenied ? 'admin_access_mfa_required'
        : 'admin_access_granted'
      const auditRow = {
        actor_user_id: user.id,
        event_type: eventType,
        metadata: { route, role: role ?? null, aal },
      }
      await fetch(`${supabaseUrl}/rest/v1/admin_audit_log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(auditRow),
      })
    } catch { /* non-blocking */ }

    if (!isAdmin) return null
    if (mfaDenied) return null
    return user.id
  } catch {
    return null
  }
}
