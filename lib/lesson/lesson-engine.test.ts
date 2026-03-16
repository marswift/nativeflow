/**
 * Unit tests for lesson-engine (start, resume, pause, complete, advance, addTurn, queueReview).
 * Run with: node --import tsx --test lib/lesson/lesson-engine.test.ts
 */
import test from 'node:test'
import assert from 'node:assert'
import {
  addTurn,
  advancePhrase,
  advanceScene,
  completeLesson,
  pauseLesson,
  queueReview,
  resumeLesson,
  startLesson,
} from './lesson-engine'
import type { ConversationTurn, Lesson, ReviewItem, Scene } from './lesson-types'
import type { LessonRuntimeResumeSnapshot, LessonRuntimeState } from './lesson-runtime-types'

// ——— Fixtures: lesson with 2 scenes; scene order 5 then 10 so first by order is scene-b. ———
const sceneB: Scene = {
  id: 'scene-b',
  lessonId: 'lesson-1',
  kind: 'practice',
  key: 'b',
  title: 'Scene B',
  description: '',
  order: 5,
  phrases: [
    { id: 'phrase-b1', sceneId: 'scene-b', text: 'B1', translation: 'B1', hint: null, order: 1, imageUrl: null, imagePrompt: null },
    { id: 'phrase-b2', sceneId: 'scene-b', text: 'B2', translation: 'B2', hint: null, order: 2, imageUrl: null, imagePrompt: null },
  ],
}
const sceneA: Scene = {
  id: 'scene-a',
  lessonId: 'lesson-1',
  kind: 'practice',
  key: 'a',
  title: 'Scene A',
  description: '',
  order: 10,
  phrases: [
    { id: 'phrase-a1', sceneId: 'scene-a', text: 'A1', translation: 'A1', hint: null, order: 2, imageUrl: null, imagePrompt: null },
    { id: 'phrase-a2', sceneId: 'scene-a', text: 'A2', translation: 'A2', hint: null, order: 1, imageUrl: null, imagePrompt: null },
  ],
}

const lessonWithTwoScenes: Lesson = {
  id: 'lesson-1',
  slug: 'test-lesson',
  title: 'Test',
  description: '',
  targetLanguage: 'en',
  supportLanguage: 'ja',
  cefrLevel: null,
  status: 'published',
  scenes: [sceneA, sceneB],
}

const lessonWithNoScenes: Lesson = {
  ...lessonWithTwoScenes,
  id: 'lesson-empty',
  scenes: [],
}

// Scene with no phrases (for advanceScene: next scene has no phrases).
const sceneC: Scene = {
  id: 'scene-c',
  lessonId: 'lesson-1',
  kind: 'practice',
  key: 'c',
  title: 'Scene C',
  description: '',
  order: 15,
  phrases: [],
}
const lessonWithThreeScenes: Lesson = {
  ...lessonWithTwoScenes,
  scenes: [sceneA, sceneB, sceneC],
}

const sampleTurn: ConversationTurn = {
  id: 'turn-1',
  sceneId: 'scene-b',
  phraseId: 'phrase-b1',
  speaker: 'user',
  text: 'Hello',
  translation: 'こんにちは',
  order: 1,
}
const sampleReviewItem: ReviewItem = {
  id: 'review-1',
  lessonId: 'lesson-1',
  sceneId: 'scene-b',
  phraseId: 'phrase-b1',
  nextReviewAt: '2025-02-01T00:00:00.000Z',
  reviewIntervalDays: 1,
  correctCount: 0,
  incorrectCount: 0,
}

const idleState: LessonRuntimeState = {
  status: 'idle',
  lesson: lessonWithTwoScenes,
  pointer: { lessonId: 'lesson-1', sceneId: null, phraseId: null, turnIndex: 0, sceneIndex: 0, phraseIndex: 0 },
  turns: [],
  reviewQueue: [],
  progress: { completedSceneIds: [], completedPhraseIds: [], completedReviewItemIds: [], percentComplete: 0 },
  startedAt: null,
  updatedAt: null,
  completedAt: null,
}

