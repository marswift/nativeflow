'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { normalizeLocale, isSupportedLocale, DEFAULT_LOCALE } from '@/i18n/normalize-locale'

const STORAGE_KEY = 'nativeflow:ui_language'
const RESOLVE_TIMEOUT_MS = 200

/**
 * Synchronous snapshot from localStorage (non-blocking).
 * Returns DEFAULT_LOCALE if unavailable.
 */
function getSnapshot(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const normalized = normalizeLocale(stored)
      if (isSupportedLocale(normalized)) return normalized
    }
  } catch { /* private browsing / SSR */ }
  return DEFAULT_LOCALE
}

function getServerSnapshot(): string {
  return DEFAULT_LOCALE
}

function subscribe(callback: () => void): () => void {
  function onStorage(e: StorageEvent) {
    if (e.key === STORAGE_KEY) callback()
  }
  window.addEventListener('storage', onStorage)
  return () => window.removeEventListener('storage', onStorage)
}

/**
 * Non-blocking locale bootstrap hook.
 *
 * Behavior:
 * - Returns DEFAULT_LOCALE immediately (no first-paint block).
 * - `useSyncExternalStore` reads localStorage on hydration.
 * - `resolved` flips to `true` once locale is confirmed (or after 200ms timeout).
 * - Consumers can show a skeleton while `resolved === false`, or just render —
 *   the locale will correct itself on the next tick if it differs.
 *
 * Locale precedence remains server-decided (middleware sets the route).
 * This hook is a client-side fallback for pre-auth screens without route locale.
 */
export function useLocaleBootstrap(): { locale: string; resolved: boolean } {
  const locale = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const [resolved, setResolved] = useState(false)

  useEffect(() => {
    // Mark resolved immediately if snapshot succeeded, or after timeout
    const timer = setTimeout(() => setResolved(true), RESOLVE_TIMEOUT_MS)
    setResolved(true) // localStorage read is sync — resolve immediately
    return () => clearTimeout(timer)
  }, [])

  return { locale, resolved }
}
