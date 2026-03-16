import type { Lesson } from '@/lib/lesson/lesson-types'
import type { LessonRuntimeStateWithLesson } from '@/lib/lesson/lesson-runtime'
import type { DailyStoryPlan } from '../daily-story-types'
import { buildRuntimeStartInputFromDailyStoryPlan } from './daily-story-runtime-orchestrator'
import { startLessonRuntimeFromDailyStory } from './daily-story-lesson-runtime-starter'

export function buildStartedLessonRuntimeFromDailyStoryPlan(args: {
  plan: DailyStoryPlan
  lesson: Lesson
  phaseIndex?: number
  startedAt?: string
}): LessonRuntimeStateWithLesson {
  const { plan, lesson, phaseIndex, startedAt } = args
  const input = buildRuntimeStartInputFromDailyStoryPlan({ plan, phaseIndex })
  return startLessonRuntimeFromDailyStory({ input, lesson, startedAt })
}
