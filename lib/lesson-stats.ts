import type { LessonSession } from './lesson-engine'
import type { LessonProgressState } from './lesson-progress'

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max))
}

function getProgressPercent(completedItems: number, totalItems: number): number {
  return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0
}

export type LessonStats = {
  totalBlocks: number
  totalItems: number
  completedItems: number
  progressPercent: number
  totalTypingItems: number
  correctTypingItems: number
}

/**
 * Returns the total number of items across all blocks.
 */
export function getTotalItemCount(session: LessonSession): number {
  return session.blocks.reduce((sum, block) => sum + block.items.length, 0)
}

/**
 * Returns how many items have been completed (passed through) given current progress.
 * When completed is true or indexes are out of range, returns totalItems (safe fallback).
 * Otherwise counts items in blocks before current plus currentItemIndex in the current block.
 * Result is clamped to [0, totalItems] so completedItems never exceeds totalItems or goes below 0.
 */
export function getCompletedItemCount(
  session: LessonSession,
  progress: LessonProgressState
): number {
  const totalItems = getTotalItemCount(session)
  if (session.blocks.length === 0) return 0
  if (progress.completed) return totalItems
  if (progress.currentBlockIndex < 0 || progress.currentBlockIndex >= session.blocks.length) {
    return totalItems
  }
  let completed = 0
  for (let i = 0; i < progress.currentBlockIndex; i++) {
    completed += session.blocks[i].items.length
  }
  const currentBlock = session.blocks[progress.currentBlockIndex]
  completed += Math.min(progress.currentItemIndex, currentBlock.items.length)
  return clamp(completed, 0, totalItems)
}

/**
 * Returns the total number of items that belong to typing blocks.
 */
export function getTotalTypingItemCount(session: LessonSession): number {
  return session.blocks.reduce(
    (sum, block) => (block.type === 'typing' ? sum + block.items.length : sum),
    0
  )
}

export type GetLessonStatsOptions = {
  /** Number of typing items answered correctly so far. Caller may accumulate this. */
  correctTypingItems?: number
}

/**
 * Returns a full stats object for the lesson given session, progress, and optional correct count.
 * progressPercent is 0–100. correctTypingItems defaults to 0 when not provided.
 * correctTypingItems is clamped: negative values become 0; values greater than totalTypingItems
 * are clamped to totalTypingItems (safe fallback for invalid caller input).
 */
export function getLessonStats(
  session: LessonSession,
  progress: LessonProgressState,
  options?: GetLessonStatsOptions
): LessonStats {
  const totalBlocks = session.blocks.length
  const totalItems = getTotalItemCount(session)
  const completedItems = getCompletedItemCount(session, progress)
  const progressPercent = getProgressPercent(completedItems, totalItems)
  const totalTypingItems = getTotalTypingItemCount(session)
  const rawCorrect = options?.correctTypingItems ?? 0
  const correctTypingItems = clamp(rawCorrect, 0, totalTypingItems)

  return {
    totalBlocks,
    totalItems,
    completedItems,
    progressPercent,
    totalTypingItems,
    correctTypingItems,
  }
}
