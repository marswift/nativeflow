/**
 * Unit tests for user-language-preferences-integration.
 * Run with: npx tsx lib/user-language-preferences-integration.test.ts
 * Or add Vitest and run: npx vitest run lib/user-language-preferences-integration
 */
import assert from 'assert'
import {
  BUILT_IN_APP_LOCALES,
  BUILT_IN_LEARNING_LANGUAGES,
  DEFAULT_APP_LOCALE,
  DEFAULT_LEARNING_LANGUAGE,
  DEFAULT_BASE_LANGUAGE,
} from './platform-language-config'
import { resolveUserLanguagePreferencesFromPersisted } from './user-language-preferences-integration'

// Tests use production config as source of truth for supported values to avoid drift.

const tests: Array<{ name: string; fn: () => void }> = []
function test(name: string, fn: () => void) {
  tests.push({ name, fn })
}

test('supported built-in values resolve without fallback', () => {
  const result = resolveUserLanguagePreferencesFromPersisted({
    appLocale: DEFAULT_APP_LOCALE,
    learningLanguage: DEFAULT_LEARNING_LANGUAGE,
    baseLanguage: DEFAULT_BASE_LANGUAGE,
  })
  assert.strictEqual(result.preferences.appLocale, DEFAULT_APP_LOCALE)
  assert.strictEqual(result.preferences.learningLanguage, DEFAULT_LEARNING_LANGUAGE)
  assert.strictEqual(result.preferences.baseLanguage, DEFAULT_BASE_LANGUAGE)
  assert.strictEqual(result.report.appLocale.usedFallback, false)
  assert.strictEqual(result.report.learningLanguage.usedFallback, false)
  assert.strictEqual(result.report.baseLanguage.usedFallback, false)
  assert.strictEqual(result.report.appLocale.persistedValue, DEFAULT_APP_LOCALE)
  assert.strictEqual(result.report.learningLanguage.persistedValue, DEFAULT_LEARNING_LANGUAGE)
  assert.strictEqual(result.report.baseLanguage.persistedValue, DEFAULT_BASE_LANGUAGE)
})

test('unsupported appLocale falls back to DEFAULT_APP_LOCALE', () => {
  const result = resolveUserLanguagePreferencesFromPersisted({
    appLocale: 'xx',
    learningLanguage: DEFAULT_LEARNING_LANGUAGE,
    baseLanguage: DEFAULT_BASE_LANGUAGE,
  })
  assert.strictEqual(result.preferences.appLocale, DEFAULT_APP_LOCALE)
  assert.strictEqual(result.report.appLocale.usedFallback, true)
  assert.strictEqual(result.report.appLocale.persistedValue, 'xx')
})

test('unsupported learningLanguage falls back to DEFAULT_LEARNING_LANGUAGE', () => {
  const result = resolveUserLanguagePreferencesFromPersisted({
    appLocale: DEFAULT_APP_LOCALE,
    learningLanguage: 'zz',
    baseLanguage: DEFAULT_BASE_LANGUAGE,
  })
  assert.strictEqual(result.preferences.learningLanguage, DEFAULT_LEARNING_LANGUAGE)
  assert.strictEqual(result.report.learningLanguage.usedFallback, true)
  assert.strictEqual(result.report.learningLanguage.persistedValue, 'zz')
})

test('unsupported baseLanguage falls back to DEFAULT_BASE_LANGUAGE', () => {
  const result = resolveUserLanguagePreferencesFromPersisted({
    appLocale: DEFAULT_APP_LOCALE,
    learningLanguage: DEFAULT_LEARNING_LANGUAGE,
    baseLanguage: 'yy',
  })
  assert.strictEqual(result.preferences.baseLanguage, DEFAULT_BASE_LANGUAGE)
  assert.strictEqual(result.report.baseLanguage.usedFallback, true)
  assert.strictEqual(result.report.baseLanguage.persistedValue, 'yy')
})

test('blank persisted strings fall back correctly', () => {
  const result = resolveUserLanguagePreferencesFromPersisted({
    appLocale: '',
    learningLanguage: '  ',
    baseLanguage: '\t',
  })
  assert.strictEqual(result.preferences.appLocale, DEFAULT_APP_LOCALE)
  assert.strictEqual(result.preferences.learningLanguage, DEFAULT_LEARNING_LANGUAGE)
  assert.strictEqual(result.preferences.baseLanguage, DEFAULT_BASE_LANGUAGE)
  assert.strictEqual(result.report.appLocale.usedFallback, true)
  assert.strictEqual(result.report.learningLanguage.usedFallback, true)
  assert.strictEqual(result.report.baseLanguage.usedFallback, true)
  assert.strictEqual(result.report.appLocale.persistedValue, '')
  assert.strictEqual(result.report.learningLanguage.persistedValue, '')
  assert.strictEqual(result.report.baseLanguage.persistedValue, '')
})

