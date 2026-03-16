/**
 * Thin facade over lesson-engine, lesson-actions, lesson-stats, and lesson-summary.
 * Composes existing helpers only; does not introduce new business rules.
 * UI-independent; for use by app/lesson or other lesson consumers.
 */

import type { LessonSession } from './lesson-engine'
import { generateLessonSession } from './lesson-engine'
import type { LessonProgressState } from './lesson-progress'
import {
  getLessonRunInitialState,
  checkTypingAnswer as checkTypingAnswerAction,
  getNextStep,
  type TypingCheckResult,
} from './lesson-actions'
import {
  getLessonStats as getLessonStatsFromModule,
  type LessonStats,
  type GetLessonStatsOptions,
} from './lesson-stats'
import {
  buildLessonCompletionSummary as buildLessonCompletionSummaryFromModule,
  type LessonCompletionSummary,
} from './lesson-summary'
import type { UserProfileRow } from './types'

export type { TypingCheckResult } from './lesson-actions'

/** Mutable fields for a lesson run (progress, input, typing correct count). */
export type LessonRunStateFields = {
  progress: LessonProgressState
  inputValue: string
  correctTypingCount: number
}

/**
 * Full state for an in-progress lesson run: session plus mutable fields.
 */
export type LessonRunState = {
  session: LessonSession
} & LessonRunStateFields

/** Result of advancing one step: new progress and reset input value. */
export type AdvanceRunStateResult = {
  nextProgress: LessonProgressState
  inputValue: string
}

function isSessionObject(
  input: UserProfileRow | LessonSession
): input is LessonSession {
  const s = input as LessonSession
  return Array.isArray(s.blocks) && typeof s.theme === 'string'
}

// ——— SESSION ———
// Boundary: accepts UserProfileRow (generate session) or prebuilt LessonSession (draft-based).
/**
 * Creates a lesson session from a user profile or returns an already-built session.
 * If input is a LessonSession (e.g. mapped draft), returns it as-is.
 * Otherwise delegates to lesson-engine mock generation.
 */
export function createSession(
  input: UserProfileRow | LessonSession
): LessonSession {
  if (isSessionObject(input)) return input
  return generateLessonSession(input)
}

// ——— RUN STATE ———
/**
 * Returns the initial mutable run state (progress, inputValue, correctTypingCount).
 * Combine with a session for full LessonRunState.
 * Facade: delegates to lesson-actions; no new logic.
 */
export function getInitialRunState(): LessonRunStateFields {
  return getLessonRunInitialState()
}

/**
 * Returns the next progress and reset input after advancing one step.
 * Facade: delegates to lesson-actions; no new logic.
 */
export function advanceRunState(
  session: LessonSession,
  progress: LessonProgressState
): AdvanceRunStateResult {
  return getNextStep(session, progress)
}

// ——— EVALUATION ———
/**
 * Evaluates a typing answer; returns isCorrect and delta for correct count.
 * Facade: delegates to lesson-actions (which uses lesson-evaluation); no new logic.
 */
export function checkTypingAnswer(
  userInput: string,
  correctAnswer: string
): TypingCheckResult {
  return checkTypingAnswerAction(userInput, correctAnswer)
}

// ——— STATS ———
/**
 * Computes lesson stats for the current session and progress.
 * Facade: delegates to lesson-stats; no new logic.
 */
export function getStats(
  session: LessonSession,
  progress: LessonProgressState,
  options?: GetLessonStatsOptions
): LessonStats {
  return getLessonStatsFromModule(session, progress, options)
}

// ——— SUMMARY ———
/**
 * Builds a completion summary from session and stats.
 * Facade: delegates to lesson-summary; no new logic.
 */
export function getCompletionSummary(
  session: LessonSession,
  stats: LessonStats
): LessonCompletionSummary {
  return buildLessonCompletionSummaryFromModule(session, stats)
}
