'use client'

import { useMemo, useState } from 'react'
import { useConversationLesson } from '@/lib/use-conversation-lesson'
import { buildConversationLessonDebugPromptAssembly } from '@/lib/conversation-lesson-debug-prompt-assembly'
import {
  loadConversationLessonDebugMission,
  loadConversationLessonDebugMissionProgress,
} from '@/lib/conversation-lesson-debug-mission-loader'
import { loadConversationLessonDebugSession } from '@/lib/conversation-lesson-debug-session-loader'

export default function ConversationLessonDebugPage() {
  const lesson = useConversationLesson()
  const [learnerUtterance, setLearnerUtterance] = useState('')
  const [markStepCompleted, setMarkStepCompleted] = useState(false)
  const [resumeUserId, setResumeUserId] = useState('u1')
  const [resumeLessonId, setResumeLessonId] = useState('lesson-1')
  const [activeUserId, setActiveUserId] = useState('u1')
  const [activeLessonId, setActiveLessonId] = useState('lesson-1')
  const [activeMissionDate, setActiveMissionDate] = useState('2026-03-12')
  const [liveTopicsText, setLiveTopicsText] = useState(
    'popular movie, local cafe, weekend event'
  )

  const statusPanel = useMemo(() => {
    const s = lesson.status
    return {
      loading: lesson.loading,
      error: lesson.error,
      hasState: lesson.hasState,
      isFinished: lesson.isFinished,
      currentStepId: s?.currentStepId ?? '—',
      currentStepType: s?.currentStepType ?? '—',
      totalSteps: s?.totalSteps ?? '—',
      completedSteps: s?.completedSteps ?? '—',
      skippedSteps: s?.skippedSteps ?? '—',
    }
  }, [
    lesson.loading,
    lesson.error,
    lesson.hasState,
    lesson.isFinished,
    lesson.status,
  ])

  const promptJson = useMemo(
    () =>
      lesson.prompt !== null
        ? JSON.stringify(lesson.prompt, null, 2)
        : 'null',
    [lesson.prompt]
  )

  const completionJson = useMemo(
    () =>
      lesson.lastCompletionResult !== null
        ? JSON.stringify(lesson.lastCompletionResult, null, 2)
        : 'null',
    [lesson.lastCompletionResult]
  )

  const handleStart = async () => {
    const session = await loadConversationLessonDebugSession({ lessonId: activeLessonId })
    await lesson.startLesson({
      session,
      userId: activeUserId,
      startedAt: new Date().toISOString(),
    })
  }

  const handleFetchPrompt = () => {
    if (lesson.state === null) return
    const liveTopics = liveTopicsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    lesson.fetchPrompt({
      state: lesson.state,
      promptAssemblyResult: buildConversationLessonDebugPromptAssembly({ state: lesson.state, userId: activeUserId }),
      learnerUtterance: learnerUtterance.trim() || null,
      ...(liveTopics.length > 0 && { liveTopics }),
    })
  }

  const handleSubmitAnswer = () => {
    if (lesson.state === null) return
    lesson.submitAnswer({
      state: lesson.state,
      learnerUtterance: learnerUtterance.trim() || null,
      submittedAt: new Date().toISOString(),
      markStepCompleted,
    })
  }

  const handleSkipStep = () => {
    if (lesson.state === null) return
    lesson.skipStep({
      state: lesson.state,
      skippedAt: new Date().toISOString(),
    })
  }

  const handleComplete = () => {
    if (lesson.state === null) return
    lesson.completeLesson({
      state: lesson.state,
      todayDate: activeMissionDate,
      userId: activeUserId,
      completedAt: new Date().toISOString(),
      mission: loadConversationLessonDebugMission({ userId: activeUserId, lessonId: activeLessonId, missionDate: activeMissionDate }),
      missionProgress: loadConversationLessonDebugMissionProgress({ userId: activeUserId, missionDate: activeMissionDate }),
      streak: null,
    })
  }

  return (
    <main className="p-4 max-w-2xl mx-auto font-sans">
      <h1 className="text-xl font-bold mb-4">Conversation Lesson Debug</h1>

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          type="button"
          onClick={handleStart}
          className="px-3 py-1.5 bg-blue-600 text-white rounded"
        >
          Start
        </button>
        <button
          type="button"
          onClick={handleFetchPrompt}
          disabled={!lesson.hasState}
          className="px-3 py-1.5 bg-green-600 text-white rounded disabled:opacity-50"
        >
          Fetch Prompt
        </button>
        <button
          type="button"
          onClick={handleSubmitAnswer}
          disabled={!lesson.hasState}
          className="px-3 py-1.5 bg-teal-600 text-white rounded disabled:opacity-50"
        >
          Submit Answer
        </button>
        <button
          type="button"
          onClick={handleSkipStep}
          disabled={!lesson.hasState}
          className="px-3 py-1.5 bg-amber-600 text-white rounded disabled:opacity-50"
        >
          Skip Step
        </button>
        <button
          type="button"
          onClick={handleComplete}
          disabled={!lesson.hasState}
          className="px-3 py-1.5 bg-purple-600 text-white rounded disabled:opacity-50"
        >
          Complete Lesson
        </button>
        <button
          type="button"
          onClick={() => lesson.reset()}
          className="px-3 py-1.5 bg-gray-600 text-white rounded"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={() =>
            lesson.resumeLesson({ userId: resumeUserId, lessonId: resumeLessonId })
          }
          className="px-3 py-1.5 bg-indigo-600 text-white rounded"
        >
          Resume
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-4">
        <div className="min-w-0 flex-1">
          <label className="block text-sm font-medium mb-1">Active userId</label>
          <input
            type="text"
            value={activeUserId}
            onChange={(e) => setActiveUserId(e.target.value)}
            className="w-full border rounded p-2 text-sm"
          />
        </div>
        <div className="min-w-0 flex-1">
          <label className="block text-sm font-medium mb-1">Active lessonId</label>
          <input
            type="text"
            value={activeLessonId}
            onChange={(e) => setActiveLessonId(e.target.value)}
            className="w-full border rounded p-2 text-sm"
          />
        </div>
        <div className="min-w-0 flex-1">
          <label className="block text-sm font-medium mb-1">Active missionDate</label>
          <input
            type="text"
            value={activeMissionDate}
            onChange={(e) => setActiveMissionDate(e.target.value)}
            className="w-full border rounded p-2 text-sm"
          />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-4 items-end">
        <div className="min-w-0 flex-1">
          <label className="block text-sm font-medium mb-1">Resume userId</label>
          <input
            type="text"
            value={resumeUserId}
            onChange={(e) => setResumeUserId(e.target.value)}
            className="w-full border rounded p-2 text-sm"
          />
        </div>
        <div className="min-w-0 flex-1">
          <label className="block text-sm font-medium mb-1">Resume lessonId</label>
          <input
            type="text"
            value={resumeLessonId}
            onChange={(e) => setResumeLessonId(e.target.value)}
            className="w-full border rounded p-2 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            setResumeUserId(activeUserId)
            setResumeLessonId(activeLessonId)
          }}
          className="px-3 py-1.5 bg-gray-600 text-white rounded shrink-0"
        >
          Copy Active → Resume
        </button>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">learnerUtterance</label>
        <textarea
          value={learnerUtterance}
          onChange={(e) => setLearnerUtterance(e.target.value)}
          rows={2}
          className="w-full border rounded p-2 text-sm"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Live topics (comma-separated)</label>
        <input
          type="text"
          value={liveTopicsText}
          onChange={(e) => setLiveTopicsText(e.target.value)}
          className="w-full border rounded p-2 text-sm"
          placeholder="popular movie, local cafe, weekend event"
        />
      </div>

      <div className="mb-4 flex items-center gap-2">
        <input
          type="checkbox"
          id="markStepCompleted"
          checked={markStepCompleted}
          onChange={(e) => setMarkStepCompleted(e.target.checked)}
          className="rounded"
        />
        <label htmlFor="markStepCompleted" className="text-sm">
          markStepCompleted
        </label>
      </div>

      <section className="mb-4 p-3 border rounded bg-gray-50">
        <h2 className="text-sm font-bold mb-2">Status</h2>
        <pre className="text-xs overflow-auto">
          {JSON.stringify(statusPanel, null, 2)}
        </pre>
      </section>

      {lesson.prompt !== null && (
        <section className="mb-4 p-3 border rounded bg-slate-100">
          <h2 className="text-sm font-bold mb-2">AI Turn (readable)</h2>
          <dl className="text-sm space-y-1.5">
            <div>
              <dt className="font-medium text-slate-700">assistantReply.text</dt>
              <dd className="ml-0 mt-0.5 text-slate-900 whitespace-pre-wrap break-words">
                {lesson.prompt.assistantReply.text || '—'}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-700">assistantReply.status</dt>
              <dd className="ml-0 mt-0.5 text-slate-900">
                {lesson.prompt.assistantReply.status}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-700">evaluation.quality</dt>
              <dd className="ml-0 mt-0.5 text-slate-900">
                {lesson.prompt.evaluation.quality}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-700">evaluation.feedbackMode</dt>
              <dd className="ml-0 mt-0.5 text-slate-900">
                {lesson.prompt.evaluation.feedbackMode}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-700">evaluation.feedbackText</dt>
              <dd className="ml-0 mt-0.5 text-slate-900">
                {lesson.prompt.evaluation.feedbackText ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-700">evaluation.correctedAnswer</dt>
              <dd className="ml-0 mt-0.5 text-slate-900">
                {lesson.prompt.evaluation.correctedAnswer ?? '—'}
              </dd>
            </div>
          </dl>
        </section>
      )}

      <section className="mb-4 p-3 border rounded bg-gray-50">
        <h2 className="text-sm font-bold mb-2">Prompt (raw JSON)</h2>
        <pre className="text-xs overflow-auto whitespace-pre-wrap break-words">
          {promptJson}
        </pre>
      </section>

      <section className="mb-4 p-3 border rounded bg-gray-50">
        <h2 className="text-sm font-bold mb-2">Completion result</h2>
        <pre className="text-xs overflow-auto whitespace-pre-wrap break-words">
          {completionJson}
        </pre>
      </section>
    </main>
  )
}
