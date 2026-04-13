/**
 * Audio Manifest — TTS Generation Plan
 *
 * Builds a deduplicated list of text segments that need audio generation.
 * Supports both turn-level and chunk-level audio.
 *
 * Deduplication key: normalizedText + type (turn/chunk)
 * This prevents generating the same audio twice across conversations.
 */

import { normalizeForDedupeKey } from './normalize'
import { isCommerciallySafeSource } from './source-policy'
import type {
  AudioManifestEntry,
  ConversationRecord,
  ChunkType,
} from './types'

function audioDedupeKey(normalizedText: string, type: 'turn' | 'chunk'): string {
  return `${type}:${normalizeForDedupeKey(normalizedText)}`
}

/**
 * Build a deduplicated audio manifest from conversation records.
 *
 * For each record:
 * - If audio is allowed (by source policy), include turn-level and chunk-level entries
 * - If audio is NOT allowed (e.g. Tatoeba), skip entirely
 *
 * @returns Deduplicated array of AudioManifestEntry
 */
export function buildAudioManifest(
  records: ConversationRecord[],
): AudioManifestEntry[] {
  const seen = new Map<string, AudioManifestEntry>()

  for (const record of records) {
    // Check if audio generation is allowed for this source
    const safety = isCommerciallySafeSource(record.source, record.sourceLicense)
    if (!safety.audioAllowed) continue

    for (const turn of record.turns) {
      // Turn-level audio
      const turnKey = audioDedupeKey(turn.normalizedText, 'turn')
      if (!seen.has(turnKey)) {
        seen.set(turnKey, {
          key: turnKey,
          text: turn.text,
          normalizedText: turn.normalizedText,
          type: 'turn',
          turnId: turn.id,
          conversationId: record.id,
          audioAssetKey: turn.audioAssetKey ?? null,
        })
      }

      // Chunk-level audio (both meaning and speech)
      const allChunks = [...turn.meaningChunks, ...turn.speechChunks]
      for (const chunk of allChunks) {
        const chunkKey = audioDedupeKey(chunk.normalizedText, 'chunk')
        if (!seen.has(chunkKey)) {
          seen.set(chunkKey, {
            key: chunkKey,
            text: chunk.text,
            normalizedText: chunk.normalizedText,
            type: 'chunk',
            chunkType: chunk.type as ChunkType,
            turnId: turn.id,
            conversationId: record.id,
            audioAssetKey: null,
          })
        }
      }
    }
  }

  return Array.from(seen.values())
}

/**
 * Count how many entries need audio generation (no audioAssetKey yet).
 */
export function countPendingAudio(manifest: AudioManifestEntry[]): number {
  return manifest.filter((e) => !e.audioAssetKey).length
}
