'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { isFinalItem, type LessonProgressState } from '../../lib/lesson-progress'
import {
  getInitialRunState,
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
import { trackEvent } from '../../lib/analytics'
import { startLessonRun, saveLessonRunItem } from '../../lib/lesson-run-service'
import { createReviewItemIfMissing, markReviewCorrect, markReviewWrong } from '../../lib/review-items-repository'
import { buildReviewItemInsert } from '../../lib/review-items'
import { loadLessonPage, hydrateLessonAudio } from '../../lib/lesson-page-loader'
import { runLessonCompletionEffect } from '../../lib/lesson-run-effects'
import { getTodayStatDate } from '../../lib/daily-stats-service'
import { executeNextStep } from '../../lib/lesson-run-next-step'
import { fetchReviewItemsWithContent, injectReviewBlocks } from '../../lib/review-injection'
import { canStartLesson } from '../../lib/lesson-access'
import { type LessonPageData } from '../../lib/lesson-page-data'
import { DAILY_FLOW_BLOCKS } from '../../lib/daily-flow-config'
import { buildScenarioLabel } from '../../lib/lesson-blueprint-service'
import {
  CURRENT_LEVEL_OPTIONS,
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
import { useCurrentLanguage } from '@/lib/use-current-language'
import DailyLanguagePicker from '@/components/daily-language-picker'
import LpIcon from '@/components/lp-icon'
import { isDailyLanguageLocked, setDailyLanguageLock, getDailyLockedLanguage } from '../../lib/daily-language-lock'
import { getSelectedLanguages, type SelectedLanguage } from '../../lib/language-selection'
import { CachedLessonContentRepository, setLessonContentRepository } from '../../lib/lesson-content-repository'
import { SupabaseLessonContentRepository } from '../../lib/supabase-lesson-content-repository'

const supabase = getSupabaseBrowserClient()



const SHOW_DEBUG_PANELS = process.env.NEXT_PUBLIC_LESSON_DEBUG === 'true'
const LESSON_RUNTIME_STORAGE_KEY = 'nativeflow:lesson-runtime-state'
const NF_DAILY_FLOW_SELECTION_KEY = 'nf_daily_flow_selection'

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
    // Use localStorage so lesson state survives logout/login
    const raw = window.localStorage.getItem(LESSON_RUNTIME_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PersistedLessonState
  } catch (error) {
    console.error('Failed to read persisted lesson state', error)
    return null
  }
}

function clearPersistedLessonState() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(LESSON_RUNTIME_STORAGE_KEY)
}

function writePersistedLessonState(value: PersistedLessonState) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(LESSON_RUNTIME_STORAGE_KEY, JSON.stringify(value))
}

function clearDailyFlowSelection() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(NF_DAILY_FLOW_SELECTION_KEY)
}

function getLevelLabel(level: CurrentLevel): string {
  return CURRENT_LEVEL_OPTIONS.find((o) => o.value === level)?.label ?? level
}

const STALE_TYPING_PROMPT = 'Type the English sentence you heard or the key sentence for this scene.'

/** Strip known stale/invalid text from block.description; return empty string if invalid. */
function sanitizeScenarioLabel(raw: string | null | undefined): string {
  const s = raw?.trim() || ''
  if (!s) return ''
  if (s === STALE_TYPING_PROMPT) return ''
  // Reject purely-ASCII strings — valid scene labels contain Japanese characters
  if (!/[\u3000-\u9FFF]/.test(s)) return ''
  return s
}

/** Resolve a localized scene label from DAILY_FLOW_BLOCKS by sceneId. */
function getDailyFlowSceneLabel(sceneId: string | null | undefined, isJa: boolean): string | null {
  if (!sceneId) return null
  for (const block of DAILY_FLOW_BLOCKS) {
    const choice = block.choices.find((c) => c.sceneId === sceneId)
    if (choice) return isJa ? choice.label : choice.labelEn
  }
  return null
}

/** Walk backwards from the current block index to find the nearest block with a sceneId. */
function findNearestSceneLabel(
  blocks: { sceneId?: string | null }[],
  currentIndex: number,
  isJaUi: boolean,
): string | null {
  for (let i = currentIndex; i >= 0; i--) {
    const sid = blocks[i]?.sceneId
    if (sid) return getDailyFlowSceneLabel(sid, isJaUi) || buildScenarioLabel(sid)
  }
  return null
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
  scaffold_transition: 5,
  ai_question: 10,
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
    isCorrect: latestStageAnswer != null ? (latestStageAnswer.isCorrect ?? false) : null,
    completed: state.isCompleted,
  }
}

/** Normalize persisted runtime state — migrates removed stages to valid ones. */
const VALID_STAGES = new Set(['listen', 'repeat', 'scaffold_transition', 'ai_question', 'ai_conversation'])

function normalizePersistedRuntimeState(
  state: LessonRuntimeEngineState | null
): LessonRuntimeEngineState | null {
  if (!state) return null
  const stage = (state as { currentStageId: string }).currentStageId
  if (VALID_STAGES.has(stage)) return state
  // typing → ai_conversation (was the next stage after typing)
  if (stage === 'typing') return { ...state, currentStageId: 'ai_conversation' as LessonRuntimeEngineState['currentStageId'] }
  // Unknown stage → restart from listen
  return { ...state, currentStageId: 'listen' as LessonRuntimeEngineState['currentStageId'] }
}

