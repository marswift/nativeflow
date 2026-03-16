import type {
  DailyMissionDefinition,
  DailyMissionProgress,
  LearnerStreakState,
} from './habit-retention-types'
import {
  toPositiveInt,
  clampDifficulty,
  buildDailyMissionType,
  buildDailyMission,
  buildEmptyMissionProgress,
  updateMissionProgress,
  evaluateMissionCompletion,
  applyMissionCompletion,
  diffDays,
  evaluateStreak,
  buildComebackMission,
  buildMotivationCards,
  buildRetentionSnapshot,
} from './habit-retention-engine'
import {
  initializeRetentionState,
  applyRetentionProgress,
  rebuildRetentionSnapshot,
} from './habit-retention-service'

export type HabitRetentionCheckResult = {
  name: string
  passed: boolean
  details: string
}

export function buildMockMission(): DailyMissionDefinition {
  return {
    id: 'mission:u1:2026-03-12',
    userId: 'u1',
    missionDate: '2026-03-12',
    type: 'lesson',
    title: '今日のレッスン',
    description: '今日のスピーキングレッスンを進めましょう。',
    difficulty: 2,
    targetLessonId: 'lesson-1',
    targetReviewCount: 0,
    targetConversationMinutes: 5,
    status: 'not_started',
    completedAt: null,
    createdAt: '2026-03-12',
    updatedAt: '2026-03-12',
  }
}

export function buildMockProgress(): DailyMissionProgress {
  return {
    userId: 'u1',
    missionDate: '2026-03-12',
    startedLessonCount: 0,
    completedLessonCount: 0,
    completedReviewCount: 0,
    freeConversationCount: 0,
    speakingMinutes: 0,
    isMissionCompleted: false,
    updatedAt: '2026-03-12',
  }
}

export function buildMockStreak(): LearnerStreakState {
  return {
    userId: 'u1',
    currentStreakDays: 5,
    longestStreakDays: 7,
    lastCompletedDate: '2026-03-11',
    streakStatus: 'active',
    freezeCount: 1,
    updatedAt: '2026-03-11',
  }
}

export function checkToPositiveInt(): HabitRetentionCheckResult {
  const a = toPositiveInt(3.9) === 3
  const b = toPositiveInt(-1, 2) === 2
  const c = toPositiveInt(undefined, 4) === 4
  const passed = a && b && c
  return {
    name: 'checkToPositiveInt',
    passed,
    details: passed
      ? 'floor 3.9=3, negative uses fallback 2, undefined uses fallback 4'
      : `a=${a}, b=${b}, c=${c}`,
  }
}

export function checkClampDifficulty(): HabitRetentionCheckResult {
  const a = clampDifficulty(0) === 1
  const b = clampDifficulty(3) === 3
  const c = clampDifficulty(9) === 5
  const passed = a && b && c
  return {
    name: 'checkClampDifficulty',
    passed,
    details: passed
      ? '0=>1, 3=>3, 9=>5'
      : `a=${a}, b=${b}, c=${c}`,
  }
}

export function checkBuildDailyMissionType(): HabitRetentionCheckResult {
  const comeback = buildDailyMissionType({
    dueReviewCount: 0,
    recommendedConversationMinutes: 0,
    comebackDays: 3,
  }) === 'comeback'
  const lessonAndReview = buildDailyMissionType({
    dueReviewCount: 2,
    recommendedConversationMinutes: 5,
    comebackDays: 0,
  }) === 'lesson_and_review'
  const review = buildDailyMissionType({
    dueReviewCount: 2,
    recommendedConversationMinutes: 1,
    comebackDays: 0,
  }) === 'review'
  const lesson = buildDailyMissionType({
    dueReviewCount: 0,
    recommendedConversationMinutes: 5,
    comebackDays: 0,
  }) === 'lesson'
  const freeConv = buildDailyMissionType({
    dueReviewCount: 0,
    recommendedConversationMinutes: 3,
    comebackDays: 0,
  }) === 'free_conversation'
  const passed = comeback && lessonAndReview && review && lesson && freeConv
  return {
    name: 'checkBuildDailyMissionType',
    passed,
    details: passed
      ? 'comeback, lesson_and_review, review, lesson, free_conversation'
      : `comeback=${comeback}, lesson_and_review=${lessonAndReview}, review=${review}, lesson=${lesson}, free_conversation=${freeConv}`,
  }
}

