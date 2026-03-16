import type { LessonSession } from './lesson-runner'
import {
  compareAnswerQuality,
  initializeLessonProgress,
  buildLessonProgressSnapshot,
  recordLessonAttempt,
  completeLessonStep,
  skipLessonStep,
  isLessonFinished,
} from './lesson-progress-engine'
import {
  initializeLessonProgressState,
  recordLessonAttemptAndMaybeComplete,
  skipLessonStepState,
  summarizeLessonCompletion,
} from './lesson-progress-service'

export type LessonProgressCheckResult = {
  name: string
  passed: boolean
  details: string
}

export function buildMockLessonSession(): LessonSession {
  return {
    lessonId: 'lesson-1',
    sceneId: 'scene-1',
    microSituationId: 'micro-1',
    title: 'Mock Lesson',
    description: 'Mock lesson description',
    goal: 'Mock goal',
    estimatedMinutes: 5,
    steps: [
      {
        id: 'lesson-1__step_1',
        orderIndex: 1,
        type: 'listen',
        prompt: 'Listen',
        instruction: null,
        hint: null,
        expectedAnswer: null,
        aiRole: null,
        patternSlotName: null,
        patternSlotOptions: [],
      },
      {
        id: 'lesson-1__step_2',
        orderIndex: 2,
        type: 'repeat',
        prompt: 'Say Good morning.',
        instruction: null,
        hint: null,
        expectedAnswer: 'Good morning.',
        aiRole: null,
        patternSlotName: null,
        patternSlotOptions: [],
      },
      {
        id: 'lesson-1__step_3',
        orderIndex: 3,
        type: 'guided',
        prompt: 'Answer the roommate.',
        instruction: null,
        hint: null,
        expectedAnswer: 'I slept well.',
        aiRole: 'roommate',
        patternSlotName: null,
        patternSlotOptions: [],
      },
    ],
  }
}

export function buildInitializedEngineState(): {
  lesson: ReturnType<typeof initializeLessonProgress>['lesson']
  steps: ReturnType<typeof initializeLessonProgress>['steps']
} {
  const result = initializeLessonProgress({
    lessonId: 'lesson-1',
    sceneId: 'scene-1',
    microSituationId: 'micro-1',
    userId: 'u1',
    stepCount: 3,
    stepTypes: ['listen', 'repeat', 'guided'],
    startedAt: '2026-03-12T10:00:00Z',
  })
  return { lesson: result.lesson, steps: result.steps }
}

export function buildInitializedServiceState(): ReturnType<
  typeof initializeLessonProgressState
> {
  return initializeLessonProgressState({
    session: buildMockLessonSession(),
    userId: 'u1',
    startedAt: '2026-03-12T10:00:00Z',
  })
}

export function checkCompareAnswerQuality(): LessonProgressCheckResult {
  const unknownVsRetry = compareAnswerQuality('unknown', 'needs_retry') === 'needs_retry'
  const retryVsAcceptable = compareAnswerQuality('needs_retry', 'acceptable') === 'acceptable'
  const acceptableVsCorrect = compareAnswerQuality('acceptable', 'correct') === 'correct'
  const lowerWins = compareAnswerQuality('correct', 'unknown') === 'correct'
  const passed = unknownVsRetry && retryVsAcceptable && acceptableVsCorrect && lowerWins
  return {
    name: 'checkCompareAnswerQuality',
    passed,
    details: passed
      ? 'unknown < needs_retry < acceptable < correct'
      : `unknownVsRetry=${unknownVsRetry}, retryVsAcceptable=${retryVsAcceptable}, acceptableVsCorrect=${acceptableVsCorrect}, lowerWins=${lowerWins}`,
  }
}

export function checkInitializeLessonProgress(): LessonProgressCheckResult {
  const { lesson, steps } = buildInitializedEngineState()
  const passed =
    lesson.status === 'in_progress' &&
    lesson.currentStepIndex === 0 &&
    steps.length === 3 &&
    steps[0].status === 'available' &&
    steps[1].status === 'locked'
  return {
    name: 'checkInitializeLessonProgress',
    passed,
    details: passed
      ? 'status in_progress, currentStepIndex 0, steps[0] available, steps[1] locked'
      : `status=${lesson.status}, currentStepIndex=${lesson.currentStepIndex}, steps.length=${steps.length}, steps[0].status=${steps[0].status}, steps[1].status=${steps[1].status}`,
  }
}

export function checkBuildLessonProgressSnapshot(): LessonProgressCheckResult {
  const { lesson, steps } = buildInitializedEngineState()
  const snapshot = buildLessonProgressSnapshot({ lesson, steps })
  const passed =
    snapshot.lesson.lessonId === 'lesson-1' && snapshot.steps.length === 3
  return {
    name: 'checkBuildLessonProgressSnapshot',
    passed,
    details: passed
      ? 'snapshot.lesson.lessonId lesson-1, steps.length 3'
      : `lessonId=${snapshot.lesson.lessonId}, steps.length=${snapshot.steps.length}`,
  }
}

