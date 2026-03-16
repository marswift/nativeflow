/**
 * Executes one "next" step in a lesson run: persist item, update stats, increment daily stats,
 * and return the next progress and input value.
 * Used by app/lesson/page.tsx handleNext; keeps page thin.
 * No React; orchestrates lesson-run-service and lesson-runtime.
 */
import type { LessonSession, LessonBlock, LessonBlockItem } from './lesson-engine'
import type { LessonProgressState } from './lesson-progress'
import { advanceRunState, getStats } from './lesson-runtime'
import {
  saveLessonRunItem,
  updateLessonRunStats,
  type SaveLessonRunItemInput,
} from './lesson-run-service'
import { incrementDailyStats } from './daily-stats-service'

export type ExecuteNextStepInput = {
  lesson: LessonSession
  block: LessonBlock
  item: LessonBlockItem
  progress: LessonProgressState
  inputValue: string
  lessonRunId: string | null
  userId: string | null
  correctTypingCount: number
}

export type ExecuteNextStepResult = {
  nextProgress: LessonProgressState
  nextInputValue: string
}

/**
 * Saves current item (if lessonRunId/userId), updates run stats, increments daily stats,
 * then returns the next progress and input value from advanceRunState.
 * Async side effects are fired; return value is synchronous from advanceRunState.
 */
export function executeNextStep(input: ExecuteNextStepInput): ExecuteNextStepResult {
  const { lesson, block, item, progress, inputValue, lessonRunId, userId, correctTypingCount } = input
  const isTyping = block.type === 'typing'
  const now = new Date().toISOString()

  if (lessonRunId && userId) {
    const saveInput: SaveLessonRunItemInput = {
      lesson_run_id: lessonRunId,
      user_id: userId,
      block,
      item,
      block_index: progress.currentBlockIndex,
      item_index: progress.currentItemIndex,
      user_input_text: isTyping ? inputValue : null,
      was_checked: isTyping && progress.checked,
      is_correct: isTyping ? progress.isCorrect : null,
      completed_at: now,
    }
    saveLessonRunItem(saveInput).then((result) => {
      if (result.error) console.error('Lesson run item save failed', result.error)
    })
  }

  const { nextProgress, inputValue: nextInput } = advanceRunState(lesson, progress)

  if (lessonRunId) {
    const stats = getStats(lesson, nextProgress, { correctTypingItems: correctTypingCount })
    updateLessonRunStats(lessonRunId, stats).then((result) => {
      if (result.error) console.error('Lesson run progress update failed', result.error)
    })
  }

  if (userId && block && item) {
    const increments: { lesson_items_completed: number; typing_items_correct?: number } = {
      lesson_items_completed: 1,
    }
    if (block.type === 'typing' && progress.isCorrect) increments.typing_items_correct = 1
    incrementDailyStats(userId, increments).then((result) => {
      if (result.error) console.error('Daily stats update failed', result.error)
    })
  }

  return { nextProgress, nextInputValue: nextInput }
}
