import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'

const TABLE = 'conversation_lesson_runtime_sessions'

export type ConversationLessonRuntimeSessionStatus =
  | 'active'
  | 'completed'
  | 'abandoned'

export type ConversationLessonRuntimeSessionRow = {
  id: string
  user_id: string
  lesson_id: string
  runtime_state: unknown
  status: ConversationLessonRuntimeSessionStatus
  started_at: string
  completed_at: string | null
  updated_at: string
}

export type SaveConversationLessonRuntimeSessionInput = {
  supabase: SupabaseClient
  userId: string
  lessonId: string
  runtimeState: unknown
  status: ConversationLessonRuntimeSessionStatus
  startedAt: string
  completedAt?: string | null
}

export type GetConversationLessonRuntimeSessionInput = {
  supabase: SupabaseClient
  userId: string
  lessonId: string
}

export type RepoResult<T> = { data: T | null; error: PostgrestError | null }

export async function saveConversationLessonRuntimeSession(
  input: SaveConversationLessonRuntimeSessionInput
): Promise<RepoResult<ConversationLessonRuntimeSessionRow>> {
  const now = new Date().toISOString()
  const payload = {
    user_id: input.userId,
    lesson_id: input.lessonId,
    runtime_state: input.runtimeState,
    status: input.status,
    started_at: input.startedAt,
    completed_at: input.completedAt ?? null,
    updated_at: now,
  }

  const { data, error } = await input.supabase
    .from(TABLE)
    .insert(payload)
    .select()
    .single()

  return {
    data: data as ConversationLessonRuntimeSessionRow | null,
    error: error ?? null,
  }
}

export async function getConversationLessonRuntimeSession(
  input: GetConversationLessonRuntimeSessionInput
): Promise<RepoResult<ConversationLessonRuntimeSessionRow | null>> {
  const { data, error } = await input.supabase
    .from(TABLE)
    .select()
    .eq('user_id', input.userId)
    .eq('lesson_id', input.lessonId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return {
    data: data as ConversationLessonRuntimeSessionRow | null,
    error: error ?? null,
  }
}
