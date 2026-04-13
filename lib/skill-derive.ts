/**
 * DB-backed Skill Derivation
 *
 * Derives 3 skill scores (0–1) from Supabase tables:
 *   - Listening: pronunciation_scores.total_score + listen/repeat items
 *   - Typing: typing items completion + correctness
 *   - Conversation: ai_conversation/ai_question items correctness
 *
 * Pure query + computation. No side effects, no localStorage.
 * Falls back to 0.5 (neutral) if no data exists.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export type DerivedSkillScores = {
  listening: number
  typing: number
  conversation: number
}

const DEFAULT_SCORE = 0.5
const RECENT_LIMIT = 30

/**
 * Derive listening skill (0–1) from pronunciation scores.
 *
 * Primary: average of recent pronunciation total_score (0–100 → 0–1)
 * Fallback: listen/repeat completion rate from lesson_run_items
 */
async function deriveListeningScore(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  // Primary: pronunciation scores (best signal for listening + repeat)
  const { data: pronRows } = await supabase
    .from('pronunciation_scores')
    .select('total_score')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(RECENT_LIMIT)

  if (pronRows && pronRows.length > 0) {
    const valid = pronRows
      .map((r) => r.total_score as number | null)
      .filter((s): s is number => typeof s === 'number' && s >= 0)
    if (valid.length > 0) {
      const avg = valid.reduce((a, b) => a + b, 0) / valid.length
      return Math.max(0, Math.min(1, avg / 100))
    }
  }

  // Fallback: listen/repeat items completion
  const { data: listenItems } = await supabase
    .from('lesson_run_items')
    .select('completed_at, was_checked')
    .eq('user_id', userId)
    .in('block_title', ['聞き取りとリピート', 'listen', 'repeat', 'scaffold'])
    .order('created_at', { ascending: false })
    .limit(RECENT_LIMIT)

  if (listenItems && listenItems.length > 0) {
    const completed = listenItems.filter((r) => r.completed_at != null).length
    return completed / listenItems.length
  }

  return DEFAULT_SCORE
}

/**
 * Derive typing skill (0–1) from typing items.
 *
 * Signals: is_correct, was_checked, user_input_text presence
 * - correct → 1.0
 * - wrong but attempted → 0.3
 * - checked but null correctness → 0.6 (completed stage)
 * - not checked → 0.2
 */
async function deriveTypingScore(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { data: typingItems } = await supabase
    .from('lesson_run_items')
    .select('is_correct, was_checked, user_input_text')
    .eq('user_id', userId)
    .in('block_title', ['書き取り', 'typing'])
    .order('created_at', { ascending: false })
    .limit(RECENT_LIMIT)

  if (!typingItems || typingItems.length === 0) return DEFAULT_SCORE

  const scores = typingItems.map((r) => {
    if (r.is_correct === true) return 1.0
    if (r.is_correct === false) return 0.3
    // is_correct is null — check engagement
    const hasInput = r.user_input_text && (r.user_input_text as string).trim().length > 0
    if (r.was_checked && hasInput) return 0.6
    if (hasInput) return 0.5
    return 0.2
  })

  return scores.reduce((a, b) => a + b, 0) / scores.length
}

/**
 * Derive conversation skill (0–1) from AI conversation/question items.
 *
 * Signals: is_correct ratio, completed_at presence
 */
async function deriveConversationScore(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { data: convItems } = await supabase
    .from('lesson_run_items')
    .select('is_correct, completed_at')
    .eq('user_id', userId)
    .in('block_title', ['AI会話', 'ai_conversation', 'ai_question'])
    .order('created_at', { ascending: false })
    .limit(RECENT_LIMIT)

  if (!convItems || convItems.length === 0) {
    // Fallback: try block_type instead
    const { data: byType } = await supabase
      .from('lesson_run_items')
      .select('is_correct, completed_at')
      .eq('user_id', userId)
      .in('block_type', ['ai_conversation', 'ai_question'])
      .order('created_at', { ascending: false })
      .limit(RECENT_LIMIT)

    if (!byType || byType.length === 0) return DEFAULT_SCORE
    return scoreConvItems(byType)
  }

  return scoreConvItems(convItems)
}

function scoreConvItems(items: { is_correct: boolean | null; completed_at: string | null }[]): number {
  const correct = items.filter((r) => r.is_correct === true).length
  const wrong = items.filter((r) => r.is_correct === false).length
  const evaluated = correct + wrong

  if (evaluated > 0) {
    return correct / evaluated
  }

  // No is_correct data — use completion rate
  const completed = items.filter((r) => r.completed_at != null).length
  return completed > 0 ? Math.min(0.7, completed / items.length) : DEFAULT_SCORE
}

/**
 * Derive all 3 skill scores from DB.
 * Each query is independent — partial failures return DEFAULT_SCORE.
 */
export async function deriveSkillScores(
  supabase: SupabaseClient,
  userId: string,
): Promise<DerivedSkillScores> {
  const [listening, typing, conversation] = await Promise.all([
    deriveListeningScore(supabase, userId).catch(() => DEFAULT_SCORE),
    deriveTypingScore(supabase, userId).catch(() => DEFAULT_SCORE),
    deriveConversationScore(supabase, userId).catch(() => DEFAULT_SCORE),
  ])

  return { listening, typing, conversation }
}
