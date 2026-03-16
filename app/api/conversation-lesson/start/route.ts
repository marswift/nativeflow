import { NextResponse } from 'next/server'
import { startConversationLessonFacade } from '@/lib/conversation-lesson-runtime-facade'
import type { LessonSession } from '@/lib/lesson-runner'

type StartConversationLessonRequestBody = {
  session: LessonSession
  userId: string
  startedAt: string
}

type StartConversationLessonResponseBody =
  | {
      ok: true
      state: Awaited<ReturnType<typeof startConversationLessonFacade>>['state']
      status: Awaited<ReturnType<typeof startConversationLessonFacade>>['status']
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

function isLessonSessionStep(
  value: unknown
): value is LessonSession['steps'][number] {
  if (!isObjectRecord(value)) return false
  if (!hasOwn(value, 'id') || typeof value.id !== 'string') return false
  if (!hasOwn(value, 'orderIndex') || typeof value.orderIndex !== 'number')
    return false
  if (!hasOwn(value, 'type') || typeof value.type !== 'string') return false
  if (!hasOwn(value, 'prompt') || typeof value.prompt !== 'string')
    return false
  if (!hasOwn(value, 'instruction')) return false
  if (value.instruction !== null && typeof value.instruction !== 'string')
    return false
  if (!hasOwn(value, 'hint')) return false
  if (value.hint !== null && typeof value.hint !== 'string') return false
  if (!hasOwn(value, 'expectedAnswer')) return false
  if (
    value.expectedAnswer !== null &&
    typeof value.expectedAnswer !== 'string'
  )
    return false
  if (!hasOwn(value, 'aiRole')) return false
  if (value.aiRole !== null && typeof value.aiRole !== 'string') return false
  if (!hasOwn(value, 'patternSlotName')) return false
  if (
    value.patternSlotName !== null &&
    typeof value.patternSlotName !== 'string'
  )
    return false
  if (!hasOwn(value, 'patternSlotOptions')) return false
  if (!Array.isArray(value.patternSlotOptions)) return false
  return true
}

function isLessonSession(value: unknown): value is LessonSession {
  if (!isObjectRecord(value)) return false
  if (!hasOwn(value, 'lessonId') || !isNonEmptyString(value.lessonId))
    return false
  if (!hasOwn(value, 'sceneId') || typeof value.sceneId !== 'string')
    return false
  if (
    !hasOwn(value, 'microSituationId') ||
    typeof value.microSituationId !== 'string'
  )
    return false
  if (!hasOwn(value, 'title') || typeof value.title !== 'string')
    return false
  if (!hasOwn(value, 'description') || typeof value.description !== 'string')
    return false
  if (!hasOwn(value, 'goal') || typeof value.goal !== 'string') return false
  if (
    !hasOwn(value, 'estimatedMinutes') ||
    typeof value.estimatedMinutes !== 'number'
  )
    return false
  if (!hasOwn(value, 'steps') || !Array.isArray(value.steps)) return false
  for (let i = 0; i < value.steps.length; i++) {
    if (!isLessonSessionStep(value.steps[i])) return false
  }
  return true
}

function validateStartConversationLessonRequestBody(
  value: unknown
):
  | { ok: true; data: StartConversationLessonRequestBody }
  | { ok: false; error: Extract<StartConversationLessonResponseBody, { ok: false }>['error'] } {
  if (!isObjectRecord(value)) {
    return { ok: false, error: 'Invalid request body' }
  }
  if (!hasOwn(value, 'userId')) {
    return { ok: false, error: 'Invalid request body' }
  }
  const userId = value.userId
  if (!isNonEmptyString(userId)) {
    return { ok: false, error: 'Invalid userId' }
  }
  if (!hasOwn(value, 'startedAt')) {
    return { ok: false, error: 'Invalid request body' }
  }
  const startedAt = value.startedAt
  if (!isNonEmptyString(startedAt)) {
    return { ok: false, error: 'Invalid startedAt' }
  }
  if (!hasOwn(value, 'session')) {
    return { ok: false, error: 'Invalid request body' }
  }
  if (!isObjectRecord(value.session)) {
    return { ok: false, error: 'Invalid session' }
  }
  const session = value.session
  if (!hasOwn(session, 'lessonId') || !isNonEmptyString(session.lessonId)) {
    return { ok: false, error: 'Invalid session' }
  }
  if (!hasOwn(session, 'steps') || !Array.isArray(session.steps)) {
    return { ok: false, error: 'Invalid session steps' }
  }
  if (!isLessonSession(session)) {
    return { ok: false, error: 'Invalid session' }
  }
  return {
    ok: true,
    data: { session, userId, startedAt },
  }
}

export async function POST(
  req: Request
): Promise<NextResponse<StartConversationLessonResponseBody>> {
  try {
    const body: unknown = await req.json()
    const validated = validateStartConversationLessonRequestBody(body)
    if (!validated.ok) {
      return NextResponse.json(
        { ok: false, error: validated.error },
        { status: 400 }
      )
    }
    const { state, status } = await startConversationLessonFacade(validated.data)
    return NextResponse.json({ ok: true, state, status }, { status: 200 })
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid request body' },
      { status: 400 }
    )
  }
}