export function checkRecordLessonAttempt(): LessonProgressCheckResult {
  const { steps } = buildInitializedEngineState()
  const { attempt, steps: nextSteps } = recordLessonAttempt(steps, {
    lessonId: 'lesson-1',
    stepId: 'lesson-1__step_2',
    userId: 'u1',
    learnerUtterance: 'Good morning.',
    quality: 'correct',
    createdAt: '2026-03-12T10:01:00Z',
  })
  const step2 = nextSteps.find((s) => s.stepId === 'lesson-1__step_2')
  const passed =
    attempt.attemptIndex === 1 &&
    step2 != null &&
    step2.attemptCount === 1 &&
    step2.bestQuality === 'correct' &&
    step2.startedAt === '2026-03-12T10:01:00Z'
  return {
    name: 'checkRecordLessonAttempt',
    passed,
    details: passed
      ? 'attemptIndex 1, step2 attemptCount 1, bestQuality correct, startedAt set'
      : `attemptIndex=${attempt.attemptIndex}, step2.attemptCount=${step2?.attemptCount}, step2.bestQuality=${step2?.bestQuality}, step2.startedAt=${step2?.startedAt}`,
  }
}

export function checkCompleteLessonStepUnlocksNext(): LessonProgressCheckResult {
  const { lesson, steps } = buildInitializedEngineState()
  const { lesson: nextLesson, steps: nextSteps } = completeLessonStep({
    lesson,
    steps,
    stepId: 'lesson-1__step_1',
    completedAt: '2026-03-12T10:01:00Z',
  })
  const step1 = nextSteps.find((s) => s.stepId === 'lesson-1__step_1')
  const step2 = nextSteps.find((s) => s.stepId === 'lesson-1__step_2')
  const passed =
    step1?.status === 'completed' &&
    step2?.status === 'available' &&
    nextLesson.completedStepCount === 1 &&
    nextLesson.status === 'in_progress'
  return {
    name: 'checkCompleteLessonStepUnlocksNext',
    passed,
    details: passed
      ? 'step1 completed, step2 available, completedStepCount 1, in_progress'
      : `step1.status=${step1?.status}, step2.status=${step2?.status}, completedStepCount=${nextLesson.completedStepCount}, status=${nextLesson.status}`,
  }
}

export function checkSkipLessonStepUnlocksNext(): LessonProgressCheckResult {
  const { lesson, steps } = buildInitializedEngineState()
  const { lesson: nextLesson, steps: nextSteps } = skipLessonStep({
    lesson,
    steps,
    stepId: 'lesson-1__step_1',
    skippedAt: '2026-03-12T10:01:00Z',
  })
  const step1 = nextSteps.find((s) => s.stepId === 'lesson-1__step_1')
  const step2 = nextSteps.find((s) => s.stepId === 'lesson-1__step_2')
  const passed =
    step1?.status === 'skipped' &&
    step2?.status === 'available' &&
    nextLesson.skippedStepCount === 1 &&
    nextLesson.status === 'in_progress'
  return {
    name: 'checkSkipLessonStepUnlocksNext',
    passed,
    details: passed
      ? 'step1 skipped, step2 available, skippedStepCount 1, in_progress'
      : `step1.status=${step1?.status}, step2.status=${step2?.status}, skippedStepCount=${nextLesson.skippedStepCount}, status=${nextLesson.status}`,
  }
}

export function checkIsLessonFinishedFalseInitially(): LessonProgressCheckResult {
  const { steps } = buildInitializedEngineState()
  const result = isLessonFinished(steps) === false
  return {
    name: 'checkIsLessonFinishedFalseInitially',
    passed: result,
    details: result
      ? 'isLessonFinished false on initial state'
      : 'isLessonFinished did not return false',
  }
}

export function checkIsLessonFinishedTrueAfterAllSteps(): LessonProgressCheckResult {
  let { lesson, steps } = buildInitializedEngineState()
  const completedAt = '2026-03-12T10:01:00Z'
  const r1 = completeLessonStep({
    lesson,
    steps,
    stepId: 'lesson-1__step_1',
    completedAt,
  })
  lesson = r1.lesson
  steps = r1.steps
  const r2 = completeLessonStep({
    lesson,
    steps,
    stepId: 'lesson-1__step_2',
    completedAt: '2026-03-12T10:02:00Z',
  })
  lesson = r2.lesson
  steps = r2.steps
  const r3 = completeLessonStep({
    lesson,
    steps,
    stepId: 'lesson-1__step_3',
    completedAt: '2026-03-12T10:05:00Z',
  })
  lesson = r3.lesson
  steps = r3.steps
  const finished = isLessonFinished(steps) === true
  const statusOk = lesson.status === 'completed'
  const completedAtOk = lesson.completedAt != null
  const passed = finished && statusOk && completedAtOk
  return {
    name: 'checkIsLessonFinishedTrueAfterAllSteps',
    passed,
    details: passed
      ? 'all steps completed: isLessonFinished true, status completed, completedAt set'
      : `finished=${finished}, status=${lesson.status}, completedAt=${lesson.completedAt != null}`,
  }
}

