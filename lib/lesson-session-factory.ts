/**
 * Bridge layer: converts generated lesson input into a normalized mock lesson session config.
 * Prepares LessonSessionInput for the current mock lesson flow.
 * Temporary until full AI lesson generation replaces the mock engine.
 * Pure logic only; no React, Supabase, or OpenAI.
 */

import type { CurrentLevel } from './constants'
import type { LessonSessionInput } from './lesson-generator-service'

function buildConversationTopic(
  scenario: string,
  learnerGoal: string
): string {
  if (scenario && learnerGoal) return `${scenario} — ${learnerGoal}`
  return scenario || learnerGoal || ''
}

export type LessonSessionFactoryOutput = {
  theme: string
  level: CurrentLevel
  conversationTopic: string
  reviewFocus: string
  typingFocus: string
  localeFocus: string | null
}

/**
 * Builds a mock lesson session config from generated lesson input.
 * Deterministic MVP: all fields derived from input with no external calls.
 */
export function createLessonSessionConfig(
  input: LessonSessionInput
): LessonSessionFactoryOutput {
  const conversationTopic = buildConversationTopic(input.scenario, input.learnerGoal)

  return {
    theme: input.theme,
    level: input.level,
    conversationTopic,
    reviewFocus: input.learnerGoal,
    typingFocus: input.theme,
    localeFocus: input.localeFocus,
  }
}
