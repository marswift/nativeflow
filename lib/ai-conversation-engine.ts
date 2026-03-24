import type { LessonSessionStep } from './lesson-runner'
import type { ConversationStepType } from './conversation-memory-types'
import type { StepPromptBuildResult } from './lesson-step-prompt-builder'
import type { PromptAssemblyResult } from './prompt-assembly-types'
import type {
  AIConversationPromptBundle,
  AIConversationEvaluation,
  AIConversationAssistantReply,
  AIConversationTurnResult,
  EvaluateAIConversationTurnInput,
  BuildAIConversationAssistantReplyInput,
  AIConversationResponseStatus,
  AIConversationFeedbackMode,
} from './ai-conversation-engine-types'
import { generateChatCompletion } from '@/lib/openai-client'
import { buildCharacterPrompt } from '@/lib/character-prompt'
import { buildScenePrompt } from '@/lib/scene-prompt'
import { buildContinuityPrompt } from '@/lib/continuity-prompt'
import { buildLiveTopicPrompt } from '@/lib/live-topic-prompt'
import { buildGenerationalPrompt } from '@/lib/generational-prompt'

const DEFAULT_TEMPERATURE = 0.7

export function trimOrNull(
  value: string | null | undefined
): string | null {
  if (value == null || typeof value !== 'string') return null
  const t = value.trim()
  return t === '' ? null : t
}

export function normalizeComparableText(
  value: string | null | undefined
): string {
  if (value == null || typeof value !== 'string') return ''
  const t = value.toLowerCase().trim().replace(/\s+/g, ' ')
  return t
}

export function resolveEvaluationStepType(
  stepType: ConversationStepType | LessonSessionStep['type']
): ConversationStepType | LessonSessionStep['type'] {
  return stepType
}

export function buildAIConversationPromptBundle(input: {
  stepPromptResult: StepPromptBuildResult
}): AIConversationPromptBundle {
  const r = input.stepPromptResult
  return {
    stepType: r.metadata.stepType,
    systemPrompt: r.system,
    userPrompt: r.user,
    metadata: r.metadata,
  }
}

export function buildAIConversationAssistantReply(
  input: BuildAIConversationAssistantReplyInput
): AIConversationAssistantReply {
  const text = trimOrNull(input.text) ?? ''
  const ssml = trimOrNull(input.ssml)
  const status = input.status ?? 'ready'
  return { text, ssml, status }
}

export function resolveFeedbackMode(args: {
  stepType: ConversationStepType | LessonSessionStep['type']
  quality: 'unknown' | 'correct' | 'acceptable' | 'needs_retry'
}): AIConversationFeedbackMode {
  switch (args.stepType) {
    case 'listen':
      return 'hidden'
    case 'repeat':
    case 'pattern':
    case 'guided':
      return 'light'
    case 'free_conversation':
    case 'review':
      return 'full'
    default:
      return args.quality === 'needs_retry' ? 'full' : 'light'
  }
}

export function evaluateAIConversationTurn(
  input: EvaluateAIConversationTurnInput
): AIConversationEvaluation {
  const stepType = resolveEvaluationStepType(input.stepType)
  const learnerNorm = normalizeComparableText(input.learnerUtterance)
  const expectedNorm = normalizeComparableText(input.expectedAnswer)
  const expectedTrimmed = trimOrNull(input.expectedAnswer)

  const withMode = (
    quality: 'unknown' | 'correct' | 'acceptable' | 'needs_retry',
    feedbackMode: AIConversationFeedbackMode,
    feedbackText: string | null,
    correctedAnswer: string | null,
    shouldRetry: boolean,
    canProceed: boolean
  ): AIConversationEvaluation => ({
    quality,
    feedbackMode,
    feedbackText,
    correctedAnswer,
    shouldRetry,
    canProceed,
  })

  if (stepType === 'listen') {
    return withMode('unknown', 'hidden', null, null, false, true)
  }

  if (learnerNorm === '') {
    return withMode(
      'needs_retry',
      resolveFeedbackMode({ stepType, quality: 'needs_retry' }),
      'Please try answering out loud.',
      expectedTrimmed,
      true,
      false
    )
  }

  if (expectedNorm === '') {
    return withMode(
      'acceptable',
      resolveFeedbackMode({ stepType, quality: 'acceptable' }),
      null,
      null,
      false,
      true
    )
  }

  if (learnerNorm === expectedNorm) {
    return withMode(
      'correct',
      resolveFeedbackMode({ stepType, quality: 'correct' }),
      null,
      expectedTrimmed,
      false,
      true
    )
  }

  const includes =
    expectedNorm.includes(learnerNorm) || learnerNorm.includes(expectedNorm)
  if (includes) {
    return withMode(
      'acceptable',
      resolveFeedbackMode({ stepType, quality: 'acceptable' }),
      "Good. Let's continue.",
      expectedTrimmed,
      false,
      true
    )
  }

  return withMode(
    'needs_retry',
    resolveFeedbackMode({ stepType, quality: 'needs_retry' }),
    'Almost. Try it once more.',
    expectedTrimmed,
    true,
    false
  )
}

