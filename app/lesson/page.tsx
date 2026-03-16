'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { isFinalItem, type LessonProgressState } from '../../lib/lesson-progress'
import {
  getInitialRunState,
  checkTypingAnswer,
  getStats,
  getCompletionSummary,
} from '../../lib/lesson-runtime'
import { LESSON_COPY_JA, type LessonCopy } from '../../lib/lesson-copy'
import { startLessonRun } from '../../lib/lesson-run-service'
import { incrementDailyStats } from '../../lib/daily-stats-service'
import { loadLessonPage } from '../../lib/lesson-page-loader'
import { runLessonCompletionEffect } from '../../lib/lesson-run-effects'
import { executeNextStep } from '../../lib/lesson-run-next-step'
import type { LessonPageData } from '../../lib/lesson-page-data'
import { CURRENT_LEVEL_OPTIONS, type CurrentLevel } from '../../lib/constants'
import { LessonDebugPanels } from './_components/lesson-debug-panels'
import { LessonOverviewCard } from './_components/lesson-overview-card'
import { LessonBlockList } from './_components/lesson-block-list'
import { LessonActiveCard } from './_components/lesson-active-card'
import { LessonCompletionCard } from './_components/lesson-completion-card'

const SHOW_DEBUG_PANELS = process.env.NEXT_PUBLIC_LESSON_DEBUG === 'true'

const PAGE_SHELL_CLASS = 'min-h-screen flex flex-col bg-[#f7f4ef]'
const CONTAINER_CLASS = 'mx-auto max-w-md px-6 py-10 sm:py-12'
const CARD_CLASS = 'rounded-2xl border border-[#ede9e2] bg-white px-6 py-6 shadow-sm sm:px-8 sm:py-7'

function getLevelLabel(level: CurrentLevel): string {
  return CURRENT_LEVEL_OPTIONS.find((o) => o.value === level)?.label ?? level
}

function getPageDataParts(pageData: LessonPageData | null) {
  return {
    lesson: pageData?.lesson ?? null,
    lessonInput: pageData?.lessonInput ?? null,
    lessonSessionConfig: pageData?.lessonSessionConfig ?? null,
    lessonBlueprint: pageData?.lessonBlueprint ?? null,
    lessonBlueprintDraft: pageData?.lessonBlueprintDraft ?? null,
    lessonDraftSession: pageData?.lessonDraftSession ?? null,
    lessonAIPromptPayload: pageData?.lessonAIPromptPayload ?? null,
    lessonAIMessages: pageData?.lessonAIMessages ?? null,
  }
}

function getCurrentLessonPosition(
  lesson: LessonPageData['lesson'] | null,
  progress: LessonProgressState
) {
  const totalBlocks = lesson?.blocks?.length ?? 0
  const block =
    lesson != null && totalBlocks > 0 && progress.currentBlockIndex < totalBlocks
      ? lesson.blocks[progress.currentBlockIndex]
      : null
  const item =
    block != null && progress.currentItemIndex < block.items.length
      ? block.items[progress.currentItemIndex]
      : null

  return { totalBlocks, block, item }
}

function getPageErrorMessage(resultError: string | null, copy: LessonCopy): string {
  if (resultError === 'profile_load_failed') return copy.pageErrors.profileLoadFailed
  return copy.pageErrors.default
}

function BackToDashboardLink({
  copy,
  compact = false,
}: {
  copy: LessonCopy
  compact?: boolean
}) {
  return (
    <p className={compact ? 'mt-4 text-center' : 'mt-8 text-center'}>
      <Link
        href="/dashboard"
        className="text-sm font-medium text-amber-600 hover:text-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded"
      >
        {copy.buttons.backToDashboard}
      </Link>
    </p>
  )
}

type LessonProgressHeaderProps = {
  currentBlockIndex: number
  totalBlocks: number
  stats: {
    progressPercent: number
    completedItems: number
    totalItems: number
    totalTypingItems: number
    correctTypingItems: number
  }
  copy: LessonCopy
}

function LessonProgressHeader({
  currentBlockIndex,
  totalBlocks,
  stats,
  copy,
}: LessonProgressHeaderProps) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[#4a4a6a]">
      <span className="font-medium text-[#1a1a2e]">
        {currentBlockIndex + 1} / {totalBlocks}
      </span>
      <span>
        {copy.progress.progressPercent} {stats.progressPercent}% · {copy.progress.completed}{' '}
        {stats.completedItems}/{stats.totalItems}
        {stats.totalTypingItems > 0 && (
          <> · {copy.progress.typing} {stats.correctTypingItems}/{stats.totalTypingItems}</>
        )}
      </span>
    </div>
  )
}

function LessonSiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#ede9e2] bg-white">
      <div className="mx-auto flex h-16 max-w-[960px] items-center justify-between px-6 sm:px-10">
        <Link
          href="/"
          className="flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded-lg"
          aria-label="NativeFlow トップへ"
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
      </div>
    </header>
  )
}

function LessonFooter() {
  return (
    <footer className="border-t border-[#ede9e2] bg-white px-6 py-10 sm:px-10 sm:py-10">
      <div className="mx-auto grid max-w-[1140px] gap-10 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <Link
            href="/"
            className="mb-3.5 flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded"
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

export default function LessonPage() {
  const router = useRouter()
  const [pageData, setPageData] = useState<LessonPageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)
  const [started, setStarted] = useState(false)
  const [progress, setProgress] = useState<LessonProgressState>(
    () => getInitialRunState().progress
  )
  const [inputValue, setInputValue] = useState(() => getInitialRunState().inputValue)
  const [correctTypingCount, setCorrectTypingCount] = useState(
    () => getInitialRunState().correctTypingCount
  )
  const [userId, setUserId] = useState<string | null>(null)
  const [lessonRunId, setLessonRunId] = useState<string | null>(null)

  const copy = LESSON_COPY_JA

  const {
    lesson,
    lessonInput,
    lessonSessionConfig,
    lessonBlueprint,
    lessonBlueprintDraft,
    lessonDraftSession,
    lessonAIPromptPayload,
    lessonAIMessages,
  } = getPageDataParts(pageData)

  const { totalBlocks, block, item } = getCurrentLessonPosition(lesson, progress)
  const showCompleted = started && (progress.completed || block == null || item == null)

  useEffect(() => {
    let isActive = true

    async function load() {
      try {
        const result = await loadLessonPage()

        if ('redirect' in result) {
          if (isActive) setLoading(false)
          router.replace(result.redirect)
          return
        }

        if ('error' in result) {
          if (isActive) {
            setPageError(result.error)
            setLoading(false)
          }
          return
        }

        if (isActive) {
          setPageData(result.data.pageData)
          setUserId(result.data.userId)
          setCorrectTypingCount(0)
          setPageError(null)
        }
      } catch (err) {
        console.error(err)
        if (isActive) setPageError('load_failed')
      } finally {
        if (isActive) setLoading(false)
      }
    }

    load()
    return () => {
      isActive = false
    }
  }, [router])

  useEffect(() => {
    if (!showCompleted || lessonRunId == null) return
    const runId = lessonRunId
    const uid = userId
    setLessonRunId(null)
    runLessonCompletionEffect(runId, uid).catch(() => {})
  }, [showCompleted, lessonRunId, userId])

  function resetRunState() {
    const initial = getInitialRunState()
    setProgress(initial.progress)
    setInputValue(initial.inputValue)
    setCorrectTypingCount(initial.correctTypingCount)
  }

  function startLessonRunEffects(
    userId: string,
    lesson: NonNullable<LessonPageData['lesson']>
  ) {
    startLessonRun(userId, lesson).then((result) => {
      if (result.error) console.error('Lesson run start failed', result.error)
      else if (result.data?.id) setLessonRunId(result.data.id)
    })
    incrementDailyStats(userId, { lesson_runs_started: 1 }).then((result) => {
      if (result.error) console.error('Daily stats update failed', result.error)
    })
  }

  function applyTypingCheckResult(isCorrect: boolean, correctTypingDelta: 0 | 1) {
    setCorrectTypingCount((c) => c + correctTypingDelta)
    setProgress((prev) => ({
      ...prev,
      checked: true,
      isCorrect,
    }))
  }

  function handleStartLesson() {
    if (lesson == null || userId == null || started) return
    resetRunState()
    setStarted(true)
    startLessonRunEffects(userId, lesson)
  }

  function handleNext() {
    if (lesson == null || block == null || item == null) return
    const { nextProgress, nextInputValue } = executeNextStep({
      lesson,
      block,
      item,
      progress,
      inputValue,
      lessonRunId,
      userId,
      correctTypingCount,
    })
    setProgress(nextProgress)
    setInputValue(nextInputValue)
  }

  function handleCheck() {
    if (item == null) return
    const result = checkTypingAnswer(inputValue, item.answer ?? '')
    applyTypingCheckResult(result.isCorrect, result.correctTypingDelta)
  }

  if (loading) {
    return (
      <div
        className={PAGE_SHELL_CLASS}
        style={{ fontFamily: "'Nunito','Hiragino Sans',sans-serif" }}
      >
        <LessonSiteHeader />
        <main className="flex-1 flex items-center justify-center px-6 py-12">
          <div className={`w-full max-w-md ${CARD_CLASS} text-center`}>
            <p className="text-[#4a4a6a]" aria-live="polite">
              {copy.loading}
            </p>
          </div>
        </main>
        <LessonFooter />
      </div>
    )
  }

  if (lesson == null) {
    const errorMessage = getPageErrorMessage(pageError, copy)
    return (
      <div
        className={PAGE_SHELL_CLASS}
        style={{ fontFamily: "'Nunito','Hiragino Sans',sans-serif" }}
      >
        <LessonSiteHeader />
        <main className="flex-1 flex items-center justify-center px-6 py-12">
          <div className={`w-full max-w-md ${CARD_CLASS} text-center`}>
            <h2 className="text-lg font-semibold text-[#1a1a2e]">エラー</h2>
            <p className="mt-3 text-sm text-[#4a4a6a]">{errorMessage}</p>
            <BackToDashboardLink copy={copy} compact />
          </div>
        </main>
        <LessonFooter />
      </div>
    )
  }

  const isLessonComplete = isFinalItem(lesson, progress)
  const nextButtonLabel = isLessonComplete ? copy.buttons.complete : copy.buttons.next

  if (started) {
    const stats = getStats(lesson, progress, { correctTypingItems: correctTypingCount })
    const summary = showCompleted ? getCompletionSummary(lesson, stats) : null

    return (
      <div
        className={PAGE_SHELL_CLASS}
        style={{ fontFamily: "'Nunito','Hiragino Sans',sans-serif" }}
      >
        <LessonSiteHeader />
        <main className="flex-1">
          <div className={`${CONTAINER_CLASS} pt-8 sm:pt-10`}>
            <LessonProgressHeader
              currentBlockIndex={progress.currentBlockIndex}
              totalBlocks={totalBlocks}
              stats={stats}
              copy={copy}
            />

            {!showCompleted && block != null && item != null && (
              <LessonActiveCard
                block={block}
                item={item}
                progress={progress}
                inputValue={inputValue}
                onInputChange={setInputValue}
                onCheck={handleCheck}
                onNext={handleNext}
                copy={copy}
                isLessonComplete={isLessonComplete}
              />
            )}

            {!showCompleted && block != null && block.type !== 'typing' && (
              <button
                type="button"
                onClick={handleNext}
                className="mt-6 w-full rounded-xl border border-[#ede9e2] bg-white py-3.5 font-semibold text-[#1a1a2e] hover:bg-[#faf9f7] focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
              >
                {nextButtonLabel}
              </button>
            )}

            {showCompleted && summary != null && (
              <LessonCompletionCard summary={summary} copy={copy} />
            )}

            <BackToDashboardLink copy={copy} />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div
      className={PAGE_SHELL_CLASS}
      style={{ fontFamily: "'Nunito','Hiragino Sans',sans-serif" }}
    >
      <LessonSiteHeader />
      <main className="flex-1">
        <div className={CONTAINER_CLASS}>
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-[#1a1a2e] sm:text-3xl">
            {copy.intro.title}
          </h1>
          <p className="mt-2 text-sm text-[#4a4a6a]">
            {copy.intro.body1}
          </p>
          <p className="mt-3 text-sm font-medium text-[#1a1a2e]">
            {lesson.theme}
          </p>
          <p className="mt-1 text-xs text-[#4a4a6a]">
            想定{lesson.totalEstimatedMinutes}分 · {lesson.blocks.length}ブロック
          </p>

          <div className="mt-6">
            <button
              type="button"
              onClick={handleStartLesson}
              disabled={started}
              className="w-full rounded-xl bg-amber-500 py-3.5 font-semibold text-white shadow-sm hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-amber-500"
            >
              {copy.buttons.startLesson}
            </button>
          </div>

          <h2 className="mt-8 text-sm font-semibold text-[#1a1a2e]">
            レッスン内容
          </h2>
          <p className="mt-1 text-sm text-[#4a4a6a]">
            {copy.intro.body2}
          </p>

          <LessonOverviewCard lesson={lesson} copy={copy} getLevelLabel={getLevelLabel} />

          {SHOW_DEBUG_PANELS && (
            <LessonDebugPanels
              copy={copy}
              getLevelLabel={getLevelLabel}
              lessonInput={lessonInput}
              lessonSessionConfig={lessonSessionConfig}
              lessonBlueprint={lessonBlueprint}
              lessonBlueprintDraft={lessonBlueprintDraft}
              lessonDraftSession={lessonDraftSession}
              lessonAIPromptPayload={lessonAIPromptPayload}
              lessonAIMessages={lessonAIMessages}
            />
          )}

          <LessonBlockList blocks={lesson.blocks} copy={copy} />

          <BackToDashboardLink copy={copy} />
        </div>
      </main>
      <LessonFooter />
    </div>
  )
}
