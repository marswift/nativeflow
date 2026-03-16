import type { UserProfileRow } from './types'
import type { LessonSession } from './lesson-engine'
import { createSession } from './lesson-runtime'
import { generateLessonSessionInput, type LessonSessionInput } from './lesson-generator-service'
import { createLessonSessionConfig, type LessonSessionFactoryOutput } from './lesson-session-factory'
import { createLessonBlueprint, type LessonBlueprint } from './lesson-blueprint-service'
import { createLessonBlueprintDraft, type LessonBlueprintDraft } from './lesson-blueprint-adapter'
import { createLessonDraftSession, type LessonDraftSession } from './lesson-draft-session-mapper'
import { createLessonAIPromptPayload, type LessonAIPromptPayload } from './lesson-ai-prompt-builder'
import { createLessonAIMessages, type LessonAIMessage } from './lesson-ai-message-builder'

export type LessonPageData = {
  lessonInput: LessonSessionInput
  lessonSessionConfig: LessonSessionFactoryOutput
  lessonBlueprint: LessonBlueprint
  lessonBlueprintDraft: LessonBlueprintDraft
  lessonDraftSession: LessonDraftSession
  lessonAIPromptPayload: LessonAIPromptPayload
  lessonAIMessages: LessonAIMessage[]
  lesson: LessonSession
}

function createLessonFromDraft(
  draft: LessonDraftSession | null,
  profile: UserProfileRow
): LessonSession {
  return draft != null ? createSession(draft) : createSession(profile)
}

/**
 * Pure helper: builds all lesson-related data from a user profile.
 * No Supabase, no side effects. Used by the lesson page load effect.
 *
 * Lesson generation pipeline:
 * profile → lessonInput → sessionConfig → blueprint → blueprintDraft
 * → draftSession → aiPromptPayload → aiMessages → lesson session
 */
export function buildLessonPageData(profile: UserProfileRow): LessonPageData {
  // INPUT
  const lessonInput = generateLessonSessionInput({
    target_language_code: profile.target_language_code,
    target_country_code: profile.target_country_code,
    target_region_slug: profile.target_region_slug,
    current_level: profile.current_level,
    target_outcome_text: profile.target_outcome_text,
    speak_by_deadline_text: profile.speak_by_deadline_text,
  })

  // CONFIG
  const lessonSessionConfig = createLessonSessionConfig(lessonInput)

  // BLUEPRINT
  const lessonBlueprint = createLessonBlueprint(lessonSessionConfig)
  const lessonBlueprintDraft = createLessonBlueprintDraft(lessonBlueprint)

  // SESSION
  const lessonDraftSession = createLessonDraftSession(lessonBlueprintDraft, profile.current_level)

  // AI
  const lessonAIPromptPayload = createLessonAIPromptPayload({
    lessonInput,
    sessionConfig: lessonSessionConfig,
    blueprint: lessonBlueprint,
    draft: lessonBlueprintDraft,
    mappedSession: lessonDraftSession,
  })
  const lessonAIMessages = createLessonAIMessages(lessonAIPromptPayload)

  // RUNTIME
  const lesson = createLessonFromDraft(lessonDraftSession, profile)

  return {
    lessonInput,
    lessonSessionConfig,
    lessonBlueprint,
    lessonBlueprintDraft,
    lessonDraftSession,
    lessonAIPromptPayload,
    lessonAIMessages,
    lesson,
  }
}
