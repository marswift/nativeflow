'use client'

import { useState } from 'react'

type ProgressPageResult = {
  httpStatus: number | null
  ok: boolean
  payload: unknown
  errorMessage?: string
}

type ProgressPayloadLike = {
  completedCount?: number
  totalCount?: number
  runCompleted?: boolean
  progress?: Array<{
    phase_id?: string
    status?: string
    lesson_id?: string | null
  }>
  plan?: {
    phases?: Array<{
      id?: string
      scene?: {
        sceneId?: string
        microSituationId?: string
      }
    }>
  }
  nextPhaseIndex?: number | null
  nextPhaseId?: string | null
  nextSceneId?: string | null
  nextMicroSituationId?: string | null
}

function isProgressPayloadLike(value: unknown): value is ProgressPayloadLike {
  return typeof value === 'object' && value !== null
}

function resolveCurrentPhaseSummary(payload: unknown): {
  phaseId: string | null
  sceneId: string | null
  microSituationId: string | null
  status: string | null
} | null {
  if (!isProgressPayloadLike(payload)) {
    return null
  }

  const phases = payload.plan?.phases
  const progress = payload.progress

  if (!Array.isArray(phases) || !Array.isArray(progress)) {
    return null
  }

  const activeProgress =
    progress.find((item) => item?.status === 'active') ??
    progress.find((item) => item?.status === 'pending') ??
    null

  if (activeProgress && typeof activeProgress.phase_id === 'string') {
    const matchedPhase =
      phases.find((phase) => phase?.id === activeProgress.phase_id) ?? null

    return {
      phaseId: activeProgress.phase_id,
      sceneId:
        typeof matchedPhase?.scene?.sceneId === 'string'
          ? matchedPhase.scene.sceneId
          : null,
      microSituationId:
        typeof matchedPhase?.scene?.microSituationId === 'string'
          ? matchedPhase.scene.microSituationId
          : null,
      status:
        typeof activeProgress.status === 'string'
          ? activeProgress.status
          : null,
    }
  }

  const lastCompleted = [...progress]
    .reverse()
    .find((item) => item?.status === 'completed') ?? null

  if (lastCompleted && typeof lastCompleted.phase_id === 'string') {
    const matchedPhase =
      phases.find((phase) => phase?.id === lastCompleted.phase_id) ?? null

    return {
      phaseId: lastCompleted.phase_id,
      sceneId:
        typeof matchedPhase?.scene?.sceneId === 'string'
          ? matchedPhase.scene.sceneId
          : null,
      microSituationId:
        typeof matchedPhase?.scene?.microSituationId === 'string'
          ? matchedPhase.scene.microSituationId
          : null,
      status:
        typeof lastCompleted.status === 'string'
          ? lastCompleted.status
          : null,
    }
  }

  return null
}

function resolvePhaseList(payload: unknown): Array<{
  phaseId: string | null
  sceneId: string | null
  microSituationId: string | null
  status: string | null
}> {
  if (!isProgressPayloadLike(payload)) {
    return []
  }

  const phases = payload.plan?.phases
  const progress = payload.progress

  if (!Array.isArray(phases)) {
    return []
  }

  return phases.map((phase) => {
    const phaseId = typeof phase?.id === 'string' ? phase.id : null
    const matchedProgress =
      Array.isArray(progress) && phaseId
        ? progress.find((item) => item?.phase_id === phaseId) ?? null
        : null

    return {
      phaseId,
      sceneId:
        typeof phase?.scene?.sceneId === 'string'
          ? phase.scene.sceneId
          : null,
      microSituationId:
        typeof phase?.scene?.microSituationId === 'string'
          ? phase.scene.microSituationId
          : null,
      status:
        typeof matchedProgress?.status === 'string'
          ? matchedProgress.status
          : 'not_started',
    }
  })
}

function resolveNextPhaseSummary(payload: unknown): {
  phaseIndex: number | null
  phaseId: string | null
  sceneId: string | null
  microSituationId: string | null
} | null {
  if (!isProgressPayloadLike(payload)) {
    return null
  }

  return {
    phaseIndex:
      typeof payload.nextPhaseIndex === 'number'
        ? payload.nextPhaseIndex
        : null,
    phaseId:
      typeof payload.nextPhaseId === 'string'
        ? payload.nextPhaseId
        : null,
    sceneId:
      typeof payload.nextSceneId === 'string'
        ? payload.nextSceneId
        : null,
    microSituationId:
      typeof payload.nextMicroSituationId === 'string'
        ? payload.nextMicroSituationId
        : null,
  }
}

type ErrorPayloadLike = {
  error?: string
}

function isErrorPayloadLike(value: unknown): value is ErrorPayloadLike {
  return typeof value === 'object' && value !== null
}

