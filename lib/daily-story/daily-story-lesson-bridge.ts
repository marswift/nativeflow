import type { DailyStoryPlan, DailyStoryPhase } from '../daily-story-types'

export type DailyStoryLessonSessionSeed = {
  phaseId: string
  phaseType: DailyStoryPhase['type']
  sceneKey: string
  microSituationKey: string
  title: string
}

export function getCurrentDailyStoryPhase(args: {
  plan: DailyStoryPlan
  phaseIndex?: number
}): DailyStoryPhase {
  const idx = args.phaseIndex ?? args.plan.currentPhaseIndex
  const phase = args.plan.phases[idx]
  if (phase == null) {
    throw new Error(`Daily story phase not found at index ${idx}`)
  }
  return phase
}

export function buildLessonSessionSeedFromDailyStoryPhase(args: {
  plan: DailyStoryPlan
  phaseIndex?: number
}): DailyStoryLessonSessionSeed {
  const phase = getCurrentDailyStoryPhase(args)
  const scene = phase.scene
  if (scene == null) {
    throw new Error(`Daily story phase "${phase.id}" has no scene reference`)
  }
  const title = `${phase.title} – ${scene.title}`
  return {
    phaseId: phase.id,
    phaseType: phase.type,
    sceneKey: scene.sceneId,
    microSituationKey: scene.microSituationId,
    title,
  }
}
