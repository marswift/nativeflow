import type { DailyStoryPlan } from '../daily-story-types'
import { buildLessonSessionSeedFromDailyStoryPhase } from './daily-story-lesson-bridge'
import {
  buildRuntimeStartInputFromDailyStorySeed,
  type DailyStoryRuntimeStartInput,
} from './daily-story-runtime-bridge'

export function buildRuntimeStartInputFromDailyStoryPlan(args: {
  plan: DailyStoryPlan
  phaseIndex?: number
}): DailyStoryRuntimeStartInput {
  const seed = buildLessonSessionSeedFromDailyStoryPhase(args)
  return buildRuntimeStartInputFromDailyStorySeed({ seed })
}
