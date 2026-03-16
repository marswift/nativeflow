import type {
  DailyMissionDefinition,
  DailyMissionProgress,
  LearnerStreakState,
  MotivationCard,
  ComebackMissionDefinition,
  RetentionSnapshot,
  BuildDailyMissionInput,
  UpdateMissionProgressInput,
  EvaluateMissionCompletionInput,
  EvaluateStreakInput,
  DailyMissionType,
} from './habit-retention-types'

export function toPositiveInt(
  value: number | null | undefined,
  fallback = 0
): number {
  if (value == null || typeof value !== 'number' || Number.isNaN(value)) {
    return fallback >= 0 ? Math.floor(fallback) : 0
  }
  const n = Math.floor(value)
  return n >= 0 ? n : fallback >= 0 ? Math.floor(fallback) : 0
}

export function clampDifficulty(
  value: number | null | undefined
): number {
  const n = value != null && typeof value === 'number' && !Number.isNaN(value)
    ? Math.floor(value)
    : 2
  if (n <= 1) return 1
  if (n >= 5) return 5
  return n
}

export function buildDailyMissionType(args: {
  dueReviewCount: number
  recommendedConversationMinutes: number
  comebackDays: number
}): DailyMissionType {
  const { dueReviewCount, recommendedConversationMinutes, comebackDays } = args
  if (comebackDays >= 3) return 'comeback'
  if (dueReviewCount > 0 && recommendedConversationMinutes >= 3) return 'lesson_and_review'
  if (dueReviewCount > 0) return 'review'
  if (recommendedConversationMinutes >= 5) return 'lesson'
  return 'free_conversation'
}

export function buildDailyMission(input: BuildDailyMissionInput): DailyMissionDefinition {
  const dueReviewCount = toPositiveInt(input.dueReviewCount)
  const recommendedConversationMinutes = toPositiveInt(input.recommendedConversationMinutes, 3)
  const comebackDays = toPositiveInt(input.comebackDays)
  const streakDays = toPositiveInt(input.streakDays)

  const type = buildDailyMissionType({
    dueReviewCount,
    recommendedConversationMinutes,
    comebackDays,
  })

  const targetReviewCount = Math.max(0, dueReviewCount)
  const targetConversationMinutes = Math.max(3, recommendedConversationMinutes || 3)

  let difficulty: number
  let title: string
  let description: string
  switch (type) {
    case 'comeback':
      difficulty = 1
      title = 'もう一度はじめよう'
      description = '短くやって感覚を取り戻しましょう。'
      break
    case 'review':
      difficulty = 2
      title = '今日の復習'
      description = '期限が来ている表現を復習しましょう。'
      break
    case 'lesson':
      difficulty = streakDays >= 14 ? 3 : 2
      title = '今日のレッスン'
      description = '今日のスピーキングレッスンを進めましょう。'
      break
    case 'lesson_and_review':
      difficulty = streakDays >= 14 ? 3 : 2
      title = '今日のレッスンと復習'
      description = 'レッスンと復習をバランスよく進めましょう。'
      break
    case 'free_conversation':
      difficulty = 2
      title = '今日の会話練習'
      description = '短い会話で英語を口に出しましょう。'
      break
    default:
      difficulty = 2
      title = '今日のレッスン'
      description = '今日のスピーキングレッスンを進めましょう。'
  }

  return {
    id: `mission:${input.userId}:${input.missionDate}`,
    userId: input.userId,
    missionDate: input.missionDate,
    type,
    title,
    description,
    difficulty,
    targetLessonId: input.targetLessonId ?? null,
    targetReviewCount,
    targetConversationMinutes,
    status: 'not_started',
    completedAt: null,
    createdAt: input.missionDate,
    updatedAt: input.missionDate,
  }
}

export function buildEmptyMissionProgress(args: {
  userId: string
  missionDate: string
}): DailyMissionProgress {
  return {
    userId: args.userId,
    missionDate: args.missionDate,
    startedLessonCount: 0,
    completedLessonCount: 0,
    completedReviewCount: 0,
    freeConversationCount: 0,
    speakingMinutes: 0,
    isMissionCompleted: false,
    updatedAt: args.missionDate,
  }
}

