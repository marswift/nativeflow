/**
 * Tatoeba Importer
 *
 * Imports sentence pairs from Tatoeba (CC BY 2.0 license).
 * Tatoeba provides individual sentences, not dialogues — we construct
 * minimal 2-turn exchanges from sentence pairs.
 *
 * Commercial use: ✅ text only. ❌ Audio is BLOCKED (mixed contributor licenses).
 *
 * Expected input format:
 * {
 *   id: string,
 *   sentenceA: string,   // e.g. "Can you help me find a restaurant?"
 *   sentenceB: string,   // e.g. "Sure, what kind of food do you like?"
 *   topic?: string,
 * }
 */

import { normalizeCorpusText } from '../normalize'
import { allowImportToProduction, isCommerciallySafeSource } from '../source-policy'
import { filterConversationQuality } from '../quality-filter'
import { buildMeaningChunks, buildSpeechChunks } from '../chunking'
import { classifyConversationLevel } from '../leveling'
import type { ConversationRecord, ConversationTurn, ImportResult } from '../types'

// ── Tatoeba raw types ──

type TatoebaRawPair = {
  id: string
  sentenceA: string
  sentenceB: string
  topic?: string
}

// ── Constants ──

const SOURCE = 'tatoeba' as const
const LICENSE = 'CC BY 2.0'

// ── Importer ──

/**
 * Import a Tatoeba sentence pair into a ConversationRecord.
 *
 * Pipeline:
 * 1. Source safety check (text only — audio blocked)
 * 2. Quality filter both sentences
 * 3. Build meaning + speech chunks
 * 4. Classify level
 * 5. Return structured record (audioAssetKey always null — audio not allowed)
 */
export function importTatoebaRecord(raw: TatoebaRawPair): ImportResult {
  // Safety gate
  if (!allowImportToProduction(SOURCE, LICENSE)) {
    return { record: null, skipped: true, skipReason: 'Source/license not production-safe.' }
  }

  const safety = isCommerciallySafeSource(SOURCE, LICENSE)

  const textA = raw.sentenceA.trim()
  const textB = raw.sentenceB.trim()

  if (!textA || !textB) {
    return { record: null, skipped: true, skipReason: 'Empty sentence in pair.' }
  }

  // Quality filter
  const qualA = filterConversationQuality(textA)
  const qualB = filterConversationQuality(textB)

  if (!qualA.pass) {
    return { record: null, skipped: true, skipReason: `Sentence A failed quality: ${qualA.reason}` }
  }
  if (!qualB.pass) {
    return { record: null, skipped: true, skipReason: `Sentence B failed quality: ${qualB.reason}` }
  }

  // Build turns
  const turnA: ConversationTurn = {
    id: `${raw.id}-t0`,
    order: 0,
    speaker: 'A',
    text: textA,
    normalizedText: normalizeCorpusText(textA),
    meaningChunks: buildMeaningChunks(textA),
    speechChunks: buildSpeechChunks(textA),
    // Audio BLOCKED for Tatoeba — always null
    audioAssetKey: null,
  }

  const turnB: ConversationTurn = {
    id: `${raw.id}-t1`,
    order: 1,
    speaker: 'B',
    text: textB,
    normalizedText: normalizeCorpusText(textB),
    meaningChunks: buildMeaningChunks(textB),
    speechChunks: buildSpeechChunks(textB),
    audioAssetKey: null,
  }

  const turns = [turnA, turnB]
  const level = classifyConversationLevel(turns)

  const record: ConversationRecord = {
    id: `tatoeba-${raw.id}`,
    source: SOURCE,
    sourceLicense: LICENSE,
    isCommerciallySafe: safety.textAllowed,
    topic: raw.topic ?? 'general',
    scene: 'sentence pair',
    level,
    turns,
  }

  return { record, skipped: false, skipReason: null }
}
