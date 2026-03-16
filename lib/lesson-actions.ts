import type { LessonSession } from './lesson-engine'
import {
  getInitialProgress,
  advanceProgress,
  type LessonProgressState,
} from './lesson-progress'
import { evaluateTypingAnswer } from './lesson-evaluation'

/** Initial state for a lesson run. Use when starting a lesson. */
export type LessonRunInitialState = {
  progress: LessonProgressState
  inputValue: string
  correctTypingCount: number
}

/** Result of checking a typing answer. correctTypingDelta is 0 or 1 for cumulative count. */
export type TypingCheckResult = {
  isCorrect: boolean
  correctTypingDelta: 0 | 1
}

/** Result of moving to the next step. inputValue should replace current input. */
export type NextStepResult = {
  nextProgress: LessonProgressState
  inputValue: string
}

function isEmptyAnswer(answer: string): boolean {
  return answer.trim() === ''
}

// ——— INITIAL STATE ———
/**
 * Returns the initial state for a lesson run.
 * Use when the user starts a lesson; apply progress, inputValue, and correctTypingCount to state.
 */
export function getLessonRunInitialState(): LessonRunInitialState {
  return {
    progress: getInitialProgress(),
    inputValue: '',
    correctTypingCount: 0,
  }
}

// ——— TYPING EVALUATION ———
/**
 * Evaluates a typing answer and returns whether it is correct and the delta for correct count.
 * Uses lesson-evaluation. correctTypingDelta assumes the caller invokes this only once per item,
 * so adding the delta to a cumulative count remains correct (0 when wrong, 1 when right).
 * If correctAnswer is empty or whitespace-only, returns isCorrect: false and correctTypingDelta: 0.
 */
export function checkTypingAnswer(
  userInput: string,
  correctAnswer: string
): TypingCheckResult {
  if (isEmptyAnswer(correctAnswer)) {
    return { isCorrect: false, correctTypingDelta: 0 }
  }
  const result = evaluateTypingAnswer(userInput, correctAnswer)
  return {
    isCorrect: result.isCorrect,
    correctTypingDelta: result.isCorrect ? 1 : 0,
  }
}

// ——— STEP ADVANCE ———
/**
 * Returns the next progress and reset input value after advancing one step.
 * Use when the user moves to the next item/block; apply nextProgress and inputValue to state.
 * Invalid progress (e.g. out-of-range indexes) is handled by lesson-progress advanceProgress
 * safe fallback behavior (e.g. completed: true).
 */
export function getNextStep(
  session: LessonSession,
  progress: LessonProgressState
): NextStepResult {
  return {
    nextProgress: advanceProgress(session, progress),
    inputValue: '',
  }
}
