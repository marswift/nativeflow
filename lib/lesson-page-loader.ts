/**
 * Lesson page data loader: session, profile fetch, and LessonPageData build.
 * Used by app/lesson/page.tsx; keeps page thin and testable.
 * No React; client-side only (uses Supabase).
 */
import { getSupabaseBrowserClient } from './supabase/browser-client'
import type { UserProfileRow } from './types'
import { buildLessonPageData, enrichWithCorpusSelection, type LessonPageData } from './lesson-page-data'
import { applyCorpusToListen } from './corpus/apply-corpus-listen'
import { applyCorpusToAiConversation } from './corpus/apply-corpus-ai-conversation'
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
      'id, ui_language_code, current_learning_language, planned_plan_code, subscription_status, preferred_session_length, enable_dating_contexts, total_flow_points, total_diamonds, diamond_boost_until, streak_frozen_date, streak_freeze_expiry, weekly_challenge_unlocked_at, weekly_challenge_completed_at, current_streak_days, last_streak_date, last_streak_restore_date, role, is_admin, billing_exempt, billing_exempt_until, trial_ends_at'
    )
    .eq('id', session.user.id)
    .single()

  // Daily language lock takes precedence over profile setting
  let currentLang = userRow?.current_learning_language ?? 'en'
  try {
    const { getDailyLockedLanguage } = await import('./daily-language-lock')
    const lockedLang = getDailyLockedLanguage()
    if (lockedLang) currentLang = lockedLang
  } catch { /* non-blocking */ }

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
      // target_country_code: deprecated — omitted (always null)
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
    let fallbackPageData = buildLessonPageData(fallbackProfile)
    fallbackPageData = await enrichWithCorpusSelection(fallbackPageData)
    fallbackPageData = await applyCorpusToListen(fallbackPageData)
    fallbackPageData = await applyCorpusToAiConversation(fallbackPageData)
    logCorpusSelection(fallbackPageData)
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
  
  let pageData = buildLessonPageData(profile)
  pageData = await enrichWithCorpusSelection(pageData)
  pageData = await applyCorpusToListen(pageData)
  pageData = await applyCorpusToAiConversation(pageData)
  logCorpusSelection(pageData)

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

/** Log corpus selection metadata (shared between both loader paths). */
function logCorpusSelection(data: LessonPageData): void {
  const cs = data.corpusSelection
  if (!cs) return
  // eslint-disable-next-line no-console
  console.log('[corpus-selection]', {
    targetDifficulty: cs.targetDifficulty,
    candidateCount: cs.candidateCount,
    sequenceLength: cs.summary.count,
    minDifficulty: cs.summary.minDifficulty,
    maxDifficulty: cs.summary.maxDifficulty,
    avgDifficulty: cs.summary.avgDifficulty,
    selectedAt: cs.selectedAt,
  })
}

/** Timeout for a single audio generation request (15 seconds). */
const AUDIO_FETCH_TIMEOUT_MS = 15_000

async function fetchAudioOnce(text: string, speed?: number): Promise<string | null> {
  // Always use relative URL in browser; absolute only for SSR
  const baseUrl = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), AUDIO_FETCH_TIMEOUT_MS)

  const body: Record<string, unknown> = { text }
  if (typeof speed === 'number') body.speed = speed

  try {
    const res = await fetch(`${baseUrl}/api/audio/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: controller.signal,
    })
    clearTimeout(timer)

    if (!res.ok) return null
    const data = await res.json()
    return data.audio_url ?? null
  } catch {
    clearTimeout(timer)
    return null
  }
}

type AudioHydrateResult = {
  audioUrl: string | null
  audioStatus: 'ok' | 'fallback' | 'failed'
}

async function hydrateAudioForText(text: string, speed?: number): Promise<AudioHydrateResult> {
  if (!text || text.trim() === '') return { audioUrl: null, audioStatus: 'failed' }

  // Attempt 1
  let url = await fetchAudioOnce(text, speed)
  if (url) return { audioUrl: url, audioStatus: 'ok' }

  // Attempt 2 — retry once
  url = await fetchAudioOnce(text, speed)
  if (url) return { audioUrl: url, audioStatus: 'ok' }

  return { audioUrl: null, audioStatus: 'failed' }
}

/** TTS speed by level. Beginner gets slower speech for better comprehension. */
function getAudioSpeedForLevel(level: string): number | undefined {
  if (level === 'beginner') return 0.85
  return undefined // default (1.0)
}

export async function hydrateLessonAudio(
  session: HydratableLessonSession
): Promise<HydratableLessonSession> {
  const speed = getAudioSpeedForLevel(session.level)

  const newBlocks = await Promise.all(
    session.blocks.map(async (block: LessonBlock) => {
      const newItems = await Promise.all(
        block.items.map((item: LessonBlockItem) =>
          limit(async () => {
            const itemWithText = item as LessonBlockItem & { text?: string }
            const sourceText =
              itemWithText.text?.trim() ||
              item.answer?.trim() ||
              item.prompt?.trim() ||
              ''

            const result = await hydrateAudioForText(sourceText, speed)

            return {
              ...item,
              audio_url: result.audioUrl,
              audio_status: result.audioStatus,
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