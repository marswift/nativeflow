'use client'

import { useCallback, useMemo, useState } from 'react'
import type { LessonSession } from '@/lib/lesson-runner'
import type { PromptAssemblyResult } from '@/lib/prompt-assembly-types'
import type { ConversationLessonFacadeState } from '@/lib/conversation-lesson-runtime-facade'
import type {
  DailyMissionDefinition,
  DailyMissionProgress,
  LearnerStreakState,
} from '@/lib/habit-retention-types'
import {
  startConversationLessonApi,
  getConversationLessonPromptApi,
  submitConversationLessonAnswerApi,
  skipConversationLessonStepApi,
  completeConversationLessonApi,
  resumeConversationLessonApi,
} from '@/lib/conversation-lesson-api-client'
import type {
  StartConversationLessonApiResponse,
  GetConversationLessonPromptApiResponse,
  SubmitConversationLessonAnswerApiResponse,
  SkipConversationLessonStepApiResponse,
  CompleteConversationLessonApiResponse,
} from '@/lib/conversation-lesson-api-client'

type StartConversationLessonApiOk = Extract<
  StartConversationLessonApiResponse,
  { ok: true }
>
type GetConversationLessonPromptApiOk = Extract<
  GetConversationLessonPromptApiResponse,
  { ok: true }
>
type SubmitConversationLessonAnswerApiOk = Extract<
  SubmitConversationLessonAnswerApiResponse,
  { ok: true }
>
type SkipConversationLessonStepApiOk = Extract<
  SkipConversationLessonStepApiResponse,
  { ok: true }
>
type CompleteConversationLessonApiOk = Extract<
  CompleteConversationLessonApiResponse,
  { ok: true }
>

type StatusType = StartConversationLessonApiOk['status']
type PromptType = GetConversationLessonPromptApiOk['turn']

const initialState = {
  state: null as ConversationLessonFacadeState | null,
  status: null as StatusType | null,
  prompt: null as PromptType | null,
  loading: false,
  error: null as string | null,
  lastCompletionResult: null as CompleteConversationLessonApiOk | null,
}

export type UseConversationLessonStartParams = {
  session: LessonSession
  userId: string
  startedAt: string
}

export type UseConversationLessonFetchPromptParams = {
  state: ConversationLessonFacadeState
  promptAssemblyResult: PromptAssemblyResult
  learnerUtterance?: string | null
  liveTopics?: string[]
}

export type UseConversationLessonSubmitAnswerParams = {
  state: ConversationLessonFacadeState
  learnerUtterance?: string | null
  normalizedAnswer?: string | null
  expectedAnswer?: string | null
  quality?: 'unknown' | 'correct' | 'acceptable' | 'needs_retry'
  submittedAt: string
  markStepCompleted?: boolean
}

export type UseConversationLessonSkipStepParams = {
  state: ConversationLessonFacadeState
  skippedAt: string
}

export type UseConversationLessonResumeParams = {
  userId: string
  lessonId: string
}

export type UseConversationLessonCompleteParams = {
  state: ConversationLessonFacadeState
  todayDate: string
  userId: string
  completedAt: string
  mission: DailyMissionDefinition
  missionProgress: DailyMissionProgress | null
  streak: LearnerStreakState | null
  dueReviewCount?: number
}

export type UseConversationLessonReturn = {
  state: ConversationLessonFacadeState | null
  status: StatusType | null
  prompt: PromptType | null
  loading: boolean
  error: string | null
  lastCompletionResult: CompleteConversationLessonApiOk | null
  hasState: boolean
  isFinished: boolean
  hasPrompt: boolean
  startLesson: (params: UseConversationLessonStartParams) => Promise<void>
  fetchPrompt: (params: UseConversationLessonFetchPromptParams) => Promise<void>
  submitAnswer: (params: UseConversationLessonSubmitAnswerParams) => Promise<void>
  skipStep: (params: UseConversationLessonSkipStepParams) => Promise<void>
  resumeLesson: (params: UseConversationLessonResumeParams) => Promise<void>
  completeLesson: (params: UseConversationLessonCompleteParams) => Promise<void>
  reset: () => void
}

