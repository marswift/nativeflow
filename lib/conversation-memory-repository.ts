import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type {
  ConversationSessionInsert,
  ConversationSessionUpdate,
  ConversationSessionRow,
  ConversationTurnInsert,
  ConversationTurnRow,
  LearnerMemoryInsert,
  LearnerMemoryRow,
  ReviewCandidateInsert,
  ReviewCandidateRow,
  SceneProgressInsert,
  SceneProgressRow,
  SceneStateInsert,
  SceneStateRow,
} from './conversation-memory-types'

export type RepoResult<T> = { data: T | null; error: PostgrestError | null }

const FALLBACK = { data: null, error: null }

export async function createConversationSession(
  payload: ConversationSessionInsert
): Promise<RepoResult<ConversationSessionRow>> {
  try {
    const { data, error } = await supabase
      .from('conversation_sessions')
      .insert(payload)
      .select()
      .single()
    return { data: data as ConversationSessionRow | null, error: error ?? null }
  } catch (e) {
    console.error('createConversationSession', e)
    return FALLBACK as RepoResult<ConversationSessionRow>
  }
}

export async function getActiveConversationSessionByUser(
  userId: string
): Promise<RepoResult<ConversationSessionRow>> {
  try {
    const { data, error } = await supabase
      .from('conversation_sessions')
      .select()
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    return { data: data as ConversationSessionRow | null, error: error ?? null }
  } catch (e) {
    console.error('getActiveConversationSessionByUser', e)
    return FALLBACK as RepoResult<ConversationSessionRow>
  }
}

export async function getConversationSessionById(
  id: string
): Promise<RepoResult<ConversationSessionRow>> {
  try {
    const { data, error } = await supabase
      .from('conversation_sessions')
      .select()
      .eq('id', id)
      .maybeSingle()
    return { data: data as ConversationSessionRow | null, error: error ?? null }
  } catch (e) {
    console.error('getConversationSessionById', e)
    return FALLBACK as RepoResult<ConversationSessionRow>
  }
}

export async function updateConversationSession(
  id: string,
  payload: ConversationSessionUpdate
): Promise<RepoResult<ConversationSessionRow>> {
  try {
    const { data, error } = await supabase
      .from('conversation_sessions')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    return { data: data as ConversationSessionRow | null, error: error ?? null }
  } catch (e) {
    console.error('updateConversationSession', e)
    return FALLBACK as RepoResult<ConversationSessionRow>
  }
}

export async function createConversationTurn(
  payload: ConversationTurnInsert
): Promise<RepoResult<ConversationTurnRow>> {
  try {
    const { data, error } = await supabase
      .from('conversation_turns')
      .insert(payload)
      .select()
      .single()
    return { data: data as ConversationTurnRow | null, error: error ?? null }
  } catch (e) {
    console.error('createConversationTurn', e)
    return FALLBACK as RepoResult<ConversationTurnRow>
  }
}

export async function listConversationTurns(
  conversationId: string,
  limit = 20
): Promise<RepoResult<ConversationTurnRow[]>> {
  try {
    const { data, error } = await supabase
      .from('conversation_turns')
      .select()
      .eq('conversation_id', conversationId)
      .order('turn_index', { ascending: true })
      .limit(limit)
    return { data: (data ?? []) as ConversationTurnRow[], error: error ?? null }
  } catch (e) {
    console.error('listConversationTurns', e)
    return FALLBACK as RepoResult<ConversationTurnRow[]>
  }
}

export async function getLastConversationTurn(
  conversationId: string
): Promise<RepoResult<ConversationTurnRow>> {
  try {
    const { data, error } = await supabase
      .from('conversation_turns')
      .select()
      .eq('conversation_id', conversationId)
      .order('turn_index', { ascending: false })
      .limit(1)
      .maybeSingle()
    return { data: data as ConversationTurnRow | null, error: error ?? null }
  } catch (e) {
    console.error('getLastConversationTurn', e)
    return FALLBACK as RepoResult<ConversationTurnRow>
  }
}

