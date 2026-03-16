/**
 * Unit tests for language-registry-admin-contract.
 * Run with: node --import tsx --test lib/language-registry-admin-contract.test.ts
 */
import test from 'node:test'
import assert from 'node:assert'
import {
  LANGUAGE_REGISTRY_STATUSES,
  isLanguageRegistryStatus,
  normalizeLanguageRegistryAdminInput,
  parseLanguageRegistryAdminInput,
  validateLanguageRegistryAdminInput,
} from './language-registry-admin-contract'

const validStatus = LANGUAGE_REGISTRY_STATUSES[0]
const validInput = {
  code: 'en',
  englishName: 'English',
  nativeName: 'English',
  enabledForUi: true,
  enabledForLearning: true,
  rtl: false,
  status: validStatus,
  supportsTts: true,
  supportsStt: true,
  supportsAiGeneration: true,
  sortOrder: 0,
}

const booleanFields = [
  'enabledForUi',
  'enabledForLearning',
  'rtl',
  'supportsTts',
  'supportsStt',
  'supportsAiGeneration',
] as const
const booleanCases: Array<[unknown, boolean]> = [
  [true, true],
  [false, false],
  ['true', true],
  ['false', false],
  ['1', true],
  ['0', false],
  [null, false],
  [undefined, false],
]

test('normalizeLanguageRegistryAdminInput trims code, englishName, nativeName', () => {
  const out = normalizeLanguageRegistryAdminInput({
    code: '  en  ',
    englishName: '  English  ',
    nativeName: '  English  ',
  })
  assert.strictEqual(out.code, 'en')
  assert.strictEqual(out.englishName, 'English')
  assert.strictEqual(out.nativeName, 'English')
})

test('normalizeLanguageRegistryAdminInput converts boolean fields correctly', () => {
  for (const field of booleanFields) {
    for (const [raw, expected] of booleanCases) {
      const out = normalizeLanguageRegistryAdminInput({ [field]: raw })
      assert.strictEqual(out[field], expected, `${String(field)} with ${String(raw)}`)
    }
  }
})

test('normalizeLanguageRegistryAdminInput converts sortOrder correctly', () => {
  assert.strictEqual(normalizeLanguageRegistryAdminInput({ sortOrder: 5 }).sortOrder, 5)
  assert.strictEqual(normalizeLanguageRegistryAdminInput({ sortOrder: '10' }).sortOrder, 10)
  assert.strictEqual(normalizeLanguageRegistryAdminInput({ sortOrder: 'x' }).sortOrder, 0)
  assert.strictEqual(normalizeLanguageRegistryAdminInput({ sortOrder: null }).sortOrder, 0)
  assert.strictEqual(normalizeLanguageRegistryAdminInput({ sortOrder: undefined }).sortOrder, 0)
})

test('normalizeLanguageRegistryAdminInput normalizes status: valid unchanged, invalid raw becomes draft', () => {
  for (const s of LANGUAGE_REGISTRY_STATUSES) {
    const out = normalizeLanguageRegistryAdminInput({ status: s })
    assert.strictEqual(out.status, s)
  }
  assert.strictEqual(normalizeLanguageRegistryAdminInput({ status: 'invalid' }).status, 'draft')
  assert.strictEqual(normalizeLanguageRegistryAdminInput({ status: null }).status, 'draft')
})

test('validateLanguageRegistryAdminInput rejects empty code', () => {
  const result = validateLanguageRegistryAdminInput({ ...validInput, code: '' })
  assert.strictEqual(result.ok, false)
  assert.ok('code' in result.errors && result.errors.code)
})

test('validateLanguageRegistryAdminInput rejects empty englishName', () => {
  const result = validateLanguageRegistryAdminInput({ ...validInput, englishName: '' })
  assert.strictEqual(result.ok, false)
  assert.ok('englishName' in result.errors && result.errors.englishName)
})

test('validateLanguageRegistryAdminInput rejects empty nativeName', () => {
  const result = validateLanguageRegistryAdminInput({ ...validInput, nativeName: '' })
  assert.strictEqual(result.ok, false)
  assert.ok('nativeName' in result.errors && result.errors.nativeName)
})

test('validateLanguageRegistryAdminInput rejects non-finite sortOrder', () => {
  const result = validateLanguageRegistryAdminInput({ ...validInput, sortOrder: NaN })
  assert.strictEqual(result.ok, false)
  assert.ok('sortOrder' in result.errors && result.errors.sortOrder)
})

test('validateLanguageRegistryAdminInput returns ok true for valid input', () => {
  const result = validateLanguageRegistryAdminInput(validInput)
  assert.strictEqual(result.ok, true)
  assert.strictEqual(result.value.code, validInput.code)
})

test('parseLanguageRegistryAdminInput performs normalize then validate; omitted booleans default false', () => {
  const parsed = parseLanguageRegistryAdminInput({
    code: '  ja  ',
    englishName: '  Japanese  ',
    nativeName: '  日本語  ',
    status: 'active',
    sortOrder: 1,
  })
  assert.strictEqual(parsed.ok, true)
  assert.strictEqual(parsed.value.code, 'ja')
  assert.strictEqual(parsed.value.englishName, 'Japanese')
  assert.strictEqual(parsed.value.nativeName, '日本語')
  assert.strictEqual(parsed.value.status, 'active')
  assert.strictEqual(parsed.value.sortOrder, 1)
  assert.strictEqual(parsed.value.enabledForUi, false)
  assert.strictEqual(parsed.value.enabledForLearning, false)
  assert.strictEqual(parsed.value.rtl, false)
  assert.strictEqual(parsed.value.supportsTts, false)
  assert.strictEqual(parsed.value.supportsStt, false)
  assert.strictEqual(parsed.value.supportsAiGeneration, false)
})

test('parseLanguageRegistryAdminInput returns errors when validation fails', () => {
  const parsed = parseLanguageRegistryAdminInput({ code: '', englishName: '', nativeName: '' })
  assert.strictEqual(parsed.ok, false)
  assert.ok(Object.keys(parsed.errors).length > 0)
})

test('isLanguageRegistryStatus returns true only for LANGUAGE_REGISTRY_STATUSES', () => {
  for (const s of LANGUAGE_REGISTRY_STATUSES) {
    assert.strictEqual(isLanguageRegistryStatus(s), true)
  }
  assert.strictEqual(isLanguageRegistryStatus('invalid'), false)
  assert.strictEqual(isLanguageRegistryStatus(''), false)
  assert.strictEqual(isLanguageRegistryStatus(null), false)
  assert.strictEqual(isLanguageRegistryStatus(123), false)
})
