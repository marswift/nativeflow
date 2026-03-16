/**
 * Display-oriented types for the history screen (MVP).
 * UI-independent; no DB access. Raw rows (e.g. LessonRunRow, DailyStatRow)
 * can be mapped to these types for list/summary UIs.
 */

/** Status of a lesson run as shown in history. */
export type LessonHistoryStatus = 'in_progress' | 'completed' | 'abandoned'

/**
 * One past lesson entry for a history list UI.
 * Use for "recent lessons" or "lesson history" lists.
 */
export type LessonHistoryItem = {
  /** Lesson run id (from lesson_runs.id). */
  id: string
  /** Lesson theme (e.g. "Breakfast"). */
  theme: string
  /** Lesson level (e.g. "beginner"). */
  level: string
  /** Run status. */
  status: LessonHistoryStatus
  /** 0–100 progress. */
  progressPercent: number
  /** Number of items completed in this run. */
  completedItems: number
  /** Total items in the lesson. */
  totalItems: number
  /** Typing items answered correctly. */
  correctTypingItems: number
  /** Total typing items in the lesson. */
  totalTypingItems: number
  /** When the run started (ISO string). */
  startedAt: string
  /** When the run completed or was abandoned; null if in progress. */
  completedAt: string | null
}

/**
 * One-day summary for a history UI (e.g. "March 7" card).
 * Maps from daily_stats aggregates; statDate is the day (YYYY-MM-DD).
 */
export type DailyHistorySummary = {
  /** Date of the day (YYYY-MM-DD). */
  statDate: string
  /** Number of lesson runs started that day. */
  lessonRunsStarted: number
  /** Number of lesson runs completed that day. */
  lessonRunsCompleted: number
  /** Total lesson items completed across runs. */
  lessonItemsCompleted: number
  /** Total typing items correct across runs. */
  typingItemsCorrect: number
  /** Total study time in minutes. */
  studyMinutes: number
}
