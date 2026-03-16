import type { LessonSession } from './lesson-runner'
import type {
  LessonProgressState,
  LessonStepProgress,
  LessonStepAttempt,
  LessonProgressSnapshot,
  RecordLessonAttemptInput,
  LearnerAnswerQuality,
} from './lesson-progress-types'

import {
  initializeLessonProgress,
  buildLessonProgressSnapshot,
  recordLessonAttempt,
  completeLessonStep,
  skipLessonStep,
  isLessonFinished,
} from './lesson-progress-engine'

export type InitializeLessonProgressStateInput = {
  session: LessonSession
  userId: string
  startedAt: string
}

export type InitializeLessonProgressStateResult = {
  lesson: LessonProgressState
  steps: LessonStepProgress[]
  snapshot: LessonProgressSnapshot
}

export type RecordLessonAttemptAndMaybeCompleteInput = {
  lesson: LessonProgressState
  steps: LessonStepProgress[]
  attemptInput: RecordLessonAttemptInput
  markCompleted?: boolean
  completedAt?: string
  completionQuality?: LearnerAnswerQuality
}

export type RecordLessonAttemptAndMaybeCompleteResult = {
  lesson: LessonProgressState
  steps: LessonStepProgress[]
  attempt: LessonStepAttempt
  snapshot: LessonProgressSnapshot
}

export type SkipLessonStepStateInput = {
  lesson: LessonProgressState
  steps: LessonStepProgress[]
  stepId: string
  skippedAt: string
}

export type SkipLessonStepStateResult = {
  lesson: LessonProgressState
  steps: LessonStepProgress[]
  snapshot: LessonProgressSnapshot
}

export type LessonCompletionSummary = {
  isCompleted: boolean
  completedStepCount: number
  skippedStepCount: number
  totalAttemptCount: number
  totalStepCount: number
}

export function initializeLessonProgressState(
  input: InitializeLessonProgressStateInput
): InitializeLessonProgressStateResult {
  const stepTypes = input.session.steps.map((s) => s.type)
  const { lesson, steps } = initializeLessonProgress({
    lessonId: input.session.lessonId,
    sceneId: input.session.sceneId,
    microSituationId: input.session.microSituationId,
    userId: input.userId,
    stepCount: input.session.steps.length,
    stepTypes,
    startedAt: input.startedAt,
  })
  const snapshot = buildLessonProgressSnapshot({ lesson, steps })
  return { lesson, steps, snapshot }
}

export function recordLessonAttemptAndMaybeComplete(
  input: RecordLessonAttemptAndMaybeCompleteInput
): RecordLessonAttemptAndMaybeCompleteResult {
  const { attempt, steps: updatedSteps } = recordLessonAttempt(
    input.steps,
    input.attemptInput
  )
  let lesson: LessonProgressState
  let steps: LessonStepProgress[]
  if (input.markCompleted === true) {
    const completed = completeLessonStep({
      lesson: input.lesson,
      steps: updatedSteps,
      stepId: input.attemptInput.stepId,
      completedAt: input.completedAt ?? input.attemptInput.createdAt,
      quality:
        input.completionQuality ?? input.attemptInput.quality ?? 'unknown',
      learnerAnswer: input.attemptInput.learnerUtterance ?? null,
    })
    lesson = completed.lesson
    steps = completed.steps
  } else {
    steps = updatedSteps
    const totalAttemptCount = updatedSteps.reduce(
      (sum, step) => sum + step.attemptCount,
      0
    )
    lesson = {
      ...input.lesson,
      totalAttemptCount,
      lastActivityAt: input.attemptInput.createdAt,
      status:
        input.lesson.status === 'not_started' ? 'in_progress' : input.lesson.status,
    }
  }
  const snapshot = buildLessonProgressSnapshot({ lesson, steps })
  return { lesson, steps, attempt, snapshot }
}

export function skipLessonStepState(
  input: SkipLessonStepStateInput
): SkipLessonStepStateResult {
  const { lesson, steps } = skipLessonStep({
    lesson: input.lesson,
    steps: input.steps,
    stepId: input.stepId,
    skippedAt: input.skippedAt,
  })
  const snapshot = buildLessonProgressSnapshot({ lesson, steps })
  return { lesson, steps, snapshot }
}

export function summarizeLessonCompletion(args: {
  lesson: LessonProgressState
  steps: LessonStepProgress[]
}): LessonCompletionSummary {
  const isCompleted =
    args.lesson.status === 'completed' || isLessonFinished(args.steps)
  return {
    isCompleted,
    completedStepCount: args.lesson.completedStepCount,
    skippedStepCount: args.lesson.skippedStepCount,
    totalAttemptCount: args.lesson.totalAttemptCount,
    totalStepCount: args.lesson.totalStepCount,
  }
}
