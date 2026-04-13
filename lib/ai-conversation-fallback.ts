/**
 * Predefined conversation templates for AI-free fallback mode.
 *
 * When the OpenAI API is unavailable or usage limits are reached,
 * the conversation uses these templates instead. Templates are
 * dynamically built from the lesson phrase so they stay relevant.
 */

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
      aiMessage: "That's great! Tell me a bit more about your day.",
      evaluation: 'good',
      score: 75,
      feedback: '自然な会話ができていますね。',
      followUp: 'How was it?',
    },
    {
      aiMessage: "Awesome job today! Keep it up — see you next time!",
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
  // Use the NEXT turn's message as aiReply (or last if at the end)
  const nextIndex = Math.min(turnIndex + 1, turns.length - 1)
  const currentTurn = turns[turnIndex] ?? turns[0]
  const nextTurn = turns[nextIndex]

  const words = userMessage.trim().split(/\s+/).filter(Boolean)
  const isComplete = words.length >= 2

  return {
    aiReply: nextTurn.aiMessage,
    evaluation: 'good',
    evaluationDetail: {
      isRelevant: true,
      isNatural: isComplete,
      isComplete,
      score: isComplete ? currentTurn.score : 60,
      feedback: currentTurn.feedback,
      correction: null,
      naturalAlternative: null,
      followUp: currentTurn.followUp || null,
    },
    hint: null,
    nextPrompt: null,
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
