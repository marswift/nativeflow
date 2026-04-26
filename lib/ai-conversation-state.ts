/**
 * AI Conversation State Machine — single source of truth for conversation progression.
 *
 * Owns: state tracking, dimension management, user input classification, next-intent selection.
 * Does NOT own: natural wording (prompt's job), audio/UI (component's job).
 *
 * Both the API prompt path and the fallback path must use this for progression decisions.
 */

import { matchSceneQuestions } from './ai-conversation-scene-questions'

// ── Types ──

export type ConversationStage = 'greeting' | 'anchor_intro' | 'detail' | 'clarify' | 'wrap'

export type Dimension = 'action' | 'object' | 'people' | 'frequency' | 'place' | 'time' | 'feeling'

export type LastQuestionIntent =
  | 'yes_no'
  | 'detail_object'
  | 'detail_people'
  | 'detail_frequency'
  | 'detail_place'
  | 'detail_time'
  | 'detail_feeling'
  | 'clarify'
  | 'wrap'
  | null

export type UserInputType = 'clear_answer' | 'yes' | 'no' | 'fragment' | 'confusion' | 'garbled' | 'closing' | 'off_topic'

export type NextIntent = {
  stage: ConversationStage
  /** Internal action label for fallback rendering */
  action: 'greet' | 'ask_anchor' | 'ask_dimension' | 'clarify' | 'simplify' | 'redirect' | 'wrap'
  /** Typed question intent for semantic dedup and telemetry */
  questionIntent: LastQuestionIntent
  selectedDimension: Dimension | null
  /** Short instruction for the prompt — what to do, not how to word it */
  instruction: string
  /** Suggested question direction (for fallback text generation) */
  suggestedQuestion: string | null
  /** Whether wrap is allowed at this point */
  wrapAllowed: boolean
}

export type ConversationPlan = {
  lessonPhrase: string
  sceneTopic: string
  /** Matched scene id from question library, or null for generic */
  matchedScene: string | null
  anchorAction: string
  anchorQuestion: string
  /** Dimension → question pool. Iteration order = question order. */
  dimensions: Partial<Record<Dimension, string[]>>
  clarificationPrompts: {
    fragment: string[]
    confusion: string[]
    garbled: string[]
  }
  wrapPrompts: string[]
}

export type ConversationState = {
  stage: ConversationStage
  turnIndex: number
  coveredDimensions: Dimension[]
  lastQuestionIntent: LastQuestionIntent
  lastAskedQuestion: string | null
  userInputType: UserInputType | null
  plan: ConversationPlan
  /** Consecutive repair attempts on current dimension (max 2 before skip). V2.6 slot validation. */
  repairCount: number
  /** Slot values filled so far by dimension. V2.6 slot validation. */
  filledSlots: Partial<Record<Dimension, string>>
}

// ── Constants ──

const MAX_TURNS = 5

/** Question pool templates per expandable dimension */
const QUESTION_TEMPLATES: Record<Exclude<Dimension, 'action'>, ((action: string) => string)[]> = {
  object: [
    (a) => `What do you ${a} first?`,
  ],
  people: [
    (a) => `Do you ${a} alone or with someone?`,
  ],
  frequency: [
    (a) => `Do you ${a} every day?`,
    (a) => `How often do you ${a}?`,
  ],
  place: [
    (a) => `Do you ${a} at home?`,
  ],
  time: [
    (a) => `When do you usually ${a}?`,
  ],
  feeling: [
    (_a) => `Do you enjoy it?`,
    (_a) => `Is it hard?`,
  ],
}

/** Map dimension → typed question intent */
function dimensionToQuestionIntent(dim: Dimension): LastQuestionIntent {
  switch (dim) {
    case 'action': return 'yes_no'
    case 'object': return 'detail_object'
    case 'people': return 'detail_people'
    case 'frequency': return 'detail_frequency'
    case 'place': return 'detail_place'
    case 'time': return 'detail_time'
    case 'feeling': return 'detail_feeling'
  }
}

// ── Lesson phrase → conversation plan ──

