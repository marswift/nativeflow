'use client'

import Image from 'next/image'

export type LessonRankCardProps = {
  rankCode: string
  totalFlowPoints: number
  flowPointsToNextRank: number
}

function normalizeRankCode(rankCode: string): string {
  const normalized = rankCode.trim().toLowerCase()
  if (
    normalized === 'bronze' ||
    normalized === 'silver' ||
    normalized === 'gold' ||
    normalized === 'diamond'
  ) {
    return normalized
  }
  return 'starter'
}

function getRankLabel(rankCode: string): string {
  switch (rankCode) {
    case 'bronze':
      return 'ブロンズ'
    case 'silver':
      return 'シルバー'
    case 'gold':
      return 'ゴールド'
    case 'diamond':
      return 'ダイヤモンド'
    default:
      return 'スターター'
  }
}

function getRankTheme(rankCode: string) {
  switch (rankCode) {
    case 'bronze':
      return {
        outer:
          'border-[#c98b63] bg-[linear-gradient(135deg,#fff7f1_0%,#f4dfd2_52%,#ead0bf_100%)]',
        chip: 'bg-[#b87333] text-white',
        box: 'border-[#ddb89d] bg-white/75',
        sub: 'text-[#7a5a46]',
      }
    case 'silver':
      return {
        outer:
          'border-[#cfd6df] bg-[linear-gradient(135deg,#ffffff_0%,#eef2f6_48%,#dfe6ee_100%)]',
        chip: 'bg-[#94a3b8] text-white',
        box: 'border-[#d7dde5] bg-white/80',
        sub: 'text-[#5f6b7a]',
      }
    case 'gold':
      return {
        outer:
          'border-[#e0c36f] bg-[linear-gradient(135deg,#fffaf0_0%,#f8ebbe_48%,#efd980_100%)]',
        chip: 'bg-[#d4a017] text-white',
        box: 'border-[#ecd68c] bg-white/78',
        sub: 'text-[#7a6630]',
      }
    case 'diamond':
      return {
        outer:
          'border-[#8fd3ff] bg-[linear-gradient(135deg,#f7fcff_0%,#dff5ff_45%,#bfe9ff_100%)]',
        chip: 'bg-[#38bdf8] text-white',
        box: 'border-[#b7e7ff] bg-white/78',
        sub: 'text-[#35657d]',
      }
    default:
      return {
        outer:
          'border-[#e5dccf] bg-[linear-gradient(135deg,#fffdf9_0%,#f8f3ea_48%,#efe7da_100%)]',
        chip: 'bg-[#c7b59b] text-white',
        box: 'border-[#eadfce] bg-white/82',
        sub: 'text-[#7a6f62]',
      }
  }
}

function getRankImageSrc(rankCode: string): string {
  switch (rankCode) {
    case 'bronze':
      return '/images/characters/leo/rank/bronze.png'
    case 'silver':
      return '/images/characters/leo/rank/silver.png'
    case 'gold':
      return '/images/characters/leo/rank/gold.png'
    case 'diamond':
      return '/images/characters/leo/rank/diamond.png'
    default:
      return '/images/characters/leo/rank/starter.png'
  }
}

const uiText = {
  rankTitle: '現在のランク',
  description: '学習を続けるほど次のランクに近づきます。',
  flowPointLabel: '累計 Flow Point',
  nextRankLabel: '次のランクまで',
  maxLabel: '最大ランク',
}

export function LessonRankCard({
  rankCode,
  totalFlowPoints,
  flowPointsToNextRank,
}: LessonRankCardProps) {
  const safeRankCode = normalizeRankCode(rankCode)
  const rankLabel = getRankLabel(safeRankCode)
  const theme = getRankTheme(safeRankCode)
  const rankImageSrc = getRankImageSrc(safeRankCode)

  return (
    <section
      className={`rounded-[20px] border px-6 py-6 shadow-[0_10px_26px_rgba(15,23,42,0.08)] ${theme.outer}`}
      aria-label={`現在のランクカード: ${rankLabel}`}
    >
      <div className="flex items-center gap-5">
        <div className="relative h-[110px] w-[110px] shrink-0 overflow-hidden rounded-[20px] border border-white/70 bg-white/60 shadow-[0_6px_18px_rgba(0,0,0,0.08)]">
          <Image
            src={rankImageSrc}
            alt={`ランクキャラクター ${rankLabel}`}
            fill
            className="object-contain p-1"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div
            className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold tracking-[0.18em] ${theme.chip}`}
          >
            {uiText.rankTitle}
          </div>
          <p className="mt-2 text-xl font-black tracking-tight text-[#1a1a2e]">
            {rankLabel}
          </p>
          <p className={`mt-1 text-xs leading-5 ${theme.sub}`}>
            {uiText.description}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className={`rounded-[16px] border px-3 py-3 ${theme.box}`}>
          <p className="text-[10px] font-bold tracking-[0.16em] text-[#7b7b94]">
            {uiText.flowPointLabel}
          </p>
          <p className="mt-1 text-xl font-black text-[#1a1a2e]">
            {totalFlowPoints.toLocaleString()}
          </p>
        </div>

        <div className={`rounded-[16px] border px-3 py-3 ${theme.box}`}>
          <p className="text-[10px] font-bold tracking-[0.08em] text-[#7b7b94]">
            {uiText.nextRankLabel}
          </p>
          <p className="mt-1 text-lg font-black text-[#1a1a2e]">
            {flowPointsToNextRank === 0 ? uiText.maxLabel : `${flowPointsToNextRank} pt`}
          </p>
        </div>
      </div>
    </section>
  )
}