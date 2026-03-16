import type {
  PromptAssemblyResult,
  PromptMemoryView,
  PromptPolicyView,
  PromptRecentTurn,
} from './prompt-assembly-types'

function orNone(s: string | null | undefined): string {
  const t = s?.trim()
  return t ? t : 'none'
}

function orNoneList(arr: string[] | null | undefined): string {
  if (!arr?.length) return 'none'
  return arr.map((x) => x?.trim()).filter(Boolean).join(', ') || 'none'
}

const SPEAKER_LABEL: Record<PromptRecentTurn['speaker'], string> = {
  user: 'USER',
  ai: 'AI',
  system: 'SYSTEM',
}

export function formatRecentTurns(recentTurns: PromptRecentTurn[]): string {
  if (!recentTurns?.length) return 'No recent turns.'
  const lines = recentTurns
    .map((t) => {
      const text = t.text?.trim()
      if (!text) return null
      return `${SPEAKER_LABEL[t.speaker]}: ${text}`
    })
    .filter((line): line is string => line != null)
  return lines.length ? lines.join('\n') : 'No recent turns.'
}

export function formatPromptMemory(memory: PromptMemoryView): string {
  const { learner, learning, scene, continuity } = memory
  const sections: string[] = []

  sections.push(
    '[LEARNER]',
    `userId: ${orNone(learner.userId)}`,
    `targetLanguageCode: ${orNone(learner.targetLanguageCode)}`,
    `targetCountryCode: ${orNone(learner.targetCountryCode)}`,
    `targetRegionSlug: ${orNone(learner.targetRegionSlug)}`,
    `level: ${learner.level}`,
    `learningGoal: ${orNone(learner.learningGoal)}`,
    `regionVariant: ${learner.regionVariant}`
  )

  sections.push(
    '[LEARNING_MEMORY]',
    `weakPatterns: ${orNoneList(learning.weakPatterns)}`,
    `weakPhraseIds: ${orNoneList(learning.weakPhraseIds)}`,
    `weakSkillTags: ${orNoneList(learning.weakSkillTags)}`,
    `strongPatterns: ${orNoneList(learning.strongPatterns)}`,
    `masteredPhraseIds: ${orNoneList(learning.masteredPhraseIds)}`,
    `preferredScenes: ${orNoneList(learning.preferredScenes)}`,
    `avoidedScenes: ${orNoneList(learning.avoidedScenes)}`,
    `recentTopics: ${orNoneList(learning.recentTopics)}`,
    `learnerProfileSummary: ${orNone(learning.learnerProfileSummary)}`
  )

  sections.push(
    '[SCENE]',
    `sceneId: ${orNone(scene.sceneId)}`,
    `microSituationId: ${orNone(scene.microSituationId)}`,
    `aiRole: ${orNone(scene.aiRole)}`,
    `userRole: ${orNone(scene.userRole)}`,
    `objective: ${orNone(scene.objective)}`,
    `currentTurnGoal: ${orNone(scene.currentTurnGoal)}`,
    `currentStepType: ${scene.currentStepType}`,
    `currentStepIndex: ${scene.currentStepIndex}`,
    `totalStepCount: ${scene.totalStepCount}`,
    `supportMode: ${scene.supportMode}`,
    `hintLevel: ${scene.hintLevel}`,
    `turnCountInFreeConversation: ${scene.turnCountInFreeConversation}`,
    `maxFreeConversationTurns: ${scene.maxFreeConversationTurns ?? 'none'}`,
    `stateSummary: ${orNone(scene.stateSummary)}`
  )

  sections.push(
    '[CONTINUITY]',
    `conversationId: ${orNone(continuity.conversationId)}`,
    `lessonId: ${orNone(continuity.lessonId)}`,
    `status: ${continuity.status}`,
    `recentTurns:\n${formatRecentTurns(continuity.recentTurns)}`
  )

  return sections.join('\n')
}

export function formatPromptPolicy(policy: PromptPolicyView): string {
  const sections = [
    '[SYSTEM_INSTRUCTION]',
    orNone(policy.systemInstruction),
    '[LEVEL_POLICY]',
    orNone(policy.levelPolicy),
    '[REGION_POLICY]',
    orNone(policy.regionPolicy),
    '[SUPPORT_POLICY]',
    orNone(policy.supportPolicy),
    '[OUTPUT_POLICY]',
    orNone(policy.outputPolicy),
  ]
  return sections.join('\n')
}

export function buildSystemPrompt(result: PromptAssemblyResult): string {
  return (
    formatPromptPolicy(result.policy) + '\n\n' + formatPromptMemory(result.memory)
  )
}

export function buildUserPrompt(args: {
  learnerUtterance?: string | null
  stepInstruction?: string | null
  expectedAnswer?: string | null
  hint?: string | null
}): string {
  const parts = [
    '[STEP_INSTRUCTION]',
    orNone(args.stepInstruction),
    '[LEARNER_UTTERANCE]',
    orNone(args.learnerUtterance),
    '[EXPECTED_ANSWER]',
    orNone(args.expectedAnswer),
    '[HINT]',
    orNone(args.hint),
  ]
  return parts.join('\n')
}

export function buildPromptMessages(args: {
  result: PromptAssemblyResult
  learnerUtterance?: string | null
  stepInstruction?: string | null
  expectedAnswer?: string | null
  hint?: string | null
}): { system: string; user: string } {
  return {
    system: buildSystemPrompt(args.result),
    user: buildUserPrompt({
      learnerUtterance: args.learnerUtterance,
      stepInstruction: args.stepInstruction,
      expectedAnswer: args.expectedAnswer,
      hint: args.hint,
    }),
  }
}
