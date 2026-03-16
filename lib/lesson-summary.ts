import type { LessonSession } from './lesson-engine'
import type { LessonStats } from './lesson-stats'

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max))
}

function normalizeTheme(theme: string): string {
  const trimmed = theme.trim()
  return trimmed !== '' ? trimmed : '今日のレッスン'
}

export type LessonCompletionSummary = {
  theme: string
  totalItems: number
  completedItems: number
  progressPercent: number
  totalTypingItems: number
  correctTypingItems: number
  completionMessage: string
}

/**
 * Builds a user-facing completion summary from a lesson session and its stats.
 * progressPercent is clamped to 0–100. theme falls back to "今日のレッスン" when empty.
 * completionMessage is a simple Japanese message suitable for the end of a lesson.
 */
export function buildLessonCompletionSummary(
  session: LessonSession,
  stats: LessonStats
): LessonCompletionSummary {
  const progressPercent = clamp(stats.progressPercent, 0, 100)
  const theme = normalizeTheme(session.theme)
  const completionMessage =
    progressPercent >= 100
      ? 'おつかれさまでした。レッスンを完了しました。'
      : 'レッスンをお休みしました。また続きからどうぞ。'

  return {
    theme,
    totalItems: stats.totalItems,
    completedItems: stats.completedItems,
    progressPercent,
    totalTypingItems: stats.totalTypingItems,
    correctTypingItems: stats.correctTypingItems,
    completionMessage,
  }
}
