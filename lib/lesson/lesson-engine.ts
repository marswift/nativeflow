/**
 * Lesson engine: pure-function implementation of start/resume/pause/complete/advance/addTurn/queueReview.
 * No DB, no UI, no API. Uses contract types from lesson-engine-types.
 */
import type { Lesson, Phrase, PhraseId, Scene, SceneId } from './lesson-types'
import type {
  LessonRuntimePointer,
  LessonRuntimeProgress,
  LessonRuntimeState,
} from './lesson-runtime-types'
import type {
  LessonEngineAddTurnInput,
  LessonEngineAdvancePhraseInput,
  LessonEngineAdvanceSceneInput,
  LessonEngineCompleteLessonInput,
  LessonEngineError,
  LessonEngineFailureResult,
  LessonEngineOperationResult,
  LessonEnginePauseLessonInput,
  LessonEngineQueueReviewInput,
  LessonEngineResumeInput,
  LessonEngineStartInput,
  LessonEngineSuccessResult,
} from './lesson-engine-types'

function now(): string {
  return new Date().toISOString()
}

function scenesByOrder(lesson: Lesson): Scene[] {
  return [...lesson.scenes].sort((a, b) => a.order - b.order)
}

function phrasesByOrder(scene: Scene): Phrase[] {
  return [...scene.phrases].sort((a, b) => a.order - b.order)
}

function resolveInitialScene(
  lesson: Lesson,
  initialSceneId?: SceneId
): { scene: Scene; sceneIndex: number } | null {
  const sorted = scenesByOrder(lesson)
  if (initialSceneId) {
    const i = sorted.findIndex((s) => s.id === initialSceneId)
    if (i >= 0) return { scene: sorted[i], sceneIndex: i }
  }
  if (sorted.length === 0) return null
  return { scene: sorted[0], sceneIndex: 0 }
}

function resolveInitialPhrase(
  scene: Scene,
  initialPhraseId?: PhraseId
): { phrase: Phrase; phraseIndex: number } | null {
  const sorted = phrasesByOrder(scene)
  if (initialPhraseId) {
    const i = sorted.findIndex((p) => p.id === initialPhraseId)
    if (i >= 0) return { phrase: sorted[i], phraseIndex: i }
  }
  if (sorted.length === 0) return null
  return { phrase: sorted[0], phraseIndex: 0 }
}

function resolveCurrentScene(
  state: LessonRuntimeState
): { scene: Scene; sceneIndex: number } | null {
  const sceneId = state.pointer.sceneId
  if (sceneId == null) return null
  const sorted = scenesByOrder(state.lesson)
  const i = sorted.findIndex((s) => s.id === sceneId)
  if (i < 0) return null
  return { scene: sorted[i], sceneIndex: i }
}

function resolveNextScene(
  lesson: Lesson,
  currentSceneIndex: number
): { scene: Scene; sceneIndex: number } | null {
  const sorted = scenesByOrder(lesson)
  const nextIndex = currentSceneIndex + 1
  if (nextIndex >= sorted.length) return null
  return { scene: sorted[nextIndex], sceneIndex: nextIndex }
}

function resolveCurrentPhrase(
  scene: Scene,
  phraseId: PhraseId | null
): { phrase: Phrase; phraseIndex: number } | null {
  if (phraseId == null) return null
  const sorted = phrasesByOrder(scene)
  const i = sorted.findIndex((p) => p.id === phraseId)
  if (i < 0) return null
  return { phrase: sorted[i], phraseIndex: i }
}

function fail(
  code: LessonEngineError['code'],
  message: string,
  action: LessonEngineSuccessResult['meta']['action'],
  timestamp: string
): LessonEngineFailureResult {
  return {
    error: { code, message },
    meta: { action, timestamp, changed: false },
  }
}

function success(
  state: LessonRuntimeState,
  action: LessonEngineSuccessResult['meta']['action'],
  timestamp: string,
  changed: boolean
): LessonEngineSuccessResult {
  return {
    state,
    meta: { action, timestamp, changed },
  }
}

function emptyProgress(): LessonRuntimeProgress {
  return {
    completedSceneIds: [],
    completedPhraseIds: [],
    completedReviewItemIds: [],
    percentComplete: 0,
  }
}

