/**
 * Strict domain types for lesson runtime state.
 * In-progress session model only; not persistence schema. No runtime logic, no DB, no UI.
 */
import type {
  ConversationTurn,
  Lesson,
  LessonId,
  PhraseId,
  ReviewItem,
  ReviewItemId,
  SceneId,
} from './lesson-types'

// ——— Runtime status ———
export const LESSON_RUNTIME_STATUSES = [
  'idle',
  'in_progress',
  'paused',
  'completed',
] as const
export type LessonRuntimeStatus = (typeof LESSON_RUNTIME_STATUSES)[number]

// ——— Current position in the lesson ———
export type LessonRuntimePointer = {
  lessonId: LessonId
  sceneId: SceneId | null
  phraseId: PhraseId | null
  turnIndex: number
  sceneIndex: number
  phraseIndex: number
}

// ——— Completion tracking ———
export type LessonRuntimeProgress = {
  completedSceneIds: SceneId[]
  completedPhraseIds: PhraseId[]
  completedReviewItemIds: ReviewItemId[]
  /** Runtime state; may be derived by runtime logic. */
  percentComplete: number
}

// ——— Full runtime state ———
export type LessonRuntimeState = {
  status: LessonRuntimeStatus
  lesson: Lesson
  pointer: LessonRuntimePointer
  /** pointer.turnIndex is the runtime source of truth for current turn position. */
  turns: ConversationTurn[]
  /** Runtime queue representation; persistence/storage shape may differ later. */
  reviewQueue: ReviewItem[]
  progress: LessonRuntimeProgress
  /** ISO datetime string. */
  startedAt: string | null
  /** ISO datetime string. */
  updatedAt: string | null
  /** ISO datetime string. */
  completedAt: string | null
}

// ——— Resume snapshot (minimum safe data to resume later) ———
export type LessonRuntimeResumeSnapshot = {
  lessonId: LessonId
  status: LessonRuntimeStatus
  pointer: LessonRuntimePointer
  progress: LessonRuntimeProgress
  /** ISO datetime string. */
  startedAt: string | null
  /** ISO datetime string. */
  updatedAt: string | null
}
