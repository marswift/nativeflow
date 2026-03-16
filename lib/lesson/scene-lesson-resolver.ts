import type { Lesson } from '@/lib/lesson/lesson-types'

export function resolveLessonForScene(args: {
  sceneKey: string
  microSituationKey: string
  lessons: Lesson[]
}): Lesson {
  const { sceneKey, microSituationKey, lessons } = args
  const found = lessons.find((l) => {
    const s = l as Lesson & { sceneKey?: string; microSituationKey?: string }
    return s.sceneKey === sceneKey && s.microSituationKey === microSituationKey
  })
  if (found == null) {
    throw new Error(
      `Lesson not found for scene "${sceneKey}" and microSituation "${microSituationKey}"`
    )
  }
  return found
}