function assertSuccess(result: unknown): asserts result is { state: LessonRuntimeState; meta: { action: string; timestamp: string; changed: boolean } } {
  assert.ok(result && typeof result === 'object' && 'state' in result && !('error' in result))
}
function assertFailure(result: unknown): asserts result is { error: { code: string; message: string }; meta: { action: string; timestamp: string; changed: boolean } } {
  assert.ok(result && typeof result === 'object' && 'error' in result)
}

// ——— startLesson ———
test('startLesson: first scene by ascending order when no initialSceneId', () => {
  const result = startLesson({ lesson: lessonWithTwoScenes })
  assertSuccess(result)
  assert.strictEqual(result.state.pointer.sceneId, 'scene-b')
  assert.strictEqual(result.state.pointer.sceneIndex, 0)
})

test('startLesson: requested initialSceneId when it exists', () => {
  const result = startLesson({ lesson: lessonWithTwoScenes, initialSceneId: 'scene-a' })
  assertSuccess(result)
  assert.strictEqual(result.state.pointer.sceneId, 'scene-a')
  assert.strictEqual(result.state.pointer.sceneIndex, 1)
})

test('startLesson: first phrase by order in resolved scene when no initialPhraseId', () => {
  const result = startLesson({ lesson: lessonWithTwoScenes })
  assertSuccess(result)
  assert.strictEqual(result.state.pointer.phraseId, 'phrase-b1')
  assert.strictEqual(result.state.pointer.phraseIndex, 0)
})

test('startLesson: requested initialPhraseId when it exists in resolved scene', () => {
  const result = startLesson({ lesson: lessonWithTwoScenes, initialSceneId: 'scene-a', initialPhraseId: 'phrase-a1' })
  assertSuccess(result)
  assert.strictEqual(result.state.pointer.phraseId, 'phrase-a1')
  assert.strictEqual(result.state.pointer.phraseIndex, 1)
})

test('startLesson: fallback to first phrase when initialPhraseId not in resolved scene', () => {
  const result = startLesson({ lesson: lessonWithTwoScenes, initialSceneId: 'scene-a', initialPhraseId: 'phrase-b1' })
  assertSuccess(result)
  assert.strictEqual(result.state.pointer.sceneId, 'scene-a')
  assert.strictEqual(result.state.pointer.phraseId, 'phrase-a2')
})

test('startLesson: no scenes returns scene_not_found', () => {
  const result = startLesson({ lesson: lessonWithNoScenes })
  assertFailure(result)
  assert.strictEqual(result.error.code, 'scene_not_found')
})

test('startLesson: initializes status in_progress, empty turns/reviewQueue, percentComplete 0, completedAt null', () => {
  const startedAt = '2025-01-01T00:00:00.000Z'
  const result = startLesson({ lesson: lessonWithTwoScenes, startedAt })
  assertSuccess(result)
  assert.strictEqual(result.state.status, 'in_progress')
  assert.strictEqual(result.state.turns.length, 0)
  assert.strictEqual(result.state.reviewQueue.length, 0)
  assert.strictEqual(result.state.progress.percentComplete, 0)
  assert.strictEqual(result.state.completedAt, null)
  assert.strictEqual(result.state.startedAt, startedAt)
  assert.strictEqual(result.state.updatedAt, startedAt)
  assert.strictEqual(result.meta.timestamp, startedAt)
})

