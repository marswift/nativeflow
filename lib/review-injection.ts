/**
 * Review block injection into lesson sessions.
 * Fetches due review items, converts them to LessonBlocks,
 * and injects them into the lesson block array.
 *
 * BOUNDARY: This module bridges review-domain and lesson-domain.
 * It must NOT import from lesson-runtime-engine or UI components.
 * Future social/gamification features must NOT be added here.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { LessonBlock, LessonSession } from './lesson-engine'
import { getDueReviewItems, type ReviewItemRow } from './review-items-repository'

const MAX_REVIEW_BLOCKS = 3
const INJECT_AFTER_INDEX = 1 // inject after the first 2 normal blocks (index 0 and 1)
const DEFAULT_REVIEW_LIMIT = 5

export type ReviewItemWithContent = {
  reviewItem: ReviewItemRow
  promptText: string
  expectedAnswer: string | null
}

/**
 * Fetches due review items and joins with lesson_run_items to get content.
 * Returns items that have valid content (prompt text).
 */
export async function fetchReviewItemsWithContent(
  supabase: SupabaseClient,
  userId: string,
  limit = DEFAULT_REVIEW_LIMIT
): Promise<ReviewItemWithContent[]> {
  const { data: reviewItems, error } = await getDueReviewItems(supabase, userId, limit)

  if (error || !reviewItems || reviewItems.length === 0) {
    return []
  }

  const lessonItemIds = reviewItems.map((r) => r.lesson_item_id)

  const { data: runItems, error: runItemsError } = await supabase
    .from('lesson_run_items')
    .select('id, prompt_text, expected_answer_text')
    .in('id', lessonItemIds)

  if (runItemsError || !runItems) {
    return []
  }

  const contentMap = new Map<string, { prompt_text: string; expected_answer_text: string | null }>(
    runItems.map((item: { id: string; prompt_text: string; expected_answer_text: string | null }) => [
      item.id,
      item,
    ])
  )

  return reviewItems
    .map((reviewItem) => {
      const content = contentMap.get(reviewItem.lesson_item_id)
      if (!content || !content.prompt_text) return null

      return {
        reviewItem,
        promptText: content.prompt_text,
        expectedAnswer: content.expected_answer_text,
      }
    })
    .filter((r): r is ReviewItemWithContent => r !== null)
}

/**
 * Converts a review item with content into a LessonBlock.
 * Block id encodes the review_item id for downstream scoring.
 */
function reviewItemToBlock(source: ReviewItemWithContent): LessonBlock {
  return {
    id: `review-${source.reviewItem.id}`,
    type: 'review',
    title: 'Review',
    description: source.promptText,
    estimatedMinutes: 1,
    items: [
      {
        id: `review-${source.reviewItem.id}`,
        prompt: source.promptText,
        answer: source.expectedAnswer ?? null,
      },
    ],
  }
}

/**
 * Injects review blocks into a lesson session's block array.
 *
 * Rules:
 * - Max 3 review blocks per lesson
 * - Inserted after the first 2 normal blocks, interleaved with remaining
 * - No injection if sources is empty
 * - Malformed items are silently skipped
 */
export function injectReviewBlocks(
  session: LessonSession,
  sources: ReviewItemWithContent[]
): LessonSession {
  if (sources.length === 0) return session

  const reviewBlocks = sources
    .slice(0, MAX_REVIEW_BLOCKS)
    .map(reviewItemToBlock)

  if (reviewBlocks.length === 0) return session

  const blocks = [...session.blocks]
  const result: LessonBlock[] = []
  let reviewIdx = 0

  for (let i = 0; i < blocks.length; i++) {
    result.push(blocks[i])

    if (i >= INJECT_AFTER_INDEX && reviewIdx < reviewBlocks.length) {
      result.push(reviewBlocks[reviewIdx++])
    }
  }

  // Append remaining review blocks if fewer normal blocks than expected
  while (reviewIdx < reviewBlocks.length) {
    result.push(reviewBlocks[reviewIdx++])
  }

  return { ...session, blocks: result }
}

/**
 * Extracts the review_item id from a review block's id.
 * Returns null if the block is not a review block.
 */
export function extractReviewItemId(blockId: string): string | null {
  if (!blockId.startsWith('review-')) return null
  const id = blockId.slice('review-'.length)
  return id || null
}

/**
 * Returns true if a runtime block id belongs to a review block.
 */
export function isReviewBlock(blockId: string): boolean {
  return blockId.startsWith('review-')
}
