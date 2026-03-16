import { NextResponse } from 'next/server'
import {
  submitConversationLessonAnswer,
  type ConversationLessonFacadeState,
} from '@/lib/conversation-lesson-runtime-facade'

type SubmitConversationLessonAnswerRequestBody = {
  state: ConversationLessonFacadeState
  learnerUtterance?: string | null
  normalizedAnswer?: string | null
  expectedAnswer?: string | null
  quality?: 'unknown' | 'correct' | 'acceptable' | 'needs_retry'
  submittedAt: string
  markStepCompleted?: boolean
}

type SubmitConversationLessonAnswerResponseBody =
  | {
      ok: true
      state: Awaited<ReturnType<typeof submitConversationLessonAnswer>>['state']
      status: Awaited<ReturnType<typeof submitConversationLessonAnswer>>['status']
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

function isValidQuality(
  value: unknown
): value is 'unknown' | 'correct' | 'acceptable' | 'needs_retry' {
  return (
    value === 'unknown' ||
    value === 'correct' ||
    value === 'acceptable' ||
    value === 'needs_retry'
  )
}

function validateSubmitConversationLessonAnswerRequestBody(
  value: unknown
):
  | { ok: true; data: SubmitConversationLessonAnswerRequestBody }
  | {
      ok: false
      error: Extract<
        SubmitConversationLessonAnswerResponseBody,
        { ok: false }
      >['error']
    } {
  if (!isObjectRecord(value)) {
    return { ok: false, error: 'Invalid request body' }
  }
  if (!hasOwn(value, 'state')) {
    return { ok: false, error: 'Invalid request body' }
  }
  if (!hasOwn(value, 'submittedAt')) {
    return { ok: false, error: 'Invalid request body' }
  }
  if (!isObjectRecord(value.state)) {
    return { ok: false, error: 'Invalid state' }
  }
  if (!isMinimalConversationLessonFacadeState(value.state)) {
    return { ok: false, error: 'Invalid state' }
  }
  if (!isNonEmptyString(value.submittedAt)) {
    return { ok: false, error: 'Invalid submittedAt' }
  }
  if (hasOwn(value, 'learnerUtterance')) {
    const u = value.learnerUtterance
    if (u !== null && typeof u !== 'string') {
      return { ok: false, error: 'Invalid learnerUtterance' }
    }
  }
  if (hasOwn(value, 'normalizedAnswer')) {
    const u = value.normalizedAnswer
    if (u !== null && typeof u !== 'string') {
      return { ok: false, error: 'Invalid normalizedAnswer' }
    }
  }
  if (hasOwn(value, 'expectedAnswer')) {
    const u = value.expectedAnswer
    if (u !== null && typeof u !== 'string') {
      return { ok: false, error: 'Invalid expectedAnswer' }
    }
  }
  if (hasOwn(value, 'quality')) {
    if (!isValidQuality(value.quality)) {
      return { ok: false, error: 'Invalid quality' }
    }
  }
  if (hasOwn(value, 'markStepCompleted')) {
    if (typeof value.markStepCompleted !== 'boolean') {
      return { ok: false, error: 'Invalid markStepCompleted' }
    }
  }
  const state = value.state
  const submittedAt = value.submittedAt
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
  const normalizedAnswer: string | null | undefined = hasOwn(
    value,
    'normalizedAnswer'
  )
    ? value.normalizedAnswer === null
      ? null
      : typeof value.normalizedAnswer === 'string'
        ? value.normalizedAnswer
        : undefined
    : undefined
  const expectedAnswer: string | null | undefined = hasOwn(
    value,
    'expectedAnswer'
  )
    ? value.expectedAnswer === null
      ? null
      : typeof value.expectedAnswer === 'string'
        ? value.expectedAnswer
        : undefined
    : undefined
  const quality: 'unknown' | 'correct' | 'acceptable' | 'needs_retry' | undefined =
    hasOwn(value, 'quality') && isValidQuality(value.quality)
      ? value.quality
      : undefined
  const markStepCompleted: boolean | undefined = hasOwn(
    value,
    'markStepCompleted'
  )
    ? typeof value.markStepCompleted === 'boolean'
      ? value.markStepCompleted
      : undefined
    : undefined
  return {
    ok: true,
    data: {
      state,
      submittedAt,
      ...(learnerUtterance !== undefined && { learnerUtterance }),
      ...(normalizedAnswer !== undefined && { normalizedAnswer }),
      ...(expectedAnswer !== undefined && { expectedAnswer }),
      ...(quality !== undefined && { quality }),
      ...(markStepCompleted !== undefined && { markStepCompleted }),
    },
  }
}

export async function POST(
  req: Request
): Promise<NextResponse<SubmitConversationLessonAnswerResponseBody>> {
  try {
    const body: unknown = await req.json()
    const validated = validateSubmitConversationLessonAnswerRequestBody(body)
    if (!validated.ok) {
      return NextResponse.json(
        { ok: false, error: validated.error },
        { status: 400 }
      )
    }
    const { state, status } = await submitConversationLessonAnswer(validated.data)
    return NextResponse.json({ ok: true, state, status }, { status: 200 })
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid request body' },
      { status: 400 }
    )
  }
}
