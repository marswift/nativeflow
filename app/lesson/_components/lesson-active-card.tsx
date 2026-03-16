'use client'

import type { LessonCopy } from '../../../lib/lesson-copy'
import type { LessonBlock, LessonBlockItem } from '../../../lib/lesson-engine'
import type { LessonProgressState } from '../../../lib/lesson-progress'

function hasAnswer(answer: string | null | undefined): boolean {
  return answer != null && answer !== ''
}

export type LessonActiveCardProps = {
  block: LessonBlock
  item: LessonBlockItem
  progress: LessonProgressState
  inputValue: string
  onInputChange: (value: string) => void
  onCheck: () => void
  onNext: () => void
  copy: LessonCopy
  isLessonComplete: boolean
}

/**
 * Presentational card for the current block/item during an active lesson.
 * Receives callbacks for check and next; logic stays in the page.
 */
export function LessonActiveCard({
  block,
  item,
  progress,
  inputValue,
  onInputChange,
  onCheck,
  onNext,
  copy,
  isLessonComplete,
}: LessonActiveCardProps) {
  const nextButtonLabel = isLessonComplete ? copy.buttons.complete : copy.buttons.next
  const typingResultClassName =
    progress.isCorrect == null
      ? ''
      : progress.isCorrect
        ? 'text-green-700'
        : 'text-amber-700'

  return (
    <section className="mt-4 rounded-lg border border-[#e8e4df] bg-white px-4 py-4">
      <h2 className="text-sm font-semibold text-[#2c2c2c]">{block.title}</h2>
      <p className="mt-1 text-sm text-[#5c5c5c]">{block.description}</p>
      <p className="mt-1 text-xs text-[#7c7c7c]">
        {copy.block.estimatedPrefix}
        {block.estimatedMinutes}
        {copy.block.estimatedSuffix}
      </p>
      <div className="mt-4 rounded-lg border border-[#e8e4df] bg-[#faf8f5] px-3 py-3">
        <p className="text-sm font-medium text-[#2c2c2c]">{item.prompt}</p>
        {block.type === 'typing' ? (
          <>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              disabled={progress.checked}
              placeholder={copy.typing.placeholder}
              className="mt-3 w-full rounded-lg border border-[#e8e4df] bg-white px-3 py-2 text-sm text-[#2c2c2c] placeholder:text-[#9c9c9c] focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 disabled:bg-[#e8e4df] disabled:text-[#5c5c5c]"
            />
            {!progress.checked ? (
              <button
                type="button"
                onClick={onCheck}
                className="mt-3 w-full rounded-lg bg-amber-500 py-2 font-medium text-white text-sm hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
              >
                {copy.typing.checkButton}
              </button>
            ) : (
              <>
                {progress.isCorrect !== null && (
                  <p className={`mt-3 text-sm font-medium ${typingResultClassName}`}>
                    {progress.isCorrect ? copy.typing.correct : copy.typing.incorrect}
                  </p>
                )}
                {hasAnswer(item.answer) && (
                  <p className="mt-2 text-xs text-[#7c7c7c]">
                    {copy.typing.answerLabel}
                    {item.answer}
                  </p>
                )}
                {!progress.completed && (
                  <button
                    type="button"
                    onClick={onNext}
                    className="mt-3 w-full rounded-lg border border-[#e8e4df] bg-white py-2 font-medium text-[#2c2c2c] text-sm hover:bg-[#f5f3f0] focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
                  >
                    {nextButtonLabel}
                  </button>
                )}
              </>
            )}
          </>
        ) : (
          <>
            {hasAnswer(item.answer) && (
              <p className="mt-2 text-xs text-[#7c7c7c]">{item.answer}</p>
            )}
          </>
        )}
      </div>
    </section>
  )
}