export function buildConversationPlan(lessonPhrase: string): ConversationPlan {
  const lower = lessonPhrase.trim().toLowerCase().replace(/[.!?]+$/, '')

  // Extract the main action verb phrase
  const subjectMatch = lower.match(/^(?:i|we|you)\s+(.+)$/)
  const anchorAction = subjectMatch?.[1] ?? lower

  const sceneTopic = lessonPhrase.replace(/[.!?]+$/, '').trim()

  // Try scene-specific question library first
  const sceneMatch = matchSceneQuestions(lessonPhrase)

  if (sceneMatch) {
    const dimensions: Partial<Record<Dimension, string[]>> = {}
    for (const dim of sceneMatch.dimensionOrder) {
      const pool = sceneMatch.dimensions[dim]
      if (pool && pool.length > 0) dimensions[dim] = pool
    }
    return {
      lessonPhrase,
      sceneTopic,
      matchedScene: sceneMatch.id,
      anchorAction,
      anchorQuestion: sceneMatch.anchorQuestion,
      dimensions,
      clarificationPrompts: sceneMatch.clarificationPrompts,
      wrapPrompts: [
        'Nice talking with you. See you later!',
        'Sounds good. Have a good day!',
        'Alright, see you next time!',
        'Great chat. Talk to you soon!',
        'It was fun talking. See you!',
        'Thanks for chatting. Take care!',
        'Really nice talking with you. Bye!',
        'Hope you have a great day!',
      ],
    }
  }

  // Fallback to generic templates when no scene matches
  const anchorQuestion = `Do you ${anchorAction}?`

  type ExpandableDim = Exclude<Dimension, 'action'>
  let dimOrder: ExpandableDim[]

  if (/after|before|morning|evening|night/.test(lower)) {
    dimOrder = ['frequency', 'people', 'object', 'feeling', 'time']
  } else if (/with|family|friend|together/.test(lower)) {
    dimOrder = ['time', 'place', 'object', 'feeling', 'frequency']
  } else {
    dimOrder = ['time', 'people', 'place', 'frequency', 'object', 'feeling']
  }

  const dimensions: Partial<Record<Dimension, string[]>> = {}
  for (const dim of dimOrder) {
    const templates = QUESTION_TEMPLATES[dim]
    dimensions[dim] = templates.map((fn) => fn(anchorAction))
  }

  return {
    lessonPhrase,
    sceneTopic,
    matchedScene: null,
    anchorAction,
    anchorQuestion,
    dimensions,
    clarificationPrompts: {
      fragment: ['Could you say a bit more?'],
      confusion: [`No problem. ${anchorQuestion}`, `That's okay. Do you ${anchorAction}?`],
      garbled: [`I'm not sure I understood. ${anchorQuestion}`],
    },
    wrapPrompts: [
      'Nice talking with you. See you later!',
      'Sounds good. Have a good day!',
      'Alright, see you next time!',
    ],
  }
}

// ── User input classification ──

