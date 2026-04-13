/**
 * AI-Question Conversation Engine
 *
 * Controlled 3-turn conversation for the AI-question lesson stage.
 * Not free-chat — bounded, evaluable, beginner-friendly.
 *
 * Turn 1 = restart / guided transformation
 * Turn 2 = semantic follow-up
 * Turn 3 = full-sentence reconstruction
 */

import type { LessonCopy } from './lesson-copy'
import type { RegionContext } from './daily-timeline'

// ── Types ──

export type ConversationTurnKind = 'rewrite' | 'follow_up' | 'reconstruct'

export type ConversationEvaluationBucket = 'correct' | 'partial' | 'incorrect'

export type ConversationPromptSpec = {
  turn: 1 | 2 | 3
  kind: ConversationTurnKind
  prompt: string
  expectedAnswer: string
  exampleAnswer: string
  alternativeAnswers: string[]
  requiredSlots: {
    person?: string | null
    time?: string | null
    requiresFullSentence: boolean
  }
}

export type ConversationEngineResult = {
  round1: ConversationPromptSpec
  round2: ConversationPromptSpec
  round3: ConversationPromptSpec
}

export type SlotContext = {
  personSlot: string
  personAlt: string
  timeSlot: string
  timeAlt: string
}

// ── Helpers ──

function buildVariation(currentAnswer: string, slots: SlotContext, slot: 'person' | 'time'): string {
  if (slot === 'person' && slots.personSlot && slots.personAlt) {
    return currentAnswer.replace(slots.personSlot, slots.personAlt)
  }
  if (slot === 'time' && slots.timeSlot) {
    return currentAnswer.replace(slots.timeSlot, slots.timeAlt)
  }
  return currentAnswer
}

// ── Turn 1: Restart / Guided Transformation ──

function buildTurn1(
  currentAnswer: string,
  slots: SlotContext,
  level: string | undefined,
  copy: LessonCopy['activeCard'],
): ConversationPromptSpec {
  const { personSlot, personAlt, timeSlot, timeAlt } = slots

  // Level-based template selection
  const template =
    level === 'beginner' ? copy.aiQuestionFirstTurnRewriteBeginner
    : level === 'intermediate' ? copy.aiQuestionFirstTurnRewriteIntermediate
    : copy.aiQuestionFirstTurnRewrite

  let prompt: string
  let expected: string
  const reqSlots: ConversationPromptSpec['requiredSlots'] = { requiresFullSentence: true }

  if (personSlot) {
    prompt = template.replace('{from}', personSlot).replace('{to}', personAlt)
    expected = buildVariation(currentAnswer, slots, 'person')
    reqSlots.person = personAlt
  } else if (timeSlot) {
    prompt = template.replace('{from}', timeSlot).replace('{to}', timeAlt)
    expected = buildVariation(currentAnswer, slots, 'time')
    reqSlots.time = timeAlt
  } else {
    prompt = copy.aiQuestionFirstTurnRepeat
    expected = currentAnswer
  }

  // Build ~3 natural answer variants
  const alts: string[] = []
  if (expected !== currentAnswer) {
    // Shorter variant only if time is NOT required
    if (!reqSlots.time) {
      const shorter = expected.replace(/\s+(today|yesterday|tomorrow|tonight)\s*\.?\s*$/i, '.').trim()
      if (shorter !== expected && shorter.length > 5) alts.push(shorter)
    }
  }

  return {
    turn: 1,
    kind: 'rewrite',
    prompt,
    expectedAnswer: expected,
    exampleAnswer: expected,
    alternativeAnswers: alts,
    requiredSlots: reqSlots,
  }
}

// ── Turn 2: Semantic Follow-up ──

