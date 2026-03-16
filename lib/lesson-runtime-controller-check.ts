import type { LessonSession } from './lesson-runner'
import type { PromptAssemblyResult } from './prompt-assembly-types'
import type {
  DailyMissionDefinition,
  DailyMissionProgress,
} from './habit-retention-types'
import {
  startLessonRuntime,
  getCurrentLessonStepPrompt,
  submitLessonStepAnswerController,
  skipLessonStepController,
  buildAITurnFromCurrentStep,
  completeLessonRuntime,
  getLessonRuntimeStatus,
} from './lesson-runtime-controller'

export type LessonRuntimeControllerCheckResult = {
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

export function buildMockPromptAssemblyResult(args?: {
  currentStepType?: 'listen' | 'repeat' | 'guided' | 'pattern' | 'free_conversation' | 'review'
  currentStepIndex?: number
  aiRole?: string | null
  currentTurnGoal?: string
}): PromptAssemblyResult {
  const currentStepType = args?.currentStepType ?? 'listen'
  const currentStepIndex = args?.currentStepIndex ?? 0
  const aiRole: string | null =
    args === undefined || !Object.prototype.hasOwnProperty.call(args, 'aiRole')
      ? 'roommate'
      : args.aiRole ?? null
  const currentTurnGoal = args?.currentTurnGoal ?? 'answer simply'
  const sceneAiRole: string = aiRole ?? 'roommate'
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
        aiRole: sceneAiRole,
        userRole: 'learner',
        objective: 'practice',
        currentTurnGoal,
        currentStepType,
        currentStepIndex,
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

export function checkStartLessonRuntime(): LessonRuntimeControllerCheckResult {
  const { state } = startLessonRuntime({
    session: buildMockSession(),
    userId: 'u1',
    startedAt: '2026-03-12T10:00:00Z',
  })
  const passed =
    state.session.lessonId === 'lesson-1' &&
    state.currentStep?.id === 'lesson-1__step_1' &&
    state.steps.length === 3
  return {
    name: 'checkStartLessonRuntime',
    passed,
    details: passed
      ? 'session.lessonId lesson-1, currentStep step_1, steps.length 3'
      : `lessonId=${state.session.lessonId}, currentStepId=${state.currentStep?.id}, steps=${state.steps.length}`,
  }
}

export function checkGetLessonRuntimeStatusInitial(): LessonRuntimeControllerCheckResult {
  const { state } = startLessonRuntime({
    session: buildMockSession(),
    userId: 'u1',
    startedAt: '2026-03-12T10:00:00Z',
  })
  const status = getLessonRuntimeStatus(state)
  const passed =
    status.isFinished === false &&
    status.hasCurrentStep === true &&
    status.currentStepId === 'lesson-1__step_1' &&
    status.totalSteps === 3 &&
    status.completedSteps === 0 &&
    status.skippedSteps === 0
  return {
    name: 'checkGetLessonRuntimeStatusInitial',
    passed,
    details: passed
      ? 'isFinished false, hasCurrentStep true, currentStepId step_1, total 3, completed 0, skipped 0'
      : `isFinished=${status.isFinished}, hasCurrentStep=${status.hasCurrentStep}, currentStepId=${status.currentStepId}, completed=${status.completedSteps}, skipped=${status.skippedSteps}`,
  }
}

export function checkGetCurrentLessonStepPrompt(): LessonRuntimeControllerCheckResult {
  const { state } = startLessonRuntime({
    session: buildMockSession(),
    userId: 'u1',
    startedAt: '2026-03-12T10:00:00Z',
  })
  const result = getCurrentLessonStepPrompt({
    state,
    promptAssemblyResult: buildMockPromptAssemblyResult({
      currentStepType: 'listen',
      currentStepIndex: 0,
      aiRole: 'roommate',
      currentTurnGoal: 'listen carefully',
    }),
  })
  const passed =
    result !== null && result.metadata.stepId === 'lesson-1__step_1'
  return {
    name: 'checkGetCurrentLessonStepPrompt',
    passed,
    details: passed
      ? 'result not null, metadata.stepId lesson-1__step_1'
      : `resultNull=${result === null}, stepId=${result?.metadata?.stepId}`,
  }
}

export function checkSubmitLessonStepAnswerControllerWithoutCompletion(): LessonRuntimeControllerCheckResult {
  const { state: s0 } = startLessonRuntime({
    session: buildMockSession(),
    userId: 'u1',
    startedAt: '2026-03-12T10:00:00Z',
  })
  const { state: s1 } = submitLessonStepAnswerController({
    state: s0,
    learnerUtterance: 'Okay',
    submittedAt: '2026-03-12T10:01:00Z',
    markStepCompleted: false,
  })
  const passed =
    s1.currentStep?.id === 'lesson-1__step_1' && s1.steps.length === 3
  return {
    name: 'checkSubmitLessonStepAnswerControllerWithoutCompletion',
    passed,
    details: passed
      ? 'currentStep still step_1, steps.length 3'
      : `currentStepId=${s1.currentStep?.id}, steps=${s1.steps.length}`,
  }
}

export function checkSubmitLessonStepAnswerControllerWithCompletion(): LessonRuntimeControllerCheckResult {
  const { state: s0 } = startLessonRuntime({
    session: buildMockSession(),
    userId: 'u1',
    startedAt: '2026-03-12T10:00:00Z',
  })
  const { state: s1 } = submitLessonStepAnswerController({
    state: s0,
    learnerUtterance: 'Okay',
    submittedAt: '2026-03-12T10:01:00Z',
    markStepCompleted: true,
  })
  const step1 = s1.steps.find((st) => st.stepId === 'lesson-1__step_1')
  const passed =
    s1.currentStep?.id === 'lesson-1__step_2' &&
    step1?.status === 'completed'
  return {
    name: 'checkSubmitLessonStepAnswerControllerWithCompletion',
    passed,
    details: passed
      ? 'next currentStep step_2, first step completed'
      : `currentStepId=${s1.currentStep?.id}, step1Status=${step1?.status}`,
  }
}

export function checkSkipLessonStepController(): LessonRuntimeControllerCheckResult {
  const { state: s0 } = startLessonRuntime({
    session: buildMockSession(),
    userId: 'u1',
    startedAt: '2026-03-12T10:00:00Z',
  })
  const { state: s1 } = skipLessonStepController({
    state: s0,
    skippedAt: '2026-03-12T10:01:00Z',
  })
  const status = getLessonRuntimeStatus(s1)
  const passed =
    s1.currentStep?.id === 'lesson-1__step_2' && status.skippedSteps === 1
  return {
    name: 'checkSkipLessonStepController',
    passed,
    details: passed
      ? 'next currentStep step_2, skippedSteps 1'
      : `currentStepId=${s1.currentStep?.id}, skippedSteps=${status.skippedSteps}`,
  }
}

export function checkBuildAITurnFromCurrentStep(): LessonRuntimeControllerCheckResult {
  const { state } = startLessonRuntime({
    session: buildMockSession(),
    userId: 'u1',
    startedAt: '2026-03-12T10:00:00Z',
  })
  const { turn } = buildAITurnFromCurrentStep({
    state,
    promptAssemblyResult: buildMockPromptAssemblyResult({
      currentStepType: 'listen',
      currentStepIndex: 0,
      aiRole: 'roommate',
      currentTurnGoal: 'listen carefully',
    }),
    assistantText: 'Please listen carefully.',
    learnerUtterance: null,
  })
  const passed =
    turn !== null &&
    turn.promptBundle.metadata.stepId === 'lesson-1__step_1' &&
    turn.assistantReply.text === 'Please listen carefully.'
  return {
    name: 'checkBuildAITurnFromCurrentStep',
    passed,
    details: passed
      ? 'turn not null, stepId step_1, assistantReply.text matches'
      : `turnNull=${turn === null}, stepId=${turn?.promptBundle?.metadata?.stepId}, text=${turn?.assistantReply?.text}`,
  }
}

function runToStep2(): ReturnType<typeof startLessonRuntime>['state'] {
  const { state: s0 } = startLessonRuntime({
    session: buildMockSession(),
    userId: 'u1',
    startedAt: '2026-03-12T10:00:00Z',
  })
  const { state: s1 } = submitLessonStepAnswerController({
    state: s0,
    learnerUtterance: 'Okay',
    submittedAt: '2026-03-12T10:01:00Z',
    markStepCompleted: true,
  })
  return s1
}

export function checkBuildAITurnFromCurrentStepAfterRepeat(): LessonRuntimeControllerCheckResult {
  const state = runToStep2()
  const { turn } = buildAITurnFromCurrentStep({
    state,
    promptAssemblyResult: buildMockPromptAssemblyResult({
      currentStepType: 'repeat',
      currentStepIndex: 1,
      aiRole: null,
      currentTurnGoal: 'repeat the line',
    }),
    assistantText: 'Try saying it.',
    learnerUtterance: 'Good morning.',
    expectedAnswer: 'Good morning.',
  })
  const passed =
    turn !== null &&
    turn.promptBundle.metadata.stepId === 'lesson-1__step_2' &&
    turn.evaluation.quality === 'correct'
  return {
    name: 'checkBuildAITurnFromCurrentStepAfterRepeat',
    passed,
    details: passed
      ? 'turn not null, stepId step_2, evaluation.quality correct'
      : `turnNull=${turn === null}, stepId=${turn?.promptBundle?.metadata?.stepId}, quality=${turn?.evaluation?.quality}`,
  }
}

export function checkBuildAITurnFromCurrentStepReturnsNullWhenNoCurrentStep(): LessonRuntimeControllerCheckResult {
  const state = runAllThreeSteps()
  const result = buildAITurnFromCurrentStep({
    state,
    promptAssemblyResult: buildMockPromptAssemblyResult({
      currentStepType: 'guided',
      currentStepIndex: 3,
      aiRole: 'roommate',
      currentTurnGoal: 'lesson finished',
    }),
    assistantText: 'Anything',
    learnerUtterance: null,
  })
  const passed = result.turn === null
  return {
    name: 'checkBuildAITurnFromCurrentStepReturnsNullWhenNoCurrentStep',
    passed,
    details: passed
      ? 'completed runtime has no current step, so turn is null'
      : `turn was ${result.turn === null ? 'null' : 'non-null'}`,
  }
}

export function checkCompleteLessonRuntimeIncomplete(): LessonRuntimeControllerCheckResult {
  const { state } = startLessonRuntime({
    session: buildMockSession(),
    userId: 'u1',
    startedAt: '2026-03-12T10:00:00Z',
  })
  const result = completeLessonRuntime({
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
    name: 'checkCompleteLessonRuntimeIncomplete',
    passed,
    details: passed
      ? 'isLessonCompleted false, reviewItems 0, mission not completed'
      : `isLessonCompleted=${result.isLessonCompleted}, reviewItems=${result.reviewItems.length}, status=${result.mission.status}`,
  }
}

function runAllThreeSteps(): ReturnType<typeof startLessonRuntime>['state'] {
  let s = startLessonRuntime({
    session: buildMockSession(),
    userId: 'u1',
    startedAt: '2026-03-12T10:00:00Z',
  }).state
  for (let i = 0; i < 3; i++) {
    const { state: next } = submitLessonStepAnswerController({
      state: s,
      learnerUtterance: 'Done',
      submittedAt: `2026-03-12T10:0${i + 1}:00Z`,
      markStepCompleted: true,
    })
    s = next
  }
  return s
}

export function checkCompleteLessonRuntimeCompleted(): LessonRuntimeControllerCheckResult {
  const state = runAllThreeSteps()
  const result = completeLessonRuntime({
    state,
    todayDate: '2026-03-12',
    userId: 'u1',
    completedAt: '2026-03-12T10:05:00Z',
    mission: buildMockMission(),
    missionProgress: buildMockMissionProgress(),
    streak: null,
  })
  const hasCelebration = result.retentionSnapshot.cards.some(
    (c) => c.type === 'celebration'
  )
  const passed =
    result.isLessonCompleted === true &&
    result.mission.status === 'completed' &&
    result.missionProgress.isMissionCompleted === true &&
    hasCelebration
  return {
    name: 'checkCompleteLessonRuntimeCompleted',
    passed,
    details: passed
      ? 'isLessonCompleted true, mission completed, progress completed, cards include celebration'
      : `isLessonCompleted=${result.isLessonCompleted}, status=${result.mission.status}, isMissionCompleted=${result.missionProgress.isMissionCompleted}, hasCelebration=${hasCelebration}`,
  }
}

export function checkGetLessonRuntimeStatusCompleted(): LessonRuntimeControllerCheckResult {
  const state = runAllThreeSteps()
  const status = getLessonRuntimeStatus(state)
  const passed =
    status.isFinished === true &&
    status.hasCurrentStep === false &&
    status.currentStepId === null &&
    status.completedSteps === 3
  return {
    name: 'checkGetLessonRuntimeStatusCompleted',
    passed,
    details: passed
      ? 'isFinished true, hasCurrentStep false, currentStepId null, completedSteps 3'
      : `isFinished=${status.isFinished}, hasCurrentStep=${status.hasCurrentStep}, currentStepId=${status.currentStepId}, completedSteps=${status.completedSteps}`,
  }
}

export function runAllLessonRuntimeControllerChecks(): LessonRuntimeControllerCheckResult[] {
  return [
    checkStartLessonRuntime(),
    checkGetLessonRuntimeStatusInitial(),
    checkGetCurrentLessonStepPrompt(),
    checkSubmitLessonStepAnswerControllerWithoutCompletion(),
    checkSubmitLessonStepAnswerControllerWithCompletion(),
    checkSkipLessonStepController(),
    checkBuildAITurnFromCurrentStep(),
    checkBuildAITurnFromCurrentStepAfterRepeat(),
    checkBuildAITurnFromCurrentStepReturnsNullWhenNoCurrentStep(),
    checkCompleteLessonRuntimeIncomplete(),
    checkCompleteLessonRuntimeCompleted(),
    checkGetLessonRuntimeStatusCompleted(),
  ]
}