/** Start a new lesson session. */
export function startLesson(
  input: LessonEngineStartInput
): LessonEngineOperationResult {
  const timestamp = input.startedAt ?? now()
  const resolved = resolveInitialScene(input.lesson, input.initialSceneId)
  if (!resolved) {
    return fail(
      'scene_not_found',
      'No valid initial scene',
      'start_lesson',
      timestamp
    )
  }
  const { scene, sceneIndex } = resolved
  const phraseResolved = resolveInitialPhrase(scene, input.initialPhraseId)
  const phraseId = phraseResolved ? phraseResolved.phrase.id : null
  const phraseIndex = phraseResolved ? phraseResolved.phraseIndex : 0

  const pointer: LessonRuntimePointer = {
    lessonId: input.lesson.id,
    sceneId: scene.id,
    phraseId,
    turnIndex: 0,
    sceneIndex,
    phraseIndex,
  }

  const state: LessonRuntimeState = {
    status: 'in_progress',
    lesson: input.lesson,
    pointer,
    turns: [],
    reviewQueue: [],
    progress: emptyProgress(),
    startedAt: timestamp,
    updatedAt: timestamp,
    completedAt: null,
  }

  return success(state, 'start_lesson', timestamp, true)
}

/** Resume from a snapshot; turns/reviewQueue are not persisted in snapshot. */
export function resumeLesson(
  input: LessonEngineResumeInput
): LessonEngineOperationResult {
  const { lesson, snapshot } = input
  const tsNow = now()
  if (snapshot.lessonId !== lesson.id) {
    return fail(
      'resume_failed',
      'Snapshot lessonId does not match lesson',
      'resume_lesson',
      tsNow
    )
  }
  if (snapshot.pointer.lessonId !== lesson.id) {
    return fail(
      'resume_failed',
      'Snapshot pointer lessonId does not match lesson',
      'resume_lesson',
      tsNow
    )
  }

  const ts = snapshot.updatedAt ?? tsNow
  const completedAt = snapshot.status === 'completed' ? ts : null

  const state: LessonRuntimeState = {
    status: snapshot.status,
    lesson,
    pointer: snapshot.pointer,
    turns: [],
    reviewQueue: [],
    progress: snapshot.progress,
    startedAt: snapshot.startedAt,
    updatedAt: ts,
    completedAt,
  }

  return success(state, 'resume_lesson', ts, true)
}

/** Pause; allowed only from in_progress or paused. */
export function pauseLesson(
  input: LessonEnginePauseLessonInput
): LessonEngineOperationResult {
  const { state } = input
  const ts = input.timestamp ?? now()
  if (state.status === 'completed') {
    return fail(
      'invalid_transition',
      'Cannot pause completed lesson',
      'pause_lesson',
      ts
    )
  }
  if (state.status === 'idle') {
    return fail(
      'invalid_transition',
      'Cannot pause idle lesson',
      'pause_lesson',
      ts
    )
  }

  const changed = state.status !== 'paused' || state.updatedAt !== ts
  const newState: LessonRuntimeState = {
    ...state,
    status: 'paused',
    updatedAt: ts,
  }

  return success(newState, 'pause_lesson', ts, changed)
}

/** Complete; allowed from in_progress, paused, or completed. */
export function completeLesson(
  input: LessonEngineCompleteLessonInput
): LessonEngineOperationResult {
  const { state } = input
  const ts = input.timestamp ?? now()
  if (state.status === 'idle') {
    return fail(
      'invalid_transition',
      'Cannot complete idle lesson',
      'complete_lesson',
      ts
    )
  }

  const alreadyDone = state.status === 'completed' && state.completedAt === ts
  const changed = !alreadyDone

  const newState: LessonRuntimeState = {
    ...state,
    status: 'completed',
    updatedAt: ts,
    completedAt: ts,
  }

  return success(newState, 'complete_lesson', ts, changed)
}

function cannotAdvance(status: LessonRuntimeState['status']): boolean {
  return status === 'idle' || status === 'completed'
}