// ——— resumeLesson ———
test('resumeLesson: succeeds when snapshot.lessonId and pointer.lessonId match lesson.id', () => {
  const start = startLesson({ lesson: lessonWithTwoScenes })
  assertSuccess(start)
  const snapshot: LessonRuntimeResumeSnapshot = {
    lessonId: 'lesson-1',
    status: 'in_progress',
    pointer: start.state.pointer,
    progress: start.state.progress,
    startedAt: start.state.startedAt,
    updatedAt: start.state.updatedAt,
  }
  const result = resumeLesson({ lesson: lessonWithTwoScenes, snapshot })
  assertSuccess(result)
  assert.strictEqual(result.state.status, snapshot.status)
  assert.deepStrictEqual(result.state.pointer, snapshot.pointer)
  assert.deepStrictEqual(result.state.progress, snapshot.progress)
  assert.strictEqual(result.state.startedAt, snapshot.startedAt)
  assert.strictEqual(result.state.updatedAt, snapshot.updatedAt)
  assert.strictEqual(result.state.turns.length, 0)
  assert.strictEqual(result.state.reviewQueue.length, 0)
})

test('resumeLesson: when snapshot.status is completed, completedAt equals resolved timestamp', () => {
  const ts = '2025-01-02T12:00:00.000Z'
  const snapshot: LessonRuntimeResumeSnapshot = {
    lessonId: 'lesson-1',
    status: 'completed',
    pointer: { lessonId: 'lesson-1', sceneId: 'scene-b', phraseId: 'phrase-b1', turnIndex: 0, sceneIndex: 0, phraseIndex: 0 },
    progress: { completedSceneIds: [], completedPhraseIds: [], completedReviewItemIds: [], percentComplete: 100 },
    startedAt: '2025-01-01T00:00:00.000Z',
    updatedAt: ts,
  }
  const result = resumeLesson({ lesson: lessonWithTwoScenes, snapshot })
  assertSuccess(result)
  assert.strictEqual(result.state.completedAt, ts)
  assert.strictEqual(result.state.updatedAt, ts)
})

test('resumeLesson: snapshot.lessonId mismatch returns resume_failed', () => {
  const snapshot: LessonRuntimeResumeSnapshot = {
    lessonId: 'other-lesson',
    status: 'in_progress',
    pointer: { lessonId: 'lesson-1', sceneId: 'scene-b', phraseId: null, turnIndex: 0, sceneIndex: 0, phraseIndex: 0 },
    progress: { completedSceneIds: [], completedPhraseIds: [], completedReviewItemIds: [], percentComplete: 0 },
    startedAt: null,
    updatedAt: null,
  }
  const result = resumeLesson({ lesson: lessonWithTwoScenes, snapshot })
  assertFailure(result)
  assert.strictEqual(result.error.code, 'resume_failed')
})

test('resumeLesson: snapshot.pointer.lessonId mismatch returns resume_failed', () => {
  const snapshot: LessonRuntimeResumeSnapshot = {
    lessonId: 'lesson-1',
    status: 'in_progress',
    pointer: { lessonId: 'other-lesson', sceneId: 'scene-b', phraseId: null, turnIndex: 0, sceneIndex: 0, phraseIndex: 0 },
    progress: { completedSceneIds: [], completedPhraseIds: [], completedReviewItemIds: [], percentComplete: 0 },
    startedAt: null,
    updatedAt: null,
  }
  const result = resumeLesson({ lesson: lessonWithTwoScenes, snapshot })
  assertFailure(result)
  assert.strictEqual(result.error.code, 'resume_failed')
})

// ——— pauseLesson ———
test('pauseLesson: pauses from in_progress successfully', () => {
  const start = startLesson({ lesson: lessonWithTwoScenes })
  assertSuccess(start)
  const result = pauseLesson({ state: start.state })
  assertSuccess(result)
  assert.strictEqual(result.state.status, 'paused')
  assert.strictEqual(result.meta.changed, true)
})

