/**
 * Lesson engine contract: input/output types for engine operations.
 * Contract surface only; not implementation. No runtime logic, no DB, no UI.
 */
import type {
  ConversationTurn,
  Lesson,
  PhraseId,
  ReviewItem,
  SceneId,
} from './lesson-types'
import type {
  LessonRuntimeResumeSnapshot,
  LessonRuntimeState,
} from './lesson-runtime-types'

// ——— Engine action catalog ———
export const LESSON_ENGINE_ACTIONS = [
  'start_lesson',
  'resume_lesson',
  'advance_scene',
  'advance_phrase',
  'add_turn',
  'queue_review',
  'complete_lesson',
  'pause_lesson',
] as const
export type LessonEngineAction = (typeof LESSON_ENGINE_ACTIONS)[number]

// ——— Start ———
export type LessonEngineStartInput = {
  lesson: Lesson
  /** ISO datetime string. */
  startedAt?: string
  initialSceneId?: SceneId
  initialPhraseId?: PhraseId
}

// ——— Resume ———
export type LessonEngineResumeInput = {
  lesson: Lesson
  snapshot: LessonRuntimeResumeSnapshot
}

// ——— Add turn ———
export type LessonEngineAddTurnInput = {
  state: LessonRuntimeState
  turn: ConversationTurn
  /** ISO datetime string. */
  timestamp?: string
}

// ——— Advance scene / phrase ———
export type LessonEngineAdvanceSceneInput = {
  state: LessonRuntimeState
  /** ISO datetime string. */
  timestamp?: string
}

export type LessonEngineAdvancePhraseInput = {
  state: LessonRuntimeState
  /** ISO datetime string. */
  timestamp?: string
}

// ——— Queue review ———
export type LessonEngineQueueReviewInput = {
  state: LessonRuntimeState
  item: ReviewItem
  /** ISO datetime string. */
  timestamp?: string
}

// ——— Pause / complete ———
export type LessonEnginePauseLessonInput = {
  state: LessonRuntimeState
  /** ISO datetime string. */
  timestamp?: string
}

export type LessonEngineCompleteLessonInput = {
  state: LessonRuntimeState
  /** ISO datetime string. */
  timestamp?: string
}

// ——— Result meta (runtime orchestration / debug friendliness) ———
export type LessonEngineResultMeta = {
  action: LessonEngineAction
  /** ISO datetime string. */
  timestamp: string
  changed: boolean
}

export type LessonEngineResult = {
  state: LessonRuntimeState
  meta: LessonEngineResultMeta
}

export type LessonEngineSuccessResult = LessonEngineResult

export type LessonEngineFailureResult = {
  error: LessonEngineError
  meta: LessonEngineResultMeta
}

/** Future-safe engine return union. */
export type LessonEngineOperationResult =
  | LessonEngineSuccessResult
  | LessonEngineFailureResult

// ——— Error shape (for future use) ———
export type LessonEngineErrorCode =
  | 'invalid_input'
  | 'invalid_state'
  | 'invalid_transition'
  | 'lesson_not_found'
  | 'scene_not_found'
  | 'phrase_not_found'
  | 'resume_failed'

export type LessonEngineError = {
  code: LessonEngineErrorCode
  message: string
}
