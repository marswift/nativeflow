/**
 * Client-side Supabase instance for the NativeFlow MVP.
 * Used in the browser for auth and data access (e.g. user_profiles).
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || supabaseUrl.trim() === '') {
  throw new Error('Missing or empty NEXT_PUBLIC_SUPABASE_URL. Set it in your environment.')
}
if (!supabaseAnonKey || supabaseAnonKey.trim() === '') {
  throw new Error('Missing or empty NEXT_PUBLIC_SUPABASE_ANON_KEY. Set it in your environment.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
