// NOTE:
// This client is for BROWSER (client-side) use ONLY.
// Do NOT use this in server routes or API handlers.
// For server-side, use lib/supabase-server.ts instead.
// Mixing clients can cause auth bugs and security issues.
import { createBrowserClient } from '@supabase/ssr'

let client: ReturnType<typeof createBrowserClient> | null = null

export function getSupabaseBrowserClient() {
  if (client) return client

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  return client
}