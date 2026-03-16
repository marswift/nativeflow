import type { LessonSession } from './lesson-runner'
import type { PromptAssemblyResult } from './prompt-assembly-types'
import type {
  DailyMissionDefinition,
  DailyMissionProgress,
  MotivationCard,
} from './habit-retention-types'
import type { ConversationLessonFacadeState } from './conversation-lesson-runtime-facade'
import {
  startConversationLessonFacade,
  getConversationLessonPrompt,
  submitConversationLessonAnswer,
  skipConversationLessonStep,
  buildConversationLessonAITurn,
  finalizeConversationLessonFacade,
  getConversationLessonStepSummary,
} from './conversation-lesson-runtime-facade'

export type ConversationLessonRuntimeFacadeCheckResult = {
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

export function buildMockPromptAssemblyResult(): PromptAssemblyResult {
  return {
    memory: {
      learner: {
        userId: 'u1',
        targetLanguageCode: 'en',
        targetCountryCode: null,
        targetRegionSlug: null,
        level: 'beginner',
        learningGoal: 'daily speaking',
        regionVariant: 'default',
      },
      learning: {
        weakPatterns: [],
        weakPhraseIds: [],
        weakSkillTags: [],
        strongPatterns: [],
        masteredPhraseIds: [],
        preferredScenes: [],
        avoidedScenes: [],
        recentTopics: [],
        learnerProfileSummary: '',
      },
      scene: {
        sceneId: 'scene-1',
        microSituationId: 'micro-1',
        aiRole: 'roommate',
        userRole: 'learner',
        objective: 'practice',
        currentTurnGoal: 'answer simply',
        currentStepType: 'listen',
        currentStepIndex: 0,
        totalStepCount: 3,
        supportMode: 'normal',
        hintLevel: 1,
        turnCountInFreeConversation: 0,
        maxFreeConversationTurns: null,
        stateSummary: '',
      },
      continuity: {
        conversationId: 'conv-1',
        lessonId: 'lesson-1',
        status: 'active',
        recentTurns: [],
      },
    },
    policy: {
      systemInstruction: 'System instruction',
      levelPolicy: 'Level policy',
      regionPolicy: 'Region policy',
      supportPolicy: 'Support policy',
      outputPolicy: 'Output policy',
    },
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

export async function checkStartConversationLessonFacade(): Promise<ConversationLessonRuntimeFacadeCheckResult> {
  const { state, status } = await startConversationLessonFacade({
    session: buildMockSession(),
    userId: 'u1',
    startedAt: '2026-03-12T10:00:00Z',
  })
  const passed =
    state.session.lessonId === 'lesson-1' &&
    status.currentStepId === 'lesson-1__step_1' &&
    status.isFinished === false
  return {
    name: 'checkStartConversationLessonFacade',
    passed,
    details: passed
      ? 'session.lessonId lesson-1, currentStepId step_1, isFinished false'
      : `lessonId=${state.session.lessonId}, currentStepId=${status.currentStepId}, isFinished=${status.isFinished}`,
  }
}

export async function checkGetConversationLessonPrompt(): Promise<ConversationLessonRuntimeFacadeCheckResult> {
  const { state } = await startConversationLessonFacade({
    session: buildMockSession(),
    userId: 'u1',
    startedAt: '2026-03-12T10:00:00Z',
  })
  const { prompt, status } = getConversationLessonPrompt({
    state,
    promptAssemblyResult: buildMockPromptAssemblyResult(),
  })
  const passed =
    prompt !== null &&
    prompt.metadata.stepId === 'lesson-1__step_1' &&
    status.currentStepId === 'lesson-1__step_1'
  return {
    name: 'checkGetConversationLessonPrompt',
    passed,
    details: passed
      ? 'prompt not null, metadata.stepId step_1, status.currentStepId step_1'
      : `promptNull=${prompt === null}, stepId=${prompt?.metadata?.stepId}, currentStepId=${status.currentStepId}`,
  }
}

export async function checkSubmitConversationLessonAnswerWithoutCompletion(): Promise<ConversationLessonRuntimeFacadeCheckResult> {
  const { state: s0 } = await startConversationLessonFacade({
    session: buildMockSession(),
    userId: 'u1',
    startedAt: '2026-03-12T10:00:00Z',
  })
  const { status } = await submitConversationLessonAnswer({
    state: s0,
    learnerUtterance: 'Okay',
    submittedAt: '2026-03-12T10:01:00Z',
    markStepCompleted: false,
  })
  const passed =
    status.currentStepId === 'lesson-1__step_1' && status.completedSteps === 0
  return {
    name: 'checkSubmitConversationLessonAnswerWithoutCompletion',
    passed,
    details: passed
      ? 'current step stays step_1, completedSteps 0'
      : `currentStepId=${status.currentStepId}, completedSteps=${status.completedSteps}`,
  }
}

export async function checkSubmitConversationLessonAnswerWithCompletion(): Promise<ConversationLessonRuntimeFacadeCheckResult> {
  const { state: s0 } = await startConversationLessonFacade({
    session: buildMockSession(),
    userId: 'u1',
    startedAt: '2026-03-12T10:00:00Z',
  })
  const { status } = await submitConversationLessonAnswer({
    state: s0,
    learnerUtterance: 'Okay',
    submittedAt: '2026-03-12T10:01:00Z',
    markStepCompleted: true,
  })
  const passed =
    status.currentStepId === 'lesson-1__step_2' && status.completedSteps === 1
  return {
    name: 'checkSubmitConversationLessonAnswerWithCompletion',
    passed,
    details: passed
      ? 'next current step step_2, completedSteps 1'
      : `currentStepId=${status.currentStepId}, completedSteps=${status.completedSteps}`,
  }
}

export async function checkSkipConversationLessonStep(): Promise<ConversationLessonRuntimeFacadeCheckResult> {
  const { state: s0 } = await startConversationLessonFacade({
    session: buildMockSession(),
    userId: 'u1',
    startedAt: '2026-03-12T10:00:00Z',
  })
  const { status } = await skipConversationLessonStep({
    state: s0,
    skippedAt: '2026-03-12T10:01:00Z',
  })
  const passed =
    status.currentStepId === 'lesson-1__step_2' && status.skippedSteps === 1
  return {
    name: 'checkSkipConversationLessonStep',
    passed,
    details: passed
      ? 'next current step step_2, skippedSteps 1'
      : `currentStepId=${status.currentStepId}, skippedSteps=${status.skippedSteps}`,
  }
}

export async function checkBuildConversationLessonAITurn(): Promise<ConversationLessonRuntimeFacadeCheckResult> {
  const { state } = await startConversationLessonFacade({
    session: buildMockSession(),
    userId: 'u1',
    startedAt: '2026-03-12T10:00:00Z',
  })
  const { turn, status } = buildConversationLessonAITurn({
    state,
    promptAssemblyResult: buildMockPromptAssemblyResult(),
    assistantText: 'Please listen carefully.',
    learnerUtterance: null,
  })
  const passed =
    turn !== null &&
    turn.promptBundle.metadata.stepId === 'lesson-1__step_1' &&
    status.currentStepId === 'lesson-1__step_1'
  return {
    name: 'checkBuildConversationLessonAITurn',
    passed,
    details: passed
      ? 'turn not null, stepId step_1, status.currentStepId step_1'
      : `turnNull=${turn === null}, stepId=${turn?.promptBundle?.metadata?.stepId}, currentStepId=${status.currentStepId}`,
  }
}

export async function checkGetConversationLessonStepSummaryInitial(): Promise<ConversationLessonRuntimeFacadeCheckResult> {
  const { state } = await startConversationLessonFacade({
    session: buildMockSession(),
    userId: 'u1',
    startedAt: '2026-03-12T10:00:00Z',
  })
  const summary = getConversationLessonStepSummary(state)
  const passed =
    summary.currentStepId === 'lesson-1__step_1' &&
    summary.totalSteps === 3 &&
    summary.completedSteps === 0 &&
    summary.skippedSteps === 0 &&
    summary.isFinished === false
  return {
    name: 'checkGetConversationLessonStepSummaryInitial',
    passed,
    details: passed
      ? 'currentStepId step_1, totalSteps 3, completed 0, skipped 0, isFinished false'
      : `currentStepId=${summary.currentStepId}, totalSteps=${summary.totalSteps}, completed=${summary.completedSteps}, skipped=${summary.skippedSteps}, isFinished=${summary.isFinished}`,
  }
}

export async function checkFinalizeConversationLessonFacadeIncomplete(): Promise<ConversationLessonRuntimeFacadeCheckResult> {
  const { state } = await startConversationLessonFacade({
    session: buildMockSession(),
    userId: 'u1',
    startedAt: '2026-03-12T10:00:00Z',
  })
  const result = await finalizeConversationLessonFacade({
    state,
    todayDate: '2026-03-12',
    userId: 'u1',
    completedAt: '2026-03-12T10:01:00Z',
    mission: buildMockMission(),
    missionProgress: buildMockMissionProgress(),
    streak: null,
  })
  const passed =
    result.isLessonCompleted === false &&
    result.reviewItems.length === 0 &&
    result.mission.status !== 'completed'
  return {
    name: 'checkFinalizeConversationLessonFacadeIncomplete',
    passed,
    details: passed
      ? 'isLessonCompleted false, reviewItems 0, mission not completed'
      : `isLessonCompleted=${result.isLessonCompleted}, reviewItems=${result.reviewItems.length}, status=${result.mission.status}`,
  }
}

async function runAllThreeSteps(): Promise<ConversationLessonFacadeState> {
  const { state: s0 } = await startConversationLessonFacade({
    session: buildMockSession(),
    userId: 'u1',
    startedAt: '2026-03-12T10:00:00Z',
  })
  const { state: s1 } = await submitConversationLessonAnswer({
    state: s0,
    learnerUtterance: 'Done',
    submittedAt: '2026-03-12T10:01:00Z',
    markStepCompleted: true,
  })
  const { state: s2 } = await submitConversationLessonAnswer({
    state: s1,
    learnerUtterance: 'Done',
    submittedAt: '2026-03-12T10:02:00Z',
    markStepCompleted: true,
  })
  const { state: s3 } = await submitConversationLessonAnswer({
    state: s2,
    learnerUtterance: 'Done',
    submittedAt: '2026-03-12T10:03:00Z',
    markStepCompleted: true,
  })
  return s3
}

export async function checkFinalizeConversationLessonFacadeCompleted(): Promise<ConversationLessonRuntimeFacadeCheckResult> {
  const state = await runAllThreeSteps()
  const result = await finalizeConversationLessonFacade({
    state,
    todayDate: '2026-03-12',
    userId: 'u1',
    completedAt: '2026-03-12T10:05:00Z',
    mission: buildMockMission(),
    missionProgress: buildMockMissionProgress(),
    streak: null,
  })
  const hasCelebration = result.retentionSnapshot.cards.some(
    (c: MotivationCard) => c.type === 'celebration'
  )
  const passed =
    result.isLessonCompleted === true &&
    result.mission.status === 'completed' &&
    result.missionProgress.isMissionCompleted === true &&
    hasCelebration
  return {
    name: 'checkFinalizeConversationLessonFacadeCompleted',
    passed,
    details: passed
      ? 'isLessonCompleted true, mission completed, cards include celebration'
      : `isLessonCompleted=${result.isLessonCompleted}, status=${result.mission.status}, isMissionCompleted=${result.missionProgress.isMissionCompleted}, hasCelebration=${hasCelebration}`,
  }
}

export async function checkGetConversationLessonStepSummaryCompleted(): Promise<ConversationLessonRuntimeFacadeCheckResult> {
  const state = await runAllThreeSteps()
  const summary = getConversationLessonStepSummary(state)
  const passed =
    summary.currentStepId === null &&
    summary.isFinished === true &&
    summary.completedSteps === 3
  return {
    name: 'checkGetConversationLessonStepSummaryCompleted',
    passed,
    details: passed
      ? 'currentStepId null, isFinished true, completedSteps 3'
      : `currentStepId=${summary.currentStepId}, isFinished=${summary.isFinished}, completedSteps=${summary.completedSteps}`,
  }
}

export async function runAllConversationLessonRuntimeFacadeChecks(): Promise<ConversationLessonRuntimeFacadeCheckResult[]> {
  return Promise.all([
    checkStartConversationLessonFacade(),
    checkGetConversationLessonPrompt(),
    checkSubmitConversationLessonAnswerWithoutCompletion(),
    checkSubmitConversationLessonAnswerWithCompletion(),
    checkSkipConversationLessonStep(),
    checkBuildConversationLessonAITurn(),
    checkGetConversationLessonStepSummaryInitial(),
    checkFinalizeConversationLessonFacadeIncomplete(),
    checkFinalizeConversationLessonFacadeCompleted(),
    checkGetConversationLessonStepSummaryCompleted(),
  ])
}
