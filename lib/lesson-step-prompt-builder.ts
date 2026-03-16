import type { LessonSessionStep } from './lesson-runner'
import type { PromptAssemblyResult } from './prompt-assembly-types'
import { buildPromptMessages } from './prompt-renderer'

export type StepPromptBuildInput = {
  promptAssemblyResult: PromptAssemblyResult
  step: LessonSessionStep
  learnerUtterance?: string | null
}

export type StepPromptBuildResult = {
  system: string
  user: string
  metadata: {
    stepId: string
    stepType: LessonSessionStep['type']
    expectedAnswer: string | null
    hint: string | null
    aiRole: string | null
    patternSlotName: string | null
    patternSlotOptions: { value: string; label: string | null }[]
  }
}

export function buildStepInstruction(step: LessonSessionStep): string {
  switch (step.type) {
    case 'listen':
      return 'Present the line clearly for listening practice.'
    case 'repeat':
      return 'Ask the learner to repeat the target line exactly.'
    case 'pattern':
      return 'Run a narrow pattern practice step using the provided slot options only.'
    case 'guided':
      return 'Run a guided speaking step with strong scene-based support.'
    case 'free_conversation':
      return 'Run a short free conversation step that stays inside the current scene.'
    case 'review':
      return 'Run a short retrieval-focused review step.'
    default:
      return 'Present the step clearly for the learner.'
  }
}

export function buildStepInstructionBlock(step: LessonSessionStep): string {
  const mode = buildStepInstruction(step)
  const prompt = step.prompt?.trim() ?? ''
  const learner = step.instruction?.trim() || 'none'
  return `Step mode:\n${mode}\n\nLesson prompt:\n${prompt}\n\nLearner instruction:\n${learner}`
}

export function buildStepHint(step: LessonSessionStep): string | null {
  const hint = step.hint?.trim()
  if (hint) return hint
  if (step.type === 'pattern' && step.patternSlotOptions?.length > 0) {
    const parts = step.patternSlotOptions
      .map((o) => {
        const v = o.value?.trim()
        if (!v) return null
        return o.label?.trim() ? `${v} (${o.label.trim()})` : v
      })
      .filter((x): x is string => x != null)
    if (parts.length > 0) {
      return `Available options: ${parts.join(', ')}`
    }
  }
  return null
}

export function buildStepExpectedAnswer(step: LessonSessionStep): string | null {
  const a = step.expectedAnswer?.trim()
  return a || null
}

export function buildStepPromptMessages(
  input: StepPromptBuildInput
): StepPromptBuildResult {
  const step = input.step
  const stepInstruction = buildStepInstructionBlock(step)
  const hint = buildStepHint(step)
  const expectedAnswer = buildStepExpectedAnswer(step)
  const { system, user } = buildPromptMessages({
    result: input.promptAssemblyResult,
    learnerUtterance: input.learnerUtterance ?? null,
    stepInstruction,
    expectedAnswer,
    hint,
  })
  return {
    system,
    user,
    metadata: {
      stepId: step.id,
      stepType: step.type,
      expectedAnswer,
      hint,
      aiRole: step.aiRole ?? null,
      patternSlotName: step.patternSlotName ?? null,
      patternSlotOptions: step.patternSlotOptions ?? [],
    },
  }
}
