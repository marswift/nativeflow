/**
 * AI Conversation Extended Engine
 *
 * Controlled 5-turn conversation for the ai_conversation lesson stage.
 * NOT free chat — bounded topic, controlled follow-ups, evaluable.
 *
 * Turn 1: AI opens (context question)
 * Turn 2: User answers (short OK)
 * Turn 3: AI follow-up (bounded)
 * Turn 4: User expands (full sentence encouraged — reuse learned sentence)
 * Turn 5: AI closes conversation
 */

// ── Types ──

export type ExtendedConversationTurn = {
  speaker: 'ai' | 'user'
  text: string
}

export type ExtendedTurnSpec = {
  turn: 1 | 2 | 3 | 4 | 5
  aiPrompt: string
  expectedAnswer: string
  alternativeAnswers: string[]
  requiredSlots: {
    person?: string | null
    time?: string | null
  }
  requiresFullSentence: boolean
  isClosing: boolean
}

export type ExtendedConversationState = {
  turns: ExtendedTurnSpec[]
  turnIndex: number
  topic: 'who' | 'when' | 'what'
  scene: 'daily' | 'school' | 'friends'
}

export type ExtendedEvaluationBucket = 'correct' | 'partial' | 'incorrect'

// ── Scene detection ──

function detectScene(sentence: string): 'daily' | 'school' | 'friends' {
  const l = sentence.toLowerCase()
  if (/school|class|study|teacher|homework|lesson/i.test(l)) return 'school'
  if (/friend|talk|chat|meet|play|hang out/i.test(l)) return 'friends'
  return 'daily'
}

function detectTopic(_sentence: string, personSlot: string, timeSlot: string): 'who' | 'when' | 'what' {
  if (personSlot) return 'who'
  if (timeSlot) return 'when'
  return 'what'
}

// ── Template pools (controlled randomness — no free generation) ──

const OPENERS: Record<'daily' | 'school' | 'friends', Record<'who' | 'when' | 'what', string[]>> = {
  daily: {
    who:  ['Who did you spend time with today?', 'Did you talk with someone today?'],
    when: ['What did you do today?', 'How was your day?'],
    what: ['What did you do today?', 'How was your day?'],
  },
  school: {
    who:  ['Who did you talk with at school?', 'Did you see your teacher today?'],
    when: ['What time did you go to school?', 'How was school today?'],
    what: ['What did you do at school today?', 'How was school?'],
  },
  friends: {
    who:  ['Who did you hang out with?', 'Did you talk with your friend today?'],
    when: ['When did you meet your friend?', 'What time did you meet up?'],
    what: ['What did you do with your friend?', 'Did you have fun with your friend?'],
  },
}

const FOLLOW_UPS: Record<'who' | 'when' | 'what', Record<'daily' | 'school' | 'friends', string[]>> = {
  who: {
    daily:   ['Nice. Who was it?', 'I see. Was it someone from work?'],
    school:  ['Nice. Was it your teacher?', 'I see. Who was it?'],
    friends: ['Nice. Who did you talk with?', 'I see. Was it your friend?'],
  },
  when: {
    daily:   ['Nice. What time was that?', 'I see. Was it in the morning?'],
    school:  ['Nice. Was it in the morning?', 'I see. What time?'],
    friends: ['Nice. When did you meet up?', 'I see. Was it in the afternoon?'],
  },
  what: {
    daily:   ['Nice. What did you do?', 'I see. How was it?'],
    school:  ['Nice. What did you study?', 'I see. Was it interesting?'],
    friends: ['Nice. What did you talk about?', 'I see. Was it fun?'],
  },
}

const EXPANSION_PROMPTS: Record<'daily' | 'school' | 'friends', string[]> = {
  daily:   ['Can you tell me the whole sentence?', 'Can you say that as a full sentence?'],
  school:  ['Can you say the whole sentence?', 'Try saying it as a full sentence.'],
  friends: ['Can you say the whole thing?', 'Try saying it in a full sentence.'],
}

const CLOSINGS: string[] = [
  'Great talking with you! See you next time!',
  'Nice chat! Keep it up!',
  'Good job! See you next lesson!',
]

// ── Helpers ──

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ── Engine entry point ──

