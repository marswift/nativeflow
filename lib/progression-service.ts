/**
 * Updates user_profiles streak fields when a study day is recorded.
 * Uses progression-utils for pure logic; this module handles DB read/write.
 *
 * Supports streak freeze: if freeze is consumed, clears freeze fields.
 */
import type { PostgrestError } from '@supabase/supabase-js'
import { computeUpdatedStreakProfile } from './progression-utils'
import type { SupabaseClient } from '@supabase/supabase-js'

export type ProgressionUpdateResult = {
  error: PostgrestError | null
}

const PROGRESSION_COLUMNS =
  'current_streak_days, best_streak_days, last_streak_date, streak_frozen_date, streak_freeze_expiry'

/**
 * Updates streak fields on user_profiles for the given study day.
 * Idempotent: if last_streak_date is already statDate, no double increment.
 * If a streak freeze is consumed, clears streak_frozen_date and streak_freeze_expiry.
 */
export async function updateProgressionForStudyDay(
  supabase: SupabaseClient,
  userId: string,
  statDate: string
): Promise<ProgressionUpdateResult> {
  const { data: row, error: fetchError } = await supabase
    .from('user_profiles')
    .select(PROGRESSION_COLUMNS)
    .eq('id', userId)
    .maybeSingle()

  if (fetchError) {
    return { error: fetchError }
  }

  const current = (row as Record<string, unknown> | null) ?? {}
  const lastStreakDate = (current.last_streak_date as string | null) ?? null
  const currentStreakDays = Number(current.current_streak_days) || 0
  const bestStreakDays = Number(current.best_streak_days) || 0
  const streakFrozenDate = (current.streak_frozen_date as string | null) ?? null
  const streakFreezeExpiry = (current.streak_freeze_expiry as string | null) ?? null

  const update = computeUpdatedStreakProfile({
    todayYmd: statDate,
    lastStreakDate,
    currentStreakDays,
    bestStreakDays,
    streakFrozenDate,
    streakFreezeExpiry,
  })

  const dbUpdate: Record<string, unknown> = {
    current_streak_days: update.current_streak_days,
    best_streak_days: update.best_streak_days,
    last_streak_date: update.last_streak_date,
  }

  // Clear freeze if consumed
  if (update.freezeConsumed) {
    dbUpdate.streak_frozen_date = null
    dbUpdate.streak_freeze_expiry = null
    // eslint-disable-next-line no-console
    console.log('[streak-freeze-consumed]', { userId: userId.slice(0, 8), frozenDate: streakFrozenDate })
  }

  const { error: updateError } = await supabase
    .from('user_profiles')
    .update(dbUpdate)
    .eq('id', userId)

  return { error: updateError ?? null }
}
