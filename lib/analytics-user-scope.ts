/**
 * Analytics User Scope — internal user exclusion for KPI integrity
 *
 * Provides helpers to distinguish real learners from internal users
 * (owner/admin/staff) so product analytics reflect actual user behavior.
 *
 * Pure functions. No DB access, no side effects.
 */

const INTERNAL_ROLES = new Set(['owner', 'admin', 'staff'])

/**
 * Returns true if the user is an internal team member.
 * Internal users should be excluded from product KPIs.
 */
export function isInternalUser(role: string | null | undefined): boolean {
  if (!role) return false
  return INTERNAL_ROLES.has(role)
}

/**
 * Returns true if the user is a real learner (not internal).
 * Use this to filter analytics queries.
 */
export function isRealLearner(role: string | null | undefined): boolean {
  return !isInternalUser(role)
}

/**
 * SQL-safe list of internal roles for use in query builders.
 * Usage: .not('role', 'in', `(${INTERNAL_ROLE_SQL_LIST})`)
 */
export const INTERNAL_ROLE_SQL_LIST = 'owner,admin,staff'
