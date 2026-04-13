/**
 * Unified environment access — re-exports from split modules.
 *
 * Prefer importing directly from:
 *   - '@/config/server-env'     (secrets, server-only)
 *   - '@/config/runtime-flags'  (isDev, isTest, featureFlags, client-safe)
 *
 * This file exists for backward compatibility and convenience.
 */

// Re-export runtime flags (client-safe)
export { isDev, isTest, isProd, featureFlags } from '@/config/runtime-flags'

// ── Public env (client-safe) ──────────────────────────────────────────────

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  i18nEnabled: process.env.NEXT_PUBLIC_FF_I18N_ENABLED === 'true',
} as const

/**
 * Read an env var without validation. Use only in test utilities
 * where required vars are intentionally absent.
 */
export function getOptionalEnv(key: string): string | undefined {
  return process.env[key] ?? undefined
}
