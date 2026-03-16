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
} from './lesson-blueprint-adapter'

export type LessonDraftSessionItem = {
  id: string
  prompt: string
  answer: string | null
}

type DraftSessionBlockType = 'conversation' | 'review' | 'typing'

export type LessonDraftSessionBlock = {
  id: string
  type: DraftSessionBlockType
  title: string
  description: string
  estimatedMinutes: number
  items: LessonDraftSessionItem[]
}

export type LessonDraftSession = {
  theme: string
  level: CurrentLevel
  totalEstimatedMinutes: number
  blocks: LessonDraftSessionBlock[]
}

function createBlockId(blockIndex: number): string {
  return `block-${blockIndex + 1}`
}

function createItemId(blockIndex: number, itemIndex: number): string {
  return `block-${blockIndex + 1}-item-${itemIndex + 1}`
}

function mapDraftBlockType(
  type: LessonBlueprintDraftBlock['type']
): DraftSessionBlockType {
  if (type === 'ai_conversation') return 'conversation'
  return type
}

function mapDraftItemToSessionItem(
  item: LessonBlueprintDraftItem,
  blockIndex: number,
  itemIndex: number
): LessonDraftSessionItem {
  return {
    id: createItemId(blockIndex, itemIndex),
    prompt: item.prompt,
    answer: item.answer,
  }
}

function mapDraftBlockToSessionBlock(
  block: LessonBlueprintDraftBlock,
  blockIndex: number
): LessonDraftSessionBlock {
  return {
    id: createBlockId(blockIndex),
    type: mapDraftBlockType(block.type),
    title: block.title,
    description: block.description,
    estimatedMinutes: block.estimatedMinutes,
    items: block.items.map((item, itemIndex) =>
      mapDraftItemToSessionItem(item, blockIndex, itemIndex)
    ),
  }
}

/**
 * Builds a lesson engine–compatible session from a blueprint draft.
 * Preserves block order; ai_conversation becomes conversation.
 */
export function createLessonDraftSession(
  draft: LessonBlueprintDraft,
  level: CurrentLevel
): LessonDraftSession {
  const blocks = draft.blocks.map((block, i) => mapDraftBlockToSessionBlock(block, i))
  const totalEstimatedMinutes = blocks.reduce((sum, b) => sum + b.estimatedMinutes, 0)

  return {
    theme: draft.theme,
    level,
    totalEstimatedMinutes,
    blocks,
  }
}
