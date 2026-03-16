'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { DASHBOARD_COPY_JA } from '../../lib/dashboard-copy'
import { getDailyStatByUserAndDate } from '../../lib/daily-stats-repository'
import { getTodayStatDate } from '../../lib/daily-stats-service'
import { getDailyStatsByUser } from '../../lib/history-repository'
import type { DailyStatRow } from '../../lib/lesson-run-types'
import type { UserProfileRow } from '../../lib/types'
import { calculateFlowPoints, getRankFromFlowPoints, getPointsToNextRank } from '../../lib/flow-points'

type DashboardProfileRow = UserProfileRow & {
  current_streak_days?: number | null
  best_streak_days?: number | null
  last_streak_date?: string | null
  avatar_character_code?: string | null
  avatar_level?: number | null
  avatar_image_url?: string | null
  avatar_badge_image_url?: string | null
  trial_start_at?: string | null
  trial_ends_at?: string | null
  subscription_status?: string | null
  lesson_data_delete_at?: string | null
  payment_method_brand?: string | null
  payment_method_last4?: string | null
  total_flow_points?: number | null
  created_at?: string | null
}

const PAGE_SHELL_CLASS = 'min-h-screen flex flex-col bg-[#faf9f6]'
const CONTAINER_CLASS = 'mx-auto w-full max-w-md px-6 pt-6 pb-8 sm:pt-8 sm:pb-10 md:max-w-xl md:px-8 md:pt-8 md:pb-10 lg:max-w-2xl'
const RADIUS = 'rounded-2xl'
const CARD_BORDER = 'border border-[#e8e4de]'
const CARD_SHADOW = 'shadow-[0_6px_24px_rgba(0,0,0,.06)]'
const CARD_CLASS = `${RADIUS} ${CARD_BORDER} bg-white ${CARD_SHADOW}`
const SECTION_GAP = 'mt-6'
const CTA_CLASS = 'rounded-xl bg-amber-500 py-3.5 font-semibold text-white text-center shadow-[0_4px_14px_rgba(251,191,36,.35)] hover:bg-amber-600 hover:shadow-[0_6px_20px_rgba(251,191,36,.4)] focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 transition-shadow duration-200'

const USER_FACING_ERROR = 'ページを読み込めませんでした。時間をおいて再度お試しください。'
const DAILY_STATS_ERROR = '今日の進捗を読み込めませんでした。'

type TrialDisplay = {
  showTrialCard: boolean
  isExpired: boolean
  isPaymentMissingAfterTrial: boolean
  headline: string
  subline: string
  ctaLabel: string
  ctaHref: string
  dangerNote?: string
}

