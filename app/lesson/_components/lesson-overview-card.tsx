'use client'

import Image from 'next/image'
import type { LessonCopy } from '../../../lib/lesson-copy'
import type { LessonSession } from '../../../lib/lesson-engine'
import { LessonRankCard } from './lesson-rank-card'


function StageCard({
  number,
  title,
  description,
}: {
  number: number
  title: string
  description: string
}) {
  return (
    <div className="rounded-[16px] border border-[#E8E4DF] bg-white px-4 py-4 shadow-[0_6px_20px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-[2px] hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-[#FFF0D4] text-sm font-black text-[#D4881A]">
          {number}
        </div>
        <p className="text-sm font-bold text-[#1a1a2e]">{title}</p>
      </div>
      <p className="text-xs leading-6 text-[#5a5a7a]">{description}</p>
    </div>
  )
}

function LessonMiniFeature({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="rounded-[16px] border border-[#E8E4DF] bg-white/90 px-4 py-3 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
      <p className="text-sm font-bold text-[#1a1a2e]">{title}</p>
      <p className="mt-1 text-xs leading-5 text-[#5a5a7a]">{description}</p>
    </div>
  )
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
}

/**
 * sceneLabel として渡された文字列が英語スラッグ形式（例: "daily life (en_gb_london)"）の場合、
 * フォールバックテキストを返す。
 * 日本語文字を含む or 短い英語スラッグでない場合はそのまま返す。
 */
function sanitizeSceneLabel(raw: string, fallback: string): string {
  // 日本語文字（ひらがな・カタカナ・漢字）を含む場合はそのまま使う
  if (/[\u3040-\u30ff\u4e00-\u9fff]/.test(raw)) return raw
  // ASCII英数字・スペース・記号のみで構成されていて30文字以上 → スラッグとみなしてフォールバック
  if (/^[\x20-\x7e]+$/.test(raw) && raw.length >= 20) return fallback
  return raw
}

