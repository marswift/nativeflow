'use client'

/**
 * Listen Stage
 *
 * First stage in the lesson flow. User listens to a phrase
 * and advances when ready.
 *
 * Purely presentational — no data fetching, no lesson state,
 * no scoring. Parent controls audio and navigation.
 */

export type ListenStageProps = {
  /** The English phrase to display. */
  phrase: string
  /** Pre-resolved audio URL. Accepted for API stability; not rendered. */
  audioUrl?: string | null
  /** Called when the user taps the replay button. */
  onReplay: () => void
  /** Called when the user taps the next button. */
  onNext: () => void
}

export default function ListenStage({
  phrase,
  audioUrl,
  onReplay,
  onNext,
}: ListenStageProps) {
  void audioUrl

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
        onClick={onNext}
        className="rounded-2xl bg-[#f59e0b] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
      >
        Next
      </button>
    </div>
  )
}
