/**
 * Pure lesson runtime state machine for NativeFlow.
 * No I/O, no framework dependencies.
 * addConversationTurn delegates to lib/lesson/lesson-engine.
 */

import type {
  ConversationTurn,
  Lesson,
  Phrase,
  Scene,
} from '@/lib/lesson/lesson-types'
import { addTurn } from './lesson-engine'
import type {
  LessonRuntimeState as EngineState,
  LessonRuntimePointer,
  LessonRuntimeProgress,
} from './lesson-runtime-types'

// Local compatibility aliases (lesson-types exports Lesson, Scene, Phrase only)
type LessonItem = Lesson & { mascot?: string }
type SceneItem = Scene
type PhraseItem = Phrase

/** Adapter runtime state: session shape used by conversation-facade and API. */
export type LessonRuntimeStateWithLesson = {
  lessonId: string
  currentSceneId: string | null
  currentSceneIndex: number
  currentPhraseId: string | null
  turns: ConversationTurn[]
  status: 'not_started' | 'in_progress' | 'completed'
  lesson: LessonItem
  startedAt?: string
  completedAt?: string
}

/** Summary built from runtime state and lesson metadata. */
export type LessonSummary = {
  id: string
  slug: string
  title: string
  description: string
  status: LessonRuntimeStateWithLesson['status']
  mascot?: string
  sceneCount: number
}

// --- Adapter ↔ engine mapping (internal; for addConversationTurn only) ---
// pointer.turnIndex = index of current last turn (0 when empty). updatedAt from state or null.

function emptyEngineProgress(): LessonRuntimeProgress {
  return {
    completedSceneIds: [],
    completedPhraseIds: [],
    completedReviewItemIds: [],
    percentComplete: 0,
  }
}

function adapterToEngineState(state: LessonRuntimeStateWithLesson): EngineState {
  const status =
    state.status === 'not_started'
      ? 'idle'
      : state.status === 'in_progress'
        ? 'in_progress'
        : 'completed'
  const turnIndex =
    state.turns.length === 0 ? 0 : state.turns.length - 1
  const pointer: LessonRuntimePointer = {
    lessonId: state.lessonId,
    sceneId: state.currentSceneId,
    phraseId: state.currentPhraseId,
    turnIndex,
    sceneIndex: state.currentSceneIndex >= 0 ? state.currentSceneIndex : 0,
    phraseIndex: 0,
  }
  const raw = state as LessonRuntimeStateWithLesson & {
    startedAt?: string | null
    completedAt?: string | null
    updatedAt?: string | null
  }
  const updatedAt = raw.updatedAt ?? raw.startedAt ?? raw.completedAt ?? null
  return {
    status,
    lesson: state.lesson as Lesson,
    pointer,
    turns: state.turns,
    reviewQueue: [],
    progress: emptyEngineProgress(),
    startedAt: raw.startedAt ?? null,
    updatedAt,
    completedAt: raw.completedAt ?? null,
  }
}

function engineToAdapterState(
  engineState: EngineState,
  originalLesson: LessonItem
): LessonRuntimeStateWithLesson {
  const status =
    engineState.status === 'idle'
      ? 'not_started'
      : engineState.status === 'paused'
        ? 'in_progress'
        : engineState.status
  const raw = engineState as EngineState & { startedAt?: string | null; completedAt?: string | null }
  return {
    lessonId: engineState.pointer.lessonId,
    currentSceneId: engineState.pointer.sceneId,
    currentSceneIndex: engineState.pointer.sceneIndex,
    currentPhraseId: engineState.pointer.phraseId,
    turns: engineState.turns,
    status,
    lesson: originalLesson,
    ...(raw.startedAt != null && { startedAt: raw.startedAt }),
    ...(raw.completedAt != null && { completedAt: raw.completedAt }),
  }
}

// --- Private helpers ---

function getSceneByIndex(lesson: LessonItem, index: number): SceneItem | null {
  if (index < 0 || index >= lesson.scenes.length) return null
  return lesson.scenes[index]
}

