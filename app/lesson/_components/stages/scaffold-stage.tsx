'use client'

/**
 * Scaffold Stage
 *
 * Bridge between repeat and meaning-supported understanding.
 * Presents chunked phrase support with simple audio replay.
 *
 * Purely presentational — no audio playback logic, no scoring,
 * no data fetching. Parent controls all audio and navigation.
 */

export type ScaffoldStageProps = {
  /** Chunked phrase segments to display. */
  chunks: string[]
  /** Current scaffold step (1, 2, or 3). */
  step: 1 | 2 | 3
  /** Pre-resolved slow audio URL. Accepted for API stability; not rendered. */
  slowAudioUrl?: string | null
  /** Pre-resolved normal audio URL. Accepted for API stability; not rendered. */
  normalAudioUrl?: string | null
  /** Called when the user taps the slow replay button. */
  onPlaySlow: () => void
  /** Called when the user taps the normal replay button. */
  onPlayNormal: () => void
  /** Called when the user taps the next button. */
  onNext: () => void
}

export default function ScaffoldStage({
  chunks,
  step,
  slowAudioUrl,
  normalAudioUrl,
  onPlaySlow,
  onPlayNormal,
  onNext,
}: ScaffoldStageProps) {
  void slowAudioUrl
  void normalAudioUrl

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <span className="rounded-full bg-[#fff7ed] px-4 py-1 text-xs font-semibold text-[#c2410c]">
        Step {step}
      </span>

      <div className="flex flex-wrap justify-center gap-2">
        {chunks.map((chunk, i) => (
          <span
            key={i}
            className="rounded-xl border border-[#e8e2d8] bg-white px-4 py-2 text-sm font-medium text-[#2d2d3a] shadow-sm"
          >
            {chunk}
          </span>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onPlaySlow}
          className="rounded-2xl border border-[#e8e2d8] bg-white px-5 py-3 text-sm font-medium text-[#2d2d3a] shadow-sm transition hover:opacity-90"
        >
          Slow
        </button>

        <button
          type="button"
          onClick={onPlayNormal}
          className="rounded-2xl border border-[#e8e2d8] bg-white px-5 py-3 text-sm font-medium text-[#2d2d3a] shadow-sm transition hover:opacity-90"
        >
          Normal
        </button>
      </div>

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
