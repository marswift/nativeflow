/**
 * Service layer for daily_stats aggregation.
 * Orchestrates repository calls; minimal business logic for MVP.
 * Also updates user_profiles progression (streak/rank/avatar_level) when a study day is recorded.
 *
 * ## Race condition について
 * 現在の実装は read-then-write パターンのため、並列実行時に後発の書き込みが
 * 先発の書き込みを上書きするリスクがある。
 * 根本解決には Supabase RPC による atomic increment
 * （PostgreSQL: UPDATE daily_stats SET col = col + val）が必要。
 * MVP 段階では /api/conversation-lesson/complete が1リクエスト1回のみ呼ぶ設計で運用し、
 * スケール時に RPC 化する。
 *
 * ## 冪等性（idempotency）について
 * incrementDailyStats は idempotencyKey を受け取る。
 * 呼び出し元（route.ts）は lesson_run_id を渡すことで、
 * 将来的な重複実行のトレース・防止が可能になる。
 * 現時点では key はログ出力のみに使用し、DB側の重複チェックは未実装。
 * 将来: idempotency_keys テーブルを追加し、INSERT OR IGNORE で二重加算を防ぐ。
 */
import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'
import type { DailyStatRow } from './lesson-run-types'
import type { DailyStatsRepositoryResult } from './daily-stats-repository'
import { updateProgressionForStudyDay } from './progression-service'
import { supabase as defaultSupabase } from './supabase'

/** Increments to apply to daily stats. Omitted fields are treated as 0. */
export type DailyStatIncrements = {
  lesson_runs_completed?: number
  study_minutes?: number
  flow_points_today?: number
}

/**
 * Returns today's stat date as YYYY-MM-DD in local time.
 */
export function getTodayStatDate(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isSupabaseClient(value: unknown): value is SupabaseClient {
  return (
    typeof value === 'object' &&
    value !== null &&
    'from' in (value as Record<string, unknown>)
  )
}

function toDailyStatRow(row: unknown): DailyStatRow | null {
  return row as DailyStatRow | null
}

type ResolvedIncrementArgs = {
  supabase: SupabaseClient
  userId: string
  increments: DailyStatIncrements
  statDate?: string
  idempotencyKey?: string
}

function resolveIncrementDailyStatsArgs(args: unknown[]): ResolvedIncrementArgs {
  if (isSupabaseClient(args[0])) {
    return {
      supabase: args[0],
      userId: args[1] as string,
      increments: args[2] as DailyStatIncrements,
      statDate: args[3] as string | undefined,
      idempotencyKey: args[4] as string | undefined,
    }
  }

  return {
    supabase: defaultSupabase,
    userId: args[0] as string,
    increments: args[1] as DailyStatIncrements,
    statDate: args[2] as string | undefined,
    idempotencyKey: args[3] as string | undefined,
  }
}

/**
 * Reads the current daily stat for user and date, adds the given increments, and upserts.
 * If no row exists, current values are treated as zero. Returns the upserted row or error.
 *
 * Supported signatures:
 * - incrementDailyStats(userId, increments, statDate?, idempotencyKey?)
 * - incrementDailyStats(supabase, userId, increments, statDate?, idempotencyKey?)
 */
export async function incrementDailyStats(
  userId: string,
  increments: DailyStatIncrements,
  statDate?: string,
  idempotencyKey?: string
): Promise<DailyStatsRepositoryResult<DailyStatRow>>
export async function incrementDailyStats(
  supabase: SupabaseClient,
  userId: string,
  increments: DailyStatIncrements,
  statDate?: string,
  idempotencyKey?: string
): Promise<DailyStatsRepositoryResult<DailyStatRow>>
export async function incrementDailyStats(
  ...args: unknown[]
): Promise<DailyStatsRepositoryResult<DailyStatRow>> {
  const {
    supabase,
    userId,
    increments,
    statDate,
    idempotencyKey,
  } = resolveIncrementDailyStatsArgs(args)

  if (!userId || typeof userId !== 'string') {
    throw new Error('incrementDailyStats: userId is required.')
  }

  const date = statDate ?? getTodayStatDate()

  // 負値ガード + study_minutes 最低1分保証
  const safeIncrements = {
    lesson_runs_completed: Math.max(0, increments.lesson_runs_completed ?? 0),
    study_minutes:
      (increments.study_minutes ?? 0) > 0
        ? Math.max(1, Math.floor(increments.study_minutes ?? 0))
        : 0,
        flow_points_today: Math.max(0, increments.flow_points_today ?? 0),
  }

// lesson_runs.counted_in_stats は現行DBに存在しないため、MVPでは無効化
// 将来 idempotency 用の列または専用テーブル追加後に復活させる

const { data: existing, error: fetchError } = await supabase
  .from('daily_stats')
  .select()
  .eq('user_id', userId)
  .eq('stat_date', date)
  .maybeSingle()

if (fetchError) {
  return {
    data: null,
    error: fetchError as PostgrestError,
  }
}

const base = (existing as Partial<DailyStatRow> | null) ?? {
  lesson_runs_completed: 0,
  study_minutes: 0,
  flow_points_today: 0,
}

const payload = {
  user_id: userId,
  stat_date: date,
  lesson_runs_completed:
    Math.max(0, base.lesson_runs_completed ?? 0) +
    safeIncrements.lesson_runs_completed,
  study_minutes:
    Math.max(0, base.study_minutes ?? 0) + safeIncrements.study_minutes,
  flow_points_today:
    Math.max(0, (base as { flow_points_today?: number | null }).flow_points_today ?? 0) +
    safeIncrements.flow_points_today,
}

const { data, error } = await supabase
  .from('daily_stats')
  .upsert(payload, { onConflict: 'user_id,stat_date' })
  .select()
  .single()

const result: DailyStatsRepositoryResult<DailyStatRow> = {
  data: toDailyStatRow(data),
  error: (error as PostgrestError | null) ?? null,
}

// lesson_runs.counted_in_stats は現行DBに存在しないため、MVPでは無効化

if (!result.error) {
  const prog = await updateProgressionForStudyDay(userId, date)
  if (prog.error) {
    console.error('Progression update failed', prog.error)
  }
}

return result
}

export async function recordLessonFlowPointsForToday(
  userId: string,
  points: number
): Promise<DailyStatsRepositoryResult<DailyStatRow>>
export async function recordLessonFlowPointsForToday(
  supabase: SupabaseClient,
  userId: string,
  points: number
): Promise<DailyStatsRepositoryResult<DailyStatRow>>
export async function recordLessonFlowPointsForToday(
  ...args: unknown[]
): Promise<DailyStatsRepositoryResult<DailyStatRow>> {
  if (isSupabaseClient(args[0])) {
    return await incrementDailyStats(
      args[0],
      args[1] as string,
      { flow_points_today: args[2] as number },
      getTodayStatDate()
    )
  }

  return await incrementDailyStats(
    args[0] as string,
    { flow_points_today: args[1] as number },
    getTodayStatDate()
  )
}