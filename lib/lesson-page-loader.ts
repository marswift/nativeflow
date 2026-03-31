/**
 * Lesson page data loader: session, profile fetch, and LessonPageData build.
 * Used by app/lesson/page.tsx; keeps page thin and testable.
 * No React; client-side only (uses Supabase).
 */
import { getSupabaseBrowserClient } from './supabase/browser-client'
import type { UserProfileRow } from './types'
import { buildLessonPageData, type LessonPageData } from './lesson-page-data'
import type { LessonBlock, LessonBlockItem } from './lesson-engine'
import { fetchReviewItemsWithContent, injectReviewBlocks } from './review-injection'
import pLimit from 'p-limit'
const limit = pLimit(3)

const supabase = getSupabaseBrowserClient()
type HydratableLessonSession = NonNullable<LessonPageData['lesson']>

/** Error key returned when profile fetch fails. Page maps this to copy in getPageErrorMessage. */
export const LOAD_ERROR_PROFILE = 'profile_load_failed' as const

export type LoadLessonPageResult =
  | { redirect: '/login' }
  | { redirect: '/onboarding' }
  | { error: typeof LOAD_ERROR_PROFILE }
  | { data: { pageData: LessonPageData; userId: string } }

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

  const { data: userRow } = await supabase
    .from('user_profiles')
    .select(
      'id, ui_language_code, current_learning_language, planned_plan_code, subscription_status, preferred_session_length, enable_dating_contexts, total_flow_points'
    )
    .eq('id', session.user.id)
    .single()

  const currentLang = userRow?.current_learning_language ?? 'en'

  const { data: row, error: fetchError } = await supabase
    .from('user_learning_profiles')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('language_code', currentLang)
    .maybeSingle()

  if (fetchError) {
    console.error(fetchError)
    return { error: LOAD_ERROR_PROFILE }
  }

  if (!row) {
    // user_learning_profiles が存在しない場合はデフォルト値でフォールバック
    const fallbackProfile: UserProfileRow = {
      id: session.user.id,
      ui_language_code: userRow?.ui_language_code ?? 'ja',
      target_language_code: currentLang,
      target_country_code: null,
      target_region_slug: null,
      current_level: 'beginner',
      target_outcome_text: null,
      speak_by_deadline_text: null,
      daily_study_minutes_goal: null,
      preferred_session_length: userRow?.preferred_session_length ?? 'standard',
      enable_dating_contexts: userRow?.enable_dating_contexts ?? false,
      total_flow_points: userRow?.total_flow_points ?? 0,
      planned_plan_code: userRow?.planned_plan_code ?? null,
      subscription_status: userRow?.subscription_status ?? null,
      current_period_end: null,
      cancel_at_period_end: null,
    }
    const fallbackPageData = buildLessonPageData(fallbackProfile)
    const fallbackReviewSources = await fetchReviewItemsWithContent(supabase, session.user.id, 5)
    if (fallbackReviewSources.length > 0) {
      const injected = injectReviewBlocks(fallbackPageData.lesson, fallbackReviewSources)
      fallbackPageData.lesson = { ...fallbackPageData.lesson, blocks: injected.blocks, overviewBlockCount: injected.blocks.length }
    }
    return {
      data: {
        pageData: fallbackPageData,
        userId: session.user.id,
      },
    }
  }

  const profile: UserProfileRow = {
    id: row.user_id,
    ui_language_code: userRow?.ui_language_code ?? 'ja',
    target_language_code: row.language_code,
    target_country_code: null,
    target_region_slug: row.target_region_slug,
    current_level: row.current_level,
    target_outcome_text: row.target_outcome_text,
    speak_by_deadline_text: row.speak_by_deadline_text,
    daily_study_minutes_goal: row.daily_study_minutes_goal,
    preferred_session_length: userRow?.preferred_session_length ?? 'standard',
    enable_dating_contexts: userRow?.enable_dating_contexts ?? false,
    total_flow_points: userRow?.total_flow_points ?? 0,
    planned_plan_code: userRow?.planned_plan_code ?? null,
    subscription_status: userRow?.subscription_status ?? null,
    current_period_end: null,
    cancel_at_period_end: null,
  }
  
  const pageData = buildLessonPageData(profile)

  const reviewSources = await fetchReviewItemsWithContent(supabase, session.user.id, 5)
  if (reviewSources.length > 0) {
    const injected = injectReviewBlocks(pageData.lesson, reviewSources)
    pageData.lesson = { ...pageData.lesson, blocks: injected.blocks, overviewBlockCount: injected.blocks.length }
  }

  return {
    data: {
      pageData,
      userId: session.user.id,
    },
  }
}

async function hydrateAudioForText(text: string): Promise<string | null> {
  if (!text || text.trim() === '') return null

  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (typeof window !== 'undefined' ? '' : 'http://localhost:3000')

    const res = await fetch(`${baseUrl}/api/audio/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      cache: 'no-store',
    })

    if (!res.ok) return null

    const data = await res.json()
    return data.audio_url ?? null
  } catch (e) {
    console.error('audio hydrate error', e)
    return null
  }
}

export async function hydrateLessonAudio(
  session: HydratableLessonSession
): Promise<HydratableLessonSession> {
  const newBlocks = await Promise.all(
    session.blocks.map(async (block: LessonBlock) => {
      const newItems = await Promise.all(
        block.items.map((item: LessonBlockItem) =>
          limit(async () => {
            const sourceText =
              item.answer?.trim() ||
              item.prompt?.trim() ||
              ''

            const audioUrl = await hydrateAudioForText(sourceText)

            return {
              ...item,
              audio_url: audioUrl,
            }
          })
        )
      )

      return {
        ...block,
        items: newItems,
      }
    })
  )

  return {
    ...session,
    blocks: newBlocks,
  }
}