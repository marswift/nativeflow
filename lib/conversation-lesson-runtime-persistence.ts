import type { ConversationLessonFacadeState } from '@/lib/conversation-lesson-runtime-facade'
import {
  saveConversationLessonRuntimeSession,
  type RepoResult,
  type ConversationLessonRuntimeSessionRow,
} from '@/lib/conversation-lesson-runtime-session-repository'

export type PersistConversationLessonRuntimeInput = {
  state: ConversationLessonFacadeState
  userId: string
  completedAt?: string | null
}

function mapLessonStatusToRepoStatus(
  status: ConversationLessonFacadeState['lesson']['status']
): 'active' | 'completed' {
  if (status === 'completed') return 'completed'
  if (status === 'in_progress') return 'active'
  if (status === 'not_started') return 'active'
  return 'active'
}

export async function persistConversationLessonRuntime(
  input: PersistConversationLessonRuntimeInput
): Promise<RepoResult<ConversationLessonRuntimeSessionRow>> {
  const lessonId = input.state.session.lessonId
  const status = mapLessonStatusToRepoStatus(input.state.lesson.status)
  const startedAt = input.state.lesson.startedAt
  const completedAt = input.completedAt ?? input.state.lesson.completedAt ?? null
  return saveConversationLessonRuntimeSession({
    userId: input.userId,
    lessonId,
    runtimeState: input.state,
    status,
    startedAt,
    completedAt,
  })
}
