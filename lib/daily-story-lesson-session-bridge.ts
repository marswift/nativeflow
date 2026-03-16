import type { DailyStoryPlan } from './daily-story-types'

export type DailyStoryLessonSessionSeed = {
  lessonId: string
  sceneId: string
  microSituationId: string
  title: string
  description: string | null
}

export function resolveDailyStoryLessonSessionSeed(args: {
  plan: DailyStoryPlan
  phaseIndex?: number
}): DailyStoryLessonSessionSeed | null {
  const { plan } = args
  const idx = args.phaseIndex ?? plan.currentPhaseIndex
  if (idx < 0 || idx >= plan.phases.length) return null
  const phase = plan.phases[idx]
  if (phase == null) return null
  return {
    lessonId: `${plan.id}:${phase.id}`,
    sceneId: phase.scene.sceneId,
    microSituationId: phase.scene.microSituationId,
    title: phase.title,
    description: phase.description,
  }
}
