/**
 * Admin Guard — checks if the current user has admin privileges.
 *
 * Used by admin pages (client-side) and admin API routes (server-side).
 *
 * Role hierarchy: owner > admin > staff > user
 * Backward compatible: is_admin === true is treated as admin access.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

// ── Role types ──

export type UserRole = 'owner' | 'admin' | 'staff' | 'user'

const ADMIN_ROLES: ReadonlySet<string> = new Set(['owner', 'admin'])
const STAFF_ROLES: ReadonlySet<string> = new Set(['owner', 'admin', 'staff'])

export type AdminCheckResult = {
  isAdmin: boolean
  userId: string | null
  role: UserRole
  /** Whether the user has completed MFA verification (AAL2) */
  mfaVerified: boolean
  /** Whether MFA is required but not completed */
  mfaRequired: boolean
}

// ── Helpers ──

function parseRole(raw: unknown): UserRole {
  if (typeof raw === 'string' && ['owner', 'admin', 'staff', 'user'].includes(raw)) {
    return raw as UserRole
  }
  return 'user'
}

function isAdminByRoleOrFlag(role: UserRole, isAdminFlag: boolean): boolean {
  return ADMIN_ROLES.has(role) || isAdminFlag
}

// ── Client-side guard ──

/**
 * Check if a user has admin access via browser Supabase client.
 * Admin access = role is 'owner' or 'admin', OR is_admin === true (backward compat).
 */
export async function checkIsAdmin(
  supabase: SupabaseClient,
): Promise<AdminCheckResult> {
  const denied: AdminCheckResult = { isAdmin: false, userId: null, role: 'user', mfaVerified: false, mfaRequired: false }
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return denied

    const userId = session.user.id

    const { data } = await supabase
      .from('user_profiles')
      .select('is_admin, role')
      .eq('id', userId)
      .maybeSingle()

    const role = parseRole(data?.role)
    const isAdmin = isAdminByRoleOrFlag(role, data?.is_admin === true)

    // Check MFA assurance level
    let mfaVerified = false
    try {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      mfaVerified = aal?.currentLevel === 'aal2'
    } catch { /* MFA not available — treat as not verified */ }

    // MFA required for privileged roles but not yet verified
    const mfaRequired = isAdmin && !mfaVerified

    return { isAdmin, userId, role, mfaVerified, mfaRequired }
  } catch {
    return denied
  }
}

/**
 * Check if a user has staff-level access (owner, admin, or staff).
 */
export async function checkIsStaff(
  supabase: SupabaseClient,
): Promise<AdminCheckResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return { isAdmin: false, userId: null, role: 'user', mfaVerified: false, mfaRequired: false }

    const userId = session.user.id

    const { data } = await supabase
      .from('user_profiles')
      .select('is_admin, role')
      .eq('id', userId)
      .maybeSingle()

    const role = parseRole(data?.role)
    const isAdmin = STAFF_ROLES.has(role) || data?.is_admin === true

    return { isAdmin, userId, role, mfaVerified: false, mfaRequired: false }
  } catch {
    return { isAdmin: false, userId: null, role: 'user', mfaVerified: false, mfaRequired: false }
  }
}

// ── Server-side guard ──

/**
 * Check admin via server-side Supabase client (service role).
 */
export async function checkIsAdminServer(userId: string): Promise<boolean> {
  try {
    const { supabaseServer } = await import('./supabase-server')

    const { data } = await supabaseServer
      .from('user_profiles')
      .select('is_admin, role')
      .eq('id', userId)
      .maybeSingle()

    const role = parseRole(data?.role)
    return isAdminByRoleOrFlag(role, data?.is_admin === true)
  } catch {
    return false
  }
}

/**
 * Get the user's role via server-side client.
 */
export async function getUserRoleServer(userId: string): Promise<UserRole> {
  try {
    const { supabaseServer } = await import('./supabase-server')

    const { data } = await supabaseServer
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()

    return parseRole(data?.role)
  } catch {
    return 'user'
  }
}
