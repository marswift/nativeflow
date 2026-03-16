/**
 * Admin contract for language registry management.
 * Admins can manage dynamic languages in the DB before the app runtime fully supports them;
 * providing this capability does not mean user/runtime widening is complete.
 */

export const LANGUAGE_REGISTRY_STATUSES = [
  'draft',
  'beta',
  'active',
  'disabled',
] as const

export type LanguageRegistryStatus =
  (typeof LANGUAGE_REGISTRY_STATUSES)[number]

export function isLanguageRegistryStatus(
  value: unknown
): value is LanguageRegistryStatus {
  return (
    typeof value === 'string' &&
    LANGUAGE_REGISTRY_STATUSES.some((s) => s === value)
  )
}

export type LanguageRegistryAdminEditableFields = {
  code: string
  englishName: string
  nativeName: string
  enabledForUi: boolean
  enabledForLearning: boolean
  rtl: boolean
  status: LanguageRegistryStatus
  supportsTts: boolean
  supportsStt: boolean
  supportsAiGeneration: boolean
  sortOrder: number
}

export type LanguageRegistryAdminInput = LanguageRegistryAdminEditableFields

/** Field-keyed validation errors; keys align with editable fields only. */
export type LanguageRegistryAdminFieldErrorMap = Partial<
  Record<keyof LanguageRegistryAdminEditableFields, string>
>

export type LanguageRegistryAdminValidationResult =
  | { ok: true; value: LanguageRegistryAdminInput }
  | { ok: false; errors: LanguageRegistryAdminFieldErrorMap }

/** Raw payload: unknown-valued shape of editable fields; keeps contract aligned when fields change. */
export type RawLanguageRegistryAdminPayload = {
  [K in keyof LanguageRegistryAdminEditableFields]?: unknown
}

function normalizeLanguageCode(value: unknown): string {
  if (value == null) return ''
  return String(value).trim()
}

function normalizeRequiredText(value: unknown): string {
  if (value == null) return ''
  return String(value).trim()
}

function toBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (value == null) return false
  const s = String(value).toLowerCase()
  return s === 'true' || s === '1'
}

function toSortOrder(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (value == null) return 0
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function normalizeStatus(value: unknown): LanguageRegistryStatus {
  const s = normalizeLanguageCode(value).toLowerCase()
  if (isLanguageRegistryStatus(s)) return s
  return 'draft'
}

/** Normalizes raw admin payload; does not validate. */
export function normalizeLanguageRegistryAdminInput(
  raw: RawLanguageRegistryAdminPayload
): LanguageRegistryAdminInput {
  return {
    code: normalizeLanguageCode(raw.code),
    englishName: normalizeRequiredText(raw.englishName),
    nativeName: normalizeRequiredText(raw.nativeName),
    enabledForUi: toBoolean(raw.enabledForUi),
    enabledForLearning: toBoolean(raw.enabledForLearning),
    rtl: toBoolean(raw.rtl),
    status: normalizeStatus(raw.status),
    supportsTts: toBoolean(raw.supportsTts),
    supportsStt: toBoolean(raw.supportsStt),
    supportsAiGeneration: toBoolean(raw.supportsAiGeneration),
    sortOrder: toSortOrder(raw.sortOrder),
  }
}

/** Validates normalized input; returns field-keyed errors when invalid. */
export function validateLanguageRegistryAdminInput(
  input: LanguageRegistryAdminInput
): LanguageRegistryAdminValidationResult {
  const errors: LanguageRegistryAdminFieldErrorMap = {}
  if (input.code.length === 0)
    errors.code = 'code is required and must be non-empty after trim'
  if (input.englishName.length === 0)
    errors.englishName =
      'englishName is required and must be non-empty after trim'
  if (input.nativeName.length === 0)
    errors.nativeName =
      'nativeName is required and must be non-empty after trim'
  if (!isLanguageRegistryStatus(input.status))
    errors.status = `status must be one of: ${LANGUAGE_REGISTRY_STATUSES.join(', ')}`
  if (!Number.isFinite(input.sortOrder))
    errors.sortOrder = 'sortOrder must be a finite number'
  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return { ok: true, value: input }
}

/** Normalizes then validates; single entry point for create/update preparation. */
export function parseLanguageRegistryAdminInput(
  raw: RawLanguageRegistryAdminPayload
): LanguageRegistryAdminValidationResult {
  return validateLanguageRegistryAdminInput(
    normalizeLanguageRegistryAdminInput(raw)
  )
}
