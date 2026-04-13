/**
 * Leveling — Conversation Difficulty Classification
 *
 * Classifies a conversation turn or full record into:
 * - beginner: short, simple, common vocabulary
 * - intermediate: longer sentences, some subordinate clauses
 * - advanced: complex structure, rare vocabulary, long turns
 *
 * Features used:
 * 1. Token count (words per turn)
 * 2. Sentence length (characters)
 * 3. Subordinate clause markers
 * 4. Vocabulary difficulty (uncommon words)
 */

import type { CorpusLevel, ConversationTurn } from './types'

// ── Subordinate clause markers ──

const SUBORDINATE_MARKERS = new Set([
  'although', 'though', 'even though', 'while', 'whereas',
  'because', 'since', 'unless', 'until', 'whenever',
  'wherever', 'whoever', 'whatever', 'whichever',
  'provided', 'assuming', 'given that',
  'in order to', 'so that', 'as long as',
  'whether', 'if',
])

// ── Common vocabulary (beginner-level words) ──
// Top ~200 most frequent English words — if most words are in this set, it's beginner

const COMMON_WORDS = new Set([
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'my', 'your',
  'his', 'her', 'its', 'our', 'their', 'this', 'that', 'these', 'those',
  'the', 'a', 'an', 'is', 'am', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'can', 'may', 'might', 'shall', 'must',
  'not', 'no', 'yes', 'ok', 'okay',
  'go', 'come', 'get', 'make', 'take', 'see', 'know', 'think', 'want',
  'like', 'need', 'use', 'find', 'give', 'tell', 'say', 'ask', 'work',
  'try', 'call', 'feel', 'leave', 'put', 'keep', 'let', 'start', 'help',
  'show', 'hear', 'play', 'run', 'move', 'live', 'believe', 'bring',
  'happen', 'write', 'sit', 'stand', 'lose', 'pay', 'meet', 'read',
  'grow', 'open', 'close', 'stop', 'buy', 'eat', 'drink', 'sleep',
  'walk', 'talk', 'wait', 'send', 'watch', 'look',
  'good', 'new', 'first', 'last', 'long', 'great', 'little', 'own',
  'other', 'old', 'right', 'big', 'high', 'small', 'large', 'next',
  'early', 'young', 'important', 'few', 'bad', 'same', 'able',
  'time', 'year', 'people', 'way', 'day', 'man', 'woman', 'child',
  'world', 'life', 'hand', 'part', 'place', 'case', 'week', 'head',
  'school', 'home', 'water', 'room', 'mother', 'father', 'friend',
  'money', 'food', 'name', 'city', 'book', 'job', 'house', 'car',
  'about', 'up', 'out', 'into', 'over', 'after', 'with', 'from',
  'to', 'in', 'on', 'at', 'for', 'by', 'of', 'and', 'or', 'but',
  'so', 'if', 'when', 'then', 'just', 'also', 'very', 'much',
  'here', 'there', 'now', 'today', 'tomorrow', 'yesterday',
  'please', 'thank', 'thanks', 'sorry', 'hello', 'hi', 'bye',
  'how', 'what', 'where', 'who', 'why', 'which',
])

// ── Feature extraction ──

type LevelFeatures = {
  avgTokenCount: number
  avgCharLength: number
  subordinateClauseCount: number
  uncommonWordRatio: number
}

function extractFeatures(texts: string[]): LevelFeatures {
  if (texts.length === 0) {
    return { avgTokenCount: 0, avgCharLength: 0, subordinateClauseCount: 0, uncommonWordRatio: 0 }
  }

  let totalTokens = 0
  let totalChars = 0
  let subordinateCount = 0
  let totalContentWords = 0
  let uncommonCount = 0

  for (const text of texts) {
    const words = text.toLowerCase().split(/\s+/).filter(Boolean)
    totalTokens += words.length
    totalChars += text.length

    // Check subordinate markers
    const lower = text.toLowerCase()
    for (const marker of SUBORDINATE_MARKERS) {
      if (lower.includes(marker)) {
        subordinateCount++
        break // Count once per turn
      }
    }

    // Vocabulary difficulty
    for (const word of words) {
      const clean = word.replace(/[^a-z']/g, '')
      if (clean.length <= 2) continue
      totalContentWords++
      if (!COMMON_WORDS.has(clean)) {
        uncommonCount++
      }
    }
  }

  const n = texts.length
  return {
    avgTokenCount: totalTokens / n,
    avgCharLength: totalChars / n,
    subordinateClauseCount: subordinateCount,
    uncommonWordRatio: totalContentWords > 0 ? uncommonCount / totalContentWords : 0,
  }
}

// ── Classification ──

function classifyFromFeatures(f: LevelFeatures): CorpusLevel {
  // Advanced: long sentences, complex structure, or rare vocabulary
  if (
    f.avgTokenCount >= 15 ||
    f.subordinateClauseCount >= 2 ||
    f.uncommonWordRatio >= 0.4
  ) {
    return 'advanced'
  }

  // Beginner: short, simple, common vocabulary
  if (
    f.avgTokenCount <= 7 &&
    f.subordinateClauseCount === 0 &&
    f.uncommonWordRatio <= 0.15
  ) {
    return 'beginner'
  }

  return 'intermediate'
}

/**
 * Classify a single turn's difficulty level.
 */
export function classifyTurnLevel(text: string): CorpusLevel {
  return classifyFromFeatures(extractFeatures([text]))
}

/**
 * Classify a full conversation's difficulty level based on all turns.
 */
export function classifyConversationLevel(turns: Pick<ConversationTurn, 'text'>[]): CorpusLevel {
  if (turns.length === 0) return 'beginner'
  return classifyFromFeatures(extractFeatures(turns.map((t) => t.text)))
}
