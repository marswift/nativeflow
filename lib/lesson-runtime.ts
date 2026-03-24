/**
 * Thin facade over lesson-engine, lesson-actions, lesson-stats, and lesson-summary.
 * Composes existing helpers only; does not introduce new business rules.
 * UI-independent; for use by app/lesson or other lesson consumers.
 */

import type { LessonSession } from './lesson-engine'
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
import {
  createLessonRuntimeEngineState,
  getCurrentRuntimeBlock,
  recordLessonStageAnswer,
  advanceLessonRuntimeStage,
  canAdvanceLessonRuntimeStage,
  getLessonCompletionRatio,
  buildLessonProgressPayload,
  type LessonRuntimeEngineInput,
  type LessonRuntimeEngineState,
  type LessonRuntimeBlock,
  type LessonRuntimeOverview,
  type LessonRuntimeAdvanceResult,
  type LessonAnswerKind,
  type LessonAnswerRecord,
  type LessonStageId,
} from './lesson-runtime-engine'
export type { TypingCheckResult } from './lesson-actions'
export type {
  LessonRuntimeEngineInput,
  LessonRuntimeEngineState,
  LessonRuntimeBlock,
  LessonRuntimeOverview,
  LessonRuntimeAdvanceResult,
  LessonAnswerKind,
  LessonAnswerRecord,
  LessonStageId,
} from './lesson-runtime-engine'
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

type UnknownRecord = Record<string, unknown>

function asRecord(value: unknown): UnknownRecord {
  return value as UnknownRecord
}

function readString(
  source: UnknownRecord,
  keys: string[],
  fallback = ''
): string {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'string') {
      return value
    }
  }

  return fallback
}

function readNullableString(
  source: UnknownRecord,
  keys: string[]
): string | null {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'string') {
      return value
    }
  }

  return null
}

function readNumber(
  source: UnknownRecord,
  keys: string[],
  fallback = 0
): number {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }
  }

  return fallback
}

function getSessionLessonId(session: LessonSession): string {
  const record = asRecord(session)

  const lessonId = readString(record, ['id', 'lessonId', 'sessionId'])

  if (!lessonId) {
    throw new Error(
      'LessonSession is missing a stable lesson identifier (expected id, lessonId, or sessionId).'
    )
  }

  return lessonId
}

function toRuntimeOverview(session: LessonSession): LessonRuntimeOverview {
  const record = asRecord(session)

  return {
    estimatedMinutes: readNumber(record, ['overviewEstimatedMinutes'], 0),
    stepCount: readNumber(record, ['overviewStepCount'], 0),
    flowPoint: readNumber(record, ['overviewFlowPoint'], 0),
    sceneLabel: readString(record, ['overviewSceneLabel'], ''),
    sceneDescription: readString(record, ['overviewSceneDescription'], ''),
    blockCount: readNumber(record, ['overviewBlockCount'], session.blocks.length),
  }
}

function toRuntimeBlocks(session: LessonSession): LessonRuntimeBlock[] {
  console.log(JSON.stringify(session.blocks, null, 2))
  
  return session.blocks.flatMap((block, blockIndex) =>
    block.items.map((item, itemIndex) => {
      const record = asRecord(block)
      const itemRecord = asRecord(item)

      const id =
        readString(itemRecord, ['id'], '') ||
        `${getSessionLessonId(session)}-block-${blockIndex + 1}-item-${itemIndex + 1}`

      const phraseText =
        readNullableString(itemRecord, ['answer', 'expectedAnswer', 'typingPrompt']) ??
        readString(itemRecord, ['prompt', 'phraseText', 'text', 'phrase'], '')

      return {
        id,
        order: blockIndex * 100 + itemIndex,
        phraseText,
        translation: readNullableString(record, ['translation', 'translationText']),
        sceneLabel:
          readNullableString(record, ['sceneLabel']) ??
          readNullableString(record, ['description']),
        aiQuestion: readNullableString(record, ['aiQuestion', 'question']),
        typingPrompt:
          readNullableString(itemRecord, ['answer', 'typingPrompt', 'expectedAnswer']) ??
          phraseText,
        conversationPrompt:
          readNullableString(record, ['conversationPrompt', 'conversationStarter']) ??
          readNullableString(itemRecord, ['answer']) ??
          phraseText,
      }
    })
  )
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
  throw new Error('createSession: UserProfileRow input is no longer supported. Pass a LessonSession directly.')
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
// ——— NEW RUNTIME ENGINE ———
/**
 * Creates the new sequential lesson runtime state for the fixed 5-stage flow.
 * This is the runtime used for listen → repeat → AI question → typing → AI conversation.
 */
export function createLessonRuntimeState(
  input: LessonRuntimeEngineInput
): LessonRuntimeEngineState {
  return createLessonRuntimeEngineState(input)
}

/**
 * Returns the current active lesson block in the new runtime engine.
 */
export function getCurrentLessonRuntimeBlock(
  state: LessonRuntimeEngineState
): LessonRuntimeBlock {
  return getCurrentRuntimeBlock(state)
}

/**
 * Records a user answer for the current non-listen stage.
 */
export function submitLessonStageAnswer(
  state: LessonRuntimeEngineState,
  input: {
    stageId: Exclude<LessonStageId, 'listen'>
    blockId: string
    kind: LessonAnswerKind
    value: string
    isCorrect?: boolean | null
    feedback?: string | null
  }
): LessonRuntimeEngineState {
  return recordLessonStageAnswer(state, input)
}

/**
 * Returns whether the current stage can move forward.
 */
export function canAdvanceLessonStage(
  state: LessonRuntimeEngineState
): boolean {
  return canAdvanceLessonRuntimeStage(state)
}

/**
 * Advances the runtime to the next stage, next block, or lesson completion.
 */
export function advanceLessonStage(
  state: LessonRuntimeEngineState
): LessonRuntimeAdvanceResult {
  return advanceLessonRuntimeStage(state)
}

/**
 * Returns normalized completion ratio from 0 to 1.
 */
export function getLessonRuntimeCompletionRatio(
  state: LessonRuntimeEngineState
): number {
  return getLessonCompletionRatio(state)
}

/**
 * Builds a serializable payload for persistence to Supabase.
 */
export function getLessonRuntimeProgressPayload(
  state: LessonRuntimeEngineState
) {
  return buildLessonProgressPayload(state)
}

/**
 * Converts an existing LessonSession into the new runtime engine input shape.
 * Keeps the runtime integration isolated from UI code.
 */
export function createLessonRuntimeInputFromSession(input: {
  session: LessonSession
  userId: string
  difficultyMultiplier?: number
  flowPointBase?: number
}): LessonRuntimeEngineInput {
  return {
    lessonId: getSessionLessonId(input.session),
    userId: input.userId,
    difficultyMultiplier: input.difficultyMultiplier,
    flowPointBase: input.flowPointBase,
    overview: toRuntimeOverview(input.session),
    blocks: toRuntimeBlocks(input.session),
  }
}

/**
 * Convenience helper: creates the new runtime state directly from an existing LessonSession.
 */
export function createLessonRuntimeStateFromSession(input: {
  session: LessonSession
  userId: string
  difficultyMultiplier?: number
  flowPointBase?: number
}): LessonRuntimeEngineState {
  return createLessonRuntimeEngineState(
    createLessonRuntimeInputFromSession(input)
  )
}