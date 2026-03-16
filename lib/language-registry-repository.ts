/**
 * Language registry repository: reads language settings from DB.
 * DB language_registry may contain dynamic (admin-added) languages; we persist and
 * return them as string codes. AppLocale / LearningLanguage are current built-in
 * compatibility types used for defaults and compatibility gates; a future migration
 * can widen user preferences once UI/runtime are fully dynamic.
 */
import { createClient } from '@supabase/supabase-js'
import {
  type AppLocale,
  type LearningLanguage,
  type UserLanguagePreferences,
  DEFAULT_APP_LOCALE,
  DEFAULT_LEARNING_LANGUAGE,
  DEFAULT_BASE_LANGUAGE,
  isSupportedAppLocale,
  isSupportedLearningLanguage,
} from '@/lib/platform-language-config'
import { resolveUserLanguagePreferencesFromPersisted } from '@/lib/user-language-preferences-integration'

/** Language code as stored in DB; may include future dynamic codes beyond the built-in set. */
export type PersistedLanguageCode = string

const LANGUAGE_REGISTRY_COLUMNS =
  'id,code,english_name,native_name,enabled_for_ui,enabled_for_learning,rtl,status,supports_tts,supports_stt,supports_ai_generation,sort_order,created_at,updated_at' as const

const USER_LANGUAGE_PREFERENCES_COLUMNS =
  'user_id,app_locale,learning_language,base_language,cefr_level,preferred_region,preferred_age_band,created_at,updated_at' as const

export function normalizePersistedLanguageCode(value: string): string {
  return value.trim()
}

export function normalizeOptionalText(value: string | null): string | null {
  if (value == null) return null
  return value.trim()
}

function getServerSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function toLanguageRegistryRows(data: unknown): LanguageRegistryRow[] {
  if (data == null) return []
  return Array.isArray(data) ? (data as LanguageRegistryRow[]) : []
}

function toUserLanguagePreferencesRow(
  data: unknown
): UserLanguagePreferencesRow | null {
  if (data == null || typeof data !== 'object') return null
  return data as UserLanguagePreferencesRow
}

