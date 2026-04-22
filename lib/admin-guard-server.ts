/**
 * Server-side admin guard functions.
 * Uses service-role Supabase client — must only be imported from Server Components or API routes.
 */

import type { UserRole } from './admin-guard'

function parseRole(raw: unknown): UserRole {
  if (typeof raw === 'string' && ['owner', 'admin', 'staff', 'user'].includes(raw)) {
    return raw as UserRole
  }
  return 'user'
}

const ADMIN_ROLES: ReadonlySet<string> = new Set(['owner', 'admin'])

function isAdminByRoleOrFlag(role: UserRole, isAdminFlag: boolean): boolean {
  return ADMIN_ROLES.has(role) || isAdminFlag
}

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
