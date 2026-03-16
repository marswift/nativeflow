import { NextResponse } from 'next/server'
import {
  getDailyStoryRun,
  markPhaseCompleted,
  listPhaseProgressByRun,
  markDailyStoryRunCompleted,
} from '@/lib/daily-story-repository'

type CompletePhaseRequestBody = {
  userId?: unknown
  storyDate?: unknown
  phaseId?: unknown
}

function isCompletePhaseRequestBody(
  value: unknown
): value is CompletePhaseRequestBody {
  return typeof value === 'object' && value !== null
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export async function POST(req: Request): Promise<NextResponse<unknown>> {
  try {
    const body: unknown = await req.json()
    if (!isCompletePhaseRequestBody(body)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid request body' },
        { status: 400 }
      )
    }

    const userId = typeof body.userId === 'string' ? body.userId.trim() : ''
    const storyDate = typeof body.storyDate === 'string' ? body.storyDate.trim() : ''
    const phaseId = typeof body.phaseId === 'string' ? body.phaseId.trim() : ''

    if (!nonEmptyString(userId) || !nonEmptyString(storyDate) || !nonEmptyString(phaseId)) {
      return NextResponse.json(
        { ok: false, error: 'userId, storyDate, and phaseId are required' },
        { status: 400 }
      )
    }

    const run = await getDailyStoryRun({ userId, storyDate })
    if (!run) {
      return NextResponse.json(
        { ok: false, error: 'Daily story run not found' },
        { status: 404 }
      )
    }

    await markPhaseCompleted({
      runId: run.id,
      phaseId,
    })

    const phaseProgressList = await listPhaseProgressByRun({
      runId: run.id,
    })

    const hasAnyPhase = phaseProgressList.length > 0
    const allCompleted =
      hasAnyPhase &&
      phaseProgressList.every((item) => item.status === 'completed')

    if (allCompleted) {
      await markDailyStoryRunCompleted({
        runId: run.id,
      })
    }

    return NextResponse.json(
      { ok: true, runId: run.id, phaseId, runCompleted: allCompleted },
      { status: 200 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Complete phase failed'
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    )
  }
}
