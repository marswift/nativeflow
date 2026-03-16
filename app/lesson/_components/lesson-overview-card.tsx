'use client'

import type { LessonCopy } from '../../../lib/lesson-copy'
import type { LessonSession } from '../../../lib/lesson-engine'

function OverviewRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div>
      <p className="text-xs font-medium text-[#7c7c7c]">{label}</p>
      <p className="mt-0.5 text-[#2c2c2c]">{value}</p>
    </div>
  )
}

export type LessonOverviewCardProps = {
  lesson: LessonSession
  copy: LessonCopy
  getLevelLabel: (level: LessonSession['level']) => string
}

/** Presentational card showing lesson theme, level, and estimated time (pre-start view). */
export function LessonOverviewCard({
  lesson,
  copy,
  getLevelLabel,
}: LessonOverviewCardProps) {
  const estimatedTimeText = `${lesson.totalEstimatedMinutes}${copy.block.estimatedSuffix}`

  return (
    <div className="mt-6 rounded-lg border border-[#e8e4df] bg-white px-4 py-4 space-y-3">
      <OverviewRow label={copy.meta.theme} value={lesson.theme} />
      <OverviewRow label={copy.meta.level} value={getLevelLabel(lesson.level)} />
      <OverviewRow label={copy.meta.estimatedTime} value={estimatedTimeText} />
    </div>
  )
}
