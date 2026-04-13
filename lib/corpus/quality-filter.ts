/**
 * Quality Filter — Natural Conversation Guard
 *
 * Rejects text that is not natural spoken conversation.
 * Used before chunking/leveling to keep corpus quality high.
 */

import type { QualityFilterResult } from './types'

// ── Patterns that indicate non-natural text ──

/** Repetitive word patterns: "talk about talk", "go go go" */
function hasExcessiveRepetition(text: string): boolean {
  const words = text.toLowerCase().split(/\s+/)
  if (words.length < 3) return false
  // Check trigram repetition
  for (let i = 0; i < words.length - 2; i++) {
    if (words[i] === words[i + 2] && words[i].length > 2) return true
  }
  // Check if >50% of words are the same token
  const freq = new Map<string, number>()
  for (const w of words) freq.set(w, (freq.get(w) ?? 0) + 1)
  for (const [, count] of freq) {
    if (count > words.length * 0.5 && count >= 3) return true
  }
  return false
}

/** Meta-sentences: "this sentence is...", "the following text..." */
const META_PATTERNS = [
  /\bthis sentence\b/i,
  /\bthis text\b/i,
  /\bthe following\b/i,
  /\bas an ai\b/i,
  /\blanguage model\b/i,
  /\bfor example\s*:/i,
  /\btranslate this\b/i,
  /\bplease note\b/i,
  /\bin this exercise\b/i,
]

function isMetaSentence(text: string): boolean {
  return META_PATTERNS.some((p) => p.test(text))
}

/** Only abstract/filler words: thing, stuff, something, whatever */
const ABSTRACT_ONLY_WORDS = new Set([
  'thing', 'things', 'stuff', 'something', 'anything',
  'whatever', 'everything', 'nothing', 'somewhere', 'somehow',
])

function isAbstractOnly(text: string): boolean {
  const words = text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(Boolean)
  const contentWords = words.filter((w) => w.length > 3 && !STOP_WORDS.has(w))
  if (contentWords.length === 0) return true
  return contentWords.every((w) => ABSTRACT_ONLY_WORDS.has(w))
}

/** Common stop words (not content-bearing) */
const STOP_WORDS = new Set([
  'i', 'me', 'my', 'you', 'your', 'he', 'she', 'it', 'we', 'they',
  'the', 'a', 'an', 'is', 'am', 'are', 'was', 'were', 'be', 'been',
  'do', 'does', 'did', 'have', 'has', 'had', 'will', 'would', 'could',
  'should', 'can', 'may', 'might', 'shall', 'must',
  'to', 'of', 'in', 'on', 'at', 'for', 'with', 'from', 'by',
  'and', 'or', 'but', 'not', 'no', 'so', 'if', 'then', 'that', 'this',
  'just', 'very', 'too', 'also', 'well', 'oh', 'um', 'uh',
])

/** Minimum viable sentence: at least 2 content-bearing words */
function isTooShortOrFragmented(text: string): boolean {
  const words = text.toLowerCase().replace(/[^a-z'\s]/g, '').split(/\s+/).filter(Boolean)
  if (words.length < 2) return true
  const contentWords = words.filter((w) => !STOP_WORDS.has(w) && w.length > 1)
  return contentWords.length < 1
}

/** Check for non-ASCII-heavy text (likely not English) */
function isNonEnglish(text: string): boolean {
  const ascii = text.replace(/[^a-zA-Z]/g, '')
  if (ascii.length === 0) return true
  const total = text.replace(/\s/g, '')
  return ascii.length / total.length < 0.5
}

// ── Main filter ──

/**
 * Determine if a piece of text qualifies as natural conversation.
 * Returns pass: true if acceptable, pass: false with reason if not.
 */
export function filterConversationQuality(text: string): QualityFilterResult {
  const trimmed = text.trim()

  if (!trimmed) {
    return { pass: false, reason: 'Empty text.' }
  }

  if (isNonEnglish(trimmed)) {
    return { pass: false, reason: 'Non-English or insufficient English content.' }
  }

  if (isTooShortOrFragmented(trimmed)) {
    return { pass: false, reason: 'Too short or fragmented to be a natural sentence.' }
  }

  if (hasExcessiveRepetition(trimmed)) {
    return { pass: false, reason: 'Excessive word repetition detected.' }
  }

  if (isMetaSentence(trimmed)) {
    return { pass: false, reason: 'Meta-sentence (not natural conversation).' }
  }

  if (isAbstractOnly(trimmed)) {
    return { pass: false, reason: 'Only abstract/filler words — no concrete meaning.' }
  }

  return { pass: true, reason: null }
}

/**
 * Convenience: returns true if text passes quality filter.
 */
export function isNaturalConversation(text: string): boolean {
  return filterConversationQuality(text).pass
}
