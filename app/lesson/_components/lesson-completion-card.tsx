'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { LessonCopy } from '../../../lib/lesson-copy'
import type { LessonCompletionSummary } from '../../../lib/lesson-summary'

export type SpeakingProgress = {
  /** Number of speaking/repeat stage answers completed */
  speakingAttempts: number
  /** Number of AI question responses completed */
  aiResponses: number
  /** Number of scene blocks completed */
  scenesCompleted: number
  /** Current streak days */
  streakDays: number
}

export type LessonCompletionCardProps = {
  summary: LessonCompletionSummary
  copy: LessonCopy
  totalFlowPoints: number
  earnedFlowPoints: number
  onStartExtraSession?: () => void
  speakingProgress?: SpeakingProgress | null
  sceneIds?: string[]
}

const FUTURE_OUTCOME_MAP: Record<string, { ja: string; en: string }> = {
  wake_up: {
    ja: '続ければ、朝の過ごし方を自然に英語で話せるようになります。',
    en: 'Keep going, and talking about your morning routine will start to feel natural.',
  },
  eat_breakfast: {
    ja: '続ければ、朝食のことを自然な英語で伝えられるようになります。',
    en: "You're building the skill to talk about breakfast naturally in conversation.",
  },
  make_breakfast: {
    ja: '毎日の練習で、料理の話が英語でスムーズにできるようになります。',
    en: 'These phrases are helping you describe cooking and meals more smoothly.',
  },
  leave_home: {
    ja: '続ければ、出かける準備や通勤の話を英語で自然にできるようになります。',
    en: 'Keep practicing, and you\'ll talk about leaving home and commuting with ease.',
  },
  get_ready_to_leave: {
    ja: '続ければ、出発前のルーティンを英語で自然に話せるようになります。',
    en: 'Keep going, and describing your pre-departure routine will feel effortless.',
  },
  arrive_at_work: {
    ja: '続ければ、職場でのやりとりが英語でスムーズになります。',
    en: "You're building confidence for workplace conversations in English.",
  },
  greet_coworkers: {
    ja: '続ければ、同僚との挨拶や雑談が英語で自然にできるようになります。',
    en: 'Keep going, and casual greetings with coworkers will feel more natural.',
  },
  go_to_a_convenience_store: {
    ja: '続ければ、お店での買い物の会話が英語でスムーズにできるようになります。',
    en: "You're getting closer to handling store conversations confidently.",
  },
  talk_with_friends: {
    ja: '続ければ、友達との雑談を英語でもっと楽しめるようになります。',
    en: 'Keep practicing, and chatting with friends in English will feel more natural.',
  },
  go_home: {
    ja: '続ければ、帰宅後の過ごし方を英語で自然に話せるようになります。',
    en: 'These phrases help you talk about your evening routine more naturally.',
  },
  cook_dinner: {
    ja: '続ければ、夕食の準備について英語で自然に話せるようになります。',
    en: "You're building the vocabulary to describe dinner prep with confidence.",
  },
  go_to_bed: {
    ja: '続ければ、夜のルーティンを英語で自然に伝えられるようになります。',
    en: 'Keep going, and describing your bedtime routine will feel effortless.',
  },
}

const GENERIC_FUTURE_OUTCOME = {
  ja: '毎日のレッスンが、日常の英会話力を着実に伸ばしています。',
  en: 'Each lesson is steadily building your everyday speaking ability.',
}

function getFutureOutcome(sceneIds: string[], isJa: boolean): string {
  for (const id of sceneIds) {
    const entry = FUTURE_OUTCOME_MAP[id]
    if (entry) return isJa ? entry.ja : entry.en
  }
  return isJa ? GENERIC_FUTURE_OUTCOME.ja : GENERIC_FUTURE_OUTCOME.en
}

