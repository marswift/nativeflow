export type DailyMissionType =
  | 'lesson'
  | 'review'
  | 'lesson_and_review'
  | 'free_conversation'
  | 'comeback'

export type DailyMissionStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'expired'

export type StreakStatus =
  | 'active'
  | 'frozen'
  | 'broken'

export type MotivationCardType =
  | 'streak'
  | 'review_due'
  | 'daily_goal'
  | 'comeback'
  | 'consistency'
  | 'celebration'

export interface DailyMissionDefinition {
  id: string
  userId: string
  missionDate: string
  type: DailyMissionType
  title: string
  description: string
  difficulty: number
  targetLessonId: string | null
  targetReviewCount: number
  targetConversationMinutes: number
  status: DailyMissionStatus
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface DailyMissionProgress {
  userId: string
  missionDate: string
  startedLessonCount: number
  completedLessonCount: number
  completedReviewCount: number
  freeConversationCount: number
  speakingMinutes: number
  isMissionCompleted: boolean
  updatedAt: string
}

export interface LearnerStreakState {
  userId: string
  currentStreakDays: number
  longestStreakDays: number
  lastCompletedDate: string | null
  streakStatus: StreakStatus
  freezeCount: number
  updatedAt: string
}

export interface MotivationCard {
  id: string
  userId: string
  type: MotivationCardType
  title: string
  body: string
  ctaLabel: string | null
  priority: number
  isDismissible: boolean
}

export interface ComebackMissionDefinition {
  id: string
  userId: string
  comebackDate: string
  title: string
  description: string
  suggestedLessonId: string | null
  suggestedReviewCount: number
  suggestedConversationMinutes: number
  createdAt: string
}

export interface RetentionSnapshot {
  todayDate: string
  mission: DailyMissionDefinition | null
  progress: DailyMissionProgress | null
  streak: LearnerStreakState | null
  comeback: ComebackMissionDefinition | null
  cards: MotivationCard[]
}

export interface BuildDailyMissionInput {
  userId: string
  missionDate: string
  targetLessonId?: string | null
  dueReviewCount?: number
  recommendedConversationMinutes?: number
  streakDays?: number
  comebackDays?: number
}

export interface UpdateMissionProgressInput {
  userId: string
  missionDate: string
  startedLessonDelta?: number
  completedLessonDelta?: number
  completedReviewDelta?: number
  freeConversationDelta?: number
  speakingMinutesDelta?: number
}

export interface EvaluateMissionCompletionInput {
  mission: DailyMissionDefinition
  progress: DailyMissionProgress
}

export interface EvaluateStreakInput {
  userId: string
  previous: LearnerStreakState | null
  completedDate: string
}