/** Advance to next scene; allowed from in_progress or paused. */
export function advanceScene(
  input: LessonEngineAdvanceSceneInput
): LessonEngineOperationResult {
  const { state } = input
  const ts = input.timestamp ?? now()
  if (cannotAdvance(state.status)) {
    return fail(
      'invalid_transition',
      'Cannot advance scene from current status',
      'advance_scene',
      ts
    )
  }

  const current = resolveCurrentScene(state)
  if (!current) {
    return fail(
      'scene_not_found',
      'Current scene not found',
      'advance_scene',
      ts
    )
  }

  const next = resolveNextScene(state.lesson, current.sceneIndex)
  if (!next) {
    return fail(
      'invalid_transition',
      'No next scene',
      'advance_scene',
      ts
    )
  }

  const sortedPhrases = phrasesByOrder(next.scene)
  const firstPhrase = sortedPhrases[0] ?? null
  const newPointer: LessonRuntimePointer = {
    ...state.pointer,
    sceneId: next.scene.id,
    sceneIndex: next.sceneIndex,
    phraseId: firstPhrase?.id ?? null,
    phraseIndex: 0,
    turnIndex: 0,
  }

  const newState: LessonRuntimeState = {
    ...state,
    pointer: newPointer,
    updatedAt: ts,
  }
  return success(newState, 'advance_scene', ts, true)
}

/** Advance to next phrase in current scene; allowed from in_progress or paused. */
export function advancePhrase(
  input: LessonEngineAdvancePhraseInput
): LessonEngineOperationResult {
  const { state } = input
  const ts = input.timestamp ?? now()
  if (cannotAdvance(state.status)) {
    return fail(
      'invalid_transition',
      'Cannot advance phrase from current status',
      'advance_phrase',
      ts
    )
  }

  const currentScene = resolveCurrentScene(state)
  if (!currentScene) {
    return fail(
      'scene_not_found',
      'Current scene not found',
      'advance_phrase',
      ts
    )
  }

  const sortedPhrases = phrasesByOrder(currentScene.scene)
  if (sortedPhrases.length === 0) {
    return fail(
      'phrase_not_found',
      'Current scene has no phrases',
      'advance_phrase',
      ts
    )
  }

  const currentPhrase = resolveCurrentPhrase(
    currentScene.scene,
    state.pointer.phraseId
  )
  if (!currentPhrase) {
    return fail(
      'phrase_not_found',
      'Current phrase not found in scene',
      'advance_phrase',
      ts
    )
  }

  const nextPhraseIndex = currentPhrase.phraseIndex + 1
  if (nextPhraseIndex >= sortedPhrases.length) {
    return fail(
      'invalid_transition',
      'No next phrase',
      'advance_phrase',
      ts
    )
  }

  const nextPhrase = sortedPhrases[nextPhraseIndex]
  const newPointer: LessonRuntimePointer = {
    ...state.pointer,
    phraseId: nextPhrase.id,
    phraseIndex: nextPhraseIndex,
    turnIndex: 0,
  }

  const newState: LessonRuntimeState = {
    ...state,
    pointer: newPointer,
    updatedAt: ts,
  }
  return success(newState, 'advance_phrase', ts, true)
}

/** Append a conversation turn; allowed only from in_progress or paused. */
export function addTurn(
  input: LessonEngineAddTurnInput
): LessonEngineOperationResult {
  const { state, turn } = input
  const ts = input.timestamp ?? now()
  if (cannotAdvance(state.status)) {
    return fail(
      'invalid_transition',
      'Cannot add turn from current status',
      'add_turn',
      ts
    )
  }
  const newTurns = [...state.turns, turn]
  const newPointer: LessonRuntimePointer = {
    ...state.pointer,
    turnIndex: newTurns.length - 1,
  }
  const newState: LessonRuntimeState = {
    ...state,
    turns: newTurns,
    pointer: newPointer,
    updatedAt: ts,
  }
  return success(newState, 'add_turn', ts, true)
}

/** Append a review item to the queue; allowed only from in_progress or paused. */
export function queueReview(
  input: LessonEngineQueueReviewInput
): LessonEngineOperationResult {
  const { state, item } = input
  const ts = input.timestamp ?? now()
  if (cannotAdvance(state.status)) {
    return fail(
      'invalid_transition',
      'Cannot queue review from current status',
      'queue_review',
      ts
    )
  }
  const newReviewQueue = [...state.reviewQueue, item]
  const newState: LessonRuntimeState = {
    ...state,
    reviewQueue: newReviewQueue,
    updatedAt: ts,
  }
  return success(newState, 'queue_review', ts, true)
}
