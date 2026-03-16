/**
 * Pure progression utilities for streak, rank, and avatar level.
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
}

export type ProgressionProfileUpdate = {
  current_streak_days: number
  best_streak_days: number
  last_streak_date: string
  rank_code: RankCode
  avatar_level: number
}

/**
 * Computes updated streak and derived rank/avatar for a study day.
 * Idempotent for same day: if lastStreakDate === todayYmd, returns values that imply no change.
 */
export function computeUpdatedStreakProfile(
  input: ProgressionProfileInput
): ProgressionProfileUpdate {
  const { todayYmd, lastStreakDate, currentStreakDays, bestStreakDays } = input
  const yesterday = prevDay(todayYmd)

  if (lastStreakDate === todayYmd) {
    return {
      current_streak_days: currentStreakDays,
      best_streak_days: bestStreakDays,
      last_streak_date: todayYmd,
      rank_code: computeRankCodeFromStreak(bestStreakDays),
      avatar_level: computeAvatarLevelFromStreak(bestStreakDays),
    }
  }

  let newCurrent: number
  if (lastStreakDate === yesterday) {
    newCurrent = currentStreakDays + 1
  } else {
    newCurrent = 1
  }

  const newBest = Math.max(bestStreakDays, newCurrent)

  return {
    current_streak_days: newCurrent,
    best_streak_days: newBest,
    last_streak_date: todayYmd,
    rank_code: computeRankCodeFromStreak(newBest),
    avatar_level: computeAvatarLevelFromStreak(newBest),
  }
}