test('pauseLesson: from paused successfully', () => {
  const start = startLesson({ lesson: lessonWithTwoScenes })
  assertSuccess(start)
  const paused = pauseLesson({ state: start.state, timestamp: '2025-01-01T01:00:00.000Z' })
  assertSuccess(paused)
  const again = pauseLesson({ state: paused.state, timestamp: '2025-01-01T01:00:00.000Z' })
  assertSuccess(again)
  assert.strictEqual(again.state.status, 'paused')
  assert.strictEqual(again.meta.changed, false)
})

test('pauseLesson: fails from completed with invalid_transition', () => {
  const start = startLesson({ lesson: lessonWithTwoScenes })
  assertSuccess(start)
  const completed = completeLesson({ state: start.state })
  assertSuccess(completed)
  const result = pauseLesson({ state: completed.state })
  assertFailure(result)
  assert.strictEqual(result.error.code, 'invalid_transition')
})

test('pauseLesson: fails from idle with invalid_transition', () => {
  const result = pauseLesson({ state: idleState })
  assertFailure(result)
  assert.strictEqual(result.error.code, 'invalid_transition')
})

test('pauseLesson: uses provided timestamp for updatedAt and meta.timestamp', () => {
  const start = startLesson({ lesson: lessonWithTwoScenes })
  assertSuccess(start)
  const ts = '2025-01-01T02:00:00.000Z'
  const result = pauseLesson({ state: start.state, timestamp: ts })
  assertSuccess(result)
  assert.strictEqual(result.state.updatedAt, ts)
  assert.strictEqual(result.meta.timestamp, ts)
})

// ——— completeLesson ———
test('completeLesson: completes from in_progress successfully', () => {
  const start = startLesson({ lesson: lessonWithTwoScenes })
  assertSuccess(start)
  const result = completeLesson({ state: start.state })
  assertSuccess(result)
  assert.strictEqual(result.state.status, 'completed')
  assert.ok(result.state.completedAt != null)
  assert.strictEqual(result.meta.changed, true)
})

test('completeLesson: completes from paused successfully', () => {
  const start = startLesson({ lesson: lessonWithTwoScenes })
  assertSuccess(start)
  const paused = pauseLesson({ state: start.state })
  assertSuccess(paused)
  const result = completeLesson({ state: paused.state })
  assertSuccess(result)
  assert.strictEqual(result.state.status, 'completed')
})

test('completeLesson: from completed successfully, changed false when completedAt equals effective timestamp', () => {
  const start = startLesson({ lesson: lessonWithTwoScenes })
  assertSuccess(start)
  const ts = '2025-01-01T03:00:00.000Z'
  const first = completeLesson({ state: start.state, timestamp: ts })
  assertSuccess(first)
  const second = completeLesson({ state: first.state, timestamp: ts })
  assertSuccess(second)
  assert.strictEqual(second.state.status, 'completed')
  assert.strictEqual(second.state.completedAt, ts)
  assert.strictEqual(second.meta.timestamp, ts)
  assert.strictEqual(second.meta.changed, false)
})

test('completeLesson: fails from idle with invalid_transition', () => {
  const result = completeLesson({ state: idleState })
  assertFailure(result)
  assert.strictEqual(result.error.code, 'invalid_transition')
})

test('completeLesson: uses provided timestamp for updatedAt, completedAt, meta.timestamp', () => {
  const start = startLesson({ lesson: lessonWithTwoScenes })
  assertSuccess(start)
  const ts = '2025-01-01T04:00:00.000Z'
  const result = completeLesson({ state: start.state, timestamp: ts })
  assertSuccess(result)
  assert.strictEqual(result.state.updatedAt, ts)
  assert.strictEqual(result.state.completedAt, ts)
  assert.strictEqual(result.meta.timestamp, ts)
})

test('completeLesson: changed true when completing from in_progress', () => {
  const start = startLesson({ lesson: lessonWithTwoScenes })
  assertSuccess(start)
  const result = completeLesson({ state: start.state })
  assertSuccess(result)
  assert.strictEqual(result.meta.changed, true)
})