function buildTurn2(
  currentAnswer: string,
  slots: SlotContext,
  copy: LessonCopy['activeCard'],
): ConversationPromptSpec {
  const { personSlot, personAlt, timeSlot, timeAlt } = slots

  let prompt: string
  let expected: string
  let example: string
  let alts: string[]
  const reqSlots: ConversationPromptSpec['requiredSlots'] = { requiresFullSentence: false }

  if (personSlot) {
    const candidates = [
      copy.aiQuestionR2PersonWho,
      copy.aiQuestionR2PersonConfirm.replace('{person}', personAlt),
    ]
    prompt = candidates[Math.floor(Math.random() * candidates.length)]

    // Check if prompt is yes/no — don't require person slot in yes/no answers
    if (/^(did|do|does|is|are|was|were|have|has|had|can|could|will|would)\s/i.test(prompt)) {
      expected = 'Yes, I did.'
      example = 'Yes, I did.'
      alts = ['Yeah, I did.', 'I did.']
      // No slot requirement for yes/no
    } else {
      reqSlots.person = personAlt
      expected = personAlt
      example = personAlt
      alts = [
        `I talked with ${personAlt}.`,
        `It was ${personAlt}.`,
      ]
    }
  } else if (timeSlot) {
    const candidates = [
      copy.aiQuestionR2TimeWhen,
      copy.aiQuestionR2TimeConfirm.replace('{time}', timeAlt),
    ]
    prompt = candidates[Math.floor(Math.random() * candidates.length)]

    if (/^(did|do|does|is|are|was|were|have|has|had|can|could|will|would)\s/i.test(prompt)) {
      expected = 'Yes, I did.'
      example = 'Yes, I did.'
      alts = ['Yeah, I did.', 'I did.']
      // No slot requirement for yes/no
    } else {
      reqSlots.time = timeAlt
      const capTime = timeAlt.charAt(0).toUpperCase() + timeAlt.slice(1)
      expected = timeAlt
      example = timeAlt
      alts = [
        `${capTime}.`,
        `It was ${timeAlt}.`,
        `I did it ${timeAlt}.`,
      ]
    }
  } else {
    prompt = copy.aiQuestionR2Generic
    expected = currentAnswer
    example = currentAnswer
    alts = []
    reqSlots.requiresFullSentence = true
  }

  return {
    turn: 2,
    kind: 'follow_up',
    prompt,
    expectedAnswer: expected,
    exampleAnswer: example,
    alternativeAnswers: alts,
    requiredSlots: reqSlots,
  }
}

// ── Turn 3: Full-Sentence Reconstruction ──

function buildTurn3(
  currentAnswer: string,
  slots: SlotContext,
  copy: LessonCopy['activeCard'],
): ConversationPromptSpec {
  const { personSlot, personAlt, timeSlot, timeAlt } = slots

  let prompt: string
  let expected: string
  const reqSlots: ConversationPromptSpec['requiredSlots'] = { requiresFullSentence: true }

  if (personSlot && timeSlot) {
    prompt = copy.aiQuestionR3FullSentenceBoth
      .replace('{person}', personAlt)
      .replace('{time}', timeAlt)
    expected = buildVariation(currentAnswer, slots, 'time')
    // Also apply person change if not already in the time variation
    if (!expected.includes(personAlt)) {
      expected = expected.replace(personSlot, personAlt)
    }
    reqSlots.person = personAlt
    reqSlots.time = timeAlt
  } else if (personSlot) {
    prompt = copy.aiQuestionR3FullSentencePerson.replace('{person}', personAlt)
    expected = buildVariation(currentAnswer, slots, 'person')
    reqSlots.person = personAlt
  } else if (timeSlot) {
    prompt = copy.aiQuestionR3FullSentenceTime.replace('{time}', timeAlt)
    expected = buildVariation(currentAnswer, slots, 'time')
    reqSlots.time = timeAlt
  } else {
    prompt = copy.aiQuestionR3Generic
    expected = currentAnswer
  }

  // Build natural full-sentence variants (only valid ones)
  const alts: string[] = []
  // Shorter variant without trailing time — only if time is NOT required
  if (!reqSlots.time) {
    const shorter = expected.replace(/\s+(today|yesterday|tomorrow|tonight)\s*\.?\s*$/i, '.').trim()
    if (shorter !== expected && shorter.length > 5) alts.push(shorter)
  }

  return {
    turn: 3,
    kind: 'reconstruct',
    prompt,
    expectedAnswer: expected,
    exampleAnswer: expected,
    alternativeAnswers: alts,
    requiredSlots: reqSlots,
  }
}

// ── Engine Entry Point ──

