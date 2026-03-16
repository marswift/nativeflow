import type { Lesson } from '@/lib/lesson/lesson-types'
import {
  createLessonRuntimeState,
  startLesson,
  type LessonRuntimeStateWithLesson,
} from '@/lib/lesson/lesson-runtime'
import type { DailyStoryRuntimeStartInput } from './daily-story-runtime-bridge'

export function startLessonRuntimeFromDailyStory(args: {
  input: DailyStoryRuntimeStartInput
  lesson: Lesson
  startedAt?: string
}): LessonRuntimeStateWithLesson {
  const { input, lesson, startedAt } = args
  if (lesson.id !== input.lessonId) {
    throw new Error(
      `Lesson id mismatch: expected "${input.lessonId}", received "${lesson.id}"`
    )
  }
  const initialState = createLessonRuntimeState(lesson)
  return startLesson(initialState, startedAt)
}
