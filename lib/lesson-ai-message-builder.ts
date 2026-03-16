/**
 * Final bridge before real OpenAI integration: converts AI prompt payload into
 * chat-completions style message array. Does not call the API.
 * Pure logic only; no React, Supabase, or OpenAI SDK.
 */

import type { LessonAIPromptPayload } from './lesson-ai-prompt-builder'

export type LessonAIMessage = {
  role: 'system' | 'user'
  content: string
}

const USER_HEADER = 'Lesson generation context'

function createSection(label: string, value: unknown): string[] {
  return [label, JSON.stringify(value, null, 2)]
}

function createSystemMessage(content: string): LessonAIMessage {
  return { role: 'system', content }
}

function createUserMessage(content: string): LessonAIMessage {
  return { role: 'user', content }
}

function buildSystemContent(payload: LessonAIPromptPayload): string {
  return `[schemaVersion]\n${payload.schemaVersion}\n\n[systemPurpose]\n${payload.systemPurpose}`
}

function buildUserContent(payload: LessonAIPromptPayload): string {
  const sections = [
    ...createSection('[schemaVersion]', payload.schemaVersion),
    ...createSection('[outputContract]', payload.outputContract),
    ...createSection('[lessonInput]', payload.lessonInput),
    ...createSection('[sessionConfig]', payload.sessionConfig),
    ...createSection('[blueprint]', payload.blueprint),
    ...createSection('[draft]', payload.draft),
    ...createSection('[mappedSession]', payload.mappedSession),
  ]
  return [USER_HEADER, '', ...sections].join('\n')
}

/**
 * Builds a 2-message array: system (purpose) and user (serialized context).
 * Deterministic; ready for future OpenAI chat-completions usage.
 */
export function createLessonAIMessages(
  payload: LessonAIPromptPayload
): LessonAIMessage[] {
  return [
    createSystemMessage(buildSystemContent(payload)),
    createUserMessage(buildUserContent(payload)),
  ]
}
