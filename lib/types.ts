/**
 * Types for public.user_profiles.
 * Database schema and migrations are managed in Supabase, not in this repository.
 */
import type {
  UiLanguageCode,
  TargetLanguageCode,
  CurrentLevel,
  PreferredSessionLength,
} from './constants'

/**
 * Row shape of public.user_profiles.
 * Keep this aligned with the actual Supabase table.
 */
export type UserProfileRow = {
  id: string

  /** UI / display language */
  ui_language_code: UiLanguageCode
  native_language_code?: string | null

  /** Learning target */
  target_language_code: TargetLanguageCode
  /** @deprecated Always NULL. Use target_region_slug instead. Kept for DB column compat. */
  target_country_code?: string | null
  target_region_slug: string | null

  /** Learning state */
  current_level: CurrentLevel
  speak_by_deadline_text: string | null
  target_outcome_text: string | null
  daily_study_minutes_goal: number | null
  preferred_session_length: PreferredSessionLength

  /** Profile / user context */
  username?: string | null
  age_group?: string | null
  country_code?: string | null
  origin_country?: string | null

  /** Goal / planning */
  learning_goal?: string | null
  goal_level?: string | null
  goal_date?: string | null
  target_deadline?: string | null
  selected_plan?: string | null
  planned_plan_code?: 'monthly' | 'yearly' | null
  next_plan_code?: string | null

  /** Motivation / onboarding */
  motivation_focus?: string | null
  enable_fun_contexts?: boolean | null
  enable_dating_contexts: boolean
  current_study_phase?: string | null

  /** Trial / subscription */
  trial_start_at?: string | null
  trial_ends_at?: string | null
  subscription_status?: string | null
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  subscription_current_period_end?: string | null
  subscription_cancel_at_period_end?: boolean | null
  subscription_price_id?: string | null
  subscription_amount_jpy?: number | null
  current_period_end?: string | null
  cancel_at_period_end?: boolean | null
  payment_method_last4?: string | null
  payment_method_brand?: string | null

  /** Gamification / progress */
  flow_points?: number | null
  flow_points_total?: number | null
  total_flow_points: number | null
  total_diamonds?: number | null
  last_streak_restore_date?: string | null
  diamond_boost_until?: string | null
  streak_frozen_date?: string | null
  streak_freeze_expiry?: string | null
  weekly_challenge_unlocked_at?: string | null
  weekly_challenge_completed_at?: string | null
  current_streak_days?: number | null
  best_streak_days?: number | null
  last_streak_date?: string | null
  rank_code?: string | null
  avatar_character_code?: string | null
  avatar_level?: number | null
  avatar_image_url?: string | null
  avatar_badge_image_url?: string | null

  /** Role / access */
  role?: string | null
  is_admin?: boolean | null
  billing_exempt?: boolean | null
  billing_exempt_until?: string | null
  billing_exempt_reason?: string | null

  /** Data lifecycle */
  lesson_data_delete_at?: string | null

  /** Timestamps */
  created_at?: string | null
}

/**
 * All fields optional. Used when preloading an existing profile or holding partial
 * onboarding form state (e.g. before all required fields are filled).
 */
export type PartialUserProfileRow = Partial<UserProfileRow>