export function useConversationLesson(): UseConversationLessonReturn {
  const [state, setState] = useState<ConversationLessonFacadeState | null>(
    initialState.state
  )
  const [status, setStatus] = useState<StatusType | null>(initialState.status)
  const [prompt, setPrompt] = useState<PromptType | null>(initialState.prompt)
  const [loading, setLoading] = useState(initialState.loading)
  const [error, setError] = useState<string | null>(initialState.error)
  const [lastCompletionResult, setLastCompletionResult] = useState<
    CompleteConversationLessonApiOk | null
  >(initialState.lastCompletionResult)

  const startLesson = useCallback(
    async (params: UseConversationLessonStartParams) => {
      setLoading(true)
      setError(null)
      try {
        const res = await startConversationLessonApi(params)
        if (res.ok) {
          setState(res.state)
          setStatus(res.status)
          setPrompt(null)
          setLastCompletionResult(null)
        } else {
          setError(res.error)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unexpected error')
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const fetchPrompt = useCallback(
    async (params: UseConversationLessonFetchPromptParams) => {
      setLoading(true)
      setError(null)
      try {
        const res = await getConversationLessonPromptApi(params)
        if (res.ok) {
          setPrompt(res.turn)
          setStatus(res.status)
        } else {
          setError(res.error)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unexpected error')
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const submitAnswer = useCallback(
    async (params: UseConversationLessonSubmitAnswerParams) => {
      setLoading(true)
      setError(null)
      try {
        const res = await submitConversationLessonAnswerApi(params)
        if (res.ok) {
          setState(res.state)
          setStatus(res.status)
          setPrompt(null)
        } else {
          setError(res.error)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unexpected error')
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const skipStep = useCallback(
    async (params: UseConversationLessonSkipStepParams) => {
      setLoading(true)
      setError(null)
      try {
        const res = await skipConversationLessonStepApi(params)
        if (res.ok) {
          setState(res.state)
          setStatus(res.status)
          setPrompt(null)
        } else {
          setError(res.error)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unexpected error')
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const resumeLesson = useCallback(
    async (params: UseConversationLessonResumeParams) => {
      setLoading(true)
      setError(null)
      try {
        const res = await resumeConversationLessonApi(params)
        if (res.ok) {
          setState(res.state)
          setStatus(res.status)
          setPrompt(null)
        } else {
          setError(res.error)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unexpected error')
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const completeLesson = useCallback(
    async (params: UseConversationLessonCompleteParams) => {
      setLoading(true)
      setError(null)
      try {
        const res = await completeConversationLessonApi(params)
        if (res.ok) {
          setState(res.state)
          setStatus(res.status)
          setLastCompletionResult(res)
        } else {
          setError(res.error)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unexpected error')
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const reset = useCallback(() => {
    setState(initialState.state)
    setStatus(initialState.status)
    setPrompt(initialState.prompt)
    setLoading(initialState.loading)
    setError(initialState.error)
    setLastCompletionResult(initialState.lastCompletionResult)
  }, [])

  const hasState = useMemo(() => state !== null, [state])
  const isFinished = useMemo(
    () => (status !== null ? status.isFinished : false),
    [status]
  )
  const hasPrompt = useMemo(() => prompt !== null, [prompt])

  return useMemo(
    () => ({
      state,
      status,
      prompt,
      loading,
      error,
      lastCompletionResult,
      hasState,
      isFinished,
      hasPrompt,
      startLesson,
      fetchPrompt,
      submitAnswer,
      skipStep,
      resumeLesson,
      completeLesson,
      reset,
    }),
    [
      state,
      status,
      prompt,
      loading,
      error,
      lastCompletionResult,
      hasState,
      isFinished,
      hasPrompt,
      startLesson,
      fetchPrompt,
      submitAnswer,
      skipStep,
      resumeLesson,
      completeLesson,
      reset,
    ]
  )
}
