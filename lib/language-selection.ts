/**
 * Language Selection — Max-2 learning language management
 *
 * Enforces the product rule: users can select up to 2 learning languages.
 * Uses user_learning_profiles table as the source of truth for selected languages.
 *
 * Rules:
 * - Max 2 selected languages
 * - Deselecting a language does NOT delete its learning profile
 * - The daily-locked language cannot be deselected
 * - Only selected languages appear in the daily language picker
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export const MAX_SELECTED_LANGUAGES = 2

export type SelectedLanguage = {
  languageCode: string
  currentLevel: string
}

/**
 * Get the user's selected learning languages from user_learning_profiles.
 * Returns up to MAX_SELECTED_LANGUAGES entries.
 */
export async function getSelectedLanguages(
  supabase: SupabaseClient,
  userId: string,
): Promise<SelectedLanguage[]> {
  try {
    const { data, error } = await supabase
      .from('user_learning_profiles')
      .select('language_code, current_level')
      .eq('user_id', userId)
      .limit(MAX_SELECTED_LANGUAGES)

    if (error || !data) return []

    return data.map((row: { language_code: string; current_level: string }) => ({
      languageCode: row.language_code,
      currentLevel: row.current_level,
    }))
  } catch {
    return []
  }
}

/**
 * Check if the user can add another learning language.
 */
export async function canAddLanguage(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const selected = await getSelectedLanguages(supabase, userId)
  return selected.length < MAX_SELECTED_LANGUAGES
}

/**
 * Check if a specific language is currently selected.
 */
export async function isLanguageSelected(
  supabase: SupabaseClient,
  userId: string,
  languageCode: string,
): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('user_learning_profiles')
      .select('user_id')
      .eq('user_id', userId)
      .eq('language_code', languageCode)
      .maybeSingle()

    return !!data
  } catch {
    return false
  }
}
