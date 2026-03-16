import type { LessonSession } from '@/lib/lesson-runner'
import { createLessonSession } from '@/lib/lesson-runner'

const DEBUG_MOCK_SESSION: LessonSession = {
  lessonId: 'lesson-1',
  sceneId: 'scene-1',
  microSituationId: 'micro-1',
  title: 'Mock Lesson',
  description: 'Mock lesson description',
  goal: 'Mock goal',
  estimatedMinutes: 5,
  steps: [
    {
      id: 'lesson-1__step_1',
      orderIndex: 1,
      type: 'listen',
      prompt: 'Listen to the line.',
      instruction: null,
      hint: null,
      expectedAnswer: null,
      aiRole: null,
      patternSlotName: null,
      patternSlotOptions: [],
    },
    {
      id: 'lesson-1__step_2',
      orderIndex: 2,
      type: 'repeat',
      prompt: 'Say: Good morning.',
      instruction: null,
      hint: null,
      expectedAnswer: 'Good morning.',
      aiRole: null,
      patternSlotName: null,
      patternSlotOptions: [],
    },
    {
      id: 'lesson-1__step_3',
      orderIndex: 3,
      type: 'guided',
      prompt: 'Answer the roommate.',
      instruction: null,
      hint: null,
      expectedAnswer: 'I slept well.',
      aiRole: 'roommate',
      patternSlotName: null,
      patternSlotOptions: [],
    },
  ],
}

export async function loadConversationLessonDebugSession(args?: {
  lessonId?: string
}): Promise<LessonSession> {
  const lessonId = args?.lessonId ?? 'lesson-1'
  const result = createLessonSession(lessonId)
  if (result.data !== null) {
    return result.data
  }
  return DEBUG_MOCK_SESSION
}
