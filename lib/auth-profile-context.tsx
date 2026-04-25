'use client'

/**
 * AuthProfileProvider — shared session + core profile context for authenticated pages.
 *
 * Fetches once on mount:
 *   - Supabase session (from local cache, no network call)
 *   - Core user_profiles fields used by header and multiple pages
 *
 * Consumers:
 *   - AppHeader reads `diamonds` (eliminates its own query)
 *   - Pages read `userId`, `session`, `profile` to skip their own getSession + base profile fetch
 *   - Pages that need extra fields still do their own supplemental queries
 *
 * This context is optional — pages that don't use it continue to work as before.
 */

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { getSupabaseBrowserClient } from './supabase/browser-client'

// ── Types ──

export type AuthProfile = {
  userId: string
  email: string
  totalDiamonds: number
  totalFlowPoints: number
  subscriptionStatus: string | null
  role: string | null
  isAdmin: boolean
}

type AuthProfileContextValue = {
  /** null = still loading, undefined = not authenticated */
  profile: AuthProfile | null | undefined
  loading: boolean
  /** Refresh profile data (e.g. after a diamond purchase) */
  refresh: () => void
}

const AuthProfileContext = createContext<AuthProfileContextValue>({
  profile: null,
  loading: true,
  refresh: () => {},
})

// ── Select fields (shared across header + pages) ──

const PROFILE_SELECT =
  'id, total_diamonds, total_flow_points, subscription_status, role, is_admin'

// ── Provider ──

export function AuthProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<AuthProfile | null | undefined>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async () => {
    try {
      const supabase = getSupabaseBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user) {
        setProfile(undefined)
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select(PROFILE_SELECT)
        .eq('id', session.user.id)
        .maybeSingle()

      if (error || !data) {
        setProfile(undefined)
        setLoading(false)
        return
      }

      setProfile({
        userId: session.user.id,
        email: session.user.email ?? '',
        totalDiamonds: (data.total_diamonds as number) ?? 0,
        totalFlowPoints: (data.total_flow_points as number) ?? 0,
        subscriptionStatus: (data.subscription_status as string) ?? null,
        role: (data.role as string) ?? null,
        isAdmin: data.is_admin === true,
      })
      setLoading(false)
    } catch {
      setProfile(undefined)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const refresh = useCallback(() => {
    setLoading(true)
    fetchProfile()
  }, [fetchProfile])

  return (
    <AuthProfileContext.Provider value={{ profile, loading, refresh }}>
      {children}
    </AuthProfileContext.Provider>
  )
}

// ── Hook ──

export function useAuthProfile() {
  return useContext(AuthProfileContext)
}
