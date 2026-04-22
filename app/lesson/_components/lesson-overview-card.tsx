'use client'

import { useState } from 'react'
import type { LessonCopy } from '../../../lib/lesson-copy'
import type { LessonSession } from '../../../lib/lesson-engine'
import { LessonRankCard } from './lesson-rank-card'
import LpIcon from '@/components/lp-icon'

export type SelectedDailyAction = {
  emoji: string
  /** Display-ready label, already resolved for the current UI language. */
  label: string
}

export type LessonOverviewCardProps = {
  lesson: LessonSession
  copy: LessonCopy
  getLevelLabel: (level: LessonSession['level']) => string
  onStart: () => void
  rankCode: string
  totalFlowPoints: number
  flowPointsToNextRank: number
  targetLanguageLabel: string
  currentStageIndex: number
  /** Current block index for progress visualization */
  currentBlockIndex?: number
  selectedDailyActions?: SelectedDailyAction[]
  targetRegionSlug?: string | null
  speakByDeadlineText?: string | null
  ageGroup?: string | null
  dueReviewCount?: number
  onStartReview?: () => void
  /** YYYY-MM-DD strings of completed study days for calendar display */
  completedDates?: string[]
  /** ISO timestamp of trial end (null = no trial) */
  trialEndsAt?: string | null
  /** Total accumulated diamonds */
  totalDiamonds?: number
  /** Current streak days from DB */
  currentStreakDays?: number
  /** Last study date YYYY-MM-DD from DB */
  lastStreakDate?: string | null
  /** Last restore date YYYY-MM-DD from DB */
  lastStreakRestoreDate?: string | null
  /** ISO timestamp of boost expiry (null = no boost) */
  diamondBoostUntil?: string | null
  /** Date protected by streak freeze (null = none) */
  streakFrozenDate?: string | null
  /** ISO timestamp of freeze expiry */
  streakFreezeExpiry?: string | null
  /** ISO timestamp of weekly challenge unlock (null = not unlocked) */
  weeklyChallengeUnlockedAt?: string | null
  /** ISO timestamp of weekly challenge completion (null = not completed) */
  weeklyChallengeCompletedAt?: string | null
  /** Starts a weekly challenge review session */
  onStartWeeklyChallenge?: () => void
}

// ── Helpers ─────────────────────────────────────────────────

function formatRegionLabel(slug: string, isJa: boolean): string {
  const ja: Record<string, string> = {
    en_us_general: 'アメリカ', en_gb_general: 'イギリス', en_au_general: 'オーストラリア',
    ny: 'ニューヨーク', new_york: 'ニューヨーク',
    la: 'ロサンゼルス', los_angeles: 'ロサンゼルス',
    sf: 'サンフランシスコ', san_francisco: 'サンフランシスコ',
    chicago: 'シカゴ',
    london: 'ロンドン', manchester: 'マンチェスター',
    sydney: 'シドニー', melbourne: 'メルボルン',
    toronto: 'トロント', vancouver: 'バンクーバー',
  }
  const en: Record<string, string> = {
    en_us_general: 'United States', en_gb_general: 'United Kingdom', en_au_general: 'Australia',
    ny: 'New York', new_york: 'New York',
    la: 'Los Angeles', los_angeles: 'Los Angeles',
    sf: 'San Francisco', san_francisco: 'San Francisco',
    chicago: 'Chicago',
    london: 'London', manchester: 'Manchester',
    sydney: 'Sydney', melbourne: 'Melbourne',
    toronto: 'Toronto', vancouver: 'Vancouver',
  }
  const lower = slug.toLowerCase().trim()
  const map = isJa ? ja : en
  if (map[lower]) return map[lower]
  const stripped = lower.replace(/^en_[a-z]{2}_/, '').replace(/^[a-z]{2}_/, '')
  if (stripped && map[stripped]) return map[stripped]
  return stripped.replace(/_/g, ' ').replace(/\b(en|us|gb|au)\b/gi, '').replace(/\s+/g, ' ').trim() || slug
}

