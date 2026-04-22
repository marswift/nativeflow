import type { UserProfileRow } from './types'
import type { LessonSession } from './lesson-engine'
import { createSession } from './lesson-runtime'
import { generateLessonSessionInput, type LessonSessionInput } from './lesson-generator-service'
import { createLessonSessionConfig, type LessonSessionFactoryOutput } from './lesson-session-factory'
import { createLessonBlueprint, createLessonBlueprintFromScenes, type LessonBlueprint } from './lesson-blueprint-service'
import { createLessonBlueprintDraft, type LessonBlueprintDraft } from './lesson-blueprint-adapter'
import { createLessonDraftSession, type LessonDraftSession } from './lesson-draft-session-mapper'
import { createLessonAIPromptPayload, type LessonAIPromptPayload } from './lesson-ai-prompt-builder'
import { createLessonAIMessages, type LessonAIMessage } from './lesson-ai-message-builder'
import { getSceneImagePath } from './scene-image-map'
import type { CorpusSelectionMetadata } from './corpus/lesson-selection-adapter'
import { getLanguageLearningMode, type LanguageLearningMode } from './language-learning-mode'

type LessonCharacterKey = 'alex' | 'emma' | 'leo'

type LessonCharacterEmotion =
  | 'base'
  | 'neutral'
  | 'happy'
  | 'excited'
  | 'thinking'
  | 'encouraging'
  | 'gentle'
  | 'speaking'
  | 'confused'
  | 'proud'

type LessonSceneType =
  | 'cafe'
  | 'shopping'
  | 'restaurant'
  | 'travel'
  | 'hotel'
  | 'airport'
  | 'station'
  | 'office'
  | 'home'
  | 'daily'
  | 'question'
  | 'support'
  | 'general'

type LessonSessionOverviewMeta = {
  overviewEstimatedMinutes: number
  overviewStepCount: number
  overviewFlowPoint: number
  overviewSceneLabel: string
  overviewSceneDescription: string
  overviewBlockCount: number
  overviewCharacterKey: LessonCharacterKey
  overviewCharacterName: string
  overviewCharacterEmotion: LessonCharacterEmotion
  overviewImageUrl: string
  overviewBackgroundKey: string
  overviewBackgroundImageUrl: string
}

type ExtendedLessonSession = LessonSession & {
  id: string
  sessionId: string

  totalEstimatedMinutes: number
  overviewEstimatedMinutes: number
  overviewStepCount: number
  overviewFlowPoint: number
  overviewSceneLabel: string
  overviewSceneDescription: string
  overviewBlockCount: number
  overviewCharacterKey: LessonCharacterKey
  overviewCharacterName: string
  overviewCharacterEmotion: LessonCharacterEmotion
  overviewImageUrl: string
  overviewBackgroundKey: string
  overviewBackgroundImageUrl: string
}


function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function getLevelWeight(level: unknown): number {
  if (typeof level !== 'string') return 1

  const normalized = level.trim().toLowerCase()

  if (
    normalized.includes('c2') ||
    normalized.includes('c1') ||
    normalized.includes('advanced')
  ) {
    return 4
  }

  if (
    normalized.includes('b2') ||
    normalized.includes('upper')
  ) {
    return 3
  }

  if (
    normalized.includes('b1') ||
    normalized.includes('intermediate')
  ) {
    return 2
  }

  if (
    normalized.includes('a2') ||
    normalized.includes('elementary')
  ) {
    return 1
  }

  if (
    normalized.includes('a1') ||
    normalized.includes('beginner') ||
    normalized.includes('starter')
  ) {
    return 0
  }

  return 1
}

function getDraftBlockCount(draft: LessonDraftSession | null): number {
  const blocks = (draft as { blocks?: unknown } | null)?.blocks
  return Array.isArray(blocks) && blocks.length > 0 ? blocks.length : 4
}

function resolveOverviewEstimatedMinutes(
  profile: UserProfileRow,
  _draft: LessonDraftSession | null
): number {
  const dailyGoal =
    typeof profile.daily_study_minutes_goal === 'number'
      ? profile.daily_study_minutes_goal
      : Number(profile.daily_study_minutes_goal ?? 0)

  return Number.isFinite(dailyGoal) && dailyGoal > 0 ? dailyGoal : 30
}

