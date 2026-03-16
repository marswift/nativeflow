import { NextResponse } from 'next/server'
import type {
  LessonTurnRequest,
  LessonTurnResponse,
} from '@/lib/lesson/lesson-api-contract'
import {
  getConversationSnapshot,
  submitConversationTurn,
} from '@/lib/conversation/conversation-facade'

const SPEAKERS = ['user', 'ai', 'assistant', 'system'] as const
type IncomingSpeaker = (typeof SPEAKERS)[number]

/** Normalize incoming speaker to contract: user | assistant. */
function normalizeSpeaker(s: IncomingSpeaker): 'user' | 'assistant' {
  if (s === 'user') return 'user'
  if (s === 'assistant') return 'assistant'
  /* 'ai' | 'system' -> assistant */
  return 'assistant'
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

function validateBody(
  value: unknown
): { ok: true; data: LessonTurnRequest } | { ok: false; code: string; message: string } {
  if (!isObject(value)) {
    return { ok: false, code: 'INVALID_REQUEST', message: 'Invalid request body' }
  }
  if (!('state' in value) || !isObject(value.state)) {
    return { ok: false, code: 'INVALID_REQUEST', message: 'state must be an object' }
  }
  if (!('turn' in value) || !isObject(value.turn)) {
    return { ok: false, code: 'INVALID_REQUEST', message: 'turn must be an object' }
  }
  const t = value.turn as Record<string, unknown>
  if (!isString(t.id)) {
    return { ok: false, code: 'INVALID_REQUEST', message: 'turn.id must be a string' }
  }
  if (!isString(t.sceneId)) {
    return { ok: false, code: 'INVALID_REQUEST', message: 'turn.sceneId must be a string' }
  }
  if (!isString(t.speaker) || !SPEAKERS.includes(t.speaker as IncomingSpeaker)) {
    return { ok: false, code: 'INVALID_REQUEST', message: 'turn.speaker must be user, ai, assistant, or system' }
  }
  if (!isString(t.message)) {
    return { ok: false, code: 'INVALID_REQUEST', message: 'turn.message must be a string' }
  }
  if (!isString(t.createdAt)) {
    return { ok: false, code: 'INVALID_REQUEST', message: 'turn.createdAt must be a string' }
  }
  if ('advancePhrase' in value && value.advancePhrase !== undefined && !isBoolean(value.advancePhrase)) {
    return { ok: false, code: 'INVALID_REQUEST', message: 'advancePhrase must be a boolean' }
  }
  if ('advanceScene' in value && value.advanceScene !== undefined && !isBoolean(value.advanceScene)) {
    return { ok: false, code: 'INVALID_REQUEST', message: 'advanceScene must be a boolean' }
  }
  if ('completedAt' in value && value.completedAt !== undefined && !isString(value.completedAt)) {
    return { ok: false, code: 'INVALID_REQUEST', message: 'completedAt must be a string' }
  }
  const turn: LessonTurnRequest['turn'] = {
    id: t.id,
    sceneId: t.sceneId,
    phraseId: t.phraseId !== undefined && (isString(t.phraseId) || t.phraseId === null) ? (t.phraseId as string | null) : null,
    speaker: normalizeSpeaker(t.speaker as IncomingSpeaker),
    text: t.message,
    translation: null,
    order: 0,
  }
  const data: LessonTurnRequest = {
    state: value.state as unknown as LessonTurnRequest['state'],
    turn,
    ...(value.advancePhrase !== undefined && { advancePhrase: value.advancePhrase as boolean }),
    ...(value.advanceScene !== undefined && { advanceScene: value.advanceScene as boolean }),
    ...(value.completedAt !== undefined && { completedAt: value.completedAt as string }),
  }
  return { ok: true, data }
}

function errorStatus(code: string): number {
  switch (code) {
    case 'INVALID_REQUEST':
      return 400
    case 'INTERNAL_SERVER_ERROR':
      return 500
    default:
      return 400
  }
}

export async function POST(
  req: Request
): Promise<NextResponse<LessonTurnResponse>> {
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
      { ok: false, error: { code: validated.code, message: validated.message } },
      { status: errorStatus(validated.code) }
    )
  }

  try {
    const { state, turn, advancePhrase, advanceScene, completedAt } = validated.data
    const options =
      advancePhrase !== undefined || advanceScene !== undefined || completedAt !== undefined
        ? { advancePhrase, advanceScene, completedAt }
        : undefined
    const nextState = submitConversationTurn(state, turn, options)
    const snapshot = getConversationSnapshot(nextState)
    return NextResponse.json(
      { ok: true, data: { state: nextState, snapshot } },
      { status: 200 }
    )
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
