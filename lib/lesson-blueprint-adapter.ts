/**
 * Temporary adapter: converts the Hybrid-C lesson blueprint into a draft shape
 * that the current mock lesson system can consume.
 * Pure logic only; no React, Supabase, or OpenAI.
 */

import type { LessonBlueprint, LessonBlueprintBlock, LessonBlueprintBlockType } from './lesson-blueprint-service'

export type LessonBlueprintDraftItem = {
  prompt: string
  answer: string | null
}

export type LessonBlueprintDraftBlock = {
  type: LessonBlueprintBlockType
  title: string
  description: string
  estimatedMinutes: number
  items: LessonBlueprintDraftItem[]
}

export type LessonBlueprintDraft = {
  theme: string
  blocks: LessonBlueprintDraftBlock[]
}

function normalizeGoal(goal: string): string {
  return goal || 'this topic'
}

function createDraftItem(
  prompt: string,
  answer: string | null
): LessonBlueprintDraftItem {
  return { prompt, answer }
}

function mapBlockToDraft(block: LessonBlueprintBlock): LessonBlueprintDraftBlock {
  const goal = normalizeGoal(block.goal)
  switch (block.type) {
    case 'conversation':
      return {
        type: 'conversation',
        title: block.title,
        description: goal,
        estimatedMinutes: 5,
        items: [createDraftItem(`Start talking about: ${goal}`, null)],
      }
    case 'typing':
      return {
        type: 'typing',
        title: block.title,
        description: goal,
        estimatedMinutes: 4,
        items: [
          createDraftItem(`Type one sentence about: ${goal}`, `I want to practice ${goal}.`),
        ],
      }
    case 'review':
      return {
        type: 'review',
        title: block.title,
        description: goal,
        estimatedMinutes: 3,
        items: [createDraftItem(`Review this focus: ${goal}`, null)],
      }
    case 'ai_conversation':
      return {
        type: 'ai_conversation',
        title: block.title,
        description: goal,
        estimatedMinutes: 6,
        items: [
          createDraftItem(`Continue the AI conversation about: ${goal}`, null),
        ],
      }
    default: {
      const _: never = block.type
      return {
        type: block.type,
        title: block.title,
        description: goal,
        estimatedMinutes: 3,
        items: [createDraftItem(goal, null)],
      }
    }
  }
}

/**
 * Builds a lesson draft from a Hybrid-C blueprint.
 * Preserves block order; one draft block per blueprint block.
 */
export function createLessonBlueprintDraft(
  blueprint: LessonBlueprint
): LessonBlueprintDraft {
  return {
    theme: blueprint.theme,
    blocks: blueprint.blocks.map(mapBlockToDraft),
  }
}
