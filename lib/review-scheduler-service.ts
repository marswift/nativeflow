import type {
  ReviewScheduleItem,
  ReviewCompletionRecord,
  BuildInitialReviewItemInput,
  UpdateReviewScheduleInput,
  ReviewQueueSnapshot,
} from './review-scheduler-types'

import {
  buildInitialReviewItem,
  updateReviewSchedule,
  buildReviewQueueSnapshot,
} from './review-scheduler-engine'

export type BuildInitialReviewItemsInput = {
  items: BuildInitialReviewItemInput[]
}

export type BuildInitialReviewItemsResult = {
  items: ReviewScheduleItem[]
}

export type ApplyReviewCompletionInput = {
  item: ReviewScheduleItem
  rating: UpdateReviewScheduleInput['rating']
  learnerAnswer?: string | null
  reviewedAt: string
}

export type ApplyReviewCompletionResult = {
  item: ReviewScheduleItem
  completion: ReviewCompletionRecord
}

export type BuildReviewQueueStateInput = {
  todayDate: string
  items: ReviewScheduleItem[]
}

export type BuildReviewQueueStateResult = {
  snapshot: ReviewQueueSnapshot
}

export function buildInitialReviewItems(
  input: BuildInitialReviewItemsInput
): BuildInitialReviewItemsResult {
  const items = input.items.map((single) =>
    buildInitialReviewItem(single).item
  )
  return { items }
}

export function applyReviewCompletion(
  input: ApplyReviewCompletionInput
): ApplyReviewCompletionResult {
  const result = updateReviewSchedule({
    item: input.item,
    rating: input.rating,
    learnerAnswer: input.learnerAnswer,
    reviewedAt: input.reviewedAt,
  })
  return { item: result.item, completion: result.completion }
}

export function applyReviewCompletionToList(args: {
  items: ReviewScheduleItem[]
  reviewItemId: string
  rating: UpdateReviewScheduleInput['rating']
  learnerAnswer?: string | null
  reviewedAt: string
}): {
  items: ReviewScheduleItem[]
  completion: ReviewCompletionRecord | null
} {
  const index = args.items.findIndex((i) => i.id === args.reviewItemId)
  if (index < 0) {
    return { items: [...args.items], completion: null }
  }
  const result = applyReviewCompletion({
    item: args.items[index],
    rating: args.rating,
    learnerAnswer: args.learnerAnswer,
    reviewedAt: args.reviewedAt,
  })
  const items = [...args.items]
  items[index] = result.item
  return { items, completion: result.completion }
}

export function buildReviewQueueState(
  input: BuildReviewQueueStateInput
): BuildReviewQueueStateResult {
  const snapshot = buildReviewQueueSnapshot({
    todayDate: input.todayDate,
    items: input.items,
  })
  return { snapshot }
}
