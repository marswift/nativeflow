'use client'

/**
 * Repeat Stage
 *
 * User imitates the phrase they heard in the Listen stage.
 * Shows simple feedback after evaluation.
 *
 * Purely presentational — no recording logic, no audio processing.
 * Parent controls all recording, evaluation, and navigation.
 */

export type RepeatFeedback = {
  result: 'good' | 'ok' | 'retry'
  transcript: string
}

export type RepeatStageProps = {
  phrase: string
  audioUrl?: string | null
  recordingState: 'idle' | 'recording' | 'recorded'
  feedback?: RepeatFeedback | null
  isEvaluating?: boolean
  onReplay: () => void
  onStartRecording: () => void
  onStopRecording: () => void
  onNext: () => void
}

const FEEDBACK_STYLE: Record<RepeatFeedback['result'], { bg: string; text: string; label: string }> = {
  good:  { bg: 'bg-green-50 border-green-200', text: 'text-green-700', label: 'いいですね！' },
  ok:    { bg: 'bg-blue-50 border-blue-200',   text: 'text-blue-700',  label: 'おしい！もう少し！' },
  retry: { bg: 'bg-amber-50 border-amber-200',  text: 'text-amber-700', label: 'もう一度やってみよう' },
}

export default function RepeatStage({
  phrase,
  audioUrl,
  recordingState,
  feedback = null,
  isEvaluating = false,
  onReplay,
  onStartRecording,
  onStopRecording,
  onNext,
}: RepeatStageProps) {
  void audioUrl

  const recordLabel =
    recordingState === 'recording'
      ? 'Recording...'
      : recordingState === 'recorded'
        ? 'Try again'
        : 'Speak'

  const handleRecordClick =
    recordingState === 'recording' ? onStopRecording : onStartRecording

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <p className="text-xl font-semibold text-[#2d2d3a]">
        {phrase}
      </p>

      <button
        type="button"
        onClick={onReplay}
        className="rounded-2xl border border-[#e8e2d8] bg-white px-5 py-3 text-sm font-medium text-[#2d2d3a] shadow-sm transition hover:opacity-90"
      >
        Replay
      </button>

      <button
        type="button"
        onClick={handleRecordClick}
        disabled={isEvaluating}
        className={`rounded-2xl px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 ${
          isEvaluating
            ? 'cursor-not-allowed bg-gray-300'
            : recordingState === 'recording' ? 'bg-[#818cf8]' : 'bg-[#6366f1]'
        }`}
      >
        {isEvaluating ? 'Evaluating...' : recordLabel}
      </button>

      {feedback && (
        <div className={`w-full max-w-sm rounded-2xl border px-4 py-3 ${FEEDBACK_STYLE[feedback.result].bg}`}>
          <p className={`text-sm font-semibold ${FEEDBACK_STYLE[feedback.result].text}`}>
            {FEEDBACK_STYLE[feedback.result].label}
          </p>
          {feedback.transcript && (
            <p className="mt-1 text-xs text-[#4a4a6a]">
              You: {feedback.transcript}
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={onNext}
        className="rounded-2xl bg-[#f59e0b] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
      >
        Next
      </button>
    </div>
  )
}