export function updateMissionProgress(
  previous: DailyMissionProgress | null,
  input: UpdateMissionProgressInput
): DailyMissionProgress {
  const base = previous ?? {
    userId: input.userId,
    missionDate: input.missionDate,
    startedLessonCount: 0,
    completedLessonCount: 0,
    completedReviewCount: 0,
    freeConversationCount: 0,
    speakingMinutes: 0,
    isMissionCompleted: false,
    updatedAt: input.missionDate,
  }
  const startedLessonCount = Math.max(
    0,
    Math.floor(base.startedLessonCount + (input.startedLessonDelta ?? 0))
  )
  const completedLessonCount = Math.max(
    0,
    Math.floor(base.completedLessonCount + (input.completedLessonDelta ?? 0))
  )
  const completedReviewCount = Math.max(
    0,
    Math.floor(base.completedReviewCount + (input.completedReviewDelta ?? 0))
  )
  const freeConversationCount = Math.max(
    0,
    Math.floor(base.freeConversationCount + (input.freeConversationDelta ?? 0))
  )
  const speakingMinutes = Math.max(
    0,
    Math.floor(base.speakingMinutes + (input.speakingMinutesDelta ?? 0))
  )
  return {
    userId: input.userId,
    missionDate: input.missionDate,
    startedLessonCount,
    completedLessonCount,
    completedReviewCount,
    freeConversationCount,
    speakingMinutes,
    isMissionCompleted: base.isMissionCompleted,
    updatedAt: input.missionDate,
  }
}

export function evaluateMissionCompletion(
  input: EvaluateMissionCompletionInput
): boolean {
  const { mission, progress } = input
  switch (mission.type) {
    case 'lesson':
      return progress.completedLessonCount >= 1
    case 'review':
      return (
        mission.targetReviewCount > 0 &&
        progress.completedReviewCount >= mission.targetReviewCount
      )
    case 'lesson_and_review':
      return (
        progress.completedLessonCount >= 1 &&
        progress.completedReviewCount >= mission.targetReviewCount
      )
    case 'free_conversation':
      return (
        progress.speakingMinutes >= mission.targetConversationMinutes ||
        progress.freeConversationCount >= 1
      )
    case 'comeback':
      return progress.speakingMinutes >= 3 || progress.completedLessonCount >= 1
    default:
      return false
  }
}

export function applyMissionCompletion(
  mission: DailyMissionDefinition,
  progress: DailyMissionProgress
): {
  mission: DailyMissionDefinition
  progress: DailyMissionProgress
} {
  const completed = evaluateMissionCompletion({ mission, progress })
  const hasActivity =
    progress.startedLessonCount > 0 ||
    progress.completedLessonCount > 0 ||
    progress.completedReviewCount > 0 ||
    progress.freeConversationCount > 0 ||
    progress.speakingMinutes > 0

  const nextMission: DailyMissionDefinition = { ...mission }
  const nextProgress: DailyMissionProgress = { ...progress }

  if (completed) {
    nextMission.status = 'completed'
    nextMission.completedAt = progress.updatedAt
    nextMission.updatedAt = progress.updatedAt
    nextProgress.isMissionCompleted = true
  } else if (hasActivity) {
    nextMission.status = 'in_progress'
    nextMission.updatedAt = progress.updatedAt
    nextProgress.isMissionCompleted = false
  } else {
    nextMission.status = 'not_started'
    nextMission.updatedAt = progress.updatedAt
    nextProgress.isMissionCompleted = false
  }

  return { mission: nextMission, progress: nextProgress }
}

export function diffDays(previousDate: string, completedDate: string): number {
  try {
    const a = new Date(previousDate + 'T00:00:00.000Z').getTime()
    const b = new Date(completedDate + 'T00:00:00.000Z').getTime()
    if (Number.isNaN(a) || Number.isNaN(b)) return 0
    const diff = Math.floor((b - a) / 86400000)
    return Number.isFinite(diff) ? diff : 0
  } catch {
    return 0
  }
}

export function evaluateStreak(input: EvaluateStreakInput): LearnerStreakState {
  const { userId, previous, completedDate } = input
  if (!previous) {
    return {
      userId,
      currentStreakDays: 1,
      longestStreakDays: 1,
      lastCompletedDate: completedDate,
      streakStatus: 'active',
      freezeCount: 0,
      updatedAt: completedDate,
    }
  }

  const lastDate = previous.lastCompletedDate ?? completedDate
  const gap = diffDays(lastDate, completedDate)

  let currentStreakDays: number
  let freezeCount: number

  if (gap <= 0) {
    currentStreakDays = previous.currentStreakDays
    freezeCount = previous.freezeCount
  } else if (gap === 1) {
    currentStreakDays = previous.currentStreakDays + 1
    freezeCount = previous.freezeCount
  } else if (gap === 2 && previous.freezeCount > 0) {
    currentStreakDays = previous.currentStreakDays + 1
    freezeCount = previous.freezeCount - 1
  } else {
    currentStreakDays = 1
    freezeCount = previous.freezeCount
  }

  const longestStreakDays = Math.max(previous.longestStreakDays, currentStreakDays)

  return {
    userId,
    currentStreakDays,
    longestStreakDays,
    lastCompletedDate: completedDate,
    streakStatus: 'active',
    freezeCount,
    updatedAt: completedDate,
  }
}

