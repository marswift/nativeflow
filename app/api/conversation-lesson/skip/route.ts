import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import {
  skipConversationLessonStep,
  type ConversationLessonFacadeState,
} from '@/lib/conversation-lesson-runtime-facade'

type SkipConversationLessonStepRequestBody = {
  state: ConversationLessonFacadeState
  skippedAt: string
}

type SkipConversationLessonStepResponseBody =
  | {
      ok: true
      state: Awaited<ReturnType<typeof skipConversationLessonStep>>['state']
      status: Awaited<ReturnType<typeof skipConversationLessonStep>>['status']
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

function validateSkipConversationLessonStepRequestBody(
  value: unknown
):
  | { ok: true; data: SkipConversationLessonStepRequestBody }
  | {
      ok: false
      error: Extract<
        SkipConversationLessonStepResponseBody,
        { ok: false }
      >['error']
    } {
  if (!isObjectRecord(value)) {
    return { ok: false, error: 'Invalid request body' }
  }
  if (!hasOwn(value, 'state')) {
    return { ok: false, error: 'Invalid request body' }
  }
  if (!hasOwn(value, 'skippedAt')) {
    return { ok: false, error: 'Invalid request body' }
  }
  if (!isObjectRecord(value.state)) {
    return { ok: false, error: 'Invalid state' }
  }
  if (!isMinimalConversationLessonFacadeState(value.state)) {
    return { ok: false, error: 'Invalid state' }
  }
  if (!isNonEmptyString(value.skippedAt)) {
    return { ok: false, error: 'Invalid skippedAt' }
  }
  return {
    ok: true,
    data: {
      state: value.state,
      skippedAt: value.skippedAt,
    },
  }
}

export async function POST(
  req: Request
): Promise<NextResponse<SkipConversationLessonStepResponseBody>> {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth as NextResponse<SkipConversationLessonStepResponseBody>

  try {
    const body: unknown = await req.json()
    const validated = validateSkipConversationLessonStepRequestBody(body)
    if (!validated.ok) {
      return NextResponse.json(
        { ok: false, error: validated.error },
        { status: 400 }
      )
    }
    const { state, status } = await skipConversationLessonStep(validated.data)
    return NextResponse.json({ ok: true, state, status }, { status: 200 })
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid request body' },
      { status: 400 }
    )
  }
}
