'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { isFinalItem, type LessonProgressState } from '../../lib/lesson-progress'
import {
  getInitialRunState,
  checkTypingAnswer,
  getStats,
  getCompletionSummary,
  createLessonRuntimeStateFromSession,
  getCurrentLessonRuntimeBlock,
  submitLessonStageAnswer,
  advanceLessonStage,
  canAdvanceLessonStage,
  type LessonRuntimeEngineState,
  type LessonStageId,
} from '../../lib/lesson-runtime'
import { getLessonCopy, type LessonCopy } from '../../lib/lesson-copy'
import { startLessonRun } from '../../lib/lesson-run-service'
import { loadLessonPage } from '../../lib/lesson-page-loader'
import { runLessonCompletionEffect } from '../../lib/lesson-run-effects'
import { executeNextStep } from '../../lib/lesson-run-next-step'
import type { LessonPageData } from '../../lib/lesson-page-data'
import {
  CURRENT_LEVEL_OPTIONS,
  TARGET_LANGUAGE_FIXED,
  TARGET_LANGUAGE_OPTIONS,
  type CurrentLevel,
} from '../../lib/constants'
import { LessonDebugPanels } from './_components/lesson-debug-panels'
import { LessonOverviewCard } from './_components/lesson-overview-card'
import { LessonActiveCard } from './_components/lesson-active-card'
import { LessonCompletionCard } from './_components/lesson-completion-card'
import { getUserFlowPoints, awardLessonFlowPoints } from '../../lib/flow-point-service'
import AppHeader from '@/components/header/app-header'
import AppFooter from '@/components/footer/app-footer'
import { getUserRankProgress } from '../../lib/rank-service'
import { getSupabaseBrowserClient } from '../../lib/supabase/browser-client'

const supabase = getSupabaseBrowserClient()



const SHOW_DEBUG_PANELS = process.env.NEXT_PUBLIC_LESSON_DEBUG === 'true'
const LESSON_RUNTIME_STORAGE_KEY = 'nativeflow:lesson-runtime-state'

const PAGE_SHELL_CLASS = 'min-h-screen flex flex-col bg-[#f7f4ef]'
const CONTAINER_CLASS = 'mx-auto w-full max-w-[1040px] px-6 py-10 sm:px-8 sm:py-12'
const CARD_CLASS = 'rounded-2xl border border-[#ede9e2] bg-white px-6 py-6 shadow-sm sm:px-8 sm:py-7'

type PersistedLessonState = {
  userId: string
  lessonId: string
  started: boolean
  progress: LessonProgressState
  inputValue: string
  correctTypingCount: number
  runtimeState: LessonRuntimeEngineState | null
  lessonRunId: string | null
  earnedFlowPoints: number
  hasFinalizedLessonRun: boolean
  awardedStageKeys: string[]
}

function getLessonStorageLessonId(lesson: LessonPageData['lesson'] | null): string {
  if (!lesson) return ''
  return lesson.sessionId
}

function readPersistedLessonState(): PersistedLessonState | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.sessionStorage.getItem(LESSON_RUNTIME_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PersistedLessonState
  } catch (error) {
    console.error('Failed to read persisted lesson state', error)
    return null
  }
}

function clearPersistedLessonState() {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(LESSON_RUNTIME_STORAGE_KEY)
}

function writePersistedLessonState(value: PersistedLessonState) {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(LESSON_RUNTIME_STORAGE_KEY, JSON.stringify(value))
}

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

const STAGE_FLOW_POINT_MAP: Record<Exclude<LessonStageId, 'listen'>, number> = {
  repeat: 5,
  ai_question: 10,
  typing: 15,
  ai_conversation: 20,
}

function isRuntimeFinalStage(state: LessonRuntimeEngineState): boolean {
  return (
    !state.isCompleted &&
    state.currentBlockIndex === state.blocks.length - 1 &&
    state.currentStageId === 'ai_conversation'
  )
}

function getCurrentRuntimeStageAnswer(state: LessonRuntimeEngineState) {
  const currentBlockId = state.blocks[state.currentBlockIndex]?.id
  if (!currentBlockId) return null

  const matched = state.answers.filter(
    (answer) => answer.blockId === currentBlockId && answer.stageId === state.currentStageId
  )

  return matched.length > 0 ? matched[matched.length - 1] : null
}