function getPhraseByIndex(
  scene: SceneItem,
  index: number
): PhraseItem | null {
  if (index < 0 || index >= scene.phrases.length) return null
  return scene.phrases[index]
}

function isScenePlayable(scene: SceneItem): boolean {
  return scene.phrases.length > 0
}

function findNextPlayableSceneIndex(
  lesson: LessonItem,
  startIndex: number
): number | null {
  const safeStartIndex = Math.max(0, startIndex)
  for (let i = safeStartIndex; i < lesson.scenes.length; i++) {
    if (isScenePlayable(lesson.scenes[i])) return i
  }
  return null
}

function getPhraseIndexInScene(scene: SceneItem, phraseId: string | null): number {
  if (phraseId === null) return -1
  const idx = scene.phrases.findIndex((p) => p.id === phraseId)
  return idx >= 0 ? idx : -1
}

function isInProgressPositionValid(state: LessonRuntimeStateWithLesson): boolean {
  const scene = getSceneByIndex(state.lesson, state.currentSceneIndex)
  if (!scene || !isScenePlayable(scene)) return false
  return getPhraseIndexInScene(scene, state.currentPhraseId) !== -1
}

function buildSceneEntryState(
  state: LessonRuntimeStateWithLesson,
  sceneIndex: number
): LessonRuntimeStateWithLesson | null {
  const scene = getSceneByIndex(state.lesson, sceneIndex)
  if (!scene || !isScenePlayable(scene)) return null
  return {
    ...state,
    currentSceneIndex: sceneIndex,
    currentSceneId: scene.id,
    currentPhraseId: scene.phrases[0].id,
  }
}

/** Tries to recover in_progress state by moving to the next playable scene from currentSceneIndex. Returns null if none. */
function tryRecoverFromCurrentPosition(
  state: LessonRuntimeStateWithLesson
): LessonRuntimeStateWithLesson | null {
  const next = findNextPlayableSceneIndex(state.lesson, state.currentSceneIndex)
  if (next === null) return null
  return buildSceneEntryState(state, next)
}

// --- Exported API ---

/** Creates initial not-started state for a lesson. No scene or phrase is selected. */
export function createLessonRuntimeState(lesson: LessonItem): LessonRuntimeStateWithLesson {
  return {
    lessonId: lesson.id,
    currentSceneId: null,
    currentSceneIndex: -1,
    currentPhraseId: null,
    turns: [], // lesson-session conversation history
    status: 'not_started',
    lesson,
  }
}

/** Starts or recovers the lesson: valid in_progress unchanged; invalid in_progress recovered from current index then first playable; not_started from first playable. Optional startedAt stored when transitioning to in_progress. */
export function startLesson(
  state: LessonRuntimeStateWithLesson,
  startedAt?: string
): LessonRuntimeStateWithLesson {
  if (state.status === 'completed') return state
  if (state.status === 'in_progress' && isInProgressPositionValid(state)) {
    return state
  }
  if (state.status === 'in_progress') {
    const recovered = tryRecoverFromCurrentPosition(state)
    if (recovered) {
      return {
        ...recovered,
        status: 'in_progress',
        startedAt: state.startedAt ?? startedAt,
      }
    }
  }
  const firstPlayable = findNextPlayableSceneIndex(state.lesson, 0)
  if (firstPlayable === null) return completeLesson(state)
  const entry = buildSceneEntryState(state, firstPlayable)
  if (!entry) return completeLesson(state)
  return {
    ...entry,
    status: 'in_progress',
    startedAt: state.startedAt ?? startedAt,
  }
}

/** Returns the scene at the current position, or null if completed or index invalid. */
export function getCurrentScene(
  state: LessonRuntimeStateWithLesson
): SceneItem | null {
  if (state.status === 'completed') return null
  return getSceneByIndex(state.lesson, state.currentSceneIndex)
}

