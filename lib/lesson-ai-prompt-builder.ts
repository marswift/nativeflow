/**
 * Future AI bridge: builds a structured payload for OpenAI lesson generation.
 * Does not call OpenAI; only assembles lesson context into a stable prompt payload.
 * Pure logic only; no React, Supabase, or OpenAI.
 */

import type { LessonSessionInput } from './lesson-generator-service'
import type { LessonSessionFactoryOutput } from './lesson-session-factory'
import type { LessonBlueprint } from './lesson-blueprint-service'
import type { LessonBlueprintDraft } from './lesson-blueprint-adapter'
import type { LessonDraftSession } from './lesson-draft-session-mapper'

const SCHEMA_VERSION = 'v1' as const

const OUTPUT_CONTRACT =
  'Return a structured NativeFlow lesson that is safe, level-appropriate, concise, and directly usable for session generation.' as const

const SYSTEM_PURPOSE =
  'Generate a NativeFlow lesson session for a Japanese learner using the provided structured lesson context.' as const

export type LessonAIPromptPayload = {
  schemaVersion: typeof SCHEMA_VERSION
  outputContract: typeof OUTPUT_CONTRACT
  systemPurpose: typeof SYSTEM_PURPOSE
  lessonInput: LessonSessionInput
  sessionConfig: LessonSessionFactoryOutput
  blueprint: LessonBlueprint
  draft: LessonBlueprintDraft
  mappedSession: LessonDraftSession
}

export type CreateLessonAIPromptPayloadParams = {
  lessonInput: LessonSessionInput
  sessionConfig: LessonSessionFactoryOutput
  blueprint: LessonBlueprint
  draft: LessonBlueprintDraft
  mappedSession: LessonDraftSession
}

function buildPayload(
  params: CreateLessonAIPromptPayloadParams
): LessonAIPromptPayload {
  return {
    schemaVersion: SCHEMA_VERSION,
    outputContract: OUTPUT_CONTRACT,
    systemPurpose: SYSTEM_PURPOSE,
    lessonInput: params.lessonInput,
    sessionConfig: params.sessionConfig,
    blueprint: params.blueprint,
    draft: params.draft,
    mappedSession: params.mappedSession,
  }
}

/**
 * Builds an AI-ready prompt payload from the full lesson pipeline output.
 * Returns all context as-is with a stable system purpose string.
 */
export function createLessonAIPromptPayload(
  params: CreateLessonAIPromptPayloadParams
): LessonAIPromptPayload {
  return buildPayload(params)
}
