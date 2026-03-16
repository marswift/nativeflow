export type LessonProgressStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'abandoned'

export type LessonStepProgressStatus =
  | 'locked'
  | 'available'
  | 'completed'
  | 'skipped'

export type LearnerAnswerQuality =
  | 'unknown'
  | 'correct'
  | 'acceptable'
  | 'needs_retry'

export interface LessonStepAttempt {
  id: string
  lessonId: string
  stepId: string
  userId: string
  attemptIndex: number
  learnerUtterance: string | null
  normalizedAnswer: string | null
  expectedAnswer: string | null
  quality: LearnerAnswerQuality
  isFinalAttempt: boolean
  createdAt: string
}

export interface LessonStepProgress {
  lessonId: string
  stepId: string
  orderIndex: number
  type: string
  status: LessonStepProgressStatus
  startedAt: string | null
  completedAt: string | null
  skippedAt: string | null
  attemptCount: number
  bestQuality: LearnerAnswerQuality
  lastLearnerAnswer: string | null
  lastAssistantText?: string | null
}

export interface LessonProgressState {
  lessonId: string
  sceneId: string
  microSituationId: string
  userId: string
  status: LessonProgressStatus
  currentStepIndex: number
  totalStepCount: number
  startedAt: string
  completedAt: string | null
  lastActivityAt: string
  completedStepCount: number
  skippedStepCount: number
  totalAttemptCount: number
}

export interface LessonProgressSnapshot {
  lesson: LessonProgressState
  steps: LessonStepProgress[]
}

export interface InitializeLessonProgressInput {
  lessonId: string
  sceneId: string
  microSituationId: string
  userId: string
  stepCount: number
  stepTypes: string[]
  startedAt: string
}

export interface RecordLessonAttemptInput {
  lessonId: string
  stepId: string
  userId: string
  learnerUtterance?: string | null
  normalizedAnswer?: string | null
  expectedAnswer?: string | null
  quality?: LearnerAnswerQuality
  isFinalAttempt?: boolean
  createdAt: string
}

export interface CompleteLessonStepInput {
  lesson: LessonProgressState
  steps: LessonStepProgress[]
  stepId: string
  completedAt: string
  quality?: LearnerAnswerQuality
  learnerAnswer?: string | null
}

export interface SkipLessonStepInput {
  lesson: LessonProgressState
  steps: LessonStepProgress[]
  stepId: string
  skippedAt: string
}
