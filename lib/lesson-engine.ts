/**
 * Core lesson data types — shared contract between generation, runtime, and persistence.
 * STABLE: Changes here affect the entire lesson pipeline. Add fields carefully.
 */
import type { CurrentLevel } from './constants'
import type { ScaffoldStep, SemanticChunk } from './lesson-blueprint-adapter'

/** MVP block types: conversation, review, scaffold_transition, typing */
export type LessonBlockType =
  | 'conversation'
  | 'review'
  | 'scaffold_transition'
  | 'typing'

export type LessonBlockItem = {
  id: string
  prompt: string
  answer?: string | null
  scaffold_steps?: string[] | null
  structured_scaffold_steps?: ScaffoldStep[] | null
  semantic_chunks?: SemanticChunk[] | null
  nativeHint?: string | null
  mixHint?: string | null
  aiQuestionText?: string | null
  /** Pre-authored comprehension choices. When present, bypasses regex-based choice generation. */
  aiQuestionChoices?: { label: string; isCorrect: boolean }[] | null
  /** Resolved image URL for this item's scene. Populated by image generation layer. */
  image_url?: string | null
  /** Audio generation result. 'ok' = generated, 'fallback' = reused/degraded, 'failed' = unavailable. */
  audio_status?: 'ok' | 'fallback' | 'failed'
  /** Additional typing answers from scene variations for diverse typing prompts. */
  typing_variations?: string[] | null
  /** Related expressions network for scene expansion. */
  related_expressions?: { en: string; ja: string; category: string }[] | null
  /** TTS-specific text override for correct pronunciation. Falls back to answer/prompt if absent. */
  ttsText?: string | null
  /** TTS-specific text for native language hint. Falls back to nativeHint if absent. */
  nativeHintTts?: string | null
}

export type LessonBlock = {
  id: string
  type: LessonBlockType
  title: string
  description: string
  estimatedMinutes: number
  items: LessonBlockItem[]
  /** Scene key (e.g. 'wake_up'). Used by the image resolver. */
  sceneId?: string | null
  /** Scene category (e.g. 'daily-flow'). Used by the image resolver. */
  sceneCategory?: string | null

  /** Region for conversation variation (e.g. 'en_us_general'). */
  region?: string | null

  /** Age group for conversation flavor (e.g. '20s'). */
  ageGroup?: string | null

  /** Prompt for image generation (not yet used for actual generation). */
  image_prompt?: string | null
}

export type LessonSession = {
  /** Optional so mapped draft session (no id at root) is assignable; engine can add id when needed. */
  id?: string
  theme: string
  level: CurrentLevel
  totalEstimatedMinutes: number
  blocks: LessonBlock[]
}