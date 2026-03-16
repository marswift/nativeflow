import type { PromptAssemblyResult } from '@/lib/prompt-assembly-types'
import type { ConversationLessonFacadeState } from '@/lib/conversation-lesson-runtime-facade'

export function buildConversationLessonDebugPromptAssembly(args: {
  state: ConversationLessonFacadeState | null
  userId?: string
}): PromptAssemblyResult {
  const userId = args.userId ?? 'u1'
  let currentStepType: string = 'listen'
  let currentStepIndex = 0
  let aiRole: string = 'roommate'
  let totalStepCount = 3
  let sceneId = 'scene-1'
  let microSituationId = 'micro-1'
  let lessonId = 'lesson-1'

  let recentTurns: PromptAssemblyResult['memory']['continuity']['recentTurns'] = []
  if (args.state !== null) {
    const session = args.state.session
    if (session.sceneId != null && String(session.sceneId).trim() !== '') {
      sceneId = String(session.sceneId).trim()
    }
    if (session.microSituationId != null && String(session.microSituationId).trim() !== '') {
      microSituationId = String(session.microSituationId).trim()
    }
    if (session.lessonId != null && String(session.lessonId).trim() !== '') {
      lessonId = String(session.lessonId).trim()
    }
    totalStepCount = args.state.session.steps.length
    currentStepIndex = args.state.lesson.currentStepIndex
    if (args.state.currentStep !== null) {
      currentStepType = args.state.currentStep.type
      aiRole = args.state.currentStep.aiRole ?? 'roommate'
    } else {
      currentStepType =
        args.state.lesson.status === 'completed' ? 'guided' : 'listen'
    }
    if (Array.isArray(args.state.steps)) {
      const turns: PromptAssemblyResult['memory']['continuity']['recentTurns'] = []
      for (const s of args.state.steps) {
        const learnerText =
          s.lastLearnerAnswer != null && String(s.lastLearnerAnswer).trim() !== ''
            ? String(s.lastLearnerAnswer).trim()
            : null
        const assistantText =
          s.lastAssistantText != null && String(s.lastAssistantText).trim() !== ''
            ? String(s.lastAssistantText).trim()
            : null
        if (learnerText != null) {
          turns.push({ speaker: 'user' as const, text: learnerText })
        }
        if (assistantText != null) {
          turns.push({ speaker: 'ai' as const, text: assistantText })
        }
      }
      recentTurns = turns
    }
  }

  return {
    memory: {
      learner: {
        userId,
        targetLanguageCode: 'en',
        targetCountryCode: null,
        targetRegionSlug: null,
        level: 'beginner',
        learningGoal: 'daily speaking',
        regionVariant: 'default',
      },
      learning: {
        weakPatterns: [],
        weakPhraseIds: [],
        weakSkillTags: [],
        strongPatterns: [],
        masteredPhraseIds: [],
        preferredScenes: [],
        avoidedScenes: [],
        recentTopics: [],
        learnerProfileSummary: '',
      },
      scene: {
        sceneId,
        microSituationId,
        aiRole,
        userRole: 'learner',
        objective: 'practice',
        currentTurnGoal: 'answer simply',
        currentStepType: currentStepType as PromptAssemblyResult['memory']['scene']['currentStepType'],
        currentStepIndex,
        totalStepCount,
        supportMode: 'normal',
        hintLevel: 1,
        turnCountInFreeConversation: 0,
        maxFreeConversationTurns: null,
        stateSummary: '',
      },
      continuity: {
        conversationId: 'conv-1',
        lessonId,
        status: 'active',
        recentTurns,
      },
    },
    policy: {
      systemInstruction: 'System instruction',
      levelPolicy: 'Level policy',
      regionPolicy: 'Region policy',
      supportPolicy: 'Support policy',
      outputPolicy: 'Output policy',
    },
  }
}
