import type {
  ReviewItemType,
  ReviewScheduleStatus,
  ReviewPerformanceRating,
  ReviewScheduleItem,
  ReviewCompletionRecord,
  BuildInitialReviewItemInput,
  UpdateReviewScheduleInput,
  ReviewQueueSnapshot,
} from './review-scheduler-types'

export type BuildInitialReviewItemResult = {
  item: ReviewScheduleItem
}

export type UpdateReviewScheduleResult = {
  item: ReviewScheduleItem
  completion: ReviewCompletionRecord
}

export function clampDifficulty(value: number | null | undefined): number {
  const n =
    value != null && typeof value === 'number' && !Number.isNaN(value)
      ? Math.floor(value)
      : 2
  if (n <= 1) return 1
  if (n >= 5) return 5
  return n
}

export function clampEaseFactor(value: number | null | undefined): number {
  const n =
    value != null && typeof value === 'number' && !Number.isNaN(value)
      ? value
      : 2.5
  if (n <= 1.3) return 1.3
  if (n >= 3) return 3
  return n
}

export function parseDateOnlyToUtcMs(date: string): number {
  try {
    const t = new Date(date + 'T00:00:00.000Z').getTime()
    return Number.isNaN(t) ? 0 : t
  } catch {
    return 0
  }
}

