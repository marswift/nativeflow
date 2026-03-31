/**
 * Lesson generator service (MVP).
 * Pure logic: builds a normalized lesson session input from user profile.
 * No React, Supabase, or external API. Deterministic only.
 * First step toward AI lesson generation; does not change current lesson flow.
 */

import type { CurrentLevel } from './constants'

function getTrimmedOrNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : null
}

function isNonEmptyString(value: string | null | undefined): value is string {
  return value != null && value !== ''
}

export type LessonGeneratorProfileInput = {
  target_language_code: string
  target_region_slug: string | null
  current_level: CurrentLevel
  target_outcome_text: string | null
  speak_by_deadline_text: string | null
}

/** Normalized lesson input for the mock lesson engine or future AI generation. */
export type LessonSessionInput = {
  theme: string
  level: CurrentLevel
  scenario: string
  learnerGoal: string
  localeFocus: string | null
  targetLanguageCode: string
  speakByDeadline: string | null
}

const DEFAULT_THEME = 'Daily Conversation'
const DEFAULT_SCENARIO = 'daily life'
const DEFAULT_LEARNER_GOAL = 'speak naturally in everyday situations'

/**
 * Generates a deterministic lesson session input from profile.
 * MVP: no API calls; all values derived from profile fields with safe fallbacks.
 */
export function generateLessonSessionInput(
  profile: LessonGeneratorProfileInput
): LessonSessionInput {
  const outcomeTrimmed = getTrimmedOrNull(profile.target_outcome_text)
  const theme = outcomeTrimmed ?? DEFAULT_THEME

  const scenario =
    profile.target_region_slug != null && profile.target_region_slug !== ''
      ? `daily life (${profile.target_region_slug})`
      : DEFAULT_SCENARIO

  const learnerGoal = outcomeTrimmed ?? DEFAULT_LEARNER_GOAL

  const localeParts = [profile.target_region_slug].filter(isNonEmptyString)
  const localeFocus = localeParts.length > 0 ? localeParts.join(' · ') : null

  const speakByDeadline = getTrimmedOrNull(profile.speak_by_deadline_text)

  return {
    theme,
    level: profile.current_level,
    scenario,
    learnerGoal,
    localeFocus,
    targetLanguageCode: profile.target_language_code,
    speakByDeadline,
  }
}
