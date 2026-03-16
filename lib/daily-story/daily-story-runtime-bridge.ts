import type { DailyStoryLessonSessionSeed } from './daily-story-lesson-bridge'

export type DailyStoryRuntimeStartInput = {
  lessonId: string
  sceneKey: string
  microSituationKey: string
  sourcePhaseId: string
  sourcePhaseType: string
  title: string
}

export function buildRuntimeStartInputFromDailyStorySeed(args: {
  seed: DailyStoryLessonSessionSeed
}): DailyStoryRuntimeStartInput {
  const { seed } = args
  const lessonId = `daily-story:${seed.phaseId}:${seed.sceneKey}:${seed.microSituationKey}`
  return {
    lessonId,
    sceneKey: seed.sceneKey,
    microSituationKey: seed.microSituationKey,
    sourcePhaseId: seed.phaseId,
    sourcePhaseType: seed.phaseType,
    title: seed.title,
  }
}
