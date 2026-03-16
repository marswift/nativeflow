import { NextResponse } from 'next/server'
import {
  getDailyStoryRun,
  listPhaseProgressByRun,
} from '@/lib/daily-story-repository'
import { buildDefaultDailyStoryPlan } from '@/lib/daily-story-builder'

type DailyStoryProgressRequestBody = {
  userId?: unknown
  storyDate?: unknown
}

function isDailyStoryProgressRequestBody(
  value: unknown
): value is DailyStoryProgressRequestBody {
  return typeof value === 'object' && value !== null
}

/** Progress row shape returned by listPhaseProgressByRun; frontend uses phase_id, status, lesson_id */
type PhaseProgressRow = Awaited<
  ReturnType<typeof listPhaseProgressByRun>
>[number]

type DailyStoryProgressResponseBody =
  | {
      ok: true
      run: Awaited<ReturnType<typeof getDailyStoryRun>>
      progress: PhaseProgressRow[]
      plan: ReturnType<typeof buildDefaultDailyStoryPlan>
      completedCount: number
      totalCount: number
      runCompleted: boolean
      nextPhaseIndex: number | null
      nextPhaseId: string | null
      nextSceneId: string | null
      nextMicroSituationId: string | null
    }
  | {
      ok: false
      error: string
    }

function resolveNextPhaseMeta(input: {
  plan: ReturnType<typeof buildDefaultDailyStoryPlan>
  progress: PhaseProgressRow[]
}): {
  nextPhaseIndex: number | null
  nextPhaseId: string | null
  nextSceneId: string | null
  nextMicroSituationId: string | null
} {
  const { plan, progress } = input

  const firstNotCompletedIndex = plan.phases.findIndex((phase) => {
    const matched = progress.find((item) => item.phase_id === phase.id) ?? null
    return matched?.status !== 'completed'
  })

  if (firstNotCompletedIndex < 0) {
    return {
      nextPhaseIndex: null,
      nextPhaseId: null,
      nextSceneId: null,
      nextMicroSituationId: null,
    }
  }

  const phase = plan.phases[firstNotCompletedIndex] ?? null

  return {
    nextPhaseIndex: firstNotCompletedIndex,
    nextPhaseId: phase?.id ?? null,
    nextSceneId: phase?.scene?.sceneId ?? null,
    nextMicroSituationId: phase?.scene?.microSituationId ?? null,
  }
}

export async function POST(
  req: Request
): Promise<NextResponse<DailyStoryProgressResponseBody>> {
  try {
    const body: unknown = await req.json()
    if (!isDailyStoryProgressRequestBody(body)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid request body' },
        { status: 400 }
      )
    }

    const userId =
      typeof body.userId === 'string' ? body.userId.trim() : ''
    const storyDate =
      typeof body.storyDate === 'string' ? body.storyDate.trim() : ''

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

    const plan = buildDefaultDailyStoryPlan({ userId, storyDate })
    const run = await getDailyStoryRun({ userId, storyDate })

    if (!run) {
      const firstPhase = plan.phases[0] ?? null
      const nextPhaseMeta = firstPhase
        ? {
            nextPhaseIndex: 0,
            nextPhaseId: firstPhase.id ?? null,
            nextSceneId: firstPhase.scene?.sceneId ?? null,
            nextMicroSituationId: firstPhase.scene?.microSituationId ?? null,
          }
        : {
            nextPhaseIndex: null,
            nextPhaseId: null,
            nextSceneId: null,
            nextMicroSituationId: null,
          }
      return NextResponse.json(
        {
          ok: true,
          run: null,
          progress: [],
          plan,
          completedCount: 0,
          totalCount: plan.phases.length,
          runCompleted: false,
          ...nextPhaseMeta,
        },
        { status: 200 }
      )
    }

    const phaseProgressList = await listPhaseProgressByRun({ runId: run.id })
    const completedCount = phaseProgressList.filter(
      (item) => item.status === 'completed'
    ).length
    const totalCount = plan.phases.length
    const runCompleted =
      completedCount > 0 && completedCount === totalCount

    const nextPhaseMeta = resolveNextPhaseMeta({
      plan,
      progress: phaseProgressList,
    })

    return NextResponse.json(
      {
        ok: true,
        run,
        progress: phaseProgressList,
        plan,
        completedCount,
        totalCount,
        runCompleted,
        ...nextPhaseMeta,
      },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Progress request failed',
      },
      { status: 500 }
    )
  }
}
