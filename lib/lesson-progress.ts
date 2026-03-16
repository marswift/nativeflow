import type { LessonSession } from './lesson-engine'

/**
 * Progress state for a lesson session.
 * Tracks position (block/item), completion, and per-item typing state (checked, isCorrect).
 */
export type LessonProgressState = {
  currentBlockIndex: number
  currentItemIndex: number
  completed: boolean
  checked: boolean
  isCorrect: boolean | null
}

function isInvalidPosition(
  session: LessonSession,
  progress: LessonProgressState
): boolean {
  const totalBlocks = session.blocks.length
  if (totalBlocks === 0) return true
  if (progress.currentBlockIndex < 0 || progress.currentBlockIndex >= totalBlocks) {
    return true
  }
  const block = session.blocks[progress.currentBlockIndex]
  if (progress.currentItemIndex < 0 || progress.currentItemIndex >= block.items.length) {
    return true
  }
  return false
}

/** Initial progress: first block, first item, not completed, not checked. */
export function getInitialProgress(): LessonProgressState {
  return {
    currentBlockIndex: 0,
    currentItemIndex: 0,
    completed: false,
    checked: false,
    isCorrect: null,
  }
}

/**
 * Returns true if the current item is the last item of the last block.
 * Safe fallback: if session has no blocks or progress indexes are out of range,
 * returns true so the lesson is treated as at end.
 */
export function isFinalItem(
  session: LessonSession,
  progress: LessonProgressState
): boolean {
  if (isInvalidPosition(session, progress)) return true
  const totalBlocks = session.blocks.length
  const block = session.blocks[progress.currentBlockIndex]
  return (
    progress.currentBlockIndex === totalBlocks - 1 &&
    progress.currentItemIndex === block.items.length - 1
  )
}

/**
 * Returns the next progress state (next item, or next block's first item, or completed).
 * Resets checked and isCorrect for the new item.
 * Safe fallback: if session has no blocks or progress indexes are out of range,
 * returns a completed state so the UI does not render an invalid block/item.
 */
export function advanceProgress(
  session: LessonSession,
  progress: LessonProgressState
): LessonProgressState {
  if (isInvalidPosition(session, progress)) {
    return { ...progress, completed: true, checked: false, isCorrect: null }
  }

  const totalBlocks = session.blocks.length
  const block = session.blocks[progress.currentBlockIndex]
  const isLastItem = progress.currentItemIndex === block.items.length - 1
  const isLastBlock = progress.currentBlockIndex === totalBlocks - 1

  if (isLastBlock && isLastItem) {
    return {
      ...progress,
      completed: true,
      checked: false,
      isCorrect: null,
    }
  }

  if (isLastItem) {
    return {
      currentBlockIndex: progress.currentBlockIndex + 1,
      currentItemIndex: 0,
      completed: false,
      checked: false,
      isCorrect: null,
    }
  }

  return {
    ...progress,
    currentItemIndex: progress.currentItemIndex + 1,
    checked: false,
    isCorrect: null,
  }
}
