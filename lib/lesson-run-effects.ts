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
import { computeDifficultyOutcome, type RunItemRow } from './corpus/difficulty-outcome'
import { updateDifficultyAdjustment } from './corpus/difficulty-adjustment'
import { computePersonalizationSummary } from './personalization/personalization-summary'
import { writePersonalization } from './personalization/personalization-storage'

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

  // ⑥b Daily language lock progress increment
  try {
    const { incrementDailyLockProgress } = await import('./daily-language-lock')
    const lockState = incrementDailyLockProgress()
    if (lockState) {
      // eslint-disable-next-line no-console
      console.log('[Playtest][daily-lock]', {
        languageCode: lockState.languageCode,
        completedProblems: lockState.completedProblems,
        targetProblems: lockState.targetProblems,
        released: lockState.released,
      })
    }
  } catch { /* non-blocking */ }

  // ⑥c Diamond reward (with boost check)
  try {
    const { computeDiamondReward, awardDiamonds } = await import('./diamond-service')
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('current_streak_days, diamond_boost_until')
      .eq('id', userId)
      .maybeSingle()
    const streakDays = (profile?.current_streak_days as number) ?? 0
    const reward = computeDiamondReward(streakDays)

    // Check if boost is active → +2 bonus
    const boostUntil = profile?.diamond_boost_until as string | null
    const boostActive = boostUntil ? new Date(boostUntil) > new Date() : false
    const boostBonus = boostActive ? 2 : 0
    const totalReward = reward.total + boostBonus

    const newTotal = await awardDiamonds(supabase, userId, totalReward)

    // Clear boost after use
    if (boostActive) {
      await supabase.from('user_profiles').update({ diamond_boost_until: null }).eq('id', userId)
    }

    // eslint-disable-next-line no-console
    console.log('[diamond-reward]', { userId: userId.slice(0, 8), base: reward.base, streakBonus: reward.streakBonus, boostBonus, total: totalReward, newTotal })
  } catch { /* non-blocking */ }

  // ⑦ Difficulty outcome (read-only logging — Phase 4.1)
  try {
    const { data: runItems } = await supabase
      .from('lesson_run_items')
      .select('block_title, is_correct, user_input_text')
      .eq('lesson_run_id', lessonRunId)

    if (runItems && runItems.length > 0) {
      const outcome = computeDifficultyOutcome(runItems as RunItemRow[])
      // eslint-disable-next-line no-console
      console.log('[difficulty-outcome]', { runId: lessonRunId, ...outcome })

      // Update local difficulty adjustment for future corpus selection
      updateDifficultyAdjustment(outcome.suggestedDifficultyDelta)

      // ⑧ Personalization summary (logging only — Phase 5.1)
      const { data: runRow } = await supabase
        .from('lesson_runs')
        .select('lesson_theme')
        .eq('id', lessonRunId)
        .single()

      const summary = computePersonalizationSummary({
        items: runItems as { block_title: string; is_correct: boolean | null }[],
        lessonMeta: runRow ? { theme: runRow.lesson_theme as string } : null,
        difficultyOutcome: outcome,
      })
      // eslint-disable-next-line no-console
      console.log('[personalization-summary]', { runId: lessonRunId, ...summary })

      // Save to localStorage for scene preference bias in future selections
      writePersonalization({
        dominantScene: summary.dominantScene,
        difficultyTrend: summary.difficultyTrend,
        skillScores: summary.skillScores,
      })
    }
  } catch {
    // Non-blocking — difficulty/personalization logging must never break completion
  }
}