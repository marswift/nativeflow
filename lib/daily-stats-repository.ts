/**
 * Repository for daily_stats table access.
 * DB access only; no business logic. Uses Supabase client and lesson-run-types.
 */
import type { PostgrestError } from '@supabase/supabase-js'
import type { DailyStatRow } from './lesson-run-types'
import { supabase } from './supabase'

export type DailyStatsRepositoryResult<T> = {
  data: T | null
  error: PostgrestError | null
}

function toDailyStatRow(row: unknown): DailyStatRow | null {
  return row as DailyStatRow | null
}

/** Payload for upserting a daily_stats row. Uniqueness on (user_id, stat_date). */
export type UpsertDailyStatPayload = {
  user_id: string
  stat_date: string
  lesson_runs_completed: number
  study_minutes: number
  flow_points_today?: number
}

/**
 * Fetches one daily_stats row by user_id and stat_date. Returns null if not found.
 */
export async function getDailyStatByUserAndDate(
  userId: string,
  statDate: string
): Promise<DailyStatsRepositoryResult<DailyStatRow>> {
  const { data, error } = await supabase
    .from('daily_stats')
    .select()
    .eq('user_id', userId)
    .eq('stat_date', statDate)
    .maybeSingle()

  return { data: toDailyStatRow(data), error: error ?? null }
}

/**
 * Upserts one daily_stats row. Uses (user_id, stat_date) for conflict. Returns the row.
 */
export async function upsertDailyStat(
  payload: UpsertDailyStatPayload
): Promise<DailyStatsRepositoryResult<DailyStatRow>> {
  const { data, error } = await supabase
    .from('daily_stats')
    .upsert(payload, { onConflict: 'user_id,stat_date' })
    .select()
    .single()

  return { data: toDailyStatRow(data), error: error ?? null }
}