export async function getLearnerMemory(
  userId: string
): Promise<RepoResult<LearnerMemoryRow>> {
  try {
    const { data, error } = await supabase
      .from('learner_memories')
      .select()
      .eq('user_id', userId)
      .maybeSingle()
    return { data: data as LearnerMemoryRow | null, error: error ?? null }
  } catch (e) {
    console.error('getLearnerMemory', e)
    return FALLBACK as RepoResult<LearnerMemoryRow>
  }
}

export async function upsertLearnerMemory(
  payload: LearnerMemoryInsert
): Promise<RepoResult<LearnerMemoryRow>> {
  try {
    const { data, error } = await supabase
      .from('learner_memories')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single()
    return { data: data as LearnerMemoryRow | null, error: error ?? null }
  } catch (e) {
    console.error('upsertLearnerMemory', e)
    return FALLBACK as RepoResult<LearnerMemoryRow>
  }
}

export async function createReviewCandidate(
  payload: ReviewCandidateInsert
): Promise<RepoResult<ReviewCandidateRow>> {
  try {
    const { data, error } = await supabase
      .from('review_candidates')
      .insert(payload)
      .select()
      .single()
    return { data: data as ReviewCandidateRow | null, error: error ?? null }
  } catch (e) {
    console.error('createReviewCandidate', e)
    return FALLBACK as RepoResult<ReviewCandidateRow>
  }
}

export async function listRecentReviewCandidatesByUser(
  userId: string,
  limit = 20
): Promise<RepoResult<ReviewCandidateRow[]>> {
  try {
    const { data, error } = await supabase
      .from('review_candidates')
      .select()
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    return { data: (data ?? []) as ReviewCandidateRow[], error: error ?? null }
  } catch (e) {
    console.error('listRecentReviewCandidatesByUser', e)
    return FALLBACK as RepoResult<ReviewCandidateRow[]>
  }
}

export async function upsertSceneProgress(
  payload: SceneProgressInsert
): Promise<RepoResult<SceneProgressRow>> {
  try {
    const { data, error } = await supabase
      .from('scene_progress')
      .upsert(payload, { onConflict: 'user_id,scene_id,micro_situation_id' })
      .select()
      .single()
    return { data: data as SceneProgressRow | null, error: error ?? null }
  } catch (e) {
    console.error('upsertSceneProgress', e)
    return FALLBACK as RepoResult<SceneProgressRow>
  }
}

export async function getSceneProgressByUserAndScene(
  userId: string,
  sceneId: string
): Promise<RepoResult<SceneProgressRow[]>> {
  try {
    const { data, error } = await supabase
      .from('scene_progress')
      .select()
      .eq('user_id', userId)
      .eq('scene_id', sceneId)
    return { data: (data ?? []) as SceneProgressRow[], error: error ?? null }
  } catch (e) {
    console.error('getSceneProgressByUserAndScene', e)
    return FALLBACK as RepoResult<SceneProgressRow[]>
  }
}

export async function upsertSceneState(
  payload: SceneStateInsert
): Promise<RepoResult<SceneStateRow>> {
  try {
    const { data, error } = await supabase
      .from('scene_states')
      .upsert(payload, { onConflict: 'conversation_id' })
      .select()
      .single()
    return { data: data as SceneStateRow | null, error: error ?? null }
  } catch (e) {
    console.error('upsertSceneState', e)
    return FALLBACK as RepoResult<SceneStateRow>
  }
}

export async function getSceneStateByConversationId(
  conversationId: string
): Promise<RepoResult<SceneStateRow>> {
  try {
    const { data, error } = await supabase
      .from('scene_states')
      .select()
      .eq('conversation_id', conversationId)
      .maybeSingle()
    return { data: data as SceneStateRow | null, error: error ?? null }
  } catch (e) {
    console.error('getSceneStateByConversationId', e)
    return FALLBACK as RepoResult<SceneStateRow>
  }
}
