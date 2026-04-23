/**
 * AI Conversation State Machine — single source of truth for conversation progression.
 *
 * Owns: state tracking, dimension management, user input classification, next-intent selection.
 * Does NOT own: natural wording (prompt's job), audio/UI (component's job).
 *
 * Both the API prompt path and the fallback path must use this for progression decisions.
 */

// ── Types ──

export type ConversationStage = 'greeting' | 'anchor_intro' | 'detail' | 'clarify' | 'wrap'

export type Dimension = 'when' | 'who' | 'where' | 'how_often' | 'what_detail' | 'feeling' | 'alternative'

export type UserInputType = 'clear_answer' | 'yes' | 'no' | 'fragment' | 'confusion' | 'garbled' | 'closing' | 'off_topic'

export type NextIntent = {
  stage: ConversationStage
  action: 'greet' | 'ask_anchor' | 'ask_dimension' | 'clarify' | 'simplify' | 'redirect' | 'wrap'
  dimension: Dimension | null
  /** Short instruction for the prompt — what to do, not how to word it */
  instruction: string
  /** Suggested question direction (for fallback text generation) */
  suggestedQuestion: string | null
}

export type ConversationPlan = {
  anchorAction: string
  anchorTopic: string
  anchorQuestion: string
  dimensions: Dimension[]
}

export type ConversationState = {
  stage: ConversationStage
  turnIndex: number
  coveredDimensions: Dimension[]
  lastQuestionIntent: string | null
  lastUserInputType: UserInputType | null
  plan: ConversationPlan
}

// ── Constants ──

const MAX_TURNS = 5

const DIMENSION_QUESTIONS: Record<Dimension, (action: string) => string> = {
  when: (a) => `When do you ${a}?`,
  who: (a) => `Who do you ${a} with?`,
  where: (a) => `Where do you usually ${a}?`,
  how_often: (a) => `How often do you ${a}?`,
  what_detail: (a) => `What exactly do you ${a}?`,
  feeling: (a) => `Do you like to ${a}?`,
  alternative: (a) => `What else do you do besides ${a}?`,
}

// ── Lesson phrase → conversation plan ──

export function buildConversationPlan(lessonPhrase: string): ConversationPlan {
  const lower = lessonPhrase.trim().toLowerCase().replace(/[.!?]+$/, '')

  // Extract the main action verb phrase
  const subjectMatch = lower.match(/^(?:i|we|you)\s+(.+)$/)
  const anchorAction = subjectMatch?.[1] ?? lower

  const anchorTopic = lessonPhrase.replace(/[.!?]+$/, '').trim()
  const anchorQuestion = `Do you ${anchorAction}?`

  // Select relevant dimensions — order matters (first = asked first)
  const dims: Dimension[] = []

  // Context-aware dimension ordering
  if (/after|before|morning|evening|night/.test(lower)) {
    dims.push('how_often', 'who', 'what_detail', 'feeling', 'when')
  } else if (/with|family|friend|together/.test(lower)) {
    dims.push('when', 'where', 'what_detail', 'feeling', 'how_often')
  } else {
    dims.push('when', 'who', 'where', 'how_often', 'what_detail', 'feeling')
  }
  dims.push('alternative')

  return { anchorAction, anchorTopic, anchorQuestion, dimensions: [...new Set(dims)] }
}

// ── User input classification ──

export function classifyUserInput(text: string): UserInputType {
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

  return 'clear_answer'
}

// ── State management ──

export function createInitialState(lessonPhrase: string): ConversationState {
  return {
    stage: 'greeting',
    turnIndex: 0,
    coveredDimensions: [],
    lastQuestionIntent: null,
    lastUserInputType: null,
    plan: buildConversationPlan(lessonPhrase),
  }
}

function getNextUncoveredDimension(state: ConversationState): Dimension | null {
  for (const dim of state.plan.dimensions) {
    if (!state.coveredDimensions.includes(dim)) return dim
  }
  return null
}