export function classifyUserInput(text: string, anchorAction?: string, plan?: ConversationPlan): UserInputType {
  const trimmed = text.trim()
  const lower = trimmed.toLowerCase()
  const words = trimmed.split(/\s+/).filter(Boolean)

  if (!trimmed) return 'garbled'

  if (/\b(bye|goodbye|see you|take care|good night|see you later|see you next time)\b/i.test(lower)) return 'closing'
  if (/\b(i don'?t understand|sorry\??|what\??|huh\??|i don'?t know)\b/i.test(lower)) return 'confusion'
  if (/^(yes|yeah|yep|yup|i do|i did|sure|of course|right|ok|okay)\b/i.test(lower)) return 'yes'
  if (/^(no|nope|not really|i don'?t|i do not|never|not)\b/i.test(lower)) return 'no'
  if (words.length <= 2 && !/[.!?]$/.test(trimmed)) return 'fragment'
  if (words.length >= 2 && !/[aeiou]/i.test(trimmed)) return 'garbled'

  // Off-topic detection: check user content words against anchor + scene vocabulary
  if (anchorAction && words.length >= 4) {
    const stopWords = new Set(['i', 'a', 'the', 'is', 'am', 'are', 'do', 'does', 'did', 'to', 'in', 'at', 'on', 'my', 'it', 'and', 'but', 'so', 'that', 'this', 'for', 'of', 'with', 'not', 'was', 'were', 'be', 'have', 'has', 'had', 'just', 'like', 'really', 'very', 'also', 'too'])
    const userContentWords = new Set(words.map((w) => w.toLowerCase()).filter((w) => !stopWords.has(w)))

    // Build scene vocabulary: anchor action words + all dimension question words
    const sceneWords = new Set(
      anchorAction.toLowerCase().split(/\s+/).filter((w) => !stopWords.has(w))
    )
    if (plan) {
      for (const pool of Object.values(plan.dimensions)) {
        if (!pool) continue
        for (const q of pool) {
          for (const w of q.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/)) {
            if (!stopWords.has(w) && w.length > 2) sceneWords.add(w)
          }
        }
      }
    }

    // Simple stem: strip common suffixes for fuzzy matching
    const stem = (w: string) => w.replace(/(ing|ed)$/, '').replace(/s$/, '')
    const sceneStemmed = new Set([...sceneWords].map(stem))
    const hasOverlap = [...userContentWords].some((w) => sceneWords.has(w) || sceneStemmed.has(stem(w)))
    if (sceneWords.size > 0 && !hasOverlap) {
      return 'off_topic'
    }
  }

  return 'clear_answer'
}

// ── State management ──

export function createInitialState(lessonPhrase: string): ConversationState {
  return {
    stage: 'greeting',
    turnIndex: 0,
    coveredDimensions: [],
    lastQuestionIntent: null,
    lastAskedQuestion: null,
    userInputType: null,
    plan: buildConversationPlan(lessonPhrase),
    repairCount: 0,
    filledSlots: {},
  }
}

function getNextUncoveredDimension(state: ConversationState): Dimension | null {
  const dims = Object.keys(state.plan.dimensions) as Dimension[]
  for (const dim of dims) {
    if (!state.coveredDimensions.includes(dim)) return dim
  }
  return null
}

function getDimensionQuestion(dim: Dimension, plan: ConversationPlan, turnIndex = 0): string | null {
  const pool = plan.dimensions[dim]
  if (!pool || pool.length === 0) return null
  return pool[turnIndex % pool.length]
}

// ── Deterministic next-intent selection ──

export function selectNextIntent(state: ConversationState, userInput: UserInputType): NextIntent {
  const { stage, turnIndex, plan } = state

  // Closing — always honor
  if (userInput === 'closing' || turnIndex >= MAX_TURNS - 1) {
    return {
      stage: 'wrap', action: 'wrap', questionIntent: 'wrap',
      selectedDimension: null,
      instruction: 'Say a short natural goodbye. React to what the user said first.',
      suggestedQuestion: null,
      wrapAllowed: true,
    }
  }

  // Greeting stage (turn 0)
  if (stage === 'greeting') {
    return {
      stage: 'anchor_intro', action: 'ask_anchor', questionIntent: 'yes_no',
      selectedDimension: 'action',
      instruction: `Respond to the greeting naturally. Then smoothly lead into the topic of "${plan.anchorAction}". Ask one simple question about it.`,
      suggestedQuestion: plan.anchorQuestion,
      wrapAllowed: false,
    }
  }

  // Confusion — simplify
  if (userInput === 'confusion') {
    return {
      stage: 'clarify', action: 'simplify', questionIntent: 'clarify',
      selectedDimension: null,
      instruction: `The learner is confused. Simplify. Use easier words. Stay on "${plan.anchorAction}".`,
      suggestedQuestion: `Do you ${plan.anchorAction}?`,
      wrapAllowed: false,
    }
  }

  // Fragment or garbled — clarify, do NOT progress
  if (userInput === 'fragment' || userInput === 'garbled') {
    return {
      stage: 'clarify', action: 'clarify', questionIntent: 'clarify',
      selectedDimension: null,
      instruction: 'The learner gave a very short or unclear answer. CRITICAL: Do NOT progress to the next dimension. Echo back their exact words as a question to confirm meaning (e.g. "Friendly?" / "Do you mean you appreciate it?"). Only after they clarify should you continue.',
      suggestedQuestion: null,
      wrapAllowed: false,
    }
  }

  // Off-topic — soft redirect back to scene
  if (userInput === 'off_topic') {
    return {
      stage: 'detail', action: 'redirect', questionIntent: null,
      selectedDimension: null,
      instruction: `The learner went off topic. Acknowledge briefly, then gently bring the conversation back to "${plan.anchorAction}". Do NOT abruptly snap back to the lesson phrase text.`,
      suggestedQuestion: plan.anchorQuestion,
      wrapAllowed: false,
    }
  }

  // Progress to next dimension
  const nextDim = getNextUncoveredDimension(state)

  if (stage === 'anchor_intro' || stage === 'detail' || stage === 'clarify') {
    if (userInput === 'yes' || userInput === 'clear_answer') {
      if (nextDim) {
        const q = getDimensionQuestion(nextDim, plan, turnIndex)
        return {
          stage: 'detail', action: 'ask_dimension',
          questionIntent: dimensionToQuestionIntent(nextDim),
          selectedDimension: nextDim,
          instruction: `Acknowledge briefly. Ask about ${nextDim}. Do NOT repeat any previous question.`,
          suggestedQuestion: q,
          wrapAllowed: false,
        }
      }
      return {
        stage: 'wrap', action: 'wrap', questionIntent: 'wrap',
        selectedDimension: null,
        instruction: 'All topics covered. React and say goodbye.',
        suggestedQuestion: null,
        wrapAllowed: true,
      }
    }

    if (userInput === 'no') {
      if (nextDim) {
        const q = getDimensionQuestion(nextDim, plan, turnIndex)
        return {
          stage: 'detail', action: 'ask_dimension',
          questionIntent: dimensionToQuestionIntent(nextDim),
          selectedDimension: nextDim,
          instruction: `They said no. Acknowledge briefly. Ask about ${nextDim} instead.`,
          suggestedQuestion: q,
          wrapAllowed: false,
        }
      }
      return {
        stage: 'wrap', action: 'wrap', questionIntent: 'wrap',
        selectedDimension: null,
        instruction: 'React briefly and say goodbye.',
        suggestedQuestion: null,
        wrapAllowed: true,
      }
    }
  }

  // Default wrap
  return {
    stage: 'wrap', action: 'wrap', questionIntent: 'wrap',
    selectedDimension: null,
    instruction: 'React and close naturally.',
    suggestedQuestion: null,
    wrapAllowed: true,
  }
}

// ── State transition ──

export function advanceState(state: ConversationState, userInput: UserInputType, intent: NextIntent): ConversationState {
  const isRepair = intent.action === 'clarify' || intent.action === 'simplify'
  const nextRepairCount = isRepair ? state.repairCount + 1 : 0

  // If repair count hit limit (2), skip the stuck dimension and move on
  if (isRepair && nextRepairCount >= 2) {
    const nextDim = getNextUncoveredDimension(state)
    // Mark the current stuck dimension as covered (skip it) by keeping coveredDimensions as-is
    // and moving to the next available dimension's stage
    return {
      ...state,
      stage: nextDim ? 'detail' : 'wrap',
      turnIndex: state.turnIndex + 1,
      coveredDimensions: state.coveredDimensions,
      lastQuestionIntent: nextDim ? dimensionToQuestionIntent(nextDim) : 'wrap',
      lastAskedQuestion: nextDim ? (getDimensionQuestion(nextDim, state.plan, state.turnIndex) ?? null) : null,
      userInputType: userInput,
      repairCount: 0,
    }
  }

  return {
    ...state,
    stage: intent.stage,
    turnIndex: state.turnIndex + 1,
    coveredDimensions: intent.selectedDimension
      ? [...state.coveredDimensions, intent.selectedDimension]
      : state.coveredDimensions,
    lastQuestionIntent: intent.questionIntent,
    lastAskedQuestion: intent.suggestedQuestion ?? null,
    userInputType: userInput,
    repairCount: nextRepairCount,
  }
}

// ── Serialization (for passing to API) ──

export type SerializedConversationState = {
  stage: ConversationStage
  turnIndex: number
  coveredDimensions: Dimension[]
  lastQuestionIntent: LastQuestionIntent
  sceneTopic: string
  anchorAction: string
}

export function serializeState(state: ConversationState): SerializedConversationState {
  return {
    stage: state.stage,
    turnIndex: state.turnIndex,
    coveredDimensions: state.coveredDimensions,
    lastQuestionIntent: state.lastQuestionIntent,
    sceneTopic: state.plan.sceneTopic,
    anchorAction: state.plan.anchorAction,
  }
}
