/**
 * Translation Manifest — Multi-language Explanation Plan
 *
 * Builds a list of text segments that need translation for learner support.
 * Translations are explanation-oriented (help learners understand),
 * not literal word-for-word translations.
 *
 * Supported target languages: ja (Japanese), ko (Korean), zh (Chinese)
 *
 * Deduplication: normalizedSourceText + targetLang
 */

import { normalizeForDedupeKey } from './normalize'
import type {
  ConversationRecord,
  TranslationManifestEntry,
  TranslationTargetLang,
} from './types'

const DEFAULT_TARGET_LANGS: TranslationTargetLang[] = ['ja', 'ko', 'zh']

function translationDedupeKey(normalizedText: string, lang: TranslationTargetLang): string {
  return `${lang}:${normalizeForDedupeKey(normalizedText)}`
}

/**
 * Build a deduplicated translation manifest from conversation records.
 *
 * Generates entries for each turn in each target language.
 * Only includes records that are commercially safe.
 */
export function buildTranslationManifest(
  records: ConversationRecord[],
  targetLangs: TranslationTargetLang[] = DEFAULT_TARGET_LANGS,
): TranslationManifestEntry[] {
  const seen = new Map<string, TranslationManifestEntry>()

  for (const record of records) {
    if (!record.isCommerciallySafe) continue

    for (const turn of record.turns) {
      for (const lang of targetLangs) {
        const key = translationDedupeKey(turn.normalizedText, lang)
        if (!seen.has(key)) {
          seen.set(key, {
            key,
            sourceText: turn.text,
            normalizedSourceText: turn.normalizedText,
            targetLang: lang,
            translatedText: null,
            turnId: turn.id,
            conversationId: record.id,
          })
        }
      }
    }
  }

  return Array.from(seen.values())
}

/**
 * Count how many entries need translation (no translatedText yet).
 */
export function countPendingTranslations(manifest: TranslationManifestEntry[]): number {
  return manifest.filter((e) => !e.translatedText).length
}
