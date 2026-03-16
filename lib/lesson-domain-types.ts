export type LifeCategory =
  | 'daily_life'
  | 'social_life'
  | 'school_life'
  | 'work_life'
  | 'leisure'
  | 'travel'
  | 'relationships'
  | 'health'
  | 'problems'
  | 'services'

export type LessonStepType =
  | 'listen'
  | 'repeat'
  | 'pattern'
  | 'guided'
  | 'free_conversation'
  | 'review'

export type PhraseKind =
  | 'core_phrase'
  | 'pattern'
  | 'scene_expression'
  | 'guided_answer'
  | 'free_conversation_seed'
  | 'mistake_fix'

export type EnglishRegionVariant =
  | 'default'
  | 'us'
  | 'uk'
  | 'au'

export interface SceneDefinition {
  id: string
  slug: string
  lifeCategory: LifeCategory
  targetLanguageCode: string
  targetCountryCode: string | null
  regionVariant: EnglishRegionVariant
  title: string
  description: string
  roleUser: string
  roleAI: string
  difficulty: number
  isActive: boolean
}

export interface MicroSituationDefinition {
  id: string
  sceneId: string
  slug: string
  title: string
  description: string
  goal: string
  difficulty: number
  estimatedMinutes: number
  isActive: boolean
}

export interface PhraseDefinition {
  id: string
  sceneId: string
  microSituationId: string | null
  targetLanguageCode: string
  regionVariant: EnglishRegionVariant
  kind: PhraseKind
  text: string
  translation: string | null
  notes: string | null
  difficulty: number
  tags: string[]
  audioText: string | null
  isCore: boolean
}

export interface PatternSlotOption {
  value: string
  label: string | null
}

export interface LessonStepDefinition {
  id: string
  lessonId: string
  orderIndex: number
  type: LessonStepType
  prompt: string
  instruction: string | null
  hint: string | null
  exampleAnswer: string | null
  expectedAnswer: string | null
  basePhraseId: string | null
  patternSlotName: string | null
  patternSlotOptions: PatternSlotOption[]
  reviewSourcePhraseIds: string[]
  aiRole: string | null
}

export interface LessonDefinition {
  id: string
  sceneId: string
  microSituationId: string
  targetLanguageCode: string
  regionVariant: EnglishRegionVariant
  title: string
  description: string
  goal: string
  difficulty: number
  estimatedMinutes: number
  stepTypes: LessonStepType[]
  steps: LessonStepDefinition[]
  phraseIds: string[]
  isReviewLesson: boolean
  isActive: boolean
}

export interface ReviewSourceLink {
  phraseId: string
  lessonId: string
  sceneId: string
  microSituationId: string | null
  sourceStepType: LessonStepType
  sourceTurnGoal: string | null
}

export interface SceneTaxonomyNode {
  lifeCategory: LifeCategory
  scenes: SceneDefinition[]
  microSituations: MicroSituationDefinition[]
}
