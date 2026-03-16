/**
 * Server-side Supabase client for API routes and webhook processing.
 * Uses the service role key; for trusted server-only use (e.g. Stripe webhooks).
 * Must never be imported into client components.
 */
import 'server-only'
import { createClient } from '@supabase/supabase-js'

/** Throws if value is missing or blank. */
function requireEnv(name: string, value: string | undefined): string {
  const trimmed = value?.trim()
  if (!trimmed) {
    throw new Error(`${name} is not set`)
  }
  return trimmed
}

const supabaseUrl = requireEnv(
  'NEXT_PUBLIC_SUPABASE_URL',
  process.env.NEXT_PUBLIC_SUPABASE_URL
)
const supabaseServiceRoleKey = requireEnv(
  'SUPABASE_SERVICE_ROLE_KEY',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const supabaseServer = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})
