import type { LessonSession } from '@/lib/lesson-runner'
import type { PromptAssemblyResult } from '@/lib/prompt-assembly-types'
import type { ConversationLessonFacadeState } from '@/lib/conversation-lesson-runtime-facade'
import type { AIConversationTurnResult } from '@/lib/ai-conversation-engine-types'
import type {
  DailyMissionDefinition,
  DailyMissionProgress,
  LearnerStreakState,
} from '@/lib/habit-retention-types'

// --- Shared helper ---

async function postJson<TResponse>(
  url: string,
  body: unknown
): Promise<TResponse> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const parsed: unknown = await res.json()
  if (!res.ok) {
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'error' in parsed &&
      typeof (parsed as { error: unknown }).error === 'string'
    ) {
      throw new Error((parsed as { error: string }).error)
    }
    throw new Error(`Request failed: ${res.status}`)
  }
  return parsed as TResponse
}

// --- Local response shapes (aligned to route payloads) ---

type ConversationLessonStatus = {
  isFinished: boolean
  hasCurrentStep: boolean
  currentStepId: string | null
  currentStepType: string | null
  totalSteps: number
  completedSteps: number
  skippedSteps: number
}

type ApiError = { ok: false; error: string }

// --- Start ---

export type StartConversationLessonApiRequest = {
  session: LessonSession
  userId: string
  startedAt: string
}

export type StartConversationLessonApiResponse =
  | { ok: true; state: ConversationLessonFacadeState; status: ConversationLessonStatus }
  | ApiError

export async function startConversationLessonApi(
  body: StartConversationLessonApiRequest
): Promise<StartConversationLessonApiResponse> {
  return postJson<StartConversationLessonApiResponse>(
    '/api/conversation-lesson/start',
    body
  )
}

// --- Prompt ---

export type GetConversationLessonPromptApiRequest = {
  state: ConversationLessonFacadeState
  promptAssemblyResult: PromptAssemblyResult
  learnerUtterance?: string | null
  liveTopics?: string[]
}

export type GetConversationLessonPromptApiResponse =
  | { ok: true; turn: AIConversationTurnResult | null; status: ConversationLessonStatus }
  | ApiError

export async function getConversationLessonPromptApi(
  body: GetConversationLessonPromptApiRequest
): Promise<GetConversationLessonPromptApiResponse> {
  return postJson<GetConversationLessonPromptApiResponse>(
    '/api/conversation-lesson/prompt',
    body
  )
}

// --- Answer ---

export type SubmitConversationLessonAnswerApiRequest = {
  state: ConversationLessonFacadeState
  learnerUtterance?: string | null
  normalizedAnswer?: string | null
  expectedAnswer?: string | null
  quality?: 'unknown' | 'correct' | 'acceptable' | 'needs_retry'
  submittedAt: string
  markStepCompleted?: boolean
}

export type SubmitConversationLessonAnswerApiResponse =
  | { ok: true; state: ConversationLessonFacadeState; status: ConversationLessonStatus }
  | ApiError

export async function submitConversationLessonAnswerApi(
  body: SubmitConversationLessonAnswerApiRequest
): Promise<SubmitConversationLessonAnswerApiResponse> {
  return postJson<SubmitConversationLessonAnswerApiResponse>(
    '/api/conversation-lesson/answer',
    body
  )
}

// --- Skip ---

export type SkipConversationLessonStepApiRequest = {
  state: ConversationLessonFacadeState
  skippedAt: string
}

export type SkipConversationLessonStepApiResponse =
  | { ok: true; state: ConversationLessonFacadeState; status: ConversationLessonStatus }
  | ApiError

export async function skipConversationLessonStepApi(
  body: SkipConversationLessonStepApiRequest
): Promise<SkipConversationLessonStepApiResponse> {
  return postJson<SkipConversationLessonStepApiResponse>(
    '/api/conversation-lesson/skip',
    body
  )
}

// --- Resume ---

export type ResumeConversationLessonApiRequest = {
  userId: string
  lessonId: string
}

export type ResumeConversationLessonApiResponse =
  | {
      ok: true
      state: ConversationLessonFacadeState | null
      found: boolean
      status: ConversationLessonStatus | null
      error: null
    }
  | {
      ok: false
      error: string
    }

export async function resumeConversationLessonApi(
  body: ResumeConversationLessonApiRequest
): Promise<ResumeConversationLessonApiResponse> {
  return postJson<ResumeConversationLessonApiResponse>(
    '/api/conversation-lesson/resume',
    body
  )
}

// --- Complete ---

type CompleteConversationLessonOkPayload = {
  ok: true
  state: ConversationLessonFacadeState
  status: ConversationLessonStatus
  isLessonCompleted: boolean
  reviewItems: Array<Record<string, unknown>>
  mission: DailyMissionDefinition
  missionProgress: DailyMissionProgress
  streak: LearnerStreakState | null
  comeback: Record<string, unknown> | null
  retentionSnapshot: Record<string, unknown>
}

export type CompleteConversationLessonApiRequest = {
  state: ConversationLessonFacadeState
  todayDate: string
  userId: string
  completedAt: string
  mission: DailyMissionDefinition
  missionProgress: DailyMissionProgress | null
  streak: LearnerStreakState | null
  dueReviewCount?: number
}

export type CompleteConversationLessonApiResponse =
  | CompleteConversationLessonOkPayload
  | ApiError

export async function completeConversationLessonApi(
  body: CompleteConversationLessonApiRequest
): Promise<CompleteConversationLessonApiResponse> {
  return postJson<CompleteConversationLessonApiResponse>(
    '/api/conversation-lesson/complete',
    body
  )
}