export function buildComebackMission(args: {
  userId: string
  todayDate: string
  comebackDays: number
  suggestedLessonId?: string | null
  dueReviewCount?: number
}): ComebackMissionDefinition | null {
  if (args.comebackDays < 3) return null
  const dueReviewCount = toPositiveInt(args.dueReviewCount)
  const suggestedReviewCount = Math.min(Math.max(dueReviewCount, 0), 3)
  return {
    id: `comeback:${args.userId}:${args.todayDate}`,
    userId: args.userId,
    comebackDate: args.todayDate,
    title: 'おかえりなさい',
    description: 'まずは短く再開して、学習の流れを取り戻しましょう。',
    suggestedLessonId: args.suggestedLessonId ?? null,
    suggestedReviewCount,
    suggestedConversationMinutes: 3,
    createdAt: args.todayDate,
  }
}

export function buildMotivationCards(args: {
  userId: string
  mission: DailyMissionDefinition | null
  progress: DailyMissionProgress | null
  streak: LearnerStreakState | null
  comeback: ComebackMissionDefinition | null
  dueReviewCount?: number
}): MotivationCard[] {
  const cards: MotivationCard[] = []
  const userId = args.userId
  const dueReviewCount = toPositiveInt(args.dueReviewCount)
  const hasComeback = !!args.comeback

  if (args.streak && args.streak.currentStreakDays >= 1) {
    cards.push({
      id: `card:streak:${userId}`,
      userId,
      type: 'streak',
      title: '連続記録',
      body: `${args.streak.currentStreakDays}日連続で学習中です。`,
      ctaLabel: null,
      priority: 2,
      isDismissible: false,
    })
  }

  if (dueReviewCount > 0) {
    cards.push({
      id: `card:review_due:${userId}`,
      userId,
      type: 'review_due',
      title: '復習があります',
      body: `${dueReviewCount}件の復習が待っています。`,
      ctaLabel: '復習する',
      priority: 1,
      isDismissible: false,
    })
  }

  if (!hasComeback && args.mission && args.mission.status !== 'completed') {
    cards.push({
      id: `card:daily_goal:${userId}`,
      userId,
      type: 'daily_goal',
      title: args.mission.title,
      body: args.mission.description,
      ctaLabel: 'はじめる',
      priority: 0,
      isDismissible: false,
    })
  }

  if (args.comeback) {
    cards.push({
      id: `card:comeback:${userId}`,
      userId,
      type: 'comeback',
      title: args.comeback.title,
      body: args.comeback.description,
      ctaLabel: '再開する',
      priority: 0,
      isDismissible: false,
    })
  }

  if (args.mission && args.mission.status === 'completed') {
    cards.push({
      id: `card:celebration:${userId}`,
      userId,
      type: 'celebration',
      title: '今日の目標を達成しました',
      body: 'この調子で続けましょう。',
      ctaLabel: null,
      priority: 3,
      isDismissible: true,
    })
  }

  return cards.sort((a, b) => a.priority - b.priority)
}

export function buildRetentionSnapshot(args: {
  todayDate: string
  mission: DailyMissionDefinition | null
  progress: DailyMissionProgress | null
  streak: LearnerStreakState | null
  comeback: ComebackMissionDefinition | null
  dueReviewCount?: number
}): RetentionSnapshot {
  const userId =
    args.mission?.userId ??
    args.progress?.userId ??
    args.streak?.userId ??
    args.comeback?.userId ??
    ''
  const cards =
    userId === ''
      ? []
      : buildMotivationCards({
          userId,
          mission: args.mission,
          progress: args.progress,
          streak: args.streak,
          comeback: args.comeback,
          dueReviewCount: args.dueReviewCount,
        })
  return {
    todayDate: args.todayDate,
    mission: args.mission,
    progress: args.progress,
    streak: args.streak,
    comeback: args.comeback,
    cards,
  }
}
