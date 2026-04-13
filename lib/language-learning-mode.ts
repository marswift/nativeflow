/**
 * Language Learning Mode — Language-aware lesson behavior configuration
 *
 * Determines whether a target language uses typing or audio-choice
 * for the response stage, and whether romanization is shown.
 *
 * Core rules:
 * - English: typing enabled, response stage = typing
 * - Non-English: typing disabled, response stage = audio_choice
 * - Romanization: always false (intentionally excluded from MVP)
 *
 * Learning order for non-English: sound → meaning → native script exposure
 */

export type ResponseStageType = 'typing' | 'audio_choice'

export type LanguageLearningMode = {
  /** Whether typing input is enabled for this language */
  enableTyping: boolean
  /** Which response stage to use */
  responseStage: ResponseStageType
  /** Whether to show romanization (always false in MVP) */
  showRomanization: false
  /** Whether this language uses Latin script natively */
  isLatinScript: boolean
}

// ── Language classification ──

const LATIN_SCRIPT_LANGUAGES = new Set([
  'en', 'es', 'fr', 'pt', 'it', 'de', 'nl', 'sv', 'no', 'pl', 'cs',
  'tr', 'vi', 'id', 'ms', 'tl', 'fil-en',
])

/**
 * Get the learning mode for a target language.
 * English is the only language with typing enabled.
 * All non-English languages use audio_choice.
 */
export function getLanguageLearningMode(targetLanguageCode: string): LanguageLearningMode {
  const code = targetLanguageCode.toLowerCase().trim()
  const isEnglish = code === 'en' || code.startsWith('en-') || code.startsWith('en_')

  if (isEnglish) {
    return {
      enableTyping: true,
      responseStage: 'typing',
      showRomanization: false,
      isLatinScript: true,
    }
  }

  return {
    enableTyping: false,
    responseStage: 'audio_choice',
    showRomanization: false,
    isLatinScript: LATIN_SCRIPT_LANGUAGES.has(code),
  }
}

/**
 * Get the lesson stage order for a given language learning mode.
 * English: [..., typing, ...]
 * Non-English: [..., audio_choice, ...]
 */
export function getResponseStageForLanguage(targetLanguageCode: string): ResponseStageType {
  return getLanguageLearningMode(targetLanguageCode).responseStage
}
