/**
 * Repository for lesson run persistence.
 * DB access only; no business logic. Uses Supabase client and lesson-run-types.
 */
import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type {
  LessonRunRow,
  LessonRunItemRow,
} from './lesson-run-types'

/** Payload to create a new lesson run. */
export type CreateLessonRunPayload = {
  user_id: string
  lesson_theme: string
  lesson_level: string
  total_blocks: number
  total_items: number
  total_typing_items: number
  completed_items: number
  correct_typing_items: number
  progress_percent: number
  status: 'in_progress' | 'completed' | 'abandoned'
  started_at: string
  completed_at: string | null
}

/** Payload to update lesson run progress. */
export type UpdateLessonRunProgressPayload = {
  completed_items: number
  correct_typing_items: number
  progress_percent: number
}

/** Payload to insert a lesson run item. */
export type InsertLessonRunItemPayload = {
  lesson_run_id: string
  user_id: string
  block_index: number
  item_index: number
  block_type: 'conversation' | 'review' | 'typing'
  block_title: string
  prompt_text: string
  expected_answer_text: string | null
  user_input_text: string | null
  was_checked: boolean
  is_correct: boolean | null
  completed_at: string | null
}

export type RepositoryResult<T> = {
  data: T | null
  error: PostgrestError | null
}

function toLessonRunRow(row: unknown): LessonRunRow | null {
  return row as LessonRunRow | null
}

function toLessonRunItemRow(row: unknown): LessonRunItemRow | null {
  return row as LessonRunItemRow | null
}

/**
 * Inserts a new row into lesson_runs. Returns the inserted row.
 */
export async function createLessonRun(
  payload: CreateLessonRunPayload
): Promise<RepositoryResult<LessonRunRow>> {
  const { data, error } = await supabase
    .from('lesson_runs')
    .insert(payload)
    .select()
    .single()

  return { data: toLessonRunRow(data), error: error ?? null }
}

/**
 * Updates progress fields on an existing lesson run. Returns the updated row.
 */
export async function updateLessonRunProgress(
  lessonRunId: string,
  payload: UpdateLessonRunProgressPayload
): Promise<RepositoryResult<LessonRunRow>> {
  const { data, error } = await supabase
    .from('lesson_runs')
    .update({
      completed_items: payload.completed_items,
      correct_typing_items: payload.correct_typing_items,
      progress_percent: payload.progress_percent,
    })
    .eq('id', lessonRunId)
    .select()
    .single()

  return { data: toLessonRunRow(data), error: error ?? null }
}

/**
 * Inserts a new row into lesson_run_items. Returns the inserted row.
 */
export async function insertLessonRunItem(
  payload: InsertLessonRunItemPayload
): Promise<RepositoryResult<LessonRunItemRow>> {
  const { data, error } = await supabase
    .from('lesson_run_items')
    .insert(payload)
    .select()
    .single()

  return { data: toLessonRunItemRow(data), error: error ?? null }
}

/**
 * Marks a lesson run as completed. Returns the updated row.
 */
export async function completeLessonRun(
  lessonRunId: string
): Promise<RepositoryResult<LessonRunRow>> {
  const { data, error } = await supabase
    .from('lesson_runs')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', lessonRunId)
    .select()
    .single()

  return { data: toLessonRunRow(data), error: error ?? null }
}
