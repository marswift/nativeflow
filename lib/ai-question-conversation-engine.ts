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

/**
 * Parse a sentence into semantic components for slot-less question generation.
 * Returns subject, verb phrase, and object/complement if extractable.
 */
function parseSentenceParts(sentence: string): {
  subject: string
  verbPhrase: string
  afterVerb: string
  hasAfter: boolean
} {
  // Match: "I/We/They/He/She + verb phrase + rest"
  const match = sentence.match(
    /^(I|We|They|He|She|You)\s+([\w\s]+?)\s+(after|before|at|in|on|with|to|for|from|the|a|an|my|our|their)\b(.*)$/i
  )
  if (match) {
    return {
      subject: match[1],
      verbPhrase: match[2].trim(),
      afterVerb: (match[3] + match[4]).replace(/[.!?]+$/, '').trim(),
      hasAfter: true,
    }
  }
  // Fallback: just split at the verb
  const simpleMatch = sentence.match(/^(I|We|They|He|She|You)\s+(.+)$/i)
  if (simpleMatch) {
    return {
      subject: simpleMatch[1],
      verbPhrase: simpleMatch[2].replace(/[.!?]+$/, '').trim(),
      afterVerb: '',
      hasAfter: false,
    }
  }
  return { subject: '', verbPhrase: sentence, afterVerb: '', hasAfter: false }
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * Build beginner-friendly 3-turn questions for sentences without extractable slots.
 * Designed to feel like a natural short conversation, not a grammar drill.
 */
function buildBeginnerSlotlessConversation(
  currentAnswer: string,
  parts: ReturnType<typeof parseSentenceParts>,
): ConversationEngineResult {
  const verb = parts.verbPhrase
  const after = parts.afterVerb
  const hasAfter = parts.hasAfter

  // ── Turn 1: Yes/No confirmation — easy warm-up ──
  const t1Prompt = hasAfter
    ? `Do you ${verb} ${after}?`
    : `Do you ${verb}?`
  const t1Expected = hasAfter ? `Yes, I ${verb} ${after}.` : `Yes, I ${verb}.`
  const t1Alts = ['Yes, I do.', 'Yes.', 'Yeah.', currentAnswer]

  // ── Turn 2: Varied follow-up — pick a different question type each time ──
  type QGen = { prompt: string; expected: string; alts: string[] }
  const t2Candidates: QGen[] = []

  if (hasAfter) {
    // "When do you clean up?" / "What do you do after breakfast?"
    t2Candidates.push({
      prompt: `When do you ${verb}?`,
      expected: after.charAt(0).toUpperCase() + after.slice(1) + '.',
      alts: [`I ${verb} ${after}.`, currentAnswer],
    })
    t2Candidates.push({
      prompt: `What do you do ${after}?`,
      expected: `I ${verb}.`,
      alts: [currentAnswer, `I ${verb} ${after}.`],
    })
  }

  // "Do you do it every day?" — frequency question
  t2Candidates.push({
    prompt: 'Do you do this every day?',
    expected: 'Yes, every day.',
    alts: ['Yes, I do.', 'Almost every day.', 'Most days.', 'Sometimes.'],
  })

  // "Do you like doing it?"
  t2Candidates.push({
    prompt: `Do you like to ${verb}?`,
    expected: 'Yes, I do.',
    alts: ['Yes.', 'Not really.', 'Sometimes.', "It's okay."],
  })

  if (hasAfter && verb.split(/\s+/).length <= 3) {
    // "What do you clean?" — object question
    const verbWords = verb.split(/\s+/)
    if (verbWords.length >= 1) {
      t2Candidates.push({
        prompt: `What do you ${verbWords[0]}?`,
        expected: `I ${verb} ${after}.`,
        alts: [currentAnswer, after.charAt(0).toUpperCase() + after.slice(1) + '.'],
      })
    }
  }

  const t2 = pickRandom(t2Candidates)

  // ── Turn 3: Full sentence reconstruction — natural prompt ──
  const t3Prompts = [
    'Can you say the whole sentence?',
    'Say it all together now.',
    'One more time — the full sentence.',
  ]
  const t3Prompt = pickRandom(t3Prompts)

  return {
    round1: {
      turn: 1, kind: 'rewrite', prompt: t1Prompt,
      expectedAnswer: t1Expected, exampleAnswer: t1Expected,
      alternativeAnswers: t1Alts,
      requiredSlots: { requiresFullSentence: false },
    },
    round2: {
      turn: 2, kind: 'follow_up', prompt: t2.prompt,
      expectedAnswer: t2.expected, exampleAnswer: t2.expected,
      alternativeAnswers: t2.alts,
      requiredSlots: { requiresFullSentence: false },
    },
    round3: {
      turn: 3, kind: 'reconstruct', prompt: t3Prompt,
      expectedAnswer: currentAnswer, exampleAnswer: currentAnswer,
      alternativeAnswers: [],
      requiredSlots: { requiresFullSentence: true },
    },
  }
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
    // No slots found — ask a Yes/No confirmation question instead of repeating
    const parts = parseSentenceParts(currentAnswer)
    if (parts.subject && parts.hasAfter) {
      // "I clean up after breakfast" → "Do you clean up after breakfast?"
      const verb = parts.verbPhrase
      prompt = `Do you ${verb} ${parts.afterVerb}?`
      expected = `Yes, I ${verb} ${parts.afterVerb}.`
      reqSlots.requiresFullSentence = false
    } else {
      prompt = copy.aiQuestionFirstTurnRepeat
      expected = currentAnswer
    }
  }

  // Build ~3 natural answer variants
  const alts: string[] = []
  if (expected !== currentAnswer) {
    alts.push(currentAnswer)
    // Short affirmative
    alts.push('Yes, I do.')
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
    // No slots — ask "What" or "When" question to vary the answer
    const parts = parseSentenceParts(currentAnswer)
    if (parts.hasAfter) {
      // "I clean up after breakfast" → "When do you clean up?"
      prompt = `When do you ${parts.verbPhrase}?`
      expected = parts.afterVerb.charAt(0).toUpperCase() + parts.afterVerb.slice(1) + '.'
      example = expected
      alts = [
        `I ${parts.verbPhrase} ${parts.afterVerb}.`,
        currentAnswer,
      ]
    } else if (parts.verbPhrase) {
      // "I study English" → "What do you study?"
      const verbWords = parts.verbPhrase.split(/\s+/)
      if (verbWords.length >= 2) {
        const verb = verbWords[0]
        const obj = verbWords.slice(1).join(' ')
        prompt = `What do you ${verb}?`
        expected = obj.charAt(0).toUpperCase() + obj.slice(1) + '.'
        example = expected
        alts = [`I ${parts.verbPhrase}.`, currentAnswer]
      } else {
        prompt = copy.aiQuestionR2Generic
        expected = currentAnswer
        example = currentAnswer
        alts = []
        reqSlots.requiresFullSentence = true
      }
    } else {
      prompt = copy.aiQuestionR2Generic
      expected = currentAnswer
      example = currentAnswer
      alts = []
      reqSlots.requiresFullSentence = true
    }
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
    // No slots — ask user to describe the full action
    const parts = parseSentenceParts(currentAnswer)
    if (parts.hasAfter) {
      prompt = `What do you do ${parts.afterVerb}?`
      expected = currentAnswer
    } else {
      prompt = copy.aiQuestionR3Generic
      expected = currentAnswer
    }
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
  // Beginner + no extractable slots → use conversational question flow
  const hasSlots = Boolean(slots.personSlot || slots.timeSlot)
  if (level === 'beginner' && !hasSlots) {
    const parts = parseSentenceParts(currentAnswer)
    if (parts.subject) {
      return buildBeginnerSlotlessConversation(currentAnswer, parts)
    }
  }

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

  const skipWords = new Set(['i', 'a', 'the', 'is', 'am', 'are', 'do', 'does', 'did', 'to', 'in', 'at', 'on', 'my', 'it', 'and', 'but', 'so', 'because', 'that', 'this', 'for', 'of', 'yes', 'yeah', 'no'])

  // ── 0. Check against alternative answers first ──
  if (spec.alternativeAnswers.length > 0) {
    for (const alt of spec.alternativeAnswers) {
      const altWords = normalize(alt)
      const altContent = altWords.filter((w) => !skipWords.has(w))
      if (altContent.length === 0) {
        // Short answer like "Yes, I do." — check if user said any affirmative
        if (/\b(yes|yeah|yep|sure|i do|i did)\b/i.test(lower)) return 'correct'
      } else {
        const matched = altContent.filter((w) => userWords.has(w)).length
        if (altContent.length > 0 && matched / altContent.length >= 0.6) return 'correct'
      }
    }
  }

  // ── 0b. Yes/No question shortcut ──
  // If the prompt is a yes/no question and user gives an affirmative, accept it
  if (!spec.requiredSlots.requiresFullSentence && /^(do|does|did|is|are|was|were|have|has|had|can|could|will|would)\s/i.test(spec.prompt)) {
    if (/\b(yes|yeah|yep|sure|i do|i did|i am|i can|i will)\b/i.test(lower)) return 'correct'
    if (/\b(no|nope|i don'?t|i didn'?t|i can'?t)\b/i.test(lower)) return 'correct'
  }

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

  // ── 3. Similarity against expected answer ──
  const contentWords = normalize(spec.expectedAnswer).filter((w) => !skipWords.has(w))

  // For short expected answers (slot words only), slots already passed → correct
  if (contentWords.length === 0) return 'correct'

  const matched = contentWords.filter((w) => userWords.has(w)).length
  const ratio = matched / contentWords.length

  if (ratio >= 0.4) return 'correct'
  if (ratio >= 0.15) return 'partial'
  return 'incorrect'
}
