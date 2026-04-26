/**
 * SlotFiller — slot validation and repair for AI conversation answers.
 *
 * Owns: domain keyword sets, slot validation against scene slotSchema or
 *       generic fallback, repair strategy selection.
 *
 * Does NOT own: intent routing, reply composition, LLM parsing, UI/audio.
 */

import type { SlotDefinition, SceneSlotSchema } from './ai-conversation-scene-questions'

// ── Types ──

export type SlotValidationResult = {
  valid: boolean
  reason: 'ok' | 'mismatch' | 'missing'
}

// ── Domain keyword sets ──

/** Word sets for common question domains — fallback when no scene slotSchema exists */
const DOMAIN_KEYWORDS: Record<string, Set<string>> = {
  clean: new Set(['dish', 'dishes', 'plate', 'plates', 'cup', 'cups', 'table', 'kitchen', 'floor', 'sink', 'counter', 'trash', 'wipe', 'sweep', 'mop', 'wash', 'rinse', 'tidy', 'vacuum', 'dust', 'laundry', 'clothes', 'room', 'bathroom']),
  cook: new Set(['rice', 'egg', 'eggs', 'pasta', 'soup', 'meat', 'fish', 'vegetable', 'vegetables', 'fry', 'boil', 'bake', 'stir', 'pan', 'pot', 'oven', 'stove', 'microwave', 'recipe']),
  eat: new Set(['rice', 'bread', 'toast', 'cereal', 'egg', 'eggs', 'fruit', 'salad', 'soup', 'noodle', 'noodles', 'sandwich', 'yogurt', 'coffee', 'tea', 'milk', 'juice', 'water']),
  people: new Set(['alone', 'myself', 'family', 'mom', 'mother', 'dad', 'father', 'brother', 'sister', 'husband', 'wife', 'friend', 'friends', 'kids', 'children', 'son', 'daughter', 'roommate', 'partner', 'together', 'someone', 'nobody']),
  frequency: new Set(['always', 'usually', 'sometimes', 'often', 'never', 'rarely', 'once', 'twice', 'everyday', 'daily', 'weekly', 'weekday', 'weekend']),
  time: new Set(['morning', 'afternoon', 'evening', 'night', 'early', 'late', 'noon', 'midnight', 'oclock', 'before', 'after', 'minutes', 'hours', 'hour', 'minute', 'quick', 'fast', 'slow', 'long']),
}

/** Common filler words excluded from domain matching */
const SLOT_COMMON = new Set(['i', 'my', 'the', 'a', 'it', 'do', 'is', 'yes', 'no', 'not', 'and', 'or', 'but', 'so', 'very', 'really', 'just', 'like', 'think', 'usually', 'too', 'also'])

// ── Validation ──

/**
 * Validate whether a user's answer fits the semantic domain of the current question.
 * Uses scene slotSchema when available (V2.6), falls back to generic DOMAIN_KEYWORDS.
 * Tolerant to imperfect English — only flags clear mismatches.
 */
