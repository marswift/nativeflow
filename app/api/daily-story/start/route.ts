import { NextResponse } from 'next/server'
import { buildDefaultDailyStoryPlan } from '@/lib/daily-story-builder'
import { startDailyStoryRuntimeFacade } from '@/lib/daily-story-runtime-facade'

type StartDailyStoryRequestBody = {
  userId?: unknown
  storyDate?: unknown
  phaseIndex?: unknown
}

function isStartDailyStoryRequestBody(
  value: unknown
): value is StartDailyStoryRequestBody {
  return typeof value === 'object' && value !== null
}

export async function POST(req: Request): Promise<NextResponse<unknown>> {
  try {
    const body: unknown = await req.json()
    if (!isStartDailyStoryRequestBody(body)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid request body' },
        { status: 400 }
      )
    }

    const userId = typeof body.userId === 'string' ? body.userId.trim() : ''
    const storyDate = typeof body.storyDate === 'string' ? body.storyDate.trim() : ''
    if (!userId) {
      return NextResponse.json(
        { ok: false, error: 'userId is required' },
        { status: 400 }
      )
    }
    if (!storyDate) {
      return NextResponse.json(
        { ok: false, error: 'storyDate is required' },
        { status: 400 }
      )
    }

    const plan = buildDefaultDailyStoryPlan({
      userId,
      storyDate,
    })

    const rawPhaseIndex =
      typeof body.phaseIndex === 'number' && Number.isFinite(body.phaseIndex)
        ? Math.floor(body.phaseIndex)
        : 0

    const safePhaseIndex = Math.max(
      0,
      Math.min(rawPhaseIndex, plan.phases.length - 1)
    )

    const selectedPhase = plan.phases[safePhaseIndex] ?? null

    const result = await startDailyStoryRuntimeFacade({
      plan,
      userId,
      startedAt: new Date().toISOString(),
      phaseIndex: safePhaseIndex,
    })

    return NextResponse.json(
      {
        ok: true,
        plan,
        result,
        selectedPhaseIndex: safePhaseIndex,
        selectedPhaseId: selectedPhase?.id ?? null,
        selectedSceneId: selectedPhase?.scene?.sceneId ?? null,
        selectedMicroSituationId: selectedPhase?.scene?.microSituationId ?? null,
      },
      { status: 200 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Start failed'
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    )
  }
}
