'use client'

import { useCallback, useRef, useState } from 'react'
import { startLesson } from '@/lib/api/lesson-api'
import type {
  LessonStartRequest,
  LessonStartSnapshot,
} from '@/lib/lesson/lesson-api-contract'

export type ConversationLessonError = {
  code: string
  message: string
}

export type UseConversationLessonResult = {
  lesson: LessonStartSnapshot | null
  isLoading: boolean
  error: ConversationLessonError | null
  start: (request: LessonStartRequest) => Promise<void>
}

export function useConversationLesson(): UseConversationLessonResult {
  const [lesson, setLesson] = useState<LessonStartSnapshot | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<ConversationLessonError | null>(null)
  const inFlightRef = useRef(false)

  const start = useCallback(async (request: LessonStartRequest) => {
    if (inFlightRef.current) return
    setError(null)
    setLesson(null)
    setIsLoading(true)
    inFlightRef.current = true
    try {
      const response = await startLesson(request)
      if (response.ok) {
        setLesson(response.data)
        setError(null)
      } else {
        setError(response.error)
      }
    } catch {
      setError({ code: 'UNKNOWN_ERROR', message: 'Unexpected error' })
    } finally {
      setIsLoading(false)
      inFlightRef.current = false
    }
  }, [])

  return {
    lesson,
    isLoading,
    error,
    start,
  }
}
