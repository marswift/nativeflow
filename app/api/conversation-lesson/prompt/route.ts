import { NextResponse } from 'next/server'
import { generateAIConversationTurn } from '@/lib/ai-conversation-engine'
import { getLessonRuntimeStatus } from '@/lib/lesson-runtime-controller'
import type { ConversationLessonFacadeState } from '@/lib/conversation-lesson-runtime-facade'
import type { PromptAssemblyResult } from '@/lib/prompt-assembly-types'

type GetConversationLessonPromptRequestBody = {
  state: ConversationLessonFacadeState
  promptAssemblyResult: PromptAssemblyResult
  learnerUtterance?: string | null
  liveTopics?: string[]
}

type GetConversationLessonPromptResponseBody =
  | {
      ok: true
      turn: Awaited<ReturnType<typeof generateAIConversationTurn>>
      status: ReturnType<typeof getLessonRuntimeStatus>
    }
  | {
      ok: false
      error: string
    }

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function hasOwn<K extends string>(
  value: Record<string, unknown>,
  key: K
): value is Record<K, unknown> & Record<string, unknown> {
  return Object.prototype.hasOwnProperty.call(value, key)
}

function isMinimalConversationLessonFacadeState(
  value: unknown
): value is ConversationLessonFacadeState {
  if (!isObjectRecord(value)) return false
  if (!hasOwn(value, 'session')) return false
  if (!isObjectRecord(value.session)) return false
  if (
    !hasOwn(value.session, 'lessonId') ||
    !isNonEmptyString(value.session.lessonId)
  )
    return false
  if (!hasOwn(value, 'steps') || !Array.isArray(value.steps)) return false
  return true
}

function isMinimalPromptAssemblyResult(
  value: unknown
): value is PromptAssemblyResult {
  if (!isObjectRecord(value)) return false
  if (!hasOwn(value, 'memory')) return false
  if (!isObjectRecord(value.memory)) return false
  if (!hasOwn(value, 'policy')) return false
  if (!isObjectRecord(value.policy)) return false
  return true
}

function validateGetConversationLessonPromptRequestBody(
  value: unknown
):
  | { ok: true; data: GetConversationLessonPromptRequestBody }
  | {
      ok: false
      error: Extract<
        GetConversationLessonPromptResponseBody,
        { ok: false }
      >['error']
    } {
  if (!isObjectRecord(value)) {
    return { ok: false, error: 'Invalid request body' }
  }
  if (!hasOwn(value, 'state')) {
    return { ok: false, error: 'Invalid request body' }
  }
  if (!hasOwn(value, 'promptAssemblyResult')) {
    return { ok: false, error: 'Invalid request body' }
  }
  if (!isObjectRecord(value.state)) {
    return { ok: false, error: 'Invalid state' }
  }
  if (!isObjectRecord(value.promptAssemblyResult)) {
    return { ok: false, error: 'Invalid promptAssemblyResult' }
  }
  if (hasOwn(value, 'learnerUtterance')) {
    const u = value.learnerUtterance
    if (u !== null && typeof u !== 'string') {
      return { ok: false, error: 'Invalid learnerUtterance' }
    }
  }
  if (hasOwn(value, 'liveTopics')) {
    const t = value.liveTopics
    if (!Array.isArray(t) || t.some((x) => typeof x !== 'string')) {
      return { ok: false, error: 'Invalid liveTopics' }
    }
  }
  if (!isMinimalConversationLessonFacadeState(value.state)) {
    return { ok: false, error: 'Invalid state' }
  }
  if (!isMinimalPromptAssemblyResult(value.promptAssemblyResult)) {
    return { ok: false, error: 'Invalid promptAssemblyResult' }
  }
  const learnerUtterance: string | null | undefined = hasOwn(
    value,
    'learnerUtterance'
  )
    ? value.learnerUtterance === null
      ? null
      : typeof value.learnerUtterance === 'string'
        ? value.learnerUtterance
        : undefined
    : undefined
  const liveTopics = hasOwn(value, 'liveTopics') && Array.isArray(value.liveTopics)
    ? (value.liveTopics as string[])
    : undefined
  return {
    ok: true,
    data: {
      state: value.state,
      promptAssemblyResult: value.promptAssemblyResult,
      ...(learnerUtterance !== undefined && { learnerUtterance }),
      ...(liveTopics !== undefined && { liveTopics }),
    },
  }
}

export async function POST(
  req: Request
): Promise<NextResponse<GetConversationLessonPromptResponseBody>> {
  try {
    const body: unknown = await req.json()
    const validated = validateGetConversationLessonPromptRequestBody(body)
    if (!validated.ok) {
      return NextResponse.json(
        { ok: false, error: validated.error },
        { status: 400 }
      )
    }
    const { state, promptAssemblyResult, learnerUtterance, liveTopics } = validated.data
    const turn = await generateAIConversationTurn({
      promptAssemblyResult,
      learnerUtterance,
      liveTopics,
    })
    const status = getLessonRuntimeStatus(state)
    return NextResponse.json(
      { ok: true, turn, status },
      { status: 200 }
    )
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid request body' },
      { status: 400 }
    )
  }
}
