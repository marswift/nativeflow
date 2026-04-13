/**
 * Canonical locale normalization.
 *
 * Coerces any raw locale string (Accept-Language, cookie, DB, user input)
 * to a supported language-only BCP-47 code.
 *
 * Rules:
 *   - 'ja', 'ja-JP', 'ja_JP' → 'ja'
 *   - 'en', 'en-US', 'en_GB' → 'en'
 *   - Anything else → 'en' (safe fallback)
 */
export function normalizeLocale(raw: string): 'ja' | 'en' {
  const lower = raw.toLowerCase().trim()
  if (lower.startsWith('ja')) return 'ja'
  if (lower.startsWith('en')) return 'en'
  return 'en'
}

/** Type guard: is this a supported canonical locale? */
export function isSupportedLocale(value: string): value is 'ja' | 'en' {
  return value === 'ja' || value === 'en'
}

export const SUPPORTED_LOCALES = ['ja', 'en'] as const
export const DEFAULT_LOCALE = 'ja' as const
