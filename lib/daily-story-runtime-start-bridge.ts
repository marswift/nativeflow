import type { DailyStoryPlan } from './daily-story-types'
import { resolveDailyStoryLessonSessionSeed } from './daily-story-lesson-session-bridge'
import { buildLessonSessionFromDailyStorySeed } from './daily-story-lesson-session-adapter'

export type DailyStoryRuntimeStartInput = {
  session: ReturnType<typeof buildLessonSessionFromDailyStorySeed>
  userId: string
  startedAt: string
}

export function buildDailyStoryRuntimeStartInput(args: {
  plan: DailyStoryPlan
  userId: string
  startedAt: string
  phaseIndex?: number
}): DailyStoryRuntimeStartInput | null {
  const { plan, userId, startedAt, phaseIndex } = args
  const seed = resolveDailyStoryLessonSessionSeed({ plan, phaseIndex })
  if (seed === null) return null
  const session = buildLessonSessionFromDailyStorySeed({ seed })
  return { session, userId, startedAt }
}
