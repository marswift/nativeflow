/**
 * Builds scene context for AI conversation prompts.
 * Conversation design: AI-led guided activation (see docs/ai-conversation-direction.md).
 * The AI should ask questions that activate the learner's recently learned phrases in this scene.
 */
import type { PromptAssemblyResult } from '@/lib/prompt-assembly-types'

export function buildScenePrompt(
  promptAssemblyResult: PromptAssemblyResult
): string {
  const scene = promptAssemblyResult.memory.scene
  const learner = promptAssemblyResult.memory.learner
  const sceneDesc = [scene.sceneId, scene.microSituationId]
    .filter(Boolean)
    .join(' / ')
  const parts: string[] = []
  if (sceneDesc) {
    parts.push(`Current scene: ${sceneDesc}.`)
  }
  parts.push(
    `You are ${scene.aiRole}; the learner is ${scene.userRole}. Objective: ${scene.objective}. Current turn goal: ${scene.currentTurnGoal}. Step type: ${scene.currentStepType}.`
  )
  const country = learner.targetCountryCode?.trim()
  const region = learner.targetRegionSlug?.trim()
  const variant = learner.regionVariant
  if (country || region || (variant && variant !== 'default')) {
    const loc: string[] = []
    if (country) loc.push(`country ${country}`)
    if (region) loc.push(`region ${region}`)
    if (variant && variant !== 'default') loc.push(`variant ${variant}`)
    if (loc.length > 0) {
      parts.push(`Target locale: ${loc.join(', ')}.`)
    }
  }
  parts.push(
    'Make the conversation feel like real life in this place. Reflect local culture, atmosphere, and common situations; use region-appropriate wording and natural local flavor when suitable.'
  )
  parts.push('Keep the English simple and beginner-friendly. Avoid unnatural or overly advanced language.')
  return parts.join(' ')
}
