import type {
  DailyStoryPlan,
  DailyStoryPhase,
  DailyStoryPhaseId,
  DailyStorySceneRef,
} from './daily-story-types'

const PHASE_TEMPLATES: Array<{
  id: DailyStoryPhaseId
  title: string
  sceneId: string
  microSituationId: string
  sceneTitle: string
}> = [
  { id: 'wake_up', title: 'Wake Up', sceneId: 'morning', microSituationId: 'wake_up', sceneTitle: 'Morning Wake Up' },
  { id: 'breakfast', title: 'Breakfast', sceneId: 'breakfast', microSituationId: 'at_home_breakfast', sceneTitle: 'Breakfast at Home' },
  { id: 'commute', title: 'Commute', sceneId: 'commute', microSituationId: 'train_or_bus', sceneTitle: 'Daily Commute' },
  { id: 'work_or_study', title: 'Work or Study', sceneId: 'work', microSituationId: 'start_work_or_study', sceneTitle: 'Work or Study Time' },
  { id: 'lunch', title: 'Lunch', sceneId: 'lunch', microSituationId: 'lunch_break', sceneTitle: 'Lunch Break' },
  { id: 'shopping', title: 'Shopping', sceneId: 'shopping', microSituationId: 'convenience_store', sceneTitle: 'Quick Shopping' },
  { id: 'dinner', title: 'Dinner', sceneId: 'dinner', microSituationId: 'dinner_at_home', sceneTitle: 'Dinner Time' },
  { id: 'relax', title: 'Relax', sceneId: 'evening', microSituationId: 'relaxing_at_home', sceneTitle: 'Relaxing at Home' },
  { id: 'sleep', title: 'Sleep', sceneId: 'night', microSituationId: 'going_to_bed', sceneTitle: 'Going to Bed' },
]

function buildPhase(t: (typeof PHASE_TEMPLATES)[0], orderIndex: number): DailyStoryPhase {
  const scene: DailyStorySceneRef = {
    sceneId: t.sceneId,
    microSituationId: t.microSituationId,
    title: t.sceneTitle,
    description: null,
  }
  return {
    id: t.id,
    type: t.id,
    orderIndex,
    title: t.title,
    description: null,
    status: 'not_started',
    scene,
  }
}

export function buildDefaultDailyStoryPlan(args: {
  userId: string
  storyDate: string
}): DailyStoryPlan {
  const { userId, storyDate } = args
  const phases: DailyStoryPhase[] = PHASE_TEMPLATES.map((t, i) =>
    buildPhase(t, i + 1)
  )
  return {
    id: `daily-story:${userId}:${storyDate}`,
    userId,
    storyDate,
    title: 'Daily Story',
    status: 'not_started',
    phases,
    currentPhaseIndex: 0,
    createdAt: storyDate,
    updatedAt: storyDate,
  }
}
