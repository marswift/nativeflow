/**
 * Lesson Run Persistence — lightweight helpers for the new stage-based lesson flow.
 *
 * Writes to lesson_runs and lesson_run_items tables via Supabase.
 * Non-blocking — callers fire and forget.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

// ── Types ───────────────────────────────────────────────────

export type StageResult = 'good' | 'ok' | 'retry' | 'skipped'

export type StageMetrics = {
  /** Milliseconds spent on this stage. */
  durationMs?: number
  /** Number of times the user replayed audio. */
  replayCount?: number
  /** Number of retry attempts before completing. */
  retryCount?: number
  /** Whether the user recorded audio (repeat stage). */
  didRecord?: boolean
  /** Whether AI question audio was played to completion before answering. */
  questionAudioCompleted?: boolean
}

export type StageItemRecord = {
  stage: string
  result: StageResult
  userInput?: string | null
  transcript?: string | null
  score?: number | null
  /** Optional performance metrics for skill estimation. */
  metrics?: StageMetrics | null
}

export type LessonRunRecord = {
  userId: string
  sceneId: string
  region: string
  level: string
  stages: StageItemRecord[]
  overallResult: StageResult
  startedAt: string
  completedAt: string
}

// ── Start ───────────────────────────────────────────────────

export async function createLessonRun(
  supabase: SupabaseClient,
  userId: string,
  sceneId: string,
  level: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('lesson_runs')
      .insert({
        user_id: userId,
        lesson_theme: sceneId,
        lesson_level: level,
        total_blocks: 8,
        total_items: 8,
        total_typing_items: 1,
        completed_items: 0,
        correct_typing_items: 0,
        progress_percent: 0,
        status: 'in_progress',
        started_at: new Date().toISOString(),
        completed_at: null,
      })
      .select('id')
      .single()

    if (error || !data) return null
    return data.id as string
  } catch {
    return null
  }
}

// ── Save stage item ─────────────────────────────────────────

export async function saveStageItem(
  supabase: SupabaseClient,
  lessonRunId: string,
  userId: string,
  stageIndex: number,
  item: StageItemRecord
): Promise<void> {
  try {
    // Encode user input + metrics into user_input_text (no schema change needed)
    const baseInput = item.userInput ?? item.transcript ?? null
    const userInputText = item.metrics
      ? JSON.stringify({ text: baseInput, metrics: item.metrics })
      : baseInput

    await supabase
      .from('lesson_run_items')
      .insert({
        lesson_run_id: lessonRunId,
        user_id: userId,
        block_index: stageIndex,
        item_index: 0,
        block_type: 'conversation',
        block_title: item.stage,
        prompt_text: item.stage,
        expected_answer_text: null,
        user_input_text: userInputText,
        was_checked: item.result !== 'skipped',
        is_correct: item.result === 'good' || item.result === 'ok',
        completed_at: new Date().toISOString(),
      })
  } catch {
    // Non-blocking — swallow errors
  }
}

// ── Complete ────────────────────────────────────────────────

export async function completeLessonRun(
  supabase: SupabaseClient,
  lessonRunId: string
): Promise<void> {
  try {
    await supabase
      .from('lesson_runs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        progress_percent: 100,
      })
      .eq('id', lessonRunId)
  } catch {
    // Non-blocking
  }
}
