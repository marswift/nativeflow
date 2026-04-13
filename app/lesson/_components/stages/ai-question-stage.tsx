'use client'

/**
 * AI Question Stage
 *
 * Learner responds to one simple AI question.
 * Supports optional multiple-choice selection.
 *
 * Purely presentational — no AI logic, no validation,
 * no scoring. Parent controls selection and navigation.
 */

export type AiQuestionStageProps = {
  /** The question to display. */
  question: string
  /** Optional choice list. If empty or absent, only the question and next button show. */
  choices?: string[]
  /** Currently selected choice, or null. */
  selectedChoice?: string | null
  /** Called when the user taps a choice. */
  onSelectChoice?: (value: string) => void
  /** Called when the user taps the next button. */
  onNext: () => void
}

export default function AiQuestionStage({
  question,
  choices = [],
  selectedChoice = null,
  onSelectChoice,
  onNext,
}: AiQuestionStageProps) {
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <p className="text-xl font-semibold text-[#2d2d3a]">
        {question}
      </p>

      {choices.length > 0 ? (
        <div className="flex w-full max-w-sm flex-col gap-3">
          {choices.map((choice) => {
            const isSelected = selectedChoice === choice

            return (
              <button
                key={choice}
                type="button"
                onClick={() => onSelectChoice?.(choice)}
                className={`rounded-2xl border px-5 py-3 text-sm font-medium shadow-sm transition hover:opacity-90 ${
                  isSelected
                    ? 'border-[#f59e0b] bg-[#fff7ed] text-[#2d2d3a]'
                    : 'border-[#e8e2d8] bg-white text-[#2d2d3a]'
                }`}
              >
                {choice}
              </button>
            )
          })}
        </div>
      ) : null}

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