export function checkBuildDailyMission(): HabitRetentionCheckResult {
  const mission = buildDailyMission({
    userId: 'u1',
    missionDate: '2026-03-12',
    targetLessonId: 'lesson-1',
    dueReviewCount: 2,
    recommendedConversationMinutes: 5,
    streakDays: 10,
    comebackDays: 0,
  })
  const passed =
    mission.type === 'lesson_and_review' &&
    mission.targetReviewCount === 2 &&
    mission.targetConversationMinutes === 5 &&
    mission.status === 'not_started'
  return {
    name: 'checkBuildDailyMission',
    passed,
    details: passed
      ? 'type lesson_and_review, targetReviewCount 2, targetConversationMinutes 5, not_started'
      : `type=${mission.type}, targetReviewCount=${mission.targetReviewCount}, targetConversationMinutes=${mission.targetConversationMinutes}, status=${mission.status}`,
  }
}

export function checkBuildEmptyMissionProgress(): HabitRetentionCheckResult {
  const progress = buildEmptyMissionProgress({
    userId: 'u1',
    missionDate: '2026-03-12',
  })
  const passed =
    progress.startedLessonCount === 0 &&
    progress.completedLessonCount === 0 &&
    progress.completedReviewCount === 0 &&
    progress.freeConversationCount === 0 &&
    progress.speakingMinutes === 0 &&
    progress.isMissionCompleted === false
  return {
    name: 'checkBuildEmptyMissionProgress',
    passed,
    details: passed
      ? 'all counters 0, isMissionCompleted false'
      : `completedLessonCount=${progress.completedLessonCount}, isMissionCompleted=${progress.isMissionCompleted}`,
  }
}

export function checkUpdateMissionProgress(): HabitRetentionCheckResult {
  const progress = updateMissionProgress(buildMockProgress(), {
    userId: 'u1',
    missionDate: '2026-03-12',
    completedLessonDelta: 1,
    speakingMinutesDelta: 5,
  })
  const passed =
    progress.completedLessonCount === 1 && progress.speakingMinutes === 5
  return {
    name: 'checkUpdateMissionProgress',
    passed,
    details: passed
      ? 'completedLessonCount 1, speakingMinutes 5'
      : `completedLessonCount=${progress.completedLessonCount}, speakingMinutes=${progress.speakingMinutes}`,
  }
}

export function checkEvaluateMissionCompletionLesson(): HabitRetentionCheckResult {
  const mission = buildMockMission()
  const progress = updateMissionProgress(buildMockProgress(), {
    userId: 'u1',
    missionDate: '2026-03-12',
    completedLessonDelta: 1,
  })
  const result = evaluateMissionCompletion({ mission, progress }) === true
  return {
    name: 'checkEvaluateMissionCompletionLesson',
    passed: result,
    details: result
      ? 'lesson mission with completedLessonCount 1 => true'
      : 'evaluateMissionCompletion did not return true',
  }
}

export function checkApplyMissionCompletionCompleted(): HabitRetentionCheckResult {
  const mission = buildMockMission()
  const progress = updateMissionProgress(buildMockProgress(), {
    userId: 'u1',
    missionDate: '2026-03-12',
    completedLessonDelta: 1,
  })
  const { mission: nextMission, progress: nextProgress } = applyMissionCompletion(
    mission,
    progress
  )
  const passed =
    nextMission.status === 'completed' &&
    nextProgress.isMissionCompleted === true &&
    nextMission.completedAt != null
  return {
    name: 'checkApplyMissionCompletionCompleted',
    passed,
    details: passed
      ? 'mission.status completed, progress.isMissionCompleted true, completedAt set'
      : `status=${nextMission.status}, isMissionCompleted=${nextProgress.isMissionCompleted}, completedAt=${nextMission.completedAt != null}`,
  }
}

