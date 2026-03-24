import type { PromptAssemblyResult } from './prompt-assembly-types'
import type {
  ConversationLessonRuntimeState,
  InitializeConversationLessonRuntimeInput,
  FinalizeConversationLessonInput,
} from './conversation-lesson-runtime'
import type {
  DailyMissionDefinition,
  DailyMissionProgress,
  LearnerStreakState,
  ComebackMissionDefinition,
  RetentionSnapshot,
} from './habit-retention-types'
import type { ReviewScheduleItem } from './review-scheduler-types'
import type { AIConversationTurnResult } from './ai-conversation-engine-types'

import {
  initializeConversationLessonRuntime,
  buildCurrentStepPrompt,
  submitCurrentStepAnswer,
  skipCurrentStep,
  finalizeConversationLesson,
  isConversationLessonFinished,
} from './conversation-lesson-runtime'
import { setLessonStepAssistantText } from './lesson-progress-engine'
import { buildAIConversationTurnResult } from './ai-conversation-engine'

export type LessonRuntimeControllerState = ConversationLessonRuntimeState

export type StartLessonRuntimeResult = {
  state: LessonRuntimeControllerState
}

export type GetCurrentLessonStepPromptInput = {
  state: LessonRuntimeControllerState
  promptAssemblyResult: PromptAssemblyResult
  learnerUtterance?: string | null
}

export type GetCurrentLessonStepPromptResult = ReturnType<
  typeof buildCurrentStepPrompt
>

export type SubmitLessonStepAnswerInput = {
  state: LessonRuntimeControllerState
  learnerUtterance?: string | null
  normalizedAnswer?: string | null
  expectedAnswer?: string | null
  quality?: 'unknown' | 'correct' | 'acceptable' | 'needs_retry'
  submittedAt: string
  markStepCompleted?: boolean
}

export type SubmitLessonStepAnswerResult = {
  state: LessonRuntimeControllerState
}

export type SkipLessonStepControllerInput = {
  state: LessonRuntimeControllerState
  skippedAt: string
}

export type SkipLessonStepControllerResult = {
  state: LessonRuntimeControllerState
}

export type BuildAITurnFromCurrentStepInput = {
  state: LessonRuntimeControllerState
  promptAssemblyResult: PromptAssemblyResult
  assistantText: string
  assistantStatus?: 'ready' | 'needs_retry' | 'completed' | 'error'
  assistantSsml?: string | null
  learnerUtterance?: string | null
  expectedAnswer?: string | null
}

export type BuildAITurnFromCurrentStepResult = {
  state: LessonRuntimeControllerState
  turn: AIConversationTurnResult | null
}

export type CompleteLessonRuntimeInput = {
  state: LessonRuntimeControllerState
  todayDate: string
  userId: string
  completedAt: string
  mission: DailyMissionDefinition
  missionProgress: DailyMissionProgress | null
  streak: LearnerStreakState | null
  dueReviewCount?: number
}

export type CompleteLessonRuntimeResult = {
  state: LessonRuntimeControllerState
  isLessonCompleted: boolean
  reviewItems: ReviewScheduleItem[]
  mission: DailyMissionDefinition
  missionProgress: DailyMissionProgress
  streak: LearnerStreakState | null
  comeback: ComebackMissionDefinition | null
  retentionSnapshot: RetentionSnapshot
}

export type LessonRuntimeStatus = {
  isFinished: boolean
  hasCurrentStep: boolean
  currentStepId: string | null
  currentStepType: string | null
  totalSteps: number
  completedSteps: number
  skippedSteps: number
}

export function startLessonRuntime(
  input: InitializeConversationLessonRuntimeInput
): StartLessonRuntimeResult {
  const result = initializeConversationLessonRuntime(input)
  return { state: result.state }
}

export function getCurrentLessonStepPrompt(
  input: GetCurrentLessonStepPromptInput
): GetCurrentLessonStepPromptResult {
  return buildCurrentStepPrompt({
    state: input.state,
    promptAssemblyResult: input.promptAssemblyResult,
    learnerUtterance: input.learnerUtterance,
  })
}

export function submitLessonStepAnswerController(
  input: SubmitLessonStepAnswerInput
): SubmitLessonStepAnswerResult {
  const result = submitCurrentStepAnswer({
    state: input.state,
    learnerUtterance: input.learnerUtterance,
    normalizedAnswer: input.normalizedAnswer,
    expectedAnswer: input.expectedAnswer,
    quality: input.quality,
    submittedAt: input.submittedAt,
    markStepCompleted: input.markStepCompleted,
  })
  return { state: result.state }
}

export function skipLessonStepController(
  input: SkipLessonStepControllerInput
): SkipLessonStepControllerResult {
  const result = skipCurrentStep({
    state: input.state,
    skippedAt: input.skippedAt,
  })
  return { state: result.state }
}

export function buildAITurnFromCurrentStep(
  input: BuildAITurnFromCurrentStepInput
): BuildAITurnFromCurrentStepResult {
  const promptResult = buildCurrentStepPrompt({
    state: input.state,
    promptAssemblyResult: input.promptAssemblyResult,
    learnerUtterance: input.learnerUtterance,
  })

  if (promptResult === null) {
    return { state: input.state, turn: null }
  }

  const turn = buildAIConversationTurnResult({
    stepPromptResult: promptResult,
    assistantText: input.assistantText,
    assistantStatus: input.assistantStatus,
    assistantSsml: input.assistantSsml,
    learnerUtterance: input.learnerUtterance,
    expectedAnswer: input.expectedAnswer,
  })

  const stepId = input.state.currentStep?.id
  const nextState =
    stepId == null
      ? input.state
      : {
          ...input.state,
          steps: setLessonStepAssistantText({
            steps: input.state.steps,
            stepId,
            assistantText: input.assistantText,
          }),
        }

  return { state: nextState, turn }
}

export function completeLessonRuntime(
  input: CompleteLessonRuntimeInput
): CompleteLessonRuntimeResult {
  const finalizeInput: FinalizeConversationLessonInput = {
    state: input.state,
    todayDate: input.todayDate,
    userId: input.userId,
    completedAt: input.completedAt,
    mission: input.mission,
    missionProgress: input.missionProgress,
    streak: input.streak,
    dueReviewCount: input.dueReviewCount,
  }
  return finalizeConversationLesson(finalizeInput)
}

export function getLessonRuntimeStatus(
  state: LessonRuntimeControllerState
): LessonRuntimeStatus {
  const isFinished = isConversationLessonFinished(state)
  const hasCurrentStep = state.currentStep !== null
  const currentStepId = state.currentStep?.id ?? null
  const currentStepType = state.currentStep?.type ?? null
  const totalSteps = state.steps.length
  const completedSteps = state.steps.filter((s) => s.status === 'completed').length
  const skippedSteps = state.steps.filter((s) => s.status === 'skipped').length
  return {
    isFinished,
    hasCurrentStep,
    currentStepId,
    currentStepType,
    totalSteps,
    completedSteps,
    skippedSteps,
  }
}
