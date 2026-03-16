import type { Lesson } from '@/lib/lesson/lesson-types'
import type { LessonRuntimeStateWithLesson } from '@/lib/lesson/lesson-runtime'
import { resolveLessonForScene } from '@/lib/lesson/scene-lesson-resolver'
import type { DailyStoryPlan } from '../daily-story-types'
import { buildRuntimeStartInputFromDailyStoryPlan } from './daily-story-runtime-orchestrator'
import { startLessonRuntimeFromDailyStory } from './daily-story-lesson-runtime-starter'

export function buildStartedLessonRuntimeByResolvingScene(args: {
  plan: DailyStoryPlan
  lessons: Lesson[]
  phaseIndex?: number
  startedAt?: string
}): LessonRuntimeStateWithLesson {
  const { plan, lessons, phaseIndex, startedAt } = args
  const input = buildRuntimeStartInputFromDailyStoryPlan({ plan, phaseIndex })
  const lesson = resolveLessonForScene({
    sceneKey: input.sceneKey,
    microSituationKey: input.microSituationKey,
    lessons,
  })
  return startLessonRuntimeFromDailyStory({ input, lesson, startedAt })
}