const stageMap: Record<string, number> = {
  listen: 0,
  repeat: 1,
  scaffold_transition: 2,
  ai_question: 3,
  ai_conversation: 4,
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

  if (input.stageId === 'scaffold_transition') {
    return input.fallbackAnswer?.trim() || '[scaffold-transition-completed]'
  }

  if (input.stageId === 'ai_question') {
    return input.fallbackAnswer?.trim() || '[ai-question-completed]'
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

type ScoreHistoryItem = {
  id: string
  total_score: number
  created_at: string
}

import { computeForgettingCurveSchedule } from '../../lib/review-scheduling'

async function handleBlockCompleted(params: {
  completedBlockId: string
  state: LessonRuntimeEngineState
  sessionBlock: import('../../lib/lesson-engine').LessonBlock | null
  sessionItem: import('../../lib/lesson-engine').LessonBlockItem | null
  blockIndex: number
  userId: string | null
  lessonRunId: string | null
}) {
  const { completedBlockId, state, sessionBlock, sessionItem, blockIndex, userId, lessonRunId } = params
  if (!userId) return

  // Review block → score
  if (completedBlockId.startsWith('review-')) {
    const reviewItemId = completedBlockId.slice('review-'.length)
    if (!reviewItemId) return

    const typingAnswer = state.answers.find(
      (a) => a.blockId === completedBlockId && a.stageId === 'typing'
    )
    const isCorrect = typingAnswer?.isCorrect === true

    const { data: current } = await supabase
      .from('review_items')
      .select('correct_count, wrong_count')
      .eq('id', reviewItemId)
      .maybeSingle()
    if (!current) return

    // Phase 6.4: Ebbinghaus-style forgetting curve scheduling
    try {
      const correctCount = current.correct_count ?? 0
      const wrongCount = current.wrong_count ?? 0

      // Fetch next_review_at for overdue detection
      const { data: fullItem } = await supabase
        .from('review_items')
        .select('next_review_at')
        .eq('id', reviewItemId)
        .maybeSingle()

      const outcome = isCorrect ? 'success' as const : 'failure' as const
      const schedule = computeForgettingCurveSchedule({
        correctCount,
        wrongCount,
        nextReviewAt: (fullItem?.next_review_at as string | null) ?? null,
        outcome,
      })


      console.log('[Phase6.4][forgetting-curve][review]', {
        reviewItemId: reviewItemId.slice(0, 8),
        outcome,
        correctCount,
        wrongCount,
        derivedStage: schedule.derivedStage,
        nextStage: schedule.nextStage,
        intervalDays: schedule.intervalDays,
      })

      if (isCorrect) {
        await markReviewCorrect(supabase, reviewItemId, {
          correct_count: correctCount + 1,
          next_review_at: schedule.nextReviewAt,
        })
      } else {
        await markReviewWrong(supabase, reviewItemId, {
          wrong_count: wrongCount + 1,
          next_review_at: schedule.nextReviewAt,
        })
      }
    } catch {
      // Fallback: simple +1 day on failure, +3 day on success
      if (isCorrect) {
        const next = new Date()
        next.setDate(next.getDate() + 3)
        await markReviewCorrect(supabase, reviewItemId, {
          correct_count: (current.correct_count ?? 0) + 1,
          next_review_at: next.toISOString(),
        })
      } else {
        const next = new Date()
        next.setDate(next.getDate() + 1)
        await markReviewWrong(supabase, reviewItemId, {
          wrong_count: (current.wrong_count ?? 0) + 1,
          next_review_at: next.toISOString(),
        })
      }
    }
    return
  }

  // Normal block → persist item and seed review entry with performance-based scheduling
  if (!lessonRunId || !sessionBlock || !sessionItem) return

  // Extract performance from runtime state answers for this block
  const blockAnswers = state.answers.filter((a) => a.blockId === completedBlockId)
  const typingAnswer = blockAnswers.find((a) => a.stageId === 'typing')
  const repeatAnswer = blockAnswers.find((a) => a.stageId === 'repeat')
  const bestAnswer = typingAnswer ?? repeatAnswer ?? blockAnswers[blockAnswers.length - 1]
  const isCorrect = bestAnswer?.isCorrect ?? null

  const { data: runItem } = await saveLessonRunItem(supabase, {
    lesson_run_id: lessonRunId,
    user_id: userId,
    block: sessionBlock,
    item: sessionItem,
    block_index: blockIndex,
    item_index: 0,
    was_checked: true,
    is_correct: isCorrect,
    completed_at: new Date().toISOString(),
  })

  if (runItem?.id) {
    // Performance-based review scheduling
    const reviewInsert = buildReviewItemInsert({
      userId,
      stageId: typingAnswer ? 'typing' : repeatAnswer ? 'repeat' : null,
      result: bestAnswer
        ? { isCorrect: bestAnswer.isCorrect, phrase: sessionItem.answer }
        : null,
      currentBlock: { answer: sessionItem.answer, title: sessionBlock.title },
    })

    if (reviewInsert) {
      // Create review item with performance-based scheduling
      const { data: reviewItem } = await createReviewItemIfMissing(supabase, userId, runItem.id)
      if (reviewItem) {
        // Apply scheduling based on performance
        const { computeForgettingCurveSchedule } = await import('../../lib/review-scheduling')
        const outcome = reviewInsert.difficulty === 'hard' ? 'failure' as const : 'weak' as const
        const schedule = computeForgettingCurveSchedule({
          correctCount: reviewItem.correct_count ?? 0,
          wrongCount: reviewItem.wrong_count ?? 0,
          nextReviewAt: reviewItem.next_review_at,
          outcome,
        })
        if (outcome === 'failure') {
          await markReviewWrong(supabase, reviewItem.id, {
            wrong_count: (reviewItem.wrong_count ?? 0) + 1,
            next_review_at: schedule.nextReviewAt,
          })
        } else {
          await markReviewCorrect(supabase, reviewItem.id, {
            correct_count: (reviewItem.correct_count ?? 0) + 1,
            next_review_at: schedule.nextReviewAt,
          })
        }
      }
    }
    // Strong performance (reviewInsert === null) → skip review item creation
  }
}

type OnboardingStep = 'explanation' | 'mini_experience' | 'done'

function OnboardingExplanation({ onNext }: { onNext: () => void }) {
  return (
    <div className="mx-auto max-w-md px-6 py-16 text-center">
      <h1 className="text-2xl font-black leading-snug text-[#1a1a2e]">
        Just listen and repeat
      </h1>

      <div className="mt-8 space-y-4 text-left text-[15px] leading-7 text-[#4a4a6a]">
        <p className="flex items-start gap-2">
          <span className="mt-0.5 shrink-0 text-red-400">&#x2716;</span>
          <span>No translation required</span>
        </p>
        <p className="flex items-start gap-2">
          <span className="mt-0.5 shrink-0 text-green-500">&#x2714;</span>
          <span>Imitate the sounds directly</span>
        </p>
        <p className="pl-7 text-sm text-[#7b7b94]">
          It&apos;s OK not to understand at first
        </p>
        <p className="pl-7 text-sm text-[#7b7b94]">
          You&apos;ll get it after 3 tries
        </p>
      </div>

      <button
        type="button"
        onClick={onNext}
        className="mt-10 w-full cursor-pointer rounded-[14px] bg-[#F5A623] py-4 text-base font-black tracking-wide text-white transition hover:-translate-y-px hover:bg-[#D4881A] active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
      >
        Try it out
      </button>
    </div>
  )
}

function OnboardingMiniExperience({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<'idle' | 'playing' | 'played' | 'recording' | 'recorded' | 'feedback'>('idle')
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null)

  function handlePlay() {
    setPhase('playing')
    // Use Web Speech API for the tiny sample — no server round-trip needed
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance('You can do it')
      utterance.lang = 'en-US'
      utterance.rate = 0.85
      utterance.onend = () => setPhase('played')
      utterance.onerror = () => setPhase('played')
      synthRef.current = utterance
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(utterance)
    } else {
      // Fallback: skip to played after a short delay
      setTimeout(() => setPhase('played'), 1200)
    }
  }

  function handleRecord() {
    setPhase('recording')
    // Simulate a short recording period — onboarding must be guaranteed-success
    setTimeout(() => setPhase('feedback'), 2000)
  }

  useEffect(() => {
    if (phase === 'feedback') {
      const timer = setTimeout(onComplete, 1800)
      return () => clearTimeout(timer)
    }
  }, [phase, onComplete])

  return (
    <div className="mx-auto max-w-md px-6 py-16 text-center">
      <p className="text-sm font-bold tracking-[0.08em] text-[#7b7b94]">
        Let&apos;s try it
      </p>

      <h2 className="mt-4 text-3xl font-black text-[#1a1a2e]">
        &quot;You can do it&quot;
      </h2>

      <p className="mt-2 text-sm text-[#7b7b94]">
        You can do this
      </p>

      {phase === 'feedback' ? (
        <div className="mt-12">
          <p className="text-4xl font-black text-[#F5A623]">
            Nice!
          </p>
          <p className="mt-3 text-sm text-[#7b7b94]">
            Let&apos;s start the lesson
          </p>
        </div>
      ) : (
        <div className="mt-12 flex flex-col items-center gap-6">
          {/* Play button */}
          <button
            type="button"
            onClick={handlePlay}
            disabled={phase === 'playing'}
            className={`flex h-20 w-20 items-center justify-center rounded-full text-3xl transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 ${
              phase === 'playing'
                ? 'animate-pulse bg-[#FFF0D4] text-[#D4881A]'
                : phase === 'played' || phase === 'recording' || phase === 'recorded'
                  ? 'bg-[#E8E4DF] text-[#7b7b94] cursor-default'
                  : 'cursor-pointer bg-[#F5A623] text-white hover:bg-[#D4881A]'
            }`}
          >
            &#9654;
          </button>
          <p className="text-xs text-[#7b7b94]">
            {phase === 'idle' && "Let's listen first"}
            {phase === 'playing' && 'Playing...'}
            {(phase === 'played' || phase === 'recording' || phase === 'recorded') && 'Got it! Now try repeating'}
          </p>

          {/* Record button — appears after playback */}
          {(phase === 'played' || phase === 'recording' || phase === 'recorded') && (
            <button
              type="button"
              onClick={handleRecord}
              disabled={phase === 'recording'}
              className={`flex h-20 w-20 items-center justify-center rounded-full text-2xl transition focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 ${
                phase === 'recording'
                  ? 'animate-pulse bg-red-100 text-red-500'
                  : 'cursor-pointer bg-red-500 text-white hover:bg-red-600'
              }`}
            >
              &#9679;
            </button>
          )}
          {phase === 'recording' && (
            <p className="text-xs text-[#7b7b94]">Listening...</p>
          )}
        </div>
      )}
    </div>
  )
}

export default function LessonPage() {
  const { currentLanguage, handleChangeLanguage } = useCurrentLanguage()
  const router = useRouter()

  const [pageData, setPageData] = useState<LessonPageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)
  const [needsLanguagePick, setNeedsLanguagePick] = useState(false)
  const [selectedLanguages, setSelectedLanguages] = useState<SelectedLanguage[]>([])
  const [_audioReady, setAudioReady] = useState(false)
  const [started, setStarted] = useState(false)
  const [progress, setProgress] = useState<LessonProgressState>(() => getInitialRunState().progress)
  const [inputValue, setInputValue] = useState(() => getInitialRunState().inputValue)
  const [correctTypingCount, setCorrectTypingCount] = useState(
    () => getInitialRunState().correctTypingCount
  )
  const [runtimeState, setRuntimeState] = useState<LessonRuntimeEngineState | null>(null)
  const originalLessonRef = useRef<LessonPageData['lesson'] | null>(null)
  const isReviewActiveRef = useRef(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [lessonRunId, setLessonRunId] = useState<string | null>(null)
  const [lessonSaveWarning, setLessonSaveWarning] = useState<string | null>(null)
  const [totalFlowPoints, setTotalFlowPoints] = useState(0)
  const [rankCode, setRankCode] = useState<string>('starter')
  const [flowPointsToNextRank, setFlowPointsToNextRank] = useState(0)
  const [startErrorMessage, setStartErrorMessage] = useState<string | null>(null)
  const [startBlockedReason, setStartBlockedReason] = useState<string | null>(null)
  const [earnedFlowPoints, setEarnedFlowPoints] = useState(0)
  const [hasFinalizedLessonRun, setHasFinalizedLessonRun] = useState(false)
  const [isExtraSession, setIsExtraSession] = useState(false)
  const [scoreHistory, setScoreHistory] = useState<ScoreHistoryItem[]>([])
  const [dueReviewCount, setDueReviewCount] = useState(0)
  /** Pre-built review session prepared at page load. handleStartReview uses this exact object. */
  const preparedReviewSessionRef = useRef<ReturnType<typeof injectReviewBlocks> | null>(null)
  const [completedDates, setCompletedDates] = useState<string[]>([])
  const [repeatAutoStartNonce, setRepeatAutoStartNonce] = useState(0)
  const [showListenRepeatComplete, setShowListenRepeatComplete] = useState(false)
  const isWeeklyChallengeSessionRef = useRef(false)
  const [wasWeeklyChallenge, setWasWeeklyChallenge] = useState(false)
  const [weeklyHighlight, setWeeklyHighlight] = useState<{
    highlight: string
    encouragement: string
    directions: { label: string; direction: string }[]
    nextGoal: string | null
  } | null>(null)
  const lessonStartedAtRef = useRef<number>(0)
  const studyMinutesRecordedRef = useRef<number>(0)
  const [listenResetNonce, setListenResetNonce] = useState(0)
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep | null>(null)
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null)

  const isStartingLessonRef = useRef(false)
  const lastLoggedSessionIdRef = useRef<string | null>(null)
  const latestTotalFlowPointsRef = useRef(0)
  const awardedStageKeysRef = useRef<Set<string>>(new Set())

  const copy: LessonCopy = getLessonCopy(pageData?.uiLanguageCode)

  const trialEndsAt = pageData?.profile?.trial_ends_at ?? null

  const uiLanguageCode = pageData?.uiLanguageCode ?? 'ja'
  const isJaUi = uiLanguageCode.startsWith('ja')

  const targetLanguageLabel =
    TARGET_LANGUAGE_OPTIONS.find((option) => option.value === pageData?.lessonInput?.targetLanguageCode)?.label ?? '英語'

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

  const { block, item } = getCurrentLessonPosition(
    lesson,
    runtimeState
      ? { ...progress, currentBlockIndex: runtimeState.currentBlockIndex }
      : progress
  )

  // [DEBUG] content source trace
  if (started && runtimeState && block) {
    console.log('[content-source]', {
      theme: lesson?.theme,
      stageId: runtimeState.currentStageId,
      runtimeBlockIndex: runtimeState.currentBlockIndex,
      runtimeBlockId: runtimeState.blocks[runtimeState.currentBlockIndex]?.id,
      lessonBlockCount: lesson?.blocks?.length,
      renderedBlockId: block?.id,
      renderedBlockTitle: block?.title,
      renderedItemId: item?.id,
      renderedItemAnswer: item?.answer?.slice(0, 40),
      isReviewActive: isReviewActiveRef.current,
    })
  }

  const showCompleted =
  started &&
  (runtimeState?.isCompleted === true ||
   progress.completed === true)

  const currentStageIndex =
  runtimeState != null
  ? stageMap[runtimeState.currentStageId] ?? 0
  : 0
  
  const _scoreSummary = useMemo(() => {
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

  /** Reset in-memory UI state only (does NOT clear localStorage). Used by logout. */
  function resetRunStateMemory() {
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

  /** Full reset: clears localStorage + in-memory state. Used by completion/new session. */
  function resetRunState() {
    clearPersistedLessonState()
    clearDailyFlowSelection()
    resetRunStateMemory()
  }

  async function handleDailyLanguageChosen(languageCode: string) {
    try {
      setDailyLanguageLock(languageCode)
      // Switch current language if different
      if (languageCode !== currentLanguage) {
        await handleChangeLanguage(languageCode)
      }
      setNeedsLanguagePick(false)
      setLoading(true)
      // Reload to fetch lesson data for chosen language
      window.location.reload()
    } catch {
      setNeedsLanguagePick(false)
    }
  }

  async function handleLogout() {
    resetRunStateMemory()
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

          // Check if daily language picker is needed
          try {
            if (!isDailyLanguageLocked()) {
              const langs = await getSelectedLanguages(supabase, nextUserId)
              if (langs.length > 1) {
                setSelectedLanguages(langs)
                setNeedsLanguagePick(true)
                setLoading(false)
                return // Wait for language pick before continuing
              }
              // Single language — auto-lock
              if (langs.length === 1) {
                setDailyLanguageLock(langs[0].languageCode)
              }
            }
          } catch { /* non-blocking — continue without lock */ }

          // Clear any legacy daily flow selection from localStorage
          clearDailyFlowSelection()

          // Preload lesson content from DB (non-blocking, falls back to object catalog)
          try {
            const lesson = nextPageData.lesson
            if (lesson?.blocks) {
              const sceneKeys = [...new Set(lesson.blocks.map((b: { sceneId?: string | null }) => b.sceneId).filter((s): s is string => !!s))]
              if (sceneKeys.length > 0) {
                const level = lesson.level ?? 'beginner'
                const region = lesson.blocks[0]?.region ?? 'en_us_general'
                const ageGroup = lesson.blocks[0]?.ageGroup ?? '20s'
                const asyncRepo = new SupabaseLessonContentRepository(supabase)
                const cached = new CachedLessonContentRepository(asyncRepo)
                await cached.preload(sceneKeys, level, region, ageGroup)
                setLessonContentRepository(cached)
              }
            }
          } catch {
            // Non-blocking — object catalog fallback remains active
          }

          setPageData(nextPageData)
          setUserId(nextUserId)

          // Playtest: lesson start observation
          try {
            const lockedLang = getDailyLockedLanguage()
      
            console.log('[Playtest][lesson-start]', {
              lessonId: (nextPageData.lesson?.sessionId ?? 'unknown').slice(0, 12),
              targetLanguageCode: nextPageData.profile?.target_language_code ?? null,
              lockedLanguageCode: lockedLang,
              selectedLanguageCount: selectedLanguages.length || 1,
            })
          } catch { /* non-blocking */ }

          // Hydrate audio — mark ready when done so lesson start can proceed
          setAudioReady(false)
          hydrateLessonAudio(nextPageData.lesson).then((hydratedLesson) => {
            if (isActive && !isReviewActiveRef.current) {
              setPageData((prev) => prev ? { ...prev, lesson: hydratedLesson } : prev)
              setAudioReady(true)
            }
          }).catch(() => {
            if (isActive) setAudioReady(true) // allow start even if hydration fails
          })

          const flowPointResult = await getUserFlowPoints(supabase, nextUserId)
          if (!isActive) return

          if (!flowPointResult.error) {
            setTotalFlowPoints(flowPointResult.data?.total_flow_points ?? 0)
          }

          await refreshRankProgress(nextUserId)
          if (!isActive) return

          const persisted = readPersistedLessonState()
          const currentLessonId = getLessonStorageLessonId(nextPageData.lesson)

          if (
            persisted &&
            persisted.userId === nextUserId &&
            persisted.lessonId === currentLessonId &&
            persisted.started
          ) {
            setProgress(persisted.progress)
            setInputValue(persisted.inputValue)
            setCorrectTypingCount(persisted.correctTypingCount)
            setRuntimeState(normalizePersistedRuntimeState(persisted.runtimeState))
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

  // Check onboarding status after userId is available
  useEffect(() => {
    if (!userId) return
    let isActive = true

    async function checkOnboarding() {
      const { data } = await supabase
        .from('user_profiles')
        .select('onboarding_completed')
        .eq('id', userId)
        .single()

      if (!isActive) return

      const completed = data?.onboarding_completed === true
      if (completed) {
        setNeedsOnboarding(false)
      } else {
        // Skip full-screen onboarding gate — go straight to lesson
        setNeedsOnboarding(false)
        setOnboardingStep('done')
        // Mark onboarding as completed in DB
        supabase
          .from('user_profiles')
          .update({ onboarding_completed: true })
          .eq('id', userId)
          .then(() => {})
      }
    }

    checkOnboarding()

    return () => {
      isActive = false
    }
  }, [userId])

  // Pre-build the review session at page load.
  // handleStartReview reuses this exact session object — guarantees count match.
  useEffect(() => {
    if (!userId) return
    let cancelled = false

    ;(async () => {
      try {
        const sources = await fetchReviewItemsWithContent(supabase, userId)
        if (cancelled) return
        // Prepared review sessions need a stable id because lesson run startup
        // requires id/lessonId/sessionId. Use date-based id for daily stability.
        const today = new Date().toISOString().slice(0, 10)
        const session = injectReviewBlocks({
          id: `review-${userId}-${today}`,
          theme: 'Review Session',
          level: 'beginner' as const,
          totalEstimatedMinutes: sources.length,
          blocks: [],
        }, sources)
        preparedReviewSessionRef.current = session
        if (!cancelled) setDueReviewCount(session.blocks.length)
      } catch {
        preparedReviewSessionRef.current = null
        if (!cancelled) setDueReviewCount(0)
      }
    })()

    // Fetch completed study days for this month's calendar
    const d = new Date()
    const monthStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
    supabase
      .from('daily_stats')
      .select('stat_date')
      .eq('user_id', userId)
      .gte('stat_date', monthStart)
      .then(({ data }: { data: { stat_date: string }[] | null }) => {
        if (!cancelled && data) {
          setCompletedDates(data.map((r) => r.stat_date))
        }
      })
      .catch(() => {})

    return () => { cancelled = true }
  }, [userId])

  // Preload first 2 blocks immediately; lazy-load ahead as user progresses
  const currentBlockIdx = runtimeState?.currentBlockIndex ?? 0

  useEffect(() => {
    if (!lesson) return
    // Preload current block + next 2 blocks (lookahead window)
    const startIdx = Math.max(0, currentBlockIdx)
    const endIdx = Math.min(lesson.blocks.length, startIdx + 3)
    const links: HTMLLinkElement[] = []

    for (let i = startIdx; i < endIdx; i++) {
      for (const item of lesson.blocks[i].items) {
        const url = (item as Record<string, unknown>).audio_url as string | undefined
          ?? (item as Record<string, unknown>).audioUrl as string | undefined
        if (!url || document.querySelector(`link[href="${url}"]`)) continue
        const link = document.createElement('link')
        link.rel = 'preload'
        link.as = 'fetch'
        link.crossOrigin = 'anonymous'
        link.href = url
        document.head.appendChild(link)
        links.push(link)
      }
    }

    return () => { links.forEach((l) => l.remove()) }
  }, [lesson, currentBlockIdx])

  const handleOnboardingComplete = useCallback(async () => {
    setOnboardingStep('done')
    setNeedsOnboarding(false)

    if (userId) {
      await supabase
        .from('user_profiles')
        .update({ onboarding_completed: true })
        .eq('id', userId)
    }
  }, [userId])

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
      clearDailyFlowSelection()
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
    if (!showCompleted || userId == null || hasFinalizedLessonRun) return

    if (lessonRunId == null) {
      // Progress save failed at start — warn user so they know completion was not recorded
      setLessonSaveWarning('進捗の保存に失敗したため、今回の結果は記録されませんでした。ページを再読み込みして再度お試しください。')
      return
    }

    const runId = lessonRunId
    const uid = userId

    setHasFinalizedLessonRun(true)

    // Playtest: lesson complete observation
    try {

      console.log('[Playtest][lesson-complete]', {
        lessonId: (pageData?.lesson?.sessionId ?? 'unknown').slice(0, 12),
        completed: true,
        targetLanguageCode: pageData?.profile?.target_language_code ?? null,
      })
    } catch { /* non-blocking */ }

    // Mark study time as handled so unmount handler won't double-count
    studyMinutesRecordedRef.current = 999999

    runLessonCompletionEffect(supabase, runId, uid)
      .then(async () => {
        lessonStartedAtRef.current = 0

        // Complete weekly challenge if this was a challenge session
        if (isWeeklyChallengeSessionRef.current) {
          isWeeklyChallengeSessionRef.current = false
          try {
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.access_token) {
              await fetch('/api/diamonds/weekly-challenge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                body: JSON.stringify({ action: 'complete' }),
              })
            }

            // Compute weekly growth highlight with progression
            const { computeWeeklyHighlight, buildWeeklySnapshot } = await import('../../lib/weekly-highlight')
            const weekStart = (() => { const d = new Date(); const day = d.getDay(); d.setDate(d.getDate() - (day === 0 ? 6 : day - 1)); return d.toISOString().slice(0, 10) })()
            const prevWeekStart = (() => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10) })()

            const [statsRes, pronRes, pronPrevRes, reviewRes, snapshotRes] = await Promise.all([
              supabase.from('daily_stats').select('lesson_runs_completed, typing_items_correct').eq('user_id', uid).gte('stat_date', weekStart),
              supabase.from('pronunciation_scores').select('total_score').eq('user_id', uid).gte('created_at', weekStart + 'T00:00:00'),
              supabase.from('pronunciation_scores').select('total_score').eq('user_id', uid).gte('created_at', prevWeekStart + 'T00:00:00').lt('created_at', weekStart + 'T00:00:00'),
              supabase.from('review_items').select('correct_count').eq('user_id', uid).gte('last_reviewed_at', weekStart + 'T00:00:00'),
              supabase.from('user_profiles').select('weekly_snapshot').eq('id', uid).maybeSingle(),
            ])

            const lessonsCompleted = (statsRes.data ?? []).reduce((s: number, r: { lesson_runs_completed: number }) => s + (r.lesson_runs_completed ?? 0), 0)
            const typingCorrect = (statsRes.data ?? []).reduce((s: number, r: { typing_items_correct: number }) => s + (r.typing_items_correct ?? 0), 0)
            const pronScores = (pronRes.data ?? []).map((r: { total_score: number }) => r.total_score).filter((s: number) => s >= 0)
            const pronPrevScores = (pronPrevRes.data ?? []).map((r: { total_score: number }) => r.total_score).filter((s: number) => s >= 0)
            const pronAvg = pronScores.length > 0 ? pronScores.reduce((a: number, b: number) => a + b, 0) / pronScores.length : null
            const pronPrevAvg = pronPrevScores.length > 0 ? pronPrevScores.reduce((a: number, b: number) => a + b, 0) / pronPrevScores.length : null
            const reviewsCorrect = (reviewRes.data ?? []).filter((r: { correct_count: number }) => (r.correct_count ?? 0) > 0).length

            const weeklyStats = { pronAvg, pronPrevAvg, typingCorrect, lessonsCompleted, reviewsCorrect }
            const prevSnapshot = (snapshotRes.data?.weekly_snapshot as Record<string, unknown> | null) ?? null

            setWeeklyHighlight(computeWeeklyHighlight(weeklyStats, prevSnapshot as import('../../lib/weekly-highlight').WeeklySnapshot | null))

            // Save this week's snapshot for next week's comparison
            await supabase.from('user_profiles').update({
              weekly_snapshot: buildWeeklySnapshot(weeklyStats, weekStart),
            }).eq('id', uid)
          } catch { /* non-blocking */ }
        }

        clearPersistedLessonState()
        clearDailyFlowSelection()
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

  // Inactivity logout is handled globally by components/session-timeout.tsx

  // ── Study time recording on page leave / lesson abandon ──
  // Records elapsed study minutes when the user navigates away without formally completing.
  // Uses refs to avoid stale closure issues with beforeunload.
  const lessonRunIdRef = useRef<string | null>(null)
  const userIdRef = useRef<string | null>(null)
  const hasFinalizedRef = useRef(false)
  const runtimeStageRef = useRef<string | null>(null)
  const runtimeBlockIdxRef = useRef(0)
  const abandonLoggedSessionRef = useRef<string | null>(null)

  useEffect(() => { lessonRunIdRef.current = lessonRunId }, [lessonRunId])
  useEffect(() => { userIdRef.current = userId }, [userId])
  useEffect(() => { hasFinalizedRef.current = hasFinalizedLessonRun }, [hasFinalizedLessonRun])
  const prevBlockIdxRef = useRef<number>(0)
  const prevStageIdRef = useRef<string | null>(null)
  useEffect(() => {
    const newBlockIdx = runtimeState?.currentBlockIndex ?? 0
    const newStageId = runtimeState?.currentStageId ?? null

    runtimeStageRef.current = newStageId
    runtimeBlockIdxRef.current = newBlockIdx

    // Auto-scroll to top when block or stage changes
    if (
      (newBlockIdx !== prevBlockIdxRef.current || newStageId !== prevStageIdRef.current) &&
      (prevBlockIdxRef.current !== 0 || prevStageIdRef.current !== null)
    ) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    prevBlockIdxRef.current = newBlockIdx
    prevStageIdRef.current = newStageId
  }, [runtimeState])

  useEffect(() => {
    function recordStudyTimeOnLeave() {
      const startedAt = lessonStartedAtRef.current
      const uid = userIdRef.current
      const runId = lessonRunIdRef.current
      if (!uid || !startedAt || startedAt === 0 || hasFinalizedRef.current) return

      const MAX_SESSION_MINUTES = 60
      const rawElapsed = Math.max(1, Math.floor((Date.now() - startedAt) / 60000))
      const elapsedMinutes = Math.min(rawElapsed, MAX_SESSION_MINUTES)
      const alreadyRecorded = studyMinutesRecordedRef.current
      const delta = Math.max(0, elapsedMinutes - alreadyRecorded)
      if (delta <= 0) return

      // Use sendBeacon for reliability during page unload
      const payload = JSON.stringify({
        userId: uid,
        lessonRunId: runId,
        studyMinutes: delta,
        statDate: getTodayStatDate(),
      })
      navigator.sendBeacon('/api/lesson/study-time', payload)
      studyMinutesRecordedRef.current = elapsedMinutes

      // Log lesson_abandoned_before_audio if lesson started but still on first listen
      const startedSessionId = lastLoggedSessionIdRef.current
      if (
        startedSessionId &&
        abandonLoggedSessionRef.current !== startedSessionId &&
        runtimeStageRef.current === 'listen' &&
        runtimeBlockIdxRef.current === 0
      ) {
        abandonLoggedSessionRef.current = startedSessionId
        navigator.sendBeacon('/api/track', JSON.stringify({
          event: 'lesson_abandoned_before_audio',
          properties: {
            user_id: uid,
            lesson_run_id: runId,
            session_id: startedSessionId,
            stage_id: 'listen',
            block_id: null,
            scene_key: null,
            occurred_at: new Date().toISOString(),
          },
        }))
      }
    }

    window.addEventListener('beforeunload', recordStudyTimeOnLeave)
    return () => {
      window.removeEventListener('beforeunload', recordStudyTimeOnLeave)
      // Also fire on component unmount (SPA navigation)
      recordStudyTimeOnLeave()
    }
  }, [])

  function startLessonRunEffects(userId: string, lesson: NonNullable<LessonPageData['lesson']>) {
    console.log('[debug] startLessonRunEffects called', { userId, blockCount: lesson.blocks?.length, sessionId: (lesson as Record<string, unknown>).sessionId })
    startLessonRun(supabase, userId, lesson).then((result) => {
      console.log('[debug] startLessonRun result', { ok: !result.error, id: result.data?.id, error: result.error?.message })
      if (result.error) {
        console.error('Lesson run start failed', result.error)
        setLessonSaveWarning('学習は続けられますが、進捗保存に失敗しました。通信環境を確認してください。')
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

    const basePoints = STAGE_FLOW_POINT_MAP[stageId] ?? 0
    const points = isExtraSession ? Math.floor(basePoints * 0.5) : basePoints
    if (points <= 0) return

    awardedStageKeysRef.current.add(awardKey)

    const previousTotalFlowPoints = latestTotalFlowPointsRef.current
    const awardResult = await awardLessonFlowPoints(supabase, userId, points)

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

  function _applyTypingCheckResult(isCorrect: boolean, correctTypingDelta: 0 | 1) {
    setCorrectTypingCount((count) => count + correctTypingDelta)
    setProgress((prev) => ({
      ...prev,
      checked: true,
      isCorrect,
    }))
  }

  function _handleBackToOverview() {
    setStarted(false)
    setRuntimeState(null)
    setShowListenRepeatComplete(false)
    setStartErrorMessage(null)
    setStartBlockedReason(null)
    clearPersistedLessonState()
    // Restore original lesson if it was swapped for review
    isReviewActiveRef.current = false
    const savedLesson = originalLessonRef.current
    originalLessonRef.current = null
    if (savedLesson) {
      setPageData((prev) => prev ? { ...prev, lesson: savedLesson } : prev)
    }
  
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('resume', 'true')
      window.history.replaceState(null, '', url.toString())
    }
  }
  
  async function handleStartReview() {
    if (!userId) return
    if (started || isStartingLessonRef.current) return

    const reviewAccess = canStartLesson(pageData?.profile ?? {})
    if (!reviewAccess.allowed) {
      setStartBlockedReason('subscription_required')
      return
    }

    isStartingLessonRef.current = true
    setStartErrorMessage(null)
    setStartBlockedReason(null)

    try {
      // Use the pre-built review session (same object that determined lesson top count).
      // Only rebuild if the prepared session is unavailable (e.g. page was idle too long).
      let reviewSession = preparedReviewSessionRef.current
      if (!reviewSession || reviewSession.blocks.length === 0) {
        const sources = await fetchReviewItemsWithContent(supabase, userId)
        if (sources.length === 0) {
          setStartBlockedReason('No review items available')
          isStartingLessonRef.current = false
          return
        }
        const fallbackToday = new Date().toISOString().slice(0, 10)
        reviewSession = injectReviewBlocks({
          id: `review-${userId}-${fallbackToday}`,
          theme: 'Review Session',
          level: 'beginner' as const,
          totalEstimatedMinutes: sources.length,
          blocks: [],
        }, sources)
      }
      // Clear prepared session after use so next review fetches fresh data
      preparedReviewSessionRef.current = null

      if (reviewSession.blocks.length === 0) {
        setStartBlockedReason('No review items available')
        isStartingLessonRef.current = false
        return
      }

      clearPersistedLessonState()

      console.log('[click-review] reviewSession', {
        sessionId: (reviewSession as Record<string, unknown>).sessionId,
        theme: reviewSession.theme,
        blockCount: reviewSession.blocks.length,
        blocks: reviewSession.blocks.map((b) => ({ type: b.type, title: b.title, itemCount: b.items.length })),
      })

      const initial = getInitialRunState()
      setProgress(initial.progress)
      setInputValue('')
      setCorrectTypingCount(initial.correctTypingCount)
      setEarnedFlowPoints(0)
      setHasFinalizedLessonRun(false)
      setShowListenRepeatComplete(false)
      awardedStageKeysRef.current = new Set()

      const nextRuntimeState = createLessonRuntimeStateFromSession({
        session: reviewSession,
        userId,
      })

      console.log('[click-review] runtimeState created', {
        blockCount: nextRuntimeState.blocks.length,
        currentStageId: nextRuntimeState.currentStageId,
        firstBlocks: nextRuntimeState.blocks.slice(0, 3).map((b) => ({ id: b.id, phraseText: b.phraseText?.slice(0, 40) })),
      })

      // Swap lesson content to review session so the renderer uses review blocks
      if (pageData?.lesson) originalLessonRef.current = pageData.lesson
      isReviewActiveRef.current = true
      const reviewAsLesson = reviewSession as unknown as LessonPageData['lesson']

      // Hydrate audio for review items BEFORE starting — review items have no pre-existing audio_url,
      // so hydration must complete before the user enters the Listen stage.
      let hydratedReview = reviewAsLesson
      try {
        const hydrated = await hydrateLessonAudio(reviewAsLesson as Parameters<typeof hydrateLessonAudio>[0])
        if (isReviewActiveRef.current) {
          hydratedReview = hydrated as unknown as LessonPageData['lesson']
        }
      } catch {
        // eslint-disable-next-line no-console
        console.warn('[review] Audio hydration failed — review will start without audio')
      }
      setPageData((prev) => prev ? { ...prev, lesson: hydratedReview } : prev)

      startLessonRunEffects(userId, hydratedReview as NonNullable<LessonPageData['lesson']>)
      setRuntimeState(nextRuntimeState)
      lessonStartedAtRef.current = Date.now()
      studyMinutesRecordedRef.current = 0
      setStarted(true)
      setPageError(null)
      trackEvent('lesson_start', { blockCount: reviewSession.blocks.length })
    } catch (error) {
      console.error('Failed to start review', error instanceof Error ? error.message : error, error)
      setStartErrorMessage(`Failed to start review: ${error instanceof Error ? error.message : 'unknown'}`)
      setStarted(false)
      setRuntimeState(null)
    } finally {
      isStartingLessonRef.current = false
    }
  }

  async function handleStartWeeklyChallenge() {
    if (!userId) return
    if (started || isStartingLessonRef.current) return

    const challengeAccess = canStartLesson(pageData?.profile ?? {})
    if (!challengeAccess.allowed) {
      setStartBlockedReason('subscription_required')
      return
    }

    isStartingLessonRef.current = true
    setStartErrorMessage(null)
    setStartBlockedReason(null)

    try {
      const sources = await fetchReviewItemsWithContent(supabase, userId, 3)

      if (sources.length === 0) {
        setStartBlockedReason('No review items available')
        isStartingLessonRef.current = false
        return
      }

      clearPersistedLessonState()

      const baseSession = {
        sessionId: `weekly-review-${Date.now()}`,
        theme: 'Weekly Review Challenge',
        level: 'beginner' as const,
        totalEstimatedMinutes: sources.length,
        blocks: [],
      }
      const reviewSession = injectReviewBlocks(baseSession, sources)

      const initial = getInitialRunState()
      setProgress(initial.progress)
      setInputValue('')
      setCorrectTypingCount(initial.correctTypingCount)
      setEarnedFlowPoints(0)
      setHasFinalizedLessonRun(false)
      setShowListenRepeatComplete(false)
      awardedStageKeysRef.current = new Set()
      isWeeklyChallengeSessionRef.current = true
      setWasWeeklyChallenge(true)

      const nextRuntimeState = createLessonRuntimeStateFromSession({
        session: reviewSession,
        userId,
      })

      if (pageData?.lesson) originalLessonRef.current = pageData.lesson
      const weeklyAsLesson = reviewSession as unknown as LessonPageData['lesson']
      isReviewActiveRef.current = true
      setPageData((prev) => prev ? { ...prev, lesson: weeklyAsLesson } : prev)

      hydrateLessonAudio(weeklyAsLesson as Parameters<typeof hydrateLessonAudio>[0]).then((hydrated) => {
        if (isReviewActiveRef.current) {
          setPageData((prev) => prev ? { ...prev, lesson: hydrated as unknown as LessonPageData['lesson'] } : prev)
        }
      }).catch(() => { /* non-blocking */ })

      startLessonRunEffects(userId, weeklyAsLesson as NonNullable<LessonPageData['lesson']>)
      setRuntimeState(nextRuntimeState)
      lessonStartedAtRef.current = Date.now()
      studyMinutesRecordedRef.current = 0
      setStarted(true)
      setPageError(null)
      trackEvent('lesson_start', { blockCount: reviewSession.blocks.length })
    } catch (error) {
      console.error('Failed to start weekly challenge', error)
      setStartErrorMessage('Failed to start the challenge')
      setStarted(false)
      setRuntimeState(null)
    } finally {
      isStartingLessonRef.current = false
    }
  }

  /** Fire lesson_start_clicked exactly once per logical session (dedup by session_id). */
  function logLessonStartClicked() {
    const sessionId = lesson?.id ?? (lesson as Record<string, unknown> | null)?.sessionId as string ?? ''
    if (!sessionId || lastLoggedSessionIdRef.current === sessionId) return
    lastLoggedSessionIdRef.current = sessionId

    const payload = {
      event: 'lesson_start_clicked',
      properties: {
        user_id: userId ?? null,
        lesson_run_id: lessonRunId ?? null,
        session_id: sessionId,
        stage_id: runtimeState?.currentStageId ?? null,
        block_id: runtimeState?.blocks?.[runtimeState?.currentBlockIndex ?? 0]?.id ?? null,
        scene_key: block?.sceneId ?? null,
        occurred_at: new Date().toISOString(),
      },
    }

    try {
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {})
    } catch { /* fire-and-forget */ }
  }

  function handleStartLesson() {
    console.log('[click-start-lesson] entry', {
      lessonSessionId: (lesson as Record<string, unknown> | null)?.sessionId,
      lessonBlockCount: lesson?.blocks?.length,
      lessonBlocks: lesson?.blocks?.map((b) => ({ type: b.type, title: b.title, itemCount: b.items.length })),
      runtimeStateExists: runtimeState != null,
      started,
      showCompleted,
    })

    const access = canStartLesson(pageData?.profile ?? {})
    if (!access.allowed) {
      setStartBlockedReason('subscription_required')
      return
    }

    if (lesson == null) {
      setStartBlockedReason('Cannot start: lesson data is missing.')
      return
    }

    if (userId == null) {
      setStartBlockedReason('Cannot start: user ID is missing.')
      return
    }
  
    if (started || isStartingLessonRef.current) {
      setStartBlockedReason('Lesson is starting...')
      return
    }

    // Audio preloading is non-blocking — lesson starts immediately
    // Audio element uses preload="auto" to ensure instant playback when user presses play

    if (runtimeState != null && !showCompleted) {
      if (lessonStartedAtRef.current === 0) lessonStartedAtRef.current = Date.now()
      logLessonStartClicked()
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
      setRuntimeState(normalizePersistedRuntimeState(persisted.runtimeState))
      setLessonRunId(persisted.lessonRunId)
      setEarnedFlowPoints(persisted.earnedFlowPoints)
      setHasFinalizedLessonRun(persisted.hasFinalizedLessonRun)
      awardedStageKeysRef.current = new Set(persisted.awardedStageKeys)
      if (lessonStartedAtRef.current === 0) lessonStartedAtRef.current = Date.now()
      studyMinutesRecordedRef.current = 0
      logLessonStartClicked()
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
      setStartBlockedReason('Cannot start: a previous start is still in progress.')
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
  
      console.log('[debug] creating runtime state', { sessionId: (lesson as Record<string, unknown>).sessionId, blockCount: lesson.blocks.length, itemCounts: lesson.blocks.map(b => b.items.length) })
      const nextRuntimeState = createLessonRuntimeStateFromSession({
        session: lesson,
        userId,
      })
      console.log('[debug] runtime state created', { blockCount: nextRuntimeState.blocks.length, currentStageId: nextRuntimeState.currentStageId })

      startLessonRunEffects(userId, lesson)
      setRuntimeState(nextRuntimeState)
      lessonStartedAtRef.current = Date.now()
      studyMinutesRecordedRef.current = 0
      logLessonStartClicked()
      setStarted(true)
      setPageError(null)
      trackEvent('lesson_start', { blockCount: lesson.blocks.length })

      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href)
        url.searchParams.set('resume', 'true')
        window.history.replaceState(null, '', url.toString())
      }

  } catch (error) {
      console.error('Failed to start lesson', error instanceof Error ? error.message : error, error)
      setPageError('load_failed')
      setStartErrorMessage(`Failed to start: ${error instanceof Error ? error.message : 'unknown'}`)
      setStarted(false)
      setRuntimeState(null)
    } finally {
      isStartingLessonRef.current = false
    }
  }

  function handleStartExtraSession() {
    setIsExtraSession(true)
    // Clear persisted state so the reload fetches a fresh lesson
    clearPersistedLessonState()
    clearDailyFlowSelection()
    isStartingLessonRef.current = false
    // Full reload — ensures fresh lesson data from server
    window.location.reload()
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

  function handleRetryListenFromScaffold() {
    if (runtimeState == null) return
    if (runtimeState.currentStageId !== 'scaffold_transition') return

    const currentBlock = runtimeState.blocks[runtimeState.currentBlockIndex]
    if (!currentBlock) return

    setRuntimeState({
      ...runtimeState,
      currentStageId: 'repeat',
      answers: runtimeState.answers.filter(
        (answer) =>
          !(
            answer.blockId === currentBlock.id &&
            (answer.stageId === 'repeat' || answer.stageId === 'scaffold_transition')
          )
      ),
    })

    setInputValue('')
    setShowListenRepeatComplete(false)
    // Trigger repeat state reset in the active card
    setListenResetNonce((prev) => prev + 1)
  }

  function handleGoBackToStage(targetStageId: 'repeat' | 'scaffold_transition' | 'ai_question' | 'ai_conversation') {
    if (runtimeState == null) return
    setRuntimeState({
      ...runtimeState,
      currentStageId: targetStageId,
    })
    setInputValue('')
  }

  function handleAdvanceFromListenRepeatComplete() {
    if (runtimeState == null) return
    if (runtimeState.currentStageId !== 'repeat') return

    let state = runtimeState
    if (!canAdvanceLessonStage(state)) {
      const currentRuntimeBlock = getCurrentLessonRuntimeBlock(state)
      state = submitLessonStageAnswer(state, {
        stageId: 'repeat',
        blockId: currentRuntimeBlock.id,
        kind: 'repeat',
        value: '[skipped]',
        isCorrect: null,
        feedback: null,
      })
    }

    const result = advanceLessonStage(state)
    setRuntimeState(result.state)
    setInputValue('')
    setShowListenRepeatComplete(false)
  }

  const handleNext = useCallback(() => {
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
      }

      if (canAdvanceLessonStage(nextState)) {
        const result = advanceLessonStage(nextState)
        setRuntimeState(result.state)
        setInputValue('')
      } else {
        setRuntimeState(nextState)
      }
      return
    }
  
    // 3) 段階翻訳は1回のクリックで完了登録して次へ
    if (currentStageId === 'scaffold_transition') {
      if (!canAdvanceLessonStage(nextState)) {
        const currentRuntimeBlock = getCurrentLessonRuntimeBlock(nextState)

        nextState = submitLessonStageAnswer(nextState, {
          stageId: 'scaffold_transition',
          blockId: currentRuntimeBlock.id,
          kind: 'scaffold_transition',
          value: buildRuntimeStageSubmissionValue({
            stageId: 'scaffold_transition',
            inputValue,
            fallbackAnswer: item.answer ?? null,
          }),
          isCorrect: null,
          feedback: null,
        })

        void awardRuntimeStageFlowPointsIfNeeded(nextState, 'scaffold_transition')
      }

      if (!canAdvanceLessonStage(nextState)) {
        return
      }

      const result = advanceLessonStage(nextState)
      setRuntimeState(result.state)
      setInputValue('')
      return
    }

    // 4) 質問回答は1回のクリックで完了登録して次へ
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
  
    // 6) AI会話は完了登録してから完了へ
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

      // allow progression even if typing is not perfectly correct

      const completedRuntimeBlock = runtimeState.blocks[runtimeState.currentBlockIndex]
      const result = advanceLessonStage(nextState)
      setRuntimeState(result.state)
      setInputValue('')

      const didMoveBlock =
        runtimeState.currentBlockIndex !== result.state.currentBlockIndex

      if ((didMoveBlock || result.completedLesson) && completedRuntimeBlock) {
        void handleBlockCompleted({
          completedBlockId: completedRuntimeBlock.id,
          state: result.state,
          sessionBlock: block,
          sessionItem: item,
          blockIndex: progress.currentBlockIndex,
          userId,
          lessonRunId,
        })
      }
    }
  }, [lesson, block, item, runtimeState, progress, inputValue, lessonRunId, userId, correctTypingCount])

  useEffect(() => {
    const onNextStep = () => {
      handleNext()
    }
  
    window.addEventListener('next-step', onNextStep)
  
    return () => {
      window.removeEventListener('next-step', onNextStep)
    }
  }, [handleNext])

  function handleCheck() {
    // Typing removed from core flow — no-op placeholder for prop contract
  }

  // Daily language picker — shown when multiple languages selected and no lock yet
  if (needsLanguagePick && selectedLanguages.length > 1) {
    return (
      <div
        className={PAGE_SHELL_CLASS}
        style={{ fontFamily: "'Nunito','Hiragino Sans',sans-serif" }}
      >
        <AppHeader onLogout={handleLogout} currentLanguage={currentLanguage} />
        <main className="flex-1 flex items-center justify-center">
          <DailyLanguagePicker
            selectedLanguages={selectedLanguages}
            onChoose={handleDailyLanguageChosen}
          />
        </main>
        <AppFooter />
      </div>
    )
  }

  if (loading) {
    return (
      <div
        className={PAGE_SHELL_CLASS}
        style={{ fontFamily: "'Nunito','Hiragino Sans',sans-serif" }}
      >
        <AppHeader onLogout={handleLogout} currentLanguage={currentLanguage} onChangeLanguage={handleChangeLanguage} />
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
        <AppHeader onLogout={handleLogout} currentLanguage={currentLanguage} onChangeLanguage={handleChangeLanguage} />
        <main className="flex-1 flex items-center justify-center px-6 py-12">
          <div className={`w-full max-w-md ${CARD_CLASS} text-center`}>
            <h2 className="text-lg font-semibold text-[#1a1a2e]">Error</h2>
            <p className="mt-3 text-sm text-[#4a4a6a]">{errorMessage}</p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
              >
                もう一度読み込む
              </button>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-xl border border-[#ede9e2] bg-white px-6 py-3 text-sm font-bold text-[#4a4a6a] hover:bg-[#faf8f5] focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
              >
                マイページに戻る
              </Link>
            </div>
          </div>
        </main>
        <AppFooter />
      </div>
    )
  }

  // Billing gate — check entitlement before showing lesson
  const lessonAccess = canStartLesson(pageData?.profile ?? {})
  if (!lessonAccess.allowed) {
    return (
      <div
        className={PAGE_SHELL_CLASS}
        style={{ fontFamily: "'Nunito','Hiragino Sans',sans-serif" }}
      >
        <AppHeader onLogout={handleLogout} currentLanguage={currentLanguage} onChangeLanguage={handleChangeLanguage} />
        <main className="flex-1 flex items-center justify-center px-6 py-12">
          <div className={`w-full max-w-md ${CARD_CLASS} text-center`}>
            <h2 className="text-lg font-semibold text-[#1a1a2e]">
              {isJaUi ? 'プランが必要です' : 'Plan required'}
            </h2>
            <p className="mt-3 text-sm text-[#4a4a6a] leading-relaxed">
              {isJaUi
                ? 'レッスンを続けるには、プランの契約または更新が必要です。'
                : 'Please start or renew a plan to access lessons.'}
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Link
                href="/settings/billing"
                className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
              >
                {isJaUi ? 'お支払い・契約を確認する' : 'View billing'}
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-xl border border-[#ede9e2] bg-white px-6 py-3 text-sm font-bold text-[#4a4a6a] hover:bg-[#faf8f5] focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
              >
                {isJaUi ? 'マイページに戻る' : 'Back to dashboard'}
              </Link>
            </div>
          </div>
        </main>
        <AppFooter />
      </div>
    )
  }

  // Onboarding gate — show before normal lesson flow
  if (needsOnboarding === true && onboardingStep !== 'done') {
    return (
      <div
        className={PAGE_SHELL_CLASS}
        style={{ fontFamily: "'Nunito','Hiragino Sans',sans-serif" }}
      >
        <AppHeader onLogout={handleLogout} currentLanguage={currentLanguage} onChangeLanguage={handleChangeLanguage} />
        <main className="flex-1 flex items-center justify-center">
          {onboardingStep === 'explanation' && (
            <OnboardingExplanation onNext={() => setOnboardingStep('mini_experience')} />
          )}
          {onboardingStep === 'mini_experience' && (
            <OnboardingMiniExperience onComplete={handleOnboardingComplete} />
          )}
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
    runtimeState?.currentStageId !== 'scaffold_transition' &&
    runtimeState?.currentStageId !== 'ai_question' &&
    runtimeState?.currentStageId !== 'ai_conversation' &&
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
        <AppHeader onLogout={handleLogout} currentLanguage={currentLanguage} onChangeLanguage={handleChangeLanguage} />
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-6 pt-2 sm:px-8">
          <button
            type="button"
            onClick={_handleBackToOverview}
            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#E8E4DF] bg-white/80 px-3 py-1 text-xs font-semibold text-[#5a5a7a] transition hover:bg-white hover:text-[#1a1a2e]"
          >
            ← レッスン一覧へ
          </button>
          {lesson?.theme?.includes('Review') && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
              復習モード
              <span className="font-normal text-amber-500">過去に学習した表現を復習中</span>
            </span>
          )}
        </div>
        {lessonSaveWarning && (
          <div className="mx-auto mt-2 max-w-2xl px-6">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-700">
              {lessonSaveWarning}
            </div>
          </div>
        )}
        <main className="flex-1">
          <div className={`${CONTAINER_CLASS} !pt-0 !pb-4 sm:!pt-0 sm:!pb-5`}>
            {!showCompleted && !showListenRepeatComplete && block != null && item != null && (
              <>
                <LessonActiveCard
                  block={block}
                  item={item}
                  progress={progress}
                  currentQuestionIndex={runtimeState?.currentBlockIndex ?? progress.currentBlockIndex ?? 0}
                  totalQuestions={lesson.blocks.length}
                  inputValue={inputValue}
                  onInputChange={setInputValue}
                  onCheck={handleCheck}
                  onStartRepeatFromListen={handleStartRepeatFromListen}
                  onRetryListenFromRepeat={handleRetryListenFromRepeat}
                  onRetryListenFromScaffold={handleRetryListenFromScaffold}
                  onGoBackToStage={handleGoBackToStage}
                  repeatAutoStartNonce={repeatAutoStartNonce}
                  listenResetNonce={listenResetNonce}
                  currentStageId={runtimeState?.currentStageId ?? null}
                  copy={copy}
                  isLessonComplete={isLessonComplete}
                  targetLanguageLabel={targetLanguageLabel}
                  scenarioLabel={
                    // Review blocks: use the pre-computed title directly (already resolved from block_title / sceneId / fallback in reviewItemToBlock)
                    (block.type === 'review' && block.title) ? block.title
                    // Normal blocks: existing derivation chain
                    : sanitizeScenarioLabel(block.description) || getDailyFlowSceneLabel(block.sceneId, isJaUi) || (block.sceneId ? buildScenarioLabel(block.sceneId) : null) || findNearestSceneLabel(lesson.blocks, runtimeState?.currentBlockIndex ?? progress.currentBlockIndex ?? 0, isJaUi) || copy.overviewCard.defaultSceneLabel
                  }
                  previousPhrases={lesson.blocks
                    .slice(0, runtimeState?.currentBlockIndex ?? progress.currentBlockIndex ?? 0)
                    .map((b) => b.items[0]?.answer?.trim())
                    .filter((a): a is string => !!a)}
                  level={lesson.level}
                  lessonSessionId={lesson.sessionId ?? lesson.id ?? ''}
                  responseStage={pageData?.languageLearningMode?.responseStage ?? 'typing'}
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
                    Listen & Repeat practice is complete
                  </h2>
                  <p className="mt-4 text-sm leading-7 text-[#5a5a7a]">
                    You practiced listening and repeating what you heard.
                    <br />
                    Next, let&apos;s practice answering AI questions in English.
                  </p>

                  <div className="mt-6 flex justify-center">
                    <button
                      type="button"
                      onClick={handleAdvanceFromListenRepeatComplete}
                      className="cursor-pointer rounded-xl bg-[#F5A623] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#D4881A]"
                    >
                      Continue to next practice
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showCompleted && wasWeeklyChallenge && (
              <div className="mb-4 rounded-2xl border border-purple-200 bg-gradient-to-b from-purple-50 to-white px-5 py-5 text-center">
                <p className="text-lg font-black text-purple-700 inline-flex items-center justify-center gap-1.5"><LpIcon emoji="🎯" size={22} /> 復習チャレンジ達成！</p>
                {weeklyHighlight ? (
                  <>
                    <p className="mt-2 text-sm font-bold text-purple-600">✨ {weeklyHighlight.highlight}</p>
                    {weeklyHighlight.directions.length > 0 && (
                      <div className="mx-auto mt-2 flex justify-center gap-3">
                        {weeklyHighlight.directions.map((d) => (
                          <span key={d.label} className="text-xs text-purple-500">
                            {d.label} {d.direction}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="mt-1.5 text-xs text-purple-400">{weeklyHighlight.encouragement}</p>
                    {weeklyHighlight.nextGoal && (
                      <p className="mt-1 text-[10px] text-purple-300">{weeklyHighlight.nextGoal}</p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="mt-2 text-sm text-purple-600">今週の弱い部分をしっかり復習しました</p>
                    <p className="mt-1 text-xs text-purple-400">この調子で続けていきましょう</p>
                  </>
                )}
                <div className="mx-auto mt-3 flex items-center justify-center gap-1.5">
                  <img src="/images/branding/diamond.svg" alt="" className="h-4 w-4" />
                  <span className="text-sm font-bold text-[#92400E]">+5 ダイヤ獲得！</span>
                </div>
              </div>
            )}

            {showCompleted && summary != null && (() => {
              const answers = runtimeState?.answers ?? []
              const speakingAttempts = answers.filter(a => a.kind === 'repeat' || a.kind === 'ai_conversation').length
              const aiResponses = answers.filter(a => a.kind === 'ai_question').length
              const scenesCompleted = runtimeState?.currentBlockIndex != null ? runtimeState.currentBlockIndex + 1 : summary.completedItems
              const streakDays = pageData?.profile?.current_streak_days ?? 0
              const sceneIds = lesson?.blocks?.map((b: { sceneId?: string | null }) => b.sceneId).filter(Boolean) as string[] ?? []
              return (
              <LessonCompletionCard
                summary={summary}
                copy={copy}
                totalFlowPoints={totalFlowPoints}
                earnedFlowPoints={earnedFlowPoints}
                totalDiamonds={pageData?.profile?.total_diamonds ?? 0}
                earnedDiamonds={earnedFlowPoints > 0 ? Math.max(1, Math.floor(earnedFlowPoints / 5)) : 0}
                onStartExtraSession={handleStartExtraSession}
                speakingProgress={{
                  speakingAttempts,
                  aiResponses,
                  scenesCompleted,
                  streakDays,
                }}
                sceneIds={sceneIds}
              />
              )
            })()}
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

          <LessonOverviewCard
            currentStageIndex={currentStageIndex}
            currentBlockIndex={runtimeState?.currentBlockIndex ?? progress.currentBlockIndex ?? 0}
            lesson={lesson}
            copy={copy}
            getLevelLabel={getLevelLabel}
            onStart={handleStartLesson}
            rankCode={rankCode}
            totalFlowPoints={totalFlowPoints}
            flowPointsToNextRank={flowPointsToNextRank}
            targetLanguageLabel={targetLanguageLabel}
            targetRegionSlug={pageData?.profile?.target_region_slug ?? null}
            speakByDeadlineText={pageData?.profile?.speak_by_deadline_text ?? null}
            ageGroup={(pageData?.profile as Record<string, unknown>)?.age_group as string | null ?? null}
            dueReviewCount={dueReviewCount}
            completedDates={completedDates}
            onStartReview={handleStartReview}
            trialEndsAt={trialEndsAt}
            totalDiamonds={pageData?.profile?.total_diamonds ?? 0}
            currentStreakDays={pageData?.profile?.current_streak_days ?? 0}
            lastStreakDate={(pageData?.profile?.last_streak_date as string) ?? null}
            lastStreakRestoreDate={(pageData?.profile?.last_streak_restore_date as string) ?? null}
            diamondBoostUntil={(pageData?.profile?.diamond_boost_until as string) ?? null}
            streakFrozenDate={(pageData?.profile?.streak_frozen_date as string) ?? null}
            streakFreezeExpiry={(pageData?.profile?.streak_freeze_expiry as string) ?? null}
            weeklyChallengeUnlockedAt={(pageData?.profile?.weekly_challenge_unlocked_at as string) ?? null}
            weeklyChallengeCompletedAt={(pageData?.profile?.weekly_challenge_completed_at as string) ?? null}
            onStartWeeklyChallenge={handleStartWeeklyChallenge}
          />

          {startErrorMessage && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {startErrorMessage}
            </div>
          )}

          {startBlockedReason && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {startBlockedReason}
              {startBlockedReason.includes('subscription') && (
                <Link href="/settings/billing" className="mt-2 block text-center text-sm font-bold text-amber-800 underline underline-offset-2">
                  View plans
                </Link>
              )}
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
