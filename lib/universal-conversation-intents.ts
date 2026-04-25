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

// ── Korean social intent patterns (Phase 4 — detection only) ──

const KO_PATTERNS: IntentPattern[] = [
  {
    intent: 'reciprocal_greeting',
    patterns: [
      /너는/,
      /넌\??$/,
      /잘 지냈/,
      /어떻게 지내/,
      /잘 있었/,
      /기분 어때/,
      /오늘 어때/,
      /그쪽은/,
    ],
  },
  {
    intent: 'farewell',
    patterns: [
      /잘 가/,
      /안녕히/,
      /다음에 봐/,
      /나중에 봐/,
      /바이/,
    ],
  },
  {
    intent: 'confusion',
    patterns: [
      /모르겠/,
      /이해.*안/,
      /무슨 말/,
      /무슨 뜻/,
      /잘 모르/,
      /설명해/,
    ],
  },
  {
    intent: 'thanks',
    patterns: [
      /고마워/,
      /감사/,
      /땡큐/,
      /고맙/,
    ],
  },
  {
    intent: 'apology',
    patterns: [
      /미안/,
      /죄송/,
    ],
  },
  {
    intent: 'greeting',
    patterns: [
      /^안녕/,
      /반가워/,
      /반갑습니다/,
    ],
  },
  {
    intent: 'continuation',
    patterns: [
      /계속/,
      /더 말해/,
      /더 얘기해/,
      /그래서/,
    ],
  },
]

const PATTERN_LIBRARIES: Record<string, IntentPattern[]> = {
  en: EN_PATTERNS,
  ko: KO_PATTERNS,
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

// ── Phase 2: Universal Answer Intent Detection ──

export type UniversalAnswerIntent =
  | 'yes_answer'
  | 'no_answer'
  | 'object_answer'
  | 'person_answer'
  | 'place_answer'
  | 'time_answer'
  | 'frequency_answer'
  | 'feeling_answer'
  | 'preference_answer'
  | 'reason_answer'

type AnswerIntentPattern = {
  intent: UniversalAnswerIntent
  patterns: RegExp[]
}

const EN_ANSWER_PATTERNS: AnswerIntentPattern[] = [
  {
    intent: 'yes_answer',
    patterns: [
      /^(yes|yeah|yep|yup|sure|of course|right|okay|ok|i do|i did|i am|i have)\b/,
    ],
  },
  {
    intent: 'no_answer',
    patterns: [
      /^(no|nope|not really|never|i don'?t|i do not|i didn'?t|not)\b/,
    ],
  },
  {
    intent: 'reason_answer',
    patterns: [
      /\bbecause\b/,
      /\bsince\b/,
      /\bso that\b/,
      /\bin order to\b/,
      /\bthat'?s why\b/,
    ],
  },
  {
    intent: 'preference_answer',
    patterns: [
      /\bi (like|love|prefer|enjoy|hate|dislike)\b/,
      /\bmy favorite\b/,
      /\bi'?d rather\b/,
    ],
  },
  {
    intent: 'person_answer',
    patterns: [
      /\bwith (my |the )?(mom|mother|dad|father|brother|sister|family|friend|friends|husband|wife|partner|kids|children|son|daughter|roommate|colleague|coworker|teacher)\b/,
      /\b(alone|myself|by myself|nobody|together|someone|everyone)\b/,
    ],
  },
  {
    intent: 'place_answer',
    patterns: [
      /\b(at|in) (home|school|work|the office|the kitchen|the park|the gym|the store|the library|a cafe|a restaurant|my room|the bedroom|the bathroom)\b/,
      /\b(at home|outside|inside|downtown|near|far)\b/,
    ],
  },
  {
    intent: 'time_answer',
    patterns: [
      /\b(around|about|at) (\d|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/,
      /\b\d+ (minutes?|hours?|oclock|am|pm)\b/,
      /\b(morning|afternoon|evening|night|early|late|noon|midnight|before|after)\b/,
      /\b(quick|fast|slow|long|short)\b/,
    ],
  },
  {
    intent: 'frequency_answer',
    patterns: [
      /\b(always|usually|sometimes|often|never|rarely|every day|everyday|daily|weekly|once|twice|three times)\b/,
    ],
  },
  {
    intent: 'feeling_answer',
    patterns: [
      /\bi (feel|am) (good|bad|great|fine|okay|tired|happy|sad|bored|excited|stressed|sleepy|sick)\b/,
      /\bit'?s (hard|easy|difficult|fun|boring|annoying|relaxing|stressful|nice|great)\b/,
      /\bi (enjoy|hate|don'?t like|don'?t enjoy)\b/,
    ],
  },
  {
    intent: 'object_answer',
    patterns: [
      /\b(the |my )?(dish|dishes|plate|plates|table|cup|cups|floor|kitchen|phone|alarm|book|tv|train|bus|car|bike|rice|bread|toast|egg|eggs|coffee|tea|ramen|pasta|pizza|math|english|science|homework|music)\b/,
    ],
  },
]

const ANSWER_PATTERN_LIBRARIES: Record<string, AnswerIntentPattern[]> = {
  en: EN_ANSWER_PATTERNS,
}

/**
 * Detect universal answer intent from raw user text.
 * Returns the first matching answer intent, or null if no answer pattern matches.
 *
 * This is a detection-only layer (Phase 2). It does NOT change runtime reply behavior.
 * The existing LLM classification + assembleReplyV25 remain the runtime authority.
 *
 * @param input  Raw user message text
 * @param languageCode  ISO language code (default: 'en')
 */
export function detectUniversalAnswerIntent(
  input: string,
  languageCode = 'en',
): UniversalAnswerIntent | null {
  const normalized = normalizeConversationInput(input)
  if (!normalized) return null

  const patterns = ANSWER_PATTERN_LIBRARIES[languageCode] ?? ANSWER_PATTERN_LIBRARIES.en ?? []

  for (const { intent, patterns: regexes } of patterns) {
    if (regexes.some((r) => r.test(normalized))) {
      return intent
    }
  }

  return null
}