export function generateExtendedConversation(
  currentAnswer: string,
  personSlot: string,
  personAlt: string,
  timeSlot: string,
  timeAlt: string,
): ExtendedConversationState {
  const scene = detectScene(currentAnswer)
  const topic = detectTopic(currentAnswer, personSlot, timeSlot)

  // Turn 1: AI opener
  const opener = pick(OPENERS[scene][topic])

  // Turn 3: AI follow-up (bounded)
  const followUp = pick(FOLLOW_UPS[topic][scene])

  // Turn 5: AI closing
  const closing = pick(CLOSINGS)

  // Turn 2 expected answer: short answer is OK
  let turn2Expected: string
  let turn2Alts: string[]
  const turn2Slots: ExtendedTurnSpec['requiredSlots'] = {}

  if (topic === 'who') {
    turn2Expected = personSlot || 'my friend'
    turn2Alts = [
      `${(personSlot || 'My friend').charAt(0).toUpperCase()}${(personSlot || 'my friend').slice(1)}.`,
      `I talked with ${personSlot || 'my friend'}.`,
      `It was ${personSlot || 'my friend'}.`,
    ]
    turn2Slots.person = personSlot || null
  } else if (topic === 'when') {
    turn2Expected = timeSlot || 'today'
    turn2Alts = [
      `${(timeSlot || 'Today').charAt(0).toUpperCase()}${(timeSlot || 'today').slice(1)}.`,
      `It was ${timeSlot || 'today'}.`,
      `I did it ${timeSlot || 'today'}.`,
    ]
    turn2Slots.time = timeSlot || null
  } else {
    turn2Expected = currentAnswer
    turn2Alts = []
  }

  // Turn 4 expected answer: full sentence — reuse the learned sentence
  const turn4Expected = currentAnswer
  const turn4Alts: string[] = []
  // Shorter variant if time can be dropped
  if (timeSlot) {
    const shorter = currentAnswer.replace(new RegExp(`\\s+${timeSlot}\\s*\\.?\\s*$`, 'i'), '.').trim()
    if (shorter !== currentAnswer && shorter.length > 5) turn4Alts.push(shorter)
  }

  // Turn 4: AI expansion prompt
  const expansion = pick(EXPANSION_PROMPTS[scene])

  const turns: ExtendedTurnSpec[] = [
    // Turn 1: AI opener → user answers
    {
      turn: 1,
      aiPrompt: opener,
      expectedAnswer: turn2Expected,
      alternativeAnswers: turn2Alts,
      requiredSlots: turn2Slots,
      requiresFullSentence: false,
      isClosing: false,
    },
    // Turn 2: user already answered → Turn 3 is AI follow-up → user answers
    {
      turn: 3,
      aiPrompt: followUp,
      expectedAnswer: turn2Expected,
      alternativeAnswers: turn2Alts,
      requiredSlots: turn2Slots,
      requiresFullSentence: false,
      isClosing: false,
    },
    // Turn 4: AI expansion → user gives full sentence
    {
      turn: 4,
      aiPrompt: expansion,
      expectedAnswer: turn4Expected,
      alternativeAnswers: turn4Alts,
      requiredSlots: { person: personSlot || null, time: timeSlot || null },
      requiresFullSentence: true,
      isClosing: false,
    },
    // Turn 5: AI closing (no user response needed)
    {
      turn: 5,
      aiPrompt: closing,
      expectedAnswer: '',
      alternativeAnswers: [],
      requiredSlots: {},
      requiresFullSentence: false,
      isClosing: true,
    },
  ]

  return { turns, turnIndex: 0, scene, topic }
}

// ── Evaluation (relaxed — short answers OK for turns 1-3) ──

export function evaluateExtendedAnswer(
  transcript: string,
  spec: ExtendedTurnSpec,
): ExtendedEvaluationBucket {
  // Closing turn — always correct
  if (spec.isClosing) return 'correct'

  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean)
  const userWords = new Set(normalize(transcript))
  const lower = transcript.toLowerCase()

  // Silent / noise
  const noiseWords = new Set(['um', 'uh', 'hmm', 'ah', 'oh'])
  const meaningfulWords = [...userWords].filter((w) => !noiseWords.has(w))
  if (meaningfulWords.length === 0) return 'incorrect'

  // ── 1. Slot check (highest priority) ──
  const { person, time } = spec.requiredSlots
  let slotsMet = true

  if (person) {
    const personWords = person.toLowerCase().split(/\s+/)
    if (!personWords.every((w) => lower.includes(w))) slotsMet = false
  }

  if (time) {
    if (!lower.includes(time.toLowerCase())) slotsMet = false
  }

  // Slots failed → partial or incorrect
  if (!slotsMet) {
    const skipWords = new Set(['i', 'a', 'the', 'is', 'am', 'are', 'do', 'does', 'did', 'to', 'in', 'at', 'on', 'my', 'it', 'and', 'but', 'so', 'that', 'this', 'for', 'of', 'yes', 'yeah', 'no'])
    const contentWords = normalize(spec.expectedAnswer).filter((w) => !skipWords.has(w))
    const matched = contentWords.length > 0
      ? contentWords.filter((w) => userWords.has(w)).length / contentWords.length
      : 0
    return matched >= 0.2 ? 'partial' : 'incorrect'
  }

  // ── 2. Full-sentence check (only Turn 4) ──
  if (spec.requiresFullSentence && meaningfulWords.length < 3) {
    return 'partial'
  }

  // ── 3. Similarity fallback (slots satisfied) ──
  const skipWords = new Set(['i', 'a', 'the', 'is', 'am', 'are', 'do', 'does', 'did', 'to', 'in', 'at', 'on', 'my', 'it', 'and', 'but', 'so', 'that', 'this', 'for', 'of', 'yes', 'yeah', 'no'])
  const contentWords = normalize(spec.expectedAnswer).filter((w) => !skipWords.has(w))

  if (contentWords.length === 0) return 'correct'

  const matched = contentWords.filter((w) => userWords.has(w)).length
  const ratio = matched / contentWords.length

  if (ratio >= 0.3) return 'correct'
  if (ratio >= 0.1) return 'partial'
  return 'incorrect'
}
