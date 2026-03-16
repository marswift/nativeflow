import type {
  ConversationStepType,
  LearnerLevel,
  SupportMode,
  ConversationSessionRow,
  ConversationTurnRow,
  LearnerMemoryRow,
  SceneStateRow,
} from './conversation-memory-types'

export type RegionVariant =
  | 'default'
  | 'us'
  | 'uk'
  | 'au'

export interface PromptRecentTurn {
  speaker: 'user' | 'ai' | 'system'
  text: string
}

export interface PromptLearnerView {
  userId: string
  targetLanguageCode: string
  targetCountryCode: string | null
  targetRegionSlug: string | null
  level: LearnerLevel
  learningGoal: string | null
  regionVariant: RegionVariant
}

export interface PromptLearningView {
  weakPatterns: string[]
  weakPhraseIds: string[]
  weakSkillTags: string[]
  strongPatterns: string[]
  masteredPhraseIds: string[]
  preferredScenes: string[]
  avoidedScenes: string[]
  recentTopics: string[]
  learnerProfileSummary: string
}

export interface PromptSceneView {
  sceneId: string
  microSituationId: string | null
  aiRole: string
  userRole: string
  objective: string
  currentTurnGoal: string
  currentStepType: ConversationStepType
  currentStepIndex: number
  totalStepCount: number
  supportMode: SupportMode
  hintLevel: 0 | 1 | 2 | 3
  turnCountInFreeConversation: number
  maxFreeConversationTurns: number | null
  stateSummary: string
}

export interface PromptContinuityView {
  conversationId: string
  lessonId: string | null
  status: ConversationSessionRow['status']
  recentTurns: PromptRecentTurn[]
}

export interface PromptAssemblyInput {
  session: ConversationSessionRow
  sceneState: SceneStateRow | null
  learnerMemory: LearnerMemoryRow | null
  recentTurns: ConversationTurnRow[]
}

export interface PromptMemoryView {
  learner: PromptLearnerView
  learning: PromptLearningView
  scene: PromptSceneView
  continuity: PromptContinuityView
}

export interface PromptPolicyView {
  systemInstruction: string
  levelPolicy: string
  regionPolicy: string
  supportPolicy: string
  outputPolicy: string
}

export interface PromptAssemblyResult {
  memory: PromptMemoryView
  policy: PromptPolicyView
}

export interface BuildPromptMemoryViewOptions {
  recentTurnLimit?: number
}

export interface BuildPromptPolicyViewOptions {
  stepType?: ConversationStepType
  level?: LearnerLevel
  regionVariant?: RegionVariant
  supportMode?: SupportMode
  hintLevel?: 0 | 1 | 2 | 3
}
