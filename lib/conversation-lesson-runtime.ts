import type { LessonSession, LessonSessionStep } from './lesson-runner'
import type { PromptAssemblyResult } from './prompt-assembly-types'
import type {
  LessonProgressState,
  LessonStepProgress,
} from './lesson-progress-types'
import type {
  DailyMissionDefinition,
  DailyMissionProgress,
  LearnerStreakState,
  ComebackMissionDefinition,
  RetentionSnapshot,
} from './habit-retention-types'
import type { ReviewScheduleItem } from './review-scheduler-types'

import { buildStepPromptMessages } from './lesson-step-prompt-builder'
import {
  initializeLessonProgressState,
  recordLessonAttemptAndMaybeComplete,
  skipLessonStepState,
  summarizeLessonCompletion,
} from './lesson-progress-service'
import { handoffCompletedLesson } from './lesson-completion-handoff'

export type ConversationLessonRuntimeState = {
  session: LessonSession
  lesson: LessonProgressState
  steps: LessonStepProgress[]
  currentStep: LessonSessionStep | null
}

export type InitializeConversationLessonRuntimeInput = {
  session: LessonSession
  userId: string
  startedAt: string
}

export type InitializeConversationLessonRuntimeResult = {
  state: ConversationLessonRuntimeState
}

export type BuildCurrentStepPromptInput = {
  state: ConversationLessonRuntimeState
  promptAssemblyResult: PromptAssemblyResult
  learnerUtterance?: string | null
}

export type BuildCurrentStepPromptResult = ReturnType<
  typeof buildStepPromptMessages
> | null

export type SubmitCurrentStepAnswerInput = {
  state: ConversationLessonRuntimeState
  learnerUtterance?: string | null
  normalizedAnswer?: string | null
  expectedAnswer?: string | null
  quality?: 'unknown' | 'correct' | 'acceptable' | 'needs_retry'
  submittedAt: string
  markStepCompleted?: boolean
}

export type SubmitCurrentStepAnswerResult = {
  state: ConversationLessonRuntimeState
}

export type SkipCurrentStepInput = {
  state: ConversationLessonRuntimeState
  skippedAt: string
}

export type SkipCurrentStepResult = {
  state: ConversationLessonRuntimeState
}

export type FinalizeConversationLessonInput = {
  state: ConversationLessonRuntimeState
  todayDate: string
  userId: string
  completedAt: string
  mission: DailyMissionDefinition
  missionProgress: DailyMissionProgress | null
  streak: LearnerStreakState | null
  dueReviewCount?: number
}

export type FinalizeConversationLessonResult = {
  state: ConversationLessonRuntimeState
  isLessonCompleted: boolean
  reviewItems: ReviewScheduleItem[]
  mission: DailyMissionDefinition
  missionProgress: DailyMissionProgress
  streak: LearnerStreakState | null
  comeback: ComebackMissionDefinition | null
  retentionSnapshot: RetentionSnapshot
}

export function resolveCurrentStep(args: {
  session: LessonSession
  lesson: LessonProgressState
}): LessonSessionStep | null {
  const { session, lesson } = args
  if (lesson.currentStepIndex < 0) return null
  if (lesson.currentStepIndex >= session.steps.length) return null
  return session.steps[lesson.currentStepIndex] ?? null
}

export function buildConversationLessonRuntimeState(args: {
  session: LessonSession
  lesson: LessonProgressState
  steps: LessonStepProgress[]
}): ConversationLessonRuntimeState {
  const currentStep = resolveCurrentStep({
    session: args.session,
    lesson: args.lesson,
  })
  return {
    session: args.session,
    lesson: args.lesson,
    steps: args.steps,
    currentStep,
  }
}

export function initializeConversationLessonRuntime(
  input: InitializeConversationLessonRuntimeInput
): InitializeConversationLessonRuntimeResult {
  const { lesson, steps } = initializeLessonProgressState({
    session: input.session,
    userId: input.userId,
    startedAt: input.startedAt,
  })
  const state = buildConversationLessonRuntimeState({
    session: input.session,
    lesson,
    steps,
  })
  return { state }
}

export function buildCurrentStepPrompt(
  input: BuildCurrentStepPromptInput
): BuildCurrentStepPromptResult {
  if (input.state.currentStep === null) return null
  return buildStepPromptMessages({
    promptAssemblyResult: input.promptAssemblyResult,
    step: input.state.currentStep,
    learnerUtterance: input.learnerUtterance ?? null,
  })
}

export function submitCurrentStepAnswer(
  input: SubmitCurrentStepAnswerInput
): SubmitCurrentStepAnswerResult {
  if (input.state.currentStep === null) {
    return { state: input.state }
  }
  const result = recordLessonAttemptAndMaybeComplete({
    lesson: input.state.lesson,
    steps: input.state.steps,
    attemptInput: {
      lessonId: input.state.session.lessonId,
      stepId: input.state.currentStep.id,
      userId: input.state.lesson.userId,
      learnerUtterance: input.learnerUtterance ?? null,
      normalizedAnswer: input.normalizedAnswer ?? null,
      expectedAnswer:
        input.expectedAnswer ??
        input.state.currentStep.expectedAnswer ??
        null,
      quality: input.quality ?? 'unknown',
      isFinalAttempt: input.markStepCompleted === true,
      createdAt: input.submittedAt,
    },
    markCompleted: input.markStepCompleted ?? false,
    completedAt: input.submittedAt,
    completionQuality: input.quality ?? 'unknown',
  })
  const state = buildConversationLessonRuntimeState({
    session: input.state.session,
    lesson: result.lesson,
    steps: result.steps,
  })
  return { state }
}

export function skipCurrentStep(
  input: SkipCurrentStepInput
): SkipCurrentStepResult {
  if (input.state.currentStep === null) {
    return { state: input.state }
  }
  const result = skipLessonStepState({
    lesson: input.state.lesson,
    steps: input.state.steps,
    stepId: input.state.currentStep.id,
    skippedAt: input.skippedAt,
  })
  const state = buildConversationLessonRuntimeState({
    session: input.state.session,
    lesson: result.lesson,
    steps: result.steps,
  })
  return { state }
}

export function finalizeConversationLesson(
  input: FinalizeConversationLessonInput
): FinalizeConversationLessonResult {
  const handoff = handoffCompletedLesson({
    todayDate: input.todayDate,
    userId: input.userId,
    completedAt: input.completedAt,
    session: input.state.session,
    lesson: input.state.lesson,
    steps: input.state.steps,
    mission: input.mission,
    missionProgress: input.missionProgress,
    streak: input.streak,
    dueReviewCount: input.dueReviewCount,
  })
  const state = buildConversationLessonRuntimeState({
    session: input.state.session,
    lesson: { ...input.state.lesson },
    steps: [...input.state.steps],
  })
  return {
    state,
    isLessonCompleted: handoff.isLessonCompleted,
    reviewItems: handoff.reviewItems,
    mission: handoff.mission,
    missionProgress: handoff.missionProgress,
    streak: handoff.streak,
    comeback: handoff.comeback,
    retentionSnapshot: handoff.retentionSnapshot,
  }
}

export function isConversationLessonFinished(
  state: ConversationLessonRuntimeState
): boolean {
  const summary = summarizeLessonCompletion({
    lesson: state.lesson,
    steps: state.steps,
  })
  return summary.isCompleted
}
