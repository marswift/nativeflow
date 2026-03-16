import type {
  ConversationStepType,
  LearnerLevel,
  SupportMode,
  ConversationSessionRow,
  ConversationTurnRow,
  LearnerMemoryRow,
  SceneStateRow,
} from './conversation-memory-types'

import type {
  RegionVariant,
  PromptRecentTurn,
  PromptLearnerView,
  PromptLearningView,
  PromptSceneView,
  PromptContinuityView,
  PromptAssemblyInput,
  PromptMemoryView,
  PromptPolicyView,
  PromptAssemblyResult,
  BuildPromptMemoryViewOptions,
  BuildPromptPolicyViewOptions,
} from './prompt-assembly-types'

const DEFAULT_RECENT_TURN_LIMIT = 8

export function resolveRegionVariant(
  targetCountryCode: string | null | undefined
): RegionVariant {
  const normalized = (targetCountryCode ?? '').trim().toUpperCase()

  if (normalized === 'US') return 'us'
  if (normalized === 'GB' || normalized === 'UK') return 'uk'
  if (normalized === 'AU') return 'au'

  return 'default'
}

export function buildPromptRecentTurns(
  turns: ConversationTurnRow[],
  limit = DEFAULT_RECENT_TURN_LIMIT
): PromptRecentTurn[] {
  const sliced = turns.slice(-Math.max(0, limit))
  return sliced.map((turn) => ({
    speaker: turn.speaker,
    text: turn.corrected_text?.trim() || turn.normalized_text?.trim() || turn.raw_text.trim(),
  }))
}

export function buildPromptLearnerView(
  session: ConversationSessionRow,
  learnerMemory: LearnerMemoryRow | null
): PromptLearnerView {
  return {
    userId: session.user_id,
    targetLanguageCode: session.target_language_code,
    targetCountryCode: session.target_country_code,
    targetRegionSlug: session.target_region_slug,
    level: learnerMemory?.current_level ?? session.learner_level,
    learningGoal: learnerMemory?.learning_goal ?? null,
    regionVariant: resolveRegionVariant(session.target_country_code),
  }
}

export function buildPromptLearningView(
  learnerMemory: LearnerMemoryRow | null
): PromptLearningView {
  return {
    weakPatterns: learnerMemory?.weak_patterns ?? [],
    weakPhraseIds: learnerMemory?.weak_phrase_ids ?? [],
    weakSkillTags: learnerMemory?.weak_skill_tags ?? [],
    strongPatterns: learnerMemory?.strong_patterns ?? [],
    masteredPhraseIds: learnerMemory?.mastered_phrase_ids ?? [],
    preferredScenes: learnerMemory?.preferred_scenes ?? [],
    avoidedScenes: learnerMemory?.avoided_scenes ?? [],
    recentTopics: learnerMemory?.recent_topics ?? [],
    learnerProfileSummary: learnerMemory?.learner_profile_summary ?? '',
  }
}

export function buildPromptSceneView(
  session: ConversationSessionRow,
  sceneState: SceneStateRow | null
): PromptSceneView {
  return {
    sceneId: sceneState?.scene_id ?? session.scene_id,
    microSituationId: sceneState?.micro_situation_id ?? session.micro_situation_id,
    aiRole: sceneState?.ai_role ?? session.ai_role,
    userRole: sceneState?.user_role ?? 'learner',
    objective: sceneState?.objective ?? '',
    currentTurnGoal: sceneState?.current_turn_goal ?? '',
    currentStepType: session.current_step_type,
    currentStepIndex: sceneState?.current_step_index ?? 0,
    totalStepCount: sceneState?.total_step_count ?? 0,
    supportMode: sceneState?.support_mode ?? 'normal',
    hintLevel: sceneState?.hint_level ?? 1,
    turnCountInFreeConversation: sceneState?.turn_count_in_free_conversation ?? 0,
    maxFreeConversationTurns: sceneState?.max_free_conversation_turns ?? null,
    stateSummary: sceneState?.state_summary ?? '',
  }
}

export function buildPromptContinuityView(
  session: ConversationSessionRow,
  recentTurns: ConversationTurnRow[],
  options?: BuildPromptMemoryViewOptions
): PromptContinuityView {
  return {
    conversationId: session.id,
    lessonId: session.lesson_id,
    status: session.status,
    recentTurns: buildPromptRecentTurns(
      recentTurns,
      options?.recentTurnLimit ?? DEFAULT_RECENT_TURN_LIMIT
    ),
  }
}

export function buildPromptMemoryView(
  input: PromptAssemblyInput,
  options?: BuildPromptMemoryViewOptions
): PromptMemoryView {
  return {
    learner: buildPromptLearnerView(input.session, input.learnerMemory),
    learning: buildPromptLearningView(input.learnerMemory),
    scene: buildPromptSceneView(input.session, input.sceneState),
    continuity: buildPromptContinuityView(input.session, input.recentTurns, options),
  }
}

export function buildSystemInstruction(): string {
  return [
    'You are the speaking partner and coach inside NativeFlow.',
    'NativeFlow is an AI Daily Life Speaking Simulator.',
    'Stay inside the assigned scene and micro situation.',
    'Help the learner speak, not just read or analyze.',
    'Keep the interaction psychologically safe, practical, and concise.',
    'Do not switch topics unless the scene requires it.',
  ].join(' ')
}

