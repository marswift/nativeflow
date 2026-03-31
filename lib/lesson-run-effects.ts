/**
 * Reusable side effects for lesson run completion.
 * Used by app/lesson/page.tsx completion effect.
 * No React; orchestrates finishLessonRun and daily stats updates.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  finishLessonRun,
  computeStudyMinutesFromRun,
} from './lesson-run-service'
import { incrementDailyStats } from './daily-stats-service'

/**
 * Completes a lesson run and updates daily stats (lesson_runs_completed, study_minutes).
 * Call when the lesson run is finished (e.g. from a useEffect when showCompleted && lessonRunId).
 * Logs errors; does not throw.
 */
export async function runLessonCompletionEffect(
  supabase: SupabaseClient,
  lessonRunId: string,
  userId: string | null
): Promise<void> {
  // ① lesson完了処理
  const result = await finishLessonRun(supabase, lessonRunId)

  if (result.error) {
    console.error('Lesson run complete failed', result.error)
    return
  }

  // ② user未確定なら終了
  if (!userId) return

  // ③ result.dataの安全確認
  if (!result.data) {
    console.error('Lesson run result data missing')
    return
  }

  // ⑤ 学習時間計算
  const studyMinutes = computeStudyMinutesFromRun(result.data)

  // ⑥ daily_stats 更新（idempotencyKey付き）
  const dailyStatsResult = await incrementDailyStats(
    supabase,
    userId,
    {
      lesson_runs_completed: 1,
      study_minutes: studyMinutes,
    },
    undefined,
    lessonRunId // ← これが超重要
  )

  if (dailyStatsResult.error) {
    console.error('Daily stats update failed', dailyStatsResult.error)
  }
}