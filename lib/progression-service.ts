/**
 * Updates user_profiles streak fields when a study day is recorded.
 * Uses progression-utils for pure logic; this module handles DB read/write.
 *
 * Note:
 * rank_code and avatar_level are no longer updated here because NativeFlow's
 * main rank progression is Flow Point-based.
 */
import type { PostgrestError } from '@supabase/supabase-js'
import { computeUpdatedStreakProfile } from './progression-utils'
import { supabase } from './supabase'

export type ProgressionUpdateResult = {
  error: PostgrestError | null
}

const PROGRESSION_COLUMNS =
  'current_streak_days, best_streak_days, last_streak_date'

/**
 * Updates streak fields on user_profiles for the given study day.
 * Idempotent: if last_streak_date is already statDate, no double increment.
 * Does not modify rank_code, avatar_level, avatar_character_code,
 * avatar_image_url, or avatar_badge_image_url.
 */
export async function updateProgressionForStudyDay(
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

  const update = computeUpdatedStreakProfile({
    todayYmd: statDate,
    lastStreakDate,
    currentStreakDays,
    bestStreakDays,
  })

  const { error: updateError } = await supabase
    .from('user_profiles')
    .update({
      current_streak_days: update.current_streak_days,
      best_streak_days: update.best_streak_days,
      last_streak_date: update.last_streak_date,
    })
    .eq('id', userId)

  return { error: updateError ?? null }
}