/**
 * Pure utilities for NativeFlow flow point calculation.
 * No React, no Supabase. Exports only pure functions and types.
 */

export type FlowPointInput = {
  studyMinutes: number
  streakDays: number
  completedLessonCount?: number
}

export type FlowPointBreakdown = {
  basePoints: number
  streakBonus: number
  lessonBonus: number
  totalPointsToday: number
}

export type FlowPointRank = 'starter' | 'bronze' | 'silver' | 'gold' | 'diamond'

/** Returns a non-negative integer; non-finite or negative values become 0. */
export function clampNonNegativeInt(value: number): number {
  if (!Number.isFinite(value)) return 0
  const floored = Math.floor(value)
  return floored < 0 ? 0 : floored
}

/** Base points from today's study minutes only. */
export function getBaseFlowPoints(studyMinutes: number): number {
  const m = clampNonNegativeInt(studyMinutes)
  if (m < 5) return 0
  if (m <= 14) return 10
  if (m <= 29) return 20
  if (m <= 59) return 40
  if (m <= 89) return 60
  return 80
}

/** Bonus points from current streak length. */
export function getStreakBonus(streakDays: number): number {
  const d = clampNonNegativeInt(streakDays)
  if (d <= 2) return 0
  if (d <= 6) return 5
  if (d <= 13) return 10
  if (d <= 29) return 20
  return 30
}

/** Bonus points from completed lesson count (e.g. today). */
export function getLessonBonus(completedLessonCount: number): number {
  const n = clampNonNegativeInt(completedLessonCount)
  if (n === 0) return 0
  if (n === 1) return 5
  if (n === 2) return 10
  return 15
}

/** Computes today's flow point breakdown from sanitized inputs. */
export function calculateFlowPoints(input: FlowPointInput): FlowPointBreakdown {
  const studyMinutes = clampNonNegativeInt(input.studyMinutes)
  const streakDays = clampNonNegativeInt(input.streakDays)
  const completedLessonCount = clampNonNegativeInt(input.completedLessonCount ?? 0)

  const basePoints = getBaseFlowPoints(studyMinutes)
  const streakBonus = getStreakBonus(streakDays)
  const lessonBonus = getLessonBonus(completedLessonCount)
  const totalPointsToday = basePoints + streakBonus + lessonBonus

  return {
    basePoints,
    streakBonus,
    lessonBonus,
    totalPointsToday,
  }
}

const RANK_STEPS = [
  { rank: 'starter' as const, minPoints: 0, nextThreshold: 300 },
  { rank: 'bronze' as const, minPoints: 300, nextThreshold: 1000 },
  { rank: 'silver' as const, minPoints: 1000, nextThreshold: 3000 },
  { rank: 'gold' as const, minPoints: 3000, nextThreshold: 7000 },
  { rank: 'diamond' as const, minPoints: 7000, nextThreshold: null as number | null },
] as const

/** Returns the rank tier for a given total (lifetime) flow points. */
export function getRankFromFlowPoints(totalFlowPoints: number): FlowPointRank {
  const points = clampNonNegativeInt(totalFlowPoints)
  for (let i = RANK_STEPS.length - 1; i >= 0; i--) {
    if (points >= RANK_STEPS[i].minPoints) return RANK_STEPS[i].rank
  }
  return 'starter'
}

/** Points required to reach the next rank, or null if already diamond. */
export function getNextRankThreshold(totalFlowPoints: number): number | null {
  const points = clampNonNegativeInt(totalFlowPoints)
  for (let i = RANK_STEPS.length - 1; i >= 0; i--) {
    if (points >= RANK_STEPS[i].minPoints) return RANK_STEPS[i].nextThreshold
  }
  return 300
}

/** How many more points until the next rank; 0 if diamond. */
export function getPointsToNextRank(totalFlowPoints: number): number {
  const threshold = getNextRankThreshold(totalFlowPoints)
  if (threshold === null) return 0
  const points = clampNonNegativeInt(totalFlowPoints)
  const gap = threshold - points
  return gap < 0 ? 0 : gap
}
