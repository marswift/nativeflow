/**
 * Types for public.user_profiles.
 * Database schema and migrations are managed in Supabase, not in this repository.
 */
import type {
  UiLanguageCode,
  TargetLanguageCode,
  TargetCountryCode,
  CurrentLevel,
  PreferredSessionLength,
} from './constants'

/**
 * Row shape of public.user_profiles (confirmed MVP schema).
 * Do not add or rename fields here; the table is defined and evolved outside this repo.
 */
export type UserProfileRow = {
  id: string
  ui_language_code: UiLanguageCode
  target_language_code: TargetLanguageCode
  target_country_code: TargetCountryCode
  target_region_slug: string | null
  current_level: CurrentLevel
  /** By when the user wants to be able to speak; may be null in DB until set in onboarding. */
  speak_by_deadline_text: string | null
  /** Required in onboarding UI; may be null in DB until the user completes onboarding. */
  target_outcome_text: string | null
  daily_study_minutes_goal: number | null
  preferred_session_length: PreferredSessionLength
  enable_dating_contexts: boolean
  /** Gamification: streak/rank/avatar. Optional until DB has columns. */
  current_streak_days?: number | null
  best_streak_days?: number | null
  last_streak_date?: string | null
  rank_code?: string | null
  avatar_character_code?: string | null
  avatar_level?: number | null
  avatar_image_url?: string | null
  avatar_badge_image_url?: string | null
  /** Billing */
  planned_plan_code?: 'monthly' | 'yearly' | null
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  subscription_status?: string | null
  current_period_end?: string | null
  cancel_at_period_end?: boolean | null
}

/**
 * All fields optional. Used when preloading an existing profile or holding partial
 * onboarding form state (e.g. before all required fields are filled).
 */
export type PartialUserProfileRow = Partial<UserProfileRow>
