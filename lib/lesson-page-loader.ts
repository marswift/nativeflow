/**
 * Lesson page data loader: session, profile fetch, and LessonPageData build.
 * Used by app/lesson/page.tsx; keeps page thin and testable.
 * No React; client-side only (uses Supabase).
 */
import { supabase } from './supabase'
import type { UserProfileRow } from './types'
import { buildLessonPageData, type LessonPageData } from './lesson-page-data'

/** Error key returned when profile fetch fails. Page maps this to copy in getPageErrorMessage. */
export const LOAD_ERROR_PROFILE = 'profile_load_failed' as const

export type LoadLessonPageResult =
  | { redirect: '/login' }
  | { redirect: '/onboarding' }
  | { error: typeof LOAD_ERROR_PROFILE }
  | { data: { pageData: LessonPageData; userId: string } }

const PROFILE_SELECT =
  'id, ui_language_code, target_language_code, current_learning_language, target_country_code, target_region_slug, current_level, target_outcome_text, speak_by_deadline_text, daily_study_minutes_goal'

function toUserProfileRow(row: unknown): UserProfileRow {
  return row as UserProfileRow
}

/**
 * Loads session, fetches user profile, builds lesson page data.
 * Returns redirect target when unauthenticated or onboarding required,
 * error key on profile fetch failure, or page data + userId on success.
 */
export async function loadLessonPage(): Promise<LoadLessonPageResult> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError || !session?.user) {
    return { redirect: '/login' }
  }

  const { data: row, error: fetchError } = await supabase
    .from('user_profiles')
    .select(PROFILE_SELECT)
    .eq('id', session.user.id)
    .maybeSingle()

  if (fetchError) {
    console.error(fetchError)
    return { error: LOAD_ERROR_PROFILE }
  }

  if (!row) {
    return { redirect: '/onboarding' }
  }

  const profile = toUserProfileRow(row)
  const pageData = buildLessonPageData(profile)
  return {
    data: {
      pageData,
      userId: session.user.id,
    },
  }
}