/** 日付文字列 YYYY-MM-DD の前日を返す */
function prevDay(ymd: string): string {
  const d = new Date(ymd + 'T12:00:00')
  d.setDate(d.getDate() - 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * 今日を含め、連続して記録がある日数を返す。
 * streak = 今日から過去に遡り、daily_stats にレコードがある連続日数。
 */
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

/** ランクコード（flow points から算出）→ 表示用ラベル。画像バッジ差し替え時もこの code をキーにできる。 */
const RANK_LABELS: Record<string, string> = {
  starter: 'starter',
  bronze: 'bronze',
  silver: 'silver',
  gold: 'gold',
  diamond: 'diamond',
}

function getRankLabel(rankCode: string | null | undefined): string {
  if (!rankCode) return 'starter'
  return RANK_LABELS[rankCode.toLowerCase()] ?? rankCode.toLowerCase()
}

/** ランク表示用の code（画像 URL のキー等に利用）。starter は内部用のまま。 */
function getRankCodeForDisplay(rankCode: string | null | undefined): string {
  const c = (rankCode ?? '').toLowerCase()
  return c && RANK_LABELS[c] ? c : 'starter'
}

/** メンバーシップカードのランク別テーマ。 */
function getRankCardTheme(rankCode: string | null | undefined): {
  container: string
  border: string
  mutedText: string
  valueText: string
  badgeBg: string
  badgeBorder: string
} {
  const code = (rankCode ?? '').toLowerCase()

  switch (code) {
    case 'bronze':
      return {
        container: 'bg-gradient-to-br from-[#c47a3a] via-[#b86a2d] to-[#8f4f1f]',
        border: 'border-[#d9a06a]/60',
        mutedText: 'text-[#f7e7d5]/78',
        valueText: 'text-white',
        badgeBg: 'bg-white/92',
        badgeBorder: 'border-[#e7bc95]',
      }
    case 'silver':
      return {
        container: 'bg-gradient-to-br from-[#cfd5dd] via-[#bcc4ce] to-[#98a4b3]',
        border: 'border-[#dbe2ea]/70',
        mutedText: 'text-[#eef2f6]/82',
        valueText: 'text-[#111827]',
        badgeBg: 'bg-white/95',
        badgeBorder: 'border-[#d9e0e8]',
      }
    case 'gold':
      return {
        container: 'bg-gradient-to-br from-[#f6d365] via-[#f2c94c] to-[#d4a017]',
        border: 'border-[#f5de8a]/70',
        mutedText: 'text-[#7a5600]',
        valueText: 'text-[#241700]',
        badgeBg: 'bg-white/95',
        badgeBorder: 'border-[#f3dea2]',
      }
    case 'diamond':
      return {
        container: 'bg-gradient-to-br from-[#7dd3fc] via-[#60a5fa] to-[#2563eb]',
        border: 'border-[#93c5fd]/70',
        mutedText: 'text-[#e8f4ff]/85',
        valueText: 'text-white',
        badgeBg: 'bg-white/95',
        badgeBorder: 'border-[#bfdbfe]',
      }
    default:
      return {
        container: 'bg-gradient-to-br from-[#f3f4f6] via-[#e5e7eb] to-[#d1d5db]',
        border: 'border-[#e5e7eb]',
        mutedText: 'text-[#6b7280]',
        valueText: 'text-[#111827]',
        badgeBg: 'bg-white/95',
        badgeBorder: 'border-[#e5e7eb]',
      }
  }
}

/** speak_by_deadline_text → おおよその日数。フォールバックは 365。 */
function getDeadlineDaysFromText(text: string | null | undefined): number {
  const t = (text ?? '').trim()
  if (t === '6ヶ月') return 180
  if (t === '1年') return 365
  if (t === '1年6ヶ月') return 545
  if (t === '2年') return 730
  if (t === '2年6ヶ月') return 912
  if (t === '3年') return 1095
  return 365
}

/** 目標タイムライン用: 進捗%と残り日数。開始日は startAt または「今日 - 90日」フォールバック、終了は開始 + 目標期間。 */
function getGoalTimeline(
  todayYmd: string,
  deadlineText: string | null | undefined,
  startAt?: string | null
): { progressPercent: number; remainingDays: number } {
  const totalDays = getDeadlineDaysFromText(deadlineText)
  const today = new Date(todayYmd + 'T12:00:00')
  const dayMs = 24 * 60 * 60 * 1000

  let start: Date
  if (startAt) {
    const parsed = new Date(startAt)
    if (Number.isFinite(parsed.getTime())) {
      start = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12, 0, 0)
    } else {
      start = new Date(today)
      start.setDate(start.getDate() - 90)
    }
  } else {
    start = new Date(today)
    start.setDate(start.getDate() - 90)
  }

  const end = new Date(start)
  end.setDate(end.getDate() + totalDays)
  const elapsed = Math.max(0, (today.getTime() - start.getTime()) / dayMs)
  const total = (end.getTime() - start.getTime()) / dayMs
  const progressPercent = total > 0 ? Math.min(100, Math.max(0, Math.round((elapsed / total) * 100))) : 0
  const remainingDays = Math.max(0, Math.ceil((end.getTime() - today.getTime()) / dayMs))
  return { progressPercent, remainingDays }
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

  if (diffMs >= 48 * hourMs) {
    return `あと${Math.ceil(diffMs / dayMs)}日`
  }

  if (diffMs >= hourMs) {
    return `あと${Math.ceil(diffMs / hourMs)}時間`
  }

  const minutes = Math.max(1, Math.ceil(diffMs / (60 * 1000)))
  return `あと${minutes}分`
}

function getTrialDisplay(profile: DashboardProfileRow | null, currentTimeMs?: number): TrialDisplay {
  if (!profile) {
    return {
      showTrialCard: false,
      isExpired: false,
      isPaymentMissingAfterTrial: false,
      headline: '',
      subline: '',
      ctaLabel: '',
      ctaHref: '/settings',
    }
  }

  const subscriptionStatus = String(profile.subscription_status ?? '').toLowerCase()
  const trialEndsAt = profile.trial_ends_at ?? null
  const lessonDataDeleteAt = profile.lesson_data_delete_at ?? null
  const paymentMethodBrand = profile.payment_method_brand ?? null
  const paymentMethodLast4 = profile.payment_method_last4 ?? null

  const now = currentTimeMs !== undefined ? currentTimeMs : Date.now()
  const diffMs = getDiffMs(trialEndsAt, now)
  const isExpired = diffMs <= 0 && Boolean(trialEndsAt)

  const hasCard = Boolean(paymentMethodBrand || paymentMethodLast4)
  const isPaidLikeStatus =
    subscriptionStatus === 'active' ||
    subscriptionStatus === 'trialing' ||
    subscriptionStatus === 'past_due'

  if (!isExpired) {
    return {
      showTrialCard: Boolean(trialEndsAt),
      isExpired: false,
      isPaymentMissingAfterTrial: false,
      headline: `無料トライアル ${formatRemainingLabel(diffMs)}`,
      subline: trialEndsAt ? `${formatJstDateTime(trialEndsAt)}まで` : '',
      ctaLabel: 'プランを確認・変更',
      ctaHref: '/settings',
    }
  }

  if (!hasCard && !isPaidLikeStatus) {
    const deleteNotice = lessonDataDeleteAt
      ? `レッスンデータは ${formatJstDateTime(lessonDataDeleteAt)} に削除予定です`
      : 'カード登録がない場合、1ヶ月後にレッスンデータが削除されます'

    return {
      showTrialCard: true,
      isExpired: true,
      isPaymentMissingAfterTrial: true,
      headline: '無料期間が終了しました',
      subline: '学習を続けるにはカード登録とプラン選択が必要です',
      ctaLabel: 'カード登録・決済へ進む',
      ctaHref: '/settings',
      dangerNote: deleteNotice,
    }
  }

  return {
    showTrialCard: false,
    isExpired: true,
    isPaymentMissingAfterTrial: false,
    headline: '',
    subline: '',
    ctaLabel: '',
    ctaHref: '/settings',
  }
}

const HEADER_LINK_CLASS =
  'text-sm font-medium text-amber-600 hover:text-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded'

// ─── 今日のレッスン ロードマップ（進捗に応じた5ステップ）
type RoadmapStepState = 'completed' | 'current' | 'upcoming'

export type RoadmapStep = {
  id: string
  label: string
  state: RoadmapStepState
}

const ROADMAP_STEP_IDS = ['warmup', 'basic', 'conversation', 'ai', 'review'] as const
const ROADMAP_STEP_LABELS: Record<(typeof ROADMAP_STEP_IDS)[number], string> = {
  warmup: 'ウォームアップ',
  basic: '基本文',
  conversation: '会話練習',
  ai: 'AI会話',
  review: '復習',
}

/** Missing, NaN, or negative => 0; otherwise floor to non-negative integer. */
function toSafeCount(value: unknown): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0
  const floored = Math.floor(n)
  return floored < 0 ? 0 : floored
}