function resolveOverviewStepCount(draft: LessonDraftSession | null): number {
  const blockCount = getDraftBlockCount(draft)
  return Math.max(5, blockCount)
}

function resolveOverviewFlowPoint(params: {
  profile: UserProfileRow
  draft: LessonDraftSession | null
  estimatedMinutes: number
  stepCount: number
}): number {
  const blockCount = getDraftBlockCount(params.draft)
  const levelWeight = getLevelWeight(params.profile.current_level)

  const score =
    params.stepCount * 6 +
    blockCount * 3 +
    levelWeight * 4 +
    Math.round(params.estimatedMinutes / 2)

  return clampNumber(score, 30, 90)
}

function normalizeOverviewSceneLabel(raw: unknown): string | null {
  if (typeof raw !== 'string') return null

  const value = raw.trim()
  if (!value) return null
  if (/^\d+$/.test(value)) return null
  if (value.length <= 2) return null
  if (/^(theme|scene|lesson|unit)[-_]?\d+$/i.test(value)) return null
  if (/^[a-z0-9_-]+$/i.test(value) && /[_-]/.test(value)) return null

  return value
}

function resolveOverviewSceneLabel(lesson: LessonSession): string {
  const candidates = [
    (lesson as { theme?: unknown }).theme,
    (lesson as { scene?: unknown }).scene,
    (lesson as { title?: unknown }).title,
  ]

  for (const candidate of candidates) {
    const normalized = normalizeOverviewSceneLabel(candidate)
    if (normalized) return normalized
  }

  return '日常の短いやり取り'
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase()
}

function resolveOverviewSceneType(sceneLabel: string): LessonSceneType {
  const text = normalizeText(sceneLabel)

  if (
    text.includes('airport') ||
    text.includes('空港')
  ) {
    return 'airport'
  }

  if (
    text.includes('station') ||
    text.includes('train') ||
    text.includes('駅') ||
    text.includes('電車')
  ) {
    return 'station'
  }

  if (
    text.includes('hotel') ||
    text.includes('ホテル')
  ) {
    return 'hotel'
  }

  if (
    text.includes('travel') ||
    text.includes('adventure') ||
    text.includes('移動') ||
    text.includes('旅行') ||
    text.includes('出発')
  ) {
    return 'travel'
  }

  if (
    text.includes('shopping') ||
    text.includes('買い物') ||
    text.includes('mall')
  ) {
    return 'shopping'
  }

  if (
    text.includes('restaurant') ||
    text.includes('レストラン') ||
    text.includes('food')
  ) {
    return 'restaurant'
  }

  if (
    text.includes('cafe') ||
    text.includes('カフェ')
  ) {
    return 'cafe'
  }

  if (
    text.includes('office') ||
    text.includes('work') ||
    text.includes('meeting') ||
    text.includes('会社') ||
    text.includes('仕事')
  ) {
    return 'office'
  }

  if (
    text.includes('home') ||
    text.includes('家')
  ) {
    return 'home'
  }

  if (
    text.includes('question') ||
    text.includes('interview') ||
    text.includes('problem') ||
    text.includes('think') ||
    text.includes('相談') ||
    text.includes('質問') ||
    text.includes('考える')
  ) {
    return 'question'
  }

  if (
    text.includes('welcome') ||
    text.includes('help') ||
    text.includes('support') ||
    text.includes('guide') ||
    text.includes('案内') ||
    text.includes('サポート')
  ) {
    return 'support'
  }

  if (
    text.includes('friend') ||
    text.includes('daily') ||
    text.includes('日常') ||
    text.includes('会話')
  ) {
    return 'daily'
  }

  return 'general'
}

function resolveOverviewCharacterKey(sceneType: LessonSceneType): LessonCharacterKey {
  switch (sceneType) {
    case 'shopping':
    case 'restaurant':
    case 'cafe':
    case 'daily':
    case 'home':
      return 'emma'

    case 'travel':
    case 'airport':
    case 'station':
    case 'hotel':
      return 'leo'

    case 'office':
    case 'question':
    case 'support':
    case 'general':
    default:
      return 'alex'
  }
}

