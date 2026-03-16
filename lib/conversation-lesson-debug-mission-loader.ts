import type {
  DailyMissionDefinition,
  DailyMissionProgress,
} from '@/lib/habit-retention-types'

export function loadConversationLessonDebugMission(args?: {
  userId?: string
  lessonId?: string
  missionDate?: string
}): DailyMissionDefinition {
  const userId = args?.userId ?? 'u1'
  const lessonId = args?.lessonId ?? 'lesson-1'
  const missionDate = args?.missionDate ?? '2026-03-12'
  return {
    id: `mission:${userId}:${missionDate}`,
    userId,
    missionDate,
    type: 'lesson',
    title: '今日のレッスン',
    description: '今日のスピーキングレッスンを進めましょう。',
    difficulty: 2,
    targetLessonId: lessonId,
    targetReviewCount: 0,
    targetConversationMinutes: 5,
    status: 'not_started',
    completedAt: null,
    createdAt: missionDate,
    updatedAt: missionDate,
  }
}

export function loadConversationLessonDebugMissionProgress(args?: {
  userId?: string
  missionDate?: string
}): DailyMissionProgress {
  const userId = args?.userId ?? 'u1'
  const missionDate = args?.missionDate ?? '2026-03-12'
  return {
    userId,
    missionDate,
    startedLessonCount: 0,
    completedLessonCount: 0,
    completedReviewCount: 0,
    freeConversationCount: 0,
    speakingMinutes: 0,
    isMissionCompleted: false,
    updatedAt: missionDate,
  }
}