export default function DailyStoryPage() {
  const [userId, setUserId] = useState('demo-user')
  const [storyDate, setStoryDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  )
  const [result, setResult] = useState<ProgressPageResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleLoad(): Promise<void> {
    const trimmedUserId = userId.trim()
    const trimmedStoryDate = storyDate.trim()
    if (!trimmedUserId || !trimmedStoryDate) return

    setIsLoading(true)
    setResult(null)

    try {
      const res = await fetch('/api/daily-story/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: trimmedUserId,
          storyDate: trimmedStoryDate,
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

      setResult({
        httpStatus: res.status,
        ok: res.ok,
        payload,
        errorMessage: res.ok
          ? undefined
          : isErrorPayloadLike(payload)
            ? payload.error ?? `HTTP ${res.status}`
            : `HTTP ${res.status}`,
      })
    } catch (error) {
      setResult({
        httpStatus: null,
        ok: false,
        payload: null,
        errorMessage:
          error instanceof Error ? error.message : 'Load progress request failed',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const currentPhaseSummary = resolveCurrentPhaseSummary(result?.payload ?? null)
  const phaseList = resolvePhaseList(result?.payload ?? null)
  const nextPhaseSummary = resolveNextPhaseSummary(result?.payload ?? null)

  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif', maxWidth: 640 }}>
      <h1 style={{ marginBottom: 16 }}>Daily Story Progress</h1>

      <section style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 10 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>userId</label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            style={{ width: 240, padding: 6 }}
          />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>storyDate</label>
          <input
            type="date"
            value={storyDate}
            onChange={(e) => setStoryDate(e.target.value)}
            style={{ width: 240, padding: 6 }}
          />
        </div>
        <button
          type="button"
          onClick={() => void handleLoad()}
          disabled={isLoading}
          style={{ padding: '6px 12px' }}
        >
          Load Daily Story Progress
        </button>
      </section>

      {result !== null && isProgressPayloadLike(result.payload) && (
        <div
          style={{
            marginBottom: 12,
            fontSize: 12,
            background: '#f0f4f8',
            padding: 8,
          }}
        >
          <div>
            <strong>Completed phases:</strong>{' '}
            {result.payload.completedCount ?? '—'} / {result.payload.totalCount ?? '—'}
          </div>
          <div>
            <strong>Run completed:</strong>{' '}
            {result.payload.runCompleted === true ? 'yes' : 'no'}
          </div>
        </div>
      )}

      {currentPhaseSummary !== null && (
        <div
          style={{
            marginBottom: 12,
            fontSize: 12,
            background: '#f0f4f8',
            padding: 8,
          }}
        >
          <div><strong>Current phase id:</strong> {currentPhaseSummary.phaseId ?? '—'}</div>
          <div><strong>Current scene id:</strong> {currentPhaseSummary.sceneId ?? '—'}</div>
          <div><strong>Current micro situation id:</strong> {currentPhaseSummary.microSituationId ?? '—'}</div>
          <div><strong>Current phase status:</strong> {currentPhaseSummary.status ?? '—'}</div>
        </div>
      )}

      {nextPhaseSummary !== null && (
        <div
          style={{
            marginBottom: 12,
            fontSize: 12,
            background: '#f0f4f8',
            padding: 8,
          }}
        >
          <div><strong>Next phase index:</strong> {nextPhaseSummary.phaseIndex !== null ? nextPhaseSummary.phaseIndex + 1 : '—'}</div>
          <div><strong>Next phase id:</strong> {nextPhaseSummary.phaseId ?? '—'}</div>
          <div><strong>Next scene id:</strong> {nextPhaseSummary.sceneId ?? '—'}</div>
          <div><strong>Next micro situation id:</strong> {nextPhaseSummary.microSituationId ?? '—'}</div>
        </div>
      )}

      {phaseList.length > 0 && (
        <div style={{ marginBottom: 12, fontSize: 12 }}>
          <h2 style={{ fontSize: 14, marginBottom: 8, fontWeight: 600 }}>Phase list</h2>
          {phaseList.map((item, index) => (
            <div
              key={index}
              style={{
                background: '#f0f4f8',
                padding: 6,
                marginBottom: 4,
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px 16px',
              }}
            >
              <span>{index + 1}</span>
              <span><strong>phaseId:</strong> {item.phaseId ?? '—'}</span>
              <span><strong>status:</strong> {item.status ?? '—'}</span>
              <span><strong>sceneId:</strong> {item.sceneId ?? '—'}</span>
              <span><strong>microSituationId:</strong> {item.microSituationId ?? '—'}</span>
            </div>
          ))}
        </div>
      )}

      {result !== null && (
        <section>
          <h2 style={{ fontSize: 14, marginBottom: 8, fontWeight: 600 }}>Result</h2>
          <div
            style={{
              background: '#f5f5f5',
              padding: 10,
              marginBottom: 10,
              fontSize: 12,
            }}
          >
            <div>
              <strong>HTTP status:</strong> {result.httpStatus ?? '—'}
            </div>
            <div>
              <strong>Status:</strong> {result.ok ? 'ok' : 'failed'}
            </div>
            {result.errorMessage != null && (
              <div style={{ color: '#c00', marginTop: 4 }}>
                <strong>Error:</strong> {result.errorMessage}
              </div>
            )}
          </div>
          <div style={{ marginBottom: 4, fontSize: 12, fontWeight: 600 }}>Payload JSON</div>
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
    </div>
  )
}
