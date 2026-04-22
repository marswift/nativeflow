'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getSupabaseBrowserClient } from '../../lib/supabase/browser-client'
import { getTodayStatDate } from '../../lib/daily-stats-service'
import type { DailyStatRow } from '../../lib/lesson-run-types'
import type { UserProfileRow } from '../../lib/types'
import { getFlowPointsToNextRank } from '../../lib/progression-utils'
import DashboardCard from './_components/dashboard-card'
import AppHeader from '@/components/header/app-header'
import AppFooter from '@/components/footer/app-footer'
import { useCurrentLanguage } from '@/lib/use-current-language'

const supabase = getSupabaseBrowserClient()

type DashboardProfileRow = UserProfileRow & {
  current_streak_days?: number | null
  best_streak_days?: number | null
  last_streak_date?: string | null
  avatar_character_code?: string | null
  avatar_level?: number | null
  avatar_image_url?: string | null
  subscription_status?: string | null
  planned_plan_code?: string | null
  current_period_end?: string | null
  username?: string | null
  age_group?: string | null
  origin_country?: string | null
  current_learning_language?: string | null
}

type DashboardLearningProfileRow = {
  language_code: string
  target_region_slug?: string | null
  current_level: string | null
  speak_by_deadline_text: string | null
  target_outcome_text: string | null
  daily_study_minutes_goal: number | null
}

const PAGE_SHELL_CLASS = 'min-h-screen flex flex-col bg-[#faf9f6]'
const RADIUS = 'rounded-2xl'
const CARD_BORDER = 'border border-[#e8e4de]'
const CARD_SHADOW = 'shadow-[0_6px_24px_rgba(0,0,0,.06)]'
const CARD_CLASS = `${RADIUS} ${CARD_BORDER} bg-white ${CARD_SHADOW}`

const USER_FACING_ERROR = 'ページを読み込めませんでした。時間をおいて再度お試しください。'
const DAILY_STATS_ERROR = '今日の進捗を読み込めませんでした。'

type TrialDisplay = {
  showTrialCard: boolean
  isExpired: boolean
  isPaymentMissingAfterTrial: boolean
  headline: string
  subline: string
  dangerNote?: string
}

