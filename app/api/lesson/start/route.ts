import { NextResponse } from 'next/server'
import type {
  LessonStartRequest,
  LessonStartResponse,
} from '@/lib/lesson/lesson-api-contract'
import {
  bootstrapConversationSession,
  getConversationSnapshot,
} from '@/lib/conversation/conversation-facade'
import { getLessonById } from '@/lib/lesson/lesson-mock'

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function validateBody(
  value: unknown
): { ok: true; data: LessonStartRequest } | { ok: false; code: string; message: string } {
  if (!isObject(value)) {
    return { ok: false, code: 'INVALID_REQUEST', message: 'Invalid request body' }
  }
  if (!('lessonId' in value)) {
    return { ok: false, code: 'INVALID_REQUEST', message: 'lessonId is required' }
  }
  const lessonId = value.lessonId
  if (typeof lessonId !== 'string') {
    return { ok: false, code: 'INVALID_REQUEST', message: 'lessonId must be a string' }
  }
  if (!isNonEmptyString(lessonId)) {
    return { ok: false, code: 'INVALID_REQUEST', message: 'lessonId must not be empty' }
  }
  return { ok: true, data: { lessonId: lessonId.trim() } }
}

function errorStatus(code: string): number {
  switch (code) {
    case 'INVALID_REQUEST':
      return 400
    case 'LESSON_NOT_FOUND':
      return 404
    case 'INTERNAL_SERVER_ERROR':
      return 500
    default:
      return 400
  }
}

export async function POST(
  req: Request
): Promise<NextResponse<LessonStartResponse>> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: { code: 'INVALID_REQUEST', message: 'Invalid request body' },
      },
      { status: 400 }
    )
  }

  const validated = validateBody(body)
  if (!validated.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: validated.code, message: validated.message },
      },
      { status: errorStatus(validated.code) }
    )
  }

  const lesson = getLessonById(validated.data.lessonId)
  if (!lesson) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: 'LESSON_NOT_FOUND', message: 'Lesson not found' },
      },
      { status: 404 }
    )
  }

  try {
    const state = bootstrapConversationSession(lesson)
    const data = getConversationSnapshot(state)
    return NextResponse.json({ ok: true, data }, { status: 200 })
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' },
      },
      { status: 500 }
    )
  }
}