export function checkDiffDays(): HabitRetentionCheckResult {
  const a = diffDays('2026-03-11', '2026-03-12') === 1
  const b = diffDays('2026-03-10', '2026-03-12') === 2
  const passed = a && b
  return {
    name: 'checkDiffDays',
    passed,
    details: passed
      ? '11->12 = 1 day, 10->12 = 2 days'
      : `a=${a}, b=${b}`,
  }
}

export function checkEvaluateStreakNextDay(): HabitRetentionCheckResult {
  const previous = buildMockStreak()
  const result = evaluateStreak({
    userId: 'u1',
    previous,
    completedDate: '2026-03-12',
  })
  const passed =
    result.currentStreakDays === 6 &&
    result.longestStreakDays === 7 &&
    result.freezeCount === 1 &&
    result.streakStatus === 'active'
  return {
    name: 'checkEvaluateStreakNextDay',
    passed,
    details: passed
      ? 'currentStreakDays 6, longest 7, freezeCount 1, active'
      : `currentStreakDays=${result.currentStreakDays}, longestStreakDays=${result.longestStreakDays}, freezeCount=${result.freezeCount}, streakStatus=${result.streakStatus}`,
  }
}

export function checkEvaluateStreakWithFreeze(): HabitRetentionCheckResult {
  const previous: LearnerStreakState = {
    ...buildMockStreak(),
    lastCompletedDate: '2026-03-10',
  }
  const result = evaluateStreak({
    userId: 'u1',
    previous,
    completedDate: '2026-03-12',
  })
  const passed =
    result.currentStreakDays === 6 &&
    result.freezeCount === 0 &&
    result.streakStatus === 'active'
  return {
    name: 'checkEvaluateStreakWithFreeze',
    passed,
    details: passed
      ? 'gap 2 with freeze: currentStreakDays 6, freezeCount 0, active'
      : `currentStreakDays=${result.currentStreakDays}, freezeCount=${result.freezeCount}, streakStatus=${result.streakStatus}`,
  }
}

export function checkBuildComebackMission(): HabitRetentionCheckResult {
  const comeback = buildComebackMission({
    userId: 'u1',
    todayDate: '2026-03-12',
    comebackDays: 4,
  })
  const passed =
    comeback != null && comeback.suggestedConversationMinutes === 3
  return {
    name: 'checkBuildComebackMission',
    passed,
    details: passed
      ? 'comeback non-null, suggestedConversationMinutes 3'
      : `comeback=${comeback != null}, suggestedConversationMinutes=${comeback?.suggestedConversationMinutes}`,
  }
}

export function checkBuildMotivationCards(): HabitRetentionCheckResult {
  const cards = buildMotivationCards({
    userId: 'u1',
    mission: buildMockMission(),
    progress: buildMockProgress(),
    streak: buildMockStreak(),
    comeback: null,
    dueReviewCount: 2,
  })
  const types = cards.map((c) => c.type)
  const hasDailyGoal = types.includes('daily_goal')
  const hasReviewDue = types.includes('review_due')
  const hasStreak = types.includes('streak')
  const passed = hasDailyGoal && hasReviewDue && hasStreak
  return {
    name: 'checkBuildMotivationCards',
    passed,
    details: passed
      ? 'contains daily_goal, review_due, streak'
      : `types=[${types.join(', ')}]`,
  }
}

