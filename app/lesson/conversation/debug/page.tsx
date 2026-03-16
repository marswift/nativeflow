'use client'

import { useState } from 'react'

type DebugResult = {
  action: 'start' | 'answer' | 'resume' | null
  endpoint: string | null
  httpStatus: number | null
  ok: boolean
  requestBody: unknown
  payload: unknown
  errorMessage: string | null
}

type DailyStoryStartResult = {
  httpStatus: number | null
  ok: boolean
  payload: unknown
  errorMessage?: string | null
}

type ErrorPayloadLike = {
  error?: string
}

function isErrorPayloadLike(value: unknown): value is ErrorPayloadLike {
  return typeof value === 'object' && value !== null
}

const ENDPOINTS = {
  start: '/api/conversation-lesson/start',
  answer: '/api/conversation-lesson/answer',
  resume: '/api/conversation-lesson/resume',
} as const

export default function ConversationDebugConsolePage() {
  const [userId, setUserId] = useState('debug-user')
  const [lessonId, setLessonId] = useState('lesson-001')
  const [missionDate, setMissionDate] = useState('2026-03-14')
  const [learnerUtterance, setLearnerUtterance] = useState('')
  const [result, setResult] = useState<DebugResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const [storyUserId, setStoryUserId] = useState('debug-user')
  const [storyMissionDate, setStoryMissionDate] = useState('2026-03-14')
  const [storyPhaseIndex, setStoryPhaseIndex] = useState(0)
  const [dailyStoryResult, setDailyStoryResult] = useState<DailyStoryStartResult | null>(null)

  async function runRequest(
    action: 'start' | 'answer' | 'resume',
    endpoint: string,
    body: unknown
  ): Promise<void> {
    setIsLoading(true)
    setResult(null)
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const rawText = await res.text()
      let payload: unknown
      if (!rawText || rawText.trim() === '') {
        payload = null
      } else {
        try {
          payload = JSON.parse(rawText)
        } catch {
          payload = {
            _parseError: 'Response was not valid JSON',
            rawText,
          }
        }
      }
      setResult({
        action,
        endpoint,
        httpStatus: res.status,
        ok: res.ok,
        requestBody: body,
        payload,
        errorMessage: res.ok
        ? null
        : isErrorPayloadLike(payload)
          ? payload.error ?? `HTTP ${res.status}`
          : `HTTP ${res.status}`,
      })
    } catch (err) {
      setResult({
        action,
        endpoint,
        httpStatus: null,
        ok: false,
        requestBody: body,
        payload: null,
        errorMessage: err instanceof Error ? err.message : 'Network or request error',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleStart = async (): Promise<void> => {
    const u = userId.trim()
    const l = lessonId.trim()
    const requestBody = { userId: u, lessonId: l, missionDate: missionDate.trim() || undefined }
    if (!u || !l) {
      setResult({
        action: 'start',
        endpoint: ENDPOINTS.start,
        httpStatus: null,
        ok: false,
        requestBody,
        payload: null,
        errorMessage: 'userId and lessonId are required',
      })
      return
    }
    await runRequest('start', ENDPOINTS.start, requestBody)
  }

  const handleSubmitAnswer = async (): Promise<void> => {
    const u = userId.trim()
    const l = lessonId.trim()
    const requestBody = {
      userId: u,
      lessonId: l,
      missionDate: missionDate.trim() || undefined,
      learnerUtterance: learnerUtterance.trim(),
    }
    if (!u || !l) {
      setResult({
        action: 'answer',
        endpoint: ENDPOINTS.answer,
        httpStatus: null,
        ok: false,
        requestBody,
        payload: null,
        errorMessage: 'userId and lessonId are required',
      })
      return
    }
    if (!learnerUtterance.trim()) {
      setResult({
        action: 'answer',
        endpoint: ENDPOINTS.answer,
        httpStatus: null,
        ok: false,
        requestBody,
        payload: null,
        errorMessage: 'learnerUtterance is required for Submit Answer',
      })
      return
    }
    await runRequest('answer', ENDPOINTS.answer, requestBody)
  }

  const handleResume = async (): Promise<void> => {
    const u = userId.trim()
    const l = lessonId.trim()
    const requestBody = { userId: u, lessonId: l }
    if (!u || !l) {
      setResult({
        action: 'resume',
        endpoint: ENDPOINTS.resume,
        httpStatus: null,
        ok: false,
        requestBody,
        payload: null,
        errorMessage: 'userId and lessonId are required',
      })
      return
    }
    await runRequest('resume', ENDPOINTS.resume, requestBody)
  }

  async function handleLaunchDailyStory(): Promise<void> {
    const user = storyUserId.trim()
    const storyDate = storyMissionDate.trim()
    if (!user) return

    setDailyStoryResult(null)

    try {
      const res = await fetch('/api/daily-story/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user,
          storyDate: storyDate || '2026-03-14',
          phaseIndex: storyPhaseIndex,
        }),
      })

      const rawText = await res.text()
      let payload: unknown = null
      if (rawText.trim()) {
        try {
          payload = JSON.parse(rawText)
        } catch {
          payload = {
            _parseError: 'Response was not valid JSON',
            rawText,
          }
        }
      }

      setDailyStoryResult({
        httpStatus: res.status,
        ok: res.ok,
        payload,
        errorMessage: res.ok
          ? null
          : isErrorPayloadLike(payload)
            ? payload.error ?? `HTTP ${res.status}`
            : `HTTP ${res.status}`,
      })
    } catch (err) {
      setDailyStoryResult({
        httpStatus: null,
        ok: false,
        payload: null,
        errorMessage: err instanceof Error ? err.message : 'Launch request failed',
      })
    }
  }

  const disabled = isLoading

  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif', maxWidth: 640 }}>
      <h1 style={{ marginBottom: 16 }}>NativeFlow Conversation Debug Console</h1>

      <section style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 14, marginBottom: 8, fontWeight: 600 }}>
          Identifiers
        </h2>
        <div style={{ marginBottom: 10 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>userId</label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            style={{ width: 240, padding: 6 }}
            disabled={disabled}
          />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>lessonId</label>
          <input
            type="text"
            value={lessonId}
            onChange={(e) => setLessonId(e.target.value)}
            style={{ width: 240, padding: 6 }}
            disabled={disabled}
          />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>missionDate</label>
          <input
            type="date"
            value={missionDate}
            onChange={(e) => setMissionDate(e.target.value)}
            style={{ width: 240, padding: 6 }}
            disabled={disabled}
          />
        </div>
      </section>

      <section style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 14, marginBottom: 8, fontWeight: 600 }}>
          Learner input
        </h2>
        <div>
          <label style={{ display: 'block', marginBottom: 4 }}>
            learnerUtterance
          </label>
          <input
            type="text"
            value={learnerUtterance}
            onChange={(e) => setLearnerUtterance(e.target.value)}
            style={{ width: '100%', padding: 6 }}
            disabled={disabled}
          />
        </div>
      </section>

      <section style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 14, marginBottom: 8, fontWeight: 600 }}>
          Actions
        </h2>
        <p style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
          Resume uses only userId and lessonId.
        </p>
        <div>
          <button
            type="button"
            onClick={handleStart}
            disabled={disabled}
            style={{ marginRight: 8, padding: '6px 12px' }}
          >
            Start Lesson
          </button>
          <button
            type="button"
            onClick={handleSubmitAnswer}
            disabled={disabled}
            style={{ marginRight: 8, padding: '6px 12px' }}
          >
            Submit Answer
          </button>
          <button
            type="button"
            onClick={handleResume}
            disabled={disabled}
            style={{ padding: '6px 12px' }}
          >
            Resume
          </button>
        </div>
      </section>

      <section style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 14, marginBottom: 8, fontWeight: 600 }}>
          Daily Story Runtime
        </h2>
        <div style={{ marginBottom: 10 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>storyUserId</label>
          <input
            type="text"
            value={storyUserId}
            onChange={(e) => setStoryUserId(e.target.value)}
            style={{ width: 240, padding: 6 }}
          />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>storyMissionDate</label>
          <input
            type="date"
            value={storyMissionDate}
            onChange={(e) => setStoryMissionDate(e.target.value)}
            style={{ width: 240, padding: 6 }}
          />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>storyPhaseIndex</label>
          <input
            type="number"
            min={0}
            value={storyPhaseIndex}
            onChange={(e) => setStoryPhaseIndex(Number(e.target.value) || 0)}
            style={{ width: 80, padding: 6 }}
          />
        </div>
        <button
          type="button"
          onClick={() => void handleLaunchDailyStory()}
          style={{ padding: '6px 12px' }}
        >
          Launch Daily Story Runtime
        </button>
      </section>

      {dailyStoryResult !== null && (
        <section style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 14, marginBottom: 8, fontWeight: 600 }}>
            Daily Story Result
          </h2>
          <div
            style={{
              background: '#f5f5f5',
              padding: 10,
              marginBottom: 10,
              fontSize: 12,
            }}
          >
            <div><strong>HTTP status:</strong> {dailyStoryResult.httpStatus ?? '—'}</div>
            <div><strong>Status:</strong> {dailyStoryResult.ok ? 'ok' : 'failed'}</div>
            {dailyStoryResult.errorMessage != null && (
              <div style={{ color: '#c00', marginTop: 4 }}><strong>Error:</strong> {dailyStoryResult.errorMessage}</div>
            )}
          </div>
          <div style={{ marginBottom: 4, fontSize: 12, fontWeight: 600 }}>Payload JSON</div>
          <pre style={{ background: '#f5f5f5', padding: 8, fontSize: 11, overflow: 'auto', margin: 0 }}>
            {JSON.stringify(dailyStoryResult.payload, null, 2)}
          </pre>
        </section>
      )}

      {result !== null && (
        <section>
          <h2 style={{ fontSize: 14, marginBottom: 8, fontWeight: 600 }}>
            Result
          </h2>
          <div
            style={{
              background: '#f5f5f5',
              padding: 10,
              marginBottom: 10,
              fontSize: 12,
            }}
          >
            <div><strong>Action:</strong> {result.action ?? '—'}</div>
            <div><strong>Endpoint:</strong> {result.endpoint ?? '—'}</div>
            <div><strong>HTTP status:</strong> {result.httpStatus != null ? result.httpStatus : '—'}</div>
            <div><strong>Status:</strong> {result.ok ? 'ok' : 'failed'}{isLoading ? ' (loading…)' : ''}</div>
            {result.errorMessage != null && (
              <div style={{ color: '#c00', marginTop: 4 }}><strong>Error:</strong> {result.errorMessage}</div>
            )}
            <div style={{ marginTop: 8, marginBottom: 4 }}><strong>Request Body:</strong></div>
            <pre style={{ background: '#eee', padding: 8, fontSize: 11, overflow: 'auto', margin: 0 }}>
              {JSON.stringify(result.requestBody, null, 2)}
            </pre>
          </div>
          <div style={{ marginBottom: 4, fontSize: 12, fontWeight: 600 }}>Payload</div>
          <pre
            style={{
              background: '#f5f5f5',
              padding: 12,
              overflow: 'auto',
              fontSize: 12,
              margin: 0,
            }}
          >
            {JSON.stringify(result.payload, null, 2)}
          </pre>
        </section>
      )}

      {isLoading && (
        <p style={{ marginTop: 12, fontSize: 12, color: '#666' }}>
          Loading…
        </p>
      )}
    </div>
  )
}
