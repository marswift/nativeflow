'use client'

/**
 * Onboarding persists profile and subscription fields to user_profiles.
 * Uses planned_plan_code (from profile or user_metadata.plan, fallback monthly).
 * DB columns: username, age_group, origin_country, target_region_slug, planned_plan_code; trial_start_at/trial_ends_at left to DB defaults.
 * MVP: UI language and target learning language are fixed (Japanese / English). Labels are Japanese.
 */
import type { FormEvent } from 'react'
import { PLAN_PRICES } from '@/lib/billing-prices'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/browser-client'
import AppHeader from '@/components/header/app-header'
import { getOnboardingCopy } from '../../lib/onboarding-copy'
import { readUiLanguageFromStorage, writeUiLanguageToStorage } from '@/lib/auth-copy'
import type { PartialUserProfileRow } from '../../lib/types'
import {
  UI_LANGUAGE_OPTIONS,
  CURRENT_LEVEL_OPTIONS,
  type CurrentLevel,
} from '../../lib/constants'
import { computeStudyPlan } from '../../lib/study-plan-service'
import {
  getUserProfileForCompletionCheck,
  isUserProfileOnboardingComplete,
} from '@/lib/profile-completion'

const AFTER_SAVE_REDIRECT = '/lesson'

const DEFAULT_SUBMIT_LABEL = '7日間無料を開始する'
const CHECKOUT_LAUNCHING_LABEL = '決済画面へ移動中...'

/** Hardcoded fallback — used only when /api/languages/options is unreachable. */
const FALLBACK_UI_LANGUAGES = UI_LANGUAGE_OPTIONS.filter((o) => o.value === 'ja' || o.value === 'en')
const FALLBACK_LEARNING_LANGUAGES: { value: string; label: string }[] = [{ value: 'en', label: 'English' }]

type LanguageOption = { code: string; englishName: string; nativeName: string }
type RegionOption = { code: string; displayLabel: string }

const DEADLINE_OPTIONS = [
  '6ヶ月',
  '1年',
  '1年6ヶ月',
  '2年',
  '2年6ヶ月',
  '3年',
] as const

const AGE_GROUP_OPTIONS = [
  { value: 'teens', label: '10代' },
  { value: '20s', label: '20代' },
  { value: '30s', label: '30代' },
  { value: '40s', label: '40代' },
  { value: '50plus', label: '50代以上' },
] as const

const ORIGIN_COUNTRY_OPTIONS = [
  { value: 'JP', label: '日本' },
  { value: 'US', label: 'アメリカ' },
  { value: 'GB', label: 'イギリス' },
  { value: 'AU', label: 'オーストラリア' },
  { value: 'CA', label: 'カナダ' },
  { value: 'KR', label: '韓国' },
  { value: 'TW', label: '台湾' },
  { value: 'CN', label: '中国' },
  { value: 'HK', label: '香港' },
  { value: 'SG', label: 'シンガポール' },
  { value: 'FR', label: 'フランス' },
  { value: 'IT', label: 'イタリア' },
  { value: 'DE', label: 'ドイツ' },
  { value: 'ES', label: 'スペイン' },
  { value: 'BR', label: 'ブラジル' },
  { value: 'MX', label: 'メキシコ' },
  { value: 'IN', label: 'インド' },
  { value: 'TH', label: 'タイ' },
  { value: 'VN', label: 'ベトナム' },
  { value: 'PH', label: 'フィリピン' },
  { value: 'ID', label: 'インドネシア' },
  { value: 'OTHER', label: 'その他' },
] as const

type PlannedPlanCode = 'monthly' | 'yearly'

/** Derive native language code from origin country. Used to auto-populate native_language_code. */
function deriveNativeLanguageCode(countryCode: string): string {
  const map: Record<string, string> = {
    JP: 'ja', US: 'en', GB: 'en', AU: 'en', CA: 'en',
    KR: 'ko', TW: 'zh', CN: 'zh', HK: 'zh', SG: 'en',
    FR: 'fr', IT: 'it', DE: 'de', ES: 'es',
    BR: 'pt', MX: 'es', IN: 'hi', TH: 'th',
    VN: 'vi', PH: 'tl', ID: 'id',
  }
  return map[countryCode] ?? 'other'
}

