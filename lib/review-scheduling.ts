/**
 * Review Scheduling — Ebbinghaus-style forgetting curve intervals
 *
 * Provides a tiny, safe interval computation layer for review items.
 * Uses existing fields only (correct_count, wrong_count, next_review_at).
 * No schema change, no DB access, pure functions.
 *
 * Stage ladder:
 *   0 = 1 day, 1 = 3 days, 2 = 7 days, 3 = 14 days, 4 = 30 days
 *
 * Phase 6.4 + 6.7: forgetting curve + memory-strength adjustment.
 */

const STAGE_INTERVALS_DAYS = [1, 3, 7, 14, 30] as const
const MAX_STAGE = STAGE_INTERVALS_DAYS.length - 1
const MIN_INTERVAL_DAYS = 0.5 // ~12 hours floor

// ── Types ──

export type ReviewOutcome = 'success' | 'weak' | 'failure'

export type ScheduleResult = {
  nextReviewAt: string
  derivedStage: number
  nextStage: number
  intervalDays: number
  /** Memory strength used for adjustment (null = not computed) */
  memoryStrength: number | null
  /** Whether memory-strength adjustment was applied */
  memoryAdjusted: boolean
}

// ── Stage derivation ──

export function deriveReviewStage(correctCount: number): number {
  if (correctCount <= 1) return 0
  if (correctCount === 2) return 1
  if (correctCount === 3) return 2
  if (correctCount === 4) return 3
  return MAX_STAGE
}

// ── Memory strength (same formula as review-injection) ──

function computeMemoryStrength(correctCount: number, wrongCount: number): number | null {
  const total = correctCount + wrongCount
  if (total === 0) return null
  const base = Math.round((correctCount / total) * 100)
  const penalty = wrongCount * 15
  return Math.max(0, Math.min(100, base - penalty))
}

// ── Overdue check ──

function computeOverdueHours(nextReviewAt: string | null): number {
  if (!nextReviewAt) return 0
  try {
    const due = new Date(nextReviewAt).getTime()
    if (!Number.isFinite(due)) return 0
    const diff = Date.now() - due
    return diff > 0 ? Math.round(diff / 3_600_000) : 0
  } catch {
    return 0
  }
}

// ── Memory-strength interval adjustment ──

/**
 * Apply a small memory-strength adjustment to the base interval.
 * Only for non-reset paths (weak/success). Never increases a reset interval.
 *
 * - strength ≤ 30: shorten to 50% (weak memory → review sooner)
 * - strength ≥ 70: extend to 120% (strong memory → review later)
 * - otherwise: no change
 *
 * Floor: MIN_INTERVAL_DAYS (~12h)
 */
function adjustIntervalByMemory(
  baseIntervalDays: number,
  memoryStrength: number | null,
  isReset: boolean,
): { adjustedDays: number; adjusted: boolean } {
  if (isReset || memoryStrength === null) {
    return { adjustedDays: baseIntervalDays, adjusted: false }
  }

  try {
    let factor = 1.0
    if (memoryStrength <= 30) factor = 0.6
    else if (memoryStrength >= 70) factor = 1.3

    if (factor === 1.0) return { adjustedDays: baseIntervalDays, adjusted: false }

    const adjusted = Math.max(MIN_INTERVAL_DAYS, Math.round(baseIntervalDays * factor * 10) / 10)
    return { adjustedDays: adjusted, adjusted: true }
  } catch {
    return { adjustedDays: baseIntervalDays, adjusted: false }
  }
}

// ── Main scheduling ──

/**
 * Compute next_review_at using Ebbinghaus-style forgetting curve
 * with memory-strength adjustment.
 *
 * Rules:
 * - success: advance +1 stage, use that interval
 * - weak/partial: keep same stage, use that interval
 * - failure: reset to stage 0, interval = 1 day (no memory adjustment)
 * - overdue > 48h: force stage 0 regardless (no memory adjustment)
 * - new item (totalAttempts = 0): stage 0, interval = 1 day
 *
 * Memory adjustment (Phase 6.7):
 * - Only applied to weak/success paths
 * - strength ≤ 30 → 0.5× interval
 * - strength ≥ 70 → 1.2× interval
 */
