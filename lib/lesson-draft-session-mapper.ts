/**
 * Temporary mapper: adapts the Hybrid-C blueprint draft to the lesson engine session shape.
 * ai_conversation is mapped to conversation until the stable engine supports it.
 * Pure logic only; no React, Supabase, or OpenAI.
 */

import type { CurrentLevel } from './constants'
import type {
  LessonBlueprintDraft,
  LessonBlueprintDraftBlock,
  LessonBlueprintDraftItem,
  ScaffoldStep,
  SemanticChunk,
} from './lesson-blueprint-adapter'

export type LessonDraftSessionItem = {
  id: string
  prompt: string
  answer: string | null
  nativeHint: string | null
  mixHint: string | null
  aiQuestionText: string | null
  scaffold_steps: string[] | null
  structured_scaffold_steps: ScaffoldStep[] | null
  semantic_chunks: SemanticChunk[] | null
  image_url: string | null
  typing_variations: string[] | null
}

export type DraftSessionBlockType = 'conversation' | 'review' | 'typing'

export type LessonDraftSessionBlock = {
  id: string
  type: DraftSessionBlockType
  title: string
  description: string
  estimatedMinutes: number
  items: LessonDraftSessionItem[]
  image_prompt: string | null
  sceneId: string | null
  sceneCategory: string | null
  region: string | null
  ageGroup: string | null
}

export type LessonDraftSession = {
  theme: string
  level: CurrentLevel
  totalEstimatedMinutes: number
  blocks: LessonDraftSessionBlock[]
}

function createBlockId(
  lessonId: string,
  blockIndex: number
): string {
  return `${lessonId}-block-${blockIndex + 1}`
}

function createItemId(
  lessonId: string,
  blockIndex: number,
  itemIndex: number
): string {
  return `${lessonId}-block-${blockIndex + 1}-item-${itemIndex + 1}`
}

function mapDraftItemToSessionItem(
  item: LessonBlueprintDraftItem,
  lessonId: string,
  blockIndex: number,
  itemIndex: number
): LessonDraftSessionItem {
  return {
    id: createItemId(lessonId, blockIndex, itemIndex),
    prompt: item.prompt,
    answer: item.answer,
    nativeHint: item.nativeHint ?? null,
    mixHint: item.mixHint ?? null,
    aiQuestionText: item.aiQuestionText ?? null,
    scaffold_steps: item.scaffold_steps ?? null,
    structured_scaffold_steps: item.structured_scaffold_steps ?? null,
    semantic_chunks: item.semantic_chunks ?? null,
    image_url: item.image_url ?? null,
    typing_variations: item.typing_variations ?? null,
  }
}

function mapDraftBlockToSessionBlock(
  block: LessonBlueprintDraftBlock,
  lessonId: string,
  blockIndex: number
): LessonDraftSessionBlock {
  return {
    id: createBlockId(lessonId, blockIndex),
    type: mapDraftBlockType(block.type),
    title: block.title,
    description: block.description,
    estimatedMinutes: block.estimatedMinutes,
    items: block.items.map((item, itemIndex) =>
      mapDraftItemToSessionItem(item, lessonId, blockIndex, itemIndex)
    ),
    image_prompt: block.image_prompt ?? null,
    sceneId: block.sceneId ?? null,
    sceneCategory: block.sceneCategory ?? null,
    region: block.region ?? null,
    ageGroup: block.ageGroup ?? null,
  }
}

export function createLessonDraftSession(
  draft: LessonBlueprintDraft,
  level: CurrentLevel
): LessonDraftSession {
const lessonId =
  draft.theme && draft.theme.trim() !== ''
    ? draft.theme
    : 'lesson'

  const blocks = draft.blocks.map((block, i) =>
    mapDraftBlockToSessionBlock(block, lessonId, i)
  )

  const totalEstimatedMinutes = blocks.reduce(
    (sum, b) => sum + b.estimatedMinutes,
    0
  )

  return {
    theme: draft.theme,
    level,
    totalEstimatedMinutes,
    blocks,
  }
}

function mapDraftBlockType(
  type: LessonBlueprintDraftBlock['type']
): DraftSessionBlockType {
  if (type === 'ai_conversation') return 'conversation'
  return type
}