/** Returns the phrase at the current position, or null if none. */
export function getCurrentPhrase(
  state: LessonRuntimeStateWithLesson
): PhraseItem | null {
  if (state.status === 'completed') return null
  const scene = getCurrentScene(state)
  if (!scene || scene.phrases.length === 0) return null
  const phraseIdx = getPhraseIndexInScene(scene, state.currentPhraseId)
  if (phraseIdx === -1) return null
  return getPhraseByIndex(scene, phraseIdx)
}

/** Appends a conversation turn. No-op if lesson is completed. Delegates to lesson-engine addTurn. */
export function addConversationTurn(
  state: LessonRuntimeStateWithLesson,
  turn: ConversationTurn
): LessonRuntimeStateWithLesson {
  if (state.status === 'completed') return state
  const engineState = adapterToEngineState(state)
  const result = addTurn({ state: engineState, turn })
  if ('error' in result) return state
  return engineToAdapterState(result.state, state.lesson)
}

/** Advances to the next phrase in the current scene, or the first phrase of the next playable scene, or completes the lesson. Current scene missing is treated as advance (search from currentSceneIndex + 1). */
export function advancePhrase(
  state: LessonRuntimeStateWithLesson,
  completedAt?: string
): LessonRuntimeStateWithLesson {
  if (state.status === 'completed') return state
  const scene = getSceneByIndex(state.lesson, state.currentSceneIndex)

  if (!scene) {
    const next = findNextPlayableSceneIndex(
      state.lesson,
      state.currentSceneIndex + 1
    )
    if (next === null) return completeLesson(state, completedAt)
    const entry = buildSceneEntryState(state, next)
    return entry ?? completeLesson(state, completedAt)
  }

  if (!isScenePlayable(scene)) {
    const next = findNextPlayableSceneIndex(
      state.lesson,
      state.currentSceneIndex + 1
    )
    if (next === null) return completeLesson(state, completedAt)
    const entry = buildSceneEntryState(state, next)
    return entry ?? completeLesson(state, completedAt)
  }

  const phraseIdx = getPhraseIndexInScene(scene, state.currentPhraseId)
  if (phraseIdx === -1) {
    const entry = buildSceneEntryState(state, state.currentSceneIndex)
    return entry ?? state
  }

  if (phraseIdx + 1 < scene.phrases.length) {
    return {
      ...state,
      currentPhraseId: scene.phrases[phraseIdx + 1].id,
    }
  }

  return advanceScene(state, completedAt)
}

/** Advances to the first phrase of the next playable scene, or completes the lesson. */
export function advanceScene(
  state: LessonRuntimeStateWithLesson,
  completedAt?: string
): LessonRuntimeStateWithLesson {
  if (state.status === 'completed') return state
  const next = findNextPlayableSceneIndex(
    state.lesson,
    state.currentSceneIndex + 1
  )
  if (next === null) return completeLesson(state, completedAt)
  const entry = buildSceneEntryState(state, next)
  return entry ?? completeLesson(state, completedAt)
}

/** Marks the lesson completed and clears scene/phrase position. Optional completedAt stored when provided. */
export function completeLesson(
  state: LessonRuntimeStateWithLesson,
  completedAt?: string
): LessonRuntimeStateWithLesson {
  if (state.status === 'completed') return state
  return {
    ...state,
    status: 'completed',
    currentSceneId: null,
    currentSceneIndex: -1,
    currentPhraseId: null,
    completedAt: state.completedAt ?? completedAt,
  }
}

/** True when status is completed. */
export function isLessonComplete(
  state: LessonRuntimeStateWithLesson
): boolean {
  return state.status === 'completed'
}

/** Builds a LessonSummary from current state and lesson metadata. */
export function buildLessonSummary(
  state: LessonRuntimeStateWithLesson
): LessonSummary {
  const { lesson } = state
  return {
    id: lesson.id,
    slug: lesson.slug,
    title: lesson.title,
    description: lesson.description,
    status: state.status,
    mascot: lesson.mascot,
    sceneCount: lesson.scenes.length,
  }
}