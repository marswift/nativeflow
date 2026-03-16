import type { LessonSession } from './lesson-runner'
import type { PromptAssemblyResult } from './prompt-assembly-types'
import type {
  DailyMissionDefinition,
  DailyMissionProgress,
  LearnerStreakState,
  ComebackMissionDefinition,
  RetentionSnapshot,
} from './habit-retention-types'
import type { ReviewScheduleItem } from './review-scheduler-types'
import {
  generateAssistantTurn,
  buildAIConversationTurnResult,
  buildAIConversationPromptBundle,
} from './ai-conversation-engine'
import { setLessonStepAssistantText } from '@/lib/lesson-progress-engine'
import { persistConversationLessonRuntime } from '@/lib/conversation-lesson-runtime-persistence'
import {
  startLessonRuntime,
  getCurrentLessonStepPrompt,
  submitLessonStepAnswerController,
  skipLessonStepController,
  buildAITurnFromCurrentStep,
  completeLessonRuntime,
  getLessonRuntimeStatus,
} from './lesson-runtime-controller'

export type ConversationLessonFacadeState =
  import('./lesson-runtime-controller').LessonRuntimeControllerState

function resolveRuntimeUserId(state: ConversationLessonFacadeState): string {
  const s = state.session
  if (s && typeof s === 'object' && 'userId' in s) {
    const u = (s as { userId?: unknown }).userId
    if (typeof u === 'string' && u.trim() !== '') return u.trim()
  }
  return 'unknown'
}

export type StartConversationLessonFacadeInput = {
  session: LessonSession
  userId: string
  startedAt: string
}

export type StartConversationLessonFacadeResult = {
  state: ConversationLessonFacadeState
  status: ReturnType<typeof getLessonRuntimeStatus>
}

export type GetConversationLessonPromptInput = {
  state: ConversationLessonFacadeState
  promptAssemblyResult: PromptAssemblyResult
  learnerUtterance?: string | null
}

export type GetConversationLessonPromptResult = {
  prompt: ReturnType<typeof getCurrentLessonStepPrompt>
  status: ReturnType<typeof getLessonRuntimeStatus>
}

export type SubmitConversationLessonAnswerInput = {
  state: ConversationLessonFacadeState
  learnerUtterance?: string | null
  normalizedAnswer?: string | null
  expectedAnswer?: string | null
  quality?: 'unknown' | 'correct' | 'acceptable' | 'needs_retry'
  submittedAt: string
  markStepCompleted?: boolean
}

export type SubmitConversationLessonAnswerResult = {
  state: ConversationLessonFacadeState
  status: ReturnType<typeof getLessonRuntimeStatus>
}

export type SkipConversationLessonStepInput = {
  state: ConversationLessonFacadeState
  skippedAt: string
}

export type SkipConversationLessonStepResult = {
  state: ConversationLessonFacadeState
  status: ReturnType<typeof getLessonRuntimeStatus>
}

export type BuildConversationLessonAITurnInput = {
  state: ConversationLessonFacadeState
  promptAssemblyResult: PromptAssemblyResult
  assistantText: string
  assistantStatus?: 'ready' | 'needs_retry' | 'completed' | 'error'
  assistantSsml?: string | null
  learnerUtterance?: string | null
  expectedAnswer?: string | null
}

export type BuildConversationLessonAITurnResult = {
  turn: ReturnType<typeof buildAITurnFromCurrentStep>['turn']
  status: ReturnType<typeof getLessonRuntimeStatus>
}

export type FinalizeConversationLessonFacadeInput = {
  state: ConversationLessonFacadeState
  todayDate: string
  userId: string
  completedAt: string
  mission: DailyMissionDefinition
  missionProgress: DailyMissionProgress | null
  streak: LearnerStreakState | null
  dueReviewCount?: number
}

export type FinalizeConversationLessonFacadeResult = {
  state: ConversationLessonFacadeState
  status: ReturnType<typeof getLessonRuntimeStatus>
  isLessonCompleted: boolean
  reviewItems: ReviewScheduleItem[]
  mission: DailyMissionDefinition
  missionProgress: DailyMissionProgress
  streak: LearnerStreakState | null
  comeback: ComebackMissionDefinition | null
  retentionSnapshot: RetentionSnapshot
}

export async function startConversationLessonFacade(
  input: StartConversationLessonFacadeInput
): Promise<StartConversationLessonFacadeResult> {
  const { state } = startLessonRuntime(input)
  const status = getLessonRuntimeStatus(state)
  await persistConversationLessonRuntime({ state, userId: input.userId })
  return { state, status }
}