/** 今日の完了レッスン数。completed_lesson_count / lesson_runs_completed / lesson_items_completed を安全に読む。 */
function getTodayCompletedLessonCount(todayStat: DailyStatRow | null): number {
  const stat = todayStat as (DailyStatRow & Record<string, unknown>) | null
  return toSafeCount(
    stat?.completed_lesson_count ?? stat?.lesson_runs_completed ?? stat?.lesson_items_completed
  )
}

/**
 * 今日の daily_stat からロードマップ5ステップを算出。
 * レッスン進捗を優先し、使えない場合はブロック進捗をフォールバックに使用。
 * どちらも無い場合は先頭ステップを current のまま表示する。
 */
function getRoadmapStepsFromTodayStat(todayStat: DailyStatRow | null): RoadmapStep[] {
  const stat = todayStat as (DailyStatRow & Record<string, unknown>) | null
  const completedLessonCount = getTodayCompletedLessonCount(todayStat)
  const lessonCount = toSafeCount(stat?.lesson_count)
  const completedBlockCount = toSafeCount(stat?.completed_block_count)
  const blockCount = toSafeCount(stat?.block_count)

  const normalizedCompletedLessonCount =
    lessonCount > 0 ? Math.min(completedLessonCount, lessonCount) : completedLessonCount

  let currentIndex: number

  if (normalizedCompletedLessonCount > 0) {
    currentIndex = Math.min(normalizedCompletedLessonCount, 4)
  } else if (blockCount > 0) {
    const blockProgress = completedBlockCount / blockCount
    if (blockProgress >= 0.9) currentIndex = 4
    else if (blockProgress >= 0.7) currentIndex = 3
    else if (blockProgress >= 0.45) currentIndex = 2
    else if (blockProgress >= 0.25) currentIndex = 1
    else currentIndex = 0
  } else {
    currentIndex = 0
  }

  return ROADMAP_STEP_IDS.map((id, i) => ({
    id,
    label: ROADMAP_STEP_LABELS[id],
    state: i < currentIndex ? 'completed' : i === currentIndex ? 'current' : 'upcoming',
  }))
}

