import type {
  LessonProgressState,
  LessonStepProgress,
  LessonStepAttempt,
  LessonProgressSnapshot,
  InitializeLessonProgressInput,
  RecordLessonAttemptInput,
  CompleteLessonStepInput,
  SkipLessonStepInput,
  LearnerAnswerQuality,
} from './lesson-progress-types'

export type InitializeLessonProgressResult = {
  lesson: LessonProgressState
  steps: LessonStepProgress[]
}

export type RecordLessonAttemptResult = {
  attempt: LessonStepAttempt
  steps: LessonStepProgress[]
}

export type CompleteLessonStepResult = {
  lesson: LessonProgressState
  steps: LessonStepProgress[]
}

export type SkipLessonStepResult = {
  lesson: LessonProgressState
  steps: LessonStepProgress[]
}

const QUALITY_RANK: Record<LearnerAnswerQuality, number> = {
  unknown: 0,
  needs_retry: 1,
  acceptable: 2,
  correct: 3,
}

export function compareAnswerQuality(
  current: LearnerAnswerQuality,
  incoming: LearnerAnswerQuality
): LearnerAnswerQuality {
  return QUALITY_RANK[incoming] > QUALITY_RANK[current] ? incoming : current
}

export function initializeLessonProgress(
  input: InitializeLessonProgressInput
): InitializeLessonProgressResult {
  const lesson: LessonProgressState = {
    lessonId: input.lessonId,
    sceneId: input.sceneId,
    microSituationId: input.microSituationId,
    userId: input.userId,
    status: 'in_progress',
    currentStepIndex: 0,
    totalStepCount: input.stepCount,
    startedAt: input.startedAt,
    completedAt: null,
    lastActivityAt: input.startedAt,
    completedStepCount: 0,
    skippedStepCount: 0,
    totalAttemptCount: 0,
  }
  const steps: LessonStepProgress[] = input.stepTypes.map((type, index) => ({
    lessonId: input.lessonId,
    stepId: `${input.lessonId}__step_${index + 1}`,
    orderIndex: index + 1,
    type,
    status: index === 0 ? 'available' : 'locked',
    startedAt: null,
    completedAt: null,
    skippedAt: null,
    attemptCount: 0,
    bestQuality: 'unknown',
    lastLearnerAnswer: null,
    lastAssistantText: null,
  }))
  return { lesson, steps }
}

export function buildLessonProgressSnapshot(args: {
  lesson: LessonProgressState
  steps: LessonStepProgress[]
}): LessonProgressSnapshot {
  return {
    lesson: { ...args.lesson },
    steps: [...args.steps],
  }
}

function trimOrNull(s: string | null | undefined): string | null {
  const t = typeof s === 'string' ? s.trim() : ''
  return t || null
}

export function setLessonStepAssistantText(args: {
  steps: LessonStepProgress[]
  stepId: string
  assistantText?: string | null
}): LessonStepProgress[] {
  const idx = args.steps.findIndex((s) => s.stepId === args.stepId)
  if (idx < 0) {
    return [...args.steps]
  }
  const prev = args.steps[idx]
  const lastAssistantText = trimOrNull(args.assistantText)
  const nextStep: LessonStepProgress = { ...prev, lastAssistantText }
  return args.steps
    .slice(0, idx)
    .concat(nextStep, args.steps.slice(idx + 1))
}

export function recordLessonAttempt(
  steps: LessonStepProgress[],
  input: RecordLessonAttemptInput
): RecordLessonAttemptResult {
  const idx = steps.findIndex((s) => s.stepId === input.stepId)
  const quality = input.quality ?? 'unknown'
  if (idx < 0) {
    const attempt: LessonStepAttempt = {
      id: `attempt:${input.stepId}:1`,
      lessonId: input.lessonId,
      stepId: input.stepId,
      userId: input.userId,
      attemptIndex: 1,
      learnerUtterance: trimOrNull(input.learnerUtterance),
      normalizedAnswer: trimOrNull(input.normalizedAnswer),
      expectedAnswer: trimOrNull(input.expectedAnswer),
      quality,
      isFinalAttempt: input.isFinalAttempt ?? false,
      createdAt: input.createdAt,
    }
    return { attempt, steps }
  }
  const prev = steps[idx]
  const attemptCount = prev.attemptCount + 1
  const bestQuality = compareAnswerQuality(prev.bestQuality, quality)
  const nextStep: LessonStepProgress = {
    ...prev,
    attemptCount,
    lastLearnerAnswer: trimOrNull(input.learnerUtterance),
    bestQuality,
    startedAt: prev.startedAt ?? input.createdAt,
  }
  const nextSteps = steps.slice(0, idx).concat(nextStep, steps.slice(idx + 1))
  const attempt: LessonStepAttempt = {
    id: `attempt:${input.stepId}:${attemptCount}`,
    lessonId: input.lessonId,
    stepId: input.stepId,
    userId: input.userId,
    attemptIndex: attemptCount,
    learnerUtterance: trimOrNull(input.learnerUtterance),
    normalizedAnswer: trimOrNull(input.normalizedAnswer),
    expectedAnswer: trimOrNull(input.expectedAnswer),
    quality,
    isFinalAttempt: input.isFinalAttempt ?? false,
    createdAt: input.createdAt,
  }
  return { attempt, steps: nextSteps }
}

