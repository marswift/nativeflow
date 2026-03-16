/**
 * Service layer for lesson run persistence.
 * Orchestrates repository calls and maps lesson-engine / lesson-stats data to DB payloads.
 * No React or UI; minimal business logic for MVP.
 */
import type { LessonSession, LessonBlock, LessonBlockItem } from './lesson-engine'
import { getTotalItemCount, getTotalTypingItemCount } from './lesson-stats'
import type { LessonStats } from './lesson-stats'
import type { LessonRunRow, LessonRunItemRow } from './lesson-run-types'
import type { RepositoryResult } from './lesson-run-repository'
import {
  createLessonRun,
  updateLessonRunProgress,
  insertLessonRunItem,
  completeLessonRun,
} from './lesson-run-repository'

/**
 * Starts a new lesson run: creates a lesson_runs row from session and user id.
 * Initial progress is zero; status is in_progress.
 */
export async function startLessonRun(
  userId: string,
  session: LessonSession
): Promise<RepositoryResult<LessonRunRow>> {
  const totalItems = getTotalItemCount(session)
  const totalTypingItems = getTotalTypingItemCount(session)
  const startedAt = new Date().toISOString()

  return createLessonRun({
    user_id: userId,
    lesson_theme: session.theme,
    lesson_level: session.level,
    total_blocks: session.blocks.length,
    total_items: totalItems,
    total_typing_items: totalTypingItems,
    completed_items: 0,
    correct_typing_items: 0,
    progress_percent: 0,
    status: 'in_progress',
    started_at: startedAt,
    completed_at: null,
  })
}

/** Input for saving one lesson run item (e.g. after answering a typing item or completing a step). */
export type SaveLessonRunItemInput = {
  lesson_run_id: string
  user_id: string
  block: LessonBlock
  item: LessonBlockItem
  block_index: number
  item_index: number
  /** For typing: user's input. */
  user_input_text?: string | null
  /** For typing: whether the answer was checked. */
  was_checked: boolean
  /** For typing: true/false when checked; null otherwise. */
  is_correct?: boolean | null
  /** When this item was completed; null if not yet. */
  completed_at?: string | null
}

/**
 * Persists one lesson_run_items row for the current block/item state.
 */
export async function saveLessonRunItem(
  input: SaveLessonRunItemInput
): Promise<RepositoryResult<LessonRunItemRow>> {
  return insertLessonRunItem({
    lesson_run_id: input.lesson_run_id,
    user_id: input.user_id,
    block_index: input.block_index,
    item_index: input.item_index,
    block_type: input.block.type,
    block_title: input.block.title,
    prompt_text: input.item.prompt,
    expected_answer_text: input.item.answer ?? null,
    user_input_text: input.user_input_text ?? null,
    was_checked: input.was_checked,
    is_correct: input.is_correct ?? null,
    completed_at: input.completed_at ?? null,
  })
}

/**
 * Updates a lesson run's progress from current stats (completed_items, correct_typing_items, progress_percent).
 */
export async function updateLessonRunStats(
  lessonRunId: string,
  stats: LessonStats
): Promise<RepositoryResult<LessonRunRow>> {
  return updateLessonRunProgress(lessonRunId, {
    completed_items: stats.completedItems,
    correct_typing_items: stats.correctTypingItems,
    progress_percent: stats.progressPercent,
  })
}

/**
 * Marks a lesson run as completed.
 */
export async function finishLessonRun(
  lessonRunId: string
): Promise<RepositoryResult<LessonRunRow>> {
  return completeLessonRun(lessonRunId)
}

/**
 * Computes study minutes from a completed lesson run (completed_at - started_at).
 * Use after finishLessonRun. Returns 0 if completed_at is null, dates are invalid, or duration is negative.
 */
export function computeStudyMinutesFromRun(row: LessonRunRow): number {
  if (!row.completed_at || !row.started_at) return 0
  const start = new Date(row.started_at).getTime()
  const end = new Date(row.completed_at).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0
  const minutes = Math.max(0, Math.floor((end - start) / 60000))
  return Number.isFinite(minutes) ? minutes : 0
}
