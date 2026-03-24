'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AppHeader from '@/components/header/app-header'
import AppFooter from '@/components/footer/app-footer'
import { useEffect, useState } from 'react'
import { computeStudyPlan } from '../../lib/study-plan-service'
import type { UserProfileRow } from '../../lib/types'
import {
  TARGET_LANGUAGE_OPTIONS,
  CURRENT_LEVEL_OPTIONS,
  type CurrentLevel,
} from '../../lib/constants'
import { getSupabaseBrowserClient } from '../../lib/supabase/browser-client'

const supabase = getSupabaseBrowserClient()

const PAGE_SHELL_CLASS = 'min-h-screen flex flex-col bg-[#faf9f6]'
const CONTAINER_CLASS = 'mx-auto w-full max-w-6xl px-6 py-8 sm:py-10 md:px-8 md:py-10 lg:px-10 lg:py-12'
const RADIUS = 'rounded-2xl'
const CARD_SHADOW = 'shadow-[0_10px_30px_rgba(15,23,42,0.06)]'
const CARD_BORDER = 'border border-[#E8E4DF]'
const CARD_BASE = `${RADIUS} ${CARD_BORDER} bg-white ${CARD_SHADOW}`
const LINK_CLASS = 'text-sm font-medium text-amber-600 hover:text-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded'
const LABEL_CLASS = 'block text-sm font-medium text-[#4a4a6a]'
const INPUT_CLASS = 'mt-1.5 w-full rounded-xl border border-[#ede9e2] bg-white px-4 py-2.5 text-[#1a1a2e] placeholder:text-[#9ca3af] focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20'
const SELECT_CLASS = 'mt-1.5 w-full rounded-xl border border-[#ede9e2] bg-white px-4 py-2.5 text-[#1a1a2e] focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20'
const READONLY_VALUE_CLASS = 'mt-1.5 rounded-xl border border-[#ede9e2] bg-[#faf8f5] px-4 py-2.5 text-[15px] text-[#1a1a2e]'
const USER_FACING_ERROR = 'ページを読み込めませんでした。時間をおいて再度お試しください。'

// 話せるようになりたい期間 (DB: speak_by_deadline_text)
const DEADLINE_OPTIONS = [
  { value: '', label: '選択してください' },
  { value: '6ヶ月', label: '6ヶ月' },
  { value: '1年', label: '1年' },
  { value: '1年6ヶ月', label: '1年6ヶ月' },
  { value: '2年', label: '2年' },
  { value: '2年6ヶ月', label: '2年6ヶ月' },
  { value: '3年', label: '3年' },
  { value: '3年以上', label: '3年以上' },
] as const

const ENGLISH_LOCALE_OPTIONS = [
  { value: '', label: '選択してください' },
  { value: 'en_us_ny', label: 'アメリカ / ニューヨーク' },
  { value: 'en_us_la', label: 'アメリカ / ロサンゼルス' },
  { value: 'en_gb_london', label: 'イギリス / ロンドン' },
  { value: 'en_au', label: 'オーストラリア' },
  { value: 'en_ca', label: 'カナダ' },
] as const

const AGE_GROUP_OPTIONS = [
  { value: '', label: '選択してください' },
  { value: 'teens', label: '10代' },
  { value: '20s', label: '20代' },
  { value: '30s', label: '30代' },
  { value: '40s', label: '40代' },
  { value: '50plus', label: '50代以上' },
] as const