test('valid cefrLevel is preserved', () => {
  const result = resolveUserLanguagePreferencesFromPersisted({
    appLocale: DEFAULT_APP_LOCALE,
    learningLanguage: DEFAULT_LEARNING_LANGUAGE,
    baseLanguage: DEFAULT_BASE_LANGUAGE,
    cefrLevel: 'B2',
  })
  assert.strictEqual(result.preferences.cefrLevel, 'B2')
})

test('invalid cefrLevel becomes null', () => {
  const result = resolveUserLanguagePreferencesFromPersisted({
    appLocale: DEFAULT_APP_LOCALE,
    learningLanguage: DEFAULT_LEARNING_LANGUAGE,
    baseLanguage: DEFAULT_BASE_LANGUAGE,
    cefrLevel: 'X',
  })
  assert.strictEqual(result.preferences.cefrLevel, null)
})

test('report.usedFallback is correct for each field', () => {
  const supportedApp = BUILT_IN_APP_LOCALES[0]
  const supportedLearning = BUILT_IN_LEARNING_LANGUAGES[0]
  const supportedBase = BUILT_IN_LEARNING_LANGUAGES[1] ?? BUILT_IN_LEARNING_LANGUAGES[0]
  const result = resolveUserLanguagePreferencesFromPersisted({
    appLocale: supportedApp,
    learningLanguage: supportedLearning,
    baseLanguage: supportedBase,
  })
  assert.strictEqual(result.report.appLocale.usedFallback, false)
  assert.strictEqual(result.report.learningLanguage.usedFallback, false)
  assert.strictEqual(result.report.baseLanguage.usedFallback, false)
  assert.strictEqual(result.preferences.appLocale, supportedApp)
  assert.strictEqual(result.preferences.learningLanguage, supportedLearning)
  assert.strictEqual(result.preferences.baseLanguage, supportedBase)
})

test('report.persistedValue contains the trimmed persisted input', () => {
  const supportedApp = BUILT_IN_APP_LOCALES[0]
  const supportedLearning = BUILT_IN_LEARNING_LANGUAGES[0]
  const supportedBase = BUILT_IN_LEARNING_LANGUAGES[1] ?? BUILT_IN_LEARNING_LANGUAGES[0]
  const result = resolveUserLanguagePreferencesFromPersisted({
    appLocale: `  ${supportedApp}  `,
    learningLanguage: `  ${supportedLearning}  `,
    baseLanguage: `  ${supportedBase}  `,
  })
  assert.strictEqual(result.report.appLocale.persistedValue, supportedApp)
  assert.strictEqual(result.report.learningLanguage.persistedValue, supportedLearning)
  assert.strictEqual(result.report.baseLanguage.persistedValue, supportedBase)
  assert.strictEqual(result.preferences.appLocale, supportedApp)
  assert.strictEqual(result.preferences.learningLanguage, supportedLearning)
  assert.strictEqual(result.preferences.baseLanguage, supportedBase)
})

test('cefrLevel undefined yields null', () => {
  const result = resolveUserLanguagePreferencesFromPersisted({
    appLocale: DEFAULT_APP_LOCALE,
    learningLanguage: DEFAULT_LEARNING_LANGUAGE,
    baseLanguage: DEFAULT_BASE_LANGUAGE,
  })
  assert.strictEqual(result.preferences.cefrLevel, null)
})

test('cefrLevel null yields null', () => {
  const result = resolveUserLanguagePreferencesFromPersisted({
    appLocale: DEFAULT_APP_LOCALE,
    learningLanguage: DEFAULT_LEARNING_LANGUAGE,
    baseLanguage: DEFAULT_BASE_LANGUAGE,
    cefrLevel: null,
  })
  assert.strictEqual(result.preferences.cefrLevel, null)
})

// Run when executed directly (Node 16–compatible; no node:test required).
for (const t of tests) {
  try {
    t.fn()
    console.log('ok:', t.name)
  } catch (err) {
    console.error('fail:', t.name, err)
    process.exit(1)
  }
}
