/**
 * Reusable side effects for lesson run completion.
 * Used by app/lesson/page.tsx completion effect.
 * No React; orchestrates finishLessonRun, study minutes, and daily stats.
 */
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
  lessonRunId: string,
  userId: string | null
): Promise<void> {
  const result = await finishLessonRun(lessonRunId)
  if (result.error) {
    console.error('Lesson run complete failed', result.error)
    return
  }
  if (userId) {
    const studyMinutes = result.data
      ? computeStudyMinutesFromRun(result.data)
      : 0
    const res = await incrementDailyStats(userId, {
      lesson_runs_completed: 1,
      study_minutes: studyMinutes,
    })
    if (res.error) console.error('Daily stats update failed', res.error)
  }
}
