/**
 * Types for lesson persistence tables in Supabase.
 * Database schema and migrations are managed in Supabase, not in this repository.
 * These match the NativeFlow MVP database schema.
 */

export type LessonBlockType = 'conversation' | 'review' | 'typing'

export type LessonRunStatus = 'in_progress' | 'completed' | 'abandoned'

/**
 * Row shape of public.lesson_runs
 * One record per lesson session run.
 */
export type LessonRunRow = {
  id: string
  user_id: string

  lesson_theme: string
  lesson_level: string

  total_blocks: number
  total_items: number
  total_typing_items: number

  completed_items: number
  correct_typing_items: number

  progress_percent: number

  status: LessonRunStatus

  started_at: string
  completed_at: string | null

  created_at: string
  updated_at: string
}

/**
 * Row shape of public.lesson_run_items
 * One record per item inside a lesson run.
 */
export type LessonRunItemRow = {
  id: string
  lesson_run_id: string
  user_id: string

  block_index: number
  item_index: number

  block_type: LessonBlockType
  block_title: string

  prompt_text: string

  expected_answer_text: string | null
  user_input_text: string | null

  was_checked: boolean
  is_correct: boolean | null

  completed_at: string | null

  created_at: string
  updated_at: string
}

/**
 * Row shape of public.daily_stats
 * Aggregated stats per user per date.
 */
export type DailyStatRow = {
  id: string
  user_id: string

  stat_date: string

  lesson_runs_started: number
  lesson_runs_completed: number
  lesson_items_completed: number
  typing_items_correct: number
  study_minutes: number

  created_at: string
  updated_at: string
}