function getPlannedPlanSummary(plan: PlannedPlanCode): { label: string; priceText: string } {
  return plan === 'yearly'
    ? { label: '年額プラン', priceText: `${PLAN_PRICES.yearly.labelJa}（約${PLAN_PRICES.yearly.discountLabel}）` }
    : { label: '月額プラン', priceText: PLAN_PRICES.monthly.labelJa }
}

type OnboardingProfileRow = PartialUserProfileRow & {
  username?: string | null
  age_group?: string | null
  origin_country?: string | null
  planned_plan_code?: string | null
  stripe_subscription_id?: string | null
  subscription_status?: string | null
}

const CONTAINER_CLASS = 'mx-auto max-w-xl px-6 py-10 sm:py-12'
const CARD_CLASS =
  'rounded-2xl border border-[#ede9e2] bg-white px-6 py-8 shadow-[0_4px_24px_rgba(0,0,0,.06)] sm:px-8 sm:py-9'
const INPUT_CLASS =
  'mt-2 w-full rounded-xl border border-[#ede9e2] bg-white px-4 py-3 text-[#1a1a2e] placeholder:text-[#9c9c9c] focus:border-[#ff6b35] focus:outline-none focus:ring-2 focus:ring-[#ff6b35]/20 transition-colors'
const LABEL_CLASS = 'block text-sm font-semibold text-[#1a1a2e]'
const HINT_CLASS = 'mt-1 text-xs text-[#4a4a6a] leading-relaxed'

const FIELD_ERROR_SELECT = '選択してください。'
const FIELD_ERROR_REQUIRED = '入力してください。'

function getSaveErrorMessage(
  err: { message?: string; code?: string; details?: string; hint?: string } | null,
  fallback: string
): string {
  if (process.env.NODE_ENV === 'development' && err) {
    const debugParts = [err.message, err.code, err.details, err.hint]
      .filter((value) => value !== undefined && value !== null && value !== '')
      .join(' / ')

    if (debugParts) {
      return `${fallback} (${debugParts})`
    }
  }
  return fallback
}

function getRuntimeErrorMessage(err: unknown, fallback: string): string {
  if (
    process.env.NODE_ENV === 'development' &&
    err &&
    typeof err === 'object' &&
    'message' in err &&
    typeof (err as { message?: unknown }).message === 'string'
  ) {
    return `${fallback} (${(err as { message: string }).message})`
  }
  return fallback
}

function resolveInitialPlan(
  profilePlan?: string | null,
  metaPlan?: string | null
): PlannedPlanCode {
  const validProfilePlan =
    profilePlan === 'monthly' || profilePlan === 'yearly' ? profilePlan : null
  const validMetaPlan =
    metaPlan === 'monthly' || metaPlan === 'yearly' ? metaPlan : null
  return (validProfilePlan ?? validMetaPlan ?? 'monthly') as PlannedPlanCode
}

const supabase = getSupabaseBrowserClient()

