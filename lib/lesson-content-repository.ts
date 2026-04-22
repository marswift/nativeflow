/**
 * Lesson Content Repository — abstraction layer over lesson content sources.
 *
 * BOUNDARY: All lesson content reads should flow through this module.
 * Current implementation: in-memory object catalogs (SCENE_CONTENT, DAILY_FLOW_CONVERSATION_CATALOG).
 * Future: DB-backed reads with object fallback.
 *
 * This module does NOT own the catalogs. It delegates to existing modules and
 * normalizes the output into a stable DTO contract.
 */

import type { CurrentLevel } from './constants'
import type { SemanticChunk } from './lesson-blueprint-adapter'

// ══════════════════════════════════════════════════════════════════════════════
// Normalized DTOs — stable contract for consumers
// ══════════════════════════════════════════════════════════════════════════════

/** Core phrase content for a single scene + level combination. */
export type ScenePhraseContent = {
  sceneKey: string
  level: CurrentLevel

  /** Primary English sentence for listen/repeat. */
  conversationAnswer: string
  /** English sentence for typing practice. */
  typingAnswer: string
  /** English review prompt. */
  reviewPrompt: string
  /** English AI conversation opener. */
  aiConversationPrompt: string

  /** Native-language meaning hint (Japanese for JA learners). */
  nativeHint: string
  /** Native-language TTS override. Null = use nativeHint directly. */
  nativeHintTts?: string | null
  /** Mixed-language scaffold hint (e.g., "I 起きた."). */
  mixHint: string

  /** AI comprehension question text. */
  aiQuestionText: string

  /** Phrase variations for diversity. */
  variations: ScenePhraseVariation[]

  /** Semantic chunks for scaffold vocabulary display. */
  semanticChunks: SemanticChunk[]

  /** Content version for cache invalidation. Null = object-catalog (unversioned). */
  contentVersion: string | null
  /** Content source for debugging. */
  source: 'object-catalog' | 'database'
}

/** A phrase variation — alternative wording for the same scene+level. */
export type ScenePhraseVariation = {
  conversationAnswer: string
  typingAnswer: string
  nativeHint: string
  mixHint: string
}

/** Region-specific conversation enrichment for a scene. */
export type SceneConversationEnrichment = {
  sceneKey: string
  region: string
  ageGroup: string
  level: CurrentLevel

  aiQuestionText: string
  aiQuestionChoices?: { label: string; isCorrect: boolean }[] | null
  typingVariations: string[]
  aiConversationOpener: string
  coreChunks: { chunk: string; meaning: string }[]
  relatedExpressions: { en: string; ja: string; category: string }[] | null
  flavor: {
    topics?: string[]
    references?: string[]
    cultureNotes?: string[]
    setting?: string
    lifestyle?: string[]
  } | null

  source: 'object-catalog' | 'database'
}

/** Result of a reverse-lookup by English answer. */
export type SceneLookupResult = {
  sceneKey: string
  nativeHint: string
}

// ══════════════════════════════════════════════════════════════════════════════
// Repository interface — what consumers call
// ══════════════════════════════════════════════════════════════════════════════

export interface LessonContentRepository {
  /**
   * Get phrase content for a scene + level.
   * Returns null if the scene is unknown.
   */
  getScenePhrase(sceneKey: string, level: CurrentLevel): ScenePhraseContent | null

  /**
   * Get region-specific conversation enrichment.
   * Returns null if no enrichment exists for this combination.
   */
  getConversationEnrichment(
    sceneKey: string,
    region: string,
    ageGroup: string,
    level: CurrentLevel,
  ): SceneConversationEnrichment | null

  /**
   * Reverse-lookup: find the scene key and native hint for a given English answer.
   * Used by review injection.
   */
  lookupByAnswer(englishAnswer: string): SceneLookupResult | null
}

/**
 * Async variant of LessonContentRepository for DB-backed implementations.
 * Use CachedLessonContentRepository to adapt async → sync for current consumers.
 */
