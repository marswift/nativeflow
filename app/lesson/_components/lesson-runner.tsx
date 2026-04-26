'use client'

/**
 * Lesson Runner
 *
 * Flow controller that manages stage progression and builds
 * per-stage props. Delegates all rendering to LessonStageRouter.
 *
 * Content resolved from conversation catalog via resolver.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import LessonShell from './lesson-shell'
import LessonStageRouter, { type LessonStage } from './lesson-stage-router'
import type { AiConversationMessage } from './stages/ai-conversation-stage'
import { getLessonContentRepository } from '../../../lib/lesson-content-repository'
import {
  createLessonRun,
  saveStageItem,
  completeLessonRun,
  type StageResult,
} from '../../../lib/lesson-run-persistence'
import { buildReviewItemInsert } from '../../../lib/review-items'
import { getSupabaseBrowserClient } from '../../../lib/supabase/browser-client'

async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const supabase = getSupabaseBrowserClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) return { Authorization: `Bearer ${session.access_token}` }
  } catch { /* fallback */ }
  return {}
}

const STAGES: LessonStage[] = [
  'scene',
  'listen',
  'repeat',
  'scaffold',
  'ai_question',
  'typing',
  'ai_conversation',
  'feedback',
]

// Scene config defaults — overridden by props when available
const DEFAULT_SCENE_ID = 'wake_up'
const DEFAULT_REGION = 'en_us_general'
const DEFAULT_AGE_GROUP = '20s'
const DEFAULT_LEVEL = 'beginner'

const STAGE_LABELS: Record<LessonStage, string> = {
  scene: 'Scene',
  listen: 'Listen',
  repeat: 'Repeat',
  scaffold: 'Scaffold',
  ai_question: 'AI Question',
  typing: 'Typing',
  ai_conversation: 'AI Conversation',
  feedback: 'Feedback',
}

/** Stop, reset, and clear the audio ref. */
function stopAudio(ref: React.MutableRefObject<HTMLAudioElement | null>) {
  if (ref.current) {
    ref.current.pause()
    ref.current.currentTime = 0
    ref.current = null
  }
}

type LessonRunnerProps = {
  sceneId?: string
  region?: string
  ageGroup?: string
  level?: string
}

