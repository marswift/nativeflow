/**
 * Review Item Builder
 *
 * Determines whether a stage result should create a review item for SRS.
 * Pure logic — no DB access, no side effects.
 *
 * Rules:
 * - Only repeat and typing stages create review items
 * - 'good' results do not need review
 * - 'retry' results always create a review (hard, +1 day)
 * - 'ok' results create a review 20% of the time (medium, +3 days)
 * - Phrase extracted from result or block data
 */

export type ReviewDifficulty = 'medium' | 'hard'
export type ReviewJudgement = 'good' | 'ok' | 'retry'

type MaybeRecord = Record<string, unknown>

export type MaybeCreateReviewItemInput = {
  userId: string | null | undefined
  stageId: string | null | undefined
  result: unknown
  currentBlock: unknown
}

export type ReviewItemInsert = {
  user_id: string
  phrase: string
  difficulty: ReviewDifficulty
  next_review_at: string
}

function isRecord(value: unknown): value is MaybeRecord {
  return typeof value === 'object' && value !== null
}

function getString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function getNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function getBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null
}

function pickString(source: MaybeRecord, keys: string[]): string | null {
  for (const key of keys) {
    const value = getString(source[key])
    if (value) return value
  }
  return null
}

function pickNumber(source: MaybeRecord, keys: string[]): number | null {
  for (const key of keys) {
    const value = getNumber(source[key])
    if (value !== null) return value
  }
  return null
}

function pickBoolean(source: MaybeRecord, keys: string[]): boolean | null {
  for (const key of keys) {
    const value = getBoolean(source[key])
    if (value !== null) return value
  }
  return null
}

function stableHash(input: string): number {
  let hash = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash >>> 0)
}

function shouldAddOkReview(seed: string): boolean {
  const hash = stableHash(seed)
  return hash % 100 < 20
}

function addDays(base: Date, days: number): string {
  const next = new Date(base)
  next.setDate(next.getDate() + days)
  return next.toISOString()
}

function normalizeStageId(stageId: string | null | undefined): 'repeat' | 'typing' | null {
  if (!stageId) return null
  if (stageId === 'repeat') return 'repeat'
  if (stageId === 'typing') return 'typing'
  return null
}

function classifyRepeatResult(result: unknown): ReviewJudgement | null {
  if (!isRecord(result)) return null

  const score = pickNumber(result, ['score', 'overallScore', 'pronunciationScore'])
  if (score !== null) {
    if (score >= 70) return 'good'
    if (score >= 40) return 'ok'
    return 'retry'
  }

  const evaluation = pickString(result, ['evaluation', 'judgement', 'status'])
  if (evaluation === 'good' || evaluation === 'ok' || evaluation === 'retry') {
    return evaluation
  }

  return null
}

function classifyTypingResult(result: unknown): ReviewJudgement | null {
  if (!isRecord(result)) return null

  const score = pickNumber(result, ['score', 'accuracy', 'typingScore'])
  if (score !== null) {
    if (score >= 90) return 'good'
    if (score >= 60) return 'ok'
    return 'retry'
  }

  const isCorrect = pickBoolean(result, ['isCorrect', 'is_correct', 'correct'])
  if (isCorrect === true) return 'good'
  if (isCorrect === false) return 'retry'

  const evaluation = pickString(result, ['evaluation', 'judgement', 'status'])
  if (evaluation === 'good' || evaluation === 'ok' || evaluation === 'retry') {
    return evaluation
  }

  return null
}

function extractPhrase(result: unknown, currentBlock: unknown): string | null {
  if (isRecord(result)) {
    const fromResult = pickString(result, [
      'phrase',
      'expectedText',
      'referenceText',
      'targetText',
      'correctText',
      'answerText',
      'typingAnswer',
      'transcript',
    ])
    if (fromResult) return fromResult
  }

  if (isRecord(currentBlock)) {
    const fromBlock = pickString(currentBlock, [
      'phrase',
      'text',
      'prompt',
      'answer',
      'answerText',
      'typingAnswer',
      'content',
      'title',
    ])
    if (fromBlock) return fromBlock
  }

  return null
}

function getDifficultyAndSchedule(judgement: ReviewJudgement): {
  difficulty: ReviewDifficulty
  next_review_at: string
} | null {
  try {
    // Phase 6.4: use forgetting-curve scheduling for new items
    const { computeForgettingCurveSchedule } = require('./review-scheduling') as typeof import('./review-scheduling')
    const outcome = judgement === 'retry' ? 'failure' as const : 'weak' as const
    const result = computeForgettingCurveSchedule({
      correctCount: 0,
      wrongCount: 0,
      nextReviewAt: null,
      outcome,
    })

    // eslint-disable-next-line no-console
    console.log('[Phase6.4][forgetting-curve][create]', {
      judgement,
      outcome,
      intervalDays: result.intervalDays,
      nextReviewAt: result.nextReviewAt.slice(0, 19),
    })

    return {
      difficulty: judgement === 'retry' ? 'hard' : 'medium',
      next_review_at: result.nextReviewAt,
    }
  } catch {
    // Fallback to original hardcoded schedule
    const now = new Date()
    if (judgement === 'retry') return { difficulty: 'hard', next_review_at: addDays(now, 1) }
    if (judgement === 'ok') return { difficulty: 'medium', next_review_at: addDays(now, 3) }
    return null
  }
}

export function buildReviewItemInsert(
  input: MaybeCreateReviewItemInput
): ReviewItemInsert | null {
  const stage = normalizeStageId(input.stageId)
  if (!stage) return null

  const userId = getString(input.userId)
  if (!userId) return null

  const phrase = extractPhrase(input.result, input.currentBlock)
  if (!phrase) return null

  const judgement =
    stage === 'repeat'
      ? classifyRepeatResult(input.result)
      : classifyTypingResult(input.result)

  if (!judgement) return null
  if (judgement === 'good') return null

  if (judgement === 'ok') {
    const okSeed = `${userId}:${stage}:${phrase}`
    if (!shouldAddOkReview(okSeed)) return null
  }

  const schedule = getDifficultyAndSchedule(judgement)
  if (!schedule) return null

  return {
    user_id: userId,
    phrase,
    difficulty: schedule.difficulty,
    next_review_at: schedule.next_review_at,
  }
}
