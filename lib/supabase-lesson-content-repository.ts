/**
 * Supabase-backed lesson content repository (async).
 *
 * Reads lesson content from DB tables, falls back to the sync ObjectCatalogRepository
 * when DB content is missing or query fails.
 *
 * NOTE: The current LessonContentRepository interface is synchronous.
 * This class provides an ASYNC alternative for future use. When consumers are
 * migrated to support async reads, this can replace the object-catalog repo.
 *
 * NOT the global default — must be explicitly used where async is acceptable.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { CurrentLevel } from './constants'
import type {
  AsyncLessonContentRepository,
  LessonContentRepository,
  ScenePhraseContent,
  SceneConversationEnrichment,
  SceneLookupResult,
} from './lesson-content-repository'
import { getLessonContentRepository } from './lesson-content-repository'
import type {
  LessonPhraseRow,
  LessonPhraseVariationRow,
  LessonSemanticChunkRow,
  LessonConversationEnrichmentRow,
  LessonCoreChunkRow,
  LessonRelatedExpressionRow,
} from './lesson-content-schema'
import {
  mapPhraseRowToDTO,
  mapEnrichmentRowToDTO,
  mapPhraseRowToLookup,
} from './lesson-content-schema'

/**
 * Async lesson content repository backed by Supabase.
 * Each method mirrors LessonContentRepository but returns Promise.
 */
export class SupabaseLessonContentRepository implements AsyncLessonContentRepository {
  private supabase: SupabaseClient
  private fallback: LessonContentRepository

  constructor(supabase: SupabaseClient, fallback?: LessonContentRepository) {
    this.supabase = supabase
    this.fallback = fallback ?? getLessonContentRepository()
  }

  async getScenePhrase(sceneKey: string, level: CurrentLevel): Promise<ScenePhraseContent | null> {
    try {
      const { data: phraseRow, error: phraseError } = await this.supabase
        .from('lesson_phrases')
        .select('*')
        .eq('scene_key', sceneKey)
        .eq('level_band', level)
        .eq('is_active', true)
        .maybeSingle()

      if (phraseError || !phraseRow) {
        console.log(`[CONTENT_RESOLVE] phrase fallback scene=${sceneKey} level=${level}`)
        return this.fallback.getScenePhrase(sceneKey, level)
      }

      const row = phraseRow as LessonPhraseRow

      const [variationsResult, chunksResult] = await Promise.all([
        this.supabase
          .from('lesson_phrase_variations')
          .select('*')
          .eq('phrase_id', row.id)
          .eq('is_active', true)
          .order('sort_order'),
        this.supabase
          .from('lesson_semantic_chunks')
          .select('*')
          .eq('phrase_id', row.id)
          .eq('is_active', true)
          .order('sort_order'),
      ])

      const variations = (variationsResult.data ?? []) as LessonPhraseVariationRow[]
      const chunks = (chunksResult.data ?? []) as LessonSemanticChunkRow[]

      console.log(`[CONTENT_RESOLVE] phrase DB hit scene=${sceneKey} level=${level} version=${row.content_version}`)
      return mapPhraseRowToDTO(row, variations, chunks)
    } catch {
      return this.fallback.getScenePhrase(sceneKey, level)
    }
  }

  async getConversationEnrichment(
    sceneKey: string,
    region: string,
    ageGroup: string,
    level: CurrentLevel,
  ): Promise<SceneConversationEnrichment | null> {
    try {
      const { data: enrichmentRow, error } = await this.supabase
        .from('lesson_conversation_enrichments')
        .select('*')
        .eq('scene_key', sceneKey)
        .eq('region_slug', region)
        .eq('age_group', ageGroup)
        .eq('level_band', level)
        .eq('is_active', true)
        .maybeSingle()

      if (error || !enrichmentRow) {
        console.log(`[CONTENT_RESOLVE] enrichment fallback scene=${sceneKey} region=${region}`)
        return this.fallback.getConversationEnrichment(sceneKey, region, ageGroup, level)
      }

      const row = enrichmentRow as LessonConversationEnrichmentRow

      const [chunksResult, expressionsResult] = await Promise.all([
        this.supabase
          .from('lesson_core_chunks')
          .select('*')
          .eq('enrichment_id', row.id)
          .order('sort_order'),
        this.supabase
          .from('lesson_related_expressions')
          .select('*')
          .eq('enrichment_id', row.id)
          .eq('is_active', true)
          .order('sort_order'),
      ])

      const coreChunks = (chunksResult.data ?? []) as LessonCoreChunkRow[]
      const relatedExpressions = (expressionsResult.data ?? []) as LessonRelatedExpressionRow[]

      console.log(`[CONTENT_RESOLVE] enrichment DB hit scene=${sceneKey} region=${region} version=${row.content_version}`)
      return mapEnrichmentRowToDTO(row, coreChunks, relatedExpressions)
    } catch {
      return this.fallback.getConversationEnrichment(sceneKey, region, ageGroup, level)
    }
  }

  async lookupByAnswer(englishAnswer: string): Promise<SceneLookupResult | null> {
    if (!englishAnswer) return null

    try {
      const needle = englishAnswer.trim()
      const { data, error } = await this.supabase
        .from('lesson_phrases')
        .select('scene_key, native_hint')
        .ilike('conversation_answer', needle)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()

      if (error || !data) {
        return this.fallback.lookupByAnswer(englishAnswer)
      }

      return mapPhraseRowToLookup(data as LessonPhraseRow)
    } catch {
      return this.fallback.lookupByAnswer(englishAnswer)
    }
  }
}
