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
  /** Resolved image URL for this item's scene. Populated by image generation layer. */
  image_url?: string | null
}

export type LessonBlock = {
  id: string
  type: LessonBlockType
  title: string
  description: string
  estimatedMinutes: number
  items: LessonBlockItem[]
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