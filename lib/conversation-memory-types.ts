export type ConversationStepType =
  | 'listen'
  | 'repeat'
  | 'pattern'
  | 'guided'
  | 'free_conversation'
  | 'review'

export type LearnerLevel =
  | 'beginner'
  | 'intermediate'
  | 'advanced'

export type ConversationStatus =
  | 'active'
  | 'completed'
  | 'abandoned'

export type SupportMode =
  | 'normal'
  | 'supportive'
  | 'high_support'

export type ReviewCandidateItemType =
  | 'phrase'
  | 'pattern'
  | 'guided_output'
  | 'scene_expression'
  | 'mistake_fix'

export interface ConversationSessionRow {
  id: string
  user_id: string

  scene_id: string
  micro_situation_id: string | null
  lesson_id: string | null

  target_language_code: string
  target_country_code: string | null
  target_region_slug: string | null

  learner_level: LearnerLevel
  current_step_type: ConversationStepType

  ai_role: string
  status: ConversationStatus

  started_at: string
  completed_at: string | null
  updated_at: string
}

export interface ConversationTurnRow {
  id: string
  conversation_id: string
  user_id: string

  turn_index: number
  speaker: 'user' | 'ai' | 'system'

  raw_text: string
  normalized_text: string | null
  corrected_text: string | null

  audio_url: string | null
  transcript_confidence: number | null

  step_type: ConversationStepType

  prompt_id: string | null
  expected_answer: string | null

  is_successful: boolean | null
  error_tags: string[]

  created_at: string
}

export interface LearnerMemoryRow {
  user_id: string

  target_language_code: string
  target_country_code: string | null
  target_region_slug: string | null

  current_level: LearnerLevel
  learning_goal: string | null

  weak_patterns: string[]
  weak_phrase_ids: string[]
  weak_skill_tags: string[]

  strong_patterns: string[]
  mastered_phrase_ids: string[]

  preferred_scenes: string[]
  avoided_scenes: string[]

  recent_topics: string[]
  learner_profile_summary: string

  created_at: string
  updated_at: string
}

export interface ReviewCandidateRow {
  id: string
  user_id: string

  source_conversation_id: string | null
  source_turn_id: string | null
  source_lesson_id: string | null

  item_type: ReviewCandidateItemType

  scene_id: string | null
  micro_situation_id: string | null

  prompt: string
  expected_answer: string | null
  learner_answer: string | null
  corrected_answer: string | null

  reason: string
  difficulty: number

  created_at: string
}

export interface SceneProgressRow {
  id: string
  user_id: string
  scene_id: string
  micro_situation_id: string

  times_completed: number
  last_completed_at: string | null

  best_score: number | null
  average_score: number | null

  is_unlocked: boolean
  is_mastered: boolean

  created_at: string
  updated_at: string
}

export interface SceneStateRow {
  id: string
  conversation_id: string
  user_id: string

  scene_id: string
  micro_situation_id: string | null

  objective: string
  ai_role: string
  user_role: string

  current_turn_goal: string
  current_step_index: number
  total_step_count: number

  turn_count_in_free_conversation: number
  max_free_conversation_turns: number | null

  hint_level: 0 | 1 | 2 | 3
  support_mode: SupportMode

  state_summary: string
  updated_at: string
}

export type ConversationSessionInsert =
  Omit<ConversationSessionRow, 'id' | 'started_at' | 'updated_at'>

export type ConversationSessionUpdate =
  Partial<ConversationSessionInsert>

export type ConversationTurnInsert =
  Omit<ConversationTurnRow, 'id' | 'created_at'>

export type LearnerMemoryInsert =
  Omit<LearnerMemoryRow, 'created_at' | 'updated_at'>

export type LearnerMemoryUpdate =
  Partial<LearnerMemoryInsert>

export type ReviewCandidateInsert =
  Omit<ReviewCandidateRow, 'id' | 'created_at'>

export type SceneProgressInsert =
  Omit<SceneProgressRow, 'id' | 'created_at' | 'updated_at'>

export type SceneProgressUpdate =
  Partial<SceneProgressInsert>

export type SceneStateInsert =
  Omit<SceneStateRow, 'id' | 'updated_at'>

export type SceneStateUpdate =
  Partial<SceneStateInsert>