export interface AsyncLessonContentRepository {
  getScenePhrase(sceneKey: string, level: CurrentLevel): Promise<ScenePhraseContent | null>
  getConversationEnrichment(sceneKey: string, region: string, ageGroup: string, level: CurrentLevel): Promise<SceneConversationEnrichment | null>
  lookupByAnswer(englishAnswer: string): Promise<SceneLookupResult | null>
}

/**
 * Caching adapter: wraps an AsyncLessonContentRepository and pre-loads content
 * for a set of scene keys, then serves reads synchronously via LessonContentRepository.
 *
 * Usage:
 *   const cached = new CachedLessonContentRepository(asyncRepo, syncFallback)
 *   await cached.preload(['wake_up', 'brush_teeth'], 'beginner', 'en_us_general', '20s')
 *   setLessonContentRepository(cached)  // now consumers get sync reads from cache
 */
export class CachedLessonContentRepository implements LessonContentRepository {
  private phrases = new Map<string, ScenePhraseContent>()
  private enrichments = new Map<string, SceneConversationEnrichment>()
  private lookupIndex = new Map<string, SceneLookupResult>()
  private fallback: LessonContentRepository

  constructor(
    private asyncRepo: AsyncLessonContentRepository,
    fallback?: LessonContentRepository,
  ) {
    this.fallback = fallback ?? getLessonContentRepository()
  }

  /** Pre-load content for a set of scenes. Call once before lesson starts. */
  async preload(
    sceneKeys: string[],
    level: CurrentLevel,
    region: string,
    ageGroup: string,
  ): Promise<void> {
    const results = await Promise.allSettled(
      sceneKeys.flatMap((sk) => [
        this.asyncRepo.getScenePhrase(sk, level).then((p) => {
          if (p) {
            this.phrases.set(`${sk}::${level}`, p)
            // Build lookup index from conversation answers
            this.lookupIndex.set(p.conversationAnswer.toLowerCase().trim(), { sceneKey: sk, nativeHint: p.nativeHint })
            for (const v of p.variations) {
              this.lookupIndex.set(v.conversationAnswer.toLowerCase().trim(), { sceneKey: sk, nativeHint: v.nativeHint })
            }
          }
        }),
        this.asyncRepo.getConversationEnrichment(sk, region, ageGroup, level).then((e) => {
          if (e) this.enrichments.set(`${sk}::${region}::${ageGroup}::${level}`, e)
        }),
      ]),
    )
    // Log any failures but don't throw — fallback will handle missing entries
    const failures = results.filter((r) => r.status === 'rejected')
    if (failures.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(`[CachedRepo] ${failures.length} preload failures — fallback will be used`)
    }
  }

  getScenePhrase(sceneKey: string, level: CurrentLevel): ScenePhraseContent | null {
    return this.phrases.get(`${sceneKey}::${level}`) ?? this.fallback.getScenePhrase(sceneKey, level)
  }

  getConversationEnrichment(sceneKey: string, region: string, ageGroup: string, level: CurrentLevel): SceneConversationEnrichment | null {
    return this.enrichments.get(`${sceneKey}::${region}::${ageGroup}::${level}`) ?? this.fallback.getConversationEnrichment(sceneKey, region, ageGroup, level)
  }

