import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'
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

type RepoClientInput = {
  supabase: SupabaseClient
}

export async function createConversationSession(
  input: RepoClientInput & { payload: ConversationSessionInsert }
): Promise<RepoResult<ConversationSessionRow>> {
  try {
    const { data, error } = await input.supabase
      .from('conversation_sessions')
      .insert(input.payload)
      .select()
      .single()

    return { data: data as ConversationSessionRow | null, error: error ?? null }
  } catch (e) {
    console.error('createConversationSession', e)
    return FALLBACK as RepoResult<ConversationSessionRow>
  }
}

export async function getActiveConversationSessionByUser(
  input: RepoClientInput & { userId: string }
): Promise<RepoResult<ConversationSessionRow>> {
  try {
    const { data, error } = await input.supabase
      .from('conversation_sessions')
      .select()
      .eq('user_id', input.userId)
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
  input: RepoClientInput & { id: string }
): Promise<RepoResult<ConversationSessionRow>> {
  try {
    const { data, error } = await input.supabase
      .from('conversation_sessions')
      .select()
      .eq('id', input.id)
      .maybeSingle()

    return { data: data as ConversationSessionRow | null, error: error ?? null }
  } catch (e) {
    console.error('getConversationSessionById', e)
    return FALLBACK as RepoResult<ConversationSessionRow>
  }
}

export async function updateConversationSession(
  input: RepoClientInput & {
    id: string
    payload: ConversationSessionUpdate
  }
): Promise<RepoResult<ConversationSessionRow>> {
  try {
    const { data, error } = await input.supabase
      .from('conversation_sessions')
      .update(input.payload)
      .eq('id', input.id)
      .select()
      .single()

    return { data: data as ConversationSessionRow | null, error: error ?? null }
  } catch (e) {
    console.error('updateConversationSession', e)
    return FALLBACK as RepoResult<ConversationSessionRow>
  }
}

export async function createConversationTurn(
  input: RepoClientInput & { payload: ConversationTurnInsert }
): Promise<RepoResult<ConversationTurnRow>> {
  try {
    const { data, error } = await input.supabase
      .from('conversation_turns')
      .insert(input.payload)
      .select()
      .single()

    return { data: data as ConversationTurnRow | null, error: error ?? null }
  } catch (e) {
    console.error('createConversationTurn', e)
    return FALLBACK as RepoResult<ConversationTurnRow>
  }
}

export async function listConversationTurns(
  input: RepoClientInput & { conversationId: string; limit?: number }
): Promise<RepoResult<ConversationTurnRow[]>> {
  try {
    const { data, error } = await input.supabase
      .from('conversation_turns')
      .select()
      .eq('conversation_id', input.conversationId)
      .order('turn_index', { ascending: true })
      .limit(input.limit ?? 20)

    return { data: (data ?? []) as ConversationTurnRow[], error: error ?? null }
  } catch (e) {
    console.error('listConversationTurns', e)
    return FALLBACK as RepoResult<ConversationTurnRow[]>
  }
}

export async function getLastConversationTurn(
  input: RepoClientInput & { conversationId: string }
): Promise<RepoResult<ConversationTurnRow>> {
  try {
    const { data, error } = await input.supabase
      .from('conversation_turns')
      .select()
      .eq('conversation_id', input.conversationId)
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
  input: RepoClientInput & { userId: string }
): Promise<RepoResult<LearnerMemoryRow>> {
  try {
    const { data, error } = await input.supabase
      .from('learner_memories')
      .select()
      .eq('user_id', input.userId)
      .maybeSingle()

    return { data: data as LearnerMemoryRow | null, error: error ?? null }
  } catch (e) {
    console.error('getLearnerMemory', e)
    return FALLBACK as RepoResult<LearnerMemoryRow>
  }
}

export async function upsertLearnerMemory(
  input: RepoClientInput & { payload: LearnerMemoryInsert }
): Promise<RepoResult<LearnerMemoryRow>> {
  try {
    const { data, error } = await input.supabase
      .from('learner_memories')
      .upsert(input.payload, { onConflict: 'user_id' })
      .select()
      .single()

    return { data: data as LearnerMemoryRow | null, error: error ?? null }
  } catch (e) {
    console.error('upsertLearnerMemory', e)
    return FALLBACK as RepoResult<LearnerMemoryRow>
  }
}

export async function createReviewCandidate(
  input: RepoClientInput & { payload: ReviewCandidateInsert }
): Promise<RepoResult<ReviewCandidateRow>> {
  try {
    const { data, error } = await input.supabase
      .from('review_candidates')
      .insert(input.payload)
      .select()
      .single()

    return { data: data as ReviewCandidateRow | null, error: error ?? null }
  } catch (e) {
    console.error('createReviewCandidate', e)
    return FALLBACK as RepoResult<ReviewCandidateRow>
  }
}

export async function listRecentReviewCandidatesByUser(
  input: RepoClientInput & { userId: string; limit?: number }
): Promise<RepoResult<ReviewCandidateRow[]>> {
  try {
    const { data, error } = await input.supabase
      .from('review_candidates')
      .select()
      .eq('user_id', input.userId)
      .order('created_at', { ascending: false })
      .limit(input.limit ?? 20)

    return { data: (data ?? []) as ReviewCandidateRow[], error: error ?? null }
  } catch (e) {
    console.error('listRecentReviewCandidatesByUser', e)
    return FALLBACK as RepoResult<ReviewCandidateRow[]>
  }
}

export async function upsertSceneProgress(
  input: RepoClientInput & { payload: SceneProgressInsert }
): Promise<RepoResult<SceneProgressRow>> {
  try {
    const { data, error } = await input.supabase
      .from('scene_progress')
      .upsert(input.payload, { onConflict: 'user_id,scene_id,micro_situation_id' })
      .select()
      .single()

    return { data: data as SceneProgressRow | null, error: error ?? null }
  } catch (e) {
    console.error('upsertSceneProgress', e)
    return FALLBACK as RepoResult<SceneProgressRow>
  }
}

export async function getSceneProgressByUserAndScene(
  input: RepoClientInput & { userId: string; sceneId: string }
): Promise<RepoResult<SceneProgressRow[]>> {
  try {
    const { data, error } = await input.supabase
      .from('scene_progress')
      .select()
      .eq('user_id', input.userId)
      .eq('scene_id', input.sceneId)

    return { data: (data ?? []) as SceneProgressRow[], error: error ?? null }
  } catch (e) {
    console.error('getSceneProgressByUserAndScene', e)
    return FALLBACK as RepoResult<SceneProgressRow[]>
  }
}

export async function upsertSceneState(
  input: RepoClientInput & { payload: SceneStateInsert }
): Promise<RepoResult<SceneStateRow>> {
  try {
    const { data, error } = await input.supabase
      .from('scene_states')
      .upsert(input.payload, { onConflict: 'conversation_id' })
      .select()
      .single()

    return { data: data as SceneStateRow | null, error: error ?? null }
  } catch (e) {
    console.error('upsertSceneState', e)
    return FALLBACK as RepoResult<SceneStateRow>
  }
}

export async function getSceneStateByConversationId(
  input: RepoClientInput & { conversationId: string }
): Promise<RepoResult<SceneStateRow>> {
  try {
    const { data, error } = await input.supabase
      .from('scene_states')
      .select()
      .eq('conversation_id', input.conversationId)
      .maybeSingle()

    return { data: data as SceneStateRow | null, error: error ?? null }
  } catch (e) {
    console.error('getSceneStateByConversationId', e)
    return FALLBACK as RepoResult<SceneStateRow>
  }
}