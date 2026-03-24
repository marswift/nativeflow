'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ONBOARDING_COPY_JA } from '../../../lib/onboarding-copy'
import type { PartialUserProfileRow } from '../../../lib/types'
import {
  TARGET_LANGUAGE_OPTIONS,
  COUNTRY_BY_LANGUAGE,
  CURRENT_LEVEL_OPTIONS,
  type CurrentLevel,
  type TargetLanguageCode,
} from '../../../lib/constants'
import { getSupabaseBrowserClient } from '../../../lib/supabase/browser-client'
const supabase = getSupabaseBrowserClient()

const MAIN_LOADING_CLASS = 'min-h-screen bg-[#faf8f5] flex items-center justify-center'
const MAIN_CONTENT_CLASS = 'min-h-screen bg-[#faf8f5] px-6 py-12'
const CONTAINER_CLASS = 'mx-auto max-w-md'
const CARD_CLASS = 'rounded-lg border border-[#e8e4df] bg-white px-4 py-4'
const INPUT_CLASS = 'mt-2 w-full rounded-lg border border-[#e8e4df] bg-white px-4 py-3 text-[#2c2c2c] placeholder:text-[#9c9c9c] focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400'
const SELECT_CLASS = 'mt-2 w-full rounded-lg border border-[#e8e4df] bg-white px-4 py-3 text-[#2c2c2c] focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400'

