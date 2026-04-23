/**
 * Predefined conversation templates for AI-free fallback mode.
 *
 * When the OpenAI API is unavailable or usage limits are reached,
 * the conversation uses these templates instead.
 *
 * When engine state is provided, fallback follows the same progression
 * logic as the API path (single source of truth).
 */
import type { NextIntent } from './ai-conversation-state'

export type FallbackTurn = {
  aiMessage: string
  evaluation: 'good'
  score: number
  feedback: string
  followUp: string
}

/**
 * Builds 4 turn templates from the lesson phrase.
 * Each turn has a natural AI message and a generous evaluation.
 */
export function buildFallbackTurns(lessonPhrase: string): FallbackTurn[] {
  return [
    {
      aiMessage: "Hey! How's it going today?",
      evaluation: 'good',
      score: 80,
      feedback: 'いい調子です！',
      followUp: 'Ready to practice some English?',
    },
    {
      aiMessage: `Nice! So, today's phrase is: "${lessonPhrase}". Can you try using it?`,
      evaluation: 'good',
      score: 75,
      feedback: 'よくできました！',
      followUp: 'Do you use that phrase often?',
    },
    {
      aiMessage: "Oh, nice. Tell me more about your day.",
      evaluation: 'good',
      score: 75,
      feedback: '自然な会話ができていますね。',
      followUp: 'How was it?',
    },
    {
      aiMessage: "Nice talking with you. See you next time!",
      evaluation: 'good',
      score: 85,
      feedback: 'よく頑張りました！',
      followUp: '',
    },
  ]
}

/**
 * Builds a fallback evaluation for a single turn.
 * Always positive — never blocks the student from progressing.
 */