export function checkInitializeLessonProgressState(): LessonProgressCheckResult {
  const { lesson, steps, snapshot } = buildInitializedServiceState()
  const passed =
    snapshot.steps.length === 3 &&
    lesson.lessonId === 'lesson-1' &&
    steps[0].status === 'available'
  return {
    name: 'checkInitializeLessonProgressState',
    passed,
    details: passed
      ? 'snapshot.steps.length 3, lessonId lesson-1, steps[0] available'
      : `steps.length=${snapshot.steps.length}, lessonId=${lesson.lessonId}, steps[0].status=${steps[0].status}`,
  }
}

export function checkRecordLessonAttemptAndMaybeComplete(): LessonProgressCheckResult {
  const { lesson, steps } = buildInitializedServiceState()
  const firstStepId = steps[0].stepId
  const result = recordLessonAttemptAndMaybeComplete({
    lesson,
    steps,
    attemptInput: {
      lessonId: 'lesson-1',
      stepId: firstStepId,
      userId: 'u1',
      learnerUtterance: 'Okay',
      quality: 'acceptable',
      createdAt: '2026-03-12T10:01:00Z',
    },
    markCompleted: true,
    completedAt: '2026-03-12T10:01:00Z',
  })
  const step1 = result.steps.find((s) => s.stepId === 'lesson-1__step_1')
  const step2 = result.steps.find((s) => s.stepId === 'lesson-1__step_2')
  const passed =
    step1?.status === 'completed' &&
    step2?.status === 'available' &&
    result.attempt.attemptIndex === 1
  return {
    name: 'checkRecordLessonAttemptAndMaybeComplete',
    passed,
    details: passed
      ? 'step1 completed, step2 available, attemptIndex 1'
      : `step1.status=${step1?.status}, step2.status=${step2?.status}, attemptIndex=${result.attempt.attemptIndex}`,
  }
}

export function checkSkipLessonStepState(): LessonProgressCheckResult {
  const { lesson, steps } = buildInitializedServiceState()
  const result = skipLessonStepState({
    lesson,
    steps,
    stepId: 'lesson-1__step_1',
    skippedAt: '2026-03-12T10:01:00Z',
  })
  const step1 = result.steps.find((s) => s.stepId === 'lesson-1__step_1')
  const step2 = result.steps.find((s) => s.stepId === 'lesson-1__step_2')
  const passed =
    step1?.status === 'skipped' && step2?.status === 'available'
  return {
    name: 'checkSkipLessonStepState',
    passed,
    details: passed
      ? 'step1 skipped, step2 available'
      : `step1.status=${step1?.status}, step2.status=${step2?.status}`,
  }
}

export function checkSummarizeLessonCompletion(): LessonProgressCheckResult {
  let { lesson, steps } = buildInitializedServiceState()
  const completedAt = '2026-03-12T10:01:00Z'
  for (let i = 0; i < 3; i++) {
    const stepId = steps[i].stepId
    const completed = completeLessonStep({
      lesson,
      steps,
      stepId,
      completedAt: i === 0 ? completedAt : `2026-03-12T10:0${i + 2}:00Z`,
    })
    lesson = completed.lesson
    steps = completed.steps
  }
  const summary = summarizeLessonCompletion({ lesson, steps })
  const passed =
    summary.isCompleted === true &&
    summary.completedStepCount === 3 &&
    summary.totalStepCount === 3
  return {
    name: 'checkSummarizeLessonCompletion',
    passed,
    details: passed
      ? 'all steps completed: isCompleted true, completedStepCount 3, totalStepCount 3'
      : `isCompleted=${summary.isCompleted}, completedStepCount=${summary.completedStepCount}, totalStepCount=${summary.totalStepCount}`,
  }
}

export function runAllLessonProgressChecks(): LessonProgressCheckResult[] {
  return [
    checkCompareAnswerQuality(),
    checkInitializeLessonProgress(),
    checkBuildLessonProgressSnapshot(),
    checkRecordLessonAttempt(),
    checkCompleteLessonStepUnlocksNext(),
    checkSkipLessonStepUnlocksNext(),
    checkIsLessonFinishedFalseInitially(),
    checkIsLessonFinishedTrueAfterAllSteps(),
    checkInitializeLessonProgressState(),
    checkRecordLessonAttemptAndMaybeComplete(),
    checkSkipLessonStepState(),
    checkSummarizeLessonCompletion(),
  ]
}
