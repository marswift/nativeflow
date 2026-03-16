/**
 * Mappers from raw DB row types to display-oriented history types (MVP).
 * Thin, deterministic; no DB access and no UI formatting beyond field mapping.
 */
import type { LessonRunRow, DailyStatRow } from './lesson-run-types'
import type { LessonHistoryItem, DailyHistorySummary } from './history-types'

/**
 * Maps a lesson_runs row to a display-oriented history item for list UIs.
 */
export function mapLessonRunRowToLessonHistoryItem(
  row: LessonRunRow
): LessonHistoryItem {
  return {
    id: row.id,
    theme: row.lesson_theme,
    level: row.lesson_level,
    status: row.status,
    progressPercent: row.progress_percent,
    completedItems: row.completed_items,
    totalItems: row.total_items,
    correctTypingItems: row.correct_typing_items,
    totalTypingItems: row.total_typing_items,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  }
}

/**
 * Maps a daily_stats row to a display-oriented day summary for history UIs.
 */
export function mapDailyStatRowToDailyHistorySummary(
  row: DailyStatRow
): DailyHistorySummary {
  return {
    statDate: row.stat_date,
    lessonRunsStarted: row.lesson_runs_started,
    lessonRunsCompleted: row.lesson_runs_completed,
    lessonItemsCompleted: row.lesson_items_completed,
    typingItemsCorrect: row.typing_items_correct,
    studyMinutes: row.study_minutes,
  }
}