export function checkBuildRetentionSnapshot(): HabitRetentionCheckResult {
  const snapshot = buildRetentionSnapshot({
    todayDate: '2026-03-12',
    mission: buildMockMission(),
    progress: buildMockProgress(),
    streak: buildMockStreak(),
    comeback: null,
  })
  const passed =
    snapshot.todayDate === '2026-03-12' && snapshot.cards.length >= 1
  return {
    name: 'checkBuildRetentionSnapshot',
    passed,
    details: passed
      ? 'todayDate matches, cards.length >= 1'
      : `todayDate=${snapshot.todayDate}, cards.length=${snapshot.cards.length}`,
  }
}

export function checkInitializeRetentionState(): HabitRetentionCheckResult {
  const result = initializeRetentionState({
    todayDate: '2026-03-12',
    missionInput: {
      userId: 'u1',
      missionDate: '2026-03-12',
      targetLessonId: 'lesson-1',
      dueReviewCount: 1,
      recommendedConversationMinutes: 5,
      streakDays: 3,
      comebackDays: 0,
    },
  })
  const passed =
    result.mission.userId === 'u1' &&
    result.progress.userId === 'u1' &&
    result.snapshot.todayDate === '2026-03-12'
  return {
    name: 'checkInitializeRetentionState',
    passed,
    details: passed
      ? 'mission.userId u1, progress.userId u1, snapshot.todayDate 2026-03-12'
      : `mission.userId=${result.mission.userId}, progress.userId=${result.progress.userId}, snapshot.todayDate=${result.snapshot.todayDate}`,
  }
}

export function checkApplyRetentionProgress(): HabitRetentionCheckResult {
  const initial = initializeRetentionState({
    todayDate: '2026-03-12',
    missionInput: {
      userId: 'u1',
      missionDate: '2026-03-12',
      targetLessonId: 'lesson-1',
      dueReviewCount: 0,
      recommendedConversationMinutes: 5,
      streakDays: 3,
      comebackDays: 0,
    },
  })
  const result = applyRetentionProgress({
    todayDate: '2026-03-12',
    mission: initial.mission,
    progress: initial.progress,
    streak: initial.streak,
    progressInput: {
      userId: 'u1',
      missionDate: '2026-03-12',
      completedLessonDelta: 1,
      speakingMinutesDelta: 5,
    },
  })
  const passed =
    result.mission.status === 'completed' &&
    result.progress.isMissionCompleted === true &&
    result.streak !== null
  return {
    name: 'checkApplyRetentionProgress',
    passed,
    details: passed
      ? 'mission completed, progress.isMissionCompleted true, streak set'
      : `mission.status=${result.mission.status}, isMissionCompleted=${result.progress.isMissionCompleted}, streak=${result.streak != null}`,
  }
}

export function checkRebuildRetentionSnapshot(): HabitRetentionCheckResult {
  const snapshot = rebuildRetentionSnapshot({
    todayDate: '2026-03-12',
    mission: buildMockMission(),
    progress: buildMockProgress(),
    streak: buildMockStreak(),
    comeback: null,
  })
  const passed =
    snapshot.todayDate === '2026-03-12' && snapshot.cards.length >= 1
  return {
    name: 'checkRebuildRetentionSnapshot',
    passed,
    details: passed
      ? 'snapshot.todayDate 2026-03-12, cards.length >= 1'
      : `todayDate=${snapshot.todayDate}, cards.length=${snapshot.cards.length}`,
  }
}

export function runAllHabitRetentionChecks(): HabitRetentionCheckResult[] {
  return [
    checkToPositiveInt(),
    checkClampDifficulty(),
    checkBuildDailyMissionType(),
    checkBuildDailyMission(),
    checkBuildEmptyMissionProgress(),
    checkUpdateMissionProgress(),
    checkEvaluateMissionCompletionLesson(),
    checkApplyMissionCompletionCompleted(),
    checkDiffDays(),
    checkEvaluateStreakNextDay(),
    checkEvaluateStreakWithFreeze(),
    checkBuildComebackMission(),
    checkBuildMotivationCards(),
    checkBuildRetentionSnapshot(),
    checkInitializeRetentionState(),
    checkApplyRetentionProgress(),
    checkRebuildRetentionSnapshot(),
  ]
}
