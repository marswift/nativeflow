import type { LessonSession } from './lesson-runner'
import type { DailyStoryLessonSessionSeed } from './daily-story-lesson-session-bridge'

export function buildLessonSessionFromDailyStorySeed(args: {
  seed: DailyStoryLessonSessionSeed
}): LessonSession {
  const { seed } = args
  const steps: LessonSession['steps'] = [
    {
      id: `${seed.lessonId}__step_1`,
      orderIndex: 1,
      type: 'listen',
      prompt: 'Listen to the situation.',
      instruction: null,
      hint: null,
      expectedAnswer: null,
      aiRole: null,
      patternSlotName: null,
      patternSlotOptions: [],
    },
    {
      id: `${seed.lessonId}__step_2`,
      orderIndex: 2,
      type: 'repeat',
      prompt: 'Repeat a simple response.',
      instruction: null,
      hint: null,
      expectedAnswer: 'Okay.',
      aiRole: null,
      patternSlotName: null,
      patternSlotOptions: [],
    },
    {
      id: `${seed.lessonId}__step_3`,
      orderIndex: 3,
      type: 'guided',
      prompt: 'Respond to the character.',
      instruction: null,
      hint: null,
      expectedAnswer: 'Okay.',
      aiRole: 'alex',
      patternSlotName: null,
      patternSlotOptions: [],
    },
  ]
  return {
    lessonId: seed.lessonId,
    sceneId: seed.sceneId,
    microSituationId: seed.microSituationId,
    title: seed.title,
    description: seed.description ?? '',
    goal: `Practice the ${seed.title.toLowerCase()} conversation.`,
    estimatedMinutes: 5,
    steps,
  }
}
