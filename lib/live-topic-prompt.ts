import type { PromptAssemblyResult } from '@/lib/prompt-assembly-types'

const EMPTY_FALLBACK =
  'Do not force current events or trends into the conversation unless they naturally fit the situation.'

export function buildLiveTopicPrompt(args: {
  promptAssemblyResult: PromptAssemblyResult
  liveTopics?: string[]
}): string {
  const { promptAssemblyResult, liveTopics } = args
  const hasTopics =
    Array.isArray(liveTopics) && liveTopics.length > 0
  if (!hasTopics) {
    return EMPTY_FALLBACK
  }
  const scene = promptAssemblyResult.memory.scene
  const sceneDesc = [scene.sceneId, scene.microSituationId]
    .filter(Boolean)
    .join(' / ')
  const topicList = liveTopics
    .map((t) => (typeof t === 'string' ? t.trim() : ''))
    .filter(Boolean)
    .slice(0, 8)
    .join(', ')
  return [
    'Prefer daily-life relevance, local practicality, and natural small-talk.',
    sceneDesc
      ? `Current scene: ${sceneDesc}. Objective: ${scene.objective}. Turn goal: ${scene.currentTurnGoal}. Step: ${scene.currentStepType}.`
      : '',
    'You may naturally reference recent topics or trends only when they fit this scene. Do not force heavy or sensitive news into casual conversation. Keep references simple, natural, and beginner-friendly.',
    `Optional live topics (use only if relevant): ${topicList}.`,
  ]
    .filter(Boolean)
    .join(' ')
}
