/**
 * Evaluates persisted language codes for onboarding / runtime exposure readiness.
 * Admin or DB presence of a code does not imply runtime exposure; this layer helps
 * future onboarding sequencing without widening runtime behavior now.
 */
import {
  isSupportedAppLocale,
  isSupportedLearningLanguage,
} from '@/lib/platform-language-config'

export type LanguageOnboardingClassification =
  | 'invalid_empty_code'
  | 'built_in_ui_and_learning_ready'
  | 'built_in_ui_only_ready'
  | 'built_in_learning_only_ready'
  | 'persisted_but_not_runtime_ready'

export type LanguageOnboardingEvaluationResult = {
  persistedCode: string
  classification: LanguageOnboardingClassification
  persistedCodePresent: boolean
  runtimeUiCompatible: boolean
  runtimeLearningCompatible: boolean
  /** Eligible for UI exposure under current strict runtime rules only. */
  eligibleForUiExposureNow: boolean
  /** Eligible for learning exposure under current strict runtime rules only. */
  eligibleForLearningExposureNow: boolean
}

function trimCode(value: string): string {
  return (value ?? '').trim()
}

function classify(
  code: string,
  uiCompat: boolean,
  learningCompat: boolean
): LanguageOnboardingClassification {
  if (code.length === 0) return 'invalid_empty_code'
  if (uiCompat && learningCompat) return 'built_in_ui_and_learning_ready'
  if (uiCompat) return 'built_in_ui_only_ready'
  if (learningCompat) return 'built_in_learning_only_ready'
  return 'persisted_but_not_runtime_ready'
}

/** Evaluates a persisted language code for runtime/onboarding readiness; pure, no DB. */
export function evaluateLanguageOnboardingStatus(
  persistedCode: string
): LanguageOnboardingEvaluationResult {
  const code = trimCode(persistedCode)
  const persistedCodePresent = code.length > 0
  const runtimeUiCompatible = isSupportedAppLocale(code)
  const runtimeLearningCompatible = isSupportedLearningLanguage(code)

  // Exposure eligibility = strict runtime compatibility only under current architecture; evolve here when rules widen.
  const eligibleForUiExposureNow = runtimeUiCompatible
  const eligibleForLearningExposureNow = runtimeLearningCompatible

  const classification = classify(
    code,
    runtimeUiCompatible,
    runtimeLearningCompatible
  )

  return {
    persistedCode: code,
    classification,
    persistedCodePresent,
    runtimeUiCompatible,
    runtimeLearningCompatible,
    eligibleForUiExposureNow,
    eligibleForLearningExposureNow,
  }
}
