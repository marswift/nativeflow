/**
 * Lightweight local meaning classifier for scripted conversations.
 *
 * Replaces the LLM call when a script is active. Simple keyword matching
 * is sufficient because the script engine validates meaning type against
 * expected types per turn.
 */

import type { ScriptClassification } from './scripted-conversation-engine'

// ── Patterns (order matters — checked from most specific to most general) ──

/** People / companion answers: alone, by myself, with [person], family, etc. */
const PERSON_PATTERNS = /\b(alone|by myself|myself|mom|mother|dad|father|family|husband|wife|friend|friends|brother|sister|together|someone|nobody|roommate|partner|kids|children|coworker|neighbor)\b/i

/** Time-of-day / timing answers: right after, later, morning, etc. */
const TIME_PATTERNS = /\b(right after|right away|later|afterward|before|after eating|morning|evening|night|early|late|minutes|hour|oclock|noon|six|seven|eight|nine|ten|quick|fast|slow|long)\b/i

/** Frequency answers: always, sometimes, usually, etc. */
const FREQUENCY_PATTERNS = /\b(always|usually|sometimes|often|rarely|everyday|every day|daily|weekly|once|twice)\b/i

/** Feeling / opinion answers */
const FEELING_PATTERNS = /\b(tired|happy|bored|fun|hard|easy|love|hate|enjoy|stressed|relaxed|sleepy|nice|annoying|boring)\b/i

/** Social / greeting answers: fine, good, thanks, etc. */
const SOCIAL_PATTERNS = /\b(good|fine|great|okay|ok|not bad|pretty good|i'm good|im good|thanks|thank you|hello|hi|hey)\b/i

/** Affirmative / yes answers */
const YES_PATTERNS = /\b(yes|yeah|yep|yup|sure|of course|definitely|right|correct|i do|i did)\b/i

/** Negative / no answers */
const NO_PATTERNS = /\b(no|nah|nope|not really|never|don't|dont|didn't|didnt|hardly|not at all)\b/i

/**
 * Classify user message locally without LLM.
 * Priority: person > time > frequency > feeling > social > yes > no > object > unclear
 */
export function classifyMeaningLocal(userMessage: string): ScriptClassification {
  const trimmed = userMessage.trim()
  if (!trimmed || trimmed.length < 2) {
    return { meaningType: 'unclear', meaningValue: null, confidence: 0.1 }
  }

  const lower = trimmed.toLowerCase()

  function firstMatch(pattern: RegExp): string | null {
    const m = lower.match(pattern)
    return m ? m[0] : null
  }

  // Person patterns first — "by myself", "with my mother", "alone"
  if (PERSON_PATTERNS.test(lower)) {
    return { meaningType: 'person', meaningValue: firstMatch(PERSON_PATTERNS), confidence: 0.85 }
  }
  // Time patterns — "right after eating", "later", "in the morning"
  if (TIME_PATTERNS.test(lower)) {
    return { meaningType: 'time', meaningValue: firstMatch(TIME_PATTERNS), confidence: 0.8 }
  }
  // Frequency — "always", "sometimes", "usually"
  if (FREQUENCY_PATTERNS.test(lower)) {
    return { meaningType: 'frequency', meaningValue: firstMatch(FREQUENCY_PATTERNS), confidence: 0.8 }
  }
  // Feeling
  if (FEELING_PATTERNS.test(lower)) {
    return { meaningType: 'feeling', meaningValue: firstMatch(FEELING_PATTERNS), confidence: 0.8 }
  }
  // Social / greeting
  if (SOCIAL_PATTERNS.test(lower)) {
    return { meaningType: 'social', meaningValue: firstMatch(SOCIAL_PATTERNS), confidence: 0.8 }
  }
  // Yes
  if (YES_PATTERNS.test(lower)) {
    return { meaningType: 'yes', meaningValue: null, confidence: 0.9 }
  }
  // No
  if (NO_PATTERNS.test(lower)) {
    return { meaningType: 'no', meaningValue: null, confidence: 0.9 }
  }

  // Short unrecognized answers — object with moderate confidence
  if (trimmed.split(/\s+/).length <= 3) {
    return { meaningType: 'object', meaningValue: trimmed.toLowerCase(), confidence: 0.6 }
  }

  // Longer unrecognized
  return { meaningType: 'object', meaningValue: null, confidence: 0.5 }
}
