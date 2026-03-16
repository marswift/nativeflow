'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SettingsPageHeader } from '@/components/settings/SettingsPageHeader'
import { SettingsPageFooter } from '@/components/settings/SettingsPageFooter'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { computeStudyPlan } from '../../lib/study-plan-service'
import type { UserProfileRow } from '../../lib/types'
import {
  TARGET_LANGUAGE_FIXED,
  TARGET_LANGUAGE_OPTIONS,
  CURRENT_LEVEL_OPTIONS,
  COUNTRY_BY_LANGUAGE,
  type CurrentLevel,
  type TargetCountryCode,
} from '../../lib/constants'

const PAGE_SHELL_CLASS = 'min-h-screen flex flex-col bg-[#faf9f6]'
const CONTAINER_CLASS = 'mx-auto w-full max-w-md px-6 py-8 sm:py-10 md:max-w-5xl md:px-8 md:py-10 lg:px-10 lg:py-12'
const RADIUS = 'rounded-2xl'
const CARD_SHADOW = 'shadow-[0_6px_24px_rgba(0,0,0,.06)]'
const CARD_BORDER = 'border border-[#e8e4de]'
const CARD_BASE = `${RADIUS} ${CARD_BORDER} bg-white ${CARD_SHADOW}`
const LINK_CLASS = 'text-sm font-medium text-amber-600 hover:text-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded'
const LABEL_CLASS = 'block text-sm font-medium text-[#4a4a6a]'
const INPUT_CLASS = 'mt-1.5 w-full rounded-xl border border-[#ede9e2] bg-white px-4 py-2.5 text-[#1a1a2e] placeholder:text-[#9ca3af] focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20'
const SELECT_CLASS = 'mt-1.5 w-full rounded-xl border border-[#ede9e2] bg-white px-4 py-2.5 text-[#1a1a2e] focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20'
const READONLY_VALUE_CLASS = 'mt-1.5 rounded-xl border border-[#ede9e2] bg-[#faf8f5] px-4 py-2.5 text-[15px] text-[#1a1a2e]'

const USER_FACING_ERROR = 'ページを読み込めませんでした。時間をおいて再度お試しください。'

const TARGET_LANGUAGE_LABEL = TARGET_LANGUAGE_OPTIONS.find((o) => o.value === TARGET_LANGUAGE_FIXED)?.label ?? '英語'

// 話せるようになりたい期間 (DB: speak_by_deadline_text)
const DEADLINE_OPTIONS = [
  { value: '', label: '選択してください' },
  { value: '6ヶ月', label: '6ヶ月' },
  { value: '1年', label: '1年' },
  { value: '1年6ヶ月', label: '1年6ヶ月' },
  { value: '2年', label: '2年' },
  { value: '2年6ヶ月', label: '2年6ヶ月' },
  { value: '3年', label: '3年' },
] as const

const AGE_GROUP_OPTIONS = [
  { value: '', label: '選択してください' },
  { value: 'teens', label: '10代' },
  { value: '20s', label: '20代' },
  { value: '30s', label: '30代' },
  { value: '40s', label: '40代' },
  { value: '50plus', label: '50代以上' },
] as const

type ProfileRow = UserProfileRow & {
  username?: string | null
  age_group?: string | null
  country_code?: string | null
  planned_plan_code?: string | null
}

