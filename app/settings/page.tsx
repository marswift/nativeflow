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
  getRegionsForLanguage,
} from '../../lib/constants'
import { getSupabaseBrowserClient } from '../../lib/supabase/browser-client'
import { useCurrentLanguage } from '@/lib/use-current-language'
import { isDailyLanguageLocked, getDailyLockedLanguage } from '../../lib/daily-language-lock'

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

type ProfileRow = UserProfileRow & {
  username?: string | null
  age_group?: string | null
  origin_country?: string | null
  current_learning_language?: string | null
}

export default function SettingsPage() {
  const router = useRouter()
  const { currentLanguage, handleChangeLanguage } = useCurrentLanguage()  // ← 追加
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
  const [newEmail, setNewEmail] = useState('')
  const [showEmailChangeForm, setShowEmailChangeForm] = useState(false)
  const [emailChangeStatus, setEmailChangeStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [emailChangeMessage, setEmailChangeMessage] = useState('')

  const [selectedLangCodes, setSelectedLangCodes] = useState<string[]>([])
  const [langSaveStatus, setLangSaveStatus] = useState<'idle' | 'saving'>('idle')
  const [langModalOpen, setLangModalOpen] = useState(false)
  const [langModalDraft, setLangModalDraft] = useState<string[]>([])

  // Per-language learning profiles
  type LangProfile = {
    level: CurrentLevel | ''
    region: string
    goal: string
    deadline: string
  }
  const [langProfiles, setLangProfiles] = useState<Record<string, LangProfile>>({})

  function updateLangProfile(code: string, field: keyof LangProfile, value: string) {
    setLangProfiles((prev) => ({
      ...prev,
      [code]: { ...(prev[code] ?? { level: '', region: '', goal: '', deadline: '' }), [field]: value },
    }))
  }

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
            'id, current_level, speak_by_deadline_text, target_outcome_text, daily_study_minutes_goal, username, age_group, origin_country, target_language_code, current_learning_language, target_region_slug, ui_language_code'
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

        const currentLearningLanguage =
          (profileRow as ProfileRow & { current_learning_language?: string | null }).current_learning_language ??
          profileRow.target_language_code ??
          ENGLISH_LANGUAGE_VALUE

        const { data: learningRow, error: learningFetchError } = await supabase
          .from('user_learning_profiles')
          .select(
            'language_code, current_level, speak_by_deadline_text, target_outcome_text, daily_study_minutes_goal, target_region_slug'
          )
          .eq('user_id', session.user.id)
          .eq('language_code', currentLearningLanguage)
          .maybeSingle()

        if (learningFetchError) {
          console.error('My Page learning profile fetch error', learningFetchError)
          if (isActive) setPageError(USER_FACING_ERROR)
          return
        }

        const mergedProfile = learningRow
          ? ({
              ...profileRow,
              target_language_code: learningRow.language_code ?? profileRow.target_language_code,
              target_region_slug: learningRow.target_region_slug ?? profileRow.target_region_slug,
              current_level: learningRow.current_level ?? profileRow.current_level,
              speak_by_deadline_text: learningRow.speak_by_deadline_text ?? profileRow.speak_by_deadline_text,
              target_outcome_text: learningRow.target_outcome_text ?? profileRow.target_outcome_text,
              daily_study_minutes_goal: learningRow.daily_study_minutes_goal ?? profileRow.daily_study_minutes_goal,
            } as ProfileRow)
          : profileRow

        // Fetch all selected learning languages with full profiles
        try {
          const { data: allLangs } = await supabase
            .from('user_learning_profiles')
            .select('language_code, current_level, target_region_slug, target_outcome_text, speak_by_deadline_text')
            .eq('user_id', session.user.id)
            .limit(2)
          if (isActive && allLangs) {
            const codes = allLangs.map((r: { language_code: string }) => r.language_code)
            setSelectedLangCodes(codes)
            const profiles: Record<string, LangProfile> = {}
            for (const r of allLangs as Array<{
              language_code: string
              current_level: string | null
              target_region_slug: string | null
              target_outcome_text: string | null
              speak_by_deadline_text: string | null
            }>) {
              profiles[r.language_code] = {
                level: (r.current_level as CurrentLevel) ?? '',
                region: r.target_region_slug ?? '',
                goal: r.target_outcome_text ?? '',
                deadline: r.speak_by_deadline_text ?? '',
              }
            }
            setLangProfiles(profiles)
          }
        } catch { /* non-blocking */ }

        if (isActive) {
          setProfile(mergedProfile)
          const rawUsername = mergedProfile.username != null ? String(mergedProfile.username).trim() : ''
          setUsername(rawUsername === sessionEmail ? '' : rawUsername)
          setAgeGroup(mergedProfile.age_group ?? '')
          setOriginCountry(mergedProfile.origin_country?.trim() ?? '')
          if (isActive && mergedProfile.ui_language_code) {
            setUiLanguageCode(mergedProfile.ui_language_code)
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
      // Save only non-language profile fields (username, age, country, UI language)
      // Per-language settings are saved via per-language save buttons
      const payload = {
        username: username.trim() || null,
        age_group: ageGroup || null,
        origin_country: originCountry.trim() || null,
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

      // Sync UI language to localStorage and cookie
      try {
        const { writeUiLanguageToStorage } = await import('@/lib/auth-copy')
        writeUiLanguageToStorage(uiLanguageCode)
        document.cookie = `NEXT_LOCALE=${uiLanguageCode};path=/;max-age=31536000;SameSite=Lax`
      } catch { /* non-blocking */ }

      // Save all per-language profiles
      for (const langCode of selectedLangCodes) {
        const lp = langProfiles[langCode]
        if (!lp) continue
        try {
          const langEnabledRegions = getRegionsForLanguage(langCode).filter((r) => r.enabled)
          const regionSlug = lp.region || (langEnabledRegions.length === 1 ? langEnabledRegions[0].code : null)
          const dailyMin = lp.level && lp.deadline
            ? computeStudyPlan({ deadlineText: lp.deadline, currentLevel: lp.level as CurrentLevel }).recommendedDailyMinutes
            : null

          const { error: lpError } = await supabase
            .from('user_learning_profiles')
            .upsert({
              user_id: profile.id,
              language_code: langCode,
              current_level: lp.level || null,
              target_region_slug: regionSlug,
              target_outcome_text: lp.goal.trim() || null,
              speak_by_deadline_text: lp.deadline || null,
              daily_study_minutes_goal: dailyMin,
            }, { onConflict: 'user_id,language_code' })

          if (lpError) console.error(`Language profile save error (${langCode}):`, lpError)
        } catch (err) {
          console.error(`Language profile save exception (${langCode}):`, err)
        }
      }

      setSaveStatus('saved')
      setSaveMessage('設定を保存しました')
      setProfile((prev) =>
        prev
          ? ({
              ...prev,
              username: payload.username,
              age_group: payload.age_group,
              origin_country: payload.origin_country,
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
        <AppHeader onLogout={handleLogout} currentLanguage={currentLanguage} onChangeLanguage={handleChangeLanguage} />
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
        <AppHeader onLogout={handleLogout} currentLanguage={currentLanguage} onChangeLanguage={handleChangeLanguage} />
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

  return (
    <div
      className={PAGE_SHELL_CLASS}
      style={{ fontFamily: "'Nunito','Hiragino Sans',sans-serif" }}
    >
      <AppHeader onLogout={handleLogout} currentLanguage={currentLanguage} onChangeLanguage={handleChangeLanguage} />

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

            </div>
          </section>

          {/* Main detail: 2 columns — Profile (left), Learning (right) */}
          <form onSubmit={handleSaveProfile} className="mt-8 space-y-6 md:space-y-8">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-start lg:gap-8">
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
                          name="new_email"
                          type="email"
                          autoComplete="email"
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
                      name="username"
                      type="text"
                      autoComplete="username"
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
                    <label htmlFor="settings-ui-language" className={LABEL_CLASS}>表示言語（母国語）</label>
                    <select
                      id="settings-ui-language"
                      name="ui_language_code"
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
                    <p className="mt-1 text-xs text-[#7c7c7c]">学習したい言語を最大2つまで選べます</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {selectedLangCodes.length === 0 && (
                        <span className="text-sm text-[#7b7b94]">まだ選択されていません</span>
                      )}
                      {selectedLangCodes.map((code) => {
                        const langLabel = TARGET_LANGUAGE_OPTIONS.find((o) => o.value === code)?.label ?? code
                        return (
                          <span key={code} className="inline-flex items-center gap-1.5 rounded-xl border-2 border-blue-400 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
                            {langLabel} ✓
                          </span>
                        )
                      })}
                      <button
                        type="button"
                        onClick={() => { setLangModalDraft([...selectedLangCodes]); setLangModalOpen(true) }}
                        className="rounded-xl border border-[#E8E4DF] bg-[#FFF9EC] px-4 py-2 text-sm font-bold text-[#B7791F] transition hover:bg-[#FFF2D9] focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
                      >
                        変更する
                      </button>
                    </div>
                  </div>
                  {/* Per-language settings blocks */}
                  {selectedLangCodes.map((langCode) => {
                    const lp = langProfiles[langCode] ?? { level: '', region: '', goal: '', deadline: '' }
                    const langLabel = TARGET_LANGUAGE_OPTIONS.find((o) => o.value === langCode)?.label ?? langCode
                    const langRegions = getRegionsForLanguage(langCode)
                    const enabledRegions = langRegions.filter((r) => r.enabled)
                    return (
                      <div key={langCode} className="rounded-xl border border-[#E8E4DF] bg-[#faf8f5] p-4 space-y-3">
                        <h3 className="text-sm font-bold text-[#1a1a2e]">📚 {langLabel} の設定</h3>

                        {/* Region — dynamic from REGION_MASTER */}
                        {enabledRegions.length > 1 && (
                          <div>
                            <label htmlFor={`settings-region-${langCode}`} className={LABEL_CLASS}>地域・ローカル表現</label>
                            <select
                              id={`settings-region-${langCode}`}
                              name={`region_${langCode}`}
                              value={lp.region}
                              onChange={(e) => updateLangProfile(langCode, 'region', e.target.value)}
                              className={SELECT_CLASS}
                            >
                              <option value="">選択してください</option>
                              {enabledRegions.map((r) => (
                                <option key={r.code} value={r.code}>{r.displayLabel}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        {enabledRegions.length === 1 && (
                          <div>
                            <span className={LABEL_CLASS}>地域</span>
                            <p className={READONLY_VALUE_CLASS}>{enabledRegions[0].displayLabel}</p>
                          </div>
                        )}
                        {enabledRegions.length === 0 && langRegions.length > 0 && (
                          <div>
                            <span className={LABEL_CLASS}>地域</span>
                            <p className={READONLY_VALUE_CLASS + ' text-[#8b8ba3]'}>準備中</p>
                          </div>
                        )}
                        <div className="space-y-0.5">
                          <p className="text-xs leading-relaxed text-[#5a5a7a]">地域ごとの自然な言い回しや会話スタイルを学べます</p>
                          <p className="text-[11px] leading-relaxed text-[#8b8ba3]">※アクセントやイントネーションは参考レベルです</p>
                        </div>

                        {/* Level */}
                        <div>
                          <label htmlFor={`settings-level-${langCode}`} className={LABEL_CLASS}>現在のレベル</label>
                          <select
                            id={`settings-level-${langCode}`}
                            name={`level_${langCode}`}
                            value={lp.level}
                            onChange={(e) => updateLangProfile(langCode, 'level', e.target.value)}
                            className={SELECT_CLASS}
                          >
                            <option value="">選択してください</option>
                            {CURRENT_LEVEL_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>

                        {/* Goal */}
                        <div>
                          <label htmlFor={`settings-goal-${langCode}`} className={LABEL_CLASS}>学習目標</label>
                          <input
                            id={`settings-goal-${langCode}`}
                            name={`goal_${langCode}`}
                            type="text"
                            value={lp.goal}
                            onChange={(e) => updateLangProfile(langCode, 'goal', e.target.value)}
                            className={INPUT_CLASS}
                            placeholder={langCode === 'ko' ? '例：韓国ドラマを字幕なしで見たい' : '例：仕事で英語を使えるようになりたい'}
                          />
                        </div>

                        {/* Deadline */}
                        <div>
                          <label htmlFor={`settings-deadline-${langCode}`} className={LABEL_CLASS}>話せるようになりたい期間</label>
                          <select
                            id={`settings-deadline-${langCode}`}
                            name={`deadline_${langCode}`}
                            value={lp.deadline}
                            onChange={(e) => updateLangProfile(langCode, 'deadline', e.target.value)}
                            className={SELECT_CLASS}
                          >
                            {DEADLINE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>

                      </div>
                    )
                  })}

                </div>
              </section>
            </div>

            {/* Language selection modal */}
            {langModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setLangModalOpen(false)}>
                <div
                  className="mx-4 flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl border border-[#E8E4DF] bg-white shadow-[0_16px_40px_rgba(15,23,42,0.12)]"
                  onClick={(e) => e.stopPropagation()}
                  role="dialog"
                  aria-modal="true"
                  aria-label="学習する言語を選択"
                >
                  {/* Modal header */}
                  <div className="shrink-0 border-b border-[#F0ECE6] px-6 py-5">
                    <h3 className="text-lg font-black text-[#1a1a2e]">学習する言語を選択</h3>
                    <p className="mt-1 text-xs text-[#7c7c7c]">最大2つまで選択できます</p>
                  </div>
                  {/* Modal body — scrollable */}
                  <div className="flex-1 overflow-y-auto px-6 py-4">
                    <div className="space-y-2">
                      {TARGET_LANGUAGE_OPTIONS.map((opt) => {
                        const isAvailable = opt.hasConversationContent
                        const isDraftSelected = langModalDraft.includes(opt.value)
                        const lockedLang = getDailyLockedLanguage()
                        const isLocked = lockedLang === opt.value && isDailyLanguageLocked()
                        const atMax = langModalDraft.length >= 2 && !isDraftSelected
                        const disabled = !isAvailable || (isLocked && isDraftSelected) || atMax

                        return (
                          <button
                            key={opt.value}
                            type="button"
                            disabled={disabled}
                            onClick={() => {
                              if (disabled || !isAvailable) return
                              setLangModalDraft((prev) =>
                                isDraftSelected ? prev.filter((c) => c !== opt.value) : [...prev, opt.value]
                              )
                            }}
                            className={`flex w-full items-center justify-between rounded-xl border-2 px-4 py-3 text-sm font-bold transition ${
                              !isAvailable
                                ? 'border-dashed border-[#E8E4DF] bg-[#faf8f5] text-[#b0b0b0] cursor-default'
                                : isDraftSelected
                                  ? 'border-blue-400 bg-blue-50 text-blue-700'
                                  : disabled
                                    ? 'border-[#E8E4DF] bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'border-[#E8E4DF] bg-white text-[#1a1a2e] hover:bg-[#FAF8F5]'
                            }`}
                          >
                            <span>
                              {opt.label}
                              {isAvailable && isDraftSelected && isLocked && ' 🔒'}
                            </span>
                            <span>
                              {isAvailable && isDraftSelected && !isLocked && (
                                <span className="text-blue-500">✓</span>
                              )}
                              {isAvailable && !isDraftSelected && (
                                <span className="text-[11px] font-medium text-emerald-600">利用可能</span>
                              )}
                              {!isAvailable && (
                                <span className="text-[11px] font-medium text-[#b0b0b0]">準備中</span>
                              )}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                    {langModalDraft.length >= 2 && TARGET_LANGUAGE_OPTIONS.some((o) => o.hasConversationContent && !langModalDraft.includes(o.value)) && (
                      <p className="mt-3 text-xs text-amber-600">他の言語を選ぶには、いずれか1つの選択を外してください</p>
                    )}
                    {getDailyLockedLanguage() && isDailyLanguageLocked() && (
                      <p className="mt-2 text-xs text-[#7c7c7c]">🔒 今日の学習中の言語は完了まで外せません</p>
                    )}
                  </div>
                  {/* Modal footer */}
                  <div className="shrink-0 flex items-center justify-end gap-3 border-t border-[#F0ECE6] px-6 py-4">
                    <button
                      type="button"
                      onClick={() => setLangModalOpen(false)}
                      className="rounded-xl border border-[#E8E4DF] bg-white px-5 py-2.5 text-sm font-bold text-[#5a5a7a] transition hover:bg-[#FAF8F5]"
                    >
                      閉じる
                    </button>
                    <button
                      type="button"
                      disabled={langSaveStatus === 'saving'}
                      onClick={async () => {
                        const userId = profile?.id
                        if (!userId) return
                        try {
                          setLangSaveStatus('saving')
                          // Remove deselected languages
                          const removed = selectedLangCodes.filter((c) => !langModalDraft.includes(c))
                          for (const code of removed) {
                            await supabase.from('user_learning_profiles').delete().eq('user_id', userId).eq('language_code', code)
                          }
                          // Add newly selected languages
                          const added = langModalDraft.filter((c) => !selectedLangCodes.includes(c))
                          for (const code of added) {
                            const addedRegions = getRegionsForLanguage(code).filter((r) => r.enabled)
                            const defaultRegion = addedRegions.length === 1 ? addedRegions[0].code : undefined
                            await supabase.from('user_learning_profiles').upsert({
                              user_id: userId,
                              language_code: code,
                              current_level: 'beginner',
                              ...(defaultRegion ? { target_region_slug: defaultRegion } : {}),
                            }, { onConflict: 'user_id,language_code' })
                          }
                          setSelectedLangCodes([...langModalDraft])
                          setLangModalOpen(false)
                        } catch (err) {
                          console.error('Language save error:', err)
                        } finally {
                          setLangSaveStatus('idle')
                        }
                      }}
                      className="rounded-xl bg-[#F5A623] px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_12px_rgba(245,166,35,0.25)] transition hover:bg-[#D4881A] disabled:opacity-70"
                    >
                      {langSaveStatus === 'saving' ? '保存中...' : '保存する'}
                    </button>
                  </div>
                </div>
              </div>
            )}

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
