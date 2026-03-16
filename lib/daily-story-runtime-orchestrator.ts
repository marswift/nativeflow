import type { DailyStoryPlan } from './daily-story-types'
import { buildDailyStoryRuntimeStartInput } from './daily-story-runtime-start-bridge'
import {
  startLessonRuntime,
  type LessonRuntimeControllerState,
} from './lesson-runtime-controller'

export function startLessonRuntimeFromDailyStory(args: {
  plan: DailyStoryPlan
  userId: string
  startedAt: string
  phaseIndex?: number
}): LessonRuntimeControllerState | null {
  const runtimeStartInput = buildDailyStoryRuntimeStartInput(args)
  if (runtimeStartInput === null) return null
  const { state } = startLessonRuntime(runtimeStartInput)
  return state
}