export function addDays(date: string, days: number): string {
  const ms = parseDateOnlyToUtcMs(date)
  if (ms === 0) return date
  const d = new Date(ms + Math.floor(days) * 86400000)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function compareDateOnly(a: string, b: string): number {
  const ma = parseDateOnlyToUtcMs(a)
  const mb = parseDateOnlyToUtcMs(b)
  if (ma < mb) return -1
  if (ma > mb) return 1
  return 0
}

export function resolveScheduleStatus(args: {
  dueDate: string
  todayDate: string
}): ReviewScheduleStatus {
  const c = compareDateOnly(args.dueDate, args.todayDate)
  if (c < 0) return 'overdue'
  if (c === 0) return 'due'
  return 'scheduled'
}

export function buildInitialIntervalDays(difficulty: number): number {
  if (difficulty <= 2) return 1
  if (difficulty <= 4) return 2
  return 3
}

function trimOrNull(s: string | null | undefined): string | null {
  const t = typeof s === 'string' ? s.trim() : ''
  return t || null
}

export function buildInitialReviewItem(
  input: BuildInitialReviewItemInput
): BuildInitialReviewItemResult {
  const difficulty = clampDifficulty(input.difficulty)
  const intervalDays = buildInitialIntervalDays(difficulty)
  const datePart = input.createdAt.slice(0, 10)
  const dueDate = addDays(datePart, intervalDays)
  const suffix =
    input.source.phraseId ??
    input.source.stepId ??
    input.createdAt
  const id = `review:${input.userId}:${input.source.lessonId}:${input.source.sourceType}:${suffix}`
  const item: ReviewScheduleItem = {
    id,
    userId: input.userId,
    itemType: input.itemType,
    source: input.source,
    promptText: trimOrNull(input.promptText) ?? '',
    expectedAnswer: trimOrNull(input.expectedAnswer),
    lastLearnerAnswer: trimOrNull(input.lastLearnerAnswer),
    difficulty,
    intervalDays,
    repetitionCount: 0,
    easeFactor: 2.5,
    dueDate,
    lastReviewedAt: null,
    status: 'new',
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
  }
  return { item }
}

export function buildNextIntervalDays(args: {
  previousIntervalDays: number
  repetitionCount: number
  rating: ReviewPerformanceRating
  easeFactor: number
}): number {
  const { previousIntervalDays, repetitionCount, rating, easeFactor } = args
  if (rating === 'again') return 1
  if (repetitionCount <= 0) {
    if (rating === 'hard') return 1
    if (rating === 'good') return 2
    return 4
  }
  if (rating === 'hard') {
    return Math.max(1, Math.floor(previousIntervalDays * 1.2))
  }
  if (rating === 'good') {
    return Math.max(1, Math.floor(previousIntervalDays * easeFactor))
  }
  return Math.max(
    1,
    Math.floor(previousIntervalDays * (easeFactor + 0.15))
  )
}

export function buildNextEaseFactor(
  currentEaseFactor: number,
  rating: ReviewPerformanceRating
): number {
  let next: number
  switch (rating) {
    case 'again':
      next = currentEaseFactor - 0.2
      break
    case 'hard':
      next = currentEaseFactor - 0.15
      break
    case 'good':
      next = currentEaseFactor
      break
    case 'easy':
      next = currentEaseFactor + 0.15
      break
    default:
      next = currentEaseFactor
  }
  return clampEaseFactor(next)
}

export function updateReviewSchedule(
  input: UpdateReviewScheduleInput
): UpdateReviewScheduleResult {
  const { item } = input
  const reviewedDate = input.reviewedAt.slice(0, 10)
  const rating = input.rating
  const nextEaseFactor = buildNextEaseFactor(item.easeFactor, rating)
  const nextRepetitionCount = rating === 'again' ? 0 : item.repetitionCount + 1
  const nextIntervalDays = buildNextIntervalDays({
    previousIntervalDays: item.intervalDays,
    repetitionCount: item.repetitionCount,
    rating,
    easeFactor: nextEaseFactor,
  })
  const nextDueDate = addDays(reviewedDate, nextIntervalDays)
  const lastLearnerAnswer =
    trimOrNull(input.learnerAnswer) ?? item.lastLearnerAnswer
  const updatedItem: ReviewScheduleItem = {
    ...item,
    lastLearnerAnswer,
    repetitionCount: nextRepetitionCount,
    easeFactor: nextEaseFactor,
    intervalDays: nextIntervalDays,
    dueDate: nextDueDate,
    lastReviewedAt: input.reviewedAt,
    status: 'completed',
    updatedAt: input.reviewedAt,
  }
  const completion: ReviewCompletionRecord = {
    id: `completion:${item.id}:${input.reviewedAt}`,
    reviewItemId: item.id,
    userId: item.userId,
    rating,
    learnerAnswer: trimOrNull(input.learnerAnswer),
    reviewedAt: input.reviewedAt,
  }
  return { item: updatedItem, completion }
}

const STATUS_ORDER: Record<ReviewScheduleStatus, number> = {
  overdue: 0,
  due: 1,
  scheduled: 2,
  new: 3,
  completed: 4,
}

export function refreshReviewScheduleStatus(
  item: ReviewScheduleItem,
  todayDate: string
): ReviewScheduleItem {
  const resolved = resolveScheduleStatus({
    dueDate: item.dueDate,
    todayDate,
  })
  let status: ReviewScheduleStatus
  if (item.status === 'completed') {
    status = resolved
  } else {
    if (item.status === 'new' && compareDateOnly(item.dueDate, todayDate) > 0) {
      status = 'new'
    } else {
      status = resolved
    }
  }
  return { ...item, status }
}

export function buildReviewQueueSnapshot(args: {
  todayDate: string
  items: ReviewScheduleItem[]
}): ReviewQueueSnapshot {
  const refreshed = args.items.map((item) =>
    refreshReviewScheduleStatus(item, args.todayDate)
  )
  const dueCount = refreshed.filter((i) => i.status === 'due').length
  const overdueCount = refreshed.filter((i) => i.status === 'overdue').length
  const sorted = [...refreshed].sort((a, b) => {
    const oa = STATUS_ORDER[a.status]
    const ob = STATUS_ORDER[b.status]
    if (oa !== ob) return oa - ob
    const cd = compareDateOnly(a.dueDate, b.dueDate)
    if (cd !== 0) return cd
    return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0
  })
  return {
    todayDate: args.todayDate,
    dueCount,
    overdueCount,
    items: sorted,
  }
}
