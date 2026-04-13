/**
 * Personalization Summary — Minimal learner profile snapshot
 *
 * Pure function. Computes a small personalization summary from
 * lesson_run_items and lesson metadata. No side effects, no DB writes, no UI.
 *
 * Used by runLessonCompletionEffect for logging only (Phase 5.1).
 */

import type { DifficultyOutcome } from '../corpus/difficulty-outcome'

// ── Types ──

export type PersonalizationSummary = {
  /** Skill scores: 0–1 where 1 = strong, 0 = weak */
  skillScores: {
    listening: number
    typing: number
  }
  /** Primary scene/topic from this lesson (if available) */
  dominantScene: string | null
  /** Recent difficulty trend from outcome (-10 to +10, 0 = neutral) */
  difficultyTrend: number
}

/** Minimal row shape from lesson_run_items */
type RunItem = {
  block_title: string
  is_correct: boolean | null
}

/** Minimal lesson metadata for scene extraction */
type LessonMeta = {
  blocks?: Array<{
    title?: string
    sceneId?: string | null
  }>
  theme?: string
}

// ── Main ──

/**
 * Compute a personalization summary from lesson outcome data.
 * Deterministic, pure, no side effects.
 */
export function computePersonalizationSummary(params: {
  items: RunItem[]
  lessonMeta: LessonMeta | null
  difficultyOutcome: DifficultyOutcome | null
}): PersonalizationSummary {
  const { items, lessonMeta, difficultyOutcome } = params

  // A. Listening score (from repeat stage results)
  const repeatItems = items.filter((i) => i.block_title === 'repeat')
  let listening = 0.5 // neutral default
  if (repeatItems.length > 0) {
    const correctCount = repeatItems.filter((i) => i.is_correct === true).length
    const failCount = repeatItems.filter((i) => i.is_correct === false).length
    if (correctCount > 0 && failCount === 0) listening = 1.0
    else if (failCount > 0 && correctCount === 0) listening = 0.3
    else if (correctCount > failCount) listening = 0.7
    else listening = 0.4
  }

  // B. Typing score (from typing stage results)
  const typingItems = items.filter((i) => i.block_title === 'typing')
  let typing = 0.5
  if (typingItems.length > 0) {
    const correct = typingItems.filter((i) => i.is_correct === true).length
    typing = Math.round((correct / typingItems.length) * 100) / 100
  }

  // C. Dominant scene (from lesson metadata)
  let dominantScene: string | null = null
  if (lessonMeta?.blocks && lessonMeta.blocks.length > 0) {
    // Use first block's sceneId if available
    const firstScene = lessonMeta.blocks.find((b) => b.sceneId)?.sceneId
    dominantScene = firstScene ?? null
  }
  if (!dominantScene && lessonMeta?.theme) {
    dominantScene = lessonMeta.theme
  }

  // D. Difficulty trend
  const difficultyTrend = difficultyOutcome?.suggestedDifficultyDelta ?? 0

  return {
    skillScores: { listening, typing },
    dominantScene,
    difficultyTrend,
  }
}
