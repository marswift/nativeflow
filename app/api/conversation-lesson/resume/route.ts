import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { resumeConversationLessonRuntime } from '@/lib/conversation-lesson-runtime-resume'
import {
  getDailyStoryRun,
  listPhaseProgressByRun,
} from '@/lib/daily-story-repository'

type ResumeConversationLessonRequestBody = {
  userId: string
  lessonId: string
  missionDate?: string
}

type ResumeConversationLessonResponseBody =
  | {
      ok: true
      state: Awaited<ReturnType<typeof resumeConversationLessonRuntime>>['state']
      found: Awaited<ReturnType<typeof resumeConversationLessonRuntime>>['found']
      status: Awaited<ReturnType<typeof resumeConversationLessonRuntime>>['status']
      error: null
      runCompleted: boolean
      selectedPhaseId: string | null
      selectedSceneId: string | null
      selectedMicroSituationId: string | null
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

function validateResumeConversationLessonRequestBody(
  value: unknown
):
  | { ok: true; data: ResumeConversationLessonRequestBody }
  | { ok: false; error: string } {
  if (!isObjectRecord(value)) {
    return { ok: false, error: 'Invalid request body' }
  }
  if (!hasOwn(value, 'userId')) {
    return { ok: false, error: 'Invalid request body' }
  }
  if (!isNonEmptyString(value.userId)) {
    return { ok: false, error: 'Invalid userId' }
  }
  if (!hasOwn(value, 'lessonId')) {
    return { ok: false, error: 'Invalid request body' }
  }
  if (!isNonEmptyString(value.lessonId)) {
    return { ok: false, error: 'Invalid lessonId' }
  }
  if (hasOwn(value, 'missionDate') && typeof value.missionDate !== 'string') {
    return { ok: false, error: 'Invalid missionDate' }
  }
  return {
    ok: true,
    data: {
      userId: value.userId,
      lessonId: value.lessonId,
      missionDate:
        hasOwn(value, 'missionDate') && typeof value.missionDate === 'string'
          ? value.missionDate
          : undefined,
    },
  }
}

type ResumeStateSceneLike = {
  scene?: {
    phaseId?: string
    sceneId?: string
    microSituationId?: string
  }
}

function isResumeStateSceneLike(value: unknown): value is ResumeStateSceneLike {
  return typeof value === 'object' && value !== null
}

export async function POST(
  req: Request
): Promise<NextResponse<ResumeConversationLessonResponseBody>> {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth as NextResponse<ResumeConversationLessonResponseBody>

  try {
    const body: unknown = await req.json()
    const validated = validateResumeConversationLessonRequestBody(body)
    if (!validated.ok) {
      return NextResponse.json(
        { ok: false, error: validated.error },
        { status: 400 }
      )
    }
    const result = await resumeConversationLessonRuntime({
      userId: validated.data.userId,
      lessonId: validated.data.lessonId,
    })
    if (result.error !== null) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 500 }
      )
    }

    let runCompleted = false
    const userId = validated.data.userId.trim()
    const missionDate = validated.data.missionDate?.trim() ?? ''
    if (userId !== '' && missionDate !== '') {
      const run = await getDailyStoryRun({ userId, storyDate: missionDate })
      if (run) {
        const phaseProgressList = await listPhaseProgressByRun({ runId: run.id })
        const hasAnyPhase = phaseProgressList.length > 0
        runCompleted =
          hasAnyPhase &&
          phaseProgressList.every((item) => item.status === 'completed')
      }
    }

    let selectedPhaseId: string | null = null
    let selectedSceneId: string | null = null
    let selectedMicroSituationId: string | null = null

    const state = result.state
    const scene = isResumeStateSceneLike(state) ? state.scene ?? null : null

    if (scene != null) {
      if (typeof scene.phaseId === 'string') {
        selectedPhaseId = scene.phaseId
      }
      if (typeof scene.sceneId === 'string') {
        selectedSceneId = scene.sceneId
      }
      if (typeof scene.microSituationId === 'string') {
        selectedMicroSituationId = scene.microSituationId
      }
    }

    return NextResponse.json(
      {
        ok: true,
        state: result.state,
        found: result.found,
        status: result.status,
        error: null,
        runCompleted,
        selectedPhaseId,
        selectedSceneId,
        selectedMicroSituationId,
      },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Resume failed',
      },
      { status: 500 }
    )
  }
}
