/**
 * Universal Conversation Intent Detection
 *
 * Language-extensible social intent detector for NativeFlow conversations.
 * Detects social intents (greeting, reciprocal, thanks, etc.) from raw user text
 * before the LLM classification layer, ensuring deterministic handling.
 *
 * Phase 1: English patterns only. Structure supports future language expansion.
 */

export type UniversalSocialIntent =
  | 'greeting'
  | 'reciprocal_greeting'
  | 'thanks'
  | 'apology'
  | 'farewell'
  | 'confusion'
  | 'continuation'

type IntentPattern = {
  intent: UniversalSocialIntent
  patterns: RegExp[]
}

/** Normalize input for pattern matching: lowercase, collapse whitespace, strip outer punctuation. */
export function normalizeConversationInput(input: string): string {
  return input.toLowerCase().replace(/['']/g, "'").replace(/\s+/g, ' ').trim()
}

// ── Pattern libraries per language ──

const EN_PATTERNS: IntentPattern[] = [
  // Order matters: more specific intents first
  {
    intent: 'reciprocal_greeting',
    patterns: [
      /\band you\b/,
      /\bhow about you\b/,
      /\bwhat about you\b/,
      /\byou too\b/,
      /\bhow are you\b/,
      /\bhow's your day\b/,
      /\bhows your day\b/,
      /\bhow is your day\b/,
      /\band how about you\b/,
      /\byou\?$/,
    ],
  },
  {
    intent: 'farewell',
    patterns: [
      /\bbye\b/,
      /\bgoodbye\b/,
      /\bsee you\b/,
      /\btake care\b/,
      /\bgood night\b/,
      /\bsee you later\b/,
      /\bsee you next time\b/,
    ],
  },
  {
    intent: 'confusion',
    patterns: [
      /\bi don'?t understand\b/,
      /\bi do not understand\b/,
      /\bwhat do you mean\b/,
      /\bi don'?t know\b/,
      /\bi do not know\b/,
      /\bnot sure\b/,
      /\bcan you explain\b/,
      /\bi'?m confused\b/,
    ],
  },
  {
    intent: 'thanks',
    patterns: [
      /\bthanks\b/,
      /\bthank you\b/,
      /\bappreciate it\b/,
      /\bthank\b/,
    ],
  },
  {
    intent: 'apology',
    patterns: [
      /\bsorry\b/,
      /\bmy bad\b/,
      /\bapologize\b/,
    ],
  },
  {
    intent: 'greeting',
    patterns: [
      /^hi\b/,
      /^hello\b/,
      /^hey\b/,
      /\bgood morning\b/,
      /\bgood afternoon\b/,
      /\bgood evening\b/,
      /\bnice to meet you\b/,
    ],
  },
  {
    intent: 'continuation',
    patterns: [
      /\btell me more\b/,
      /\bgo on\b/,
      /\bcontinue\b/,
      /\bkeep going\b/,
    ],
  },
]

const PATTERN_LIBRARIES: Record<string, IntentPattern[]> = {
  en: EN_PATTERNS,
}

/**
 * Detect universal social intent from raw user text.
 * Returns the first matching intent, or null if no social intent is detected.
 *
 * @param input  Raw user message text
 * @param languageCode  ISO language code (default: 'en')
 */
export function detectUniversalSocialIntent(
  input: string,
  languageCode = 'en',
): UniversalSocialIntent | null {
  const normalized = normalizeConversationInput(input)
  if (!normalized) return null

  const patterns = PATTERN_LIBRARIES[languageCode] ?? PATTERN_LIBRARIES.en ?? []

  for (const { intent, patterns: regexes } of patterns) {
    if (regexes.some((r) => r.test(normalized))) {
      return intent
    }
  }

  return null
}
