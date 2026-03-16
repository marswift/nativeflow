type OptionItem<TValue extends string> = {
  value: TValue
  label: string
}

// ─── UI language (app interface) ───────────────────────────────────────────
// App interface language is fixed to Japanese for now. This structure is designed
// for future expansion: the app UI must support 10+ languages later (language switcher, i18n).
// Do not confuse with "target learning language" below.
/** UI language: language of the app interface. */
export const UI_LANGUAGE_OPTIONS: readonly OptionItem<'ja' | 'en' | 'ko' | 'zh'>[] = [
  { value: 'ja', label: '日本語' },
  { value: 'en', label: '英語' },
  { value: 'ko', label: '韓国語' },
  { value: 'zh', label: '中国語' },
] as const

export type UiLanguageCode = (typeof UI_LANGUAGE_OPTIONS)[number]['value']

/** MVP: app interface language is fixed to Japanese. Use this when a single UI language is required. */
export const UI_LANGUAGE_FIXED = 'ja' as const

// ─── Target learning language ───────────────────────────────────────────────
// Target learning language is fixed to English for now (only en has enabled: true).
// The architecture is designed for future expansion: target learning must support 10+ languages.
// Onboarding shows only entries where enabled === true. Add new entries and COUNTRY_BY_LANGUAGE
// keys when enabling additional languages.
/** Target learning language with enabled flag. */
export const TARGET_LANGUAGE_OPTIONS = [
  { value: 'en', label: '英語', enabled: true },
  { value: 'ja', label: '日本語', enabled: false },
  { value: 'ko', label: '韓国語', enabled: false },
  { value: 'zh', label: '中国語', enabled: false },
] as const

export type TargetLanguageOption = (typeof TARGET_LANGUAGE_OPTIONS)[number]
export type TargetLanguageCode = TargetLanguageOption['value']

/** MVP: target learning language is fixed to English. Use this when a single learning language is required. */
export const TARGET_LANGUAGE_FIXED = 'en' as const

/** Options for languages that are currently enabled (onboarding shows only these). MVP: only English. */
export const ENABLED_TARGET_LANGUAGE_OPTIONS = TARGET_LANGUAGE_OPTIONS.filter(
  (option) => option.enabled
)

// ─── Target country (by learning language) ───────────────────────────────────
// COUNTRY_BY_LANGUAGE is the single source of target-country options.
// - Country labels are Japanese for now; may be localized later.
// - For MVP, only English (en) is active; en has a full country list.
// - ja, ko, zh are placeholders for future expansion; fill their country lists
//   when the language is enabled in TARGET_LANGUAGE_OPTIONS.
export type CountryOption = { value: string; label: string }

const COUNTRIES_EN = [
  { value: 'US', label: 'アメリカ' },
  { value: 'GB', label: 'イギリス' },
  { value: 'AU', label: 'オーストラリア' },
  { value: 'CA', label: 'カナダ' },
  { value: 'NZ', label: 'ニュージーランド' },
] as const

export const COUNTRY_BY_LANGUAGE = {
  en: COUNTRIES_EN,
  ja: [] as const,
  ko: [] as const,
  zh: [] as const,
} as const satisfies Record<TargetLanguageCode, readonly CountryOption[]>

/** Country code for user profile; valid values come from COUNTRY_BY_LANGUAGE. */
export type TargetCountryCode =
  (typeof COUNTRY_BY_LANGUAGE)[keyof typeof COUNTRY_BY_LANGUAGE][number]['value']

/** Current level (MVP: beginner, intermediate, advanced) */
export const CURRENT_LEVEL_OPTIONS: readonly OptionItem<'beginner' | 'intermediate' | 'advanced'>[] = [
  { value: 'beginner', label: '初級' },
  { value: 'intermediate', label: '中級' },
  { value: 'advanced', label: '上級' },
] as const

export type CurrentLevel = (typeof CURRENT_LEVEL_OPTIONS)[number]['value']

/** Preferred session length (MVP: short, standard, deep) */
export const PREFERRED_SESSION_LENGTH_OPTIONS: readonly OptionItem<'short' | 'standard' | 'deep'>[] = [
  { value: 'short', label: '短い' },
  { value: 'standard', label: '標準' },
  { value: 'deep', label: '長め' },
] as const

export type PreferredSessionLength =
  (typeof PREFERRED_SESSION_LENGTH_OPTIONS)[number]['value']