// ── Diamond panel with streak restore ──

type DiamondPanelProps = {
  totalDiamonds: number
  canRestore: boolean
  boostActive: boolean
  restoreHint: 'insufficient' | 'gap_too_large' | null
  diamondsNeeded: number
  streakDays: number
  restoreExpiresInHours: number | null
  /** Whether a streak freeze is currently active */
  freezeActive: boolean
  /** The date protected by freeze (for display) */
  freezeDate: string | null
  /** Weekly challenge state */
  challengeState: 'available' | 'unlocked' | 'completed' | 'unavailable'
  /** Starts the actual review session for weekly challenge */
  onStartChallengeSession?: () => void
}

function DiamondPanel({ totalDiamonds, canRestore, boostActive, restoreHint, diamondsNeeded, streakDays, restoreExpiresInHours, freezeActive, freezeDate: _freezeDate, challengeState, onStartChallengeSession }: DiamondPanelProps) {
  const [diamonds, setDiamonds] = useState(totalDiamonds)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [restoredTo, setRestoredTo] = useState<number | null>(null)
  const [isBoosted, setIsBoosted] = useState(boostActive)
  const [isFrozen, setIsFrozen] = useState(freezeActive)

  function getTomorrowStr() {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().slice(0, 10)
  }

  async function handleAction(action: 'restore' | 'boost' | 'freeze' | 'challenge_unlock' | 'challenge_complete') {
    setBusy(true)
    setMessage(null)
    try {
      const urls: Record<string, string> = {
        restore: '/api/diamonds/restore-streak',
        boost: '/api/diamonds/activate-boost',
        freeze: '/api/diamonds/freeze-streak',
        challenge_unlock: '/api/diamonds/weekly-challenge',
        challenge_complete: '/api/diamonds/weekly-challenge',
      }
      const url = urls[action]
      const bodyMap: Record<string, unknown> = {
        freeze: { targetDate: getTomorrowStr() },
        challenge_unlock: { action: 'unlock' },
        challenge_complete: { action: 'complete' },
      }
      const body = bodyMap[action]
      const res = await (async () => {
        const { getSupabaseBrowserClient } = await import('../../../lib/supabase/browser-client')
        const sb = getSupabaseBrowserClient()
        const { data: { session } } = await sb.auth.getSession()
        if (!session) throw new Error('No session')
        const r = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: body ? JSON.stringify(body) : undefined,
        })
        return r.json()
      })()
      const result = res
      if (result.success) {
        setDiamonds(result.newDiamonds)
        if (action === 'restore') {
          setRestoredTo(result.restoredStreak)
          setMessage(`🔥 ストリーク復活！ ${result.restoredStreak}日連続に戻りました`)
        }
        if (action === 'boost') { setMessage('ブースト発動！次のレッスンで+2ダイヤ'); setIsBoosted(true) }
        if (action === 'freeze') { setMessage('🛡️ 明日のストリークを保護しました'); setIsFrozen(true) }
        if (action === 'challenge_unlock') { setMessage('🎯 週間チャレンジ解放！'); setChallengeUnlocked(true) }
        if (action === 'challenge_complete') { setMessage(`🎯 チャレンジ達成！\n💎 +${result.reward} ダイヤ獲得！`); setChallengeDone(true); setChallengeUnlocked(false) }
      } else {
        setMessage(result.message ?? '失敗しました')
      }
    } catch {
      setMessage('エラーが発生しました')
    } finally {
      setBusy(false)
    }
  }

  const [challengeDone, setChallengeDone] = useState(challengeState === 'completed')
  const [challengeUnlocked, setChallengeUnlocked] = useState(challengeState === 'unlocked')
  const canFreeze = !isFrozen && diamonds >= 15
  const canUnlockChallenge = challengeState === 'available' && diamonds >= 7
  const showActions = !message && (canRestore || (!isBoosted && diamonds >= 5) || canFreeze || canUnlockChallenge || challengeUnlocked)
  const showRestoreHint = !message && !canRestore && restoreHint !== null
  const boostShortfall = !isBoosted && diamonds >= 3 && diamonds < 5 ? 5 - diamonds : 0

  return (
    <div className="rounded-[14px] border border-[#FDE68A] bg-gradient-to-b from-[#FFFBEB] to-[#FEF3C7] px-3 py-2.5">
      <div className="flex items-center justify-center gap-2">
        <img src="/images/branding/diamond.svg" alt="" className="h-4 w-4" />
        <span className="text-sm font-black text-[#92400E]">{diamonds}</span>
        <span className="text-[11px] text-[#B45309]">ダイヤ</span>
        {isBoosted && <span className="rounded-full bg-[#F59E0B] px-1.5 py-0.5 text-[9px] font-bold text-white">BOOST</span>}
      </div>

      {/* Freeze active message */}
      {isFrozen && !message && (
        <div className="mt-1.5 text-center">
          <p className="text-[10px] font-bold text-blue-700 inline-flex items-center gap-0.5"><LpIcon emoji="🛡️" size={12} /> ストリーク保護中</p>
          <p className="text-[9px] text-blue-500">明日はお休みしても大丈夫です</p>
        </div>
      )}

      {/* Soft hints */}
      {!message && !isFrozen && (
        <div className="mt-1.5 space-y-0.5">
          {showRestoreHint && (
            <p className="text-center text-[10px] text-[#B45309]/70">
              {restoreHint === 'insufficient' && `あと${diamondsNeeded}ダイヤで復元できます`}
              {restoreHint === 'gap_too_large' && 'もう少し早ければ復元できました'}
            </p>
          )}
          {!isBoosted && diamonds >= 5 && (
            <p className="text-center text-[10px] text-[#B45309]/70">
              今日は+2ダイヤのチャンスがあります
            </p>
          )}
          {!isBoosted && boostShortfall > 0 && (
            <p className="text-center text-[10px] text-[#B45309]/70">
              あと{boostShortfall}ダイヤでブーストできます
            </p>
          )}
          {!isFrozen && streakDays >= 3 && diamonds >= 15 && (
            <p className="text-center text-[10px] text-blue-500/70">
              このままだと明日ストリークが途切れるかも
            </p>
          )}
        </div>
      )}

      {showActions && (
        <div className="mt-2 space-y-1.5">
          {canRestore && diamonds >= 3 && (
            <div>
              <button type="button" disabled={busy} onClick={() => handleAction('restore')}
                className="flex w-full items-center justify-between rounded-lg border border-[#FDE68A] bg-white/70 px-2.5 py-1.5 text-left transition hover:bg-white disabled:opacity-50">
                <div>
                  <p className="text-[11px] font-bold text-[#92400E]">ストリーク復活</p>
                  <p className="text-[10px] text-[#B45309]">昨日の連続記録を復元</p>
                </div>
                <span className="flex items-center gap-1 text-[11px] font-bold text-[#92400E]">
                  <img src="/images/branding/diamond.svg" alt="" className="h-3 w-3" />3
                </span>
              </button>
              {restoreExpiresInHours !== null && restoreExpiresInHours <= 12 && (
                <p className="mt-1 text-center text-[9px] text-[#B45309]/60">
                  あと{restoreExpiresInHours}時間で復元できなくなります
                </p>
              )}
            </div>
          )}
          {!isBoosted && diamonds >= 5 && (
            <div>
              <button type="button" disabled={busy} onClick={() => handleAction('boost')}
                className="flex w-full items-center justify-between rounded-lg border border-[#FDE68A] bg-white/70 px-2.5 py-1.5 text-left transition hover:bg-white disabled:opacity-50">
                <div>
                  <p className="text-[11px] font-bold text-[#92400E]">報酬ブースト</p>
                  <p className="text-[10px] text-[#B45309]">次のレッスンで+2ダイヤ</p>
                </div>
                <span className="flex items-center gap-1 text-[11px] font-bold text-[#92400E]">
                  <img src="/images/branding/diamond.svg" alt="" className="h-3 w-3" />5
                </span>
              </button>
              <p className="mt-1 text-center text-[9px] text-[#B45309]/60">今使うと次のレッスンで+2ダイヤ多く獲得できます</p>
            </div>
          )}
          {canFreeze && (
            <button type="button" disabled={busy} onClick={() => handleAction('freeze')}
              className="flex w-full items-center justify-between rounded-lg border border-blue-200 bg-blue-50/70 px-2.5 py-1.5 text-left transition hover:bg-blue-50 disabled:opacity-50">
              <div>
                <p className="text-[11px] font-bold text-blue-800">ストリークフリーズ</p>
                <p className="text-[10px] text-blue-600">忙しい日でも連続記録を守れます</p>
              </div>
              <span className="flex items-center gap-1 text-[11px] font-bold text-blue-800">
                <img src="/images/branding/diamond.svg" alt="" className="h-3 w-3" />15
              </span>
            </button>
          )}
          {canUnlockChallenge && (
            <button type="button" disabled={busy} onClick={() => handleAction('challenge_unlock')}
              className="flex w-full items-center justify-between rounded-lg border border-purple-200 bg-purple-50/70 px-2.5 py-1.5 text-left transition hover:bg-purple-50 disabled:opacity-50">
              <div>
                <p className="text-[11px] font-bold text-purple-800">週間チャレンジ</p>
                <p className="text-[10px] text-purple-600">今週の特別レッスンに挑戦</p>
              </div>
              <span className="flex items-center gap-1 text-[11px] font-bold text-purple-800">
                <img src="/images/branding/diamond.svg" alt="" className="h-3 w-3" />7
              </span>
            </button>
          )}
          {challengeUnlocked && !challengeDone && (() => {
            const dayOfWeek = new Date().getDay()
            const isLateWeek = dayOfWeek === 0 || dayOfWeek >= 5
            return (
              <div>
                <button type="button" disabled={busy} onClick={() => onStartChallengeSession?.()}
                  className="flex w-full items-center justify-between rounded-lg border border-purple-300 bg-purple-100 px-2.5 py-1.5 text-left transition hover:bg-purple-50 disabled:opacity-50">
                  <div>
                    <p className="text-[11px] font-bold text-purple-800 inline-flex items-center gap-0.5"><LpIcon emoji="🎯" size={13} /> 今週の復習チャレンジ（あと1回）</p>
                    <p className="text-[10px] text-purple-600">弱い部分を復習して+5ダイヤ獲得</p>
                  </div>
                  <span className="text-[11px] font-bold text-purple-800">START</span>
                </button>
                {isLateWeek && (
                  <p className="mt-1 text-center text-[9px] text-purple-400">今週のチャレンジはまだ達成されていません</p>
                )}
              </div>
            )
          })()}
          {challengeDone && (
            <p className="text-center text-[10px] font-bold text-purple-600">✅ 今週のチャレンジ達成済み</p>
          )}
        </div>
      )}

      {/* Success/error message */}
      {message && (
        <p className={`mt-1.5 whitespace-pre-line text-center text-[10px] font-bold ${restoredTo ? 'text-[#22c55e]' : 'text-[#92400E]'}`}>{message}</p>
      )}
    </div>
  )
}

