'use client'

import type { LessonCopy } from '../../../lib/lesson-copy'
import type { LessonCompletionSummary } from '../../../lib/lesson-summary'

export type LessonCompletionCardProps = {
  summary: LessonCompletionSummary
  copy: LessonCopy
  totalFlowPoints: number
  earnedFlowPoints: number
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
      <p className="text-[11px] font-bold tracking-widest text-[#7b7b94]">
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
}: LessonCompletionCardProps) {
  const hasTypingStats = summary.totalTypingItems > 0
  const completionLine =
    `${copy.completion.completed} ${summary.completedItems} / ${summary.totalItems} · ` +
    `${copy.completion.progressPercent} ${summary.progressPercent}%`
  const typingLine =
    `${copy.completion.typing} ${summary.correctTypingItems} / ${summary.totalTypingItems}`

  const safeEarnedFlowPoints = Math.max(0, earnedFlowPoints)
  const flowPointMessage = getFlowPointMessage(safeEarnedFlowPoints)

  return (
    <section className="mt-6 overflow-hidden rounded-[24px] border border-[#DDEED8] bg-[linear-gradient(135deg,#F7FFF5_0%,#FFFFFF_55%,#F9FFF8_100%)] px-5 py-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#DDF7D8] text-xl font-black text-[#2F9E44]">
          ✓
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-lg font-black text-[#1a1a2e]">
            レッスン完了！
          </p>
          <p className="mt-1 text-sm text-[#5a5a7a]">
            {summary.completionMessage}
          </p>
          <p className="mt-2 text-xs font-medium text-[#7c7c7c]">
            {summary.theme}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-[18px] border border-[#DDEED8] bg-white px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold tracking-widest text-[#6A8F63]">
              獲得フローポイント
            </p>
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

        <p className="mt-2 text-xs leading-5 text-[#5a5a7a]">
          レッスンを続けるほど、Leoの成長に近づきます。
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <SummaryStatCard
          label="完了"
          value={`${summary.completedItems} / ${summary.totalItems}`}
        />
        <SummaryStatCard
          label="進捗"
          value={`${summary.progressPercent}%`}
        />
        <SummaryStatCard
          label="タイピング"
          value={
            hasTypingStats
              ? `${summary.correctTypingItems} / ${summary.totalTypingItems}`
              : 'なし'
          }
        />
      </div>

      <div className="mt-4 rounded-[16px] border border-[#E8E4DF] bg-white px-4 py-4">
        <p className="text-xs text-[#5c5c5c]">{completionLine}</p>
        {hasTypingStats && (
          <p className="mt-1 text-xs text-[#5c5c5c]">{typingLine}</p>
        )}
      </div>
    </section>
  )
}