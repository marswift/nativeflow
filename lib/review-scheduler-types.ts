export type ReviewItemType =
  | 'phrase'
  | 'pattern'
  | 'guided_output'
  | 'scene_expression'
  | 'mistake_fix'

export type ReviewScheduleStatus =
  | 'new'
  | 'scheduled'
  | 'due'
  | 'completed'
  | 'overdue'

export type ReviewPerformanceRating =
  | 'again'
  | 'hard'
  | 'good'
  | 'easy'

export interface ReviewItemSource {
  lessonId: string
  sceneId: string
  microSituationId: string | null
  stepId: string | null
  phraseId: string | null
  sourceType: ReviewItemType
}

export interface ReviewScheduleItem {
  id: string
  userId: string
  itemType: ReviewItemType
  source: ReviewItemSource
  promptText: string
  expectedAnswer: string | null
  lastLearnerAnswer: string | null
  difficulty: number
  intervalDays: number
  repetitionCount: number
  easeFactor: number
  dueDate: string
  lastReviewedAt: string | null
  status: ReviewScheduleStatus
  createdAt: string
  updatedAt: string
}

export interface ReviewCompletionRecord {
  id: string
  reviewItemId: string
  userId: string
  rating: ReviewPerformanceRating
  learnerAnswer: string | null
  reviewedAt: string
}

export interface BuildInitialReviewItemInput {
  userId: string
  itemType: ReviewItemType
  source: ReviewItemSource
  promptText: string
  expectedAnswer?: string | null
  lastLearnerAnswer?: string | null
  difficulty?: number
  createdAt: string
}

export interface UpdateReviewScheduleInput {
  item: ReviewScheduleItem
  rating: ReviewPerformanceRating
  learnerAnswer?: string | null
  reviewedAt: string
}

export interface ReviewQueueSnapshot {
  todayDate: string
  dueCount: number
  overdueCount: number
  items: ReviewScheduleItem[]
}