export default function LearningSettingsPage() {
  const router = useRouter()
  const copy = ONBOARDING_COPY_JA
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [infoMessage, setInfoMessage] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [uiLanguageCode, setUiLanguageCode] = useState('')
  const [targetLanguageCode, setTargetLanguageCode] = useState('')
  const [targetCountryCode, setTargetCountryCode] = useState('')
  const [targetRegionSlug, setTargetRegionSlug] = useState('')
  const [currentLevel, setCurrentLevel] = useState<CurrentLevel | ''>('')
  const [speakByDeadlineText, setSpeakByDeadlineText] = useState('')
  const [targetOutcomeText, setTargetOutcomeText] = useState('')
  const [dailyStudyMinutesGoal, setDailyStudyMinutesGoal] = useState<string>('')

  useEffect(() => {
    let isActive = true

    function applyProfile(profile: PartialUserProfileRow & { id: string }) {
      setUserId(profile.id)
      if (profile.ui_language_code != null) setUiLanguageCode(profile.ui_language_code)
      if (profile.target_language_code != null) setTargetLanguageCode(profile.target_language_code)
      if (profile.target_country_code != null) setTargetCountryCode(profile.target_country_code)
      if (profile.target_region_slug != null) setTargetRegionSlug(profile.target_region_slug)
      if (profile.current_level != null) setCurrentLevel(profile.current_level)
      if (profile.speak_by_deadline_text != null) setSpeakByDeadlineText(profile.speak_by_deadline_text)
      if (profile.target_outcome_text != null) setTargetOutcomeText(profile.target_outcome_text)
      if (profile.daily_study_minutes_goal != null) setDailyStudyMinutesGoal(String(profile.daily_study_minutes_goal))
    }

    async function loadProfile() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError || !session?.user) {
          if (isActive) router.replace('/login')
          return
        }
        const { data: row, error: fetchError } = await supabase
          .from('user_profiles')
          .select(
            'id, ui_language_code, target_language_code, target_country_code, target_region_slug, current_level, speak_by_deadline_text, target_outcome_text, daily_study_minutes_goal'
          )
          .eq('id', session.user.id)
          .maybeSingle()
        if (fetchError) {
          if (isActive) setError(fetchError.message)
          return
        }
        if (!row && isActive) {
          router.replace('/onboarding')
          return
        }
        if (row && isActive) {
          applyProfile(row as PartialUserProfileRow & { id: string })
        }
      } catch (err) {
        console.error(err)
        if (isActive) setError('プロフィールを読み込めませんでした')
      } finally {
        if (isActive) setLoading(false)
      }
    }

    loadProfile()
    return () => {
      isActive = false
    }
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setInfoMessage('')
    if (!userId) {
      setError('プロフィールを読み込めませんでした')
      return
    }
    const targetLanguage = targetLanguageCode || null
    const targetCountry = targetCountryCode || null
    const level = currentLevel || null
    if (!targetLanguage || !targetCountry || !level) {
      setError(copy.errors.validationRequired)
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        ui_language_code: uiLanguageCode || null,
        target_language_code: targetLanguage,
        target_country_code: targetCountry,
        target_region_slug: targetRegionSlug.trim() || null,
        current_level: level,
        speak_by_deadline_text: speakByDeadlineText.trim() || null,
        target_outcome_text: targetOutcomeText.trim() || null,
        daily_study_minutes_goal: dailyStudyMinutesGoal.trim() ? Math.max(0, parseInt(dailyStudyMinutesGoal, 10) || 0) : null,
      }
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update(payload)
        .eq('id', userId)
      if (updateError) {
        setError(updateError.message || copy.errors.saveFailed)
        return
      }
      setInfoMessage('学習設定を更新しました')
      router.refresh()
    } catch (err) {
      console.error(err)
      setError(copy.errors.saveError)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className={MAIN_LOADING_CLASS}>
        <p className="text-[#5c5c5c]">{copy.loading}</p>
      </main>
    )
  }

  return (
    <main className={MAIN_CONTENT_CLASS}>
      <div className={CONTAINER_CLASS}>
        <h1 className="text-2xl font-semibold text-[#2c2c2c]">NativeFlow</h1>
        <p className="mt-1 text-[#5c5c5c]">Speak with AI. Learn like a native.</p>

        <h2 className="mt-8 text-lg font-semibold text-[#2c2c2c]">Learning</h2>

        <form onSubmit={handleSubmit} className={`mt-4 ${CARD_CLASS}`}>
          {error && (
            <p className="mb-3 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          {infoMessage && (
            <p className="mb-3 text-sm text-amber-700">{infoMessage}</p>
          )}

          <div>
            <label htmlFor="ui_language_code" className="block text-sm font-medium text-[#2c2c2c]">
              表示言語
            </label>
            <select
              id="ui_language_code"
              value={uiLanguageCode}
              onChange={(e) => setUiLanguageCode(e.target.value)}
              className={SELECT_CLASS}
              disabled={submitting}
            >
              <option value="">選択してください</option>
              <option value="ja">日本語</option>
              <option value="en">English</option>
            </select>
          </div>

          <div className="mt-4">
            <label htmlFor="target_language_code" className="block text-sm font-medium text-[#2c2c2c]">
              {copy.labels.targetLanguage}
            </label>
            <select
              id="target_language_code"
              value={targetLanguageCode}
              onChange={(e) => setTargetLanguageCode(e.target.value)}
              className={SELECT_CLASS}
              disabled={submitting}
            >
              <option value="">{copy.placeholders.select}</option>
              {TARGET_LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4">
            <label htmlFor="target_country_code" className="block text-sm font-medium text-[#2c2c2c]">
              {copy.labels.targetCountry}
            </label>
            <select
              id="target_country_code"
              value={targetCountryCode}
              onChange={(e) => setTargetCountryCode(e.target.value)}
              className={SELECT_CLASS}
              disabled={submitting}
            >
              <option value="">{copy.placeholders.select}</option>
              {(COUNTRY_BY_LANGUAGE[targetLanguageCode as TargetLanguageCode] ?? []).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4">
            <label htmlFor="target_region_slug" className="block text-sm font-medium text-[#2c2c2c]">
              {copy.labels.regionOptional}
            </label>
            <input
              id="target_region_slug"
              type="text"
              value={targetRegionSlug}
              onChange={(e) => setTargetRegionSlug(e.target.value)}
              placeholder={copy.placeholders.region}
              className={INPUT_CLASS}
              disabled={submitting}
            />
          </div>

          <div className="mt-4">
            <label htmlFor="current_level" className="block text-sm font-medium text-[#2c2c2c]">
              {copy.labels.currentLevel}
            </label>
            <select
              id="current_level"
              value={currentLevel}
              onChange={(e) => {
                const raw = e.target.value || ''
                const level = CURRENT_LEVEL_OPTIONS.find((o) => o.value === raw)?.value
                setCurrentLevel(level ?? '')
              }}
              className={SELECT_CLASS}
              disabled={submitting}
            >
              <option value="">{copy.placeholders.select}</option>
              {CURRENT_LEVEL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4">
            <label htmlFor="speak_by_deadline" className="block text-sm font-medium text-[#2c2c2c]">
              {copy.labels.speakByDeadline}
            </label>
            <input
              id="speak_by_deadline"
              type="text"
              value={speakByDeadlineText}
              onChange={(e) => setSpeakByDeadlineText(e.target.value)}
              placeholder={copy.placeholders.speakByDeadline}
              className={INPUT_CLASS}
              disabled={submitting}
            />
          </div>

          <div className="mt-4">
            <label htmlFor="target_outcome_text" className="block text-sm font-medium text-[#2c2c2c]">
              {copy.labels.targetOutcome}
            </label>
            <textarea
              id="target_outcome_text"
              value={targetOutcomeText}
              onChange={(e) => setTargetOutcomeText(e.target.value)}
              rows={3}
              placeholder={copy.placeholders.targetOutcome}
              className="mt-2 w-full resize-none rounded-lg border border-[#e8e4df] bg-white px-4 py-3 text-[#2c2c2c] placeholder:text-[#9c9c9c] focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
              disabled={submitting}
            />
          </div>

          <div className="mt-4">
            <label htmlFor="daily_study_minutes_goal" className="block text-sm font-medium text-[#2c2c2c]">
              1日の学習時間（分）
            </label>
            <input
              id="daily_study_minutes_goal"
              type="number"
              min={0}
              value={dailyStudyMinutesGoal}
              onChange={(e) => setDailyStudyMinutesGoal(e.target.value)}
              placeholder="例: 30"
              className={INPUT_CLASS}
              disabled={submitting}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 w-full rounded-lg bg-amber-500 py-3 font-medium text-white hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {submitting ? copy.buttons.saving : copy.buttons.save}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#5c5c5c]">
          <Link
            href="/settings"
            className="font-medium text-amber-600 hover:text-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 rounded"
          >
            設定に戻る
          </Link>
        </p>
      </div>
    </main>
  )
}
