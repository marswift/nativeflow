import type { ConversationStepType } from './conversation-memory-types'
import type { LessonSessionStep } from './lesson-runner'
import type { PromptAssemblyResult } from './prompt-assembly-types'
import type { StepPromptBuildResult } from './lesson-step-prompt-builder'
import type { LearnerAnswerQuality } from './lesson-progress-types'

export type AIConversationTurnRole =
  | 'system'
  | 'assistant'
  | 'user'

export type AIConversationResponseStatus =
  | 'ready'
  | 'needs_retry'
  | 'completed'
  | 'error'

export type AIConversationFeedbackMode =
  | 'hidden'
  | 'light'
  | 'full'

export interface AIConversationMessage {
  role: AIConversationTurnRole
  content: string
}

export interface AIConversationPromptBundle {
  stepType: ConversationStepType | LessonSessionStep['type']
  systemPrompt: string
  userPrompt: string
  metadata: StepPromptBuildResult['metadata']
}

export interface AIConversationEvaluation {
  quality: LearnerAnswerQuality
  feedbackMode: AIConversationFeedbackMode
  feedbackText: string | null
  correctedAnswer: string | null
  shouldRetry: boolean
  canProceed: boolean
}

export interface AIConversationAssistantReply {
  text: string
  ssml: string | null
  status: AIConversationResponseStatus
}

export interface AIConversationTurnResult {
  promptBundle: AIConversationPromptBundle
  assistantReply: AIConversationAssistantReply
  evaluation: AIConversationEvaluation
}

export interface BuildAIConversationPromptBundleInput {
  promptAssemblyResult: PromptAssemblyResult
  stepPromptResult: StepPromptBuildResult
}

export interface EvaluateAIConversationTurnInput {
  stepType: ConversationStepType | LessonSessionStep['type']
  learnerUtterance?: string | null
  expectedAnswer?: string | null
  assistantText?: string | null
}

export interface BuildAIConversationAssistantReplyInput {
  text: string
  status?: AIConversationResponseStatus
  ssml?: string | null
}
