/**
 * Service layer for history data (MVP).
 * Fetches rows via repository and maps to display-oriented history types.
 * No React or UI; thin and deterministic.
 */
import type { PostgrestError } from '@supabase/supabase-js'
import type { LessonHistoryItem, DailyHistorySummary } from './history-types'
import { getRecentLessonRunsByUser, getDailyStatsByUser } from './history-repository'
import {
  mapLessonRunRowToLessonHistoryItem,
  mapDailyStatRowToDailyHistorySummary,
} from './history-mappers'

export type HistoryServiceResult<T> = {
  data: T[] | null
  error: PostgrestError | null
}

/**
 * Returns recent lesson runs for a user as display-oriented history items.
 */
export async function getRecentLessonHistoryByUser(
  userId: string,
  limit: number
): Promise<HistoryServiceResult<LessonHistoryItem>> {
  const { data: rows, error } = await getRecentLessonRunsByUser(userId, limit)
  if (error) return { data: null, error }
  const data = (rows ?? []).map(mapLessonRunRowToLessonHistoryItem)
  return { data, error: null }
}

/**
 * Returns recent daily stats for a user as display-oriented day summaries.
 */
export async function getDailyHistorySummariesByUser(
  userId: string,
  limit: number
): Promise<HistoryServiceResult<DailyHistorySummary>> {
  const { data: rows, error } = await getDailyStatsByUser(userId, limit)
  if (error) return { data: null, error }
  const data = (rows ?? []).map(mapDailyStatRowToDailyHistorySummary)
  return { data, error: null }
}
