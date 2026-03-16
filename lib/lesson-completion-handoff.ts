import type { LessonSession } from './lesson-runner'
import type {
  LessonProgressState,
  LessonStepProgress,
} from './lesson-progress-types'
import type { ReviewScheduleItem } from './review-scheduler-types'
import type {
  DailyMissionDefinition,
  DailyMissionProgress,
  LearnerStreakState,
  ComebackMissionDefinition,
  RetentionSnapshot,
} from './habit-retention-types'

import { summarizeLessonCompletion } from './lesson-progress-service'
import { buildLessonReviewBridgeResult } from './lesson-review-bridge'
import { applyRetentionProgress } from './habit-retention-service'

export type LessonCompletionHandoffInput = {
  todayDate: string
  userId: string
  completedAt: string
  session: LessonSession
  lesson: LessonProgressState
  steps: LessonStepProgress[]
  mission: DailyMissionDefinition
  missionProgress: DailyMissionProgress | null
  streak: LearnerStreakState | null
  dueReviewCount?: number
}

export type LessonCompletionHandoffResult = {
  isLessonCompleted: boolean
  reviewItems: ReviewScheduleItem[]
  mission: DailyMissionDefinition
  missionProgress: DailyMissionProgress
  streak: LearnerStreakState | null
  comeback: ComebackMissionDefinition | null
  retentionSnapshot: RetentionSnapshot
}

export function buildLessonCompletionProgressDelta(args: {
  userId: string
  missionDate: string
  lessonCompleted: boolean
  speakingMinutes: number
}): {
  userId: string
  missionDate: string
  startedLessonDelta: number
  completedLessonDelta: number
  completedReviewDelta: number
  freeConversationDelta: number
  speakingMinutesDelta: number
} {
  return {
    userId: args.userId,
    missionDate: args.missionDate,
    startedLessonDelta: 0,
    completedLessonDelta: args.lessonCompleted ? 1 : 0,
    completedReviewDelta: 0,
    freeConversationDelta: 0,
    speakingMinutesDelta: Math.max(0, Math.floor(args.speakingMinutes)),
  }
}

export function estimateLessonSpeakingMinutes(args: {
  session: LessonSession
  lesson: LessonProgressState
  steps: LessonStepProgress[]
}): number {
  if (args.session.estimatedMinutes > 0) {
    return Math.floor(args.session.estimatedMinutes)
  }
  const base = args.steps.filter(
    (s) => s.status === 'completed' || s.status === 'skipped'
  ).length
  return Math.max(1, base)
}

export function handoffCompletedLesson(
  input: LessonCompletionHandoffInput
): LessonCompletionHandoffResult {
  const summary = summarizeLessonCompletion({
    lesson: input.lesson,
    steps: input.steps,
  })
  const speakingMinutes = estimateLessonSpeakingMinutes({
    session: input.session,
    lesson: input.lesson,
    steps: input.steps,
  })

  if (!summary.isCompleted) {
    const progressDelta = buildLessonCompletionProgressDelta({
      userId: input.userId,
      missionDate: input.mission.missionDate,
      lessonCompleted: false,
      speakingMinutes,
    })
    const retention = applyRetentionProgress({
      todayDate: input.todayDate,
      mission: input.mission,
      progress: input.missionProgress,
      streak: input.streak,
      progressInput: progressDelta,
      suggestedLessonId: input.session.lessonId,
      dueReviewCount: input.dueReviewCount,
    })
    return {
      isLessonCompleted: false,
      reviewItems: [],
      mission: retention.mission,
      missionProgress: retention.progress,
      streak: retention.streak,
      comeback: retention.comeback,
      retentionSnapshot: retention.snapshot,
    }
  }

  const bridge = buildLessonReviewBridgeResult({
    userId: input.userId,
    completedAt: input.completedAt,
    session: input.session,
    lesson: input.lesson,
    steps: input.steps,
  })
  const progressDelta = buildLessonCompletionProgressDelta({
    userId: input.userId,
    missionDate: input.mission.missionDate,
    lessonCompleted: true,
    speakingMinutes,
  })
  const retention = applyRetentionProgress({
    todayDate: input.todayDate,
    mission: input.mission,
    progress: input.missionProgress,
    streak: input.streak,
    progressInput: progressDelta,
    suggestedLessonId: input.session.lessonId,
    dueReviewCount: input.dueReviewCount,
  })
  return {
    isLessonCompleted: true,
    reviewItems: bridge.reviewItems,
    mission: retention.mission,
    missionProgress: retention.progress,
    streak: retention.streak,
    comeback: retention.comeback,
    retentionSnapshot: retention.snapshot,
  }
}
