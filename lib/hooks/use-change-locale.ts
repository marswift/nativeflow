'use client'

import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { writeUiLanguageToStorage, readUiLanguageFromStorage } from '@/lib/auth-copy'
import { getSupabaseBrowserClient } from '@/lib/supabase/browser-client'

const SUPPORTED_LOCALES = ['ja', 'en'] as const
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

const THROTTLE_MS = 300

function isSupportedLocale(locale: string): locale is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(locale)
}

function setLocaleCookie(locale: string): void {
  document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=31536000;SameSite=Lax`
}

export type ChangeLocaleState = {
  /** true while the DB write is in-flight */
  pending: boolean
  /** non-null when the last change failed */
  error: string | null
}

/**
 * Hook to change the UI locale with pending state (no flicker).
 *
 * Flow:
 *   1. Set `pending = true` — consumer shows spinner/toast.
 *   2. POST /api/user/locale (DB persist).
 *   3. On success: write cookie + localStorage + navigate.
 *   4. On failure: set `error`, soft-refresh to previous locale.
 *
 * No optimistic UI write — the locale only changes after the server confirms.
 */
export function useChangeLocale() {
  const router = useRouter()
  const lastCallRef = useRef(0)
  const [state, setState] = useState<ChangeLocaleState>({ pending: false, error: null })

  const changeLocale = useCallback(
    async (newLocale: string) => {
      if (!isSupportedLocale(newLocale)) return

      const now = Date.now()
      if (now - lastCallRef.current < THROTTLE_MS) return
      lastCallRef.current = now

      const previousLocale = readUiLanguageFromStorage() ?? 'ja'
      if (newLocale === previousLocale) return

      setState({ pending: true, error: null })

      const currentPath = window.location.pathname
      const pathWithoutLocale = currentPath.replace(/^\/(ja|en)/, '') || '/'

      try {
        const supabase = getSupabaseBrowserClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.access_token) {
          const res = await fetch('/api/user/locale', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ ui_language: newLocale }),
          })

          if (!res.ok) {
            const msg = res.status === 429
              ? 'Too many changes. Please wait a moment.'
              : 'Failed to update language. Please try again.'
            setState({ pending: false, error: msg })
            return
          }
        }

        // Server confirmed — now apply locally
        setLocaleCookie(newLocale)
        writeUiLanguageToStorage(newLocale)
        setState({ pending: false, error: null })
        router.replace(`/${newLocale}${pathWithoutLocale}`)
      } catch {
        setState({ pending: false, error: 'Network error. Please try again.' })
        // Soft-refresh back to previous locale to clear any partial state
        router.replace(`/${previousLocale}${pathWithoutLocale}`)
      }
    },
    [router]
  )

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }))
  }, [])

  return { changeLocale, clearError, state, supportedLocales: SUPPORTED_LOCALES }
}
