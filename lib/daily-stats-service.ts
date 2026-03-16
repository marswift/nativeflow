/**
 * Service layer for daily_stats aggregation.
 * Orchestrates repository calls; minimal business logic for MVP.
 * Also updates user_profiles progression (streak/rank/avatar_level) when a study day is recorded.
 */
import type { DailyStatRow } from './lesson-run-types'
import type { DailyStatsRepositoryResult } from './daily-stats-repository'
import {
  getDailyStatByUserAndDate,
  upsertDailyStat,
} from './daily-stats-repository'
import { updateProgressionForStudyDay } from './progression-service'

/** Increments to apply to daily stats. Omitted fields are treated as 0. */
export type DailyStatIncrements = {
  lesson_runs_started?: number
  lesson_runs_completed?: number
  lesson_items_completed?: number
  typing_items_correct?: number
  study_minutes?: number
}

/**
 * Returns today's stat date as YYYY-MM-DD in local time.
 */
export function getTodayStatDate(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Reads the current daily stat for user and date, adds the given increments, and upserts.
 * If no row exists, current values are treated as zero. Returns the upserted row or error.
 */
export async function incrementDailyStats(
  userId: string,
  increments: DailyStatIncrements,
  statDate?: string
): Promise<DailyStatsRepositoryResult<DailyStatRow>> {
  const date = statDate ?? getTodayStatDate()

  const { data: existing, error: fetchError } = await getDailyStatByUserAndDate(
    userId,
    date
  )
  if (fetchError) return { data: null, error: fetchError }

  const base = existing ?? {
    lesson_runs_started: 0,
    lesson_runs_completed: 0,
    lesson_items_completed: 0,
    typing_items_correct: 0,
    study_minutes: 0,
  }

  const payload = {
    user_id: userId,
    stat_date: date,
    lesson_runs_started: base.lesson_runs_started + (increments.lesson_runs_started ?? 0),
    lesson_runs_completed: base.lesson_runs_completed + (increments.lesson_runs_completed ?? 0),
    lesson_items_completed: base.lesson_items_completed + (increments.lesson_items_completed ?? 0),
    typing_items_correct: base.typing_items_correct + (increments.typing_items_correct ?? 0),
    study_minutes: base.study_minutes + (increments.study_minutes ?? 0),
  }

  const result = await upsertDailyStat(payload)
  if (!result.error) {
    const prog = await updateProgressionForStudyDay(userId, date)
    if (prog.error) console.error('Progression update failed', prog.error)
  }
  return result
}