type LanguageRegistryRow = {
  id: string
  code: string
  english_name: string
  native_name: string
  enabled_for_ui: boolean
  enabled_for_learning: boolean
  rtl: boolean
  status: 'draft' | 'beta' | 'active' | 'disabled'
  supports_tts: boolean
  supports_stt: boolean
  supports_ai_generation: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

type UserLanguagePreferencesRow = {
  user_id: string
  app_locale: string
  learning_language: string
  base_language: string
  cefr_level: UserLanguagePreferences['cefrLevel']
  preferred_region: string | null
  preferred_age_band: string | null
  created_at: string
  updated_at: string
}

export type LanguageRegistryItem = {
  id: string
  code: PersistedLanguageCode
  englishName: string
  nativeName: string
  enabledForUi: boolean
  enabledForLearning: boolean
  rtl: boolean
  status: 'draft' | 'beta' | 'active' | 'disabled'
  supportsTts: boolean
  supportsStt: boolean
  supportsAiGeneration: boolean
  sortOrder: number
}

export function isPersistedLanguageCode(
  value: string
): value is PersistedLanguageCode {
  return value.trim().length > 0
}

/** Deduplicates array by identity preserving first occurrence order; T must be usable as Set key. */
function dedupePreserveOrder<T extends string>(arr: readonly T[]): T[] {
  const seen = new Set<T>()
  const out: T[] = []
  for (const x of arr) {
    if (seen.has(x)) continue
    seen.add(x)
    out.push(x)
  }
  return out
}

function mapValidRegistryRows(
  rows: LanguageRegistryRow[]
): LanguageRegistryItem[] {
  const items: LanguageRegistryItem[] = []
  for (const row of rows) {
    const item = mapLanguageRegistryRowToItem(row)
    if (item) items.push(item)
  }
  return items
}

export function mapLanguageRegistryRowToItem(
  row: LanguageRegistryRow
): LanguageRegistryItem | null {
  const code = normalizePersistedLanguageCode(row.code)
  if (!isPersistedLanguageCode(code)) return null
  const rawEnglish = normalizeOptionalText(row.english_name ?? null) ?? ''
  const rawNative = normalizeOptionalText(row.native_name ?? null) ?? ''
  const englishName = rawEnglish.length > 0 ? rawEnglish : code
  const nativeName = rawNative.length > 0 ? rawNative : englishName
  return {
    id: row.id,
    code,
    englishName,
    nativeName,
    enabledForUi: row.enabled_for_ui,
    enabledForLearning: row.enabled_for_learning,
    rtl: row.rtl,
    status: row.status,
    supportsTts: row.supports_tts,
    supportsStt: row.supports_stt,
    supportsAiGeneration: row.supports_ai_generation,
    sortOrder: row.sort_order,
  }
}

/** preferred_region / preferred_age_band exist in DB for future personalization but are not returned yet; resolution delegated to integration layer. */
export function mapUserLanguagePreferencesRow(
  row: UserLanguagePreferencesRow
): UserLanguagePreferences {
  const resolved = resolveUserLanguagePreferencesFromPersisted({
    appLocale: row.app_locale,
    learningLanguage: row.learning_language,
    baseLanguage: row.base_language,
    cefrLevel: row.cefr_level ?? undefined,
  })
  return resolved.preferences
}

export async function getActiveLanguageRegistry(): Promise<
  LanguageRegistryItem[]
> {
  const supabase = getServerSupabase()
  const { data, error } = await supabase
    .from('language_registry')
    .select(LANGUAGE_REGISTRY_COLUMNS)
    .in('status', ['active', 'beta'])
    .order('sort_order', { ascending: true })
    .order('english_name', { ascending: true })

  if (error) throw new Error(`Language registry: ${error.message}`)

  return mapValidRegistryRows(toLanguageRegistryRows(data))
}

/** Only built-in locales returned for current runtime compatibility; DB may contain more languages that future runtime layers will support. */
export async function getSupportedUiLocalesFromDb(): Promise<AppLocale[]> {
  const registry = await getActiveLanguageRegistry()
  const codes = registry
    .filter(
      (item): item is LanguageRegistryItem & { code: AppLocale } =>
        item.enabledForUi && isSupportedAppLocale(item.code)
    )
    .map((item) => item.code)
  return dedupePreserveOrder(codes)
}

/** Only built-in learning languages returned for current runtime compatibility; DB may contain more languages that future runtime layers will support. */
export async function getSupportedLearningLanguagesFromDb(): Promise<
  LearningLanguage[]
> {
  const registry = await getActiveLanguageRegistry()
  const codes = registry
    .filter(
      (item): item is LanguageRegistryItem & { code: LearningLanguage } =>
        item.enabledForLearning && isSupportedLearningLanguage(item.code)
    )
    .map((item) => item.code)
  return dedupePreserveOrder(codes)
}

function createDefaultUserLanguagePreferences(): UserLanguagePreferences {
  return {
    appLocale: DEFAULT_APP_LOCALE,
    learningLanguage: DEFAULT_LEARNING_LANGUAGE,
    baseLanguage: DEFAULT_BASE_LANGUAGE,
    cefrLevel: null,
  }
}

export async function getUserLanguagePreferences(
  userId: string
): Promise<UserLanguagePreferences> {
  const trimmedUserId = userId.trim()
  if (trimmedUserId === '') return createDefaultUserLanguagePreferences()

  const supabase = getServerSupabase()
  const { data, error } = await supabase
    .from('user_language_preferences')
    .select(USER_LANGUAGE_PREFERENCES_COLUMNS)
    .eq('user_id', trimmedUserId)
    .maybeSingle()

  if (error) throw new Error(`User language preferences: ${error.message}`)

  const row = toUserLanguagePreferencesRow(data)
  if (row == null) return createDefaultUserLanguagePreferences()

  return mapUserLanguagePreferencesRow(row)
}
