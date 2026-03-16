/**
 * Admin language registry repository: DB operations for admin management.
 * Sits above Supabase and below future admin API/UI. Does not widen runtime behavior.
 */
import { createClient } from '@supabase/supabase-js'
import {
  type LanguageRegistryAdminFieldErrorMap,
  type LanguageRegistryAdminInput,
  type RawLanguageRegistryAdminPayload,
  parseLanguageRegistryAdminInput,
} from '@/lib/language-registry-admin-contract'
import { evaluateLanguageOnboardingStatus } from '@/lib/language-onboarding-evaluation'
import type { LanguageOnboardingEvaluationResult } from '@/lib/language-onboarding-evaluation'

const ADMIN_REGISTRY_COLUMNS =
  'id,code,english_name,native_name,enabled_for_ui,enabled_for_learning,rtl,status,supports_tts,supports_stt,supports_ai_generation,sort_order,created_at,updated_at' as const

type AdminRegistryRow = {
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

/** Explicit payload for language_registry upsert; no id/created_at. */
type LanguageRegistryUpsertPayload = {
  code: string
  english_name: string
  native_name: string
  enabled_for_ui: boolean
  enabled_for_learning: boolean
  rtl: boolean
  status: AdminRegistryRow['status']
  supports_tts: boolean
  supports_stt: boolean
  supports_ai_generation: boolean
  sort_order: number
  updated_at: string
}

/** Admin view: persisted DB fields (camelCase), timestamps, and onboarding evaluation for the code. */
export type AdminLanguageRegistryEntry = {
  id: string
  code: string
  englishName: string
  nativeName: string
  enabledForUi: boolean
  enabledForLearning: boolean
  rtl: boolean
  status: AdminRegistryRow['status']
  supportsTts: boolean
  supportsStt: boolean
  supportsAiGeneration: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
  onboardingEvaluation: LanguageOnboardingEvaluationResult
}

export type UpsertLanguageRegistryForAdminResult =
  | { ok: true; entry: AdminLanguageRegistryEntry }
  | { ok: false; validationErrors: LanguageRegistryAdminFieldErrorMap }
  | { ok: false; repositoryError: string }

function getServerSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/** Normalize Supabase array response to AdminRegistryRow[]. */
function toAdminRegistryRows(data: unknown): AdminRegistryRow[] {
  if (data == null) return []
  return Array.isArray(data) ? (data as AdminRegistryRow[]) : []
}

/** Normalize Supabase single-row response to AdminRegistryRow | null. */
function toAdminRegistryRowOrNull(data: unknown): AdminRegistryRow | null {
  if (data == null || typeof data !== 'object') return null
  return data as AdminRegistryRow
}

function mapRowToAdminEntry(row: AdminRegistryRow): AdminLanguageRegistryEntry {
  const trimmedCode = row.code.trim()
  return {
    id: row.id,
    code: trimmedCode,
    englishName: (row.english_name ?? '').trim(),
    nativeName: (row.native_name ?? '').trim(),
    enabledForUi: row.enabled_for_ui,
    enabledForLearning: row.enabled_for_learning,
    rtl: row.rtl,
    status: row.status,
    supportsTts: row.supports_tts,
    supportsStt: row.supports_stt,
    supportsAiGeneration: row.supports_ai_generation,
    sortOrder: Number.isFinite(row.sort_order) ? row.sort_order : 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    onboardingEvaluation: evaluateLanguageOnboardingStatus(trimmedCode),
  }
}

function inputToDbPayload(input: LanguageRegistryAdminInput): LanguageRegistryUpsertPayload {
  return {
    code: input.code,
    english_name: input.englishName,
    native_name: input.nativeName,
    enabled_for_ui: input.enabledForUi,
    enabled_for_learning: input.enabledForLearning,
    rtl: input.rtl,
    status: input.status,
    supports_tts: input.supportsTts,
    supports_stt: input.supportsStt,
    supports_ai_generation: input.supportsAiGeneration,
    sort_order: input.sortOrder,
    updated_at: new Date().toISOString(),
  }
}

/** Lists all registry entries for admin; order: sort_order asc, english_name asc, code asc. */
export async function listLanguageRegistryEntriesForAdmin(): Promise<
  AdminLanguageRegistryEntry[]
> {
  const supabase = getServerSupabase()
  const { data, error } = await supabase
    .from('language_registry')
    .select(ADMIN_REGISTRY_COLUMNS)
    .order('sort_order', { ascending: true })
    .order('english_name', { ascending: true })
    .order('code', { ascending: true })

  if (error) throw new Error(`Admin language registry list: ${error.message}`)
  return toAdminRegistryRows(data).map(mapRowToAdminEntry)
}

/** Returns a single registry entry by code or null. */
export async function getLanguageRegistryEntryByCodeForAdmin(
  code: string
): Promise<AdminLanguageRegistryEntry | null> {
  const trimmed = code.trim()
  if (trimmed === '') return null

  const supabase = getServerSupabase()
  const { data, error } = await supabase
    .from('language_registry')
    .select(ADMIN_REGISTRY_COLUMNS)
    .eq('code', trimmed)
    .maybeSingle()

  if (error) throw new Error(`Admin language registry get: ${error.message}`)
  const row = toAdminRegistryRowOrNull(data)
  return row ? mapRowToAdminEntry(row) : null
}

/** Normalizes and validates input, then upserts by code. Invalid input does not hit DB. */
export async function upsertLanguageRegistryEntryForAdmin(
  rawInput: RawLanguageRegistryAdminPayload
): Promise<UpsertLanguageRegistryForAdminResult> {
  const parsed = parseLanguageRegistryAdminInput(rawInput)
  if (!parsed.ok)
    return { ok: false, validationErrors: parsed.errors }

  const input = parsed.value
  const payload = inputToDbPayload(input)
  const supabase = getServerSupabase()

  const { data, error } = await supabase
    .from('language_registry')
    .upsert(payload, { onConflict: 'code' })
    .select(ADMIN_REGISTRY_COLUMNS)
    .single()

  if (error)
    return { ok: false, repositoryError: error.message }
  const row = toAdminRegistryRowOrNull(data)
  if (!row) return { ok: false, repositoryError: 'Upsert returned no row' }
  return { ok: true, entry: mapRowToAdminEntry(row) }
}