function getOverviewCharacterName(characterKey: LessonCharacterKey): string {
  switch (characterKey) {
    case 'alex':
      return 'Alex'
    case 'emma':
      return 'Emma'
    case 'leo':
      return 'Leo'
    default:
      return 'Alex'
  }
}

function resolveOverviewCharacterEmotion(
  characterKey: LessonCharacterKey,
  sceneType: LessonSceneType
): LessonCharacterEmotion {
  switch (characterKey) {
    case 'alex':
      switch (sceneType) {
        case 'question':
        case 'office':
          return 'thinking'
        case 'support':
          return 'encouraging'
        case 'daily':
        case 'general':
          return 'speaking'
        default:
          return 'neutral'
      }

    case 'emma':
      switch (sceneType) {
        case 'question':
          return 'thinking'
        case 'shopping':
        case 'restaurant':
        case 'cafe':
        case 'daily':
        case 'home':
          return 'gentle'
        case 'support':
          return 'happy'
        default:
          return 'neutral'
      }

    case 'leo':
      switch (sceneType) {
        case 'travel':
        case 'airport':
        case 'station':
        case 'hotel':
          return 'excited'
        case 'support':
          return 'proud'
        default:
          return 'happy'
      }

    default:
      return 'neutral'
  }
}

function resolveCharacterAssetFilename(
  characterKey: LessonCharacterKey,
  emotion: LessonCharacterEmotion
): string {
  switch (characterKey) {
    case 'alex': {
      switch (emotion) {
        case 'speaking':
          return 'speaking.png'
        case 'encouraging':
          return 'encouraging.png'
        case 'thinking':
          return 'thinking.png'
        case 'happy':
          return 'happy.png'
        case 'base':
          return 'base.png'
        case 'neutral':
          return 'neutral.png'
        default:
          return 'neutral.png'
      }
    }

    case 'emma': {
      switch (emotion) {
        case 'gentle':
          return 'gentle.png'
        case 'happy':
          return 'happy.png'
        case 'thinking':
          return 'thinking.png'
        case 'confused':
          return 'confused.png'
        case 'base':
          return 'base.png'
        case 'neutral':
          return 'neutral.png'
        default:
          return 'neutral.png'
      }
    }

    case 'leo': {
      switch (emotion) {
        case 'excited':
          return 'excited.png'
        case 'happy':
          return 'happy.png'
        case 'proud':
          return 'proud.png'
        case 'base':
          return 'base.png'
        case 'neutral':
          return 'neutral.png'
        default:
          return 'neutral.png'
      }
    }

    default:
      return 'neutral.png'
  }
}

function resolveOverviewImageUrl(
  characterKey: LessonCharacterKey,
  emotion: LessonCharacterEmotion
): string {
  const filename = resolveCharacterAssetFilename(characterKey, emotion)
  if (filename === 'base.png') {
    return `/images/characters/${characterKey}/base.png`
  }
  return `/images/characters/${characterKey}/expressions/${filename}`
}

function resolveOverviewBackgroundKey(sceneType: LessonSceneType): string {
  switch (sceneType) {
    case 'cafe':
      return 'cafe'
    case 'shopping':
      return 'shopping_mall'
    case 'restaurant':
      return 'restaurant'
    case 'travel':
      return 'airplane'
    case 'hotel':
      return 'hotel'
    case 'airport':
      return 'airport'
    case 'station':
      return 'train'
    case 'office':
      return 'office'
    case 'home':
      return 'home'
    case 'daily':
      return 'home'
    case 'question':
      return 'office'
    case 'support':
      return 'office'
    case 'general':
    default:
      return 'home'
  }
}

function resolveOverviewBackgroundImageUrl(backgroundKey: string): string {
  return `/images/backgrounds/${backgroundKey}_01.webp`
}

function resolveOverviewSceneDescription(params: {
  sceneLabel: string
  estimatedMinutes: number
  stepCount: number
}): string {
  const sceneLabel = params.sceneLabel

  return `今日は「${sceneLabel}」をテーマに、聞く・リピート→AIからの質問→タイピング→AIとの会話の4ステップで進みます。約${params.estimatedMinutes}分の実践練習です。`
}

