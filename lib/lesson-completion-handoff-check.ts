import type { LessonSession } from './lesson-runner'
import type {
  LessonProgressState,
  LessonStepProgress,
} from './lesson-progress-types'
import type {
  DailyMissionDefinition,
  DailyMissionProgress,
} from './habit-retention-types'

import {
  handoffCompletedLesson,
  estimateLessonSpeakingMinutes,
  buildLessonCompletionProgressDelta,
} from './lesson-completion-handoff'

export type LessonCompletionHandoffCheckResult = {
  name: string
  passed: boolean
  details: string
}

export function buildMockSession(): LessonSession {
  return {
    lessonId: 'lesson-1',
    sceneId: 'scene-1',
    microSituationId: 'micro-1',
    title: 'Mock Lesson',
    description: 'Mock lesson description',
    goal: 'Mock goal',
    estimatedMinutes: 5,
    steps: [
      {
        id: 'lesson-1__step_1',
        orderIndex: 1,
        type: 'listen',
        prompt: 'Listen to the line.',
        instruction: null,
        hint: null,
        expectedAnswer: null,
        aiRole: null,
        patternSlotName: null,
        patternSlotOptions: [],
      },
      {
        id: 'lesson-1__step_2',
        orderIndex: 2,
        type: 'repeat',
        prompt: 'Say: Good morning.',
        instruction: null,
        hint: null,
        expectedAnswer: 'Good morning.',
        aiRole: null,
        patternSlotName: null,
        patternSlotOptions: [],
      },
      {
        id: 'lesson-1__step_3',
        orderIndex: 3,
        type: 'guided',
        prompt: 'Answer the roommate.',
        instruction: null,
        hint: null,
        expectedAnswer: 'I slept well.',
        aiRole: 'roommate',
        patternSlotName: null,
        patternSlotOptions: [],
      },
    ],
  }
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

export function buildMockMissionProgress(): DailyMissionProgress {
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

export function buildMockLessonProgressState(
  status: LessonProgressState['status'] = 'in_progress'
): LessonProgressState {
  const isCompleted = status === 'completed'
  return {
    lessonId: 'lesson-1',
    sceneId: 'scene-1',
    microSituationId: 'micro-1',
    userId: 'u1',
    status,
    currentStepIndex: isCompleted ? 3 : 0,
    totalStepCount: 3,
    startedAt: '2026-03-12T10:00:00Z',
    completedAt: isCompleted ? '2026-03-12T10:05:00Z' : null,
    lastActivityAt: '2026-03-12T10:05:00Z',
    completedStepCount: isCompleted ? 3 : 1,
    skippedStepCount: 0,
    totalAttemptCount: isCompleted ? 2 : 1,
  }
}

export function buildIncompleteSteps(): LessonStepProgress[] {
  return [
    {
      lessonId: 'lesson-1',
      stepId: 'lesson-1__step_1',
      orderIndex: 1,
      type: 'listen',
      status: 'completed',
      startedAt: '2026-03-12T10:00:00Z',
      completedAt: '2026-03-12T10:01:00Z',
      skippedAt: null,
      attemptCount: 1,
      bestQuality: 'unknown',
      lastLearnerAnswer: null,
    },
    {
      lessonId: 'lesson-1',
      stepId: 'lesson-1__step_2',
      orderIndex: 2,
      type: 'repeat',
      status: 'available',
      startedAt: null,
      completedAt: null,
      skippedAt: null,
      attemptCount: 0,
      bestQuality: 'unknown',
      lastLearnerAnswer: null,
    },
    {
      lessonId: 'lesson-1',
      stepId: 'lesson-1__step_3',
      orderIndex: 3,
      type: 'guided',
      status: 'locked',
      startedAt: null,
      completedAt: null,
      skippedAt: null,
      attemptCount: 0,
      bestQuality: 'unknown',
      lastLearnerAnswer: null,
    },
  ]
}

export function buildCompletedSteps(): LessonStepProgress[] {
  return [
    {
      lessonId: 'lesson-1',
      stepId: 'lesson-1__step_1',
      orderIndex: 1,
      type: 'listen',
      status: 'completed',
      startedAt: '2026-03-12T10:00:00Z',
      completedAt: '2026-03-12T10:01:00Z',
      skippedAt: null,
      attemptCount: 1,
      bestQuality: 'unknown',
      lastLearnerAnswer: null,
    },
    {
      lessonId: 'lesson-1',
      stepId: 'lesson-1__step_2',
      orderIndex: 2,
      type: 'repeat',
      status: 'completed',
      startedAt: '2026-03-12T10:01:00Z',
      completedAt: '2026-03-12T10:02:00Z',
      skippedAt: null,
      attemptCount: 1,
      bestQuality: 'correct',
      lastLearnerAnswer: 'Good morning.',
    },
    {
      lessonId: 'lesson-1',
      stepId: 'lesson-1__step_3',
      orderIndex: 3,
      type: 'guided',
      status: 'completed',
      startedAt: '2026-03-12T10:02:00Z',
      completedAt: '2026-03-12T10:05:00Z',
      skippedAt: null,
      attemptCount: 1,
      bestQuality: 'acceptable',
      lastLearnerAnswer: 'I slept well.',
    },
  ]
}

export function checkEstimateLessonSpeakingMinutesFromSession(): LessonCompletionHandoffCheckResult {
  const session = buildMockSession()
  const lesson = buildMockLessonProgressState('in_progress')
  const steps = buildIncompleteSteps()
  const result = estimateLessonSpeakingMinutes({ session, lesson, steps })
  const passed = result === 5
  return {
    name: 'checkEstimateLessonSpeakingMinutesFromSession',
    passed,
    details: passed
      ? 'estimateLessonSpeakingMinutes returns 5 from session.estimatedMinutes'
      : `expected 5, got ${result}`,
  }
}

export function checkBuildLessonCompletionProgressDeltaCompleted(): LessonCompletionHandoffCheckResult {
  const delta = buildLessonCompletionProgressDelta({
    userId: 'u1',
    missionDate: '2026-03-12',
    lessonCompleted: true,
    speakingMinutes: 5,
  })
  const passed =
    delta.completedLessonDelta === 1 &&
    delta.speakingMinutesDelta === 5 &&
    delta.missionDate === '2026-03-12'
  return {
    name: 'checkBuildLessonCompletionProgressDeltaCompleted',
    passed,
    details: passed
      ? 'completedLessonDelta=1, speakingMinutesDelta=5, missionDate=2026-03-12'
      : `completedLessonDelta=${delta.completedLessonDelta}, speakingMinutesDelta=${delta.speakingMinutesDelta}, missionDate=${delta.missionDate}`,
  }
}

export function checkHandoffIncompleteLesson(): LessonCompletionHandoffCheckResult {
  const result = handoffCompletedLesson({
    todayDate: '2026-03-12',
    userId: 'u1',
    completedAt: '2026-03-12T10:05:00Z',
    session: buildMockSession(),
    lesson: buildMockLessonProgressState('in_progress'),
    steps: buildIncompleteSteps(),
    mission: buildMockMission(),
    missionProgress: buildMockMissionProgress(),
    streak: null,
  })
  const passed =
    result.isLessonCompleted === false &&
    result.reviewItems.length === 0 &&
    result.missionProgress.speakingMinutes >= 1 &&
    result.mission.status !== 'completed'
  const details = passed
    ? 'incomplete lesson: no review items, speakingMinutes updated, mission not completed'
    : `isLessonCompleted=${result.isLessonCompleted}, reviewItems.length=${result.reviewItems.length}, speakingMinutes=${result.missionProgress.speakingMinutes}, mission.status=${result.mission.status}`
  return {
    name: 'checkHandoffIncompleteLesson',
    passed,
    details,
  }
}

export function checkIncompleteLessonDoesNotCreateStreak(): LessonCompletionHandoffCheckResult {
  const result = handoffCompletedLesson({
    todayDate: '2026-03-12',
    userId: 'u1',
    completedAt: '2026-03-12T10:05:00Z',
    session: buildMockSession(),
    lesson: buildMockLessonProgressState('in_progress'),
    steps: buildIncompleteSteps(),
    mission: buildMockMission(),
    missionProgress: buildMockMissionProgress(),
    streak: null,
  })
  const passed =
    result.streak === null && result.mission.status !== 'completed'
  return {
    name: 'checkIncompleteLessonDoesNotCreateStreak',
    passed,
    details: passed
      ? 'incomplete lesson: streak null, mission not completed'
      : `streak=${result.streak != null ? 'set' : 'null'}, mission.status=${result.mission.status}`,
  }
}

export function checkHandoffCompletedLesson(): LessonCompletionHandoffCheckResult {
  const result = handoffCompletedLesson({
    todayDate: '2026-03-12',
    userId: 'u1',
    completedAt: '2026-03-12T10:05:00Z',
    session: buildMockSession(),
    lesson: buildMockLessonProgressState('completed'),
    steps: buildCompletedSteps(),
    mission: buildMockMission(),
    missionProgress: buildMockMissionProgress(),
    streak: null,
  })
  const itemTypes = result.reviewItems.map((i) => i.itemType)
  const hasPhrase = itemTypes.includes('phrase')
  const hasGuided = itemTypes.includes('guided_output')
  const passed =
    result.isLessonCompleted === true &&
    result.reviewItems.length === 2 &&
    hasPhrase &&
    hasGuided &&
    result.mission.status === 'completed' &&
    result.missionProgress.isMissionCompleted === true &&
    result.streak !== null &&
    result.comeback === null
  const details = passed
    ? 'completed lesson: 2 review items (phrase, guided_output), mission completed, streak set, no comeback'
    : `isLessonCompleted=${result.isLessonCompleted}, reviewItems.length=${result.reviewItems.length}, types=[${itemTypes.join(',')}], mission.status=${result.mission.status}, isMissionCompleted=${result.missionProgress.isMissionCompleted}, streak=${result.streak != null}, comeback=${result.comeback != null}`
  return {
    name: 'checkHandoffCompletedLesson',
    passed,
    details,
  }
}

export function checkCompletedLessonReviewItemIdsDeterministic(): LessonCompletionHandoffCheckResult {
  const result = handoffCompletedLesson({
    todayDate: '2026-03-12',
    userId: 'u1',
    completedAt: '2026-03-12T10:05:00Z',
    session: buildMockSession(),
    lesson: buildMockLessonProgressState('completed'),
    steps: buildCompletedSteps(),
    mission: buildMockMission(),
    missionProgress: buildMockMissionProgress(),
    streak: null,
  })
  const prefix = 'review:u1:lesson-1:'
  const allStartWith = result.reviewItems.every((i) => i.id.startsWith(prefix))
  const ids = result.reviewItems.map((i) => i.id)
  const unique = new Set(ids).size === ids.length
  const nonEmpty = ids.every((id) => id.length > 0)
  const passed =
    result.reviewItems.length === 2 &&
    allStartWith &&
    unique &&
    nonEmpty
  return {
    name: 'checkCompletedLessonReviewItemIdsDeterministic',
    passed,
    details: passed
      ? '2 items, ids start with review:u1:lesson-1:, unique and non-empty'
      : `length=${result.reviewItems.length}, prefixOk=${allStartWith}, unique=${unique}, nonEmpty=${nonEmpty}`,
  }
}

export function checkCompletedLessonMissionProgressCounts(): LessonCompletionHandoffCheckResult {
  const result = handoffCompletedLesson({
    todayDate: '2026-03-12',
    userId: 'u1',
    completedAt: '2026-03-12T10:05:00Z',
    session: buildMockSession(),
    lesson: buildMockLessonProgressState('completed'),
    steps: buildCompletedSteps(),
    mission: buildMockMission(),
    missionProgress: buildMockMissionProgress(),
    streak: null,
  })
  const passed =
    result.missionProgress.completedLessonCount === 1 &&
    result.missionProgress.speakingMinutes === 5 &&
    result.missionProgress.isMissionCompleted === true
  return {
    name: 'checkCompletedLessonMissionProgressCounts',
    passed,
    details: passed
      ? 'completedLessonCount=1, speakingMinutes=5, isMissionCompleted=true'
      : `completedLessonCount=${result.missionProgress.completedLessonCount}, speakingMinutes=${result.missionProgress.speakingMinutes}, isMissionCompleted=${result.missionProgress.isMissionCompleted}`,
  }
}

export function checkHandoffCompletedLessonCreatesCelebrationCard(): LessonCompletionHandoffCheckResult {
  const result = handoffCompletedLesson({
    todayDate: '2026-03-12',
    userId: 'u1',
    completedAt: '2026-03-12T10:05:00Z',
    session: buildMockSession(),
    lesson: buildMockLessonProgressState('completed'),
    steps: buildCompletedSteps(),
    mission: buildMockMission(),
    missionProgress: buildMockMissionProgress(),
    streak: null,
  })
  const celebrationCard = result.retentionSnapshot.cards.find(
    (c) => c.type === 'celebration'
  )
  const passed = celebrationCard !== undefined
  return {
    name: 'checkHandoffCompletedLessonCreatesCelebrationCard',
    passed,
    details: passed
      ? 'retentionSnapshot.cards includes a celebration card'
      : `cards: ${result.retentionSnapshot.cards.map((c) => c.type).join(', ')}`,
  }
}

export function checkCompletedLessonSnapshotHasNoComebackCard(): LessonCompletionHandoffCheckResult {
  const result = handoffCompletedLesson({
    todayDate: '2026-03-12',
    userId: 'u1',
    completedAt: '2026-03-12T10:05:00Z',
    session: buildMockSession(),
    lesson: buildMockLessonProgressState('completed'),
    steps: buildCompletedSteps(),
    mission: buildMockMission(),
    missionProgress: buildMockMissionProgress(),
    streak: null,
  })
  const hasComeback = result.retentionSnapshot.cards.some(
    (c) => c.type === 'comeback'
  )
  const passed = !hasComeback
  return {
    name: 'checkCompletedLessonSnapshotHasNoComebackCard',
    passed,
    details: passed
      ? 'retentionSnapshot.cards has no comeback card'
      : `cards: ${result.retentionSnapshot.cards.map((c) => c.type).join(', ')}`,
  }
}

export function runAllLessonCompletionHandoffChecks(): LessonCompletionHandoffCheckResult[] {
  return [
    checkEstimateLessonSpeakingMinutesFromSession(),
    checkBuildLessonCompletionProgressDeltaCompleted(),
    checkHandoffIncompleteLesson(),
    checkIncompleteLessonDoesNotCreateStreak(),
    checkHandoffCompletedLesson(),
    checkCompletedLessonReviewItemIdsDeterministic(),
    checkCompletedLessonMissionProgressCounts(),
    checkHandoffCompletedLessonCreatesCelebrationCard(),
    checkCompletedLessonSnapshotHasNoComebackCard(),
  ]
}