function RoadmapStepRow({ step, isLast }: { step: RoadmapStep; isLast: boolean }) {
  const isCompleted = step.state === 'completed'
  const isCurrent = step.state === 'current'
  const isUpcoming = step.state === 'upcoming'

  return (
    <li className="flex justify-center">
      <div className="flex gap-5 w-full max-w-[280px]">
        <div className="flex flex-col items-center shrink-0 pt-0.5">
          <span
            className={`
              flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold
              ${isCompleted ? 'bg-amber-100 text-amber-700' : ''}
              ${isCurrent ? 'bg-amber-500 text-white ring-2 ring-amber-400 ring-offset-2' : ''}
              ${isUpcoming ? 'bg-[#f0eeea] text-[#8a8a9a]' : ''}
            `}
            aria-hidden
          >
            {isCompleted ? '✓' : isCurrent ? '•' : ''}
          </span>
          {!isLast && (
            <div
              className={`w-0.5 flex-1 min-h-[12px] mt-1 ${isCompleted ? 'bg-amber-200' : 'bg-[#ede9e2]'}`}
              aria-hidden
            />
          )}
        </div>
        <div className={`py-5 pt-0.5 flex-1 min-w-0 ${!isLast ? 'border-b border-[#f0eeea] border-dashed' : ''}`}>
          <p
            className={
              isCompleted
                ? 'text-sm font-medium text-[#8a8a9a] line-through'
                : isCurrent
                  ? 'text-sm font-semibold text-[#1a1a2e]'
                  : 'text-sm font-medium text-[#4a4a6a]'
            }
          >
            {step.label}
          </p>
          {isCompleted && (
            <p className="mt-0.5 text-xs text-amber-600 font-medium">完了</p>
          )}
        </div>
      </div>
    </li>
  )
}

function DashboardHeader({ onSignOut }: { onSignOut: () => void }) {
  return (
    <header className="sticky top-0 z-50 border-b border-[#ede9e2] bg-white">
      <div className="mx-auto flex h-16 max-w-[960px] items-center justify-between px-6 sm:px-10">
        <Link
          href="/dashboard"
          className="flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded-lg"
          aria-label="レッスンホーム"
        >
          <Image
            src="/header_logo.svg"
            alt="NativeFlow"
            width={200}
            height={48}
            className="h-9 w-auto object-contain sm:h-10"
            priority
          />
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/settings" className={HEADER_LINK_CLASS}>
            マイページ
          </Link>
          <button
            type="button"
            onClick={onSignOut}
            className={HEADER_LINK_CLASS + ' cursor-pointer border-0 bg-transparent'}
          >
            ログアウト
          </button>
        </div>
      </div>
    </header>
  )
}

function DashboardLoadingState({
  loadingMessage,
  onSignOut,
}: {
  loadingMessage: string
  onSignOut: () => void
}) {
  return (
    <div
      className={PAGE_SHELL_CLASS}
      style={{ fontFamily: "'Nunito','Hiragino Sans',sans-serif" }}
    >
      <DashboardHeader onSignOut={onSignOut} />
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className={`w-full max-w-md ${CARD_CLASS} px-6 py-8 text-center`}>
          <p className="text-[#4a4a6a]" aria-live="polite">
            {loadingMessage}
          </p>
        </div>
      </main>
      <DashboardFooter />
    </div>
  )
}

function DashboardErrorState({
  message,
  onSignOut,
}: {
  message: string
  onSignOut: () => void
}) {
  return (
    <div
      className={PAGE_SHELL_CLASS}
      style={{ fontFamily: "'Nunito','Hiragino Sans',sans-serif" }}
    >
      <DashboardHeader onSignOut={onSignOut} />
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className={`w-full max-w-md ${CARD_CLASS} px-6 py-8 text-center`}>
          <h2 className="text-lg font-semibold text-[#1a1a2e]">
            エラー
          </h2>
          <p className="mt-3 text-sm text-[#4a4a6a]">
            {message}
          </p>
          <p className="mt-6">
            <Link
              href="/login"
              className={HEADER_LINK_CLASS}
            >
              ログインへ戻る
            </Link>
          </p>
        </div>
      </main>
      <DashboardFooter />
    </div>
  )
}

