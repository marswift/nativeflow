import type {
  LessonStepDefinition,
  PatternSlotOption,
} from './lesson-domain-types'
import { MVP_LESSONS } from './lesson-seed-catalog'

export type LessonSessionStep = {
  id: string
  orderIndex: number
  type: LessonStepDefinition['type']
  prompt: string
  instruction: string | null
  hint: string | null
  expectedAnswer: string | null
  aiRole: string | null
  patternSlotName: string | null
  patternSlotOptions: PatternSlotOption[]
}

export type LessonSession = {
  lessonId: string
  sceneId: string
  microSituationId: string
  title: string
  description: string
  goal: string
  estimatedMinutes: number
  steps: LessonSessionStep[]
}

export type CreateLessonSessionResult = {
  data: LessonSession | null
  error: string | null
}

function mapStepToSessionStep(step: LessonStepDefinition): LessonSessionStep {
  return {
    id: step.id,
    orderIndex: step.orderIndex,
    type: step.type,
    prompt: step.prompt,
    instruction: step.instruction,
    hint: step.hint,
    expectedAnswer: step.expectedAnswer,
    aiRole: step.aiRole,
    patternSlotName: step.patternSlotName,
    patternSlotOptions: step.patternSlotOptions,
  }
}

export function createLessonSession(lessonId: string): CreateLessonSessionResult {
  const lesson = MVP_LESSONS.find((l) => l.id === lessonId)
  if (!lesson) {
    return { data: null, error: `Lesson not found: ${lessonId}` }
  }
  const steps: LessonSessionStep[] = lesson.steps
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map(mapStepToSessionStep)
  return {
    data: {
      lessonId: lesson.id,
      sceneId: lesson.sceneId,
      microSituationId: lesson.microSituationId,
      title: lesson.title,
      description: lesson.description,
      goal: lesson.goal,
      estimatedMinutes: lesson.estimatedMinutes,
      steps,
    },
    error: null,
  }
}
