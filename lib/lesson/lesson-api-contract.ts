/**
 * Shared API contract types for lesson endpoints.
 * API routes and clients use these; facade returns compatible shapes.
 */

import type {
  ConversationTurn,
  Phrase,
  Scene,
} from '@/lib/lesson/lesson-types'
import type { LessonRuntimeStateWithLesson } from '@/lib/lesson/lesson-runtime'

export type LessonStartRequest = {
  lessonId: string
}

export type LessonStartSnapshot = {
  status: LessonRuntimeStateWithLesson['status']
  scene: Scene | null
  phrase: Phrase | null
  turns: ConversationTurn[]
  isCompleted: boolean
}

export type LessonStartResponse =
  | { ok: true; data: LessonStartSnapshot }
  | { ok: false; error: { code: string; message: string } }

export type LessonTurnRequest = {
  state: LessonRuntimeStateWithLesson
  turn: ConversationTurn
  advancePhrase?: boolean
  advanceScene?: boolean
  completedAt?: string
}

export type LessonTurnResponse =
  | { ok: true; data: { state: LessonRuntimeStateWithLesson; snapshot: LessonStartSnapshot } }
  | { ok: false; error: { code: string; message: string } }