export function getConversationLessonPrompt(
  input: GetConversationLessonPromptInput
): GetConversationLessonPromptResult {
  const prompt = getCurrentLessonStepPrompt(input)
  const status = getLessonRuntimeStatus(input.state)
  return { prompt, status }
}

export type GenerateConversationLessonAITurnInput = GetConversationLessonPromptInput

export type GenerateConversationLessonAITurnResult = BuildConversationLessonAITurnResult

export async function generateConversationLessonAITurn(
  input: GenerateConversationLessonAITurnInput
): Promise<GenerateConversationLessonAITurnResult> {
  const { prompt: stepPromptResult, status } = getConversationLessonPrompt(input)
  if (stepPromptResult === null) {
    return { turn: null, status }
  }
  const promptBundle = buildAIConversationPromptBundle({
    stepPromptResult,
  })
  const learnerUtteranceTrimmed =
    input.learnerUtterance != null && typeof input.learnerUtterance === 'string'
      ? input.learnerUtterance.trim()
      : ''
  const assistantReply = await generateAssistantTurn({
    systemPrompt: promptBundle.systemPrompt,
    userMessage: promptBundle.userPrompt,
    ...(learnerUtteranceTrimmed !== ''
      ? {
          conversationHistory: [
            { role: 'user' as const, content: learnerUtteranceTrimmed },
          ],
        }
      : {}),
  })
  const turnResult = buildAIConversationTurnResult({
    stepPromptResult,
    assistantText: assistantReply.text,
    assistantStatus: assistantReply.status,
    learnerUtterance: input.learnerUtterance ?? null,
    expectedAnswer: stepPromptResult.metadata.expectedAnswer ?? null,
    assistantSsml: assistantReply.ssml ?? null,
  })
  const stepId = input.state.currentStep?.id
  if (stepId != null) {
    input.state.steps = setLessonStepAssistantText({
      steps: input.state.steps,
      stepId,
      assistantText: assistantReply.text,
    })
  }
  await persistConversationLessonRuntime({
    state: input.state,
    userId: resolveRuntimeUserId(input.state),
  })
  return {
    turn: turnResult,
    status: getLessonRuntimeStatus(input.state),
  }
}

export async function submitConversationLessonAnswer(
  input: SubmitConversationLessonAnswerInput
): Promise<SubmitConversationLessonAnswerResult> {
  const { state } = submitLessonStepAnswerController(input)
  const status = getLessonRuntimeStatus(state)
  await persistConversationLessonRuntime({
    state,
    userId: resolveRuntimeUserId(state),
  })
  return { state, status }
}

export async function skipConversationLessonStep(
  input: SkipConversationLessonStepInput
): Promise<SkipConversationLessonStepResult> {
  const { state } = skipLessonStepController(input)
  const status = getLessonRuntimeStatus(state)
  await persistConversationLessonRuntime({
    state,
    userId: resolveRuntimeUserId(state),
  })
  return { state, status }
}

export function buildConversationLessonAITurn(
  input: BuildConversationLessonAITurnInput
): BuildConversationLessonAITurnResult {
  const { turn } = buildAITurnFromCurrentStep(input)
  const status = getLessonRuntimeStatus(input.state)
  return { turn, status }
}

export async function finalizeConversationLessonFacade(
  input: FinalizeConversationLessonFacadeInput
): Promise<FinalizeConversationLessonFacadeResult> {
  const result = completeLessonRuntime(input)
  const status = getLessonRuntimeStatus(result.state)
  await persistConversationLessonRuntime({
    state: result.state,
    userId: input.userId,
    completedAt: input.completedAt,
  })
  return {
    state: result.state,
    status,
    isLessonCompleted: result.isLessonCompleted,
    reviewItems: result.reviewItems,
    mission: result.mission,
    missionProgress: result.missionProgress,
    streak: result.streak,
    comeback: result.comeback,
    retentionSnapshot: result.retentionSnapshot,
  }
}

export function getConversationLessonStepSummary(
  state: ConversationLessonFacadeState
): {
  currentStepId: string | null
  currentStepType: string | null
  totalSteps: number
  completedSteps: number
  skippedSteps: number
  isFinished: boolean
} {
  const status = getLessonRuntimeStatus(state)
  return {
    currentStepId: status.currentStepId,
    currentStepType: status.currentStepType,
    totalSteps: status.totalSteps,
    completedSteps: status.completedSteps,
    skippedSteps: status.skippedSteps,
    isFinished: status.isFinished,
  }
}