// ——— advanceScene ———
test('advanceScene: succeeds from in_progress and moves to next scene by ascending order', () => {
  const start = startLesson({ lesson: lessonWithTwoScenes })
  assertSuccess(start)
  assert.strictEqual(start.state.pointer.sceneId, 'scene-b')
  const result = advanceScene({ state: start.state })
  assertSuccess(result)
  assert.strictEqual(result.state.pointer.sceneId, 'scene-a')
  assert.strictEqual(result.state.pointer.sceneIndex, 1)
  assert.strictEqual(result.state.pointer.turnIndex, 0)
})

test('advanceScene: succeeds from paused and preserves paused status', () => {
  const start = startLesson({ lesson: lessonWithTwoScenes })
  assertSuccess(start)
  const paused = pauseLesson({ state: start.state })
  assertSuccess(paused)
  const result = advanceScene({ state: paused.state })
  assertSuccess(result)
  assert.strictEqual(result.state.status, 'paused')
  assert.strictEqual(result.state.pointer.sceneId, 'scene-a')
})

test('advanceScene: sets pointer.sceneId and sceneIndex to next scene', () => {
  const start = startLesson({ lesson: lessonWithTwoScenes })
  assertSuccess(start)
  const result = advanceScene({ state: start.state })
  assertSuccess(result)
  assert.strictEqual(result.state.pointer.sceneId, 'scene-a')
  assert.strictEqual(result.state.pointer.sceneIndex, 1)
})

test('advanceScene: resets pointer.turnIndex to 0', () => {
  const start = startLesson({ lesson: lessonWithTwoScenes })
  assertSuccess(start)
  const stateWithTurn = { ...start.state, pointer: { ...start.state.pointer, turnIndex: 3 } }
  const result = advanceScene({ state: stateWithTurn })
  assertSuccess(result)
  assert.strictEqual(result.state.pointer.turnIndex, 0)
})

test('advanceScene: resolves first phrase in next scene by ascending order', () => {
  const start = startLesson({ lesson: lessonWithTwoScenes })
  assertSuccess(start)
  const result = advanceScene({ state: start.state })
  assertSuccess(result)
  assert.strictEqual(result.state.pointer.sceneId, 'scene-a')
  assert.strictEqual(result.state.pointer.phraseId, 'phrase-a2')
  assert.strictEqual(result.state.pointer.phraseIndex, 0)
})

test('advanceScene: if next scene has no phrases, sets phraseId null and phraseIndex 0', () => {
  const start = startLesson({ lesson: lessonWithThreeScenes, initialSceneId: 'scene-a' })
  assertSuccess(start)
  const result = advanceScene({ state: start.state })
  assertSuccess(result)
  assert.strictEqual(result.state.pointer.sceneId, 'scene-c')
  assert.strictEqual(result.state.pointer.phraseId, null)
  assert.strictEqual(result.state.pointer.phraseIndex, 0)
})

test('advanceScene: fails with scene_not_found if current sceneId missing from lesson.scenes', () => {
  const start = startLesson({ lesson: lessonWithTwoScenes })
  assertSuccess(start)
  const stateWithGhostScene: LessonRuntimeState = {
    ...start.state,
    pointer: { ...start.state.pointer, sceneId: 'ghost-scene' },
  }
  const result = advanceScene({ state: stateWithGhostScene })
  assertFailure(result)
  assert.strictEqual(result.error.code, 'scene_not_found')
})

test('advanceScene: fails with invalid_transition if already at last scene', () => {
  const start = startLesson({ lesson: lessonWithTwoScenes, initialSceneId: 'scene-a' })
  assertSuccess(start)
  const result = advanceScene({ state: start.state })
  assertFailure(result)
  assert.strictEqual(result.error.code, 'invalid_transition')
})

test('advanceScene: fails with invalid_transition from idle', () => {
  const result = advanceScene({ state: idleState })
  assertFailure(result)
  assert.strictEqual(result.error.code, 'invalid_transition')
})