export function buildFallbackEvaluation(
  turnIndex: number,
  userMessage: string,
  lessonPhrase: string
): {
  aiReply: string
  evaluation: 'good'
  evaluationDetail: {
    isRelevant: boolean
    isNatural: boolean
    isComplete: boolean
    score: number
    feedback: string
    correction: null
    naturalAlternative: null
    followUp: string | null
  }
  hint: null
  nextPrompt: null
} {
  const turns = buildFallbackTurns(lessonPhrase)
  const currentTurn = turns[turnIndex] ?? turns[0]
  const phraseLower = lessonPhrase.trim().toLowerCase()

  const normalizedUser = userMessage.trim().replace(/\s+/g, ' ')
  const words = normalizedUser.split(/\s+/).filter(Boolean)
  const isComplete = words.length >= 2
  const isClosingUser = /\b(see you|next time|goodbye|bye|take care)\b/i.test(normalizedUser.toLowerCase())
  const isConfusedUser = /\b(i don'?t understand|sorry\??|what\??|huh\??)\b/i.test(normalizedUser.toLowerCase())
  const isFragmentUser = !isConfusedUser && !isClosingUser && words.length > 0 && words.length <= 2
  const closingVariants = [
    'Nice talking with you. See you later!',
    'Sounds good. Have a good day!',
    'Alright, see you next time!',
  ] as const
  const closingReply = closingVariants[(normalizedUser.length + turnIndex) % closingVariants.length]
  const actionAnchor = (() => {
    if (!phraseLower) return 'clean up'
    const cleaned = phraseLower.replace(/[.?!]/g, '')
    const direct = cleaned.match(/\b(i|we|you)\s+([a-z]+(?:\s+[a-z]+){0,3})/)
    if (direct?.[2]) return direct[2]
    if (/\bclean( up)?\b/.test(cleaned)) return 'clean up'
    return 'clean up'
  })()

  const anchorFollowUp = (() => {
    if (!phraseLower) return `When do you usually ${actionAnchor}?`
    if (phraseLower.includes('after breakfast')) return `Do you usually ${actionAnchor} after breakfast?`
    if (/\bclean( up)?\b/.test(phraseLower)) return `When do you ${actionAnchor}?`
    if (/\bevery day\b|\busually\b/.test(phraseLower)) return `Do you ${actionAnchor} every day?`
    return `When do you usually ${actionAnchor}?`
  })()

  // Yes/No progression: after user answers yes/no, ask a NEW detail question
  const yesDetailQuestions = [
    `How long does it take to ${actionAnchor}?`,
    `Do you ${actionAnchor} alone?`,
    `What do you do after that?`,
    `Do you ${actionAnchor} every day?`,
  ]
  const noDetailQuestions = [
    `Who ${actionAnchor}s at your home?`,
    `When do you usually ${actionAnchor}?`,
    `Do you do it after dinner instead?`,
  ]

  const yesNoProgression = (() => {
    const lower = normalizedUser.toLowerCase()
    const saysYes = /^(yes|yeah|yep|i do|i did|sure)\b/.test(lower)
    const saysNo = /^(no|nope|not really|i don't|i do not)\b/.test(lower)
    if (saysYes) return yesDetailQuestions[turnIndex % yesDetailQuestions.length]
    if (saysNo) return noDetailQuestions[turnIndex % noDetailQuestions.length]
    return anchorFollowUp
  })()

  const clippedUser =
    normalizedUser.length > 24
      ? `${normalizedUser.slice(0, 24).trimEnd()}...`
      : normalizedUser

  const acknowledgedReply = !normalizedUser
    ? 'Take your time.'
    : isClosingUser
      ? closingReply
      : isConfusedUser
        ? `No worries. Let's keep it simple. ${yesNoProgression}`
      : isFragmentUser && words.length === 1
        ? `${clippedUser}?`
        : isFragmentUser && words.length === 2
          ? `Do you mean ${clippedUser}?`
          : (turnIndex === 0 ? `Hi! Nice to talk with you. ${yesNoProgression}` : `${['Got it.', 'Right.', 'Oh, okay.', 'Ah, I see.'][turnIndex % 4]} ${yesNoProgression}`)

  return {
    aiReply: acknowledgedReply,
    evaluation: 'good',
    evaluationDetail: {
      isRelevant: true,
      isNatural: isComplete,
      isComplete,
      score: isComplete ? currentTurn.score : 60,
      feedback: currentTurn.feedback,
      correction: null,
      naturalAlternative: null,
      followUp: isClosingUser ? null : yesNoProgression,
    },
    hint: null,
    nextPrompt: null,
  }
}

// ——— Engine-aware fallback ———

// Single reaction per turn — never stack multiple
const REACTIONS = ['Oh, okay.', 'Right.', 'I see.', 'Got it.', 'Sure.', 'Yeah.']

/**
 * Build a fallback reply using engine intent (single source of truth).
 * Rules: exactly ONE opener/reaction, never stacked, turn-1 = greeting only.
 */
export function buildEngineFallbackReply(
  intent: NextIntent,
  userMessage: string,
  turnIndex: number,
): string {
  const trimmed = userMessage.trim()
  const reaction = REACTIONS[turnIndex % REACTIONS.length]

  switch (intent.action) {
    case 'greet':
      // Turn-1: clean greeting only, no reaction prefix
      return intent.suggestedQuestion
        ? `Hi! ${intent.suggestedQuestion}`
        : 'Hi! How are you today?'
    case 'ask_anchor':
      return `${reaction} ${intent.suggestedQuestion ?? 'Tell me about your day.'}`
    case 'ask_dimension':
      return `${reaction} ${intent.suggestedQuestion ?? 'Tell me more.'}`
    case 'clarify': {
      const words = trimmed.split(/\s+/)
      if (words.length <= 2 && trimmed.length > 0) {
        // Natural echo-question for short input
        return `${trimmed}?`
      }
      return 'Could you say a bit more?'
    }
    case 'simplify':
      return `No worries. ${intent.suggestedQuestion ?? "Let's keep it simple."}`
    case 'redirect':
      return `${reaction} Let's get back to the topic. ${intent.suggestedQuestion ?? ''}`
    case 'wrap':
      return 'Nice talking with you. See you next time!'
  }
}

// ——— Usage Limit Tracking ———

const SESSION_KEY = 'nf_ai_conv_call_count'
const MAX_AI_CALLS_PER_SESSION = 30

export function getAiCallCount(): number {
  if (typeof window === 'undefined') return 0
  const raw = window.sessionStorage.getItem(SESSION_KEY)
  return raw ? parseInt(raw, 10) || 0 : 0
}

export function incrementAiCallCount(): number {
  const next = getAiCallCount() + 1
  window.sessionStorage.setItem(SESSION_KEY, String(next))
  return next
}

export function isAiLimitReached(): boolean {
  return getAiCallCount() >= MAX_AI_CALLS_PER_SESSION
}