export function buildLevelPolicy(level: LearnerLevel): string {
  if (level === 'beginner') {
    return [
      'Use short and clear sentences.',
      'Ask for one piece of information at a time.',
      'Prefer high-frequency words and simple sentence structures.',
      'Keep follow-up questions easy and direct.',
    ].join(' ')
  }

  if (level === 'intermediate') {
    return [
      'Use natural but still clear sentences.',
      'Allow short explanations and simple reasons.',
      'Ask follow-up questions that extend the conversation moderately.',
      'Introduce slightly richer structures while staying practical.',
    ].join(' ')
  }

  return [
    'Use natural and fluent language suitable for advanced learners.',
    'Allow nuance, longer explanations, and flexible follow-ups.',
    'Keep the conversation scene-bound and realistic.',
    'Challenge the learner without becoming unnatural or academic.',
  ].join(' ')
}

export function buildRegionPolicy(regionVariant: RegionVariant): string {
  if (regionVariant === 'us') {
    return [
      'Use natural modern American English.',
      'Prefer common US vocabulary and phrasing.',
      'Keep wording clear enough for learners.',
    ].join(' ')
  }

  if (regionVariant === 'uk') {
    return [
      'Use natural modern British English.',
      'Prefer common UK vocabulary and phrasing.',
      'Keep wording clear enough for learners.',
    ].join(' ')
  }

  if (regionVariant === 'au') {
    return [
      'Use natural modern Australian English.',
      'Prefer common Australian phrasing when appropriate.',
      'Keep wording clear enough for learners and avoid overly obscure slang.',
    ].join(' ')
  }

  return [
    'Use neutral, natural English.',
    'Keep wording clear, practical, and learner-friendly.',
  ].join(' ')
}

export function buildSupportPolicy(
  supportMode: SupportMode,
  hintLevel: 0 | 1 | 2 | 3
): string {
  const hintRule =
    hintLevel === 0
      ? 'Give no proactive hints unless the learner clearly gets stuck.'
      : hintLevel === 1
        ? 'Give light hints only when useful.'
        : hintLevel === 2
          ? 'Give supportive hints and examples when needed.'
          : 'Give strong scaffolding, examples, and support.'

  if (supportMode === 'high_support') {
    return [
      'Be highly supportive and reduce output pressure.',
      'Guide the learner step by step.',
      hintRule,
    ].join(' ')
  }

  if (supportMode === 'supportive') {
    return [
      'Be supportive and encouraging.',
      'Use scaffolding when helpful.',
      hintRule,
    ].join(' ')
  }

  return [
    'Be supportive but efficient.',
    'Do not over-explain unless needed.',
    hintRule,
  ].join(' ')
}

export function buildOutputPolicy(stepType: ConversationStepType): string {
  if (stepType === 'listen') {
    return [
      'This is a listen step.',
      'Provide the target line clearly.',
      'Do not ask for free conversation yet.',
    ].join(' ')
  }

  if (stepType === 'repeat') {
    return [
      'This is a repeat step.',
      'Focus on imitation of the target sentence.',
      'Keep the learner output narrow and safe.',
    ].join(' ')
  }

  if (stepType === 'pattern') {
    return [
      'This is a pattern practice step.',
      'Keep the structure stable and vary only the intended slots.',
      'Do not broaden into open conversation.',
    ].join(' ')
  }

  if (stepType === 'guided') {
    return [
      'This is a guided conversation step.',
      'Ask a simple scene-based question.',
      'Make the learner answer in a controlled way.',
    ].join(' ')
  }

  if (stepType === 'free_conversation') {
    return [
      'This is a free conversation step.',
      'Keep the conversation inside the current scene.',
      'Do not turn it into a generic blank chat.',
      'Support the learner if they hesitate.',
    ].join(' ')
  }

  return [
    'This is a review step.',
    'Focus on retrieval, correction, and short spoken reuse.',
  ].join(' ')
}

export function buildPromptPolicyView(
  options: BuildPromptPolicyViewOptions = {}
): PromptPolicyView {
  const level = options.level ?? 'beginner'
  const regionVariant = options.regionVariant ?? 'default'
  const supportMode = options.supportMode ?? 'normal'
  const stepType = options.stepType ?? 'guided'
  const hintLevel = options.hintLevel ?? 1

  return {
    systemInstruction: buildSystemInstruction(),
    levelPolicy: buildLevelPolicy(level),
    regionPolicy: buildRegionPolicy(regionVariant),
    supportPolicy: buildSupportPolicy(supportMode, hintLevel),
    outputPolicy: buildOutputPolicy(stepType),
  }
}

export function buildPromptAssemblyResult(
  input: PromptAssemblyInput,
  options?: BuildPromptMemoryViewOptions
): PromptAssemblyResult {
  const memory = buildPromptMemoryView(input, options)

  const policy = buildPromptPolicyView({
    stepType: memory.scene.currentStepType,
    level: memory.learner.level,
    regionVariant: memory.learner.regionVariant,
    supportMode: memory.scene.supportMode,
    hintLevel: memory.scene.hintLevel,
  })

  return { memory, policy }
}