function createUiProgressFromRuntime(
  prev: LessonProgressState,
  state: LessonRuntimeEngineState
): LessonProgressState {
  const latestStageAnswer = getCurrentRuntimeStageAnswer(state)

  return {
    ...prev,
    currentBlockIndex: state.currentBlockIndex,
    currentItemIndex: 0, // 固定でOK（stageでUIを切り替えるため）
    checked: latestStageAnswer != null,
    isCorrect: latestStageAnswer?.isCorrect ?? false,
    completed: state.isCompleted,
  }
}

function buildRuntimeStageSubmissionValue(input: {
  stageId: Exclude<LessonStageId, 'listen'>
  inputValue: string
  fallbackAnswer?: string | null
}): string {
  const trimmed = input.inputValue.trim()

  if (trimmed) return trimmed

  if (input.stageId === 'repeat') {
    return '[repeat-completed]'
  }

  if (input.stageId === 'ai_question') {
    return input.fallbackAnswer?.trim() || '[ai-question-completed]'
  }

  if (input.stageId === 'typing') {
    return input.fallbackAnswer?.trim() || ''
  }

  return '[ai-conversation-completed]'
}

function shouldShowStandaloneNextButton(input: {
  runtimeState: LessonRuntimeEngineState | null
  item: LessonPageData['lesson'] extends { blocks: Array<infer B> }
    ? B extends { items: Array<infer I> }
      ? I | null
      : null
    : null
  showCompleted: boolean
}): boolean {
  if (input.showCompleted) {
    return false
  }

  if (input.runtimeState != null) {
    if (input.runtimeState.currentStageId === 'typing') {
      return false
    }

    return true
  }

  if (input.item == null) {
    return false
  }

  return true
}

function getRuntimeStageAwardKey(
  state: LessonRuntimeEngineState,
  stageId: Exclude<LessonStageId, 'listen'>
): string | null {
  const blockId = state.blocks[state.currentBlockIndex]?.id
  if (!blockId) return null
  return `${blockId}:${stageId}`
}

