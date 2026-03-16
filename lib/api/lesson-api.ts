/**
 * Thin browser-safe API client for lesson conversation routes.
 * Calls HTTP API only; no React, no server imports.
 */

import type {
  LessonStartRequest,
  LessonStartResponse,
} from '@/lib/lesson/lesson-api-contract'

const ROUTES = {
  start: '/api/lesson/start',
} as const

function isLessonStartResponse(value: unknown): value is LessonStartResponse {
  if (typeof value !== 'object' || value === null) return false
  const o = value as Record<string, unknown>
  if (o.ok === true) {
    return typeof o.data === 'object' && o.data !== null
  }
  if (o.ok === false) {
    const err = o.error
    if (typeof err !== 'object' || err === null) return false
    const e = err as Record<string, unknown>
    return typeof e.code === 'string' && typeof e.message === 'string'
  }
  return false
}

async function postJson(
  path: string,
  body: LessonStartRequest,
  validate: (v: unknown) => v is LessonStartResponse
): Promise<LessonStartResponse> {
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const raw: unknown = await res.json().catch(() => null)
    if (!validate(raw)) {
      return {
        ok: false,
        error: { code: 'INVALID_RESPONSE', message: 'Invalid response shape' },
      }
    }
    return raw
  } catch {
    return {
      ok: false,
      error: { code: 'NETWORK_ERROR', message: 'Network request failed' },
    }
  }
}

export function startLesson(request: LessonStartRequest): Promise<LessonStartResponse> {
  return postJson(ROUTES.start, request, isLessonStartResponse)
}