export default function LessonRunner({
  sceneId = DEFAULT_SCENE_ID,
  region = DEFAULT_REGION,
  ageGroup = DEFAULT_AGE_GROUP,
  level = DEFAULT_LEVEL,
}: LessonRunnerProps = {}) {
  const [lessonStartTime] = useState(() => Date.now())

  // Resolve content from repository (object-catalog now, DB-ready for future)
  const variant = useMemo(
    () => getLessonContentRepository().getConversationEnrichment(sceneId, region, ageGroup, level as 'beginner' | 'intermediate' | 'advanced'),
    [sceneId, region, ageGroup, level]
  )

  // Persistence
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const lessonRunIdRef = useRef<string | null>(null)
  const userIdRef = useRef<string | null>(null)
  // SRS review queue
  type DueReviewItem = { id: string; phrase: string; difficulty: 'medium' | 'hard'; next_review_at: string; review_count: number }
  const [reviewQueue, setReviewQueue] = useState<DueReviewItem[]>([])
  const [reviewQueueReady, setReviewQueueReady] = useState(false)
  const [activeReviewIndex, setActiveReviewIndex] = useState(0)

  const isInReviewQueue = reviewQueueReady && activeReviewIndex < reviewQueue.length
  const activeReviewItem = isInReviewQueue ? reviewQueue[activeReviewIndex] : null

  async function fetchDueReviewItems(userId: string) {
    try {
      const { data } = await supabase
        .from('review_items')
        .select('id, phrase, difficulty, next_review_at, review_count')
        .eq('user_id', userId)
        .lte('next_review_at', new Date().toISOString())
        .order('next_review_at', { ascending: true })
        .limit(3)

      const normalized = (data ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        phrase: r.phrase as string,
        difficulty: (r.difficulty as 'medium' | 'hard') ?? 'medium',
        next_review_at: r.next_review_at as string,
        review_count: typeof r.review_count === 'number' ? r.review_count : 0,
      }))
      setReviewQueue(normalized)
      setActiveReviewIndex(0)
    } catch (err) {
      console.error('Failed to fetch review items:', err)
      setReviewQueue([])
      setActiveReviewIndex(0)
    } finally {
      setReviewQueueReady(true)
    }
  }

  /** Reschedule a review item using canonical forgetting-curve scheduler. */
  async function rescheduleReviewItem(params: {
    reviewItemId: string
    result: 'good' | 'ok' | 'retry'
    currentReviewCount: number
  }) {
    const now = new Date()
    const count = params.currentReviewCount

    try {
      // Fetch current counts + next_review_at for forgetting curve
      const { data: current } = await supabase
        .from('review_items')
        .select('correct_count, wrong_count, next_review_at')
        .eq('id', params.reviewItemId)
        .maybeSingle()

      if (current) {
        // Phase 6.6: canonical forgetting-curve scheduling
        const { computeForgettingCurveSchedule } = await import('../../../lib/review-scheduling')
        const outcome = params.result === 'good' ? 'success' as const
          : params.result === 'ok' ? 'weak' as const
          : 'failure' as const

        const correctCount = current.correct_count ?? 0
        const wrongCount = current.wrong_count ?? 0

        const schedule = computeForgettingCurveSchedule({
          correctCount,
          wrongCount,
          nextReviewAt: (current.next_review_at as string | null) ?? null,
          outcome,
        })

        console.log('[Phase6.6][lesson-runner-schedule]', {
          reviewItemId: params.reviewItemId.slice(0, 8),
          result: params.result,
          outcome,
          correctCount,
          wrongCount,
          derivedStage: schedule.derivedStage,
          nextStage: schedule.nextStage,
          intervalDays: schedule.intervalDays,
          usedFallback: false,
        })

        await supabase
          .from('review_items')
          .update({
            next_review_at: schedule.nextReviewAt,
            last_reviewed_at: now.toISOString(),
            review_count: count + 1,
          })
          .eq('id', params.reviewItemId)

        return
      }
    } catch {
      // Fall through to legacy fallback
    }

    // Legacy fallback: original lesson-runner scheduling
    try {
      const msPerHour = 1000 * 60 * 60
      let nextReviewAt: string
      if (params.result === 'good') {
        const hours = count <= 1 ? 72 : count <= 3 ? 168 : 336
        nextReviewAt = new Date(now.getTime() + msPerHour * hours).toISOString()
      } else if (params.result === 'ok') {
        nextReviewAt = new Date(now.getTime() + msPerHour * 24).toISOString()
      } else {
        nextReviewAt = new Date(now.getTime() + msPerHour * 6).toISOString()
      }

      console.log('[Phase6.6][lesson-runner-schedule]', {
        reviewItemId: params.reviewItemId.slice(0, 8),
        result: params.result,
        usedFallback: true,
      })

      await supabase
        .from('review_items')
        .update({
          next_review_at: nextReviewAt,
          last_reviewed_at: now.toISOString(),
          review_count: count + 1,
        })
        .eq('id', params.reviewItemId)
    } catch (err) {
      console.error('Failed to reschedule review item:', err)
    }
  }

  /** Upsert daily_stats with session duration and lesson count. */
  async function incrementDailyStats(userId: string) {
    try {
      const now = new Date()
      const today = now.toISOString().slice(0, 10)
      const minutes = Math.max(1, Math.floor((Date.now() - lessonStartTime) / 60000))

      const { data: existing } = await supabase
        .from('daily_stats')
        .select('id, study_minutes, lesson_runs_completed')
        .eq('user_id', userId)
        .eq('stat_date', today)
        .maybeSingle()

      if (existing) {
        await supabase
          .from('daily_stats')
          .update({
            study_minutes: (existing.study_minutes ?? 0) + minutes,
            lesson_runs_completed: (existing.lesson_runs_completed ?? 0) + 1,
          })
          .eq('id', existing.id)
      } else {
        await supabase
          .from('daily_stats')
          .insert({
            user_id: userId,
            stat_date: today,
            study_minutes: minutes,
            lesson_runs_completed: 1,
            lesson_runs_started: 1,
            lesson_items_completed: 0,
            typing_items_correct: 0,
            flow_points_today: 0,
          })
      }
    } catch (err) {
      console.error('daily_stats error:', err)
    }
  }

  // Bootstrap: fetch user, create lesson run, load review queue
  useEffect(() => {
    let cancelled = false
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled || !user) return
      userIdRef.current = user.id
      const runId = await createLessonRun(supabase, user.id, sceneId, level)
      if (!cancelled) {
        lessonRunIdRef.current = runId
        console.log('[LESSON_START]', { runId, sceneId, level, userId: user.id })
      }
      await fetchDueReviewItems(user.id)
    }
    init()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase])

  // ── Unified current scene payload ──────────────────────────
  // All stage props derive from this single source of truth.
  // listenPhrase = the target sentence to practice (listen/repeat/typing base)
  // aiQuestion   = the question the AI asks about the scene
  // chunks       = scaffold step-2 chunk display
  // choices      = typing variation options
  // opener       = ai_conversation first message
  const listenPhrase = variant?.typingVariations?.[0] ?? 'I just woke up.'
  const aiQuestion = variant?.aiQuestionText ?? 'Did you sleep well?'
  const chunks = variant?.coreChunks?.map((c) => c.chunk) ?? ['wake up']
  const choices = variant?.typingVariations ?? ['I woke up early.']
  const opener = variant?.aiConversationOpener ?? 'Good morning!'
  // phrase used for audio generation — always the target sentence
  const phrase = listenPhrase

  // Audio playback for listen/replay
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [listenAudioUrl, setListenAudioUrl] = useState<string | null>(null)

  // Fetch audio URL for the phrase — stop old audio when phrase changes
  useEffect(() => {
    stopAudio(audioRef)
    setListenAudioUrl(null)

    let cancelled = false
    async function fetchAudio() {
      try {
        const hdrs = await getAuthHeaders()
        const res = await fetch('/api/audio/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...hdrs },
          body: JSON.stringify({ text: phrase }),
        })
        if (res.ok && !cancelled) {
          const data = await res.json()
          if (data.audio_url) setListenAudioUrl(data.audio_url)
        }
      } catch {
        // Audio not available — replay will be a no-op
      }
    }
    fetchAudio()
    return () => { cancelled = true }
  }, [phrase])

  // Scaffold audio: slow (0.85) + normal (1.0)
  const [scaffoldSlowAudioUrl, setScaffoldSlowAudioUrl] = useState<string | null>(null)
  const [scaffoldNormalAudioUrl, setScaffoldNormalAudioUrl] = useState<string | null>(null)

  useEffect(() => {
    stopAudio(audioRef)
    setScaffoldSlowAudioUrl(null)
    setScaffoldNormalAudioUrl(null)

    let cancelled = false
    async function fetchScaffoldAudio() {
      const scaffoldHdrs = await getAuthHeaders()
      const results = await Promise.allSettled([
        fetch('/api/audio/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...scaffoldHdrs },
          body: JSON.stringify({ text: phrase, speed: 0.85 }),
        }),
        fetch('/api/audio/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...scaffoldHdrs },
          body: JSON.stringify({ text: phrase }),
        }),
      ])
      if (cancelled) return

      const slowResult = results[0]
      if (slowResult.status === 'fulfilled' && slowResult.value.ok) {
        try {
          const data = await slowResult.value.json()
          if (data.audio_url) setScaffoldSlowAudioUrl(data.audio_url)
        } catch { /* parse error — slow stays null */ }
      }

      const normalResult = results[1]
      if (normalResult.status === 'fulfilled' && normalResult.value.ok) {
        try {
          const data = await normalResult.value.json()
          if (data.audio_url) setScaffoldNormalAudioUrl(data.audio_url)
        } catch { /* parse error — normal stays null */ }
      }
    }
    fetchScaffoldAudio()
    return () => { cancelled = true }
  }, [phrase])

  // Cleanup audio on unmount
  useEffect(() => {
    return () => { stopAudio(audioRef) }
  }, [])

  // Recording for repeat stage
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null)
  const recordedAudioUrlRef = useRef<string | null>(null)
  const [repeatFeedback, setRepeatFeedback] = useState<{ result: 'good' | 'ok' | 'retry'; transcript: string } | null>(null)
  const [isEvaluatingRepeat, setIsEvaluatingRepeat] = useState(false)
  const [aiEvaluation, setAiEvaluation] = useState<{ result: 'good' | 'ok' | 'retry'; hint?: string | null } | null>(null)
  const lastRecordedBlobRef = useRef<Blob | null>(null)

  // Keep ref in sync with state for cleanup access
  useEffect(() => {
    recordedAudioUrlRef.current = recordedAudioUrl
  }, [recordedAudioUrl])

  /** Revoke the current recorded blob URL if one exists. */
  function revokeRecordedUrl() {
    if (recordedAudioUrlRef.current) {
      URL.revokeObjectURL(recordedAudioUrlRef.current)
      recordedAudioUrlRef.current = null
    }
  }

  /** Stop recorder + release mic tracks + revoke blob URL. Idempotent. */
  function stopRecording() {
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      mediaRecorderRef.current = null
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop())
      mediaStreamRef.current = null
    }
  }

  // Cleanup recording + blob URL on unmount
  useEffect(() => {
    return () => {
      stopRecording()
      revokeRecordedUrl()
    }
  }, [])

  const [currentStageIndex, setCurrentStageIndex] = useState(0)
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'recorded'>('idle')
  // Stage performance metrics
  const stageEnteredAtRef = useRef<number>(Date.now())
  const replayCountRef = useRef<number>(0)
  const [scaffoldStep, setScaffoldStep] = useState<1 | 2 | 3>(1)
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null)
  const [typingValue, setTypingValue] = useState('')
  const [aiMessages, setAiMessages] = useState<AiConversationMessage[]>([
    { id: '1', role: 'assistant', text: opener },
  ])
  const [aiInput, setAiInput] = useState('')
  const [aiSending, setAiSending] = useState(false)

  const stage = STAGES[currentStageIndex] ?? 'scene'
  const isLastStage = currentStageIndex >= STAGES.length - 1

  /** Derive result for the current stage being completed. */
  function getCurrentStageResult(): StageResult {
    switch (stage) {
      case 'repeat': return repeatFeedback?.result ?? 'good'
      case 'ai_question': return selectedChoice ? 'good' : 'skipped'
      case 'typing': return typingValue.trim() ? 'good' : 'skipped'
      case 'ai_conversation': return aiEvaluation?.result ?? 'good'
      default: return 'good'
    }
  }

  const handleNext = async () => {
    if (isLastStage) return

    // Safety: stop any playing audio and active recording before transitioning
    stopAudio(audioRef)
    stopRecording()

    // Review mode: when completing typing stage with a review item active
    if (stage === 'typing' && isInReviewQueue && activeReviewItem) {
      // Derive review result from typing input
      const normalizedInput = typingValue.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
      const normalizedPhrase = activeReviewItem.phrase.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
      const reviewResult: 'good' | 'ok' | 'retry' =
        normalizedInput === normalizedPhrase ? 'good'
        : normalizedInput.length > 0 ? 'ok'
        : 'retry'

      await rescheduleReviewItem({ reviewItemId: activeReviewItem.id, result: reviewResult, currentReviewCount: activeReviewItem.review_count ?? 0 })

      if (activeReviewIndex < reviewQueue.length - 1) {
        // More reviews — stay on typing stage with next review phrase
        setActiveReviewIndex((prev) => prev + 1)
        setTypingValue('')
        return
      }

      // Last review done — end review mode, stay on typing for normal prompt
      setActiveReviewIndex(reviewQueue.length)
      setTypingValue('')
      return
    }

    // Save completed stage result with metrics (async, non-blocking)
    if (lessonRunIdRef.current && userIdRef.current) {
      const result = getCurrentStageResult()
      const durationMs = Date.now() - stageEnteredAtRef.current
      saveStageItem(supabase, lessonRunIdRef.current, userIdRef.current, currentStageIndex, {
        stage,
        result,
        userInput: stage === 'typing' ? typingValue : undefined,
        transcript: stage === 'repeat' ? (repeatFeedback?.transcript ?? undefined) : undefined,
        metrics: {
          durationMs,
          replayCount: replayCountRef.current,
          didRecord: stage === 'repeat' && recordingState !== 'idle',
        },
      })

      // Create review item for SRS if needed (repeat/typing only)
      if (stage === 'repeat' || stage === 'typing') {
        const resultData = stage === 'repeat'
          ? { evaluation: result, transcript: repeatFeedback?.transcript, phrase }
          : { isCorrect: result === 'good', phrase }
        const reviewInsert = buildReviewItemInsert({
          userId: userIdRef.current,
          stageId: stage,
          result: resultData,
          currentBlock: { phrase },
        })
        if (reviewInsert) {
          createReviewItemIfNeeded(reviewInsert)
        }
      }
    }

    const nextStage = STAGES[currentStageIndex + 1]
    setCurrentStageIndex((i) => i + 1)
    // Reset metrics for next stage
    stageEnteredAtRef.current = Date.now()
    replayCountRef.current = 0
    if (nextStage === 'repeat') { setRecordingState('idle'); setRepeatFeedback(null) }
    if (nextStage === 'scaffold') setScaffoldStep(1)
    if (nextStage === 'ai_question') setSelectedChoice(null)
    if (nextStage === 'typing') setTypingValue('')
    if (nextStage === 'ai_conversation') setAiEvaluation(null)
  }

  const handleReplay = useCallback(() => {
    if (!listenAudioUrl) return
    replayCountRef.current += 1
    stopAudio(audioRef)
    const audio = new Audio(listenAudioUrl)
    audioRef.current = audio
    audio.play().catch(() => {})
  }, [listenAudioUrl])

  const handlePlaySlow = useCallback(() => {
    if (!scaffoldSlowAudioUrl) return
    stopAudio(audioRef)
    const audio = new Audio(scaffoldSlowAudioUrl)
    audioRef.current = audio
    audio.play().catch(() => {})
  }, [scaffoldSlowAudioUrl])

  const handlePlayNormal = useCallback(() => {
    if (!scaffoldNormalAudioUrl) return
    stopAudio(audioRef)
    const audio = new Audio(scaffoldNormalAudioUrl)
    audioRef.current = audio
    audio.play().catch(() => {})
  }, [scaffoldNormalAudioUrl])

  const handleStartRecording = useCallback(async () => {
    if (recordingState === 'recording') return
    stopRecording()
    recordedChunksRef.current = []
    revokeRecordedUrl()
    setRecordedAudioUrl(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream

      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        recordedChunksRef.current = []
        if (blob.size > 0) {
          setRecordedAudioUrl(URL.createObjectURL(blob))
          lastRecordedBlobRef.current = blob
          // Auto-evaluate after recording
          evaluateRepeatRecording(blob)
        }
        setRecordingState('recorded')
      }

      recorder.start(250)
      setRecordingState('recording')
    } catch {
      // Mic access denied or unavailable
      setRecordingState('idle')
    }
  }, [recordingState])

  const handleStopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop())
    mediaStreamRef.current = null
    // recordingState set to 'recorded' in recorder.onstop
  }, [])

  /** Send recorded audio to STT API and evaluate against phrase. */
  async function evaluateRepeatRecording(blob: Blob) {
    setIsEvaluatingRepeat(true)
    setRepeatFeedback(null)

    try {
      const formData = new FormData()
      formData.append('file', blob, 'recording.webm')
      formData.append('expectedText', phrase)

      const res = await fetch('/api/pronunciation/score', { method: 'POST', body: formData })

      if (res.ok) {
        const data = await res.json()
        const transcript = (data.transcript ?? '').trim()
        const score = typeof data.totalScore === 'number' ? data.totalScore : 0

        const result: 'good' | 'ok' | 'retry' =
          score >= 70 ? 'good'
          : score >= 40 ? 'ok'
          : transcript.length === 0 ? 'retry'
          : 'ok'

        setRepeatFeedback({ result, transcript })
      } else {
        setRepeatFeedback({ result: 'retry', transcript: '' })
      }
    } catch {
      setRepeatFeedback({ result: 'retry', transcript: '' })
    } finally {
      setIsEvaluatingRepeat(false)
    }
  }

  /** Insert review item with 12h deduplication window. Async, non-blocking. */
  async function createReviewItemIfNeeded(insertPayload: { user_id: string; phrase: string; difficulty: string; next_review_at: string }) {
    try {
      const { data: existing } = await supabase
        .from('review_items')
        .select('id')
        .eq('user_id', insertPayload.user_id)
        .eq('phrase', insertPayload.phrase)
        .gte('created_at', new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString())
        .limit(1)

      if (existing && existing.length > 0) return

      const { error } = await supabase
        .from('review_items')
        .insert(insertPayload)

      if (error) console.error('Review item insert failed:', error)
    } catch (err) {
      console.error('Review item creation error:', err)
    }
  }

  const handleAiSend = async () => {
    if (!aiInput.trim()) return
    const userText = aiInput.trim()
    const userMsg: AiConversationMessage = {
      id: String(Date.now()),
      role: 'user',
      text: userText,
    }

    // Build history from current messages + new user message (avoids stale state)
    const nextMessages = [...aiMessages, userMsg]
    setAiMessages(nextMessages)
    setAiInput('')
    setAiSending(true)

    // Group into turn-based pairs: { ai, user }
    const history: { ai: string; user: string }[] = []
    let pendingAi = ''
    for (const m of nextMessages) {
      if (m.role === 'assistant') {
        pendingAi = m.text
      } else {
        history.push({ ai: pendingAi, user: m.text })
        pendingAi = ''
      }
    }

    const turnIndex = history.length - 1

    try {
      const convHdrs = await getAuthHeaders()
      const res = await fetch('/api/ai-conversation/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...convHdrs },
        body: JSON.stringify({
          turnIndex,
          userMessage: userText,
          lessonPhrase: phrase,
          conversationHistory: history,
          flavorContext: variant?.flavor ? {
            sceneId,
            region,
            ageGroup,
            topics: variant.flavor.topics,
            references: variant.flavor.references,
            cultureNotes: variant.flavor.cultureNotes,
            setting: variant.flavor.setting,
            lifestyle: variant.flavor.lifestyle,
          } : undefined,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.ok && data.aiReply) {
          setAiMessages((prev) => [...prev, {
            id: String(Date.now() + 1),
            role: 'assistant',
            text: data.aiReply,
          }])

          // Extract evaluation from API response
          const evalResult = data.evaluation === 'good' ? 'good' as const : 'retry' as const
          const score = data.evaluationDetail?.score
          const aiResult: 'good' | 'ok' | 'retry' =
            evalResult === 'good'
              ? (typeof score === 'number' && score >= 70 ? 'good' : 'ok')
              : 'retry'
          setAiEvaluation({
            result: aiResult,
            hint: data.hint ?? data.evaluationDetail?.feedback ?? null,
          })
          return
        }
      }

      // API returned but no valid reply — fallback
      setAiMessages((prev) => [...prev, {
        id: String(Date.now() + 1),
        role: 'assistant',
        text: "That's great! Tell me more.",
      }])
    } catch {
      // API failed — fallback
      setAiMessages((prev) => [...prev, {
        id: String(Date.now() + 1),
        role: 'assistant',
        text: "That's great! Tell me more.",
      }])
    } finally {
      setAiSending(false)
    }
  }

  const header = (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[#2d2d3a]">Morning Routine</p>
        <span className="rounded-full bg-[#fff7ed] px-3 py-1 text-xs font-semibold text-[#c2410c]">
          {STAGE_LABELS[stage]}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e8e2d8]">
          <div
            className="h-full rounded-full bg-[#f59e0b] transition-all duration-300"
            style={{ width: `${Math.round(((currentStageIndex + 1) / STAGES.length) * 100)}%` }}
          />
        </div>
        <span className="text-xs font-medium text-[#7b7b94]">
          {currentStageIndex + 1} / {STAGES.length}
        </span>
      </div>
    </div>
  )

  return (
    <LessonShell header={header}>
    <LessonStageRouter
      stage={stage}
      sceneProps={{
        title: 'Morning Routine',
        description: listenPhrase,
        onStart: handleNext,
      }}
      listenProps={{
        phrase: listenPhrase,
        audioUrl: listenAudioUrl,
        onReplay: handleReplay,
        onNext: handleNext,
      }}
      repeatProps={{
        phrase: listenPhrase,
        recordingState,
        feedback: repeatFeedback,
        isEvaluating: isEvaluatingRepeat,
        onReplay: handleReplay,
        onStartRecording: handleStartRecording,
        onStopRecording: handleStopRecording,
        onNext: handleNext,
      }}
      scaffoldProps={{
        chunks,
        step: scaffoldStep,
        slowAudioUrl: scaffoldSlowAudioUrl,
        normalAudioUrl: scaffoldNormalAudioUrl,
        onPlaySlow: handlePlaySlow,
        onPlayNormal: handlePlayNormal,
        onNext: () => {
          if (scaffoldStep < 3) {
            setScaffoldStep((s) => (s + 1) as 1 | 2 | 3)
          } else {
            handleNext()
          }
        },
      }}
      aiQuestionProps={{
        question: aiQuestion,
        choices,
        selectedChoice,
        onSelectChoice: setSelectedChoice,
        onNext: handleNext,
      }}
      typingProps={{
        prompt: isInReviewQueue && activeReviewItem ? activeReviewItem.phrase : phrase,
        value: typingValue,
        onChange: setTypingValue,
        onNext: handleNext,
      }}
      aiConversationProps={{
        messages: aiMessages,
        value: aiInput,
        onChange: setAiInput,
        onSend: handleAiSend,
        onNext: handleNext,
        isSending: aiSending,
        evaluation: aiEvaluation,
      }}
      feedbackProps={{
        stages: [
          { label: 'Listen', result: 'good' },
          { label: 'Repeat', result: repeatFeedback?.result ?? 'skipped' },
          { label: 'Scaffold', result: 'good' },
          { label: 'AI Question', result: selectedChoice ? 'good' : 'skipped' },
          { label: 'Typing', result: typingValue.trim() ? 'good' : 'skipped' },
          { label: 'AI Conversation', result: aiEvaluation?.result ?? 'skipped' },
        ],
        message: 'おつかれさまでした！',
        onFinish: () => {
          // Guard: prevent double completion on rapid taps
          const runId = lessonRunIdRef.current
          if (!runId) return
          // Clear ref immediately so second tap is a no-op
          lessonRunIdRef.current = null

          // Complete lesson run (async, non-blocking)
          completeLessonRun(supabase, runId)
          if (userIdRef.current) {
            incrementDailyStats(userIdRef.current)
          }

          // Stop any lingering audio/recording
          stopAudio(audioRef)
          stopRecording()

          console.log('[LESSON_COMPLETE]', { runId, sceneId, level })
          setCurrentStageIndex(0)
        },
      }}
    />
    </LessonShell>
  )
}
