import type { UserProfileRow } from './types'
import type { CurrentLevel, PreferredSessionLength } from './constants'

/** MVP block types: conversation, review, typing */
export type LessonBlockType = 'conversation' | 'review' | 'typing'

export type LessonBlockItem = {
  id: string
  prompt: string
  /** Optional so draft session items (answer: string | null) are assignable. */
  answer?: string | null
  sceneLabel?: string | null
}

export type LessonBlock = {
  id: string
  type: LessonBlockType
  title: string
  description: string
  estimatedMinutes: number
  items: LessonBlockItem[]
}

export type LessonSession = {
  /** Optional so mapped draft session (no id at root) is assignable; engine can add id when needed. */
  id?: string
  theme: string
  level: CurrentLevel
  totalEstimatedMinutes: number
  blocks: LessonBlock[]
}