'use client'

import type { LessonCopy } from '../../../lib/lesson-copy'
import type { LessonCompletionSummary } from '../../../lib/lesson-summary'

export type LessonCompletionCardProps = {
  summary: LessonCompletionSummary
  copy: LessonCopy
}

/** Presentational card shown when the lesson is completed (summary stats). */
export function LessonCompletionCard({ summary, copy }: LessonCompletionCardProps) {
  const hasTypingStats = summary.totalTypingItems > 0
  const completionLine =
    `${copy.completion.completed} ${summary.completedItems} / ${summary.totalItems} · ` +
    `${copy.completion.progressPercent} ${summary.progressPercent}%`
  const typingLine =
    `${copy.completion.typing} ${summary.correctTypingItems} / ${summary.totalTypingItems}`

  return (
    <section className="mt-6 rounded-lg border border-[#e8e4df] bg-white px-4 py-4">
      <p className="text-sm font-medium text-[#2c2c2c]">{summary.completionMessage}</p>
      <p className="mt-2 text-xs font-medium text-[#7c7c7c]">{summary.theme}</p>
      <p className="mt-3 text-xs text-[#5c5c5c]">{completionLine}</p>
      {hasTypingStats && (
        <p className="mt-1 text-xs text-[#5c5c5c]">{typingLine}</p>
      )}
    </section>
  )
}