export function computeForgettingCurveSchedule(params: {
  correctCount: number
  wrongCount: number
  nextReviewAt: string | null
  outcome: ReviewOutcome
}): ScheduleResult {
  const { correctCount, wrongCount, nextReviewAt, outcome } = params
  const totalAttempts = correctCount + wrongCount
  const overdueHours = computeOverdueHours(nextReviewAt)
  const memoryStrength = computeMemoryStrength(correctCount, wrongCount)

  const now = new Date()
  let reason: string
  let baseIntervalDays: number
  let result: ScheduleResult

  // New / never-attempted → stage 0, no adjustment
  if (totalAttempts <= 0) {
    baseIntervalDays = STAGE_INTERVALS_DAYS[0]
    reason = 'new-item'
    result = buildResult(now, 0, 0, baseIntervalDays, memoryStrength, false)
  } else {
    const derivedStage = deriveReviewStage(correctCount)

    if (overdueHours > 48) {
      // Overdue > 48h → reset to stage 0, no adjustment
      baseIntervalDays = STAGE_INTERVALS_DAYS[0]
      reason = 'overdue-reset'
      result = buildResult(now, derivedStage, 0, baseIntervalDays, memoryStrength, false)
    } else if (outcome === 'failure') {
      // Failure → reset to stage 0, no adjustment
      baseIntervalDays = STAGE_INTERVALS_DAYS[0]
      reason = 'failure-reset'
      result = buildResult(now, derivedStage, 0, baseIntervalDays, memoryStrength, false)
    } else if (outcome === 'weak') {
      // Weak → keep same stage, allow memory adjustment
      const nextStage = derivedStage
      baseIntervalDays = STAGE_INTERVALS_DAYS[Math.min(nextStage, MAX_STAGE)]
      const { adjustedDays, adjusted } = adjustIntervalByMemory(baseIntervalDays, memoryStrength, false)
      reason = 'weak-hold'
      result = buildResult(now, derivedStage, nextStage, adjustedDays, memoryStrength, adjusted)
    } else {
      // Success → advance +1 stage, allow memory adjustment
      const nextStage = Math.min(derivedStage + 1, MAX_STAGE)
      baseIntervalDays = STAGE_INTERVALS_DAYS[nextStage]
      const { adjustedDays, adjusted } = adjustIntervalByMemory(baseIntervalDays, memoryStrength, false)
      reason = 'success-advance'
      result = buildResult(now, derivedStage, nextStage, adjustedDays, memoryStrength, adjusted)
    }
  }

  // Phase 6.8: unified observation log
  logSchedulerObservation({
    outcome,
    reason,
    correctCount,
    wrongCount,
    totalAttempts,
    memoryStrength,
    derivedStage: result.derivedStage,
    nextStage: result.nextStage,
    baseIntervalDays,
    adjustedIntervalDays: result.intervalDays,
    adjustmentType: result.memoryAdjusted
      ? (result.intervalDays < baseIntervalDays ? 'reduced' : 'increased')
      : (reason.includes('reset') || reason === 'new-item' ? 'skipped-reset' : 'none'),
    overdueHours,
  })

  return result
}

// ── Helpers ──

function addDays(base: Date, days: number): string {
  const next = new Date(base.getTime() + days * 86_400_000)
  return next.toISOString()
}

function buildResult(
  now: Date,
  derivedStage: number,
  nextStage: number,
  intervalDays: number,
  memoryStrength: number | null,
  memoryAdjusted: boolean,
): ScheduleResult {
  return {
    nextReviewAt: addDays(now, intervalDays),
    derivedStage,
    nextStage,
    intervalDays,
    memoryStrength,
    memoryAdjusted,
  }
}

// ── Phase 6.8: Unified observation logging ──

function logSchedulerObservation(data: {
  outcome: ReviewOutcome
  reason: string
  correctCount: number
  wrongCount: number
  totalAttempts: number
  memoryStrength: number | null
  derivedStage: number
  nextStage: number
  baseIntervalDays: number
  adjustedIntervalDays: number
  adjustmentType: 'reduced' | 'increased' | 'none' | 'skipped-reset'
  overdueHours: number
}): void {
  try {
    // eslint-disable-next-line no-console
    console.log('[Phase6.8][scheduler-observe]', data)
  } catch {
    // ignore
  }
}
