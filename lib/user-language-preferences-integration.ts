/**
 * Integration layer: resolves persisted user language preference values into
 * runtime-safe built-in types. Unsupported/dynamic DB values fall back to defaults.
 * preferred_region and preferred_age_band remain future personalization inputs;
 * they are intentionally excluded from current runtime preference resolution.
 */
import {
  type AppLocale,
  type CefrLevel,
  type LearningLanguage,
  type UserLanguagePreferences,
  DEFAULT_APP_LOCALE,
  DEFAULT_LEARNING_LANGUAGE,
  DEFAULT_BASE_LANGUAGE,
  isSupportedAppLocale,
  isSupportedLearningLanguage,
} from '@/lib/platform-language-config'

const CEFR_LEVELS: readonly CefrLevel[] = [
  'A1',
  'A2',
  'B1',
  'B2',
  'C1',
  'C2',
]

function isCefrLevel(value: string | null | undefined): value is CefrLevel {
  if (value == null) return false
  return CEFR_LEVELS.some((s) => s === value)
}

/** Persisted string values as read from DB (e.g. user_language_preferences row). */
export type PersistedUserLanguagePreferenceInput = {
  appLocale: string
  learningLanguage: string
  baseLanguage: string
  cefrLevel?: string | null
}

export type ResolvedFieldReport = {
  usedFallback: boolean
  persistedValue: string
}

export type UserLanguagePreferencesResolutionReport = {
  appLocale: ResolvedFieldReport
  learningLanguage: ResolvedFieldReport
  baseLanguage: ResolvedFieldReport
}

export type ResolvedUserLanguagePreferences = {
  preferences: UserLanguagePreferences
  report: UserLanguagePreferencesResolutionReport
}

function trimPersisted(value: string): string {
  return (value ?? '').trim()
}

function resolveLocaleOrLanguage<T extends string>(
  persisted: string,
  isSupported: (value: string) => value is T,
  fallback: T
): { value: T; report: ResolvedFieldReport } {
  const trimmed = trimPersisted(persisted)
  const supported = isSupported(trimmed)
  return {
    value: (supported ? trimmed : fallback) as T,
    report: {
      usedFallback: !supported,
      persistedValue: trimmed,
    },
  }
}

/** Resolves persisted locale/language strings into runtime-safe preferences; reports fallbacks. */
export function resolveUserLanguagePreferencesFromPersisted(
  input: PersistedUserLanguagePreferenceInput
): ResolvedUserLanguagePreferences {
  const appLocaleResult = resolveLocaleOrLanguage(
    input.appLocale,
    isSupportedAppLocale,
    DEFAULT_APP_LOCALE
  )
  const learningResult = resolveLocaleOrLanguage(
    input.learningLanguage,
    isSupportedLearningLanguage,
    DEFAULT_LEARNING_LANGUAGE
  )
  const baseResult = resolveLocaleOrLanguage(
    input.baseLanguage,
    isSupportedLearningLanguage,
    DEFAULT_BASE_LANGUAGE
  )
  const cefrLevel: CefrLevel | null = isCefrLevel(input.cefrLevel)
    ? input.cefrLevel
    : null

  return {
    preferences: {
      appLocale: appLocaleResult.value,
      learningLanguage: learningResult.value,
      baseLanguage: baseResult.value,
      cefrLevel,
    },
    report: {
      appLocale: appLocaleResult.report,
      learningLanguage: learningResult.report,
      baseLanguage: baseResult.report,
    },
  }
}
