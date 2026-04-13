/**
 * Lesson runtime engine — pure state machine for lesson stage progression.
 * BOUNDARY: This module must NOT import from review, flow-point, social, or persistence layers.
 * External systems interact with lesson state via the facade in lesson-runtime.ts.
 */
export const LESSON_STAGE_ORDER = [
  'listen',
  'repeat',
  'scaffold_transition',
  'ai_question',
  'typing',
  'ai_conversation',
] as const
  
  export type LessonStageId = (typeof LESSON_STAGE_ORDER)[number]

  /** Extended stage ID that includes non-English response stages */
  export type ExtendedLessonStageId = LessonStageId | 'audio_choice'
  
  export type LessonStageStatus = 'locked' | 'active' | 'completed'
  
  export type LessonStageProgress = {
    stageId: LessonStageId
    status: LessonStageStatus
    startedAt: string | null
    completedAt: string | null
    attempts: number
  }
  
  export type LessonAnswerKind =
    | 'repeat'
    | 'scaffold_transition'
    | 'ai_question'
    | 'typing'
    | 'ai_conversation'
  
  export type LessonAnswerRecord = {
    blockId: string
    stageId: LessonStageId
    kind: LessonAnswerKind
    value: string
    isCorrect: boolean | null
    feedback: string | null
    answeredAt: string
  }
  
  export type LessonRuntimeOverview = {
    estimatedMinutes: number
    stepCount: number
    flowPoint: number
    sceneLabel: string
    sceneDescription: string
    blockCount: number
  }
  
  export type LessonRuntimeBlock = {
    id: string
    order: number
    phraseText: string
    translation: string | null
    sceneLabel: string | null
    aiQuestion: string | null
    typingPrompt: string | null
    conversationPrompt: string | null
  }
  
  export type LessonRuntimeEngineInput = {
    lessonId: string
    userId: string
    difficultyMultiplier?: number
    flowPointBase?: number
    overview: LessonRuntimeOverview
    blocks: LessonRuntimeBlock[]
  }
  
  export type LessonRuntimeEngineState = {
    lessonId: string
    userId: string
    currentStageId: LessonStageId
    currentBlockIndex: number
    stageProgress: LessonStageProgress[]
    answers: LessonAnswerRecord[]
    isCompleted: boolean
    completedAt: string | null
    awardedFlowPoints: number
    difficultyMultiplier: number
    flowPointBase: number
    overview: LessonRuntimeOverview
    blocks: LessonRuntimeBlock[]
  }
  
  export type LessonRuntimeAdvanceResult = {
    state: LessonRuntimeEngineState
    movedStage: boolean
    movedBlock: boolean
    completedLesson: boolean
  }
  
  function nowIso() {
    return new Date().toISOString()
  }
  
  function clampNumber(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max)
  }
  
  function createInitialStageProgress(): LessonStageProgress[] {
    return LESSON_STAGE_ORDER.map((stageId, index) => ({
      stageId,
      status: index === 0 ? 'active' : 'locked',
      startedAt: index === 0 ? nowIso() : null,
      completedAt: null,
      attempts: 0,
    }))
  }
  
  function getStageIndex(stageId: LessonStageId) {
    return LESSON_STAGE_ORDER.indexOf(stageId)
  }

  function getExpectedAnswerKindForStage(
    stageId: Exclude<LessonStageId, 'listen'>,
  ): LessonAnswerKind {
    if (stageId === 'repeat') return 'repeat'

    if (stageId === 'scaffold_transition') {
      return 'scaffold_transition'
    }
    
    if (stageId === 'ai_question') return 'ai_question'
    if (stageId === 'typing') return 'typing'
    
    return 'ai_conversation'
  }
  
  function getEffectiveBlockCount(state: LessonRuntimeEngineState): number {
    if (state.blocks.length <= 0) {
      return 0
    }
  
    if (state.overview.blockCount <= 0) {
      return state.blocks.length
    }
  
    return Math.min(state.overview.blockCount, state.blocks.length)
  }

  
  function assertValidBlockIndex(
    blocks: LessonRuntimeBlock[],
    blockIndex: number,
  ): void {
    if (blocks.length === 0) {
      throw new Error('Lesson runtime requires at least one block.')
    }
  
    if (blockIndex < 0 || blockIndex >= blocks.length) {
      throw new Error(`Invalid block index: ${blockIndex}`)
    }
  }
  
  function assertStageIsCurrent(
    state: LessonRuntimeEngineState,
    stageId: LessonStageId,
  ): void {
    if (state.currentStageId !== stageId) {
      throw new Error(
        `Cannot record answer for stage "${stageId}" while current stage is "${state.currentStageId}".`,
      )
    }
  }
  
  function updateStageAttempts(
    stageProgress: LessonStageProgress[],
    stageId: LessonStageId,
  ): LessonStageProgress[] {
    return stageProgress.map((stage) =>
      stage.stageId === stageId
        ? {
            ...stage,
            attempts: stage.attempts + 1,
          }
        : stage,
    )
  }
  
  function completeStage(
    stageProgress: LessonStageProgress[],
    stageId: LessonStageId,
  ): LessonStageProgress[] {
    const currentIndex = getStageIndex(stageId)
    const nextIndex = currentIndex + 1
  
    return stageProgress.map((stage, index) => {
      if (stage.stageId === stageId) {
        return {
          ...stage,
          status: 'completed',
          completedAt: stage.completedAt ?? nowIso(),
        }
      }
  
      if (index === nextIndex && stage.status === 'locked') {
        return {
          ...stage,
          status: 'active',
          startedAt: stage.startedAt ?? nowIso(),
        }
      }
  
      return stage
    })
  }
  
  function resetStageProgressForNextBlock(): LessonStageProgress[] {
    return createInitialStageProgress()
  }
  
  function getRequiredAnswerStageCountPerBlock(): number {
    return 5
  }
  
  function getAnsweredRequiredStageCount(
    state: LessonRuntimeEngineState,
  ): number {
    const completedStageKeys = new Set(
      state.answers.map((answer) => `${answer.blockId}:${answer.stageId}`)
    )
  
    return completedStageKeys.size
  }
  
  function calculateAwardedFlowPoints(input: {
    flowPointBase: number
    difficultyMultiplier: number
    answeredRequiredStageCount: number
    blockCount: number
  }): number {
    const totalRequiredAnswerStages =
      input.blockCount * getRequiredAnswerStageCountPerBlock()
  
    const completionFactor =
      totalRequiredAnswerStages <= 0
        ? 0
        : input.answeredRequiredStageCount / totalRequiredAnswerStages
  
    const raw =
      input.flowPointBase *
      input.difficultyMultiplier *
      clampNumber(completionFactor, 0, 1)
  
    return Math.round(raw)
  }
  
