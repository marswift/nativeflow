/**
 * Repository for the review_items table.
 * DB access only — no scheduling logic, no business rules.
 */
import type { SupabaseClient, PostgrestError } from '@supabase/supabase-js'

export type ReviewItemRow = {
  id: string
  user_id: string
  lesson_item_id: string
  stability: number
  difficulty: number
  retrievability: number
  last_reviewed_at: string | null
  next_review_at: string | null
  correct_count: number
  wrong_count: number
  created_at: string
}

export type ReviewItemRepositoryResult<T> = {
  data: T | null
  error: PostgrestError | null
}

function toRow(row: unknown): ReviewItemRow | null {
  return row as ReviewItemRow | null
}

/**
 * Returns the existing row if one already exists for this user + item pair.
 * Inserts a new row with default values otherwise.
 */
export async function createReviewItemIfMissing(
  supabase: SupabaseClient,
  userId: string,
  lessonItemId: string
): Promise<ReviewItemRepositoryResult<ReviewItemRow>> {
  const { data: existing, error: fetchError } = await supabase
    .from('review_items')
    .select()
    .eq('user_id', userId)
    .eq('lesson_item_id', lessonItemId)
    .maybeSingle()

  if (fetchError) return { data: null, error: fetchError }
  if (existing) return { data: toRow(existing), error: null }

  const { data, error } = await supabase
    .from('review_items')
    .insert({ user_id: userId, lesson_item_id: lessonItemId })
    .select()
    .single()

  return { data: toRow(data), error: error ?? null }
}

/**
 * Writes a correct-answer update.
 * Caller is responsible for computing correct_count and next_review_at.
 */
export async function markReviewCorrect(
  supabase: SupabaseClient,
  reviewItemId: string,
  updates: {
    correct_count: number
    next_review_at: string
  }
): Promise<ReviewItemRepositoryResult<ReviewItemRow>> {
  const { data, error } = await supabase
    .from('review_items')
    .update({
      correct_count: updates.correct_count,
      last_reviewed_at: new Date().toISOString(),
      next_review_at: updates.next_review_at,
    })
    .eq('id', reviewItemId)
    .select()
    .single()

  return { data: toRow(data), error: error ?? null }
}

/**
 * Writes a wrong-answer update.
 * Resets correct_count to 0. Caller provides wrong_count and next_review_at.
 */
export async function markReviewWrong(
  supabase: SupabaseClient,
  reviewItemId: string,
  updates: {
    wrong_count: number
    next_review_at: string
  }
): Promise<ReviewItemRepositoryResult<ReviewItemRow>> {
  const { data, error } = await supabase
    .from('review_items')
    .update({
      correct_count: 0,
      wrong_count: updates.wrong_count,
      last_reviewed_at: new Date().toISOString(),
      next_review_at: updates.next_review_at,
    })
    .eq('id', reviewItemId)
    .select()
    .single()

  return { data: toRow(data), error: error ?? null }
}

/**
 * Returns up to `limit` items due for review.
 * Includes rows with null next_review_at (never reviewed) and
 * rows where next_review_at <= now, oldest first.
 */
export async function getDueReviewItems(
  supabase: SupabaseClient,
  userId: string,
  limit: number
): Promise<ReviewItemRepositoryResult<ReviewItemRow[]>> {
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('review_items')
    .select()
    .eq('user_id', userId)
    .or(`next_review_at.is.null,next_review_at.lte.${now}`)
    .order('next_review_at', { ascending: true, nullsFirst: true })
    .limit(limit)

  if (error) return { data: null, error }

  const rows = (data ?? [])
    .map(toRow)
    .filter((r): r is ReviewItemRow => r !== null)

  return { data: rows, error: null }
}
