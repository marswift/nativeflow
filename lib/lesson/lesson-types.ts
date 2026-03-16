/**
 * Strict domain types for the NativeFlow lesson engine.
 * Life-simulation, phrase-centered, scene-based; conversation-first with future review/story support.
 * No runtime logic, no DB, no UI.
 */
import type { CefrLevel } from '@/lib/platform-language-config'

// ——— Id types (string aliases) ———
export type LessonId = string
export type SceneId = string
export type PhraseId = string
export type ConversationTurnId = string
export type ReviewItemId = string

// ——— Language codes (lesson-content domain; not runtime compatibility gates) ———
export type TargetLanguageCode = string
export type SupportLanguageCode = string

// ——— Lesson status ———
export const LESSON_STATUSES = ['draft', 'published', 'archived'] as const
export type LessonStatus = (typeof LESSON_STATUSES)[number]

// ——— Conversation speaker ———
export const CONVERSATION_SPEAKERS = ['user', 'assistant'] as const
export type ConversationSpeaker = (typeof CONVERSATION_SPEAKERS)[number]

// ——— Scene classification (future story/runtime expansion) ———
export type SceneKind =
  | 'intro'
  | 'practice'
  | 'conversation'
  | 'review'
  | 'outro'

// ——— Core entities ———

export type Lesson = {
  id: LessonId
  slug: string
  title: string
  description: string
  /** Lesson-content language codes; domain values, not current runtime gates. */
  targetLanguage: TargetLanguageCode
  supportLanguage: SupportLanguageCode
  cefrLevel: CefrLevel | null
  status: LessonStatus
  scenes: Scene[]
}

export type Scene = {
  id: SceneId
  lessonId: LessonId
  kind: SceneKind
  key: string
  title: string
  description: string
  order: number
  phrases: Phrase[]
}

export type Phrase = {
  id: PhraseId
  sceneId: SceneId
  text: string
  translation: string
  hint: string | null
  order: number
  imageUrl: string | null
  imagePrompt: string | null
}

export type ConversationTurn = {
  id: ConversationTurnId
  sceneId: SceneId
  phraseId: PhraseId | null
  speaker: ConversationSpeaker
  text: string
  translation: string | null
  order: number
}

export type ReviewItem = {
  id: ReviewItemId
  lessonId: LessonId
  sceneId: SceneId
  phraseId: PhraseId
  /** ISO datetime string. */
  nextReviewAt: string
  reviewIntervalDays: number
  correctCount: number
  incorrectCount: number
}