function getDimensionQuestion(dim: Dimension, action: string): string {
  return DIMENSION_QUESTIONS[dim](action)
}

// ── Deterministic next-intent selection ──

export function selectNextIntent(state: ConversationState, userInput: UserInputType): NextIntent {
  const { stage, turnIndex, plan } = state

  // Closing — always honor
  if (userInput === 'closing' || turnIndex >= MAX_TURNS - 1) {
    return { stage: 'wrap', action: 'wrap', dimension: null, instruction: 'Say a short natural goodbye. React to what the user said first.', suggestedQuestion: null }
  }

  // Greeting stage (turn 0)
  if (stage === 'greeting') {
    return {
      stage: 'anchor_intro',
      action: 'ask_anchor',
      dimension: null,
      instruction: `Respond to the greeting naturally. Then smoothly lead into the topic of "${plan.anchorAction}". Ask one simple question about it.`,
      suggestedQuestion: plan.anchorQuestion,
    }
  }

  // Confusion — simplify
  if (userInput === 'confusion') {
    return {
      stage: 'clarify',
      action: 'simplify',
      dimension: null,
      instruction: `The learner is confused. Simplify. Use easier words. Stay on "${plan.anchorAction}".`,
      suggestedQuestion: `Do you ${plan.anchorAction}?`,
    }
  }

  // Fragment or garbled — clarify
  if (userInput === 'fragment' || userInput === 'garbled') {
    return {
      stage: 'clarify',
      action: 'clarify',
      dimension: null,
      instruction: 'The learner gave a very short or unclear answer. Gently ask for clarification using their words.',
      suggestedQuestion: null,
    }
  }

  // Progress to next dimension
  const nextDim = getNextUncoveredDimension(state)

  if (stage === 'anchor_intro' || stage === 'detail' || stage === 'clarify') {
    if (userInput === 'yes' || userInput === 'clear_answer') {
      if (nextDim) {
        const q = getDimensionQuestion(nextDim, plan.anchorAction)
        return {
          stage: 'detail',
          action: 'ask_dimension',
          dimension: nextDim,
          instruction: `Acknowledge briefly. Ask about ${nextDim}. Do NOT repeat any previous question.`,
          suggestedQuestion: q,
        }
      }
      return { stage: 'wrap', action: 'wrap', dimension: null, instruction: 'All topics covered. React and say goodbye.', suggestedQuestion: null }
    }

    if (userInput === 'no') {
      if (nextDim) {
        const q = getDimensionQuestion(nextDim, plan.anchorAction)
        return {
          stage: 'detail',
          action: 'ask_dimension',
          dimension: nextDim,
          instruction: `They said no. Acknowledge briefly. Ask about ${nextDim} instead.`,
          suggestedQuestion: q,
        }
      }
      return { stage: 'wrap', action: 'wrap', dimension: null, instruction: 'React briefly and say goodbye.', suggestedQuestion: null }
    }
  }

  // Default wrap
  return { stage: 'wrap', action: 'wrap', dimension: null, instruction: 'React and close naturally.', suggestedQuestion: null }
}

// ── State transition ──

export function advanceState(state: ConversationState, userInput: UserInputType, intent: NextIntent): ConversationState {
  return {
    ...state,
    stage: intent.stage,
    turnIndex: state.turnIndex + 1,
    coveredDimensions: intent.dimension
      ? [...state.coveredDimensions, intent.dimension]
      : state.coveredDimensions,
    lastQuestionIntent: intent.instruction,
    lastUserInputType: userInput,
  }
}

// ── Serialization (for passing to API) ──

export type SerializedConversationState = {
  stage: ConversationStage
  turnIndex: number
  coveredDimensions: Dimension[]
  anchorAction: string
  anchorQuestion: string
}

export function serializeState(state: ConversationState): SerializedConversationState {
  return {
    stage: state.stage,
    turnIndex: state.turnIndex,
    coveredDimensions: state.coveredDimensions,
    anchorAction: state.plan.anchorAction,
    anchorQuestion: state.plan.anchorQuestion,
  }
}