// ── Compact month calendar ──

const WEEKDAY_LABELS = ['月', '火', '水', '木', '金', '土', '日']

function MiniCalendar({ completedDates }: { completedDates: string[] }) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const todayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const completedSet = new Set(completedDates)

  // First day of month (0=Sun → convert to Mon=0)
  const firstDay = new Date(year, month, 1).getDay()
  const startOffset = (firstDay + 6) % 7 // Mon-based
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: { day: number; dateStr: string }[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ day: d, dateStr })
  }

  const monthLabel = `${year}年${month + 1}月`

  return (
    <div className="rounded-[14px] border border-[#E8E4DF] bg-white px-3 py-2.5">
      <p className="mb-1.5 text-center text-[11px] font-bold text-[#7b7b94]">{monthLabel}</p>
      <div className="grid grid-cols-7 gap-px">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} className="text-center text-[9px] font-bold text-[#b0b0c0]">{w}</div>
        ))}
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {cells.map(({ day, dateStr }) => {
          const isToday = dateStr === todayStr
          const isCompleted = completedSet.has(dateStr)
          return (
            <div
              key={dateStr}
              className={`relative flex h-6 w-full items-center justify-center rounded-full text-[10px] font-bold ${
                isToday ? 'border border-[#F5A623] text-[#F5A623]' : 'text-[#b0b0c0]'
              } ${isCompleted ? 'text-[#1a1a2e]' : ''}`}
            >
              {day}
              {isCompleted && (
                <img
                  src="/images/branding/diamond.svg"
                  alt=""
                  className="pointer-events-none absolute inset-0 m-auto h-6 w-6 opacity-80"
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function buildTitle(
  uiText: LessonCopy['overviewCard'],
  regionSlug: string | null | undefined,
  isJaUi: boolean,
  targetLanguageLabel: string
): string {
  if (!regionSlug) return uiText.title
  const region = formatRegionLabel(regionSlug, isJaUi)
  return uiText.titleTemplate.replace('{region}', region).replace('{lang}', targetLanguageLabel)
}

// ── Main component ──────────────────────────────────────────

export function LessonOverviewCard({
  lesson, copy, getLevelLabel, onStart,
  rankCode, totalFlowPoints, flowPointsToNextRank, targetLanguageLabel,
  currentStageIndex: _currentStageIndex, currentBlockIndex: _currentBlockIndex = 0, selectedDailyActions: _selectedDailyActions, targetRegionSlug,
  speakByDeadlineText, ageGroup, dueReviewCount, onStartReview, completedDates, trialEndsAt, totalDiamonds, currentStreakDays, lastStreakDate, lastStreakRestoreDate, diamondBoostUntil, streakFrozenDate, streakFreezeExpiry, weeklyChallengeUnlockedAt, weeklyChallengeCompletedAt, onStartWeeklyChallenge,
}: LessonOverviewCardProps) {
  const uiText = copy.overviewCard
  const isJaUi = /[\u3000-\u9FFF]/.test(uiText.title)

  const overview = lesson as LessonSession & {
    overviewEstimatedMinutes?: number
    overviewBackgroundImageUrl?: string
  }

  const newPhraseCount = lesson.blocks.reduce((sum, block) => sum + block.items.length, 0)
  const estimatedMinutes =
    typeof overview.overviewEstimatedMinutes === 'number'
      ? overview.overviewEstimatedMinutes
      : lesson.totalEstimatedMinutes
  const estimatedTimeText = `${estimatedMinutes}${copy.block.estimatedSuffix}`

  const overviewBackgroundImageUrl =
    typeof overview.overviewBackgroundImageUrl === 'string' &&
    overview.overviewBackgroundImageUrl.trim().length > 0
      ? overview.overviewBackgroundImageUrl
      : '/images/backgrounds/home_01.webp'

  const pills: { label: string; value: string }[] = [
    { label: uiText.pillLanguage, value: targetLanguageLabel },
    { label: uiText.pillLevel, value: getLevelLabel(lesson.level) },
    ...(targetRegionSlug ? [{ label: uiText.pillRegion, value: formatRegionLabel(targetRegionSlug, isJaUi) }] : []),
    ...(speakByDeadlineText ? [{ label: uiText.pillGoal, value: speakByDeadlineText }] : []),
    ...(ageGroup ? [{ label: uiText.pillAge, value: ageGroup }] : []),
  ]

  const flowSteps = [
    { num: 1, label: uiText.flowStep1Label, sub: uiText.flowStep1Sub },
    { num: 2, label: uiText.flowStep2Label, sub: uiText.flowStep2Sub },
    { num: 3, label: uiText.flowStep3Label, sub: uiText.flowStep3Sub },
    { num: 4, label: uiText.flowStep4Label, sub: uiText.flowStep4Sub },
    { num: 5, label: uiText.flowStep5Label, sub: uiText.flowStep5Sub },
    { num: 6, label: uiText.flowStep6Label, sub: uiText.flowStep6Sub },
  ]

  return (
    <div className="mt-1 space-y-3 pb-2">

      {/* ── TOP: Title + Pills (stacked) ─────────────────── */}
      <div className="relative overflow-hidden rounded-[24px] border border-[#E8E4DF] bg-[linear-gradient(135deg,#FFF9EC_0%,#FFFFFF_55%,#FFFDF8_100%)] px-5 py-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)] sm:px-6 sm:py-4">
        <span className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-[rgba(245,166,35,0.10)]" />
        <span className="pointer-events-none absolute bottom-[-20px] right-[60px] h-24 w-24 rounded-full bg-[rgba(245,166,35,0.07)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.14]">
          <picture>
            <source
              media="(max-width: 768px)"
              srcSet={overviewBackgroundImageUrl.endsWith('.webp')
                ? overviewBackgroundImageUrl.replace('.webp', '_p.webp')
                : overviewBackgroundImageUrl}
            />
            <img src={overviewBackgroundImageUrl} alt="" className="h-full w-full object-cover" />
          </picture>
        </div>
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,249,236,0.92)_0%,rgba(255,255,255,0.90)_55%,rgba(255,253,248,0.94)_100%)]" />

        <div className="relative z-10 flex flex-col gap-2">
          <h2 className="text-[1.4rem] font-black leading-[1.2] text-[#1a1a2e] sm:text-[1.6rem]">
            {buildTitle(uiText, targetRegionSlug, isJaUi, targetLanguageLabel)}
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {pills.map((pill, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#E8E4DF] bg-white/80 px-3 py-1"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-br from-[#86efac] to-[#22c55e] shadow-[0_0_4px_rgba(34,197,94,0.25)]" />
                <span className="text-xs text-[#1a1a2e]">
                  <span className="text-[#8a8a9a]">{pill.label}:</span>{' '}
                  <span className="font-bold">{pill.value}</span>
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {targetRegionSlug && (
        <p className="mt-2 text-[11px] text-[#9ca3af]">
          🌏 このレッスンは地域の自然な表現・生活会話を反映しています
        </p>
      )}

      {/* ── MAIN BODY: Two-column layout ───────────────────── */}
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">

        {/* ── LEFT COLUMN: Timeline | Lesson flow (side-by-side) ─ */}
        <div className="rounded-[20px] border border-[#E8E4DF] bg-white px-4 pb-3 pt-4 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">

            {/* Compact daily timeline */}
            <div>
              <p className="mb-1 text-[13px] font-bold tracking-[0.04em] text-[#7b7b94]">
                {copy.dailyFlow.selectedActionsTitle}
              </p>
              <p className="mb-2 text-xs text-[#8a8a9a]">
                {copy.dailyFlow.pickProgress}
              </p>

              <div className="space-y-1">
                {lesson.blocks
                  .filter((b: { type: string }) => b.type !== 'review')
                  .map((block: { id: string; description: string; title: string; type: string }) => (
                    <div
                      key={block.id}
                      className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5"
                    >
                      <p className="text-sm font-medium text-[#4a4a6a]">
                        {block.description?.trim() || block.title}
                      </p>
                    </div>
                  ))}
              </div>
            </div>

            {/* Lesson flow (secondary) */}
            <div className="border-t border-[#f0ece6] pt-4 sm:border-t-0 sm:border-l sm:pl-5 sm:pt-0">
              <p className="mb-1 text-[12px] font-bold tracking-[0.04em] text-[#7b7b94]">
                {uiText.lessonFlowTitle}
              </p>
              <p className="mb-2.5 text-[11px] leading-relaxed text-[#9c9c9c]">
                {uiText.lessonFlowSubtitle}
              </p>
              <div className="flex flex-col gap-3.5">
                {flowSteps.map((step) => (
                  <div key={step.num} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FFF0D4] text-[10px] font-black text-[#D4881A]">
                      {step.num}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold leading-snug text-[#1a1a2e]">{step.label}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-[#8a8a9a]">{step.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* ── RIGHT COLUMN: Rank → Skill → Stats ───────────── */}
        <div className="flex flex-col gap-3">
          {/* Rank card */}
          <LessonRankCard
            rankCode={rankCode}
            totalFlowPoints={totalFlowPoints}
            flowPointsToNextRank={flowPointsToNextRank}
          />

          {/* Stats — two cards, horizontal */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-1.5 rounded-[14px] border border-[#E8E4DF] bg-[#FAFAF8] px-3 py-2.5">
              <span className="text-[11px] text-[#7b7b94]">{uiText.questionCountLabel}:</span>
              <span className="text-sm font-bold text-[#1a1a2e]">{uiText.questionCountValue.replace('{n}', String(newPhraseCount))}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-[14px] border border-[#E8E4DF] bg-[#FAFAF8] px-3 py-2.5">
              <span className="text-[11px] text-[#7b7b94]">{uiText.lessonTimeLabel}:</span>
              <span className="text-sm font-bold text-[#1a1a2e]">{estimatedTimeText}</span>
            </div>
          </div>

          {/* Diamond count + restore */}
          {totalDiamonds != null && totalDiamonds > 0 && (() => {
            const today = new Date()
            const todayStr = today.toISOString().slice(0, 10)
            const yesterdayStr = new Date(today.getTime() - 86400000).toISOString().slice(0, 10)
            const dayBeforeYesterday = new Date(today)
            dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2)
            const dbyStr = dayBeforeYesterday.toISOString().slice(0, 10)

            const streakBroken1Day = lastStreakDate === dbyStr
            const alreadyRestored = lastStreakRestoreDate === yesterdayStr
            const streakActive = lastStreakDate === todayStr || lastStreakDate === yesterdayStr

            const canRestore = streakBroken1Day && !alreadyRestored
            const isBoostActive = diamondBoostUntil ? new Date(diamondBoostUntil) > new Date() : false

            // Soft hints
            let restoreHint: 'insufficient' | 'gap_too_large' | null = null
            let diamondsNeeded = 0
            if (!streakActive && !canRestore && lastStreakDate && lastStreakDate < dbyStr) {
              restoreHint = 'gap_too_large'
            } else if (canRestore && totalDiamonds < 3) {
              restoreHint = 'insufficient'
              diamondsNeeded = 3 - totalDiamonds
            }

            // Time hint: hours until end of today (when restore window closes)
            let restoreExpiresInHours: number | null = null
            if (canRestore && totalDiamonds >= 3) {
              const endOfToday = new Date(today)
              endOfToday.setHours(23, 59, 59, 999)
              restoreExpiresInHours = Math.max(1, Math.ceil((endOfToday.getTime() - today.getTime()) / (60 * 60 * 1000)))
            }

            return (
              <DiamondPanel
                totalDiamonds={totalDiamonds}
                canRestore={canRestore && totalDiamonds >= 3}
                boostActive={isBoostActive}
                restoreHint={restoreHint}
                diamondsNeeded={diamondsNeeded}
                streakDays={currentStreakDays ?? 0}
                restoreExpiresInHours={restoreExpiresInHours}
                freezeActive={!!(streakFrozenDate && streakFreezeExpiry && new Date(streakFreezeExpiry) > new Date())}
                freezeDate={streakFrozenDate ?? null}
                challengeState={(() => {
                  const weekStart = (() => { const d = new Date(); const day = d.getDay(); const diff = day === 0 ? 6 : day - 1; d.setDate(d.getDate() - diff); return d.toISOString().slice(0, 10) })()
                  const thisWeek = (ts: string | null | undefined) => ts ? ts.slice(0, 10) >= weekStart : false
                  if (thisWeek(weeklyChallengeCompletedAt)) return 'completed' as const
                  if (thisWeek(weeklyChallengeUnlockedAt)) return 'unlocked' as const
                  if ((totalDiamonds ?? 0) >= 7) return 'available' as const
                  return 'unavailable' as const
                })()}
                onStartChallengeSession={onStartWeeklyChallenge}
              />
            )
          })()}

          {/* Monthly study calendar */}
          <MiniCalendar completedDates={completedDates ?? []} />
        </div>
      </div>

      {/* ── Trial indicator (above CTA for context) ── */}
      {(() => {
        if (!trialEndsAt) return null
        const remainingMs = new Date(trialEndsAt).getTime() - Date.now()
        if (remainingMs <= 0) return null
        const HOURS_12 = 12 * 60 * 60 * 1000
        const HOURS_24 = 24 * 60 * 60 * 1000
        if (remainingMs <= HOURS_12) {
          const hours = Math.max(1, Math.ceil(remainingMs / (60 * 60 * 1000)))
          return (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-[#F97316] bg-orange-50 px-3 py-1.5">
              <span className="text-xs font-black text-[#F97316]">まもなく終了</span>
              <span className="text-[11px] font-bold text-orange-600">あと{hours}時間</span>
            </div>
          )
        }
        if (remainingMs <= HOURS_24) {
          return (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-[#F97316] bg-orange-50 px-3 py-1.5">
              <span className="text-xs font-bold text-[#F97316]">トライアル終了まであと1日</span>
            </div>
          )
        }
        const days = Math.ceil(remainingMs / (24 * 60 * 60 * 1000))
        return (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5">
            <span className="text-xs font-bold text-blue-800">無料トライアル中</span>
            <span className="text-[11px] text-blue-600">あと{days}日</span>
          </div>
        )
      })()}

      {/* ── CTA row (immediate action) ─────────────── */}
      {dueReviewCount != null && dueReviewCount > 0 ? (
        <div className="flex gap-3">
          <button type="button" onClick={() => onStartReview?.()} className="relative flex-1 cursor-pointer overflow-hidden rounded-[14px] border-2 border-amber-400 bg-white py-3.5 text-center font-black tracking-wide text-amber-700 transition hover:-translate-y-px hover:bg-amber-50 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2">
            <span className="text-base">復習してから始める</span>
            <span className="mt-0.5 block text-[10px] font-medium tracking-normal text-amber-500">約3分で完了</span>
          </button>
          <button type="button" onClick={onStart} aria-label={uiText.startButton} className="relative flex-1 cursor-pointer overflow-hidden rounded-[14px] bg-[#F5A623] py-3.5 text-center font-black tracking-wide text-white shadow-[0_4px_16px_rgba(245,166,35,0.35)] transition hover:-translate-y-px hover:bg-[#D4881A] hover:shadow-[0_6px_20px_rgba(245,166,35,0.4)] active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2">
            <span className="text-base">{uiText.startButton}</span>
            <span className="mt-0.5 block text-[10px] font-medium tracking-normal text-white/70">約3分で完了</span>
          </button>
        </div>
      ) : (
        <button type="button" onClick={onStart} aria-label={uiText.startButton} className="relative w-full cursor-pointer overflow-hidden rounded-[14px] bg-[#F5A623] py-3.5 text-center font-black tracking-wide text-white shadow-[0_4px_16px_rgba(245,166,35,0.35)] transition hover:-translate-y-px hover:bg-[#D4881A] hover:shadow-[0_6px_20px_rgba(245,166,35,0.4)] active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2">
          <span className="text-base">{uiText.startButton}</span>
          <span className="mt-0.5 block text-[10px] font-medium tracking-normal text-white/70">約3分で完了</span>
          <span aria-hidden="true" className="absolute right-5 top-1/2 -translate-y-1/2 text-sm opacity-70">▶</span>
        </button>
      )}

      {/* ── Review indicator (below CTA as context) ── */}
      {dueReviewCount != null && dueReviewCount > 0 && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5">
          <span className="text-xs font-bold text-amber-800">復習 {dueReviewCount}件</span>
          <span className="text-[11px] text-amber-600">今日の復習があります</span>
        </div>
      )}
    </div>
  )
}