function DashboardFooter() {
  return (
    <footer className="border-t border-[#ede9e2] bg-white px-6 py-10 sm:px-10 sm:py-10">
      <div className="mx-auto grid max-w-[1140px] gap-10 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <Link
            href="/dashboard"
            className="mb-3.5 flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded"
            aria-label="レッスンホーム"
          >
            <Image
              src="/footer_logo.svg"
              alt="NativeFlow"
              width={200}
              height={40}
              className="h-10 w-auto object-contain"
            />
          </Link>
          <p className="max-w-[240px] text-[13px] leading-relaxed text-[#aaa]">
            Speak with AI. Learn like a native.
          </p>
        </div>
        <div>
          <p className="mb-3.5 text-sm font-extrabold text-[#1a1a2e]">プロダクト</p>
          <Link href="/#features" className="mb-2 block text-[13px] font-semibold text-[#888] hover:text-[#1a1a2e] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded">特徴</Link>
          <Link href="/#scenes" className="mb-2 block text-[13px] font-semibold text-[#888] hover:text-[#1a1a2e] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded">学習方法</Link>
          <Link href="/#pricing" className="mb-2 block text-[13px] font-semibold text-[#888] hover:text-[#1a1a2e] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded">料金プラン</Link>
          <Link href="/#faq" className="mb-2 block text-[13px] font-semibold text-[#888] hover:text-[#1a1a2e] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded">よくある質問</Link>
        </div>
        <div>
          <p className="mb-3.5 text-sm font-extrabold text-[#1a1a2e]">法的情報</p>
          <Link href="/legal/privacy" className="mb-2 block text-[13px] font-semibold text-[#888] hover:text-[#1a1a2e] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded">プライバシーポリシー</Link>
          <Link href="/legal/terms" className="mb-2 block text-[13px] font-semibold text-[#888] hover:text-[#1a1a2e] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded">利用規約</Link>
          <Link href="/legal/tokusho" className="mb-2 block text-[13px] font-semibold text-[#888] hover:text-[#1a1a2e] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded">特定商取引法に基づく表記</Link>
          <Link href="/legal/company" className="mb-2 block text-[13px] font-semibold text-[#888] hover:text-[#1a1a2e] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded">会社情報</Link>
        </div>
        <div>
          <p className="mb-3.5 text-sm font-extrabold text-[#1a1a2e]">サポート</p>
          <Link href="/contact" className="mb-2 block text-[13px] font-semibold text-[#888] hover:text-[#1a1a2e] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded">お問い合わせ</Link>
        </div>
      </div>
      <div className="mx-auto mt-7 max-w-[1140px] border-t border-[#ede9e2] pt-6 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
        <p className="text-[13px] text-[#bbb]">© 2026 NativeFlow. All rights reserved.</p>
        <p className="text-xs text-[#bbb]">Speak with AI. Learn like a native.</p>
      </div>
    </footer>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<DashboardProfileRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [todayStat, setTodayStat] = useState<DailyStatRow | null>(null)
  const [dailyStatsError, setDailyStatsError] = useState(false)
  const [pageError, setPageError] = useState('')
  const [streakDays, setStreakDays] = useState(0)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false)

  const copy = DASHBOARD_COPY_JA

  useEffect(() => {
    setAvatarLoadFailed(false)
  }, [profile?.avatar_image_url])

  useEffect(() => {
    const msUntilNextMinute = 60000 - (Date.now() % 60000)
    let intervalId: ReturnType<typeof setInterval> | null = null
    const timeoutId = setTimeout(() => {
      setNowMs(Date.now())
      intervalId = setInterval(() => setNowMs(Date.now()), 60000)
    }, msUntilNextMinute)
    return () => {
      clearTimeout(timeoutId)
      if (intervalId) clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    let isActive = true

    async function loadDashboard() {
      let profileLoaded = false
      let session: { user: { id: string; user_metadata?: { plan?: string } }; user_metadata?: { plan?: string } } | null = null

      // Blocking: auth + profile. Any error here is fatal and shows page error.
      try {
        const {
          data: { session: s },
          error: sessionError,
        } = await supabase.auth.getSession()
        if (sessionError || !s?.user) {
          if (isActive) router.replace('/login')
          return
        }
        session = s

        const { data: row, error: fetchError } = await supabase
          .from('user_profiles')
          .select(
            'id, ui_language_code, target_language_code, target_country_code, target_region_slug, current_level, speak_by_deadline_text, target_outcome_text, daily_study_minutes_goal, current_streak_days, best_streak_days, last_streak_date, avatar_character_code, avatar_level, avatar_image_url, created_at'
          )
          .eq('id', session.user.id)
          .maybeSingle()

        console.log('Dashboard profile fetchError', fetchError)
        console.log('Dashboard profile row', row)

        if (fetchError) {
          console.error('Dashboard profile fetch error', fetchError)
          if (isActive) setPageError(USER_FACING_ERROR)
          if (isActive) setLoading(false)
          return
        }

        if (!row) {
          if (isActive) router.replace('/onboarding')
          if (isActive) setLoading(false)
          return
        }

        profileLoaded = true
        if (isActive) setProfile(row as DashboardProfileRow)
      } catch (err) {
        console.error('Dashboard load exception', err)
        if (isActive && !profileLoaded) setPageError(USER_FACING_ERROR)
        if (isActive) setLoading(false)
        return
      }

      if (!isActive) return

      // Non-blocking: daily stat. Fallback to null; render path uses safe defaults.
      let stat: DailyStatRow | null = null
      let recentStats: DailyStatRow[] = []
      try {
        const { data: statResult, error: statError } = await getDailyStatByUserAndDate(
          session!.user.id,
          getTodayStatDate()
        )
        console.log('Dashboard daily stat error', statError)
        console.log('Dashboard daily stat', statResult)
        if (statError) {
          console.error('Dashboard daily stat error', statError)
          if (isActive) setDailyStatsError(true)
        }
        stat = statResult ?? null
      } catch (error) {
        console.log('Dashboard daily stat threw', error)
        stat = null
        if (isActive) setDailyStatsError(true)
      }

      // Non-blocking: recent stats. Fallback to []; streak derives to 0.
      try {
        const { data: historyResult, error: recentError } = await getDailyStatsByUser(
          session!.user.id,
          400
        )
        console.log('Dashboard recent stats error', recentError)
        console.log('Dashboard recent stats count', historyResult?.length ?? 0)
        if (recentError) {
          console.error('Dashboard recent stats error', recentError)
        }
        recentStats = historyResult ?? []
      } catch (error) {
        console.log('Dashboard recent stats threw', error)
        recentStats = []
      }

      if (isActive) {
        setTodayStat(stat)
        setStreakDays(computeStreak(getTodayStatDate(), recentStats))
      }
      if (isActive) setLoading(false)
    }

    loadDashboard()
    return () => {
      isActive = false
    }
  }, [router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (loading) {
    return (
      <DashboardLoadingState loadingMessage={copy.loading} onSignOut={handleSignOut} />
    )
  }

  if (!profile || pageError) {
    return (
      <DashboardErrorState message={pageError || USER_FACING_ERROR} onSignOut={handleSignOut} />
    )
  }

  const studyMinutesActual = todayStat?.study_minutes ?? 0
  const studyGoal = profile.daily_study_minutes_goal ?? 0

  // ストリーク: プロフィールの current_streak_days を優先、なければ算出値
  const displayStreak = (profile.current_streak_days != null && profile.current_streak_days > 0)
    ? profile.current_streak_days
    : streakDays

  const persistedTotalFlowPoints = toSafeCount(profile.total_flow_points)
  const todayEarnedFlowPoints = calculateFlowPoints({
    studyMinutes: studyMinutesActual,
    streakDays: displayStreak,
    completedLessonCount: getTodayCompletedLessonCount(todayStat),
  }).totalPointsToday
  const displayedTotalFlowPoints =
    persistedTotalFlowPoints === 0 && todayEarnedFlowPoints > 0
      ? todayEarnedFlowPoints
      : persistedTotalFlowPoints

  const currentRank = getRankFromFlowPoints(displayedTotalFlowPoints)
  const rankLabel = getRankLabel(currentRank)
  const rankCodeForDisplay = getRankCodeForDisplay(currentRank)
  const rankTheme = getRankCardTheme(currentRank)
  const pointsToNextRank = getPointsToNextRank(displayedTotalFlowPoints)

  const characterName = (profile.avatar_character_code ?? '').trim() || 'Alex'
  const characterDisplayName = characterName.charAt(0).toUpperCase() + characterName.slice(1).toLowerCase()
  const avatarLevel = profile.avatar_level != null && profile.avatar_level >= 1 ? profile.avatar_level : 1
  const avatarImageUrl = (profile.avatar_image_url ?? '').trim()
  const hasAvatarImage = avatarImageUrl.length > 0 && !avatarLoadFailed

  const goalStartAt = profile.trial_start_at ?? profile.created_at ?? null
  const goalTimeline = getGoalTimeline(getTodayStatDate(), profile.speak_by_deadline_text, goalStartAt)

  const trialDisplay = getTrialDisplay(profile, nowMs)

  const roadmapSteps = getRoadmapStepsFromTodayStat(todayStat)

  return (
    <div
      className={PAGE_SHELL_CLASS}
      style={{ fontFamily: "'Nunito','Hiragino Sans',sans-serif" }}
    >
      <DashboardHeader onSignOut={handleSignOut} />

      <main className="flex-1">
        <div className={CONTAINER_CLASS}>
          {trialDisplay.showTrialCard && (
            <section
              className="flex justify-center"
              aria-label="無料トライアル"
            >
              <div
                className={
                  trialDisplay.isExpired && trialDisplay.isPaymentMissingAfterTrial
                    ? `w-full max-w-[300px] ${RADIUS} bg-gradient-to-br from-white via-red-50/70 to-amber-50/80 px-5 py-4 ${CARD_SHADOW} border border-red-200/60 shadow-sm`
                    : `w-full max-w-[300px] ${RADIUS} bg-gradient-to-br from-amber-100 via-amber-50 to-amber-100/80 px-5 py-4 ${CARD_SHADOW} border border-amber-200/60`
                }
              >
                <div className="flex flex-col">
                  <p
                    className={
                      trialDisplay.isExpired && trialDisplay.isPaymentMissingAfterTrial
                        ? 'text-[15px] font-bold text-red-800 tracking-tight leading-snug'
                        : 'text-[15px] font-bold text-amber-900 tracking-tight leading-snug'
                    }
                  >
                    {trialDisplay.headline}
                  </p>
                  {trialDisplay.subline && (
                    <p
                      className={
                        trialDisplay.isExpired && trialDisplay.isPaymentMissingAfterTrial
                          ? 'mt-1.5 text-xs text-amber-800/90 leading-normal'
                          : 'mt-1.5 text-xs text-amber-700/90 leading-normal'
                      }
                    >
                      {trialDisplay.subline}
                    </p>
                  )}
                  <Link
                    href={trialDisplay.ctaHref}
                    className={
                      trialDisplay.isExpired && trialDisplay.isPaymentMissingAfterTrial
                        ? 'mt-3 w-full inline-flex items-center justify-center rounded-lg bg-red-500 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-red-200/30 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 transition-colors'
                        : 'mt-3 w-full inline-flex items-center justify-center rounded-lg bg-amber-500/95 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 transition-colors'
                    }
                  >
                    {trialDisplay.ctaLabel}
                  </Link>
                  {trialDisplay.dangerNote && (
                    <p className="mt-2 text-[11px] font-medium text-red-600 leading-snug">
                      {trialDisplay.dangerNote}
                    </p>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* メンバーシップ風ヒーローカード：ランク・パートナー・ストリーク・ポイントを1枚に */}
          <section
            className={`mx-auto w-full max-w-md ${trialDisplay.showTrialCard ? SECTION_GAP : 'mt-4'}`}
            aria-label="メンバーシップ"
          >
            <div
              className={`${RADIUS} overflow-hidden px-5 py-6 sm:px-6 sm:py-7 ${CARD_SHADOW} border ${rankTheme.container} ${rankTheme.border}`}
              style={{ minHeight: '160px' }}
            >
              {/* 上段: ランク名（左） / ランクバッジスロット（右）。将来 rank_image_url で Image 差し替え可能。 */}
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className={`text-[11px] font-semibold uppercase tracking-wider ${rankTheme.mutedText}`}>現在のランク</p>
                  <p className={`mt-1 text-lg font-extrabold tracking-tight capitalize drop-shadow-sm ${rankTheme.valueText}`}>{rankLabel}</p>
                  <p className={`mt-1 text-[10px] ${rankTheme.mutedText} leading-snug`}>
                    {pointsToNextRank === 0 ? '最高ランクです' : `次のランクまであと ${pointsToNextRank}pt`}
                  </p>
                </div>
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 ${rankTheme.badgeBorder} ${rankTheme.badgeBg} shadow-inner ring-2 ring-white/20`}
                  data-rank-code={rankCodeForDisplay}
                  aria-label={rankLabel}
                >
                  <span className="text-sm font-extrabold text-[#1a1a2e] capitalize">{rankLabel.slice(0, 1)}</span>
                </div>
              </div>
              {/* 中段: パートナー画像スロット（左）＋ 名前・レベル。将来 avatar_image_url で Image 差し替え可能。 */}
              <div className="mt-7 flex items-center gap-4">
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 ${rankTheme.badgeBorder} ${rankTheme.badgeBg} shadow-sm`}>
                  {hasAvatarImage ? (
                    <img
                      src={avatarImageUrl}
                      alt={characterDisplayName}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={() => setAvatarLoadFailed(true)}
                    />
                  ) : (
                    <span className="text-xl font-bold text-[#1a1a2e]" aria-hidden>
                      {characterDisplayName.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className={`text-[11px] font-semibold uppercase tracking-wider ${rankTheme.mutedText}`}>パートナー</p>
                  <p className={`mt-0.5 text-[15px] font-extrabold tracking-tight ${rankTheme.valueText} flex items-baseline gap-2 min-w-0`}>
                    <span className="truncate min-w-0">{characterDisplayName}</span>
                    <span className="shrink-0 font-bold opacity-90 text-[13px]">Lv{avatarLevel}</span>
                  </p>
                </div>
              </div>
              {/* 下段: 3メトリクス（等幅・中央揃え） */}
              <div className="mt-7 flex justify-between border-t border-white/25 pt-6">
                <div className="flex-1 min-w-0 flex flex-col items-center text-center">
                  <p className={`text-[10px] font-semibold uppercase tracking-wider ${rankTheme.mutedText}`}>継続日数</p>
                  <p className={`mt-0.5 text-base font-bold ${rankTheme.valueText}`}>{displayStreak}日</p>
                </div>
                <div className="flex-1 min-w-0 flex flex-col items-center text-center">
                  <p className={`text-[10px] font-semibold uppercase tracking-wider ${rankTheme.mutedText}`}>フローポイント</p>
                  <p className={`mt-0.5 text-base font-bold ${rankTheme.valueText}`}>{displayedTotalFlowPoints}</p>
                </div>
                <div className="flex-1 min-w-0 flex flex-col items-center text-center">
                  <p className={`text-[10px] font-semibold uppercase tracking-wider ${rankTheme.mutedText}`}>レベル</p>
                  <p className={`mt-0.5 text-base font-bold ${rankTheme.valueText}`}>Lv{avatarLevel}</p>
                </div>
              </div>
            </div>
          </section>

          {/* 目標タイムライン（フル幅ダッシュボードモジュール） */}
          <section
            className={SECTION_GAP}
            aria-label="目標タイムライン"
          >
            <div className={`w-full ${RADIUS} ${CARD_BORDER} bg-white px-5 py-5 sm:px-6 sm:py-6 ${CARD_SHADOW}`}>
              <h3 className="text-base font-extrabold text-[#1a1a2e] tracking-tight">目標タイムライン</h3>
              <div className="mt-4 relative h-3 rounded-full bg-[#ede9e2] overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all"
                  style={{ width: `${goalTimeline.progressPercent}%` }}
                  role="progressbar"
                  aria-valuenow={goalTimeline.progressPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
                <span
                  className="absolute top-1/2 w-3 h-3 rounded-full bg-white border-2 border-amber-500 shadow-md -translate-y-1/2 -translate-x-1/2"
                  style={{ left: `${goalTimeline.progressPercent}%` }}
                  aria-hidden
                />
              </div>
              <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <p className="text-sm font-semibold text-[#8a8a9a]">残り約{goalTimeline.remainingDays}日</p>
                <p className="text-[11px] text-[#8a8a9a] leading-snug">毎日の積み重ねで、目標に近づきます</p>
              </div>
            </div>
          </section>

          {/* 今日のレッスン実施時間（キーメトリックカード） */}
          <section
            className={`${SECTION_GAP} w-full ${RADIUS} ${CARD_BORDER} bg-white px-6 py-8 sm:py-9 ${CARD_SHADOW}`}
            aria-label="今日のレッスン実施時間"
          >
            <p className="text-center text-xs font-medium text-[#8a8a9a] tracking-tight">
              今日のレッスン実施時間
            </p>
            <p className="mt-4 text-center leading-tight flex flex-wrap items-baseline justify-center gap-x-1 gap-y-0">
              <span className="text-4xl sm:text-5xl font-bold text-[#1a1a2e] tracking-tight">{studyMinutesActual}</span>
              <span className="text-lg sm:text-xl font-medium text-[#8a8a9a]">{copy.minutesSuffix}</span>
              <span className="mx-1.5 text-[#c4c0b8] font-light text-lg">/</span>
              <span className="text-base sm:text-lg font-medium text-[#8a8a9a]">目標 {studyGoal}</span>
              <span className="text-sm font-medium text-[#8a8a9a]">{copy.minutesSuffix}</span>
            </p>
            {dailyStatsError && (
              <p className="mt-3 text-center text-sm text-amber-700">{DAILY_STATS_ERROR}</p>
            )}
          </section>

          {/* 今日のレッスン・ロードマップ（アクションエリア） */}
          <section
            className={`${SECTION_GAP} ${CARD_CLASS} px-6 py-6 sm:px-8 sm:py-7 w-full flex flex-col items-center`}
            aria-label="今日のレッスン"
          >
            <ul className="list-none pl-0 w-full max-w-[280px] mx-auto" role="list">
              {roadmapSteps.map((step, index) => (
                <RoadmapStepRow
                  key={step.id}
                  step={step}
                  isLast={index === roadmapSteps.length - 1}
                />
              ))}
            </ul>
            <Link
              href="/lesson"
              className={`mt-8 w-full max-w-[280px] mx-auto inline-block ${CTA_CLASS}`}
            >
              {copy.ctaPrimary}
            </Link>
          </section>
        </div>
      </main>

      <DashboardFooter />
    </div>
  )
}
