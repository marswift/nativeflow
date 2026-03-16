export type DailyStoryPhaseId =
  | 'wake_up'
  | 'breakfast'
  | 'commute'
  | 'work_or_study'
  | 'lunch'
  | 'shopping'
  | 'dinner'
  | 'relax'
  | 'sleep'

export type DailyStoryStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'

export type DailyStorySceneRef = {
  sceneId: string
  microSituationId: string
  title: string
  description: string | null
}

export type DailyStoryPhase = {
  id: DailyStoryPhaseId
  type: DailyStoryPhaseId
  orderIndex: number
  title: string
  description: string | null
  status: DailyStoryStatus
  scene: DailyStorySceneRef
}

export type DailyStoryPlan = {
  id: string
  userId: string
  storyDate: string
  title: string
  status: DailyStoryStatus
  phases: DailyStoryPhase[]
  currentPhaseIndex: number
  createdAt: string
  updatedAt: string
}
