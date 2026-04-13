'use client'

/**
 * Feedback Stage
 *
 * Simple lesson summary. Shows what the user accomplished
 * and how it went. Calm and encouraging.
 *
 * Purely presentational — parent provides all data.
 */

export type StageSummaryItem = {
  label: string
  result: 'good' | 'ok' | 'retry' | 'skipped'
}

export type FeedbackStageProps = {
  /** Summary of each completed stage. */
  stages: StageSummaryItem[]
  /** Overall result message. */
  message: string
  /** Called when the user taps the finish button. */
  onFinish: () => void
}

const RESULT_STYLE: Record<StageSummaryItem['result'], { dot: string; text: string }> = {
  good:    { dot: 'bg-green-400', text: 'text-green-700' },
  ok:      { dot: 'bg-blue-400',  text: 'text-blue-700' },
  retry:   { dot: 'bg-amber-400', text: 'text-amber-700' },
  skipped: { dot: 'bg-gray-300',  text: 'text-gray-400' },
}

const RESULT_LABEL: Record<StageSummaryItem['result'], string> = {
  good:    'Good',
  ok:      'OK',
  retry:   'Try again',
  skipped: '—',
}

export default function FeedbackStage({
  stages,
  message,
  onFinish,
}: FeedbackStageProps) {
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <p className="text-xl font-semibold text-[#2d2d3a]">
        {message}
      </p>

      <div className="w-full max-w-sm space-y-2">
        {stages.map((s, i) => {
          const style = RESULT_STYLE[s.result]
          return (
            <div
              key={i}
              className="flex items-center justify-between rounded-2xl border border-[#e8e2d8] bg-white px-4 py-3 shadow-sm"
            >
              <span className="text-sm text-[#2d2d3a]">{s.label}</span>
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                <span className={`text-xs font-semibold ${style.text}`}>
                  {RESULT_LABEL[s.result]}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <button
        type="button"
        onClick={onFinish}
        className="rounded-2xl bg-[#f59e0b] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
      >
        Done
      </button>
    </div>
  )
}
