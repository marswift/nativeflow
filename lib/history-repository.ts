/**
 * Repository for history read access (lesson_runs and daily_stats).
 * DB access only; no business logic. Returns typed rows only; no mapping to history types.
 */
import type { PostgrestError } from '@supabase/supabase-js'
import type { LessonRunRow, DailyStatRow } from './lesson-run-types'
import { supabase } from './supabase'

export type HistoryRepositoryResult<T> = {
  data: T[] | null
  error: PostgrestError | null
}

/**
 * Fetches recent lesson_runs for a user, ordered by started_at desc.
 */
export async function getRecentLessonRunsByUser(
  userId: string,
  limit: number
): Promise<HistoryRepositoryResult<LessonRunRow>> {
  const { data, error } = await supabase
    .from('lesson_runs')
    .select()
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(limit)

  return { data: (data as LessonRunRow[] | null) ?? null, error: error ?? null }
}

/**
 * Fetches recent daily_stats for a user, ordered by stat_date desc.
 */
export async function getDailyStatsByUser(
  userId: string,
  limit: number
): Promise<HistoryRepositoryResult<DailyStatRow>> {
  const { data, error } = await supabase
    .from('daily_stats')
    .select()
    .eq('user_id', userId)
    .order('stat_date', { ascending: false })
    .limit(limit)

  return { data: (data as DailyStatRow[] | null) ?? null, error: error ?? null }
}