test('advanceScene: fails with invalid_transition from completed', () => {
  const start = startLesson({ lesson: lessonWithTwoScenes })
  assertSuccess(start)
  const completed = completeLesson({ state: start.state })
  assertSuccess(completed)
  const result = advanceScene({ state: completed.state })
  assertFailure(result)
  assert.strictEqual(result.error.code, 'invalid_transition')
})

test('advanceScene: uses provided timestamp for updatedAt and meta.timestamp', () => {
  const start = startLesson({ lesson: lessonWithTwoScenes })
  assertSuccess(start)
  const ts = '2025-01-01T10:00:00.000Z'
  const result = advanceScene({ state: start.state, timestamp: ts })
  assertSuccess(result)
  assert.strictEqual(result.state.updatedAt, ts)
  assert.strictEqual(result.meta.timestamp, ts)
})

// ——— advancePhrase ———
test('advancePhrase: succeeds from in_progress and moves to next phrase in same scene', () => {
  const start = startLesson({ lesson: lessonWithTwoScenes })
  assertSuccess(start)
  assert.strictEqual(start.state.pointer.phraseId, 'phrase-b1')
  const result = advancePhrase({ state: start.state })
  assertSuccess(result)
  assert.strictEqual(result.state.pointer.phraseId, 'phrase-b2')
  assert.strictEqual(result.state.pointer.phraseIndex, 1)
  assert.strictEqual(result.state.pointer.sceneId, 'scene-b')
  assert.strictEqual(result.state.pointer.turnIndex, 0)
})

test('advancePhrase: succeeds from paused and preserves paused status', () => {
  const start = startLesson({ lesson: lessonWithTwoScenes })
  assertSuccess(start)
  const paused = pauseLesson({ state: start.state })
  assertSuccess(paused)
  const result = advancePhrase({ state: paused.state })
  assertSuccess(result)
  assert.strictEqual(result.state.status, 'paused')
  assert.strictEqual(result.state.pointer.phraseId, 'phrase-b2')
})

test('advancePhrase: keeps sceneId and sceneIndex unchanged', () => {
  const start = startLesson({ lesson: lessonWithTwoScenes })
  assertSuccess(start)
  const result = advancePhrase({ state: start.state })
  assertSuccess(result)
  assert.strictEqual(result.state.pointer.sceneId, 'scene-b')
  assert.strictEqual(result.state.pointer.sceneIndex, 0)
})

test('advancePhrase: sets pointer.phraseId and phraseIndex to next phrase, resets turnIndex', () => {
  const start = startLesson({ lesson: lessonWithTwoScenes })
  assertSuccess(start)
  const result = advancePhrase({ state: start.state })
  assertSuccess(result)
  assert.strictEqual(result.state.pointer.phraseId, 'phrase-b2')
  assert.strictEqual(result.state.pointer.phraseIndex, 1)
  assert.strictEqual(result.state.pointer.turnIndex, 0)
})

test('advancePhrase: fails with scene_not_found if current sceneId missing', () => {
  const start = startLesson({ lesson: lessonWithTwoScenes })
  assertSuccess(start)
  const stateWithGhostScene: LessonRuntimeState = {
    ...start.state,
    pointer: { ...start.state.pointer, sceneId: 'ghost-scene' },
  }
  const result = advancePhrase({ state: stateWithGhostScene })
  assertFailure(result)
  assert.strictEqual(result.error.code, 'scene_not_found')
})

test('advancePhrase: fails with phrase_not_found if current scene has no phrases', () => {
  const start = startLesson({ lesson: lessonWithThreeScenes, initialSceneId: 'scene-c' })
  assertSuccess(start)
  const result = advancePhrase({ state: start.state })
  assertFailure(result)
  assert.strictEqual(result.error.code, 'phrase_not_found')
})

