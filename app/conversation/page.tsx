'use client'

import { useState } from 'react'
import type { StartDailyStoryRuntimeFacadeResult } from '@/lib/daily-story-runtime-facade'

type StartConversationResult = {
  httpStatus: number | null
  ok: boolean
  payload: unknown
  errorMessage?: string
}

type StartPayloadLike = {
  result?: StartDailyStoryRuntimeFacadeResult
}

function isStartPayloadLike(value: unknown): value is StartPayloadLike {
  return typeof value === 'object' && value !== null
}

type AnswerResult = {
  httpStatus: number | null
  ok: boolean
  payload: unknown
  errorMessage?: string
}

type ResumeResult = {
  httpStatus: number | null
  ok: boolean
  payload: unknown
  errorMessage?: string
}

type AnswerPayloadLike = {
  state?: StartDailyStoryRuntimeFacadeResult['state']
  status?: StartDailyStoryRuntimeFacadeResult['status']
}

function isAnswerPayloadLike(value: unknown): value is AnswerPayloadLike {
  return typeof value === 'object' && value !== null
}

type ResumePayloadLike = {
  state?: StartDailyStoryRuntimeFacadeResult['state']
  status?: StartDailyStoryRuntimeFacadeResult['status']
}

function isResumePayloadLike(value: unknown): value is ResumePayloadLike {
  return typeof value === 'object' && value !== null
}

type ErrorPayloadLike = {
  error?: string
}

function isErrorPayloadLike(value: unknown): value is ErrorPayloadLike {
  return typeof value === 'object' && value !== null
}

type CompletePhaseResult = {
  httpStatus: number | null
  ok: boolean
  payload: unknown
  errorMessage?: string
}

type RuntimeStatePhaseLike = {
  scene?: {
    phaseId?: string
  }
  session?: {
    phaseId?: string
  }
}

function isRuntimeStatePhaseLike(value: unknown): value is RuntimeStatePhaseLike {
  return typeof value === 'object' && value !== null
}

function getCurrentPhaseIdFromRuntime(
  runtime: StartDailyStoryRuntimeFacadeResult | null
): string | null {
  const state = runtime?.state
  if (!isRuntimeStatePhaseLike(state)) {
    return null
  }

  const scenePhaseId =
    typeof state.scene?.phaseId === 'string' && state.scene.phaseId.trim()
      ? state.scene.phaseId
      : null

  const sessionPhaseId =
    typeof state.session?.phaseId === 'string' && state.session.phaseId.trim()
      ? state.session.phaseId
      : null

  return scenePhaseId ?? sessionPhaseId ?? null
}

type CompletePhasePayloadLike = {
  runCompleted?: boolean
}

function isCompletePhasePayloadLike(
  value: unknown
): value is CompletePhasePayloadLike {
  return typeof value === 'object' && value !== null
}

type ResumeCompletionPayloadLike = {
  runCompleted?: boolean
}

function isResumeCompletionPayloadLike(
  value: unknown
): value is ResumeCompletionPayloadLike {
  return typeof value === 'object' && value !== null
}

type StartSelectionPayloadLike = {
  selectedPhaseIndex?: number
  selectedPhaseId?: string | null
  selectedSceneId?: string | null
  selectedMicroSituationId?: string | null
}

function isStartSelectionPayloadLike(
  value: unknown
): value is StartSelectionPayloadLike {
  return typeof value === 'object' && value !== null
}

type ResumeSelectionPayloadLike = {
  selectedPhaseId?: string | null
  selectedSceneId?: string | null
  selectedMicroSituationId?: string | null
}

function isResumeSelectionPayloadLike(
  value: unknown
): value is ResumeSelectionPayloadLike {
  return typeof value === 'object' && value !== null
}

type ProgressResult = {
  httpStatus: number | null
  ok: boolean
  payload: unknown
  errorMessage?: string
}

type ProgressPhaseRowLike = {
  phase_id?: string
  status?: string
  lesson_id?: string | null
}

