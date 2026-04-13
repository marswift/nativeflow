/**
 * MultiWOZ Importer
 *
 * Imports conversations from MultiWOZ 2.x format (Apache 2.0 license).
 * MultiWOZ is a multi-domain task-oriented dialogue dataset.
 *
 * Commercial use: ✅ text and audio both allowed.
 *
 * Expected input format (simplified):
 * {
 *   dialogue_id: string,
 *   services: string[],          // e.g. ["hotel", "restaurant"]
 *   turns: [
 *     { speaker: "USER", utterance: "..." },
 *     { speaker: "SYSTEM", utterance: "..." },
 *   ]
 * }
 */

import { normalizeCorpusText } from '../normalize'
import { allowImportToProduction, isCommerciallySafeSource } from '../source-policy'
import { filterConversationQuality } from '../quality-filter'
import { buildMeaningChunks, buildSpeechChunks } from '../chunking'
import { classifyConversationLevel } from '../leveling'
import type { ConversationRecord, ConversationTurn, ImportResult } from '../types'

// ── MultiWOZ raw types ──

type MultiWozRawTurn = {
  speaker: string
  utterance: string
}

type MultiWozRawDialogue = {
  dialogue_id: string
  services?: string[]
  turns: MultiWozRawTurn[]
}

// ── Domain → scene/topic mapping ──

const DOMAIN_SCENE_MAP: Record<string, { topic: string; scene: string }> = {
  hotel: { topic: 'accommodation', scene: 'hotel booking' },
  restaurant: { topic: 'dining', scene: 'restaurant reservation' },
  attraction: { topic: 'sightseeing', scene: 'tourist information' },
  taxi: { topic: 'transportation', scene: 'taxi booking' },
  train: { topic: 'transportation', scene: 'train booking' },
  hospital: { topic: 'health', scene: 'hospital inquiry' },
  police: { topic: 'emergency', scene: 'police report' },
  bus: { topic: 'transportation', scene: 'bus inquiry' },
}

function inferSceneFromDomains(services: string[]): { topic: string; scene: string } {
  for (const s of services) {
    const mapped = DOMAIN_SCENE_MAP[s.toLowerCase()]
    if (mapped) return mapped
  }
  return { topic: 'general', scene: 'task-oriented dialogue' }
}

// ── Constants ──

const SOURCE = 'multiwoz' as const
const LICENSE = 'Apache 2.0'

// ── Importer ──

/**
 * Import a single MultiWOZ dialogue into a ConversationRecord.
 *
 * Pipeline:
 * 1. Source safety check
 * 2. Quality filter each turn
 * 3. Build meaning + speech chunks
 * 4. Classify level
 * 5. Return structured record
 */
export function importMultiWozRecord(raw: MultiWozRawDialogue): ImportResult {
  // Safety gate
  if (!allowImportToProduction(SOURCE, LICENSE)) {
    return { record: null, skipped: true, skipReason: 'Source/license not production-safe.' }
  }

  const safety = isCommerciallySafeSource(SOURCE, LICENSE)

  // Filter turns
  const validTurns: ConversationTurn[] = []
  let turnOrder = 0

  for (const rawTurn of raw.turns) {
    const text = rawTurn.utterance.trim()
    if (!text) continue

    const quality = filterConversationQuality(text)
    if (!quality.pass) continue

    const speaker: 'A' | 'B' = rawTurn.speaker === 'USER' ? 'A' : 'B'
    const turn: ConversationTurn = {
      id: `${raw.dialogue_id}-t${turnOrder}`,
      order: turnOrder,
      speaker,
      text,
      normalizedText: normalizeCorpusText(text),
      meaningChunks: buildMeaningChunks(text),
      speechChunks: buildSpeechChunks(text),
      audioAssetKey: null,
    }

    validTurns.push(turn)
    turnOrder++
  }

  // Need at least 2 turns for a conversation
  if (validTurns.length < 2) {
    return { record: null, skipped: true, skipReason: 'Too few valid turns after quality filter.' }
  }

  const { topic, scene } = inferSceneFromDomains(raw.services ?? [])
  const level = classifyConversationLevel(validTurns)

  const record: ConversationRecord = {
    id: raw.dialogue_id,
    source: SOURCE,
    sourceLicense: LICENSE,
    isCommerciallySafe: safety.textAllowed,
    topic,
    scene,
    level,
    turns: validTurns,
  }

  return { record, skipped: false, skipReason: null }
}
