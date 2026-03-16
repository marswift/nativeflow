import type { LessonSession } from './lesson-runner'
import type {
  LessonProgressState,
  LessonStepProgress,
} from './lesson-progress-types'
import type {
  BuildInitialReviewItemInput,
  ReviewScheduleItem,
  ReviewItemType,
} from './review-scheduler-types'
import { buildInitialReviewItems } from './review-scheduler-service'

export type LessonReviewBridgeInput = {
  userId: string
  completedAt: string
  session: LessonSession
  lesson: LessonProgressState
  steps: LessonStepProgress[]
}

export type LessonReviewBridgeResult = {
  reviewInputs: BuildInitialReviewItemInput[]
  reviewItems: ReviewScheduleItem[]
}

export function mapLessonStepTypeToReviewItemType(
  stepType: string
): ReviewItemType | null {
  switch (stepType) {
    case 'repeat':
      return 'phrase'
    case 'pattern':
      return 'pattern'
    case 'guided':
      return 'guided_output'
    case 'review':
      return 'mistake_fix'
    case 'listen':
    case 'free_conversation':
    default:
      return null
  }
}

function trim(s: string | null | undefined): string {
  return typeof s === 'string' ? s.trim() : ''
}

export function buildReviewPromptText(args: {
  session: LessonSession
  step: LessonStepProgress
}): string {
  const sessionStep = args.session.steps.find(
    (s) => s.id === args.step.stepId
  )
  const base = `${args.session.title} - step ${args.step.orderIndex}`
  if (!sessionStep) return base
  const prompt = trim(sessionStep.prompt)
  return prompt || base
}

export function buildReviewExpectedAnswer(args: {
  session: LessonSession
  step: LessonStepProgress
}): string | null {
  const sessionStep = args.session.steps.find(
    (s) => s.id === args.step.stepId
  )
  if (!sessionStep) return null
  const v = trim(sessionStep.expectedAnswer)
  return v || null
}

function stepDifficulty(step: LessonStepProgress): number {
  if (step.bestQuality === 'correct') return 2
  if (step.bestQuality === 'acceptable') return 3
  if (step.bestQuality === 'needs_retry') return 4
  return 3
}

export function buildInitialReviewInputsFromLesson(
  input: LessonReviewBridgeInput
): BuildInitialReviewItemInput[] {
  const orderedSteps = [...input.steps].sort(
    (a, b) => a.orderIndex - b.orderIndex
  )
  const out: BuildInitialReviewItemInput[] = []
  for (const step of orderedSteps) {
    if (step.status !== 'completed') continue
    const itemType = mapLessonStepTypeToReviewItemType(step.type)
    if (itemType === null) continue
    out.push({
      userId: input.userId,
      itemType,
      source: {
        lessonId: input.lesson.lessonId,
        sceneId: input.lesson.sceneId,
        microSituationId: input.lesson.microSituationId,
        stepId: step.stepId,
        phraseId: null,
        sourceType: itemType,
      },
      promptText: buildReviewPromptText({
        session: input.session,
        step,
      }),
      expectedAnswer: buildReviewExpectedAnswer({
        session: input.session,
        step,
      }),
      lastLearnerAnswer: step.lastLearnerAnswer,
      difficulty: stepDifficulty(step),
      createdAt: input.completedAt,
    })
  }
  return out
}

export function buildLessonReviewBridgeResult(
  input: LessonReviewBridgeInput
): LessonReviewBridgeResult {
  const reviewInputs = buildInitialReviewInputsFromLesson(input)
  const reviewItems = buildInitialReviewItems({ items: reviewInputs }).items
  return { reviewInputs, reviewItems }
}
