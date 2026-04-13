/**
 * Chunking — 2-Layer Chunk Builder
 *
 * Every ConversationTurn gets two kinds of chunks:
 *
 * 1. meaningChunks — semantic units (verb + object + prepositional phrase)
 *    Goal: each chunk carries a complete, learnable meaning.
 *
 * 2. speechChunks — prosodic units (subject+verb, then modifiers)
 *    Goal: each chunk matches natural speech rhythm for shadowing/repeat drills.
 *
 * Example: "I talked with my friend today."
 *   meaning: ["talked with my friend", "today"]
 *   speech:  ["I talked", "with my friend", "today"]
 */

import { normalizeCorpusText } from './normalize'
import type { ConversationChunk } from './types'

// ── Helpers ──

let chunkCounter = 0
function nextChunkId(prefix: string): string {
  chunkCounter += 1
  return `${prefix}-${chunkCounter}`
}

/** Reset counter (for testing) */
export function resetChunkCounter(): void {
  chunkCounter = 0
}

function buildChunk(
  text: string,
  order: number,
  type: 'meaning' | 'speech',
  prefix: string,
): ConversationChunk {
  return {
    id: nextChunkId(prefix),
    order,
    text: text.trim(),
    normalizedText: normalizeCorpusText(text),
    type,
  }
}

// ── Preposition / conjunction sets ──

const PREPOSITIONS = new Set([
  'about', 'above', 'across', 'after', 'against', 'along', 'among',
  'around', 'at', 'before', 'behind', 'below', 'beneath', 'beside',
  'between', 'beyond', 'by', 'despite', 'down', 'during', 'except',
  'for', 'from', 'in', 'inside', 'into', 'like', 'near', 'of',
  'off', 'on', 'onto', 'out', 'outside', 'over', 'past', 'since',
  'through', 'throughout', 'to', 'toward', 'towards', 'under',
  'underneath', 'until', 'up', 'upon', 'with', 'within', 'without',
])

const TIME_ADVERBS = new Set([
  'today', 'tomorrow', 'yesterday', 'now', 'then', 'soon',
  'later', 'already', 'recently', 'finally', 'again',
  'tonight', 'nowadays', 'always', 'never', 'sometimes',
  'usually', 'often', 'rarely', 'ever',
])

const SUBJECTS = new Set([
  'i', 'you', 'he', 'she', 'it', 'we', 'they',
  'that', 'this', 'there', 'here',
])

const CONJUNCTIONS = new Set([
  'and', 'but', 'or', 'so', 'because', 'since', 'although',
  'though', 'while', 'when', 'if', 'unless', 'after', 'before',
])

// ── Meaning Chunks ──

/**
 * Build meaning chunks: semantic-unit segmentation.
 *
 * Strategy:
 * - Split on conjunctions (and, but, because, etc.)
 * - Within each clause, keep verb + object + prepositional phrase together
 * - Time adverbs at end become their own chunk
 */
export function buildMeaningChunks(text: string): ConversationChunk[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  const words = trimmed.split(/\s+/)
  if (words.length <= 3) {
    return [buildChunk(trimmed, 0, 'meaning', 'mc')]
  }

  const chunks: string[] = []
  let current: string[] = []

  for (let i = 0; i < words.length; i++) {
    const w = words[i]
    const lower = w.toLowerCase().replace(/[^a-z']/g, '')

    // Split on conjunction if current buffer is non-empty and has content
    if (CONJUNCTIONS.has(lower) && current.length >= 2) {
      chunks.push(current.join(' '))
      current = [w]
      continue
    }

    current.push(w)
  }

  if (current.length > 0) {
    chunks.push(current.join(' '))
  }

  // Post-process: separate trailing time adverbs as their own chunk
  const result: string[] = []
  for (const chunk of chunks) {
    const cWords = chunk.split(/\s+/)
    const lastWord = cWords[cWords.length - 1]?.toLowerCase().replace(/[^a-z]/g, '') ?? ''

    if (cWords.length > 2 && TIME_ADVERBS.has(lastWord)) {
      result.push(cWords.slice(0, -1).join(' '))
      result.push(cWords[cWords.length - 1])
    } else {
      result.push(chunk)
    }
  }

  return result
    .filter((c) => c.trim().length > 0)
    .map((c, i) => buildChunk(c, i, 'meaning', 'mc'))
}

// ── Speech Chunks ──

/**
 * Build speech chunks: prosodic-unit segmentation.
 *
 * Strategy:
 * - Subject + verb as first chunk
 * - Prepositional phrases as standalone chunks
 * - Time adverbs as standalone
 * - Conjunctions start new chunks
 */
export function buildSpeechChunks(text: string): ConversationChunk[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  const words = trimmed.split(/\s+/)
  if (words.length <= 2) {
    return [buildChunk(trimmed, 0, 'speech', 'sc')]
  }

  const chunks: string[] = []
  let current: string[] = []
  let foundVerb = false

  for (let i = 0; i < words.length; i++) {
    const w = words[i]
    const lower = w.toLowerCase().replace(/[^a-z']/g, '')

    // Conjunction → start new chunk
    if (CONJUNCTIONS.has(lower) && current.length > 0) {
      chunks.push(current.join(' '))
      current = [w]
      foundVerb = false
      continue
    }

    // Preposition after verb → start new chunk (prepositional phrase)
    if (PREPOSITIONS.has(lower) && foundVerb && current.length >= 2) {
      chunks.push(current.join(' '))
      current = [w]
      continue
    }

    // Time adverb at end → standalone
    if (TIME_ADVERBS.has(lower) && i >= words.length - 2 && current.length >= 2) {
      chunks.push(current.join(' '))
      current = [w]
      continue
    }

    current.push(w)

    // Detect verb: word after subject, or word that's not a subject/preposition
    if (!foundVerb && current.length >= 2) {
      const prevLower = (current[current.length - 2] ?? '').toLowerCase().replace(/[^a-z']/g, '')
      if (SUBJECTS.has(prevLower) || current.length > 2) {
        foundVerb = true
      }
    }
  }

  if (current.length > 0) {
    chunks.push(current.join(' '))
  }

  return chunks
    .filter((c) => c.trim().length > 0)
    .map((c, i) => buildChunk(c, i, 'speech', 'sc'))
}
