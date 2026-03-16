import type { DailyStoryPlan } from './daily-story-types'
import {
  createDailyStoryRun,
  getDailyStoryRun,
  createPhaseProgress,
  getPhaseProgress,
  markPhaseStarted,
  setPhaseProgressLessonId,
} from './daily-story-repository'
import {
  getLessonRuntimeStatus,
  type LessonRuntimeControllerState,
} from './lesson-runtime-controller'
import { startLessonRuntimeFromDailyStory } from './daily-story-runtime-orchestrator'

export type StartDailyStoryRuntimeFacadeInput = {
  plan: DailyStoryPlan
  userId: string
  startedAt: string
  phaseIndex?: number
}

export type StartDailyStoryRuntimeFacadeResult = {
  state: LessonRuntimeControllerState | null
  status: ReturnType<typeof getLessonRuntimeStatus> | null
}

export async function startDailyStoryRuntimeFacade(
  input: StartDailyStoryRuntimeFacadeInput
): Promise<StartDailyStoryRuntimeFacadeResult> {
  const { plan, userId } = input

  const existingRun = await getDailyStoryRun({
    userId,
    storyDate: plan.storyDate,
  })

  let run = existingRun
  if (!run) {
    run = await createDailyStoryRun({
      userId,
      storyDate: plan.storyDate,
    })
  }

  const phaseIndex = Math.max(0, Math.min(input.phaseIndex ?? 0, plan.phases.length - 1))
  const phase = plan.phases[phaseIndex]
  if (!phase) {
    return { state: null, status: null }
  }

  const existingProgress = await getPhaseProgress({
    runId: run.id,
    phaseId: phase.id,
  })

  if (!existingProgress) {
    await createPhaseProgress({
      runId: run.id,
      phaseId: phase.id,
    })
  }

  await markPhaseStarted({
    runId: run.id,
    phaseId: phase.id,
  })

  const state = startLessonRuntimeFromDailyStory(input)
  if (state === null) {
    return { state: null, status: null }
  }

  const lessonId = state.session?.lessonId
  if (typeof lessonId === 'string' && lessonId.trim() !== '') {
    await setPhaseProgressLessonId({
      runId: run.id,
      phaseId: phase.id,
      lessonId,
    })
  }

  const status = getLessonRuntimeStatus(state)
  return { state, status }
}
