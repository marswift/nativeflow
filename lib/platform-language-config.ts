/**
 * Built-in language compatibility layer for NativeFlow.
 * Defines only the languages shipped in code. DB-added languages live in the
 * registry/repository layer. User preference and runtime widening will follow later.
 *
 * - app locale: UI language (menus, labels, buttons).
 * - learning language: target language the learner studies.
 * - base language: language for explanations, glosses, hints (e.g. L1).
 */

export type BuiltInLanguageCode =
  | 'en'
  | 'ja'
  | 'ko'
  | 'es'
  | 'fr'
  | 'de'
  | 'zh-CN'
  | 'zh-TW'

export type AppLocale = BuiltInLanguageCode
export type LearningLanguage = BuiltInLanguageCode

export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'

export type LanguageCatalogItem = {
  code: BuiltInLanguageCode
  englishName: string
  nativeName: string
  enabledForLearning: boolean
  enabledForUi: boolean
  rtl: boolean
}

function isEnabledAppLocale(
  item: LanguageCatalogItem
): item is LanguageCatalogItem & { code: AppLocale } {
  return item.enabledForUi
}

function isEnabledLearningLanguage(
  item: LanguageCatalogItem
): item is LanguageCatalogItem & { code: LearningLanguage } {
  return item.enabledForLearning
}

/** Built-in languages only; DB-driven registry holds admin-added languages. */
export const BUILT_IN_LANGUAGE_CATALOG: readonly LanguageCatalogItem[] = [
  {
    code: 'en',
    englishName: 'English',
    nativeName: 'English',
    enabledForLearning: true,
    enabledForUi: true,
    rtl: false,
  },
  {
    code: 'ja',
    englishName: 'Japanese',
    nativeName: '日本語',
    enabledForLearning: true,
    enabledForUi: true,
    rtl: false,
  },
  {
    code: 'ko',
    englishName: 'Korean',
    nativeName: '한국어',
    enabledForLearning: true,
    enabledForUi: true,
    rtl: false,
  },
  {
    code: 'es',
    englishName: 'Spanish',
    nativeName: 'Español',
    enabledForLearning: true,
    enabledForUi: true,
    rtl: false,
  },
  {
    code: 'fr',
    englishName: 'French',
    nativeName: 'Français',
    enabledForLearning: true,
    enabledForUi: true,
    rtl: false,
  },
  {
    code: 'de',
    englishName: 'German',
    nativeName: 'Deutsch',
    enabledForLearning: true,
    enabledForUi: true,
    rtl: false,
  },
  {
    code: 'zh-CN',
    englishName: 'Chinese (Simplified)',
    nativeName: '简体中文',
    enabledForLearning: true,
    enabledForUi: true,
    rtl: false,
  },
  {
    code: 'zh-TW',
    englishName: 'Chinese (Traditional)',
    nativeName: '繁體中文',
    enabledForLearning: true,
    enabledForUi: true,
    rtl: false,
  },
]

export const BUILT_IN_APP_LOCALES: readonly AppLocale[] =
  BUILT_IN_LANGUAGE_CATALOG.filter(isEnabledAppLocale).map((item) => item.code)

export const BUILT_IN_LEARNING_LANGUAGES: readonly LearningLanguage[] =
  BUILT_IN_LANGUAGE_CATALOG.filter(isEnabledLearningLanguage).map(
    (item) => item.code
  )

export type UserLanguagePreferences = {
  appLocale: AppLocale
  learningLanguage: LearningLanguage
  baseLanguage: LearningLanguage
  cefrLevel: CefrLevel | null
}

export type FutureRealtimeLanguageContext = {
  appLocale: AppLocale
  learningLanguage: LearningLanguage
  baseLanguage: LearningLanguage
  autoTranslateCaptionsTo: LearningLanguage | null
  autoTranslateChatTo: LearningLanguage | null
}

export function isSupportedAppLocale(value: string): value is AppLocale {
  return BUILT_IN_APP_LOCALES.some((locale) => locale === value)
}

export function isSupportedLearningLanguage(
  value: string
): value is LearningLanguage {
  return BUILT_IN_LEARNING_LANGUAGES.some((lang) => lang === value)
}

export function getLanguageCatalogItem(
  code: AppLocale | LearningLanguage
): LanguageCatalogItem | null {
  return (
    BUILT_IN_LANGUAGE_CATALOG.find((item) => item.code === code) ?? null
  )
}

export const DEFAULT_APP_LOCALE: AppLocale = 'en'
export const DEFAULT_LEARNING_LANGUAGE: LearningLanguage = 'en'
export const DEFAULT_BASE_LANGUAGE: LearningLanguage = 'ja'