export async function generateAssistantTurn(args: {
  systemPrompt: string
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[]
  userMessage: string
  status?: AIConversationResponseStatus
}): Promise<AIConversationAssistantReply> {
  const fallback = buildAIConversationAssistantReply({
    text: "I'm sorry. Please try again.",
    status: 'needs_retry',
  })
  try {
    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: args.systemPrompt },
      ...(args.conversationHistory ?? []).map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: 'user', content: args.userMessage },
    ]
    const { text } = await generateChatCompletion({
      messages,
      temperature: DEFAULT_TEMPERATURE,
    })
    if (text === '' || text.trim() === '') {
      return fallback
    }
    return buildAIConversationAssistantReply({
      text: text.trim(),
      status: args.status ?? 'ready',
    })
  } catch {
    return fallback
  }
}

export function buildAIConversationTurnResult(args: {
  stepPromptResult: StepPromptBuildResult
  assistantText: string
  assistantStatus?: AIConversationResponseStatus
  assistantSsml?: string | null
  learnerUtterance?: string | null
  expectedAnswer?: string | null
}): AIConversationTurnResult {
  const promptBundle = buildAIConversationPromptBundle({
    stepPromptResult: args.stepPromptResult,
  })
  const evaluation = evaluateAIConversationTurn({
    stepType: args.stepPromptResult.metadata.stepType,
    learnerUtterance: args.learnerUtterance ?? null,
    expectedAnswer:
      args.expectedAnswer ??
      args.stepPromptResult.metadata.expectedAnswer ??
      null,
    assistantText: args.assistantText,
  })
  let replyStatus: AIConversationResponseStatus =
    args.assistantStatus ??
    (evaluation.shouldRetry ? 'needs_retry' : 'ready')
  if (
    evaluation.canProceed === true &&
    args.stepPromptResult.metadata.stepType === 'free_conversation'
  ) {
    replyStatus = 'ready'
  }
  const assistantReply = buildAIConversationAssistantReply({
    text: args.assistantText,
    status: replyStatus,
    ssml: args.assistantSsml ?? null,
  })
  return {
    promptBundle,
    assistantReply,
    evaluation,
  }
}

export type GenerateAIConversationTurnArgs = {
  promptAssemblyResult: PromptAssemblyResult
  learnerUtterance?: string | null
  liveTopics?: string[]
}

export async function generateAIConversationTurn(
  args: GenerateAIConversationTurnArgs
): Promise<AIConversationTurnResult> {
  const { policy } = args.promptAssemblyResult
  const characterPrompt = buildCharacterPrompt(args.promptAssemblyResult)
  const scenePrompt = buildScenePrompt(args.promptAssemblyResult)
  const continuityPrompt = buildContinuityPrompt(args.promptAssemblyResult)
  const liveTopicPrompt = buildLiveTopicPrompt({
    promptAssemblyResult: args.promptAssemblyResult,
    liveTopics: args.liveTopics,
  })
  const generationalPrompt = buildGenerationalPrompt(args.promptAssemblyResult)
  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: policy.systemInstruction },
    { role: 'system', content: characterPrompt },
    { role: 'system', content: scenePrompt },
    { role: 'system', content: continuityPrompt },
    { role: 'system', content: liveTopicPrompt },
    { role: 'system', content: generationalPrompt },
    { role: 'system', content: policy.levelPolicy },
    { role: 'system', content: policy.regionPolicy },
    { role: 'system', content: policy.supportPolicy },
    { role: 'system', content: policy.outputPolicy },
  ]
  if (args.learnerUtterance != null && args.learnerUtterance.trim() !== '') {
    messages.push({ role: 'user', content: args.learnerUtterance.trim() })
  }
  const scene = args.promptAssemblyResult.memory.scene
  const currentStepType = scene.currentStepType
  const promptBundle: AIConversationPromptBundle = {
    stepType: currentStepType,
    systemPrompt: policy.systemInstruction,
    userPrompt: args.learnerUtterance?.trim() ?? '',
    metadata: {
      stepId: '',
      stepType: currentStepType as LessonSessionStep['type'],
      expectedAnswer: null,
      hint: null,
      aiRole: scene.aiRole ?? null,
      patternSlotName: null,
      patternSlotOptions: [],
    },
  }
  const fallbackReply = buildAIConversationAssistantReply({
    text: "Let's try again. You can do it.",
    status: 'needs_retry',
  })
  const defaultEvaluation = {
    quality: 'unknown' as const,
    feedbackMode: 'hidden' as const,
    feedbackText: null as string | null,
    correctedAnswer: null as string | null,
    shouldRetry: false,
    canProceed: true,
  }
  try {
    const { text } = await generateChatCompletion({
      messages,
      temperature: DEFAULT_TEMPERATURE,
    })
    const trimmed = typeof text === 'string' ? text.trim() : ''
    if (trimmed === '') {
      return { promptBundle, assistantReply: fallbackReply, evaluation: defaultEvaluation }
    }
    return {
      promptBundle,
      assistantReply: buildAIConversationAssistantReply({
        text: trimmed,
        status: 'ready',
      }),
      evaluation: defaultEvaluation,
    }
  } catch {
    return { promptBundle, assistantReply: fallbackReply, evaluation: defaultEvaluation }
  }
}
