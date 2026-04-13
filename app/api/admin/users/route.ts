/**
 * GET  /api/admin/users?q=email
 * POST /api/admin/users  { userId, updates }
 *
 * Admin-only user management API.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/admin-api-guard'

export const runtime = 'nodejs'

const EDITABLE_FIELDS = new Set([
  'role',
  'billing_exempt',
  'billing_exempt_until',
  'billing_exempt_reason',
])

const VALID_ROLES = new Set(['owner', 'admin', 'staff', 'user'])

async function getSupabase() {
  const { supabaseServer } = await import('@/lib/supabase-server')
  return supabaseServer
}

/**
 * GET — search users by email, return list with role/billing fields.
 */
export async function GET(request: NextRequest) {
  try {
    const adminUserId = await verifyAdminRequest(request)
    if (!adminUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const q = request.nextUrl.searchParams.get('q')?.trim() ?? ''
    const supabase = await getSupabase()

    let query = supabase
      .from('user_profiles')
      .select('id, username, role, is_admin, subscription_status, billing_exempt, billing_exempt_until, billing_exempt_reason')
      .order('created_at', { ascending: false })
      .limit(50)

    if (q) {
      // Search by user ID or username
      // For email search we need auth.users — use a subquery approach
      const { data: authUsers } = await supabase.rpc('get_user_ids_by_email', { email_pattern: `%${q}%` }).select()

      if (authUsers && authUsers.length > 0) {
        const ids = authUsers.map((u: { id: string }) => u.id)
        query = query.in('id', ids)
      } else {
        // Fallback: search by username
        query = query.ilike('username', `%${q}%`)
      }
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Enrich with email from auth.users
    const userIds = (data ?? []).map((u: { id: string }) => u.id)
    let emailMap = new Map<string, string>()

    if (userIds.length > 0) {
      try {
        const { data: authData } = await supabase
          .from('auth_user_emails')
          .select('id, email')
          .in('id', userIds)

        if (authData) {
          emailMap = new Map(authData.map((u: { id: string; email: string }) => [u.id, u.email]))
        }
      } catch {
        // auth view may not exist — fallback without emails
      }
    }

    const users = (data ?? []).map((u: Record<string, unknown>) => ({
      ...u,
      email: emailMap.get(u.id as string) ?? null,
    }))

    return NextResponse.json({ users })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * POST — update user fields (role, billing_exempt, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    const adminUserId = await verifyAdminRequest(request)
    if (!adminUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, updates } = body as { userId: string; updates: Record<string, unknown> }

    if (!userId || !updates || typeof updates !== 'object') {
      return NextResponse.json({ error: 'userId and updates required' }, { status: 400 })
    }

    const supabase = await getSupabase()

    // Owner protection: cannot downgrade owner via normal admin UI
    if (updates.role && updates.role !== 'owner') {
      const { data: target } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle()

      if (target?.role === 'owner') {
        return NextResponse.json({ error: 'Cannot change owner role' }, { status: 403 })
      }
    }

    // Validate role
    if (updates.role && !VALID_ROLES.has(updates.role as string)) {
      return NextResponse.json({ error: `Invalid role: ${updates.role}` }, { status: 400 })
    }

    // Filter to editable fields only
    const safeUpdates: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(updates)) {
      if (EDITABLE_FIELDS.has(key)) {
        safeUpdates[key] = value
      }
    }

    if (Object.keys(safeUpdates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Keep is_admin in sync with role
    if (safeUpdates.role) {
      safeUpdates.is_admin = safeUpdates.role === 'owner' || safeUpdates.role === 'admin'
    }

    // Fetch before-state for audit log
    const { data: beforeRow } = await supabase
      .from('user_profiles')
      .select('role, is_admin, billing_exempt, billing_exempt_until, billing_exempt_reason')
      .eq('id', userId)
      .maybeSingle()

    const { error } = await supabase
      .from('user_profiles')
      .update(safeUpdates)
      .eq('id', userId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Audit log (non-blocking)
    try {
      await supabase.from('admin_audit_log').insert({
        actor_user_id: adminUserId,
        target_user_id: userId,
        event_type: 'user_profile_update',
        before_value: beforeRow ?? null,
        after_value: safeUpdates,
      })
    } catch { /* non-blocking */ }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