function createStableLessonId(params: {
  profile: UserProfileRow
  lesson: LessonSession
  draft: LessonDraftSession | null
}): string {
  const languageCode =
    typeof params.profile.target_language_code === 'string' &&
    params.profile.target_language_code.trim().length > 0
      ? params.profile.target_language_code.trim().toLowerCase()
      : 'unknown'

  const level =
    typeof params.profile.current_level === 'string' &&
    params.profile.current_level.trim().length > 0
      ? params.profile.current_level.trim().toLowerCase()
      : 'unknown'

  const titleSource =
    typeof (params.lesson as { title?: unknown }).title === 'string' &&
    (params.lesson as { title?: string }).title!.trim().length > 0
      ? (params.lesson as { title?: string }).title!.trim().toLowerCase()
      : 'daily-lesson'

  const normalizedTitle = titleSource
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  const blockCount = getDraftBlockCount(params.draft)

  return `lesson-${languageCode}-${level}-${normalizedTitle}-${blockCount}`
}

function attachStableLessonIdentifiers(
  lesson: LessonSession,
  stableLessonId: string
): LessonSession & { id: string; sessionId: string } {
  return {
    ...lesson,
    id: stableLessonId,
    sessionId: stableLessonId,
  }
}

function attachOverviewMetaToLesson(
  lesson: LessonSession & { id: string; sessionId: string },
  meta: LessonSessionOverviewMeta
): ExtendedLessonSession {
  return {
    ...lesson,
    totalEstimatedMinutes: meta.overviewEstimatedMinutes,
    overviewEstimatedMinutes: meta.overviewEstimatedMinutes,
    overviewStepCount: meta.overviewStepCount,
    overviewFlowPoint: meta.overviewFlowPoint,
    overviewSceneLabel: meta.overviewSceneLabel,
    overviewSceneDescription: meta.overviewSceneDescription,
    overviewBlockCount: meta.overviewBlockCount,
    overviewCharacterKey: meta.overviewCharacterKey,
    overviewCharacterName: meta.overviewCharacterName,
    overviewCharacterEmotion: meta.overviewCharacterEmotion,
    overviewImageUrl: meta.overviewImageUrl,
    overviewBackgroundKey: meta.overviewBackgroundKey,
    overviewBackgroundImageUrl: meta.overviewBackgroundImageUrl,
  }
}

export type LessonPageData = {
  uiLanguageCode: string
  profile: UserProfileRow
  lessonInput: LessonSessionInput
  lessonSessionConfig: LessonSessionFactoryOutput
  lessonBlueprint: LessonBlueprint
  lessonBlueprintDraft: LessonBlueprintDraft
  lessonDraftSession: LessonDraftSession
  lessonAIPromptPayload: LessonAIPromptPayload
  lessonAIMessages: LessonAIMessage[]
  lesson: ExtendedLessonSession
  /** Corpus-based conversation selection (Phase 1: read-only, optional) */
  corpusSelection?: CorpusSelectionMetadata | null
  /** Language-aware learning mode (typing vs audio_choice) */
  languageLearningMode?: LanguageLearningMode
}

function createLessonFromDraft(
  draft: LessonDraftSession | null
): LessonSession {
  if (draft == null) {
    throw new Error(
      'createLessonFromDraft: draft session is required before runtime session creation.'
    )
  }

  return createSession(draft)
}

/**
 * Pure helper: builds all lesson-related data from a user profile.
 * No Supabase, no side effects. Used by the lesson page load effect.
 *
 * Lesson generation pipeline:
 * profile → lessonInput → sessionConfig → blueprint → blueprintDraft
 * → draftSession → aiPromptPayload → aiMessages → lesson session
 */