export function validateSlot(
  meaningType: string,
  value: string | null,
  engineQuestion: string | null,
  slotDef?: SlotDefinition | null,
): SlotValidationResult {
  // No question context or no value → accept (be tolerant)
  if (!engineQuestion || !value) return { valid: true, reason: 'ok' }

  // ── Scene slotSchema path (V2.6) ──
  if (slotDef) {
    // Yes/no answers accepted if slot allows it
    if ((meaningType === 'yes' || meaningType === 'no') && slotDef.acceptYesNo) {
      return { valid: true, reason: 'ok' }
    }

    const tokens = value.toLowerCase().split(/\s+/).map(w => w.replace(/[^a-z]/g, ''))
    // Short answers are hard to validate — accept
    if (tokens.length <= 1 && tokens[0].length <= 3) return { valid: true, reason: 'ok' }

    const contentWords = tokens.filter(w => w.length > 2 && !SLOT_COMMON.has(w))
    if (contentWords.length === 0) return { valid: true, reason: 'ok' }

    const hasRelevant = contentWords.some(w => slotDef.accept.has(w))
    if (hasRelevant) return { valid: true, reason: 'ok' }

    // People words are always relevant in any domain
    const hasPeopleWord = contentWords.some(w => DOMAIN_KEYWORDS.people.has(w))
    if (hasPeopleWord) return { valid: true, reason: 'ok' }

    return { valid: false, reason: 'mismatch' }
  }

  // ── Generic fallback path (no slotSchema) ──

  // Only strict-validate object answers in generic mode
  if (meaningType !== 'object') return { valid: true, reason: 'ok' }

  const q = engineQuestion.toLowerCase()
  const words = value.toLowerCase().split(/\s+/).map(w => w.replace(/[^a-z]/g, ''))

  // Short answers are hard to validate — accept
  if (words.length <= 1 && words[0].length <= 3) return { valid: true, reason: 'ok' }

  // Determine expected domain from question text
  let expectedDomain: Set<string> | null = null
  if (/\bclean|wash|tidy|sweep\b/.test(q)) expectedDomain = DOMAIN_KEYWORDS.clean
  else if (/\bcook|make food|prepare\b/.test(q)) expectedDomain = DOMAIN_KEYWORDS.cook
  else if (/\beat|food|breakfast|lunch|dinner|meal\b/.test(q)) expectedDomain = DOMAIN_KEYWORDS.eat
  else if (/\balone|with someone|who\b/.test(q)) expectedDomain = DOMAIN_KEYWORDS.people
  else if (/\bhow often|every day|frequently\b/.test(q)) expectedDomain = DOMAIN_KEYWORDS.frequency
  else if (/\bwhat time|how long|when\b/.test(q)) expectedDomain = DOMAIN_KEYWORDS.time

  if (!expectedDomain) return { valid: true, reason: 'ok' } // unknown domain — be tolerant

  const contentWords = words.filter(w => w.length > 2 && !SLOT_COMMON.has(w))
  if (contentWords.length === 0) return { valid: true, reason: 'ok' } // only filler — accept

  const hasRelevant = contentWords.some(w => expectedDomain!.has(w))
  if (hasRelevant) return { valid: true, reason: 'ok' }

  // People words are always relevant in any domain
  const hasPeopleWord = contentWords.some(w => DOMAIN_KEYWORDS.people.has(w))
  if (hasPeopleWord) return { valid: true, reason: 'ok' }

  return { valid: false, reason: 'mismatch' }
}

// ── Repair ──

/** Lowercase the first character of a string. */
function lowercaseFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1)
}

/**
 * Select a deterministic repair reply when slot validation fails.
 * Uses scene-specific repair templates when available, else generic re-ask.
 */
export function selectRepairStrategy(
  result: SlotValidationResult,
  engineQuestion: string,
  turnIndex: number,
  slotDef?: SlotDefinition | null,
): string {
  if (result.reason === 'mismatch') {
    // Prefer scene-specific repair templates
    if (slotDef?.repairTemplates && slotDef.repairTemplates.length > 0) {
      return slotDef.repairTemplates[turnIndex % slotDef.repairTemplates.length]
    }
    return `Sorry, ${lowercaseFirst(engineQuestion)}`
  }
  if (result.reason === 'missing') {
    return 'Could you tell me more?'
  }
  return engineQuestion
}

/**
 * Run slot validation and return a repair reply if invalid, or null if valid.
 * Convenience wrapper used by assembleReplyV25.
 */
export function validateAndRepair(
  meaningType: string,
  meaningValue: string | null,
  engineQuestion: string,
  engineDimension: string | null,
  slotSchema: SceneSlotSchema | null,
  turnIndex: number,
): string | null {
  const dimKey = (engineDimension ?? meaningType) as keyof SceneSlotSchema
  const slotDef = slotSchema?.[dimKey] ?? null
  const result = validateSlot(meaningType, meaningValue, engineQuestion, slotDef)
  if (!result.valid) {
    return selectRepairStrategy(result, engineQuestion, turnIndex, slotDef)
  }
  return null
}
