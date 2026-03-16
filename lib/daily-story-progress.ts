import type { DailyStoryPlan, DailyStoryPhase } from './daily-story-types'

export function startDailyStoryPlan(args: {
  plan: DailyStoryPlan
  startedAt: string
}): DailyStoryPlan {
  const { plan, startedAt } = args
  const idx = plan.currentPhaseIndex <= 0 ? 0 : plan.currentPhaseIndex
  const phases: DailyStoryPhase[] = plan.phases.map((p, i) => {
    if (i === idx && p.status === 'not_started') {
      return { ...p, status: 'in_progress' as const }
    }
    return p
  })
  return {
    ...plan,
    status: 'in_progress',
    phases,
    currentPhaseIndex: idx <= 0 ? 0 : idx,
    updatedAt: startedAt,
  }
}

export function completeDailyStoryPhase(args: {
  plan: DailyStoryPlan
  completedAt: string
}): DailyStoryPlan {
  const { plan, completedAt } = args
  const idx = plan.currentPhaseIndex
  if (idx < 0 || idx >= plan.phases.length) {
    return { ...plan, updatedAt: completedAt }
  }
  const phases: DailyStoryPhase[] = plan.phases.map((p, i) => {
    if (i === idx) {
      return { ...p, status: 'completed' as const }
    }
    if (i === idx + 1 && p.status === 'not_started') {
      return { ...p, status: 'in_progress' as const }
    }
    return p
  })
  const hasNext = idx + 1 < plan.phases.length
  return {
    ...plan,
    phases,
    currentPhaseIndex: hasNext ? idx + 1 : idx,
    status: hasNext ? 'in_progress' : 'completed',
    updatedAt: completedAt,
  }
}
