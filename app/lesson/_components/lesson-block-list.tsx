'use client'

import type { LessonCopy } from '../../../lib/lesson-copy'
import type { LessonSession } from '../../../lib/lesson-engine'

function hasAnswer(answer: string | null | undefined): boolean {
  return answer != null && answer !== ''
}

export type LessonBlockListProps = {
  blocks: LessonSession['blocks']
  copy: LessonCopy
}

/** Presentational list of lesson blocks and items (pre-start view). */
export function LessonBlockList({ blocks, copy }: LessonBlockListProps) {
  return (
    <div className="mt-8 space-y-6">
      {blocks.map((block) => {
        const estimatedTimeText =
          `${copy.block.estimatedPrefix}${block.estimatedMinutes}${copy.block.estimatedSuffix}`
        return (
          <section
            key={block.id}
            className="rounded-lg border border-[#e8e4df] bg-white px-4 py-4"
          >
            <h3 className="text-sm font-semibold text-[#2c2c2c]">{block.title}</h3>
            <p className="mt-1 text-sm text-[#5c5c5c]">{block.description}</p>
            <p className="mt-1 text-xs text-[#7c7c7c]">{estimatedTimeText}</p>
            <ul className="mt-3 space-y-2">
              {block.items.map((item) => (
                <li
                  key={item.id}
                  className="border-b border-[#e8e4df] pb-2 last:border-0 last:pb-0"
                >
                  <p className="text-sm text-[#2c2c2c]">{item.prompt}</p>
                  {hasAnswer(item.answer) && (
                    <p className="mt-0.5 text-xs text-[#7c7c7c]">{item.answer}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