export function generateConversation(
  currentAnswer: string,
  slots: SlotContext,
  level: string | undefined,
  targetCopy: LessonCopy['activeCard'],
  regionContext?: RegionContext | null,
): ConversationEngineResult {
  const turn2 = buildTurn2(currentAnswer, slots, targetCopy)

  // Inject region flavor naturally into turn 2 prompt
  if (regionContext && turn2.prompt) {
    try {
      const places = regionContext.storeExamples ?? []
      const style = regionContext.speechStyle ?? 'casual'
      const place1 = places[0]
      const place2 = places[1]

      if (place1) {
        const placePhrase = place2
          ? `${place1} or ${place2}`
          : place1

        // Vary connector by speech style for natural tone difference
        if (style === 'polite') {
          turn2.prompt = `${turn2.prompt} — perhaps at a ${placePhrase}?`
        } else if (style === 'casual' || style === 'casual-fast') {
          turn2.prompt = `${turn2.prompt} — maybe at a ${placePhrase}?`
        } else {
          turn2.prompt = `${turn2.prompt} — for example, at a ${placePhrase}?`
        }
      }
    } catch { /* non-blocking */ }
  }

  return {
    round1: buildTurn1(currentAnswer, slots, level, targetCopy),
    round2: turn2,
    round3: buildTurn3(currentAnswer, slots, targetCopy),
  }
}

// ── Evaluation ──

export function evaluateConversationAnswer(
  transcript: string,
  spec: ConversationPromptSpec,
): ConversationEvaluationBucket {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean)
  const userWords = new Set(normalize(transcript))
  const lower = transcript.toLowerCase()

  // Silent / noise
  const noiseWords = new Set(['um', 'uh', 'hmm', 'ah', 'oh'])
  const meaningfulWords = [...userWords].filter((w) => !noiseWords.has(w))
  if (meaningfulWords.length === 0) return 'incorrect'

  // ── 1. Slot checks (highest priority) ──
  const { person, time, requiresFullSentence } = spec.requiredSlots
  let slotsMet = true

  if (person) {
    const personWords = person.toLowerCase().split(/\s+/)
    const hasTarget = personWords.every((w) => lower.includes(w))
    if (!hasTarget) slotsMet = false
  }

  if (time) {
    const hasTime = lower.includes(time.toLowerCase())
    if (!hasTime) {
      const expectedLower = spec.expectedAnswer.toLowerCase()
      if (expectedLower.includes(time.toLowerCase())) {
        slotsMet = false
      }
    }
  }

  // If required slots are not met → immediately partial or incorrect
  if (!slotsMet) {
    // Check if there's any relevant content at all
    const skipWords = new Set(['i', 'a', 'the', 'is', 'am', 'are', 'do', 'does', 'did', 'to', 'in', 'at', 'on', 'my', 'it', 'and', 'but', 'so', 'because', 'that', 'this', 'for', 'of', 'yes', 'yeah', 'no'])
    const contentWords = normalize(spec.expectedAnswer).filter((w) => !skipWords.has(w))
    const matched = contentWords.length > 0
      ? contentWords.filter((w) => userWords.has(w)).length / contentWords.length
      : 0
    return matched >= 0.2 ? 'partial' : 'incorrect'
  }

  // ── 2. Full-sentence check ──
  if (requiresFullSentence && meaningfulWords.length < 3) {
    return 'partial'
  }

  // ── 3. Similarity fallback (only when slots are satisfied) ──
  const skipWords = new Set(['i', 'a', 'the', 'is', 'am', 'are', 'do', 'does', 'did', 'to', 'in', 'at', 'on', 'my', 'it', 'and', 'but', 'so', 'because', 'that', 'this', 'for', 'of', 'yes', 'yeah', 'no'])
  const contentWords = normalize(spec.expectedAnswer).filter((w) => !skipWords.has(w))

  // For short expected answers (slot words only), slots already passed → correct
  if (contentWords.length === 0) return 'correct'

  const matched = contentWords.filter((w) => userWords.has(w)).length
  const ratio = matched / contentWords.length

  if (ratio >= 0.4) return 'correct'
  if (ratio >= 0.15) return 'partial'
  return 'incorrect'
}