  lookupByAnswer(englishAnswer: string): SceneLookupResult | null {
    if (!englishAnswer) return null
    return this.lookupIndex.get(englishAnswer.toLowerCase().trim()) ?? this.fallback.lookupByAnswer(englishAnswer)
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Object-catalog implementation — delegates to existing modules
// ══════════════════════════════════════════════════════════════════════════════

import { resolveSceneConversation } from './conversation-resolver'

// These are resolved lazily on first use to avoid circular dependency
// (adapter imports repository, repository imports adapter).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _adapterModule: any = null
function adapter() {
  if (!_adapterModule) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _adapterModule = require('./lesson-blueprint-adapter')
  }
  return _adapterModule as {
    selectScenePhraseVariant: (sceneKey: string, level: CurrentLevel, mode: 'base' | 'variation', exposureCount: number) => { conversationAnswer: string; typingAnswer: string; reviewPrompt: string; aiConversationPrompt: string; nativeHint: string; mixHint: string; aiQuestionText: string }
    lookupSceneByAnswer: (englishAnswer: string) => { sceneKey: string; nativeHint: string } | null
    getSemanticChunks: (sceneKey: string, level: CurrentLevel) => SemanticChunk[] | null
  }
}

/**
 * Normalize a CurrentLevel to the catalog's 3-bucket system.
 * Matches the logic in lesson-blueprint-adapter's getLevelBucket.
 */
function toLevelForCatalog(level: CurrentLevel): CurrentLevel {
  return level // The adapter handles bucket normalization internally
}

class ObjectCatalogRepository implements LessonContentRepository {
  getScenePhrase(sceneKey: string, level: CurrentLevel): ScenePhraseContent | null {
    try {
      const { selectScenePhraseVariant, getSemanticChunks } = adapter()
      const base = selectScenePhraseVariant(sceneKey, toLevelForCatalog(level), 'base', 0)

      // Collect variations
      const variations: ScenePhraseVariation[] = []
      for (let i = 0; i < 5; i++) {
        try {
          const v = selectScenePhraseVariant(sceneKey, toLevelForCatalog(level), 'variation', i)
          if (v.conversationAnswer !== base.conversationAnswer) {
            variations.push({
              conversationAnswer: v.conversationAnswer,
              typingAnswer: v.typingAnswer,
              nativeHint: v.nativeHint,
              mixHint: v.mixHint,
            })
          }
        } catch { break }
      }

      return {
        sceneKey,
        level,
        conversationAnswer: base.conversationAnswer,
        typingAnswer: base.typingAnswer,
        reviewPrompt: base.reviewPrompt,
        aiConversationPrompt: base.aiConversationPrompt,
        nativeHint: base.nativeHint,
        nativeHintTts: null,
        mixHint: base.mixHint,
        aiQuestionText: base.aiQuestionText,
        variations,
        semanticChunks: getSemanticChunks(sceneKey, toLevelForCatalog(level)) ?? [],
        contentVersion: null,
        source: 'object-catalog',
      }
    } catch {
      return null
    }
  }

  getConversationEnrichment(
    sceneKey: string,
    region: string,
    ageGroup: string,
    level: CurrentLevel,
  ): SceneConversationEnrichment | null {
    const variant = resolveSceneConversation(sceneKey, region, ageGroup, level)
    if (!variant) return null

    return {
      sceneKey,
      region,
      ageGroup,
      level,
      aiQuestionText: variant.aiQuestionText,
      aiQuestionChoices: variant.aiQuestionChoices ?? null,
      typingVariations: variant.typingVariations,
      aiConversationOpener: variant.aiConversationOpener,
      coreChunks: variant.coreChunks,
      relatedExpressions: variant.relatedExpressions?.map(r => ({
        en: r.en,
        ja: r.ja,
        category: r.category,
      })) ?? null,
      flavor: variant.flavor ?? null,
      source: 'object-catalog',
    }
  }

  lookupByAnswer(englishAnswer: string): SceneLookupResult | null {
    return adapter().lookupSceneByAnswer(englishAnswer)
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Singleton — single instance used by the app
// ══════════════════════════════════════════════════════════════════════════════

let _instance: LessonContentRepository | null = null

/**
 * Get the lesson content repository instance.
 * Currently returns the object-catalog implementation.
 * Future: will check for DB availability and return a DB-backed instance.
 */
export function getLessonContentRepository(): LessonContentRepository {
  if (!_instance) {
    _instance = new ObjectCatalogRepository()
  }
  return _instance
}

/**
 * Replace the repository instance (for testing or DB migration).
 */
export function setLessonContentRepository(repo: LessonContentRepository): void {
  _instance = repo
}
