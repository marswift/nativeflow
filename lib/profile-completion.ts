import { getSupabaseBrowserClient } from '@/lib/supabase/browser-client'

export type ProfileCompletionCheckProfile = {
  ui_language_code?: string | null
  native_language_code?: string | null
  target_language_code?: string | null
  target_region_slug?: string | null
  current_level?: string | null
  speak_by_deadline_text?: string | null
  target_outcome_text?: string | null
  daily_study_minutes_goal?: number | null
  username?: string | null
  age_group?: string | null
  origin_country?: string | null
  planned_plan_code?: string | null
}

const supabase = getSupabaseBrowserClient()

export const PROFILE_COMPLETION_SELECT =
  'ui_language_code, native_language_code, target_language_code, target_region_slug, current_level, speak_by_deadline_text, target_outcome_text, daily_study_minutes_goal, username, age_group, origin_country, planned_plan_code'

function hasNonEmptyString(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

function hasPositiveNumber(value: number | null | undefined): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

export function isUserProfileOnboardingComplete(
  profile: ProfileCompletionCheckProfile | null | undefined
): boolean {
  if (!profile) return false

  return (
    hasNonEmptyString(profile.ui_language_code) &&
    hasNonEmptyString(profile.native_language_code) &&
    hasNonEmptyString(profile.target_language_code) &&
    hasNonEmptyString(profile.target_region_slug) &&
    hasNonEmptyString(profile.current_level) &&
    hasNonEmptyString(profile.speak_by_deadline_text) &&
    hasNonEmptyString(profile.target_outcome_text) &&
    hasPositiveNumber(profile.daily_study_minutes_goal) &&
    hasNonEmptyString(profile.username) &&
    hasNonEmptyString(profile.age_group) &&
    hasNonEmptyString(profile.origin_country)
  )
}

export async function getUserProfileForCompletionCheck(userId: string): Promise<{
  profile: ProfileCompletionCheckProfile | null
  error: Error | null
}> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select(PROFILE_COMPLETION_SELECT)
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    return {
      profile: null,
      error,
    }
  }

  return {
    profile: (data as ProfileCompletionCheckProfile | null) ?? null,
    error: null,
  }
}
