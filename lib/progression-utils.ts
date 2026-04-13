/**
 * Pure progression utilities for streak, rank, avatar level, and Flow Point progression.
 * Framework-free; used by progression-service and dashboard.
 * Designed so avatar_image_url / avatar_badge_image_url can be attached later
 * without changing this logic.
 */

export type RankCode =
  | 'starter'
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'diamond'

export type RankRequirement = {
  rank: RankCode
  minFlowPoints: number
}

export const FLOW_POINT_RANK_REQUIREMENTS: RankRequirement[] = [
  { rank: 'starter', minFlowPoints: 0 },
  { rank: 'bronze', minFlowPoints: 500 },
  { rank: 'silver', minFlowPoints: 2000 },
  { rank: 'gold', minFlowPoints: 5000 },
  { rank: 'diamond', minFlowPoints: 10000 },
]

/** Rank by total streak days: starter 1–6, bronze 7–29, silver 30–99, gold 100–364, diamond 365+ */
export function computeRankCodeFromStreak(days: number): RankCode {
  if (days >= 365) return 'diamond'
  if (days >= 100) return 'gold'
  if (days >= 30) return 'silver'
  if (days >= 7) return 'bronze'
  if (days >= 1) return 'starter'
  return 'starter'
}

/** Avatar level 1–5 by total streak days: 1→1–6, 2→7–29, 3→30–99, 4→100–364, 5→365+ */
export function computeAvatarLevelFromStreak(days: number): number {
  if (days >= 365) return 5
  if (days >= 100) return 4
  if (days >= 30) return 3
  if (days >= 7) return 2
  if (days >= 1) return 1
  return 1
}

/** Rank by total Flow Points. */
export function computeRankCodeFromFlowPoints(flowPoints: number): RankCode {
  const safeFlowPoints = Number.isFinite(flowPoints) ? Math.max(0, Math.floor(flowPoints)) : 0

  let currentRank: RankCode = 'starter'

  for (const requirement of FLOW_POINT_RANK_REQUIREMENTS) {
    if (safeFlowPoints >= requirement.minFlowPoints) {
      currentRank = requirement.rank
    } else {
      break
    }
  }

  return currentRank
}

/** Avatar level 1–5 by total Flow Points. */
export function computeAvatarLevelFromFlowPoints(flowPoints: number): number {
  const rank = computeRankCodeFromFlowPoints(flowPoints)

  if (rank === 'diamond') return 5
  if (rank === 'gold') return 4
  if (rank === 'silver') return 3
  if (rank === 'bronze') return 2
  return 1
}

/** Returns the next rank requirement, or null if already at max rank. */
export function getNextRankRequirement(flowPoints: number): RankRequirement | null {
  const safeFlowPoints = Number.isFinite(flowPoints) ? Math.max(0, Math.floor(flowPoints)) : 0

  for (const requirement of FLOW_POINT_RANK_REQUIREMENTS) {
    if (safeFlowPoints < requirement.minFlowPoints) {
      return requirement
    }
  }

  return null
}

/** Returns Flow Points remaining until the next rank. */
export function getFlowPointsToNextRank(flowPoints: number): number {
  const safeFlowPoints = Number.isFinite(flowPoints) ? Math.max(0, Math.floor(flowPoints)) : 0
  const nextRequirement = getNextRankRequirement(safeFlowPoints)

  if (!nextRequirement) {
    return 0
  }

  return Math.max(0, nextRequirement.minFlowPoints - safeFlowPoints)
}

/** Previous calendar day in YYYY-MM-DD. */
export function prevDay(ymd: string): string {
  const d = new Date(ymd + 'T12:00:00')
  d.setDate(d.getDate() - 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export type ProgressionProfileInput = {
  todayYmd: string
  lastStreakDate: string | null
  currentStreakDays: number
  bestStreakDays: number
  /** If set, this date is protected from breaking streak (freeze feature) */
  streakFrozenDate?: string | null
  /** ISO timestamp — freeze is only valid if not expired */
  streakFreezeExpiry?: string | null
}

export type ProgressionProfileUpdate = {
  current_streak_days: number
  best_streak_days: number
  last_streak_date: string
  /** True if freeze was consumed on this update */
  freezeConsumed?: boolean
}

/**
 * Computes updated streak and derived rank/avatar for a study day.
 * Idempotent for same day: if lastStreakDate === todayYmd, returns values that imply no change.
 *
 * Freeze support: if the missed day matches streakFrozenDate and freeze hasn't expired,
 * the streak continues as if that day was studied. Freeze is consumed.
 */
export function computeUpdatedStreakProfile(
  input: ProgressionProfileInput
): ProgressionProfileUpdate {
  const { todayYmd, lastStreakDate, currentStreakDays, bestStreakDays, streakFrozenDate, streakFreezeExpiry } = input
  const yesterday = prevDay(todayYmd)

  if (lastStreakDate === todayYmd) {
    return {
      current_streak_days: currentStreakDays,
      best_streak_days: bestStreakDays,
      last_streak_date: todayYmd,
    }
  }

  let newCurrent: number
  let freezeConsumed = false

  if (lastStreakDate === yesterday) {
    // Normal continuation
    newCurrent = currentStreakDays + 1
  } else if (
    // Freeze check: last study was 2 days ago (yesterday missed),
    // and yesterday matches the frozen date, and freeze hasn't expired
    lastStreakDate === prevDay(yesterday) &&
    streakFrozenDate === yesterday &&
    streakFreezeExpiry &&
    new Date(streakFreezeExpiry) > new Date()
  ) {
    // Freeze protects yesterday — continue streak as if studied
    newCurrent = currentStreakDays + 2 // +1 for frozen day, +1 for today
    freezeConsumed = true
  } else {
    newCurrent = 1
  }

  const newBest = Math.max(bestStreakDays, newCurrent)

  return {
    current_streak_days: newCurrent,
    best_streak_days: newBest,
    last_streak_date: todayYmd,
    freezeConsumed,
  }
}