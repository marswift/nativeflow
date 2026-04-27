/**
 * Lightweight local meaning classifier for scripted conversations.
 *
 * Replaces the LLM call when a script is active. Simple keyword matching
 * is sufficient because the script engine only needs meaning type + confidence,
 * not full NLU. The script controls all conversation structure.
 */

import type { ScriptClassification } from './scripted-conversation-engine'

const YES_PATTERNS = /\b(yes|yeah|yep|yup|sure|of course|definitely|always|right|correct|do|did|i do|i did)\b/i
const NO_PATTERNS = /\b(no|nah|nope|not really|never|don't|dont|didn't|didnt|hardly)\b/i
const SOCIAL_PATTERNS = /\b(good|fine|great|okay|ok|not bad|pretty good|i'm good|im good|thanks|thank you|hello|hi|hey)\b/i
const FEELING_PATTERNS = /\b(tired|happy|bored|fun|hard|easy|love|hate|enjoy|stressed|relaxed|sleepy)\b/i
const FREQUENCY_PATTERNS = /\b(always|usually|sometimes|often|rarely|everyday|daily|weekly)\b/i
const TIME_PATTERNS = /\b(morning|evening|night|early|late|before|after|minutes|hour|oclock|six|seven|eight|nine)\b/i
const PERSON_PATTERNS = /\b(alone|myself|mom|mother|dad|father|family|husband|wife|friend|friends|brother|sister|together|someone|nobody)\b/i

/**
 * Classify user message locally without LLM.
 * Returns a ScriptClassification with meaningType, meaningValue, and confidence.
 */
export function classifyMeaningLocal(userMessage: string): ScriptClassification {
  const trimmed = userMessage.trim()
  if (!trimmed || trimmed.length < 2) {
    return { meaningType: 'unclear', meaningValue: null, confidence: 0.1 }
  }

  const lower = trimmed.toLowerCase()

  // Extract first keyword match as value
  function firstMatch(pattern: RegExp): string | null {
    const m = lower.match(pattern)
    return m ? m[0] : null
  }

  // Priority order: specific types first, yes/no last (most general)
  if (PERSON_PATTERNS.test(lower)) {
    return { meaningType: 'person', meaningValue: firstMatch(PERSON_PATTERNS), confidence: 0.85 }
  }
  if (FEELING_PATTERNS.test(lower)) {
    return { meaningType: 'feeling', meaningValue: firstMatch(FEELING_PATTERNS), confidence: 0.8 }
  }
  if (FREQUENCY_PATTERNS.test(lower)) {
    return { meaningType: 'frequency', meaningValue: firstMatch(FREQUENCY_PATTERNS), confidence: 0.8 }
  }
  if (TIME_PATTERNS.test(lower)) {
    return { meaningType: 'time', meaningValue: firstMatch(TIME_PATTERNS), confidence: 0.8 }
  }
  if (SOCIAL_PATTERNS.test(lower)) {
    return { meaningType: 'social', meaningValue: firstMatch(SOCIAL_PATTERNS), confidence: 0.8 }
  }
  if (YES_PATTERNS.test(lower)) {
    return { meaningType: 'yes', meaningValue: null, confidence: 0.9 }
  }
  if (NO_PATTERNS.test(lower)) {
    return { meaningType: 'no', meaningValue: null, confidence: 0.9 }
  }

  // Short answers (1-3 words) that didn't match above — treat as object
  if (trimmed.split(/\s+/).length <= 3) {
    return { meaningType: 'object', meaningValue: trimmed.toLowerCase(), confidence: 0.6 }
  }

  // Longer unrecognized — low confidence but not unclear (let script decide)
  return { meaningType: 'object', meaningValue: null, confidence: 0.5 }
}
