/**
 * Unit tests for language-onboarding-evaluation.
 * Run with: node --import tsx --test lib/language-onboarding-evaluation.test.ts
 */
import test from 'node:test'
import assert from 'node:assert'
import { evaluateLanguageOnboardingStatus } from './language-onboarding-evaluation'
import {
  BUILT_IN_APP_LOCALES,
  BUILT_IN_LEARNING_LANGUAGES,
} from './platform-language-config'

// Tests use production config as source of truth where practical to avoid drift.

const appLocaleSet = new Set(BUILT_IN_APP_LOCALES)
const learningLanguageSet = new Set(BUILT_IN_LEARNING_LANGUAGES)

function findUiOnlyCode(): string | undefined {
  return BUILT_IN_APP_LOCALES.find((c) => !learningLanguageSet.has(c))
}

function findLearningOnlyCode(): string | undefined {
  return BUILT_IN_LEARNING_LANGUAGES.find((c) => !appLocaleSet.has(c))
}

function findOverlapCode(): string | undefined {
  return BUILT_IN_APP_LOCALES.find((c) => learningLanguageSet.has(c))
}

test('empty string returns invalid_empty_code and all exposure false', () => {
  const result = evaluateLanguageOnboardingStatus('')
  assert.strictEqual(result.classification, 'invalid_empty_code')
  assert.strictEqual(result.persistedCodePresent, false)
  assert.strictEqual(result.runtimeUiCompatible, false)
  assert.strictEqual(result.runtimeLearningCompatible, false)
  assert.strictEqual(result.eligibleForUiExposureNow, false)
  assert.strictEqual(result.eligibleForLearningExposureNow, false)
  assert.strictEqual(result.persistedCode, '')
})

test('whitespace-only string is trimmed and treated as invalid_empty_code', () => {
  const result = evaluateLanguageOnboardingStatus('   \t  ')
  assert.strictEqual(result.classification, 'invalid_empty_code')
  assert.strictEqual(result.persistedCodePresent, false)
  assert.strictEqual(result.persistedCode, '')
})

test('supported built-in app locale only', (t) => {
  const code = findUiOnlyCode()
  if (code == null) {
    t.skip('No built-in code is app-locale-only in current config')
    return
  }
  const result = evaluateLanguageOnboardingStatus(code)
  assert.strictEqual(result.classification, 'built_in_ui_only_ready')
  assert.strictEqual(result.runtimeUiCompatible, true)
  assert.strictEqual(result.runtimeLearningCompatible, false)
})

test('supported built-in learning language only', (t) => {
  const code = findLearningOnlyCode()
  if (code == null) {
    t.skip('No built-in code is learning-language-only in current config')
    return
  }
  const result = evaluateLanguageOnboardingStatus(code)
  assert.strictEqual(result.classification, 'built_in_learning_only_ready')
  assert.strictEqual(result.runtimeUiCompatible, false)
  assert.strictEqual(result.runtimeLearningCompatible, true)
})

test('supported code that is both UI and learning compatible', () => {
  const code = findOverlapCode()
  assert.ok(code != null, 'at least one built-in code must be both app locale and learning language')
  const result = evaluateLanguageOnboardingStatus(code)
  assert.strictEqual(result.classification, 'built_in_ui_and_learning_ready')
  assert.strictEqual(result.runtimeUiCompatible, true)
  assert.strictEqual(result.runtimeLearningCompatible, true)
  assert.strictEqual(result.eligibleForUiExposureNow, true)
  assert.strictEqual(result.eligibleForLearningExposureNow, true)
  assert.strictEqual(result.persistedCodePresent, true)
  assert.strictEqual(result.persistedCode, code)
})

test('unsupported non-empty code returns persisted_but_not_runtime_ready', () => {
  const result = evaluateLanguageOnboardingStatus('xx')
  assert.strictEqual(result.classification, 'persisted_but_not_runtime_ready')
  assert.strictEqual(result.persistedCodePresent, true)
  assert.strictEqual(result.runtimeUiCompatible, false)
  assert.strictEqual(result.runtimeLearningCompatible, false)
  assert.strictEqual(result.eligibleForUiExposureNow, false)
  assert.strictEqual(result.eligibleForLearningExposureNow, false)
  assert.strictEqual(result.persistedCode, 'xx')
})

test('trimming: supported code with surrounding whitespace yields trimmed persistedCode and correct classification', () => {
  const code = findOverlapCode()
  assert.ok(code != null, 'at least one built-in code must be both app locale and learning language')
  const result = evaluateLanguageOnboardingStatus(`  ${code}  `)
  assert.strictEqual(result.persistedCode, code)
  assert.strictEqual(result.classification, 'built_in_ui_and_learning_ready')
  assert.strictEqual(result.runtimeUiCompatible, true)
  assert.strictEqual(result.runtimeLearningCompatible, true)
})