test('advancePhrase: fails with phrase_not_found if pointer.phraseId is null', () => {
  const start = startLesson({ lesson: lessonWithTwoScenes })
  assertSuccess(start)
  const stateNullPhrase: LessonRuntimeState = {
    ...start.state,
    pointer: { ...start.state.pointer, phraseId: null },
  }
  const result = advancePhrase({ state: stateNullPhrase })
  assertFailure(result)
  assert.strictEqual(result.error.code, 'phrase_not_found')
})

test('advancePhrase: fails with phrase_not_found if pointer.phraseId not in current scene', () => {
  const start = startLesson({ lesson: lessonWithTwoScenes })
  assertSuccess(start)
  const stateWrongPhrase: LessonRuntimeState = {
    ...start.state,
    pointer: { ...start.state.pointer, phraseId: 'phrase-a1' },
  }
  const result = advancePhrase({ state: stateWrongPhrase })
  assertFailure(result)
  assert.strictEqual(result.error.code, 'phrase_not_found')
})

test('advancePhrase: fails with invalid_transition if already at last phrase', () => {
  const start = startLesson({ lesson: lessonWithTwoScenes })
  assertSuccess(start)
  const advanced = advancePhrase({ state: start.state })
  assertSuccess(advanced)
  assert.strictEqual(advanced.state.pointer.phraseId, 'phrase-b2')
  const result = advancePhrase({ state: advanced.state })
  assertFailure(result)
  assert.strictEqual(result.error.code, 'invalid_transition')
})

test('advancePhrase: fails with invalid_transition from idle', () => {
  const result = advancePhrase({ state: idleState })
  assertFailure(result)
  assert.strictEqual(result.error.code, 'invalid_transition')
})

test('advancePhrase: fails with invalid_transition from completed', () => {
  const start = startLesson({ lesson: lessonWithTwoScenes })
  assertSuccess(start)
  const completed = completeLesson({ state: start.state })
  assertSuccess(completed)
  const result = advancePhrase({ state: completed.state })
  assertFailure(result)
  assert.strictEqual(result.error.code, 'invalid_transition')
})

test('advancePhrase: uses provided timestamp for updatedAt and meta.timestamp', () => {
  const start = startLesson({ lesson: lessonWithTwoScenes })
  assertSuccess(start)
  const ts = '2025-01-01T11:00:00.000Z'
  const result = advancePhrase({ state: start.state, timestamp: ts })
  assertSuccess(result)
  assert.strictEqual(result.state.updatedAt, ts)
  assert.strictEqual(result.meta.timestamp, ts)
})

// ——— addTurn ———
test('addTurn: appends a turn immutably', () => {
  const start = startLesson({ lesson: lessonWithTwoScenes })
  assertSuccess(start)
  assert.strictEqual(start.state.turns.length, 0)
  const result = addTurn({ state: start.state, turn: sampleTurn })
  assertSuccess(result)
  assert.strictEqual(result.state.turns.length, 1)
  assert.strictEqual(result.state.turns[0].id, sampleTurn.id)
  assert.notStrictEqual(result.state.turns, start.state.turns)
})

test('addTurn: returns meta.action add_turn and changed true on success', () => {
  const start = startLesson({ lesson: lessonWithTwoScenes })
  assertSuccess(start)
  const result = addTurn({ state: start.state, turn: sampleTurn })
  assertSuccess(result)
  assert.strictEqual(result.meta.action, 'add_turn')
  assert.strictEqual(result.meta.changed, true)
})

test('addTurn: updates updatedAt when timestamp is provided', () => {
  const start = startLesson({ lesson: lessonWithTwoScenes })
  assertSuccess(start)
  const ts = '2025-01-01T12:00:00.000Z'
  const result = addTurn({ state: start.state, turn: sampleTurn, timestamp: ts })
  assertSuccess(result)
  assert.strictEqual(result.state.updatedAt, ts)
  assert.strictEqual(result.meta.timestamp, ts)
})

