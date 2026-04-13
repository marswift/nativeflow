'use client'

/**
 * Typing Stage
 *
 * First light output stage. Learner produces a short answer
 * in a low-pressure environment.
 *
 * Purely presentational — no validation, no scoring,
 * no correctness feedback. Parent controls value and navigation.
 */

export type TypingStageProps = {
  /** The prompt or question to respond to. */
  prompt: string
  /** Current input value (controlled). */
  value: string
  /** Called on every input change. */
  onChange: (v: string) => void
  /** Called when the user taps the next button. */
  onNext: () => void
}

export default function TypingStage({
  prompt,
  value,
  onChange,
  onNext,
}: TypingStageProps) {
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <p className="text-xl font-semibold text-[#2d2d3a]">
        {prompt}
      </p>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type in English"
        className="w-full max-w-sm rounded-2xl border border-[#e8e2d8] px-4 py-3 text-sm outline-none transition focus:border-[#f59e0b]"
      />

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