export default function OnboardingPage() {
  const router = useRouter()
  const [uiLanguage, setUiLanguage] = useState(() => readUiLanguageFromStorage() ?? 'ja')
  const copy = getOnboardingCopy(uiLanguage)
  const [username, setUsername] = useState('')
  const [ageGroup, setAgeGroup] = useState('')
  const [plannedPlanCode, setPlannedPlanCode] = useState<PlannedPlanCode>('monthly')
  const [targetLanguageCode, setTargetLanguageCode] = useState('en')
  const [targetRegionSlug, setTargetRegionSlug] = useState('')
  const [originCountryCode, setOriginCountryCode] = useState('')
  const [currentLevel, setCurrentLevel] = useState<CurrentLevel | ''>('')
  const [speakByDeadlineText, setSpeakByDeadlineText] = useState('')
  const [targetOutcomeText, setTargetOutcomeText] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkoutLaunching, _setCheckoutLaunching] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [formError, setFormError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // ── Registry-backed language options (Phase 1: Language Expansion System) ──
  const [registryUiLangs, setRegistryUiLangs] = useState<LanguageOption[] | null>(null)
  const [registryLearningLangs, setRegistryLearningLangs] = useState<LanguageOption[] | null>(null)

  useEffect(() => {
    fetch('/api/languages/options')
      .then((res) => res.ok ? res.json() : null)
      .then((data: { uiLanguages?: LanguageOption[]; learningLanguages?: LanguageOption[] } | null) => {
        if (data?.uiLanguages?.length) setRegistryUiLangs(data.uiLanguages)
        if (data?.learningLanguages?.length) setRegistryLearningLangs(data.learningLanguages)
      })
      .catch(() => { /* silent — fallback to hardcoded options */ })
  }, [])

  // Derive dropdown options: registry if available, else hardcoded fallback
  const uiLanguageOptions = registryUiLangs
    ? registryUiLangs.map((l) => ({ value: l.code, label: l.nativeName }))
    : FALLBACK_UI_LANGUAGES
  const learningLanguageOptions = registryLearningLangs
    ? registryLearningLangs.map((l) => ({ value: l.code, label: l.nativeName }))
    : FALLBACK_LEARNING_LANGUAGES

  // Guard: if saved profile value is not in the fetched options, reset to first available
  useEffect(() => {
    if (uiLanguageOptions.length > 0 && !uiLanguageOptions.some((o) => o.value === uiLanguage)) {
      setUiLanguage(uiLanguageOptions[0].value)
    }
  }, [uiLanguageOptions, uiLanguage])
  useEffect(() => {
    if (learningLanguageOptions.length > 0 && !learningLanguageOptions.some((o) => o.value === targetLanguageCode)) {
      setTargetLanguageCode(learningLanguageOptions[0].value)
    }
  }, [learningLanguageOptions, targetLanguageCode])

  // ── Registry-backed region options ──
  const [registryRegions, setRegistryRegions] = useState<RegionOption[]>([])

  useEffect(() => {
    if (!targetLanguageCode) { setRegistryRegions([]); return }
    fetch(`/api/languages/regions?language=${encodeURIComponent(targetLanguageCode)}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data: { regions?: RegionOption[] } | null) => {
        setRegistryRegions(data?.regions ?? [])
      })
      .catch(() => setRegistryRegions([]))
  }, [targetLanguageCode])

  const regionOptions = registryRegions.map((r) => ({ value: r.code, label: r.displayLabel }))

  useEffect(() => {
    let isActive = true

    function applyProfile(profile: OnboardingProfileRow, metaPlan?: string | null) {
      if (profile.ui_language_code != null) {
        setUiLanguage(profile.ui_language_code)
        writeUiLanguageToStorage(profile.ui_language_code)
      }
      if (profile.username != null) setUsername(profile.username)
      if (profile.age_group != null) setAgeGroup(profile.age_group)
      if (profile.origin_country != null) setOriginCountryCode(profile.origin_country)
      if (profile.target_language_code != null) setTargetLanguageCode(profile.target_language_code)
      if (profile.target_region_slug != null) setTargetRegionSlug(profile.target_region_slug)
      const validCurrentLevel =
        profile.current_level != null &&
        CURRENT_LEVEL_OPTIONS.some((o) => o.value === profile.current_level)
      if (validCurrentLevel) setCurrentLevel(profile.current_level as CurrentLevel)
      if (profile.speak_by_deadline_text != null) setSpeakByDeadlineText(profile.speak_by_deadline_text)
      if (profile.target_outcome_text != null) setTargetOutcomeText(profile.target_outcome_text)
      const initialPlan = resolveInitialPlan(profile.planned_plan_code, metaPlan)
      setPlannedPlanCode(initialPlan)
    }

    async function loadProfile() {
      let willRedirect = false

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
          if (isActive) {
            willRedirect = true
            router.replace('/login')
          }
          return
        }

        const metaPlan = user.user_metadata?.plan

        const { profile, error: fetchError } =
          await getUserProfileForCompletionCheck(user.id)

        if (fetchError) {
          console.warn('Onboarding profile fetch handled error', {
            message: fetchError.message,
            code: (fetchError as { code?: string }).code,
            details: (fetchError as { details?: string }).details,
            hint: (fetchError as { hint?: string }).hint,
            full: fetchError,
          })
        }

        if (!fetchError && profile && isActive) {
          const onboardingProfile = profile as OnboardingProfileRow

          if (isUserProfileOnboardingComplete(onboardingProfile)) {
            willRedirect = true
            router.replace(AFTER_SAVE_REDIRECT)
            return
          }

          applyProfile(onboardingProfile, metaPlan)
        }

        if (!fetchError && !profile && isActive) {
          const initialPlan = resolveInitialPlan(null, metaPlan)
          setPlannedPlanCode(initialPlan)
        }
      } catch (error) {
        console.warn('Onboarding loadProfile handled exception', error)
      } finally {
        if (isActive && !willRedirect) {
          setAuthChecked(true)
        }
      }
    }

    loadProfile()
    return () => {
      isActive = false
    }
  }, [router])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormError('')
    setFieldErrors({})

    const errors: Record<string, string> = {}
    if (!username.trim()) errors.username = FIELD_ERROR_REQUIRED
    if (!ageGroup) errors.age_group = FIELD_ERROR_SELECT
    if (!targetRegionSlug) errors.target_region_slug = FIELD_ERROR_SELECT
    if (!originCountryCode) errors.origin_country = FIELD_ERROR_SELECT
    if (!currentLevel) errors.current_level = FIELD_ERROR_SELECT
    if (!speakByDeadlineText.trim()) errors.speak_by_deadline = FIELD_ERROR_SELECT
    if (!targetOutcomeText.trim()) errors.target_outcome_text = FIELD_ERROR_REQUIRED

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setLoading(true)
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        setFormError(copy.errors.loginRequired)
        return
      }

      // ── Username uniqueness check (exclude own profile) ──
      const trimmedUsername = username.trim()
      const { data: existingUser, error: usernameCheckError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('username', trimmedUsername)
        .neq('id', user.id)
        .limit(1)
        .maybeSingle()

      if (usernameCheckError) {
        console.warn('Username uniqueness check failed', usernameCheckError)
        // Non-blocking: if the check itself fails, let submission proceed
        // rather than blocking users due to a transient query error
      } else if (existingUser) {
        setFieldErrors({ username: 'このユーザー名は既に使われています' })
        return
      }

      const studyPlan = computeStudyPlan({
        deadlineText: speakByDeadlineText.trim(),
        currentLevel: currentLevel as CurrentLevel,
      })

      console.info('Onboarding auth user', {
        id: user.id,
        email: user.email,
      })
      // App-level trial: 7 days from signup
      const trialStart = new Date()
      const trialEnd = new Date(trialStart)
      trialEnd.setDate(trialEnd.getDate() + 7)

      const payload = {
        id: user.id,
        ui_language_code: uiLanguage,
        native_language_code: deriveNativeLanguageCode(originCountryCode),
        target_language_code: targetLanguageCode,
        current_learning_language: targetLanguageCode,
        target_region_slug: targetRegionSlug,
        current_level: currentLevel as CurrentLevel,
        origin_country: originCountryCode,
        speak_by_deadline_text: speakByDeadlineText.trim(),
        target_outcome_text: targetOutcomeText.trim(),
        daily_study_minutes_goal: studyPlan.recommendedDailyMinutes,
        username: username.trim(),
        age_group: ageGroup,
        planned_plan_code: plannedPlanCode || 'monthly',
        trial_start_at: trialStart.toISOString(),
        trial_ends_at: trialEnd.toISOString(),
      }

      const { error: upsertError } = await supabase
        .from('user_profiles')
        .upsert(payload, { onConflict: 'id' })

      if (upsertError) {
        console.warn('Onboarding upsert handled error', {
          message: upsertError.message,
          code: (upsertError as { code?: string }).code,
          details: (upsertError as { details?: string }).details,
          hint: (upsertError as { hint?: string }).hint,
          full: upsertError,
        })
        setFormError(getSaveErrorMessage(upsertError, copy.errors.saveFailed))
        return
      }

      const { error: learningProfileError } = await supabase
        .from('user_learning_profiles')
        .upsert(
          {
            user_id: user.id,
            language_code: targetLanguageCode,
            target_region_slug: targetRegionSlug,
            current_level: currentLevel as CurrentLevel,
            speak_by_deadline_text: speakByDeadlineText.trim(),
            target_outcome_text: targetOutcomeText.trim(),
            daily_study_minutes_goal: studyPlan.recommendedDailyMinutes,
          },
          { onConflict: 'user_id,language_code' }
        )

      if (learningProfileError) {
        console.warn('Onboarding learning profile upsert handled error', {
          message: learningProfileError.message,
          code: (learningProfileError as { code?: string }).code,
          details: (learningProfileError as { details?: string }).details,
          hint: (learningProfileError as { hint?: string }).hint,
          full: learningProfileError,
        })
        setFormError(getSaveErrorMessage(learningProfileError, copy.errors.saveFailed))
        return
      }

      setLoading(false)

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      const accessToken = session?.access_token
      if (sessionError || !accessToken) {
        setFormError(copy.errors.loginRequired)
        return
      }
      // Sync UI language to cookie before navigation
      try {
        document.cookie = `NEXT_LOCALE=${uiLanguage};path=/;max-age=31536000;SameSite=Lax`
        writeUiLanguageToStorage(uiLanguage)
      } catch { /* non-blocking */ }

      // Skip Stripe checkout — let user experience lessons first.
      // Payment is requested later via paywall or billing page.
      try { const { trackEvent } = await import('@/lib/analytics'); trackEvent('onboarding_completed', { language: targetLanguageCode, level: currentLevel }) } catch { /* non-blocking */ }
      window.location.assign('/lesson')
    } catch (error) {
      console.warn('Onboarding submit handled exception', error)
      setFormError(getRuntimeErrorMessage(error, copy.errors.saveError))
    } finally {
      setLoading(false)
    }
  }

  if (!authChecked) {
    return (
      <div
        className="min-h-screen flex flex-col bg-[#f7f4ef]"
        style={{ fontFamily: "'Nunito','Hiragino Sans',sans-serif" }}
      >
        <AppHeader />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-[#4a4a6a] font-medium">{copy.loading}</p>
        </main>
      </div>
    )
  }

  const planSummary = getPlannedPlanSummary(plannedPlanCode || 'monthly')
  const deadlineTrimmed = speakByDeadlineText.trim()
  const recommendedDailyMinutes =
    currentLevel && deadlineTrimmed
      ? computeStudyPlan({
          deadlineText: deadlineTrimmed,
          currentLevel: currentLevel as CurrentLevel,
        }).recommendedDailyMinutes
      : null

  return (
    <div
      className="min-h-screen flex flex-col bg-[#f7f4ef] text-[#1a1a2e]"
      style={{ fontFamily: "'Nunito','Hiragino Sans',sans-serif" }}
    >
      <AppHeader />

      <main className="flex-1">
        <div className={CONTAINER_CLASS}>
          <div className="mb-8">
            <span
              className="inline-flex items-center rounded-full border border-[#ff6b35]/30 bg-[#ff6b35]/10 px-3.5 py-1 text-xs font-bold tracking-wide text-[#ff6b35]"
              aria-hidden
            >
              {copy.badge}
            </span>
            <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-[#1a1a2e] sm:text-3xl">
              {copy.title}
            </h1>
            <p className="mt-2 text-[#4a4a6a] leading-relaxed sm:text-base">
              {copy.intro}
            </p>
          </div>

          <form onSubmit={handleSubmit} className={CARD_CLASS}>
            <div className="space-y-6">
              <div>
                <label htmlFor="ui_language_code" className={LABEL_CLASS}>{copy.labels.uiLanguage}</label>
                <select
                  id="ui_language_code"
                  value={uiLanguage}
                  onChange={(e) => {
                    setUiLanguage(e.target.value)
                    writeUiLanguageToStorage(e.target.value)
                  }}
                  className={INPUT_CLASS}
                  disabled={loading || checkoutLaunching}
                >
                  {uiLanguageOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                {copy.hints.uiLanguage && (
                  <p className="mt-1.5 text-xs text-[#9ca3af]">{copy.hints.uiLanguage}</p>
                )}
              </div>

              <div>
                <label htmlFor="target_language_code" className={LABEL_CLASS}>
                  {copy.labels.targetLanguage}
                </label>
                <select
                  id="target_language_code"
                  value={targetLanguageCode}
                  onChange={(e) => {
                    setTargetLanguageCode(e.target.value)
                    setTargetRegionSlug('')
                  }}
                  className={INPUT_CLASS}
                  disabled={loading || checkoutLaunching}
                >
                  {learningLanguageOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="username" className={LABEL_CLASS}>
                  ユーザー名 <span className="ml-1 text-xs font-medium text-amber-600">{copy.requiredMark}</span>
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="表示名"
                  className={INPUT_CLASS}
                  disabled={loading || checkoutLaunching}
                />
                {fieldErrors.username && (
                  <p className="mt-1.5 text-sm text-red-600">{fieldErrors.username}</p>
                )}
              </div>

              <div>
                <label htmlFor="age_group" className={LABEL_CLASS}>
                  年代 <span className="ml-1 text-xs font-medium text-amber-600">{copy.requiredMark}</span>
                </label>
                <select
                  id="age_group"
                  value={ageGroup}
                  onChange={(e) => setAgeGroup(e.target.value)}
                  className={INPUT_CLASS}
                  disabled={loading || checkoutLaunching}
                >
                  <option value="">{copy.placeholders.select}</option>
                  {AGE_GROUP_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                {fieldErrors.age_group && (
                  <p className="mt-1.5 text-sm text-red-600">{fieldErrors.age_group}</p>
                )}
              </div>

              <div>
                <span className={LABEL_CLASS}>契約予定プラン</span>
                <div className="mt-2 rounded-xl border border-amber-200/60 bg-amber-50/50 px-4 py-3">
                  <p className="font-semibold text-[#1a1a2e]">
                    {planSummary.label} / {planSummary.priceText}
                  </p>
                  <p className="mt-1.5 text-xs text-[#4a4a6a] leading-relaxed">
                    プランは後からマイページで見直せます。
                  </p>
                </div>
              </div>
              <div>
                <label htmlFor="target_region_slug" className={LABEL_CLASS}>
                  学習したい地域・ローカル表現 <span className="ml-1 text-xs font-medium text-amber-600">{copy.requiredMark}</span>
                </label>
                <select
                  id="target_region_slug"
                  value={targetRegionSlug}
                  onChange={(e) => setTargetRegionSlug(e.target.value)}
                  className={INPUT_CLASS}
                  disabled={loading || checkoutLaunching}
                >
                  <option value="">{copy.placeholders.select}</option>
                  {regionOptions.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                {fieldErrors.target_region_slug && (
                  <p className="mt-1.5 text-sm text-red-600">{fieldErrors.target_region_slug}</p>
                )}
              </div>

              <div>
                <label htmlFor="origin_country_code" className={LABEL_CLASS}>
                  出身国 <span className="ml-1 text-xs font-medium text-amber-600">{copy.requiredMark}</span>
                </label>
                <select
                  id="origin_country_code"
                  value={originCountryCode}
                  onChange={(e) => setOriginCountryCode(e.target.value)}
                  className={INPUT_CLASS}
                  disabled={loading || checkoutLaunching}
                >
                  <option value="">{copy.placeholders.select}</option>
                  {ORIGIN_COUNTRY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {fieldErrors.origin_country && (
                  <p className="mt-1.5 text-sm text-red-600">{fieldErrors.origin_country}</p>
                )}
              </div>


              <div>
                <label htmlFor="current_level" className={LABEL_CLASS}>
                  {copy.labels.currentLevel} <span className="ml-1 text-xs font-medium text-amber-600">{copy.requiredMark}</span>
                </label>
                <p className={HINT_CLASS}>{copy.hints.currentLevel}</p>
                <select
                  id="current_level"
                  value={currentLevel}
                  onChange={(e) => {
                    const raw = e.target.value || ''
                    const level = CURRENT_LEVEL_OPTIONS.find((o) => o.value === raw)?.value
                    setCurrentLevel(level ?? '')
                  }}
                  className={INPUT_CLASS}
                  disabled={loading || checkoutLaunching}
                >
                  <option value="">{copy.placeholders.select}</option>
                  {CURRENT_LEVEL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {fieldErrors.current_level && (
                  <p className="mt-1.5 text-sm text-red-600">{fieldErrors.current_level}</p>
                )}
              </div>

              <div>
                <label htmlFor="speak_by_deadline" className={LABEL_CLASS}>
                  {copy.labels.speakByDeadline} <span className="ml-1 text-xs font-medium text-amber-600">{copy.requiredMark}</span>
                </label>
                <p className={HINT_CLASS}>{copy.hints.speakByDeadline}</p>
                <select
                  id="speak_by_deadline"
                  value={speakByDeadlineText}
                  onChange={(e) => setSpeakByDeadlineText(e.target.value)}
                  className={INPUT_CLASS}
                  disabled={loading || checkoutLaunching}
                >
                  <option value="">{copy.placeholders.select}</option>
                  {DEADLINE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                {fieldErrors.speak_by_deadline && (
                  <p className="mt-1.5 text-sm text-red-600">{fieldErrors.speak_by_deadline}</p>
                )}
              </div>

              {recommendedDailyMinutes != null && (
                <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 px-4 py-4">
                  <p className={LABEL_CLASS}>おすすめ学習プラン</p>
                  <p className="mt-1 text-xl font-bold text-[#1a1a2e]">1日 {recommendedDailyMinutes} 分</p>
                  <p className="mt-1.5 text-xs text-[#4a4a6a] leading-relaxed">
                    現在のレベルと目標期限から自動計算された目安です。後からマイページで見直せます。
                  </p>
                </div>
              )}

              <div>
                <label htmlFor="target_outcome_text" className={LABEL_CLASS}>
                  {copy.labels.targetOutcome} <span className="ml-1 text-xs font-medium text-amber-600">{copy.requiredMark}</span>
                </label>
                <p className={HINT_CLASS}>{copy.hints.targetOutcome}</p>
                <textarea
                  id="target_outcome_text"
                  value={targetOutcomeText}
                  onChange={(e) => setTargetOutcomeText(e.target.value)}
                  rows={3}
                  placeholder={copy.placeholders.targetOutcome}
                  className={INPUT_CLASS + ' resize-none'}
                  disabled={loading || checkoutLaunching}
                />
                {fieldErrors.target_outcome_text && (
                  <p className="mt-1.5 text-sm text-red-600">{fieldErrors.target_outcome_text}</p>
                )}
              </div>
            </div>

            {formError && (
              <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-100">
                {formError}
              </p>
            )}

            <div className="mt-6 rounded-xl border-2 border-amber-200/70 bg-amber-50/40 px-4 py-4 sm:px-5 sm:py-5">
              <h3 className="text-sm font-bold text-[#1a1a2e] mb-3">ご利用について</h3>
              <ul className="space-y-1.5 text-sm text-[#2a2a4a] leading-relaxed list-none">
                <li className="flex gap-2">
                  <span className="text-amber-600 shrink-0">・</span>
                  <span>まずは無料でレッスンをお試しいただけます</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-600 shrink-0">・</span>
                  <span>無料期間終了後、続けるにはプラン登録が必要です</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-600 shrink-0">・</span>
                  <span>プラン登録はアプリ内の「お支払い」画面からいつでも行えます</span>
                </li>
              </ul>
            </div>
            <button
              type="submit"
              disabled={loading || checkoutLaunching}
              className="mt-3 w-full rounded-xl bg-gradient-to-r from-[#ff6b35] to-[#f7c948] py-3.5 font-bold text-white shadow-[0_4px_18px_rgba(255,107,53,.32)] transition-all hover:shadow-[0_6px_24px_rgba(255,107,53,.4)] hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-[0_4px_18px_rgba(255,107,53,.32)]"
            >
              {loading ? copy.buttons.saving : checkoutLaunching ? CHECKOUT_LAUNCHING_LABEL : DEFAULT_SUBMIT_LABEL}
            </button>
          </form>
        </div>
      </main>

      <footer className="border-t border-[#ede9e2] bg-white px-6 py-8 sm:px-10 sm:py-8">
        <div className="mx-auto max-w-[960px] flex flex-col items-center gap-2 text-center">
          <Link href="/" className="focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded">
            <Image src="/images/branding/footer_logo.svg" alt="NativeFlow" width={200} height={40} className="h-9 w-auto object-contain" />
          </Link>
          <p className="text-[13px] text-[#aaa]">Speak with AI. Learn like a native.</p>
          <p className="text-xs text-[#bbb]">© 2026 NativeFlow</p>
        </div>
      </footer>
    </div>
  )
}