function recomputeLessonFromSteps(
  lesson: LessonProgressState,
  steps: LessonStepProgress[],
  lastActivityAt: string
): LessonProgressState {
  const completedStepCount = steps.filter((s) => s.status === 'completed').length
  const skippedStepCount = steps.filter((s) => s.status === 'skipped').length
  const totalAttemptCount = steps.reduce((n, s) => n + s.attemptCount, 0)

  const firstAvailableIdx = steps.findIndex((s) => s.status === 'available')

  const isFinished =
    completedStepCount + skippedStepCount === steps.length

  const currentStepIndex =
    firstAvailableIdx >= 0
      ? firstAvailableIdx
      : isFinished
      ? steps.length
      : steps.length - 1

  return {
    ...lesson,
    completedStepCount,
    skippedStepCount,
    totalAttemptCount,
    currentStepIndex,
    lastActivityAt,
  }
}

export function completeLessonStep(
  input: CompleteLessonStepInput
): CompleteLessonStepResult {
  const idx = input.steps.findIndex((s) => s.stepId === input.stepId)
  if (idx < 0) {
    return { lesson: { ...input.lesson }, steps: [...input.steps] }
  }
  const steps = input.steps.map((s, i) => {
    if (i !== idx) {
      if (i === idx + 1 && s.status === 'locked') {
        return { ...s, status: 'available' as const }
      }
      return { ...s }
    }
    const existing = s
    const quality = input.quality ?? 'unknown'
    const best = compareAnswerQuality(existing.bestQuality, quality)
    const lastAnswer =
      input.learnerAnswer !== undefined
        ? trimOrNull(input.learnerAnswer) ?? existing.lastLearnerAnswer
        : existing.lastLearnerAnswer
    return {
      ...existing,
      status: 'completed' as const,
      completedAt: input.completedAt,
      startedAt: existing.startedAt ?? input.completedAt,
      bestQuality: best,
      lastLearnerAnswer: lastAnswer,
    }
  })
  const lesson = recomputeLessonFromSteps(
    { ...input.lesson },
    steps,
    input.completedAt
  )
  const allDone = steps.every(
    (s) => s.status === 'completed' || s.status === 'skipped'
  )
  if (allDone) {
    lesson.status = 'completed'
    lesson.completedAt = input.completedAt
  } else {
    lesson.status = 'in_progress'
    lesson.completedAt = null
  }
  return { lesson, steps }
}

export function skipLessonStep(
  input: SkipLessonStepInput
): SkipLessonStepResult {
  const idx = input.steps.findIndex((s) => s.stepId === input.stepId)
  if (idx < 0) {
    return { lesson: { ...input.lesson }, steps: [...input.steps] }
  }
  const steps = input.steps.map((s, i) => {
    if (i !== idx) {
      if (i === idx + 1 && s.status === 'locked') {
        return { ...s, status: 'available' as const }
      }
      return { ...s }
    }
    const existing = s
    return {
      ...existing,
      status: 'skipped' as const,
      skippedAt: input.skippedAt,
      startedAt: existing.startedAt ?? input.skippedAt,
    }
  })
  const lesson = recomputeLessonFromSteps(
    { ...input.lesson },
    steps,
    input.skippedAt
  )
  const allDone = steps.every(
    (s) => s.status === 'completed' || s.status === 'skipped'
  )
  if (allDone) {
    lesson.status = 'completed'
    lesson.completedAt = input.skippedAt
  } else {
    lesson.status = 'in_progress'
    lesson.completedAt = null
  }
  return { lesson, steps }
}

export function isLessonFinished(steps: LessonStepProgress[]): boolean {
  return steps.every(
    (s) => s.status === 'completed' || s.status === 'skipped'
  )
}