function prevDay(ymd: string): string {
  const d = new Date(ymd + 'T12:00:00')
  d.setDate(d.getDate() - 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function computeStreak(todayYmd: string, stats: { stat_date?: string | null }[]): number {
  const validDates = stats
    .map((s) => s?.stat_date)
    .filter((d): d is string => typeof d === 'string' && d.length === 10)
  const set = new Set(validDates)
  let count = 0
  let d = todayYmd
  while (set.has(d)) {
    count += 1
    d = prevDay(d)
  }
  return count
}

function formatJstDateTime(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function getDiffMs(target: string | null | undefined, now: number | Date = new Date()): number {
  if (!target) return 0
  const nowMs = typeof now === 'number' ? now : now.getTime()
  return new Date(target).getTime() - nowMs
}

function formatRemainingLabel(diffMs: number): string {
  if (diffMs <= 0) return '終了しました'
  const hourMs = 60 * 60 * 1000
  const dayMs = 24 * hourMs
  if (diffMs >= 48 * hourMs) return `あと${Math.ceil(diffMs / dayMs)}日`
  if (diffMs >= hourMs) return `あと${Math.ceil(diffMs / hourMs)}時間`
  return `あと${Math.max(1, Math.ceil(diffMs / (60 * 1000)))}分`
}

function getTrialDisplay(profile: DashboardProfileRow | null, currentTimeMs?: number | null): TrialDisplay {
  if (!profile) return { showTrialCard: false, isExpired: false, isPaymentMissingAfterTrial: false, headline: '', subline: '' }
  const subscriptionStatus = String(profile.subscription_status ?? '').toLowerCase()
  const plannedPlanCode = String(profile.planned_plan_code ?? '').toLowerCase()
  const currentPeriodEnd = profile.current_period_end ?? null
  const now = typeof currentTimeMs === 'number' ? currentTimeMs : null

  if (subscriptionStatus === 'trialing' && currentPeriodEnd) {
    const diffMs = typeof now === 'number' ? getDiffMs(currentPeriodEnd, now) : 0
    const planLabel = plannedPlanCode === 'yearly' ? '年額プラン' : '月額プラン'
    return {
      showTrialCard: true, isExpired: false, isPaymentMissingAfterTrial: false,
      headline: typeof now === 'number' ? `無料トライアル中 ${formatRemainingLabel(diffMs)}` : '無料トライアル中',
      subline: `現在は${planLabel}の無料トライアル中です。\n最初の決済日は ${formatJstDateTime(currentPeriodEnd)} です。`,
    }
  }
  if ((subscriptionStatus === 'active' || subscriptionStatus === 'past_due') && currentPeriodEnd) {
    return { showTrialCard: false, isExpired: false, isPaymentMissingAfterTrial: false, headline: '', subline: '' }
  }
  if (subscriptionStatus === 'canceled' || subscriptionStatus === 'unpaid') {
    return { showTrialCard: true, isExpired: true, isPaymentMissingAfterTrial: true, headline: 'お支払い状況をご確認ください', subline: '契約状況または継続利用の設定をお支払い・契約管理ページから確認できます。' }
  }
  return { showTrialCard: false, isExpired: false, isPaymentMissingAfterTrial: false, headline: '', subline: '' }
}

function DashboardLoadingState({ loadingMessage, onLogout, currentLanguage, onChangeLanguage }: {
  loadingMessage: string; onLogout: () => void; currentLanguage: string; onChangeLanguage: (lang: string) => void
}) {
  return (
    <div className={PAGE_SHELL_CLASS} style={{ fontFamily: "'Nunito','Hiragino Sans',sans-serif" }}>
      <AppHeader onLogout={onLogout} currentLanguage={currentLanguage} onChangeLanguage={onChangeLanguage} />
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className={`w-full max-w-md ${CARD_CLASS} px-6 py-8 text-center`}>
          <p className="text-[#4a4a6a]" aria-live="polite">{loadingMessage}</p>
        </div>
      </main>
      <AppFooter />
    </div>
  )
}

function DashboardErrorState({ message, onLogout, currentLanguage, onChangeLanguage }: {
  message: string; onLogout: () => void; currentLanguage: string; onChangeLanguage: (lang: string) => void
}) {
  return (
    <div className={PAGE_SHELL_CLASS} style={{ fontFamily: "'Nunito','Hiragino Sans',sans-serif" }}>
      <AppHeader onLogout={onLogout} currentLanguage={currentLanguage} onChangeLanguage={onChangeLanguage} />
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className={`w-full max-w-md ${CARD_CLASS} px-6 py-8 text-center`}>
          <h2 className="text-lg font-semibold text-[#1a1a2e]">エラー</h2>
          <p className="mt-3 text-sm text-[#4a4a6a]">{message}</p>
          <p className="mt-6">
            <Link href="/login" className="rounded text-sm font-medium text-amber-600 hover:text-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2">
              ログインへ戻る
            </Link>
          </p>
        </div>
      </main>
      <AppFooter />
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const { currentLanguage, handleChangeLanguage } = useCurrentLanguage()

  async function handleLogout() {
    try { await supabase.auth.signOut() } catch { /* ignore signOut failure */ }
    router.replace('/login')
    router.refresh()
  }

  const [profile, setProfile] = useState<DashboardProfileRow | null>(null)
  const [learningProfile, setLearningProfile] = useState<DashboardLearningProfileRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [todayStat, setTodayStat] = useState<DailyStatRow | null>(null)
  const [dailyStatsError, setDailyStatsError] = useState(false)
  const [pageError, setPageError] = useState('')
  const [streakDays, setStreakDays] = useState(0)
  const [urgentAnnouncement, setUrgentAnnouncement] = useState<{ id: string; title: string; published_at: string } | null>(null)
  const [nowMs, setNowMs] = useState<number | null>(null)

  useEffect(() => {
    const msUntilNextMinute = 60000 - (Date.now() % 60000)
    let intervalId: ReturnType<typeof setInterval> | null = null
    const timeoutId = setTimeout(() => {
      setNowMs(Date.now())
      intervalId = setInterval(() => setNowMs(Date.now()), 60000)
    }, msUntilNextMinute)
    return () => { clearTimeout(timeoutId); if (intervalId) clearInterval(intervalId) }
  }, [])

  useEffect(() => {
    let isActive = true

    async function loadDashboard() {
      let profileLoaded = false
      let userId = ''

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError || !session?.user) { if (isActive) { router.replace('/login'); setLoading(false) }; return }

        userId = session.user.id

        const { data: row, error: fetchError } = await supabase
          .from('user_profiles')
          .select('id, daily_study_minutes_goal, current_streak_days, best_streak_days, last_streak_date, avatar_character_code, avatar_level, avatar_image_url, planned_plan_code, subscription_status, current_period_end, total_flow_points, total_diamonds, username, current_learning_language, target_language_code')
          .eq('id', userId)
          .maybeSingle()

        if (fetchError) { if (isActive) { setPageError(USER_FACING_ERROR); setLoading(false) }; return }
        if (!row) { if (isActive) { router.replace('/onboarding'); setLoading(false) }; return }

        const typedProfile = row as DashboardProfileRow

        const { data: learningProfileRow, error: learningProfileError } = await supabase
          .from('user_learning_profiles')
          .select('language_code, target_region_slug, current_level, speak_by_deadline_text, target_outcome_text, daily_study_minutes_goal')
          .eq('user_id', userId)
          .eq('language_code', typedProfile.current_learning_language ?? 'en')
          .maybeSingle()

        if (learningProfileError) { if (isActive) { setPageError(USER_FACING_ERROR); setLoading(false) }; return }

        profileLoaded = true
        if (isActive) {
          setProfile(typedProfile)
          setLearningProfile((learningProfileRow as DashboardLearningProfileRow | null) ?? null)
        }
      } catch (_err) {
        if (isActive && !profileLoaded) setPageError(USER_FACING_ERROR)
        if (isActive) setLoading(false)
        return
      }

      if (!isActive) return

      let stat: DailyStatRow | null = null
      let recentStats: DailyStatRow[] = []

      try {
        const { data: statResult, error: statError } = await supabase
          .from('daily_stats').select().eq('user_id', userId).eq('stat_date', getTodayStatDate()).maybeSingle()
        if (statError && isActive) setDailyStatsError(true)
        stat = (statResult as DailyStatRow) ?? null

        // Supplementary: if daily_stats has 0 study_minutes (or no row), derive from lesson_runs
        if (!stat || stat.study_minutes === 0) {
          const todayStart = getTodayStatDate() + 'T00:00:00'
          const { data: runs } = await supabase
            .from('lesson_runs')
            .select('started_at, completed_at, abandoned_at, status')
            .eq('user_id', userId)
            .gte('started_at', todayStart)

          if (runs && runs.length > 0) {
            let totalMinutes = 0
            let completedCount = 0
            const MAX_ABANDONED_MINUTES = 30
            for (const run of runs) {
              const s = run.started_at ? new Date(run.started_at as string).getTime() : 0
              if (s <= 0) continue
              const isCompleted = (run.status as string) === 'completed'
              if (isCompleted && run.completed_at) {
                const e = new Date(run.completed_at as string).getTime()
                totalMinutes += Math.max(1, Math.floor((e - s) / 60000))
                completedCount++
              } else if (run.abandoned_at) {
                const e = new Date(run.abandoned_at as string).getTime()
                totalMinutes += Math.min(Math.max(1, Math.floor((e - s) / 60000)), MAX_ABANDONED_MINUTES)
                // abandoned — do NOT count as completed
              } else {
                // Still in-progress: cap to avoid inflated values
                const elapsed = Math.floor((Date.now() - s) / 60000)
                totalMinutes += Math.min(Math.max(1, elapsed), MAX_ABANDONED_MINUTES)
              }
            }
            if (totalMinutes > 0) {
              const base = stat ?? { study_minutes: 0, lesson_runs_completed: 0 } as DailyStatRow
              stat = { ...base, study_minutes: totalMinutes, lesson_runs_completed: Math.max(base.lesson_runs_completed ?? 0, completedCount) }
            }
          }
        }
      } catch { if (isActive) setDailyStatsError(true) }

      try {
        const { data: historyResult } = await supabase
          .from('daily_stats').select('stat_date').eq('user_id', userId).order('stat_date', { ascending: false }).limit(400)
        recentStats = (historyResult as DailyStatRow[]) ?? []
      } catch { recentStats = [] }

      // Fetch latest urgent announcement (non-blocking)
      try {
        const now = new Date().toISOString()
        const { data: urgentRow } = await supabase
          .from('announcements')
          .select('id, title, published_at')
          .eq('is_published', true)
          .eq('type', 'urgent')
          .or(`urgent_until.is.null,urgent_until.gt.${now}`)
          .order('published_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (isActive) {
          setUrgentAnnouncement((urgentRow as { id: string; title: string; published_at: string } | null) ?? null)
        }
      } catch { /* non-blocking */ }

      if (isActive) {
        setTodayStat(stat)
        setStreakDays(computeStreak(getTodayStatDate(), recentStats))
        setLoading(false)
      }
    }

    loadDashboard()
    return () => { isActive = false }
  }, [])

  if (loading) return <DashboardLoadingState loadingMessage="読み込み中です..." onLogout={handleLogout} currentLanguage={currentLanguage} onChangeLanguage={handleChangeLanguage} />
  if (!profile || pageError) return <DashboardErrorState message="データの読み込みに失敗しました" onLogout={handleLogout} currentLanguage={currentLanguage} onChangeLanguage={handleChangeLanguage} />

  // Defensive cap: single day cannot exceed 480 minutes (8 hours)
  const MAX_DAILY_MINUTES = 480
  const studyMinutesActual = Math.min(todayStat?.study_minutes ?? 0, MAX_DAILY_MINUTES)
  const todayLessonRunsCompleted = todayStat?.lesson_runs_completed ?? 0
  const studyGoal = learningProfile?.daily_study_minutes_goal ?? profile?.daily_study_minutes_goal ?? 0
  const displayStreak = (profile.current_streak_days != null && profile.current_streak_days > 0) ? profile.current_streak_days : streakDays
  const displayedTotalFlowPoints = profile.total_flow_points ?? 0
  const pointsToNextRank = getFlowPointsToNextRank(displayedTotalFlowPoints)
  const trialDisplay = getTrialDisplay(profile, nowMs)

  return (
    <div className={PAGE_SHELL_CLASS} style={{ fontFamily: "'Nunito','Hiragino Sans',sans-serif" }}>
      <AppHeader onLogout={handleLogout} currentLanguage={currentLanguage} onChangeLanguage={handleChangeLanguage} />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-6 pt-8 pb-10 sm:px-8 sm:pt-10 lg:px-10">
          <section className="relative overflow-hidden rounded-[24px] border border-[#E8E4DF] bg-[linear-gradient(135deg,#FFF9EC_0%,#FFFFFF_55%,#FFFDF8_100%)] px-6 py-8 shadow-[0_16px_40px_rgba(15,23,42,0.06)] sm:px-7 sm:py-10">
            <span className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[rgba(245,166,35,0.10)]" />
            <span className="pointer-events-none absolute bottom-[-18px] right-[72px] h-24 w-24 rounded-full bg-[rgba(245,166,35,0.07)]" />
            <div className="relative z-10">
              <div className="flex items-center justify-between gap-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(245,166,35,0.28)] bg-[rgba(245,166,35,0.14)] px-3 py-1 text-[13px] font-bold text-[#B7791F]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#F5A623]" />
                  My Page
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-[#E8E4DF] bg-white/80 px-3 py-1 text-sm text-[#5a5a7a]">
                    <span aria-hidden="true">💎</span>
                    <span className="font-bold text-[#1a1a2e]">{profile.total_diamonds ?? 0}</span>
                  </div>
                  <p className="text-[10px] text-[#9ca3af]">学習で集まるごほうびポイント</p>
                </div>
              </div>

              <h1 className="mt-4 text-lg font-black tracking-tight text-[#1a1a2e] sm:text-xl">
                アカウントと学習設定を整えましょう
              </h1>
              <p className="mt-1.5 text-sm leading-relaxed text-[#5a5a7a]">
                学習言語、地域、プラン、アカウント情報を確認・変更できます。<br />
                あなたに合った学習環境をここで整えましょう。
              </p>

              {learningProfile?.target_region_slug && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#E8E4DF] bg-white/60 px-3 py-1.5">
                  <span className="text-xs font-semibold text-[#5a5a7a]">🌏 {learningProfile.target_region_slug.replace(/_/g, ' ')}</span>
                  <span className="text-[10px] text-[#9ca3af]">地域表現・生活会話を反映中</span>
                </div>
              )}

              {/* ── Urgent announcement ── */}
              {urgentAnnouncement && (
                <div className="mt-4">
                  <Link
                    href={`/announcements/${urgentAnnouncement.id}`}
                    className="flex items-center gap-2 rounded-[16px] border border-red-200 bg-red-50 pl-5 pr-4 py-3 shadow-[0_2px_8px_rgba(15,23,42,0.03)] transition hover:bg-red-100 cursor-pointer"
                  >
                    <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">緊急</span>
                    <div className="flex min-w-0 flex-1 items-baseline gap-2">
                      <span className="shrink-0 text-[11px] text-red-400">{new Date(urgentAnnouncement.published_at).toLocaleDateString('ja-JP')}</span>
                      <p className="min-w-0 truncate text-sm font-bold text-red-900">{urgentAnnouncement.title}</p>
                    </div>
                    <span className="shrink-0 text-xs text-red-400">{'>'}</span>
                  </Link>
                </div>
              )}
            </div>
          </section>

          {trialDisplay.showTrialCard && (
            <section className="mx-auto mt-6 max-w-md" aria-label="無料トライアル">
              <div className={trialDisplay.isExpired && trialDisplay.isPaymentMissingAfterTrial ? `w-full ${RADIUS} bg-gradient-to-br from-white via-red-50/70 to-amber-50/80 px-4 py-3 ${CARD_SHADOW} border border-red-200/60 shadow-sm` : `w-full ${RADIUS} bg-gradient-to-br from-amber-100 via-amber-50 to-amber-100/80 px-4 py-3 ${CARD_SHADOW} border border-amber-200/60`}>
                <div className="flex flex-col items-center text-center">
                  <p className={trialDisplay.isExpired && trialDisplay.isPaymentMissingAfterTrial ? 'text-center text-[15px] font-bold text-red-800 tracking-tight leading-snug' : 'text-center text-[15px] font-bold text-amber-900 tracking-tight leading-snug'}>{trialDisplay.headline}</p>
                  {trialDisplay.subline && <p className={(trialDisplay.isExpired && trialDisplay.isPaymentMissingAfterTrial ? 'mt-1.5 text-xs text-amber-800/90 leading-normal' : 'mt-1.5 text-xs text-amber-700/90 leading-normal') + ' whitespace-pre-line text-center'}>{trialDisplay.subline}</p>}
                  {trialDisplay.dangerNote && <p className="mt-2 text-[11px] font-medium text-red-600 leading-snug">{trialDisplay.dangerNote}</p>}
                </div>
              </div>
            </section>
          )}

          <section className="mt-8 flex justify-center">
            <div className="grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <DashboardCard title="Lesson" description="学習を始める" href="/lesson" icon="📖" isCompleted={(todayStat?.study_minutes ?? 0) >= 5} />
              <DashboardCard title="My Settings" description="ユーザー登録と学習設定を確認" href="/settings" icon="👤" />
              <DashboardCard title="Billing" description="お支払い・契約内容を確認" href="/settings/billing" icon="💳" />
              <DashboardCard title="News" description="NativeFlowの最新情報" href="/announcements" icon="📢" />
            </div>
          </section>

          <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className={`${CARD_CLASS} px-5 py-5`}>
              <p className="text-sm font-bold tracking-[0.04em] text-[#1a1a2e]">継続日数</p>
              <p className="mt-3 text-center text-3xl font-extrabold tracking-tight text-[#1a1a2e]">{displayStreak}日</p>
              <p className="mt-2 text-center text-sm text-[#6b7280]">毎日の積み重ねが大切です。</p>
            </div>
            <div className={`${CARD_CLASS} px-5 py-5`}>
              <p className="text-sm font-bold tracking-[0.04em] text-[#1a1a2e]">Flowポイント</p>
              <p className="mt-0.5 text-[10px] text-[#9ca3af]">学習の成長ポイント（ランクに反映）</p>
              <p className="mt-2 text-center text-3xl font-extrabold tracking-tight text-[#1a1a2e]">{displayedTotalFlowPoints}</p>
              <p className="mt-2 text-center text-sm text-[#6b7280]">次のランクまであと {pointsToNextRank} pt</p>
            </div>
            <div className={`${CARD_CLASS} px-5 py-5`}>
              <p className="text-sm font-bold tracking-[0.04em] text-[#1a1a2e]">今日のレッスン時間</p>
              <p className="mt-3 text-center text-3xl font-extrabold tracking-tight text-[#1a1a2e]">{studyMinutesActual}<span className="ml-1 text-base font-medium text-[#8a8a9a]">分</span></p>
              <p className="mt-2 text-center text-sm text-[#6b7280]">目標レッスン時間 {studyGoal} 分</p>
              {dailyStatsError && <p className="mt-2 text-center text-sm text-amber-700">{DAILY_STATS_ERROR}</p>}
            </div>
            <div className={`${CARD_CLASS} px-5 py-5`}>
              <p className="text-sm font-bold tracking-[0.04em] text-[#1a1a2e]">今日完了したレッスン</p>
              <p className="mt-3 text-center text-3xl font-extrabold tracking-tight text-[#1a1a2e]">{todayLessonRunsCompleted}<span className="ml-1 text-base font-medium text-[#8a8a9a]">回</span></p>
              <p className="mt-2 text-center text-sm text-[#6b7280]">完了するたびに記録されます。</p>
            </div>
          </section>


        </div>
      </main>
      <AppFooter />
    </div>
  )
}