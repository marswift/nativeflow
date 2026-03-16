import type {
  DailyMissionDefinition,
  DailyMissionProgress,
  LearnerStreakState,
  ComebackMissionDefinition,
  RetentionSnapshot,
  BuildDailyMissionInput,
  UpdateMissionProgressInput,
} from './habit-retention-types'

import {
  buildDailyMission,
  buildEmptyMissionProgress,
  updateMissionProgress,
  applyMissionCompletion,
  evaluateStreak,
  buildComebackMission,
  buildRetentionSnapshot,
  toPositiveInt,
} from './habit-retention-engine'

export type InitializeRetentionStateInput = {
  todayDate: string
  missionInput: BuildDailyMissionInput
  existingProgress?: DailyMissionProgress | null
  existingStreak?: LearnerStreakState | null
  suggestedLessonId?: string | null
  dueReviewCount?: number
}

export type InitializeRetentionStateResult = {
  mission: DailyMissionDefinition
  progress: DailyMissionProgress
  streak: LearnerStreakState | null
  comeback: ComebackMissionDefinition | null
  snapshot: RetentionSnapshot
}

export type ApplyRetentionProgressInput = {
  todayDate: string
  mission: DailyMissionDefinition
  progress: DailyMissionProgress | null
  streak: LearnerStreakState | null
  progressInput: UpdateMissionProgressInput
  suggestedLessonId?: string | null
  dueReviewCount?: number
}

export type ApplyRetentionProgressResult = {
  mission: DailyMissionDefinition
  progress: DailyMissionProgress
  streak: LearnerStreakState | null
  comeback: ComebackMissionDefinition | null
  snapshot: RetentionSnapshot
}

export function initializeRetentionState(
  input: InitializeRetentionStateInput
): InitializeRetentionStateResult {
  const mission = buildDailyMission(input.missionInput)
  const progress =
    input.existingProgress ??
    buildEmptyMissionProgress({
      userId: mission.userId,
      missionDate: mission.missionDate,
    })
  const comeback = buildComebackMission({
    userId: mission.userId,
    todayDate: input.todayDate,
    comebackDays: toPositiveInt(input.missionInput.comebackDays),
    suggestedLessonId: input.suggestedLessonId ?? mission.targetLessonId,
    dueReviewCount: input.dueReviewCount ?? input.missionInput.dueReviewCount,
  })
  const streak = input.existingStreak ?? null
  const snapshot = buildRetentionSnapshot({
    todayDate: input.todayDate,
    mission,
    progress,
    streak,
    comeback,
    dueReviewCount: input.dueReviewCount ?? input.missionInput.dueReviewCount,
  })
  return {
    mission,
    progress,
    streak,
    comeback,
    snapshot,
  }
}

export function applyRetentionProgress(
  input: ApplyRetentionProgressInput
): ApplyRetentionProgressResult {
  const nextProgress = updateMissionProgress(
    input.progress,
    input.progressInput
  )
  const { mission: nextMission, progress: updatedProgress } =
    applyMissionCompletion(input.mission, nextProgress)

  const nextStreak =
    nextMission.status === 'completed'
      ? evaluateStreak({
          userId: nextMission.userId,
          previous: input.streak,
          completedDate: input.todayDate,
        })
      : input.streak

  const comeback =
    nextMission.status === 'completed'
      ? null
      : buildComebackMission({
          userId: nextMission.userId,
          todayDate: input.todayDate,
          comebackDays: 0,
          suggestedLessonId: input.suggestedLessonId ?? nextMission.targetLessonId,
          dueReviewCount: input.dueReviewCount,
        })

  const snapshot = buildRetentionSnapshot({
    todayDate: input.todayDate,
    mission: nextMission,
    progress: updatedProgress,
    streak: nextStreak,
    comeback,
    dueReviewCount: input.dueReviewCount,
  })

  return {
    mission: nextMission,
    progress: updatedProgress,
    streak: nextStreak,
    comeback,
    snapshot,
  }
}

export function rebuildRetentionSnapshot(args: {
  todayDate: string
  mission: DailyMissionDefinition | null
  progress: DailyMissionProgress | null
  streak: LearnerStreakState | null
  comeback: ComebackMissionDefinition | null
  dueReviewCount?: number
}): RetentionSnapshot {
  return buildRetentionSnapshot(args)
}