export function buildLessonPageData(profile: UserProfileRow): LessonPageData {
  // INPUT
  const lessonInput = generateLessonSessionInput({
    target_language_code: profile.target_language_code,
    target_region_slug: profile.target_region_slug,
    current_level: profile.current_level,
    target_outcome_text: profile.target_outcome_text,
    speak_by_deadline_text: profile.speak_by_deadline_text,
  })

  // CONFIG
  const lessonSessionConfig = createLessonSessionConfig(lessonInput)

  // BLUEPRINT
  const lessonBlueprint = createLessonBlueprint(lessonSessionConfig)
  const lessonBlueprintDraft = createLessonBlueprintDraft(lessonBlueprint, profile.ui_language_code ?? 'ja')

  // SESSION
  const lessonDraftSession = createLessonDraftSession(lessonBlueprintDraft, profile.current_level)

  // AI
  const lessonAIPromptPayload = createLessonAIPromptPayload({
    lessonInput,
    sessionConfig: lessonSessionConfig,
    blueprint: lessonBlueprint,
    draft: lessonBlueprintDraft,
    mappedSession: lessonDraftSession,
  })
  const lessonAIMessages = createLessonAIMessages(lessonAIPromptPayload)

  // RUNTIME
  const rawLesson = createLessonFromDraft(lessonDraftSession)
  const stableLessonId = createStableLessonId({
    profile,
    lesson: rawLesson,
    draft: lessonDraftSession,
  })
  const lessonWithIdentifiers = attachStableLessonIdentifiers(rawLesson, stableLessonId)
  
  const overviewStepCount = resolveOverviewStepCount(lessonDraftSession)
  const overviewEstimatedMinutes = resolveOverviewEstimatedMinutes(
    profile,
    lessonDraftSession
  )
  const overviewFlowPoint = resolveOverviewFlowPoint({
    profile,
    draft: lessonDraftSession,
    estimatedMinutes: overviewEstimatedMinutes,
    stepCount: overviewStepCount,
  })
  const overviewSceneLabel = resolveOverviewSceneLabel(rawLesson)
  const overviewSceneDescription = resolveOverviewSceneDescription({
    sceneLabel: overviewSceneLabel,
    estimatedMinutes: overviewEstimatedMinutes,
    stepCount: overviewStepCount,
  })

  const overviewSceneType = resolveOverviewSceneType(overviewSceneLabel)
  const overviewCharacterKey = resolveOverviewCharacterKey(overviewSceneType)
  const overviewCharacterName = getOverviewCharacterName(overviewCharacterKey)
  const overviewCharacterEmotion = resolveOverviewCharacterEmotion(
    overviewCharacterKey,
    overviewSceneType
  )
  const overviewImageUrl = resolveOverviewImageUrl(
    overviewCharacterKey,
    overviewCharacterEmotion
  )
  const overviewBackgroundKey = resolveOverviewBackgroundKey(overviewSceneType)
  // Prefer scene-image-map for overview background (decorative, 14% opacity)
  // For missing scenes, fall through to generic background (acceptable at low opacity)
  const firstBlockGoal = lessonBlueprint.blocks[0]?.goal ?? ''
  const sceneSpecificBackground = getSceneImagePath(firstBlockGoal)
  const overviewBackgroundImageUrl = sceneSpecificBackground
    ?? resolveOverviewBackgroundImageUrl(overviewBackgroundKey)

  const lesson = attachOverviewMetaToLesson(lessonWithIdentifiers, {
    overviewEstimatedMinutes,
    overviewStepCount,
    overviewFlowPoint,
    overviewSceneLabel,
    overviewSceneDescription,
    overviewBlockCount: getDraftBlockCount(lessonDraftSession),
    overviewCharacterKey,
    overviewCharacterName,
    overviewCharacterEmotion,
    overviewImageUrl,
    overviewBackgroundKey,
    overviewBackgroundImageUrl,
  })

  return {
    uiLanguageCode: profile.ui_language_code ?? 'ja',
    profile,
    lessonInput,
    lessonSessionConfig,
    lessonBlueprint,
    lessonBlueprintDraft,
    lessonDraftSession,
    lessonAIPromptPayload,
    lessonAIMessages,
    lesson,
    languageLearningMode: getLanguageLearningMode(profile.target_language_code),
  }
}

/**
 * Rebuilds lesson page data using user-selected scenes (Daily Flow mode).
 * Reuses the profile/config from the original page data; only the blueprint
 * and everything downstream is regenerated.
 */