export function LessonOverviewCard({
  lesson,
  copy,
  getLevelLabel,
  onStart,
  rankCode,
  totalFlowPoints,
  flowPointsToNextRank,
  targetLanguageLabel,
}: LessonOverviewCardProps) {
  const uiText = copy.overviewCard

  const overview = lesson as LessonSession & {
    overviewEstimatedMinutes?: number
    overviewStepCount?: number
    overviewSceneLabel?: string
    overviewSceneDescription?: string
    overviewCharacterName?: string
    overviewImageUrl?: string
    overviewBackgroundImageUrl?: string
  }

  const newPhraseCount = lesson.blocks.reduce((sum, block) => sum + block.items.length, 0)

  const estimatedMinutes =
    typeof overview.overviewEstimatedMinutes === 'number'
      ? overview.overviewEstimatedMinutes
      : lesson.totalEstimatedMinutes

  const estimatedTimeText = `${estimatedMinutes}${copy.block.estimatedSuffix}`
  const lessonTimeLabel = `${uiText.lessonTimeLabel}: ${estimatedTimeText}`

  const rawSceneLabel =
    typeof overview.overviewSceneLabel === 'string' && overview.overviewSceneLabel.trim().length > 0
      ? overview.overviewSceneLabel
      : uiText.defaultSceneLabel

  // 要件2: 英語スラッグ形式の sceneLabel を自然な日本語にフォールバック
  const sceneLabel = sanitizeSceneLabel(rawSceneLabel, uiText.defaultSceneLabel)

  const sceneDescription =
    typeof overview.overviewSceneDescription === 'string' &&
    overview.overviewSceneDescription.trim().length > 0
      ? overview.overviewSceneDescription
      : uiText.defaultSceneDescription

  const overviewCharacterName =
    typeof overview.overviewCharacterName === 'string' &&
    overview.overviewCharacterName.trim().length > 0
      ? overview.overviewCharacterName
      : 'Alex'

  const overviewImageUrl =
    typeof overview.overviewImageUrl === 'string' &&
    overview.overviewImageUrl.trim().length > 0
      ? overview.overviewImageUrl
      : '/images/characters/_placeholder.png'

  const overviewBackgroundImageUrl =
    typeof overview.overviewBackgroundImageUrl === 'string' &&
    overview.overviewBackgroundImageUrl.trim().length > 0
      ? overview.overviewBackgroundImageUrl
      : '/images/backgrounds/home.png'

  const overviewStepCount =
    typeof overview.overviewStepCount === 'number' && overview.overviewStepCount > 0
      ? Math.floor(overview.overviewStepCount)
      : 5

  const baseStages = [
    {
      title: '聞く',
      description: 'まずは今日の基本フレーズを聞いて、意味と音をつかみます。',
    },
    {
      title: 'リピートする',
      description: '声に出してまねしながら、自然な言い方を身体に入れます。',
    },
    {
      title: 'AIの質問に答える',
      description: '習った表現を使って、短く答える練習をします。',
    },
    {
      title: 'タイピングする',
      description: '実際に入力して、語順とスペルを定着させます。',
    },
    {
      title: 'AIと会話する',
      description: '今日の表現を使いながら、実践的なやり取りに進みます。',
    },
  ]

  let stages = baseStages.slice(0, overviewStepCount)

  if (overviewStepCount > baseStages.length) {
    stages = [
      ...baseStages,
      ...Array.from(
        { length: overviewStepCount - baseStages.length },
        (_, index) => ({
          title: `追加ステップ ${index + 1}`,
          description: 'このレッスン内容に応じた追加練習が入ります。',
        })
      ),
    ]
  }

  return (
    <div className="mt-8 space-y-5">
      <div className="relative overflow-hidden rounded-[24px] border border-[#E8E4DF] bg-[linear-gradient(135deg,#FFF9EC_0%,#FFFFFF_55%,#FFFDF8_100%)] px-6 py-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)] sm:px-7 sm:py-6">
        <span className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-[rgba(245,166,35,0.10)]" />
        <span className="pointer-events-none absolute bottom-[-20px] right-[60px] h-24 w-24 rounded-full bg-[rgba(245,166,35,0.07)]" />

        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.14]"
          style={{ backgroundImage: `url(${overviewBackgroundImageUrl})` }}
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,249,236,0.92)_0%,rgba(255,255,255,0.90)_55%,rgba(255,253,248,0.94)_100%)]" />
        <div className="relative z-10 grid gap-4 lg:grid-cols-[minmax(0,1fr)_348px]">
          <div className="flex min-w-0 flex-col gap-4">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[rgba(245,166,35,0.28)] bg-[rgba(245,166,35,0.14)] px-3 py-1 text-[13px] font-bold tracking-wide text-[#B7791F]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#F5A623]" />
              {uiText.headerBadge}
            </div>

            <h2 className="mb-2 text-[1.8rem] font-black leading-[1.15] text-[#1a1a2e]">
              {uiText.title}
            </h2>

            <div className="mb-2.5 flex flex-wrap gap-2">
              <span className="rounded-full border border-[#D9E8FF] bg-[#EEF6FF] px-3 py-1 text-xs font-bold text-[#2563EB]">
                {uiText.learningLanguage}: {targetLanguageLabel}
              </span>
              <span className="rounded-full border border-[#E8E4DF] bg-white px-3 py-1 text-xs text-[#5a5a7a]">
                {uiText.sceneLabel}: <strong className="text-[#1a1a2e]">{sceneLabel}</strong>
              </span>
              <span className="rounded-full border border-[#E8E4DF] bg-white px-3 py-1 text-xs text-[#5a5a7a]">
                {uiText.levelLabel}: <strong className="text-[#1a1a2e]">{getLevelLabel(lesson.level)}</strong>
              </span>
              <span className="rounded-full border border-[#E8E4DF] bg-white px-3 py-1 text-xs text-[#5a5a7a]">
                {lessonTimeLabel}
              </span>
              <span className="rounded-full border border-[#E8E4DF] bg-white px-3 py-1 text-xs text-[#5a5a7a]">
                {uiText.newPhraseLabel}: <strong className="text-[#1a1a2e]">{newPhraseCount}個</strong>
              </span>
            </div>

            <p className="text-sm leading-6 text-[#5a5a7a]">
              {sceneDescription}
              {' '}
              {uiText.practiceSummary}
            </p>
            <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
              <LessonMiniFeature
                title={uiText.featureSpeakTitle}
                description={uiText.featureSpeakDescription}
              />
              <LessonMiniFeature
                title={uiText.featureAnswerTitle}
                description={uiText.featureAnswerDescription}
              />
              <LessonMiniFeature
                title={uiText.featureConversationTitle}
                description={uiText.featureConversationDescription}
              />
            </div>

            <LessonRankCard
              rankCode={rankCode}
              totalFlowPoints={totalFlowPoints}
              flowPointsToNextRank={flowPointsToNextRank}
            />
          </div>

          <div className="relative z-10 flex h-full flex-col gap-5">
            <div className="flex min-h-[168px] flex-col items-center justify-center rounded-[20px] border border-[#E8E4DF] bg-white px-4 py-5 shadow-[0_6px_20px_rgba(15,23,42,0.04)]">
              <div className="relative h-[140px] w-[140px]">
                <Image
                  src={overviewImageUrl}
                  alt={`${overviewCharacterName}のレッスン案内イラスト`}
                  fill
                  sizes="140px"
                  className="object-contain"
                />
              </div>
              <p className="mt-3 text-xs font-bold tracking-[0.08em] text-[#7b7b94]">
                {overviewCharacterName}
              </p>
              <p className="mt-1 text-xs text-[#5a5a7a]">
                {uiText.guideText}
              </p>
            </div>

            <div className="rounded-[20px] border border-[#E8E4DF] bg-white px-5 py-6 flex-1">
              <div>
                <p className="text-[13px] font-bold tracking-[0.04em] text-[#7b7b94]">
                  {uiText.lessonStartLabel}
                </p>

                <p className="mt-2 text-[1.4rem] font-black leading-tight text-[#1a1a2e]">
                  {uiText.lessonStartTitle}
                </p>

                <p className="mt-3 text-sm leading-6 text-[#5a5a7a]">
                  {uiText.lessonStartDescription}
                </p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-[14px] bg-[#FAF7F2] px-3 py-3">
                  <p className="text-[11px] font-bold text-[#7b7b94]">{uiText.lessonTimeLabel}</p>
                  <p className="mt-1 text-sm font-bold text-[#1a1a2e]">{estimatedTimeText}</p>
                </div>
                <div className="rounded-[14px] bg-[#FAF7F2] px-3 py-3">
                  <p className="text-[11px] font-bold text-[#7b7b94]">{uiText.newPhraseLabel}</p>
                  <p className="mt-1 text-sm font-bold text-[#1a1a2e]">{newPhraseCount}個</p>
                </div>
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={onStart}
                  aria-label={uiText.startButton}
                  className="relative z-10 w-full cursor-pointer overflow-hidden rounded-[14px] bg-[#F5A623] py-4 text-base font-black tracking-wide text-white transition hover:-translate-y-px hover:bg-[#D4881A] active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
                >
                  {uiText.startButton}
                  <span
                    aria-hidden="true"
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-sm opacity-70"
                  >
                    ▶
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <p className="mb-3 pl-0.5 text-[13px] font-bold tracking-[0.04em] text-[#5a5a7a]">
          {uiText.stageSectionTitle}
        </p>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {stages.map((stage, index) => (
            <StageCard
              key={`${stage.title}-${index}`}
              number={index + 1}
              title={stage.title}
              description={stage.description}
            />
          ))}
        </div>
      </div>
    </div>
  )
}