type ProgressPayloadLike = {
  completedCount?: number
  totalCount?: number
  runCompleted?: boolean
  plan?: {
    phases?: Array<{
      id?: string
      scene?: {
        sceneId?: string
        microSituationId?: string
      }
    }>
  }
  progress?: ProgressPhaseRowLike[]
  nextPhaseIndex?: number | null
  nextPhaseId?: string | null
  nextSceneId?: string | null
  nextMicroSituationId?: string | null
}

function isProgressPayloadLike(
  value: unknown
): value is ProgressPayloadLike {
  return typeof value === 'object' && value !== null
}

function resolveResumeLessonId(input: {
  runtime: StartDailyStoryRuntimeFacadeResult | null
  selectedPhaseId: string | null
  progressPayload: unknown
}): string | null {
  const sessionLessonId = input.runtime?.state?.session?.lessonId
  if (typeof sessionLessonId === 'string' && sessionLessonId.trim() !== '') {
    return sessionLessonId.trim()
  }
  const payload = input.progressPayload
  if (payload == null || typeof payload !== 'object' || !('progress' in payload)) return null
  const progress = (payload as { progress?: unknown }).progress
  if (!Array.isArray(progress)) return null
  const phaseIdTrimmed = (input.selectedPhaseId?.trim() ?? '')
  for (const item of progress) {
    if (item == null || typeof item !== 'object') continue
    const row = item as ProgressPhaseRowLike
    const rowPhaseId = (row.phase_id?.trim() ?? '')
    if (rowPhaseId !== phaseIdTrimmed) continue
    const lessonId = row.lesson_id
    if (typeof lessonId === 'string' && lessonId.trim() !== '') return lessonId.trim()
  }
  return null
}