function formatScoreChartDate(value: string): string {
  const date = new Date(value)
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${month}/${day}`
}

type ScoreHistoryItem = {
  id: string
  total_score: number
  created_at: string
}

function LessonScoreChart({ items }: { items: ScoreHistoryItem[] }) {
  const chartData = items
    .slice()
    .reverse()
    .map((item) => ({
      date: formatScoreChartDate(item.created_at),
      score: item.total_score,
    }))

  return (
    <div className="mt-4 h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 8, right: 12, left: -20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            fontSize={12}
          />
          <YAxis
            domain={[0, 100]}
            tickCount={6}
            tickLine={false}
            axisLine={false}
            fontSize={12}
          />
          <Tooltip
            formatter={(value: number) => [`${value}点`, 'スコア']}
            labelFormatter={(label) => `日付: ${label}`}
          />
          <Line
            type="monotone"
            dataKey="score"
            strokeWidth={3}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function LessonPage() {
  const router = useRouter()

  const [pageData, setPageData] = useState<LessonPageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)
  const [started, setStarted] = useState(false)
  const [progress, setProgress] = useState<LessonProgressState>(() => getInitialRunState().progress)
  const [inputValue, setInputValue] = useState(() => getInitialRunState().inputValue)
  const [correctTypingCount, setCorrectTypingCount] = useState(
    () => getInitialRunState().correctTypingCount
  )
  const [runtimeState, setRuntimeState] = useState<LessonRuntimeEngineState | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [lessonRunId, setLessonRunId] = useState<string | null>(null)
  const [totalFlowPoints, setTotalFlowPoints] = useState(0)
  const [rankCode, setRankCode] = useState<string>('starter')
  const [flowPointsToNextRank, setFlowPointsToNextRank] = useState(0)
  const [startErrorMessage, setStartErrorMessage] = useState<string | null>(null)
  const [startBlockedReason, setStartBlockedReason] = useState<string | null>(null)
  const [earnedFlowPoints, setEarnedFlowPoints] = useState(0)
  const [hasFinalizedLessonRun, setHasFinalizedLessonRun] = useState(false)
  const [scoreHistory, setScoreHistory] = useState<ScoreHistoryItem[]>([])
  const [repeatAutoStartNonce, setRepeatAutoStartNonce] = useState(0)
  const [showListenRepeatComplete, setShowListenRepeatComplete] = useState(false)
  const [listenResetNonce, setListenResetNonce] = useState(0)

  const isStartingLessonRef = useRef(false)
  const latestTotalFlowPointsRef = useRef(0)
  const awardedStageKeysRef = useRef<Set<string>>(new Set())

  const copy: LessonCopy = getLessonCopy(pageData?.uiLanguageCode)

  const targetLanguageLabel =
    TARGET_LANGUAGE_OPTIONS.find((option) => option.value === TARGET_LANGUAGE_FIXED)?.label ?? '英語'

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

  const { block, item } = getCurrentLessonPosition(lesson, progress)

  const showCompleted =
  started &&
  (runtimeState?.isCompleted === true ||
   progress.completed === true)

  const scoreSummary = useMemo(() => {
    if (scoreHistory.length === 0) {
      return null
    }

    const scores = scoreHistory.map((item) => item.total_score)
    const latest = scores[0]
    const max = Math.max(...scores)
    const avg = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)

    return { latest, max, avg }
  }, [scoreHistory])

  const refreshRankProgress = useCallback(async (userId: string) => {
    const rankProgressResult = await getUserRankProgress(userId)

    if (!rankProgressResult.error && rankProgressResult.data) {
      setRankCode(rankProgressResult.data.rankCode)
      setFlowPointsToNextRank(rankProgressResult.data.flowPointsToNextRank)
    }
  }, [])

  function resetRunState() {
    clearPersistedLessonState()

    const initial = getInitialRunState()

    setStarted(false)
    setProgress(initial.progress)
    setInputValue(initial.inputValue)
    setCorrectTypingCount(initial.correctTypingCount)
    setRuntimeState(null)
    setLessonRunId(null)
    setEarnedFlowPoints(0)
    setHasFinalizedLessonRun(false)
    awardedStageKeysRef.current = new Set()
    setStartErrorMessage(null)
    setStartBlockedReason(null)
  }

  async function handleLogout() {
    resetRunState()
    await supabase.auth.signOut()
    router.replace('/login')
    router.refresh()
  }

  const handleLogoutRef = useRef(handleLogout)

  useEffect(() => {
    handleLogoutRef.current = handleLogout
  }, [handleLogout])

  useEffect(() => {
    latestTotalFlowPointsRef.current = totalFlowPoints
  }, [totalFlowPoints])

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
          const nextPageData = result.data.pageData
          const nextUserId = result.data.userId

          setPageData(nextPageData)
          setUserId(nextUserId)

          const flowPointResult = await getUserFlowPoints(nextUserId)
          if (!isActive) return

          if (!flowPointResult.error) {
            setTotalFlowPoints(flowPointResult.data?.total_flow_points ?? 0)
          }

          await refreshRankProgress(nextUserId)
          if (!isActive) return

          const persisted = readPersistedLessonState()
          const currentLessonId = getLessonStorageLessonId(nextPageData.lesson)
          
          // 🔥 URLに resume フラグがある場合のみ復元
          const shouldResume =
            typeof window !== 'undefined' &&
            new URLSearchParams(window.location.search).get('resume') === 'true'
          
          if (
            persisted &&
            persisted.userId === nextUserId &&
            persisted.lessonId === currentLessonId &&
            persisted.started &&
            shouldResume
          ) {
            setProgress(persisted.progress)
            setInputValue(persisted.inputValue)
            setCorrectTypingCount(persisted.correctTypingCount)
            setRuntimeState(persisted.runtimeState)
            setLessonRunId(persisted.lessonRunId)
            setEarnedFlowPoints(persisted.earnedFlowPoints)
            setHasFinalizedLessonRun(persisted.hasFinalizedLessonRun)
            awardedStageKeysRef.current = new Set(persisted.awardedStageKeys)
            setStarted(true)
          } else {
            resetRunState()
          }

          setPageError(null)
        }
      } catch (error) {
        console.error(error)
        if (isActive) setPageError('load_failed')
      } finally {
        if (isActive) setLoading(false)
      }
    }

    load()

    return () => {
      isActive = false
    }
  }, [router, refreshRankProgress])

  useEffect(() => {
    if (!userId) return
  
    let isActive = true
  
    async function fetchScoreHistory() {
      const { data, error } = await supabase
        .from('pronunciation_scores')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5)
  
      if (!isActive) return
  
      if (error) {
        console.error('Failed to fetch score history', error)
        return
      }
  
      setScoreHistory(data ?? [])
    }
  
    fetchScoreHistory()
  
    return () => {
      isActive = false
    }
  }, [userId])
  
  useEffect(() => {
    if (!lesson || !userId) return
  
    if (runtimeState != null) {
      writePersistedLessonState({
        userId,
        lessonId: getLessonStorageLessonId(lesson),
        started: true,
        progress,
        inputValue,
        correctTypingCount,
        runtimeState,
        lessonRunId,
        earnedFlowPoints,
        hasFinalizedLessonRun,
        awardedStageKeys: Array.from(awardedStageKeysRef.current),
      })
    }
  
    if (showCompleted && hasFinalizedLessonRun) {
      clearPersistedLessonState()
    }
  }, [
    lesson,
    userId,
    runtimeState,
    showCompleted,
    progress,
    inputValue,
    correctTypingCount,
    lessonRunId,
    earnedFlowPoints,
    hasFinalizedLessonRun,
  ])

  useEffect(() => {
    if (!showCompleted || lessonRunId == null || userId == null || hasFinalizedLessonRun) return

    const runId = lessonRunId
    const uid = userId

    setHasFinalizedLessonRun(true)

    runLessonCompletionEffect(supabase, runId, uid)
      .then(async () => {
        if (typeof window !== 'undefined') {
        }

        clearPersistedLessonState()
        setLessonRunId(null)
        await refreshRankProgress(uid)
      })
      .catch((error) => {
        console.error('Lesson completion effect failed', error)
        setHasFinalizedLessonRun(false)
      })
  }, [showCompleted, lessonRunId, userId, hasFinalizedLessonRun, refreshRankProgress])

  useEffect(() => {
    if (runtimeState == null) return

    setProgress((prev) => createUiProgressFromRuntime(prev, runtimeState))
  }, [runtimeState])

  useEffect(() => {
    if (!started) {
      isStartingLessonRef.current = false
    }
  }, [started])

  useEffect(() => {
    if (!userId) return
  
    let timeoutId: ReturnType<typeof setTimeout>
  
    const LOGOUT_TIME = 30 * 60 * 1000 // 30分
  
    const resetTimer = () => {
      clearTimeout(timeoutId)
  
      let hasLoggedOut = false

      timeoutId = setTimeout(async () => {
        if (hasLoggedOut) return
        hasLoggedOut = true
      
        console.log('Auto logout (30min inactivity)')
        await handleLogoutRef.current()
      }, LOGOUT_TIME)
    }
  
    const events: (keyof WindowEventMap)[] = [
      'mousemove',
      'keydown',
      'click',
      'scroll',
      'touchstart',
    ]
  
    events.forEach((event) => window.addEventListener(event, resetTimer))
  
    resetTimer()
  
    return () => {
      clearTimeout(timeoutId)
      events.forEach((event) => window.removeEventListener(event, resetTimer))
    }
  }, [userId])
  
  function startLessonRunEffects(userId: string, lesson: NonNullable<LessonPageData['lesson']>) {
    startLessonRun(supabase, userId, lesson).then((result) => {
      if (result.error) {
        console.error('Lesson run start failed', result.error)
      } else {
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem('nf_lesson_active', '1')
        }

        if (result.data?.id) setLessonRunId(result.data.id)
      }
    })
  }

  async function awardRuntimeStageFlowPointsIfNeeded(
    state: LessonRuntimeEngineState,
    stageId: Exclude<LessonStageId, 'listen'>
  ) {
    if (!userId) return

    const awardKey = getRuntimeStageAwardKey(state, stageId)
    if (!awardKey) return

    if (awardedStageKeysRef.current.has(awardKey)) {
      return
    }

    const points = STAGE_FLOW_POINT_MAP[stageId] ?? 0
    if (points <= 0) return

    awardedStageKeysRef.current.add(awardKey)

    const previousTotalFlowPoints = latestTotalFlowPointsRef.current
    const awardResult = await awardLessonFlowPoints(userId, points)

    if (awardResult.error || !awardResult.data) {
      awardedStageKeysRef.current.delete(awardKey)
      console.error('Stage flow point award failed', {
        awardKey,
        userId,
        points,
        awardResult,
      })
      return
    }

    const latestTotal = awardResult.data.total_flow_points
    const awardedDelta = Math.max(0, latestTotal - previousTotalFlowPoints)

    setTotalFlowPoints(latestTotal)
    setEarnedFlowPoints((prev) => prev + awardedDelta)

    await refreshRankProgress(userId)
  }

  function applyTypingCheckResult(isCorrect: boolean, correctTypingDelta: 0 | 1) {
    setCorrectTypingCount((count) => count + correctTypingDelta)
    setProgress((prev) => ({
      ...prev,
      checked: true,
      isCorrect,
    }))
  }

  function handleBackToOverview() {
    setStarted(false)
    setShowListenRepeatComplete(false)
    setStartErrorMessage(null)
    setStartBlockedReason(null)
  
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('resume', 'true')
      window.history.replaceState(null, '', url.toString())
    }
  }
  
  function handleStartLesson() {
    console.log('handleStartLesson', {
      hasLesson: lesson != null,
      userId,
      started,
      isStarting: isStartingLessonRef.current,
    })
  
    if (lesson == null) {
      setStartBlockedReason('lesson が null のため開始できません。')
      return
    }
  
    if (userId == null) {
      setStartBlockedReason('userId が null のため開始できません。')
      return
    }
  
    if (started || isStartingLessonRef.current) {
      setStartBlockedReason('レッスン開始中です')
      return
    }
  
    if (runtimeState != null && !showCompleted) {
      setStarted(true)
      setShowListenRepeatComplete(false)
      setStartErrorMessage(null)
      setStartBlockedReason(null)
      return
    }
  
    const persisted = readPersistedLessonState()
    const currentLessonId = getLessonStorageLessonId(lesson)
  
    if (
      persisted &&
      persisted.userId === userId &&
      persisted.lessonId === currentLessonId &&
      persisted.started &&
      persisted.runtimeState != null &&
      persisted.hasFinalizedLessonRun === false
    ) {
      setProgress(persisted.progress)
      setInputValue(persisted.inputValue)
      setCorrectTypingCount(persisted.correctTypingCount)
      setRuntimeState(persisted.runtimeState)
      setLessonRunId(persisted.lessonRunId)
      setEarnedFlowPoints(persisted.earnedFlowPoints)
      setHasFinalizedLessonRun(persisted.hasFinalizedLessonRun)
      awardedStageKeysRef.current = new Set(persisted.awardedStageKeys)
      setStarted(true)
      setShowListenRepeatComplete(false)
      setStartErrorMessage(null)
      setStartBlockedReason(null)
  
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href)
        url.searchParams.set('resume', 'true')
        window.history.replaceState(null, '', url.toString())
      }
  
      return
    }
  
    if (isStartingLessonRef.current) {
      setStartBlockedReason('開始処理中フラグが残っているため開始できません。')
      return
    }
  
    isStartingLessonRef.current = true
    setStartErrorMessage(null)
    setStartBlockedReason(null)
  
    try {
      clearPersistedLessonState()
  
      const initial = getInitialRunState()
  
      setProgress(initial.progress)
      setInputValue('')
      setCorrectTypingCount(initial.correctTypingCount)
      setEarnedFlowPoints(0)
      setHasFinalizedLessonRun(false)
      setShowListenRepeatComplete(false)
      awardedStageKeysRef.current = new Set()
  
      const nextRuntimeState = createLessonRuntimeStateFromSession({
        session: lesson,
        userId,
      })
  
      console.log('createLessonRuntimeStateFromSession success', nextRuntimeState)
  
      setRuntimeState(nextRuntimeState)
      setStarted(true)
      setPageError(null)
  
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href)
        url.searchParams.set('resume', 'true')
        window.history.replaceState(null, '', url.toString())
      }
  
  } catch (error) {
      isStartingLessonRef.current = false
      console.error('Failed to start lesson', error)
      setPageError('load_failed')
      setStartErrorMessage('レッスンの開始に失敗しました。データ構造を確認してください。')
      setStarted(false)
      setRuntimeState(null)
      isStartingLessonRef.current = false
    }
  }

  function handleStartRepeatFromListen() {
    if (runtimeState == null) return
    if (runtimeState.currentStageId !== 'listen') return
  
    const result = advanceLessonStage(runtimeState)
    setRuntimeState(result.state)
    setInputValue('')
    setRepeatAutoStartNonce((prev) => prev + 1)
  }

  function handleRetryListenFromRepeat() {
    
    if (runtimeState == null) return
  
    const currentBlock = runtimeState.blocks[runtimeState.currentBlockIndex]
    if (!currentBlock) return
  
    setRuntimeState({
      ...runtimeState,
      currentStageId: 'listen',
      answers: runtimeState.answers.filter(
        (answer) =>
          !(
            answer.blockId === currentBlock.id &&
            (answer.stageId === 'repeat' || answer.stageId === 'listen')
          )
      ),
    })
  
    setInputValue('')
    setShowListenRepeatComplete(false)
    setListenResetNonce((prev) => prev + 1)
  }
  
  function handleAdvanceFromListenRepeatComplete() {
    if (runtimeState == null) return
    if (runtimeState.currentStageId !== 'repeat') return
  
    const result = advanceLessonStage(runtimeState)
    setRuntimeState(result.state)
    setInputValue('')
    setShowListenRepeatComplete(false)
  }

  function handleNext() {
    if (lesson == null || block == null || item == null) return
  
    if (runtimeState == null) {
      const { nextProgress, nextInputValue } = executeNextStep({
        supabase,
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
      return
    }
  
    let nextState = runtimeState
    const currentStageId = nextState.currentStageId
  
    // 1) listen は card 内の「録音開始」から repeat へ進むので、ここでは進めない
    if (currentStageId === 'listen') {
      return
    }
  
    // 2) repeat は card 内の採点完了・合格導線だけで進め、standalone next では進めない
    if (currentStageId === 'repeat') {
      const hasAnswered = inputValue.trim().length > 0

      if (!hasAnswered && !canAdvanceLessonStage(nextState)) {
        return
      }

      if (!canAdvanceLessonStage(nextState)) {
        const currentRuntimeBlock = getCurrentLessonRuntimeBlock(nextState)

        nextState = submitLessonStageAnswer(nextState, {
          stageId: 'repeat',
          blockId: currentRuntimeBlock.id,
          kind: 'repeat',
          value: buildRuntimeStageSubmissionValue({
            stageId: 'repeat',
            inputValue,
            fallbackAnswer: item.answer ?? null,
          }),
          isCorrect: null,
          feedback: null,
        })

        void awardRuntimeStageFlowPointsIfNeeded(nextState, 'repeat')
        setRuntimeState(nextState)
      }

      setShowListenRepeatComplete(true)
      return
    }
  
    // 3) 質問回答は1回のクリックで完了登録して次へ
    if (currentStageId === 'ai_question') {
      if (!canAdvanceLessonStage(nextState)) {
        const currentRuntimeBlock = getCurrentLessonRuntimeBlock(nextState)
  
        nextState = submitLessonStageAnswer(nextState, {
          stageId: 'ai_question',
          blockId: currentRuntimeBlock.id,
          kind: 'ai_question',
          value: buildRuntimeStageSubmissionValue({
            stageId: 'ai_question',
            inputValue,
            fallbackAnswer: item.answer ?? null,
          }),
          isCorrect: null,
          feedback: null,
        })
  
        void awardRuntimeStageFlowPointsIfNeeded(nextState, 'ai_question')
      }
  
      if (!canAdvanceLessonStage(nextState)) {
        return
      }
  
      const result = advanceLessonStage(nextState)
      setRuntimeState(result.state)
      setInputValue('')
      return
    }
  
    // 4) 書き取りはチェック完了まで進めない
    if (currentStageId === 'typing') {
      if (!canAdvanceLessonStage(nextState)) {
        return
      }
  
      const result = advanceLessonStage(nextState)
      setRuntimeState(result.state)
      setInputValue('')
      return
    }
  
    // 5) AI会話は完了登録してから完了へ
    if (currentStageId === 'ai_conversation') {
      if (!canAdvanceLessonStage(nextState)) {
        const currentRuntimeBlock = getCurrentLessonRuntimeBlock(nextState)
  
        nextState = submitLessonStageAnswer(nextState, {
          stageId: 'ai_conversation',
          blockId: currentRuntimeBlock.id,
          kind: 'ai_conversation',
          value: buildRuntimeStageSubmissionValue({
            stageId: 'ai_conversation',
            inputValue,
            fallbackAnswer: item.answer ?? null,
          }),
          isCorrect: null,
          feedback: null,
        })
  
        void awardRuntimeStageFlowPointsIfNeeded(nextState, 'ai_conversation')
      }
  
      if (!canAdvanceLessonStage(nextState)) {
        return
      }
  
      const result = advanceLessonStage(nextState)
      setRuntimeState(result.state)
      setInputValue('')
    }
  }

  function handleCheck() {
    if (item == null) return

    if (runtimeState != null) {
      if (runtimeState.currentStageId !== 'typing') {
        return
      }

      if (canAdvanceLessonStage(runtimeState)) {
        return
      }

      const result = checkTypingAnswer(inputValue, item.answer ?? '')
      const currentRuntimeBlock = getCurrentLessonRuntimeBlock(runtimeState)

      const nextState = submitLessonStageAnswer(runtimeState, {
        stageId: 'typing',
        blockId: currentRuntimeBlock.id,
        kind: 'typing',
        value: inputValue,
        isCorrect: result.isCorrect,
        feedback: result.isCorrect ? 'correct' : 'incorrect',
      })

      setRuntimeState(nextState)
      applyTypingCheckResult(result.isCorrect, result.correctTypingDelta)
      void awardRuntimeStageFlowPointsIfNeeded(nextState, 'typing')
      return
    }

    const result = checkTypingAnswer(inputValue, item.answer ?? '')
    applyTypingCheckResult(result.isCorrect, result.correctTypingDelta)
  }

  if (loading) {
    return (
      <div
        className={PAGE_SHELL_CLASS}
        style={{ fontFamily: "'Nunito','Hiragino Sans',sans-serif" }}
      >
        <AppHeader onLogout={handleLogout} currentLanguage={pageData?.lessonInput?.targetLanguageCode ?? 'en'} onChangeLanguage={() => {}} />
        <main className="flex-1 flex items-center justify-center px-6 py-12">
          <div className={`w-full max-w-md ${CARD_CLASS} text-center`}>
            <p className="text-[#4a4a6a]" aria-live="polite">
              {copy.loading}
            </p>
          </div>
        </main>
        <AppFooter />
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
        <AppHeader onLogout={handleLogout} currentLanguage={pageData?.lessonInput?.targetLanguageCode ?? 'en'} onChangeLanguage={() => {}} />
        <main className="flex-1 flex items-center justify-center px-6 py-12">
          <div className={`w-full max-w-md ${CARD_CLASS} text-center`}>
            <h2 className="text-lg font-semibold text-[#1a1a2e]">エラー</h2>
            <p className="mt-3 text-sm text-[#4a4a6a]">{errorMessage}</p>
          </div>
        </main>
        <AppFooter />
      </div>
    )
  }

  const isLessonComplete =
    runtimeState != null ? isRuntimeFinalStage(runtimeState) : isFinalItem(lesson, progress)

  const nextButtonLabel = isLessonComplete ? copy.buttons.complete : copy.buttons.next
  const showStandaloneNextButton =
    runtimeState?.currentStageId !== 'listen' &&
    runtimeState?.currentStageId !== 'repeat' &&
    !showListenRepeatComplete &&
    shouldShowStandaloneNextButton({
      runtimeState,
      item,
      showCompleted,
    })
  
  if (started) {
    const stats = getStats(lesson, progress, { correctTypingItems: correctTypingCount })
    const summary = showCompleted ? getCompletionSummary(lesson, stats) : null

    return (
      <div
        className={PAGE_SHELL_CLASS}
        style={{ fontFamily: "'Nunito','Hiragino Sans',sans-serif" }}
      >
        <AppHeader onLogout={handleLogout} currentLanguage={pageData?.lessonInput?.targetLanguageCode ?? 'en'} onChangeLanguage={() => {}} />
        <main className="flex-1">
          <div className={`${CONTAINER_CLASS} pt-8 sm:pt-10`}>
            {!showCompleted && !showListenRepeatComplete && block != null && item != null && (
              <>
                <div className="mb-4 flex justify-start">
                  <button
                    type="button"
                    onClick={handleBackToOverview}
                    className="cursor-pointer rounded-xl border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-bold text-[#4B5563] transition hover:bg-[#F9FAFB]"
                  >
                    ← レッスン案内へ戻る
                  </button>
                </div>
                <LessonActiveCard
                  block={block}
                  item={item}
                  progress={progress}
                  currentQuestionIndex={progress.currentBlockIndex ?? 0}
                  totalQuestions={lesson.blocks.length}
                  inputValue={inputValue}
                  onInputChange={setInputValue}
                  onCheck={handleCheck}
                  onStartRepeatFromListen={handleStartRepeatFromListen}
                  onRetryListenFromRepeat={handleRetryListenFromRepeat}
                  repeatAutoStartNonce={repeatAutoStartNonce}
                  listenResetNonce={listenResetNonce}
                  currentStageId={runtimeState?.currentStageId ?? null}
                  copy={copy}
                  isLessonComplete={isLessonComplete}
                  targetLanguageLabel="英語"
                  scenarioLabel="ビジネス"
                />
              </>
            )}

            {showStandaloneNextButton && (
              <button
                type="button"
                onClick={handleNext}
                className="mt-6 w-full cursor-pointer rounded-[16px] bg-[#F5A623] py-4 text-base font-bold text-white transition-all duration-200 hover:-translate-y-[2px] hover:bg-[#D4881A] hover:shadow-lg active:translate-y-[1px] active:shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
              >
                {nextButtonLabel}
              </button>
            )}

            {showListenRepeatComplete && (
              <div className="rounded-[24px] border border-[#E8E4DF] bg-white px-6 py-8 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
                <div className="mx-auto max-w-[680px] text-center">
                  <p className="text-[13px] font-bold tracking-[0.08em] text-[#7b7b94]">
                    LISTEN & REPEAT COMPLETE
                  </p>
                  <h2 className="mt-3 text-2xl font-black tracking-tight text-[#1a1a2e]">
                    今日の聞き取り・リピート練習は完了です
                  </h2>
                  <p className="mt-4 text-sm leading-7 text-[#5a5a7a]">
                    ここまでで、耳で聞いた音をそのまま口に出す練習ができました。
                    <br />
                    次は、AIからの質問に英語で返す練習へ進みましょう。
                  </p>

                  <div className="mt-6 flex justify-center">
                    <button
                      type="button"
                      onClick={handleAdvanceFromListenRepeatComplete}
                      className="cursor-pointer rounded-xl bg-[#F5A623] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#D4881A]"
                    >
                      次の練習に進む
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showCompleted && summary != null && (
              <LessonCompletionCard
                summary={summary}
                copy={copy}
                totalFlowPoints={totalFlowPoints}
                earnedFlowPoints={earnedFlowPoints}
              />
            )}
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
      <AppHeader onLogout={handleLogout} currentLanguage={pageData?.lessonInput?.targetLanguageCode ?? 'en'} onChangeLanguage={() => {}} />
      <main className="flex-1">
        <div className={CONTAINER_CLASS}>
        {/* 発音スコア履歴 */}
        {scoreHistory.length > 0 && scoreSummary != null && (
          <div className="mb-6 rounded-2xl border border-[#ede9e2] bg-white px-6 py-5 shadow-sm">
            <h3 className="mb-3 text-base font-bold text-[#1a1a2e]">
              発音スコア履歴
            </h3>

            <div className="mb-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#4a4a6a]">
              <div>
                最新: <span className="font-bold">{scoreSummary.latest}</span>
              </div>
              <div>
                最高: <span className="font-bold">{scoreSummary.max}</span>
              </div>
              <div>
                平均: <span className="font-bold">{scoreSummary.avg}</span>
              </div>
            </div>

            <LessonScoreChart items={scoreHistory} />

            <div className="mt-4 space-y-2">
              {scoreHistory.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between border-b pb-1 text-sm"
                >
                  <span className="text-[#6b7280]">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                  <span className="font-bold text-[#1a1a2e]">
                    {item.total_score}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
          <LessonOverviewCard
            lesson={lesson}
            copy={copy}
            getLevelLabel={getLevelLabel}
            onStart={handleStartLesson}
            rankCode={rankCode}
            totalFlowPoints={totalFlowPoints}
            flowPointsToNextRank={flowPointsToNextRank}
            targetLanguageLabel={targetLanguageLabel}
          />

          {startErrorMessage && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {startErrorMessage}
            </div>
          )}

          {startBlockedReason && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {startBlockedReason}
            </div>
          )}

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
        </div>
      </main>
      <AppFooter />
    </div>
  )
}