export function rebuildLessonPageDataWithScenes(
  existing: LessonPageData,
  selectedScenes: string[]
): LessonPageData {
  const profile = existing.profile
  const lessonInput = existing.lessonInput
  const lessonSessionConfig = existing.lessonSessionConfig

  // Rebuild from blueprint with the user-chosen scenes
  const lessonBlueprint = createLessonBlueprintFromScenes(
    selectedScenes,
    profile.current_level,
    lessonInput.theme,
    profile.target_region_slug ?? null
  )
  const lessonBlueprintDraft = createLessonBlueprintDraft(
    lessonBlueprint,
    profile.ui_language_code ?? 'ja'
  )
  const lessonDraftSession = createLessonDraftSession(
    lessonBlueprintDraft,
    profile.current_level
  )
  const lessonAIPromptPayload = createLessonAIPromptPayload({
    lessonInput,
    sessionConfig: lessonSessionConfig,
    blueprint: lessonBlueprint,
    draft: lessonBlueprintDraft,
    mappedSession: lessonDraftSession,
  })
  const lessonAIMessages = createLessonAIMessages(lessonAIPromptPayload)

  const rawLesson = createLessonFromDraft(lessonDraftSession)
  const stableLessonId = createStableLessonId({
    profile,
    lesson: rawLesson,
    draft: lessonDraftSession,
  })
  const lessonWithIdentifiers = attachStableLessonIdentifiers(rawLesson, stableLessonId)

  const overviewStepCount = resolveOverviewStepCount(lessonDraftSession)
  const overviewEstimatedMinutes = resolveOverviewEstimatedMinutes(
    profile,
    lessonDraftSession
  )
  const overviewFlowPoint = resolveOverviewFlowPoint({
    profile,
    draft: lessonDraftSession,
    estimatedMinutes: overviewEstimatedMinutes,
    stepCount: overviewStepCount,
  })
  const overviewSceneLabel = resolveOverviewSceneLabel(rawLesson)
  const overviewSceneDescription = resolveOverviewSceneDescription({
    sceneLabel: overviewSceneLabel,
    estimatedMinutes: overviewEstimatedMinutes,
    stepCount: overviewStepCount,
  })

  const overviewSceneType = resolveOverviewSceneType(overviewSceneLabel)
  const overviewCharacterKey = resolveOverviewCharacterKey(overviewSceneType)
  const overviewCharacterName = getOverviewCharacterName(overviewCharacterKey)
  const overviewCharacterEmotion = resolveOverviewCharacterEmotion(
    overviewCharacterKey,
    overviewSceneType
  )
  const overviewImageUrl = resolveOverviewImageUrl(
    overviewCharacterKey,
    overviewCharacterEmotion
  )
  const overviewBackgroundKey = resolveOverviewBackgroundKey(overviewSceneType)
  // Prefer scene-image-map for overview background (decorative, 14% opacity)
  const firstBlockGoalRebuilt = lessonBlueprint.blocks[0]?.goal ?? ''
  const sceneSpecificBackgroundRebuilt = getSceneImagePath(firstBlockGoalRebuilt)
  const overviewBackgroundImageUrl = sceneSpecificBackgroundRebuilt
    ?? resolveOverviewBackgroundImageUrl(overviewBackgroundKey)

  const lesson = attachOverviewMetaToLesson(lessonWithIdentifiers, {
    overviewEstimatedMinutes,
    overviewStepCount,
    overviewFlowPoint,
    overviewSceneLabel,
    overviewSceneDescription,
    overviewBlockCount: getDraftBlockCount(lessonDraftSession),
    overviewCharacterKey,
    overviewCharacterName,
    overviewCharacterEmotion,
    overviewImageUrl,
    overviewBackgroundKey,
    overviewBackgroundImageUrl,
  })

  return {
    ...existing,
    lessonBlueprint,
    lessonBlueprintDraft,
    lessonDraftSession,
    lessonAIPromptPayload,
    lessonAIMessages,
    lesson,
  }
}

// ── Corpus selection enrichment (Phase 1: read-only, additive) ──

/**
 * Enrich existing LessonPageData with corpus-based conversation selection.
 * Purely additive — if corpus selection fails, returns data unchanged.
 * Does NOT modify any existing lesson fields.
 */
export async function enrichWithCorpusSelection(
  data: LessonPageData,
  recentCorpusIds: string[] = [],
): Promise<LessonPageData> {
  try {
    const { selectCorpusForLesson } = await import('./corpus/lesson-selection-adapter')
    const corpusSelection = await selectCorpusForLesson(
      data.profile.current_level,
      recentCorpusIds,
    )
    return { ...data, corpusSelection }
  } catch {
    // Corpus enrichment must never break lesson flow
    return data
  }
}