const ORIGIN_COUNTRY_OPTIONS = [
  { value: '', label: '選択してください' },
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

const ENGLISH_LANGUAGE_VALUE =
  TARGET_LANGUAGE_OPTIONS.find((opt) => opt.label === '英語')?.value ??
  TARGET_LANGUAGE_OPTIONS[0]?.value ??
  'english'

const ENGLISH_LANGUAGE_LABEL =
  TARGET_LANGUAGE_OPTIONS.find((opt) => opt.value === ENGLISH_LANGUAGE_VALUE)?.label ?? '英語'

type ProfileRow = UserProfileRow & {
  username?: string | null
  age_group?: string | null
  origin_country?: string | null
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
  const [originCountry, setOriginCountry] = useState('')
  const [uiLanguageCode, setUiLanguageCode] = useState('ja')
  const [targetLocale, setTargetLocale] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [showEmailChangeForm, setShowEmailChangeForm] = useState(false)
  const [emailChangeStatus, setEmailChangeStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [emailChangeMessage, setEmailChangeMessage] = useState('')

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
            'id, current_level, speak_by_deadline_text, target_outcome_text, daily_study_minutes_goal, username, age_group, origin_country, target_language_code, target_region_slug, ui_language_code'
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
          setOriginCountry(profileRow.origin_country?.trim() ?? '')
          setTargetLocale(profileRow.target_region_slug?.trim() ?? '')
          setCurrentLevel((profileRow.current_level as CurrentLevel) ?? '')
          const deadline = profileRow.speak_by_deadline_text?.trim() ?? ''
          setSpeakByDeadlineText(DEADLINE_OPTIONS.some((o) => o.value === deadline) ? deadline : '')
          setTargetOutcomeText(profileRow.target_outcome_text?.trim() ?? '')
          if (isActive && profileRow.ui_language_code) {
            setUiLanguageCode(profileRow.ui_language_code)
          }
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
      router.refresh()
    } catch (err) {
      console.error(err)
    }
  }

  async function handleSendEmailChange() {
    const trimmedEmail = newEmail.trim()

    if (!trimmedEmail) {
      setEmailChangeStatus('error')
      setEmailChangeMessage('新しいメールアドレスを入力してください')
      return
    }

    setEmailChangeStatus('sending')
    setEmailChangeMessage('')

    try {
      const { error } = await supabase.auth.updateUser(
        { email: trimmedEmail },
        {
          emailRedirectTo: `${window.location.origin}/login`,
        }
      )

      if (error) {
        setEmailChangeStatus('error')
        setEmailChangeMessage(error.message || '確認メールの送信に失敗しました')
        return
      }

      setEmailChangeStatus('sent')
      setEmailChangeMessage('確認メールを送信しました。メール内のリンクを開くと変更が完了します。')
      setNewEmail('')
      setShowEmailChangeForm(false)
    } catch (err) {
      console.error(err)
      setEmailChangeStatus('error')
      setEmailChangeMessage('確認メールの送信に失敗しました')
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
        origin_country: originCountry.trim() || null,
        target_language_code: ENGLISH_LANGUAGE_VALUE,
        current_learning_language: ENGLISH_LANGUAGE_VALUE,
        target_region_slug: targetLocale || null,
        current_level: currentLevel || null,
        speak_by_deadline_text: deadlineTrimmed || null,
        target_outcome_text: targetOutcomeText.trim() || null,
        daily_study_minutes_goal: dailyStudyMinutesGoal,
        ui_language_code: uiLanguageCode,
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

      const { error: learningProfileError } = await supabase
        .from('user_learning_profiles')
        .upsert(
          {
            user_id: profile.id,
            language_code: ENGLISH_LANGUAGE_VALUE,
            target_region_slug: payload.target_region_slug,
            current_level: payload.current_level,
            speak_by_deadline_text: payload.speak_by_deadline_text,
            target_outcome_text: payload.target_outcome_text,
            daily_study_minutes_goal: payload.daily_study_minutes_goal,
          },
          { onConflict: 'user_id,language_code' }
        )

      if (learningProfileError) {
        setSaveStatus('error')
        setSaveMessage(learningProfileError.message || '学習プロフィールの保存に失敗しました')
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
              origin_country: payload.origin_country,
              target_language_code: payload.target_language_code,
              target_region_slug: payload.target_region_slug,
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
      <div
        className={PAGE_SHELL_CLASS}
        style={{ fontFamily: "'Nunito','Hiragino Sans',sans-serif" }}
      >
        <AppHeader onLogout={handleLogout} currentLanguage={profile?.target_language_code ?? 'en'} onChangeLanguage={() => {}} />
        <main className="flex-1 flex items-center justify-center px-6 py-12">
          <div className={`w-full max-w-md ${CARD_BASE} px-6 py-8 text-center`}>
            <p className="text-[#4a4a6a]" aria-live="polite">
              読み込み中...
            </p>
          </div>
        </main>
        <AppFooter />
      </div>
    )
  }

  if (pageError || !profile) {
    return (
      <div
        className={PAGE_SHELL_CLASS}
        style={{ fontFamily: "'Nunito','Hiragino Sans',sans-serif" }}
      >
        <AppHeader onLogout={handleLogout} currentLanguage={profile?.target_language_code ?? 'en'} onChangeLanguage={() => {}} />
        <main className="flex-1 flex items-center justify-center px-6 py-12">
          <div className={`w-full max-w-md ${CARD_BASE} px-6 py-8 text-center`}>
            <p className="text-sm text-[#4a4a6a]">{pageError || USER_FACING_ERROR}</p>
            <p className="mt-6">
              <Link href="/login" className={LINK_CLASS}>
                ログインへ戻る
              </Link>
            </p>
          </div>
        </main>
        <AppFooter />
      </div>
    )
  }

  const currentLevelLabel =
    CURRENT_LEVEL_OPTIONS.find((opt) => opt.value === currentLevel)?.label ?? '未設定'

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
      <AppHeader onLogout={handleLogout} currentLanguage={profile?.target_language_code ?? 'en'} onChangeLanguage={() => {}} />

      <main className="flex-1">
        <div className={CONTAINER_CLASS}>
          {/* Page header */}
          <section className="relative overflow-hidden rounded-[24px] border border-[#E8E4DF] bg-[linear-gradient(135deg,#FFF9EC_0%,#FFFFFF_55%,#FFFDF8_100%)] px-6 py-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)] sm:px-7 sm:py-7">
            <span className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[rgba(245,166,35,0.10)]" />
            <span className="pointer-events-none absolute bottom-[-18px] right-[72px] h-24 w-24 rounded-full bg-[rgba(245,166,35,0.07)]" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(245,166,35,0.28)] bg-[rgba(245,166,35,0.14)] px-3 py-1 text-[13px] font-bold text-[#B7791F]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#F5A623]" />
                My Settings
              </div>

              <h1 className="mt-4 text-[1.9rem] font-black leading-[1.15] text-[#1a1a2e] sm:text-[2.2rem]">
                学習設定を整えて
                <br className="hidden sm:block" />
                あなたに合った学習を始めましょう
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-[#5a5a7a]">
                学習レベル、目標、学習したい地域、学習期間を設定すると、<br className="hidden sm:block" />
                NativeFlowがあなたに合った学習ペースを自動で提案します
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-[#D9E8FF] bg-[#EEF6FF] px-3 py-1 text-xs font-bold text-[#2563EB]">
                  学習言語: {ENGLISH_LANGUAGE_LABEL}
                </span>
                <span className="rounded-full border border-[#E8E4DF] bg-white px-3 py-1 text-xs text-[#5a5a7a]">
                  レベル: <strong className="text-[#1a1a2e]">{currentLevelLabel}</strong>
                </span>
                <span className="rounded-full border border-[#E8E4DF] bg-white px-3 py-1 text-xs text-[#5a5a7a]">
                  1日の目標レッスン時間: <strong className="text-[#1a1a2e]">{dailyStudyMinutesDisplayValue != null ? `${dailyStudyMinutesDisplayValue}分` : '未設定'}</strong>
                </span>
              </div>
            </div>
          </section>

          {/* Main detail: 2 columns — Profile (left), Learning (right) */}
          <form onSubmit={handleSaveProfile} className="mt-8 space-y-6 md:space-y-8">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-stretch lg:gap-8">
              {/* Profile card */}
              <section className={`${CARD_BASE} px-6 py-6 sm:px-7 sm:py-6 flex flex-col`} aria-label="プロフィール">
                <div className="mb-5 border-b border-[#F0ECE6] pb-4">
                    <p className="text-[13px] font-bold tracking-[0.04em] text-[#7b7b94]">
                      PROFILE
                    </p>
                    <h2 className="mt-2 text-[1.35rem] font-black leading-tight text-[#1a1a2e]">
                      プロフィール
                    </h2>
                  </div>
                <div className="space-y-4 flex-1 min-h-0">
                  <div>
                    <label htmlFor="authEmail" className={LABEL_CLASS}>メールアドレス</label>
                    <p id="authEmail" className={READONLY_VALUE_CLASS} aria-readonly="true">
                      {authEmail || '—'}
                    </p>
                  </div>
                  <div>
                    <span className={LABEL_CLASS}>メールアドレスの変更</span>

                    {!showEmailChangeForm ? (
                      <div className="mt-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setShowEmailChangeForm(true)
                            setEmailChangeStatus('idle')
                            setEmailChangeMessage('')
                          }}
                          className="rounded-xl border border-[#E8E4DF] bg-[#FFF9EC] px-4 py-2.5 text-sm font-bold text-[#B7791F] transition hover:bg-[#FFF2D9] focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
                        >
                          メールアドレスを変更する
                        </button>
                      </div>
                    ) : (
                      <div className="mt-1.5 rounded-2xl border border-[#E8E4DF] bg-[#FFFCF7] px-4 py-4">
                        <label htmlFor="newEmail" className={LABEL_CLASS}>新しいメールアドレス</label>
                        <input
                          id="newEmail"
                          type="email"
                          value={newEmail}
                          onChange={(e) => {
                            setNewEmail(e.target.value)
                            if (emailChangeStatus !== 'idle') {
                              setEmailChangeStatus('idle')
                              setEmailChangeMessage('')
                            }
                          }}
                          className={INPUT_CLASS}
                          placeholder="例：new-email@example.com"
                        />
                        <p className="mt-2 text-xs leading-5 text-[#7c7c7c]">
                          確認メールを送信します。メール内のリンクを開くと変更が完了します。
                        </p>

                        <div className="mt-4 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={handleSendEmailChange}
                            disabled={emailChangeStatus === 'sending'}
                            className="rounded-xl bg-[#F5A623] px-4 py-2.5 text-sm font-black text-white shadow-[0_8px_20px_rgba(245,166,35,0.22)] transition hover:bg-[#D4881A] focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 disabled:opacity-70"
                          >
                            {emailChangeStatus === 'sending' ? '送信中...' : '確認メールを送信'}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setShowEmailChangeForm(false)
                              setNewEmail('')
                              setEmailChangeStatus('idle')
                              setEmailChangeMessage('')
                            }}
                            disabled={emailChangeStatus === 'sending'}
                            className="rounded-xl border border-[#E8E4DF] bg-white px-4 py-2.5 text-sm font-bold text-[#5a5a7a] transition hover:bg-[#faf8f5] focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 disabled:opacity-70"
                          >
                            キャンセル
                          </button>
                        </div>
                      </div>
                    )}

                    {emailChangeMessage && (
                      <p
                        className={`mt-2 text-sm ${emailChangeStatus === 'error' ? 'text-red-600' : 'text-[#5a5a7a]'}`}
                        role={emailChangeStatus === 'error' ? 'alert' : 'status'}
                      >
                        {emailChangeMessage}
                      </p>
                    )}
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
                  <div>
                    <label htmlFor="originCountry" className={LABEL_CLASS}>出身国</label>
                    <select
                      id="originCountry"
                      value={originCountry}
                      onChange={(e) => setOriginCountry(e.target.value)}
                      className={SELECT_CLASS}
                    >
                      {ORIGIN_COUNTRY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>表示言語（母国語）</label>
                    <select
                      value={uiLanguageCode}
                      onChange={(e) => setUiLanguageCode(e.target.value)}
                      className={SELECT_CLASS}
                    >
                      <option value="ja">日本語</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* Learning settings card */}
              <section className={`${CARD_BASE} px-6 py-6 sm:px-7 sm:py-6 flex flex-col`} aria-label="学習設定">
                <div className="mb-5 border-b border-[#F0ECE6] pb-4">
                    <p className="text-[13px] font-bold tracking-[0.04em] text-[#7b7b94]">
                      LEARNING SETTINGS
                    </p>
                    <h2 className="mt-2 text-[1.35rem] font-black leading-tight text-[#1a1a2e]">
                      学習設定
                    </h2>
                  </div>
                <div className="space-y-4 flex-1 min-h-0">
                  <div>
                    <span className={LABEL_CLASS}>学習する言語</span>
                    <p className={READONLY_VALUE_CLASS} aria-readonly="true">
                      {ENGLISH_LANGUAGE_LABEL}
                    </p>
                  </div>
                  <div>
                    <label htmlFor="targetLocale" className={LABEL_CLASS}>学習したい地域・ローカル表現</label>
                    <select
                      id="targetLocale"
                      value={targetLocale}
                      onChange={(e) => setTargetLocale(e.target.value)}
                      className={SELECT_CLASS}
                    >
                      {ENGLISH_LOCALE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-[#7c7c7c]">
                      会話の雰囲気、よく使われる表現、文化背景に反映されます。
                    </p>
                  </div>
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
                    <span className={LABEL_CLASS}>1日の目標レッスン時間</span>
                    <p className={READONLY_VALUE_CLASS} aria-readonly="true">
                      {dailyStudyMinutesDisplayValue != null ? `${dailyStudyMinutesDisplayValue}分` : '—'}
                    </p>
                    <p className="mt-1 text-xs text-[#7c7c7c]">
                      レッスンプランに基づいて自動計算されています。
                    </p>
                  </div>
                </div>
              </section>
            </div>

            {/* Save action area */}
            <div className="flex flex-col items-center justify-center gap-4 pt-4 pb-2">
              <button
                type="submit"
                disabled={saveStatus === 'saving'}
                className="min-w-[220px] rounded-[14px] bg-[#F5A623] px-10 py-4 text-base font-black text-white shadow-[0_10px_24px_rgba(245,166,35,0.28)] transition hover:-translate-y-px hover:bg-[#D4881A] focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 disabled:opacity-70"
              >
                {saveStatus === 'saving' ? '保存中...' : '保存する'}
              </button>
              {saveMessage && (
                <span
                  className={`text-sm font-medium ${saveStatus === 'error' ? 'text-red-600' : 'text-[#5a5a7a]'}`}
                  role={saveStatus === 'error' ? 'alert' : 'status'}
                >
                  {saveMessage}
                </span>
              )}
            </div>

          </form>
        </div>
      </main>

      <AppFooter />
    </div>
  )
}
