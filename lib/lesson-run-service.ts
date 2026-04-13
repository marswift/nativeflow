/**
 * Service layer for lesson run persistence.
 * Orchestrates repository calls and maps lesson session / lesson-stats data to DB payloads.
 * No React or UI; minimal business logic for MVP.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
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
  supabase: SupabaseClient,
  userId: string,
  session: LessonSession
): Promise<RepositoryResult<LessonRunRow>> {
  const totalItems = getTotalItemCount(session)
  const totalTypingItems = getTotalTypingItemCount(session)
  const startedAt = new Date().toISOString()

  return createLessonRun(supabase, {
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

// ── Region-aware prompt context ──

/** Human-readable labels for supported region slugs. */
const REGION_SLUG_LABELS: Record<string, { label: string; dialect: string }> = {
  en_us_general: { label: 'the United States', dialect: 'American English' },
  en_us_ny: { label: 'New York, USA', dialect: 'American English (New York style)' },
  en_gb_london: { label: 'London, UK', dialect: 'British English' },
  ko_kr_seoul: { label: 'Seoul, Korea', dialect: 'standard Korean' },
}

/**
 * Converts a target_region_slug to a human-readable region label.
 * Returns null for unknown or empty slugs.
 *
 * Example: 'en_gb_london' → 'London, UK'
 */
export function regionSlugToLabel(slug: string | null | undefined): string | null {
  if (!slug) return null
  return REGION_SLUG_LABELS[slug]?.label ?? null
}

/**
 * Builds a concise region-context prompt fragment for AI content generation.
 * Returns null when no region is set, so callers can safely skip injection.
 *
 * Example output:
 *   "The user is learning English for the London, UK region. Use natural British English expressions."
 */
export function buildRegionPromptContext(
  regionSlug: string | null | undefined
): string | null {
  if (!regionSlug) return null
  const entry = REGION_SLUG_LABELS[regionSlug]
  if (!entry) return null
  return `The user is learning English for the ${entry.label} region. Use natural ${entry.dialect} expressions.`
}

// ── Phase 7.3B: Fallback content normalization at persist time ──

const REVIEW_FALLBACK_PATTERNS = [
  /^this is about\b/i,
  /^let's talk about\b/i,
  /^practice\b/i,
  /^listen to the english\b/i,
  /^type the english\b/i,
  /^review a simple\b/i,
  /^talk to the ai\b/i,
]

function isFallbackLike(text: string | null | undefined): boolean {
  if (!text || text.trim().length === 0) return false
  return REVIEW_FALLBACK_PATTERNS.some((p) => p.test(text.trim()))
}

/**
 * Normalize prompt_text and expected_answer_text to avoid persisting
 * fallback-heavy content into lesson_run_items (which feeds review items).
 *
 * Priority for expected_answer_text:
 * 1. Original if meaningful
 * 2. item.answer (same, but re-checked)
 * 3. block.description if meaningful
 * 4. Original (never make it worse)
 */
function normalizeReviewContent(input: SaveLessonRunItemInput): {
  prompt_text: string
  expected_answer_text: string | null
} {
  const origPrompt = input.item.prompt
  const origAnswer = input.item.answer ?? null

  try {
    let normalizedAnswer = origAnswer
    let normalizedPrompt = origPrompt
    let changedAnswer = false
    let changedPrompt = false

    // Normalize expected_answer_text
    if (isFallbackLike(origAnswer)) {
      // Try block.description as alternative
      const desc = input.block.description?.trim()
      if (desc && desc.length > 5 && !isFallbackLike(desc)) {
        normalizedAnswer = desc
        changedAnswer = true
      }
    }

    // Normalize prompt_text (lower priority — only if clearly fallback)
    if (isFallbackLike(origPrompt) && normalizedAnswer && !isFallbackLike(normalizedAnswer)) {
      // Use the good answer as prompt too (for review display)
      normalizedPrompt = normalizedAnswer
      changedPrompt = true
    }

    if (changedAnswer || changedPrompt) {
      // eslint-disable-next-line no-console
      console.log('[Phase7.3B][review-normalize]', {
        originalAnswer: (origAnswer ?? '').slice(0, 50),
        normalizedAnswer: (normalizedAnswer ?? '').slice(0, 50),
        originalPrompt: origPrompt.slice(0, 50),
        normalizedPrompt: normalizedPrompt.slice(0, 50),
        changedAnswer,
        changedPrompt,
      })
    }

    return { prompt_text: normalizedPrompt, expected_answer_text: normalizedAnswer }
  } catch {
    return { prompt_text: origPrompt, expected_answer_text: origAnswer }
  }
}

/**
 * Persists one lesson_run_items row for the current block/item state.
 */
export async function saveLessonRunItem(
  supabase: SupabaseClient,
  input: SaveLessonRunItemInput
): Promise<RepositoryResult<LessonRunItemRow>> {
  const { prompt_text, expected_answer_text } = normalizeReviewContent(input)

  return insertLessonRunItem(supabase, {
    lesson_run_id: input.lesson_run_id,
    user_id: input.user_id,
    block_index: input.block_index,
    item_index: input.item_index,
    block_type: input.block.type,
    block_title: input.block.title,
    prompt_text,
    expected_answer_text,
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
  supabase: SupabaseClient,
  lessonRunId: string,
  stats: LessonStats
): Promise<RepositoryResult<LessonRunRow>> {
  return updateLessonRunProgress(supabase, lessonRunId, {
    completed_items: stats.completedItems,
    correct_typing_items: stats.correctTypingItems,
    progress_percent: stats.progressPercent,
  })
}

/**
 * Marks a lesson run as completed.
 */
export async function finishLessonRun(
  supabase: SupabaseClient,
  lessonRunId: string
): Promise<RepositoryResult<LessonRunRow>> {
  // ① 既に完了しているか確認
  const { data: existing, error: fetchError } = await supabase
    .from('lesson_runs')
    .select('*')
    .eq('id', lessonRunId)
    .maybeSingle()

  if (fetchError) {
    return {
      data: null,
      error: fetchError,
    }
  }

  // ② すでに完了済みなら何もしない（冪等性）
  if (existing?.completed_at) {
    return {
      data: existing as LessonRunRow,
      error: null,
    }
  }

  // ③ 初回のみ完了処理
  return completeLessonRun(supabase, lessonRunId)
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
  const durationMs = end - start
  if (!Number.isFinite(durationMs) || durationMs <= 0) return 0
  const minutes = Math.floor(durationMs / 60000)
  return Math.max(1, minutes)
}