/**
 * Thin conversation orchestration layer for NativeFlow.
 * Delegates to lesson-runtime; no DB, UI, or AI logic.
 */

import type { ConversationTurn, Lesson } from '@/lib/lesson/lesson-types'
import type { LessonRuntimeStateWithLesson } from '@/lib/lesson/lesson-runtime'
import {
  addConversationTurn,
  advancePhrase,
  advanceScene,
  buildLessonSummary,
  completeLesson,
  createLessonRuntimeState,
  getCurrentPhrase,
  getCurrentScene,
  isLessonComplete,
  startLesson,
} from '@/lib/lesson/lesson-runtime'

export type { LessonRuntimeStateWithLesson }

/** Current scene from runtime, or null if none. */
export type CurrentScene = ReturnType<typeof getCurrentScene>
/** Current phrase from runtime, or null if none. */
export type CurrentPhrase = ReturnType<typeof getCurrentPhrase>
/** Summary built from runtime state and lesson metadata. */
export type ConversationLessonSummary = ReturnType<typeof buildLessonSummary>

export type ConversationSnapshot = {
  status: LessonRuntimeStateWithLesson['status']
  scene: CurrentScene
  phrase: CurrentPhrase
  turns: ConversationTurn[]
  isCompleted: boolean
}

type LessonForRuntime = Parameters<typeof createLessonRuntimeState>[0]

export function createConversationSession(
  lesson: Lesson
): LessonRuntimeStateWithLesson {
  return createLessonRuntimeState(lesson as LessonForRuntime)
}

export function startConversationSession(
  state: LessonRuntimeStateWithLesson,
  startedAt?: string
): LessonRuntimeStateWithLesson {
  return startLesson(state, startedAt)
}

export function getConversationScene(
  state: LessonRuntimeStateWithLesson
): CurrentScene {
  return getCurrentScene(state)
}

export function getConversationPhrase(
  state: LessonRuntimeStateWithLesson
): CurrentPhrase {
  return getCurrentPhrase(state)
}

export function appendConversationTurn(
  state: LessonRuntimeStateWithLesson,
  turn: ConversationTurn
): LessonRuntimeStateWithLesson {
  return addConversationTurn(state, turn)
}

export function advanceConversationPhrase(
  state: LessonRuntimeStateWithLesson,
  completedAt?: string
): LessonRuntimeStateWithLesson {
  return advancePhrase(state, completedAt)
}

export function advanceConversationScene(
  state: LessonRuntimeStateWithLesson,
  completedAt?: string
): LessonRuntimeStateWithLesson {
  return advanceScene(state, completedAt)
}

export function completeConversationSession(
  state: LessonRuntimeStateWithLesson,
  completedAt?: string
): LessonRuntimeStateWithLesson {
  return completeLesson(state, completedAt)
}

export function isConversationFinished(
  state: LessonRuntimeStateWithLesson
): boolean {
  return isLessonComplete(state)
}

export function getConversationSummary(
  state: LessonRuntimeStateWithLesson
): ConversationLessonSummary {
  return buildLessonSummary(state)
}

export function getConversationSnapshot(
  state: LessonRuntimeStateWithLesson
): ConversationSnapshot {
  return {
    status: state.status,
    scene: getConversationScene(state),
    phrase: getConversationPhrase(state),
    turns: state.turns,
    isCompleted: isConversationFinished(state),
  }
}

/** Append turn and optionally advance. When both flags are true, advanceScene takes priority over advancePhrase. */
export function submitConversationTurn(
  state: LessonRuntimeStateWithLesson,
  turn: ConversationTurn,
  options?: {
    advancePhrase?: boolean
    advanceScene?: boolean
    completedAt?: string
  }
): LessonRuntimeStateWithLesson {
  let next = appendConversationTurn(state, turn)
  if (options?.advanceScene === true) {
    next = advanceConversationScene(next, options?.completedAt)
  } else if (options?.advancePhrase === true) {
    next = advanceConversationPhrase(next, options?.completedAt)
  }
  return next
}

export function bootstrapConversationSession(
  lesson: Lesson,
  startedAt?: string
): LessonRuntimeStateWithLesson {
  const session = createConversationSession(lesson)
  return startConversationSession(session, startedAt)
}
