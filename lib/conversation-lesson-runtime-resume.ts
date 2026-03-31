import type { ConversationLessonFacadeState } from '@/lib/conversation-lesson-runtime-facade'
import { getLessonRuntimeStatus } from '@/lib/lesson-runtime-controller'
import { getConversationLessonRuntimeSession } from '@/lib/conversation-lesson-runtime-session-repository'
import { getSupabaseBrowserClient } from '@/lib/supabase/browser-client'

export type ResumeConversationLessonRuntimeInput = {
  userId: string
  lessonId: string
}

export type ResumeConversationLessonRuntimeResult = {
  state: ConversationLessonFacadeState | null
  found: boolean
  status: ReturnType<typeof getLessonRuntimeStatus> | null
  error: string | null
}

export async function resumeConversationLessonRuntime(
  input: ResumeConversationLessonRuntimeInput
): Promise<ResumeConversationLessonRuntimeResult> {
  const supabase = getSupabaseBrowserClient()
  const { data: row, error } = await getConversationLessonRuntimeSession({
    supabase,
    userId: input.userId,
    lessonId: input.lessonId,
  })
  if (error) {
    return { state: null, found: false, status: null, error: error.message }
  }
  if (row === null) {
    return { state: null, found: false, status: null, error: null }
  }
  const runtimeState = row.runtime_state
  if (runtimeState === null || typeof runtimeState !== 'object') {
    return { state: null, found: false, status: null, error: 'Invalid runtime state' }
  }
  const state = runtimeState as ConversationLessonFacadeState
  const status = getLessonRuntimeStatus(state)
  return {
    state,
    found: true,
    status,
    error: null,
  }
}