export default function SettingsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [authEmail, setAuthEmail] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveMessage, setSaveMessage] = useState('')

  const [username, setUsername] = useState('')
  const [ageGroup, setAgeGroup] = useState('')
  const [countryCode, setCountryCode] = useState('')

  const [targetCountryCode, setTargetCountryCode] = useState<TargetCountryCode | ''>('')
  const [currentLevel, setCurrentLevel] = useState<CurrentLevel | ''>('')
  const [speakByDeadlineText, setSpeakByDeadlineText] = useState('')
  const [targetOutcomeText, setTargetOutcomeText] = useState('')

  useEffect(() => {
    let isActive = true

    async function loadPage() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError || !session?.user) {
          if (isActive) router.replace('/login')
          return
        }

        const sessionEmail = session.user.email ?? ''
        if (isActive) setAuthEmail(sessionEmail)

        const { data: row, error: fetchError } = await supabase
          .from('user_profiles')
          .select(
            'id, target_language_code, target_country_code, current_level, speak_by_deadline_text, target_outcome_text, daily_study_minutes_goal, username, age_group, country_code, planned_plan_code'
          )
          .eq('id', session.user.id)
          .maybeSingle()

        if (fetchError) {
          console.error('My Page profile fetch error', fetchError)
          if (isActive) setPageError(USER_FACING_ERROR)
          return
        }

        if (!row) {
          if (isActive) router.replace('/onboarding')
          return
        }

        const profileRow = row as ProfileRow
        if (isActive) {
          setProfile(profileRow)
          const rawUsername = profileRow.username != null ? String(profileRow.username).trim() : ''
          setUsername(rawUsername === sessionEmail ? '' : rawUsername)
          setAgeGroup(profileRow.age_group ?? '')
          setCountryCode(profileRow.country_code ?? '')
          const plan = profileRow.planned_plan_code
          setTargetCountryCode((profileRow.target_country_code as TargetCountryCode) ?? '')
          setCurrentLevel((profileRow.current_level as CurrentLevel) ?? '')
          const deadline = profileRow.speak_by_deadline_text?.trim() ?? ''
          setSpeakByDeadlineText(DEADLINE_OPTIONS.some((o) => o.value === deadline) ? deadline : '')
          setTargetOutcomeText(profileRow.target_outcome_text?.trim() ?? '')
        }
      } catch (err) {
        console.error('My Page load exception', err)
        if (isActive) setPageError(USER_FACING_ERROR)
      } finally {
        if (isActive) setLoading(false)
      }
    }

    loadPage()
    return () => {
      isActive = false
    }
  }, [router])

  async function handleLogout() {
    try {
      await supabase.auth.signOut()
      router.replace('/login')
    } catch (err) {
      console.error(err)
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!profile?.id) return
    setSaveStatus('saving')
    setSaveMessage('')
    try {
      const deadlineTrimmed = speakByDeadlineText.trim()
      const dailyStudyMinutesGoal =
        currentLevel && deadlineTrimmed
          ? computeStudyPlan({
              deadlineText: deadlineTrimmed,
              currentLevel: currentLevel as CurrentLevel,
            }).recommendedDailyMinutes
          : null

      const payload = {
        username: username.trim() || null,
        age_group: ageGroup || null,
        country_code: countryCode || null,
        target_country_code: targetCountryCode || null,
        current_level: currentLevel || null,
        speak_by_deadline_text: deadlineTrimmed || null,
        target_outcome_text: targetOutcomeText.trim() || null,
        daily_study_minutes_goal: dailyStudyMinutesGoal,
      }
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update(payload)
        .eq('id', profile.id)
      if (updateError) {
        setSaveStatus('error')
        setSaveMessage(updateError.message || '保存に失敗しました')
        return
      }
      setSaveStatus('saved')
      setSaveMessage('プロフィールを更新しました')
      setProfile((prev) =>
        prev
          ? ({
              ...prev,
              username: payload.username,
              age_group: payload.age_group,
              country_code: payload.country_code,
              target_country_code: payload.target_country_code,
              current_level: payload.current_level,
              speak_by_deadline_text: payload.speak_by_deadline_text,
              target_outcome_text: payload.target_outcome_text,
              daily_study_minutes_goal: payload.daily_study_minutes_goal,
            } as ProfileRow)
          : null
      )
      setTimeout(() => {
        setSaveStatus('idle')
        setSaveMessage('')
      }, 3000)
    } catch (err) {
      console.error(err)
      setSaveStatus('error')
      setSaveMessage('保存に失敗しました')
    }
  }

  if (loading) {
    return (
      <div className={PAGE_SHELL_CLASS} style={{ fontFamily: "'Nunito','Hiragino Sans',sans-serif" }}>
        <SettingsPageHeader onLogout={handleLogout} />
        <main className="flex-1 flex items-center justify-center px-6">
          <p className="text-[#4a4a6a]" aria-live="polite">読み込み中...</p>
        </main>
        <SettingsPageFooter />
      </div>
    )
  }

  if (pageError || !profile) {
    return (
      <div className={PAGE_SHELL_CLASS} style={{ fontFamily: "'Nunito','Hiragino Sans',sans-serif" }}>
        <SettingsPageHeader onLogout={handleLogout} />
        <main className="flex-1">
          <div className={CONTAINER_CLASS}>
            <p className="mt-8 text-sm text-[#4a4a6a]">{pageError || USER_FACING_ERROR}</p>
            <p className="mt-6">
              <Link href="/login" className={LINK_CLASS}>ログインへ戻る</Link>
            </p>
          </div>
        </main>
        <SettingsPageFooter />
      </div>
    )
  }

  const countryOptions = COUNTRY_BY_LANGUAGE[TARGET_LANGUAGE_FIXED] ?? []

  // Display-only preview: recompute from level + deadline when both set; else use saved value
  const deadlineTrimmed = speakByDeadlineText.trim()
  const dailyStudyMinutesDisplay =
    currentLevel && deadlineTrimmed
      ? computeStudyPlan({
          deadlineText: deadlineTrimmed,
          currentLevel: currentLevel as CurrentLevel,
        }).recommendedDailyMinutes
      : null
  const dailyStudyMinutesDisplayValue =
    dailyStudyMinutesDisplay ?? profile.daily_study_minutes_goal ?? null

  return (
    <div
      className={PAGE_SHELL_CLASS}
      style={{ fontFamily: "'Nunito','Hiragino Sans',sans-serif" }}
    >
      <SettingsPageHeader onLogout={handleLogout} />

      <main className="flex-1">
        <div className={CONTAINER_CLASS}>
          {/* Page header */}
          <div className="text-center mt-6 md:mt-8 mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-[#1a1a2e] sm:text-3xl">
              マイページ
            </h1>
            <p className="mt-2 text-sm text-[#5a5a7a]">
              アカウント・学習設定・プラン管理
            </p>
          </div>

          {/* Main detail: 2 columns — Profile (left), Learning (right) */}
          <form onSubmit={handleSaveProfile} className="space-y-6 md:space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 md:items-stretch">
              {/* Profile card */}
              <section className={`${CARD_BASE} px-6 py-6 sm:px-7 sm:py-6 flex flex-col`} aria-label="プロフィール">
                <h2 className="text-center text-lg font-extrabold text-[#1a1a2e] tracking-tight pb-3 mb-5 border-b-2 border-[#f0eeea]">
                  プロフィール
                </h2>
                <div className="space-y-4 flex-1 min-h-0">
                  <div>
                    <label htmlFor="authEmail" className={LABEL_CLASS}>メールアドレス</label>
                    <p id="authEmail" className={READONLY_VALUE_CLASS} aria-readonly="true">
                      {authEmail || '—'}
                    </p>
                  </div>
                  <div>
                    <label htmlFor="username" className={LABEL_CLASS}>ユーザー名</label>
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className={INPUT_CLASS}
                      placeholder="例：ニックネーム"
                    />
                  </div>
                  <div>
                    <label htmlFor="ageGroup" className={LABEL_CLASS}>年代</label>
                    <select
                      id="ageGroup"
                      value={ageGroup}
                      onChange={(e) => setAgeGroup(e.target.value)}
                      className={SELECT_CLASS}
                    >
                      {AGE_GROUP_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              {/* Learning settings card */}
              <section className={`${CARD_BASE} px-6 py-6 sm:px-7 sm:py-6 flex flex-col`} aria-label="学習設定">
                <h2 className="text-center text-lg font-extrabold text-[#1a1a2e] tracking-tight pb-3 mb-5 border-b-2 border-[#f0eeea]">
                  学習設定
                </h2>
                <div className="space-y-4 flex-1 min-h-0">
                  <div>
                    <span className={LABEL_CLASS}>学習言語</span>
                    <p className={READONLY_VALUE_CLASS} aria-readonly="true">{TARGET_LANGUAGE_LABEL}</p>
                    <p className="mt-1 text-xs text-[#7c7c7c]">現在は英語のみ対応しています。</p>
                  </div>
                  {countryOptions.length > 0 && (
                    <div>
                      <label htmlFor="targetCountry" className={LABEL_CLASS}>学習する言語の地域</label>
                      <select
                        id="targetCountry"
                        value={targetCountryCode}
                        onChange={(e) => setTargetCountryCode(e.target.value as TargetCountryCode)}
                        className={SELECT_CLASS}
                      >
                        <option value="">選択してください</option>
                        {countryOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label htmlFor="currentLevel" className={LABEL_CLASS}>現在のレベル</label>
                    <select
                      id="currentLevel"
                      value={currentLevel}
                      onChange={(e) => setCurrentLevel(e.target.value as CurrentLevel)}
                      className={SELECT_CLASS}
                    >
                      <option value="">選択してください</option>
                      {CURRENT_LEVEL_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="targetOutcome" className={LABEL_CLASS}>学習目標</label>
                    <input
                      id="targetOutcome"
                      type="text"
                      value={targetOutcomeText}
                      onChange={(e) => setTargetOutcomeText(e.target.value)}
                      className={INPUT_CLASS}
                      placeholder="例：仕事で英語を使えるようになりたい"
                    />
                  </div>
                  <div>
                    <label htmlFor="speakByDeadline" className={LABEL_CLASS}>話せるようになりたい期間</label>
                    <select
                      id="speakByDeadline"
                      value={speakByDeadlineText}
                      onChange={(e) => setSpeakByDeadlineText(e.target.value)}
                      className={SELECT_CLASS}
                    >
                      {DEADLINE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span className={LABEL_CLASS}>1日の学習目標時間（分）</span>
                    <p className={READONLY_VALUE_CLASS} aria-readonly="true">
                      {dailyStudyMinutesDisplayValue != null ? dailyStudyMinutesDisplayValue : '—'}
                    </p>
                    <p className="mt-1 text-xs text-[#7c7c7c]">学習プランに基づいて自動計算されています。</p>
                  </div>
                </div>
              </section>
            </div>


            {/* 支払い・契約管理 */}
            <div className={`${CARD_BASE} px-6 py-5 sm:px-7 sm:py-6`}>
              <h2 className="text-center text-lg font-extrabold text-[#1a1a2e] tracking-tight pb-3 mb-4 border-b-2 border-[#f0eeea]">
                お支払い・契約管理
              </h2>
              <p className="text-sm text-[#5a5a7a] leading-relaxed text-center">
                プラン変更、次回決済日、解約に関する案内をご確認できます。
              </p>
              <div className="mt-5 flex justify-center">
                <Link
                  href="/settings/billing"
                  className="inline-flex items-center rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-amber-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 transition-colors"
                >
                  お支払い・契約管理を見る
                </Link>
              </div>
            </div>

            {/* Save action area */}
            <div className="flex flex-col items-center justify-center gap-4 pt-4 pb-2">
              <button
                type="submit"
                disabled={saveStatus === 'saving'}
                className="rounded-xl bg-amber-500 px-10 py-3.5 font-bold text-white text-base shadow-md hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 disabled:opacity-70 transition-colors"
              >
                {saveStatus === 'saving' ? '保存中...' : '保存する'}
              </button>
              {saveMessage && (
                <span
                  className={`text-sm ${saveStatus === 'error' ? 'text-red-600' : 'text-[#4a4a6a]'}`}
                  role="status"
                >
                  {saveMessage}
                </span>
              )}
            </div>
          </form>
        </div>
      </main>

      <SettingsPageFooter />
    </div>
  )
}