test('addTurn: updates pointer.turnIndex consistently after append', () => {
  const start = startLesson({ lesson: lessonWithTwoScenes })
  assertSuccess(start)
  assert.strictEqual(start.state.pointer.turnIndex, 0)
  const first = addTurn({ state: start.state, turn: sampleTurn })
  assertSuccess(first)
  assert.strictEqual(first.state.pointer.turnIndex, 0)
  const secondTurn: ConversationTurn = { ...sampleTurn, id: 'turn-2', order: 2 }
  const second = addTurn({ state: first.state, turn: secondTurn })
  assertSuccess(second)
  assert.strictEqual(second.state.turns.length, 2)
  assert.strictEqual(second.state.pointer.turnIndex, 1)
})

test('addTurn: fails from idle status', () => {
  const result = addTurn({ state: idleState, turn: sampleTurn })
  assertFailure(result)
  assert.strictEqual(result.error.code, 'invalid_transition')
  assert.strictEqual(result.meta.action, 'add_turn')
  assert.strictEqual(result.meta.changed, false)
})

test('addTurn: fails from completed status', () => {
  const start = startLesson({ lesson: lessonWithTwoScenes })
  assertSuccess(start)
  const completed = completeLesson({ state: start.state })
  assertSuccess(completed)
  const result = addTurn({ state: completed.state, turn: sampleTurn })
  assertFailure(result)
  assert.strictEqual(result.error.code, 'invalid_transition')
  assert.strictEqual(result.meta.action, 'add_turn')
  assert.strictEqual(result.meta.changed, false)
})

// ——— queueReview ———
test('queueReview: appends a review item immutably', () => {
  const start = startLesson({ lesson: lessonWithTwoScenes })
  assertSuccess(start)
  assert.strictEqual(start.state.reviewQueue.length, 0)
  const result = queueReview({ state: start.state, item: sampleReviewItem })
  assertSuccess(result)
  assert.strictEqual(result.state.reviewQueue.length, 1)
  assert.strictEqual(result.state.reviewQueue[0].id, sampleReviewItem.id)
  assert.notStrictEqual(result.state.reviewQueue, start.state.reviewQueue)
})

test('queueReview: returns meta.action queue_review and changed true on success', () => {
  const start = startLesson({ lesson: lessonWithTwoScenes })
  assertSuccess(start)
  const result = queueReview({ state: start.state, item: sampleReviewItem })
  assertSuccess(result)
  assert.strictEqual(result.meta.action, 'queue_review')
  assert.strictEqual(result.meta.changed, true)
})

test('queueReview: updates updatedAt when timestamp is provided', () => {
  const start = startLesson({ lesson: lessonWithTwoScenes })
  assertSuccess(start)
  const ts = '2025-01-01T13:00:00.000Z'
  const result = queueReview({ state: start.state, item: sampleReviewItem, timestamp: ts })
  assertSuccess(result)
  assert.strictEqual(result.state.updatedAt, ts)
  assert.strictEqual(result.meta.timestamp, ts)
})

test('queueReview: fails from idle status', () => {
  const result = queueReview({ state: idleState, item: sampleReviewItem })
  assertFailure(result)
  assert.strictEqual(result.error.code, 'invalid_transition')
  assert.strictEqual(result.meta.action, 'queue_review')
  assert.strictEqual(result.meta.changed, false)
})

test('queueReview: fails from completed status', () => {
  const start = startLesson({ lesson: lessonWithTwoScenes })
  assertSuccess(start)
  const completed = completeLesson({ state: start.state })
  assertSuccess(completed)
  const result = queueReview({ state: completed.state, item: sampleReviewItem })
  assertFailure(result)
  assert.strictEqual(result.error.code, 'invalid_transition')
  assert.strictEqual(result.meta.action, 'queue_review')
  assert.strictEqual(result.meta.changed, false)
})
