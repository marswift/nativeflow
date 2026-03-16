/**
 * Defines the lesson structure for NativeFlow's Hybrid-C format.
 * Conversation → Typing → Review → AI Conversation.
 * Bridge layer before full AI lesson generation is connected.
 * Pure logic only; no React, Supabase, or OpenAI.
 */

import type { CurrentLevel } from './constants'
import type { LessonSessionFactoryOutput } from './lesson-session-factory'

function createBlock(
  type: LessonBlueprintBlockType,
  title: string,
  goal: string
): LessonBlueprintBlock {
  return { type, title, goal }
}

export type LessonBlueprintBlockType =
  | 'conversation'
  | 'typing'
  | 'review'
  | 'ai_conversation'

export type LessonBlueprintBlock = {
  type: LessonBlueprintBlockType
  title: string
  goal: string
}

export type LessonBlueprint = {
  theme: string
  level: CurrentLevel
  blocks: LessonBlueprintBlock[]
}

/**
 * Builds a Hybrid-C lesson blueprint from session config.
 * Returns exactly 4 blocks: conversation, typing, review, ai_conversation.
 */
export function createLessonBlueprint(
  input: LessonSessionFactoryOutput
): LessonBlueprint {
  return {
    theme: input.theme,
    level: input.level,
    blocks: [
      createBlock('conversation', 'Conversation Practice', input.conversationTopic),
      createBlock('typing', 'Typing Practice', input.typingFocus),
      createBlock('review', 'Review', input.reviewFocus),
      createBlock('ai_conversation', 'AI Conversation', input.conversationTopic),
    ],
  }
}