function resolvePhaseIndexFromProgressPayload(
  payload: unknown,
  phaseId: string | null
): number | null {
  if (!isProgressPayloadLike(payload) || !phaseId) {
    return null
  }

  const phases = payload.plan?.phases
  if (!Array.isArray(phases)) {
    return null
  }

  const index = phases.findIndex((phase) => phase?.id === phaseId)
  return index >= 0 ? index : null
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

export default function ConversationPage() {
  const [userId, setUserId] = useState('demo-user')
  const [storyDate, setStoryDate] = useState(new Date().toISOString().slice(0, 10))
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [runtime, setRuntime] = useState<StartDailyStoryRuntimeFacadeResult | null>(null)
  const [startResult, setStartResult] = useState<StartConversationResult | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [learnerUtterance, setLearnerUtterance] = useState('')
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resumeResult, setResumeResult] = useState<ResumeResult | null>(null)
  const [isResuming, setIsResuming] = useState(false)
  const [completePhaseResult, setCompletePhaseResult] = useState<CompletePhaseResult | null>(null)
  const [isCompletingPhase, setIsCompletingPhase] = useState(false)
  const [isStoryCompleted, setIsStoryCompleted] = useState(false)
  const [selectedPhaseMeta, setSelectedPhaseMeta] = useState<{
    phaseIndex: number | null
    phaseId: string | null
    sceneId: string | null
    microSituationId: string | null
  } | null>(null)
  const [progressResult, setProgressResult] = useState<ProgressResult | null>(null)
  const [isLoadingProgress, setIsLoadingProgress] = useState(false)

  async function handleStart(): Promise<void> {
    const trimmedUserId = userId.trim()
    const trimmedStoryDate = storyDate.trim()
    if (!trimmedUserId || !trimmedStoryDate) return

    setIsStoryCompleted(false)
    setSelectedPhaseMeta(null)
    setIsStarting(true)
    setStartResult(null)

    try {
      const res = await fetch('/api/daily-story/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: trimmedUserId,
          storyDate: trimmedStoryDate,
          phaseIndex,
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

      const result: StartConversationResult = {
        httpStatus: res.status,
        ok: res.ok,
        payload,
        errorMessage: res.ok
          ? undefined
          : isErrorPayloadLike(payload)
            ? payload.error ?? `HTTP ${res.status}`
            : `HTTP ${res.status}`,
      }
      setStartResult(result)

      const startSelectedPhaseId =
        isStartSelectionPayloadLike(payload) &&
        typeof payload.selectedPhaseId === 'string'
          ? payload.selectedPhaseId
          : null

      if (isStartSelectionPayloadLike(payload)) {
        setSelectedPhaseMeta({
          phaseIndex:
            typeof payload.selectedPhaseIndex === 'number'
              ? payload.selectedPhaseIndex
              : null,
          phaseId: startSelectedPhaseId,
          sceneId:
            typeof payload.selectedSceneId === 'string'
              ? payload.selectedSceneId
              : null,
          microSituationId:
            typeof payload.selectedMicroSituationId === 'string'
              ? payload.selectedMicroSituationId
              : null,
        })
      }

      if (isStartPayloadLike(payload) && payload.result != null) {
        setRuntime(payload.result)
      }

      await handleLoadProgress({
        userId: trimmedUserId,
        storyDate: trimmedStoryDate,
        preserveExistingResult: true,
        phaseId: startSelectedPhaseId,
      })
    } catch (error) {
      setStartResult({
        httpStatus: null,
        ok: false,
        payload: null,
        errorMessage: error instanceof Error ? error.message : 'Start request failed',
      })
    } finally {
      setIsStarting(false)
    }
  }

  async function handleSubmitAnswer(): Promise<void> {
    if (!runtime?.state) return

    const trimmed = learnerUtterance.trim()
    if (!trimmed) return

    setIsSubmitting(true)
    setAnswerResult(null)

    try {
      const res = await fetch('/api/conversation-lesson/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          lessonId: runtime.state.session.lessonId,
          missionDate: storyDate,
          learnerUtterance: trimmed,
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

      const successResult: AnswerResult = {
        httpStatus: res.status,
        ok: res.ok,
        payload,
      }
      setAnswerResult(successResult)

      const maybeState = isAnswerPayloadLike(payload) ? payload.state ?? null : null
      const maybeStatus = isAnswerPayloadLike(payload) ? payload.status ?? null : null
      if (maybeState !== null || maybeStatus !== null) {
        setRuntime({
          state: maybeState,
          status: maybeStatus,
        })
      }
      setLearnerUtterance('')
    } catch (error) {
      const errorResult: AnswerResult = {
        httpStatus: null,
        ok: false,
        payload: null,
        errorMessage: error instanceof Error ? error.message : 'Request failed',
      }
      setAnswerResult(errorResult)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleResume(): Promise<void> {
    const trimmedUserId = userId.trim()
    if (!trimmedUserId) return

    setIsResuming(true)
    setResumeResult(null)

    const lessonId = resolveResumeLessonId({
      runtime,
      selectedPhaseId: selectedPhaseMeta?.phaseId ?? null,
      progressPayload: progressResult?.payload ?? null,
    })

    if (!lessonId) {
      setResumeResult({
        httpStatus: null,
        ok: false,
        payload: null,
        errorMessage: 'No lessonId available for resume',
      })
      setIsResuming(false)
      return
    }

    try {
      const res = await fetch('/api/conversation-lesson/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: trimmedUserId,
          lessonId,
          missionDate: storyDate,
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

      const result: ResumeResult = {
        httpStatus: res.status,
        ok: res.ok,
        payload,
      }

      setResumeResult(result)

      const resumedRunCompleted =
        isResumeCompletionPayloadLike(payload) && payload.runCompleted === true
      if (resumedRunCompleted) {
        setIsStoryCompleted(true)
      }

      const resumeSelectedPhaseId =
        isResumeSelectionPayloadLike(payload) &&
        typeof payload.selectedPhaseId === 'string'
          ? payload.selectedPhaseId
          : null

      if (isResumeSelectionPayloadLike(payload)) {
        setSelectedPhaseMeta((prev) => ({
          phaseIndex: prev?.phaseIndex ?? null,
          phaseId: resumeSelectedPhaseId,
          sceneId:
            typeof payload.selectedSceneId === 'string'
              ? payload.selectedSceneId
              : null,
          microSituationId:
            typeof payload.selectedMicroSituationId === 'string'
              ? payload.selectedMicroSituationId
              : null,
        }))
      }

      const maybeState = isResumePayloadLike(payload) ? payload.state ?? null : null
      const maybeStatus = isResumePayloadLike(payload) ? payload.status ?? null : null

      if (maybeState !== null || maybeStatus !== null) {
        setRuntime({
          state: maybeState,
          status: maybeStatus,
        })
      }

      await handleLoadProgress({
        userId: trimmedUserId,
        storyDate,
        preserveExistingResult: true,
        phaseId: resumeSelectedPhaseId,
      })
    } catch (error) {
      setResumeResult({
        httpStatus: null,
        ok: false,
        payload: null,
        errorMessage: error instanceof Error ? error.message : 'Resume request failed',
      })
    } finally {
      setIsResuming(false)
    }
  }

  async function handleStartNextPhase(nextPhaseIndex: number): Promise<{
    selectedPhaseId: string | null
  } | null> {
    const trimmedUserId = userId.trim()
    const trimmedStoryDate = storyDate.trim()

    if (!trimmedUserId || !trimmedStoryDate) return null

    setIsStarting(true)

    try {
      const res = await fetch('/api/daily-story/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: trimmedUserId,
          storyDate: trimmedStoryDate,
          phaseIndex: nextPhaseIndex,
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

      const result: StartConversationResult = {
        httpStatus: res.status,
        ok: res.ok,
        payload,
        errorMessage: res.ok
          ? undefined
          : isErrorPayloadLike(payload)
            ? payload.error ?? `HTTP ${res.status}`
            : `HTTP ${res.status}`,
      }
      setStartResult(result)

      if (!res.ok) return null
      if (!isStartPayloadLike(payload) || payload.result == null) return null

      setRuntime(payload.result)

      const selectedPhaseId =
        isStartSelectionPayloadLike(payload) &&
        typeof payload.selectedPhaseId === 'string'
          ? payload.selectedPhaseId
          : null

      if (isStartSelectionPayloadLike(payload)) {
        setSelectedPhaseMeta({
          phaseIndex: nextPhaseIndex,
          phaseId: selectedPhaseId,
          sceneId:
            typeof payload.selectedSceneId === 'string'
              ? payload.selectedSceneId
              : null,
          microSituationId:
            typeof payload.selectedMicroSituationId === 'string'
              ? payload.selectedMicroSituationId
              : null,
        })
      }

      return { selectedPhaseId }
    } catch (error) {
      console.error('Auto next phase start failed', error)
      return null
    } finally {
      setIsStarting(false)
    }
  }

  async function handleCompletePhase(): Promise<void> {
    const currentPhaseId = getCurrentPhaseIdFromRuntime(runtime)

    const trimmedUserId = userId.trim()
    const trimmedStoryDate = storyDate.trim()

    if (!trimmedUserId || !trimmedStoryDate || !currentPhaseId) return

    setIsCompletingPhase(true)
    setCompletePhaseResult(null)

    try {
      const res = await fetch('/api/daily-story/complete-phase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: trimmedUserId,
          storyDate: trimmedStoryDate,
          phaseId: currentPhaseId,
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

      setCompletePhaseResult({
        httpStatus: res.status,
        ok: res.ok,
        payload,
        errorMessage: res.ok ? undefined : (isErrorPayloadLike(payload) ? payload.error ?? `HTTP ${res.status}` : `HTTP ${res.status}`),
      })

      if (!res.ok) return

      const runCompleted =
        isCompletePhasePayloadLike(payload) && payload.runCompleted === true
      if (runCompleted) {
        setIsStoryCompleted(true)
      }

      const latestProgressPayload = await handleLoadProgress({
        userId: trimmedUserId,
        storyDate: trimmedStoryDate,
        preserveExistingResult: true,
        phaseId: currentPhaseId,
      })

      const next = resolveNextPhaseSummary(latestProgressPayload)
      const latestRunCompleted =
        isProgressPayloadLike(latestProgressPayload) &&
        latestProgressPayload.runCompleted === true

      if (
        next &&
        next.phaseIndex !== null &&
        next.phaseId &&
        !latestRunCompleted
      ) {
        const startedNextPhase = await handleStartNextPhase(next.phaseIndex)

        await handleLoadProgress({
          userId: trimmedUserId,
          storyDate: trimmedStoryDate,
          preserveExistingResult: true,
          phaseId: startedNextPhase?.selectedPhaseId ?? next.phaseId,
        })
      }
    } catch (error) {
      setCompletePhaseResult({
        httpStatus: null,
        ok: false,
        payload: null,
        errorMessage:
          error instanceof Error ? error.message : 'Complete phase request failed',
      })
    } finally {
      setIsCompletingPhase(false)
    }
  }

  async function handleLoadProgress(options?: {
    userId?: string
    storyDate?: string
    preserveExistingResult?: boolean
    phaseId?: string | null
  }): Promise<unknown | null> {
    const effectiveUserId = (options?.userId ?? userId).trim()
    const effectiveStoryDate = (options?.storyDate ?? storyDate).trim()
    if (!effectiveUserId || !effectiveStoryDate) return null

    setIsLoadingProgress(true)
    if (options?.preserveExistingResult !== true) {
      setProgressResult(null)
    }

    try {
      const res = await fetch('/api/daily-story/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: effectiveUserId,
          storyDate: effectiveStoryDate,
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

      setProgressResult({
        httpStatus: res.status,
        ok: res.ok,
        payload,
        errorMessage: res.ok
          ? undefined
          : isErrorPayloadLike(payload)
            ? payload.error ?? `HTTP ${res.status}`
            : `HTTP ${res.status}`,
      })

      if (res.ok && isProgressPayloadLike(payload)) {
        setIsStoryCompleted(payload.runCompleted === true)
      }

      const phaseId =
        options?.phaseId ??
        selectedPhaseMeta?.phaseId ??
        getCurrentPhaseIdFromRuntime(runtime)
      const resolvedPhaseIndex = resolvePhaseIndexFromProgressPayload(payload, phaseId)
      if (resolvedPhaseIndex !== null) {
        const matchedPhase =
          isProgressPayloadLike(payload) && Array.isArray(payload.plan?.phases)
            ? payload.plan.phases[resolvedPhaseIndex] ?? null
            : null

        setSelectedPhaseMeta((prev) => {
          const resolvedPhaseId =
            options?.phaseId ?? phaseId ?? prev?.phaseId ?? null
          const resolvedSceneId =
            (matchedPhase?.scene != null &&
              typeof matchedPhase.scene.sceneId === 'string')
              ? matchedPhase.scene.sceneId
              : (prev?.sceneId ?? null)
          const resolvedMicroSituationId =
            (matchedPhase?.scene != null &&
              typeof matchedPhase.scene.microSituationId === 'string')
              ? matchedPhase.scene.microSituationId
              : (prev?.microSituationId ?? null)

          return {
            phaseIndex: resolvedPhaseIndex,
            phaseId: resolvedPhaseId,
            sceneId: resolvedSceneId,
            microSituationId: resolvedMicroSituationId,
          }
        })
      }

      return payload
    } catch (error) {
      setProgressResult({
        httpStatus: null,
        ok: false,
        payload: null,
        errorMessage:
          error instanceof Error ? error.message : 'Load progress request failed',
      })
      return null
    } finally {
      setIsLoadingProgress(false)
    }
  }

  const currentPhaseId = getCurrentPhaseIdFromRuntime(runtime)
  const nextPhaseSummary = resolveNextPhaseSummary(progressResult?.payload ?? null)

  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif', maxWidth: 640 }}>
      <h1 style={{ marginBottom: 16 }}>NativeFlow Conversation</h1>

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
        <div style={{ marginBottom: 10 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>phaseIndex</label>
          <input
            type="number"
            min={0}
            value={phaseIndex}
            onChange={(e) => setPhaseIndex(Number(e.target.value) || 0)}
            style={{ width: 80, padding: 6 }}
          />
        </div>
        <button
          type="button"
          onClick={() => void handleStart()}
          disabled={isStarting}
          style={{ marginRight: 8, padding: '6px 12px' }}
        >
          Start Conversation
        </button>
        <button
          type="button"
          onClick={() => void handleResume()}
          disabled={isResuming}
          style={{ marginRight: 8, padding: '6px 12px' }}
        >
          Resume Conversation
        </button>
        <button
          type="button"
          onClick={() => void handleCompletePhase()}
          disabled={isCompletingPhase || isStoryCompleted || runtime?.state == null || currentPhaseId == null}
          style={{ marginRight: 8, padding: '6px 12px' }}
        >
          Complete Phase
        </button>
        <button
          type="button"
          onClick={() => void handleLoadProgress()}
          disabled={isLoadingProgress}
          style={{ padding: '6px 12px' }}
        >
          Load Progress
        </button>
      </section>

      {startResult !== null && (
        <section>
          <h2 style={{ fontSize: 14, marginBottom: 8, fontWeight: 600 }}>Start result</h2>
          <div
            style={{
              background: '#f5f5f5',
              padding: 10,
              marginBottom: 10,
              fontSize: 12,
            }}
          >
            <div>
              <strong>HTTP status:</strong> {startResult.httpStatus ?? '—'}
            </div>
            <div>
              <strong>Status:</strong> {startResult.ok ? 'ok' : 'failed'}
            </div>
            {startResult.errorMessage != null && (
              <div style={{ color: '#c00', marginTop: 4 }}>
                <strong>Error:</strong> {startResult.errorMessage}
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
            {JSON.stringify(startResult.payload, null, 2)}
          </pre>
        </section>
      )}

      {selectedPhaseMeta !== null && (
        <div
          style={{
            marginBottom: 12,
            fontSize: 12,
            background: '#f0f4f8',
            padding: 8,
          }}
        >
          <div><strong>Selected phase index:</strong> {selectedPhaseMeta.phaseIndex ?? '—'}</div>
          <div><strong>Selected phase id:</strong> {selectedPhaseMeta.phaseId ?? '—'}</div>
          <div><strong>Selected scene id:</strong> {selectedPhaseMeta.sceneId ?? '—'}</div>
          <div><strong>Selected micro situation id:</strong> {selectedPhaseMeta.microSituationId ?? '—'}</div>
        </div>
      )}

      {progressResult !== null &&
        isProgressPayloadLike(progressResult.payload) && (
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
            {progressResult.payload.completedCount ?? '—'} / {progressResult.payload.totalCount ?? '—'}
          </div>
          <div>
            <strong>Run completed:</strong>{' '}
            {progressResult.payload.runCompleted === true ? 'yes' : 'no'}
          </div>
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

      {(runtime !== null || isStoryCompleted) && (
        <div style={{ marginBottom: 12, fontSize: 12 }}>
          <strong>Story status:</strong> {isStoryCompleted ? 'completed' : 'active'}
        </div>
      )}

      {runtime !== null && (
        <section>
          <h2 style={{ fontSize: 14, marginBottom: 8, fontWeight: 600 }}>Result</h2>
          <div style={{ marginBottom: 8, fontSize: 12 }}>
            <strong>Runtime status:</strong>{' '}
            {runtime.status != null ? JSON.stringify(runtime.status) : '—'}
          </div>
          {runtime.state != null && (
            <div
              style={{
                background: '#f0f4f8',
                padding: 8,
                marginBottom: 10,
                fontSize: 12,
              }}
            >
              <div><strong>lessonId:</strong> {runtime.state.session?.lessonId ?? '—'}</div>
              {runtime.state.lesson?.currentStepIndex != null && (
                <div><strong>currentStepIndex:</strong> {runtime.state.lesson.currentStepIndex}</div>
              )}
              {runtime.state.steps != null && (
                <div><strong>steps:</strong> {runtime.state.steps.length}</div>
              )}
            </div>
          )}
          <div style={{ marginBottom: 4, fontSize: 12, fontWeight: 600 }}>State JSON</div>
          <pre
            style={{
              background: '#f5f5f5',
              padding: 12,
              overflow: 'auto',
              fontSize: 12,
              margin: 0,
            }}
          >
            {JSON.stringify(runtime.state, null, 2)}
          </pre>
        </section>
      )}

      {runtime?.state != null && (
        <section style={{ marginTop: 20, marginBottom: 20 }}>
          <h2 style={{ fontSize: 14, marginBottom: 8, fontWeight: 600 }}>Submit answer</h2>
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', marginBottom: 4 }}>learnerUtterance</label>
            <input
              type="text"
              value={learnerUtterance}
              onChange={(e) => setLearnerUtterance(e.target.value)}
              style={{ width: '100%', padding: 6 }}
              disabled={isSubmitting}
            />
          </div>
          <button
            type="button"
            onClick={() => void handleSubmitAnswer()}
            disabled={!learnerUtterance.trim() || isSubmitting}
            style={{ padding: '6px 12px' }}
          >
            Submit Answer
          </button>
        </section>
      )}

      {answerResult !== null && (
        <section>
          <h2 style={{ fontSize: 14, marginBottom: 8, fontWeight: 600 }}>Answer result</h2>
          <div
            style={{
              background: '#f5f5f5',
              padding: 10,
              marginBottom: 10,
              fontSize: 12,
            }}
          >
            <div>
              <strong>HTTP status:</strong> {answerResult.httpStatus ?? '—'}
            </div>
            <div>
              <strong>Status:</strong> {answerResult.ok ? 'ok' : 'failed'}
            </div>
            {answerResult.errorMessage != null && (
              <div style={{ color: '#c00', marginTop: 4 }}>
                <strong>Error:</strong> {answerResult.errorMessage}
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
            {JSON.stringify(answerResult.payload, null, 2)}
          </pre>
        </section>
      )}

      {resumeResult !== null && (
        <section>
          <h2 style={{ fontSize: 14, marginBottom: 8, fontWeight: 600 }}>Resume result</h2>
          <div
            style={{
              background: '#f5f5f5',
              padding: 10,
              marginBottom: 10,
              fontSize: 12,
            }}
          >
            <div>
              <strong>HTTP status:</strong> {resumeResult.httpStatus ?? '—'}
            </div>
            <div>
              <strong>Status:</strong> {resumeResult.ok ? 'ok' : 'failed'}
            </div>
            {resumeResult.errorMessage != null && (
              <div style={{ color: '#c00', marginTop: 4 }}>
                <strong>Error:</strong> {resumeResult.errorMessage}
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
            {JSON.stringify(resumeResult.payload, null, 2)}
          </pre>
        </section>
      )}

      {completePhaseResult !== null && (
        <section>
          <h2 style={{ fontSize: 14, marginBottom: 8, fontWeight: 600 }}>Complete phase result</h2>
          <div
            style={{
              background: '#f5f5f5',
              padding: 10,
              marginBottom: 10,
              fontSize: 12,
            }}
          >
            <div>
              <strong>HTTP status:</strong> {completePhaseResult.httpStatus ?? '—'}
            </div>
            <div>
              <strong>Status:</strong> {completePhaseResult.ok ? 'ok' : 'failed'}
            </div>
            {completePhaseResult.errorMessage != null && (
              <div style={{ color: '#c00', marginTop: 4 }}>
                <strong>Error:</strong> {completePhaseResult.errorMessage}
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
            {JSON.stringify(completePhaseResult.payload, null, 2)}
          </pre>
        </section>
      )}

      {progressResult !== null && (
        <section>
          <h2 style={{ fontSize: 14, marginBottom: 8, fontWeight: 600 }}>Progress result</h2>
          <div
            style={{
              background: '#f5f5f5',
              padding: 10,
              marginBottom: 10,
              fontSize: 12,
            }}
          >
            <div>
              <strong>HTTP status:</strong> {progressResult.httpStatus ?? '—'}
            </div>
            <div>
              <strong>Status:</strong> {progressResult.ok ? 'ok' : 'failed'}
            </div>
            {progressResult.errorMessage != null && (
              <div style={{ color: '#c00', marginTop: 4 }}>
                <strong>Error:</strong> {progressResult.errorMessage}
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
            {JSON.stringify(progressResult.payload, null, 2)}
          </pre>
        </section>
      )}
    </div>
  )
}