function SummaryStatCard({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-[16px] border border-[#E8E4DF] bg-[#FAF7F2] px-4 py-3">
      <p className="text-xs font-bold tracking-widest text-[#7b7b94]">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-[#1a1a2e]">{value}</p>
    </div>
  )
}

function getFlowPointMessage(earnedFlowPoints: number): string {
  if (earnedFlowPoints >= 30) {
    return '大きく前進しました。この調子で続けましょう。'
  }
  if (earnedFlowPoints >= 15) {
    return '着実に積み上がっています。次のランクが近づいています。'
  }
  if (earnedFlowPoints > 0) {
    return '少しずつでも前進です。続けることが力になります。'
  }
  return '今回はポイント加算はありませんが、学習の積み重ねは確実に前進です。'
}

/** Presentational card shown when the lesson is completed (summary stats). */
export function LessonCompletionCard({
  summary,
  copy,
  totalFlowPoints,
  earnedFlowPoints,
  onStartExtraSession,
  speakingProgress,
  sceneIds = [],
}: LessonCompletionCardProps) {
  const [showExtraConfirm, setShowExtraConfirm] = useState(false)

  const safeEarnedFlowPoints = Math.max(0, earnedFlowPoints)
  const flowPointMessage = getFlowPointMessage(safeEarnedFlowPoints)
  const cc = copy.completion

  return (
    <section className="mt-6 overflow-hidden rounded-[24px] border border-[#DDEED8] bg-[linear-gradient(135deg,#F7FFF5_0%,#FFFFFF_55%,#F9FFF8_100%)] px-5 py-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
      {/* --- Stop-first heading --- */}
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#DDF7D8] text-xl font-black text-[#2F9E44]">
          ✓
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-lg font-black text-[#1a1a2e]">
            {cc.stopFirstHeading}
          </p>
          <p className="mt-1 text-sm font-bold text-[#2F9E44]">
            {cc.stopFirstSubheading}
          </p>
          <p className="mt-2 text-xs text-[#7c7c7c]">
            {cc.stopFirstSupport}
          </p>
        </div>
      </div>

      {/* --- Flow points --- */}
      <div className="mt-5 rounded-[18px] border border-[#DDEED8] bg-white px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-widest text-[#6A8F63]">
              獲得フローポイント
            </p>
            <p className="mt-0.5 text-[10px] text-[#9ca3af]">成長ポイント — ランクに反映されます</p>
            <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
              <p className="text-3xl font-black leading-none text-[#2F9E44]">
                +{safeEarnedFlowPoints}
              </p>
              <p className="text-sm font-bold text-[#5a5a7a]">
                合計フローポイント: {totalFlowPoints.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <p className="mt-3 text-sm font-medium text-[#355b3f]">
          {flowPointMessage}
        </p>
      </div>

      {/* --- Speaking progress --- */}
      {speakingProgress && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryStatCard
            label="スピーキング"
            value={`${speakingProgress.speakingAttempts}回`}
          />
          <SummaryStatCard
            label="AI応答"
            value={`${speakingProgress.aiResponses}回`}
          />
          <SummaryStatCard
            label="シーン完了"
            value={`${speakingProgress.scenesCompleted}`}
          />
          <SummaryStatCard
            label="ストリーク"
            value={`${speakingProgress.streakDays}日`}
          />
        </div>
      )}

      {/* --- Lesson progress --- */}
      <div className="mt-4 rounded-[16px] border border-[#E8E4DF] bg-[#FAF7F2] px-4 py-3">
        <p className="text-xs text-[#5c5c5c]">
          {`レッスン完了 ${summary.completedItems} / ${summary.totalItems} · 進捗 ${summary.progressPercent}%`}
        </p>
      </div>

      {/* --- Confirm meaning --- */}
      {sceneIds && sceneIds.length > 0 && (
        <div className="mt-4 rounded-[16px] border border-[#E8E4DF] bg-[#FAF7F2] px-4 py-3">
          <p className="text-xs font-bold text-[#7b7b94]">
            {/[\u3000-\u9FFF]/.test(cc.stopFirstHeading) ? 'この表現について' : 'About this expression'}
          </p>
          <p className="mt-1 text-sm leading-6 text-[#5a5a7a]">
            {/[\u3000-\u9FFF]/.test(cc.stopFirstHeading)
              ? '意味を完璧に訳せなくても、場面の中でどう使われているかがわかれば十分です。繰り返し聞くことで、自然と使えるようになります。'
              : "You don't need a perfect translation. Understanding how the expression is used in context is enough. Repeated exposure will make it feel natural."}
          </p>
        </div>
      )}

      {/* --- Future outcome --- */}
      {sceneIds && sceneIds.length > 0 && (
        <div className="mt-4 rounded-[16px] border border-[#d4e8cf] bg-[#F7FFF5] px-4 py-3">
          <p className="text-sm font-medium leading-relaxed text-[#355b3f]">
            {getFutureOutcome(sceneIds, /[\u3000-\u9FFF]/.test(cc.stopFirstHeading))}
          </p>
        </div>
      )}

      {/* --- Button hierarchy --- */}
      <div className="mt-5 flex flex-col items-center gap-4">
        {/* Primary: stop and come back tomorrow */}
        <Link
          href="/dashboard"
          className="w-full max-w-[320px] rounded-xl bg-[#F5A623] py-4 text-center text-base font-bold text-white transition hover:bg-[#D4881A]"
        >
          {cc.primaryAction}
        </Link>

        {/* Secondary: extra session (visually weaker, but tappable) */}
        {!showExtraConfirm ? (
          <button
            type="button"
            onClick={() => setShowExtraConfirm(true)}
            className="inline-flex cursor-pointer items-center justify-center rounded-lg px-4 py-2.5 text-sm text-[#7b7b94] underline underline-offset-2 transition hover:bg-[#F3F4F6] hover:text-[#5a5a7a]"
          >
            {cc.secondaryAction}
          </button>
        ) : (
          <div className="w-full max-w-[320px] rounded-xl border border-[#E8E4DF] bg-white px-4 py-4 text-center">
            <p className="text-sm text-[#5a5a7a]">{cc.extraSessionConfirm}</p>
            <button
              type="button"
              onClick={() => onStartExtraSession?.()}
              className="mt-4 cursor-pointer rounded-xl bg-[#e0e0e0] px-6 py-3 text-sm font-bold text-[#4B5563] transition hover:bg-[#d0d0d0]"
            >
              {cc.secondaryAction}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}