export function createLessonRuntimeEngineState(
  input: LessonRuntimeEngineInput,
): LessonRuntimeEngineState {
  if (!input.lessonId) {
    throw new Error('lessonId is required.')
  }

  if (!input.userId) {
    throw new Error('userId is required.')
  }

  if (input.blocks.length === 0) {
    throw new Error('blocks must not be empty.')
  }

  const sortedBlocks = [...input.blocks].sort((a, b) => a.order - b.order)
  const difficultyMultiplier = input.difficultyMultiplier ?? 1
  const flowPointBase = input.flowPointBase ?? input.overview.flowPoint

  return {
    lessonId: input.lessonId,
    userId: input.userId,
    currentStageId: 'listen',
    currentBlockIndex: 0,
    stageProgress: createInitialStageProgress(),
    answers: [],
    isCompleted: false,
    completedAt: null,
    awardedFlowPoints: 0,
    difficultyMultiplier,
    flowPointBase,
    overview: {
      ...input.overview,
      blockCount:
        input.overview.blockCount > 0
          ? input.overview.blockCount
          : sortedBlocks.length,
    },
    blocks: sortedBlocks,
  }
}
  
  export function getCurrentRuntimeBlock(
    state: LessonRuntimeEngineState,
  ): LessonRuntimeBlock {
    assertValidBlockIndex(state.blocks, state.currentBlockIndex)
    return state.blocks[state.currentBlockIndex]
  }
  
  export function recordLessonStageAnswer(
    state: LessonRuntimeEngineState,
    input: {
      stageId: Exclude<LessonStageId, 'listen'>
      blockId: string
      kind: LessonAnswerKind
      value: string
      isCorrect?: boolean | null
      feedback?: string | null
    },
  ): LessonRuntimeEngineState {
    if (state.isCompleted) {
      throw new Error('Cannot record an answer for a completed lesson.')
    }
  
    assertStageIsCurrent(state, input.stageId)
  
    const currentBlock = getCurrentRuntimeBlock(state)
    const expectedKind = getExpectedAnswerKindForStage(input.stageId)

    if (input.kind !== expectedKind) {
      throw new Error(
        `Answer kind mismatch. Stage "${input.stageId}" requires kind "${expectedKind}" but received "${input.kind}".`,
      )
    }
  
    if (currentBlock.id !== input.blockId) {
      throw new Error(
        `Answer block mismatch. Expected "${currentBlock.id}" but received "${input.blockId}".`,
      )
    }
  
    return {
      ...state,
      stageProgress: updateStageAttempts(state.stageProgress, input.stageId),
      answers: [
        ...state.answers,
        {
          blockId: input.blockId,
          stageId: input.stageId,
          kind: input.kind,
          value: input.value,
          isCorrect: input.isCorrect ?? null,
          feedback: input.feedback ?? null,
          answeredAt: nowIso(),
        },
      ],
    }
  }
  
  export function advanceLessonRuntimeStage(
    state: LessonRuntimeEngineState,
  ): LessonRuntimeAdvanceResult {
    if (state.isCompleted) {
      return {
        state,
        movedStage: false,
        movedBlock: false,
        completedLesson: false,
      }
    }
    if (!canAdvanceLessonRuntimeStage(state)) {
        throw new Error(
          `Cannot advance lesson runtime from stage "${state.currentStageId}" before completing the required action.`,
        )
      }
  
    const currentStageIndex = getStageIndex(state.currentStageId)
    const isLastStage = currentStageIndex === LESSON_STAGE_ORDER.length - 1
    const isLastBlock = state.currentBlockIndex === state.blocks.length - 1
  
    if (!isLastStage) {
      const nextStageId = LESSON_STAGE_ORDER[currentStageIndex + 1]
  
      return {
        state: {
          ...state,
          currentStageId: nextStageId,
          stageProgress: completeStage(state.stageProgress, state.currentStageId),
        },
        movedStage: true,
        movedBlock: false,
        completedLesson: false,
      }
    }
  
    if (!isLastBlock) {
      return {
        state: {
          ...state,
          currentStageId: 'listen',
          currentBlockIndex: state.currentBlockIndex + 1,
          stageProgress: resetStageProgressForNextBlock(),
        },
        movedStage: false,
        movedBlock: true,
        completedLesson: false,
      }
    }
  
    const awardedFlowPoints = calculateAwardedFlowPoints({
      flowPointBase: state.flowPointBase,
      difficultyMultiplier: state.difficultyMultiplier,
      answeredRequiredStageCount: getAnsweredRequiredStageCount(state),
      blockCount: getEffectiveBlockCount(state),
    })
  
    return {
      state: {
        ...state,
        stageProgress: completeStage(state.stageProgress, state.currentStageId),
        isCompleted: true,
        completedAt: nowIso(),
        awardedFlowPoints,
      },
      movedStage: false,
      movedBlock: false,
      completedLesson: true,
    }
  }
  
  function hasAnsweredCurrentStage(
    state: LessonRuntimeEngineState,
    stageId: Exclude<LessonStageId, 'listen'>,
  ): boolean {
    const currentBlockId = getCurrentRuntimeBlock(state).id
  
    return state.answers.some(
      (answer) =>
        answer.blockId === currentBlockId && answer.stageId === stageId,
    )
  }

  export function canAdvanceLessonRuntimeStage(
    state: LessonRuntimeEngineState,
  ): boolean {
    if (state.isCompleted) {
        return false
    }

    if (state.currentStageId === 'listen') {
        return true
    }

    if (state.currentStageId === 'repeat') {
      return hasAnsweredCurrentStage(state, 'repeat')
    }
    
    if (state.currentStageId === 'scaffold_transition') {
      return hasAnsweredCurrentStage(state, 'scaffold_transition')
    }
    
    if (state.currentStageId === 'ai_question') {
      return hasAnsweredCurrentStage(state, 'ai_question')
    }

    if (state.currentStageId === 'typing') {
        return hasAnsweredCurrentStage(state, 'typing')
    }

    if (state.currentStageId === 'ai_conversation') {
        return hasAnsweredCurrentStage(state, 'ai_conversation')
    }

    return false
  }
  
  export function getLessonCompletionRatio(
    state: LessonRuntimeEngineState,
  ): number {
    if (state.isCompleted) {
      return 1
    }
  
    const effectiveBlockCount = getEffectiveBlockCount(state)
    const totalSteps = effectiveBlockCount * LESSON_STAGE_ORDER.length
    const completedStages = state.stageProgress.filter(
      (stage) => stage.status === 'completed',
    ).length
  
    const completedPriorBlocks =
      state.currentBlockIndex * LESSON_STAGE_ORDER.length
  
    const done = completedPriorBlocks + completedStages
  
    if (totalSteps <= 0) {
      return 0
    }
  
    return clampNumber(done / totalSteps, 0, 1)
  }
  
  export function buildLessonProgressPayload(
    state: LessonRuntimeEngineState,
    ): {
        lessonId: string
        userId: string
        currentBlockIndex: number
        currentStageId: LessonStageId
        answers: LessonAnswerRecord[]
        isCompleted: boolean
        completedAt: string | null
        awardedFlowPoints: number
        completionRatio: number
        difficultyMultiplier: number
        flowPointBase: number
    } {
    return {
        lessonId: state.lessonId,
        userId: state.userId,
        currentBlockIndex: state.currentBlockIndex,
        currentStageId: state.currentStageId,
        answers: state.answers,
        isCompleted: state.isCompleted,
        completedAt: state.completedAt,
        awardedFlowPoints: state.awardedFlowPoints,
        completionRatio: getLessonCompletionRatio(state),
        difficultyMultiplier: state.difficultyMultiplier,
        flowPointBase: state.flowPointBase,
        }
  }