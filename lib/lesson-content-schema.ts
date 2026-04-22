/**
 * Lesson Content DB Schema — type definitions for Supabase-backed lesson content.
 *
 * These types mirror the planned database tables. They are designed to:
 * - Map cleanly to/from the repository DTOs in lesson-content-repository.ts
 * - Support multilingual content (language_code on every text row)
 * - Support regional variations (region_slug + age_group)
 * - Support content versioning and soft-delete (content_version, is_active)
 * - Be insertable/queryable via Supabase client
 *
 * IMPORTANT: No runtime code reads from DB yet. These types are preparation only.
 *
 * Planned tables:
 *   lesson_scenes           — scene registry (one row per scene)
 *   lesson_phrases          — base phrase per scene + level
 *   lesson_phrase_variations — alternative wordings per phrase
 *   lesson_semantic_chunks   — vocabulary chunks per phrase
 *   lesson_conversation_enrichments — region/age-specific enrichments
 *   lesson_related_expressions — related expressions per enrichment
 */

// ══════════════════════════════════════════════════════════════════════════════
// lesson_scenes — scene registry
// ══════════════════════════════════════════════════════════════════════════════

/** Row type for the `lesson_scenes` table. */
export type LessonSceneRow = {
  /** UUID primary key. */
  id: string
  /** Stable scene identifier (e.g., 'wake_up', 'brush_teeth'). Unique. */
  scene_key: string
  /** Scene category (e.g., 'daily-flow', 'social'). */
  scene_category: string
  /** Display label in Japanese. */
  label_ja: string
  /** Display label in English. */
  label_en: string
  /** Whether this scene is available for lesson generation. */
  is_active: boolean
  /** ISO timestamp. */
  created_at: string
  /** ISO timestamp. */
  updated_at: string
}

// ══════════════════════════════════════════════════════════════════════════════
// lesson_phrases — base phrase content per scene + level
// ══════════════════════════════════════════════════════════════════════════════

/** Level band matching CurrentLevel in constants.ts. */
export type LevelBand = 'beginner' | 'intermediate' | 'advanced'

/** Row type for the `lesson_phrases` table. */
export type LessonPhraseRow = {
  /** UUID primary key. */
  id: string
  /** FK → lesson_scenes.id */
  scene_id: string
  /** Stable scene key, denormalized for fast lookup. */
  scene_key: string
  /** Level band. */
  level_band: LevelBand
  /** Target language code (e.g., 'en'). */
  language_code: string

  /** Primary sentence for listen/repeat. */
  conversation_answer: string
  /** Sentence for typing practice. */
  typing_answer: string
  /** Review prompt text. */
  review_prompt: string
  /** AI conversation opener text. */
  ai_conversation_prompt: string

  /** Native-language meaning hint. */
  native_hint: string
  /** TTS-specific override for native hint. Null = use native_hint directly. */
  native_hint_tts: string | null
  /** Mixed-language scaffold hint (e.g., "I 起きた."). */
  mix_hint: string

  /** AI comprehension question text. */
  ai_question_text: string

  /** TTS-specific override for conversation_answer. Null = use conversation_answer. */
  tts_text: string | null

  /** Content version string for cache invalidation. */
  content_version: string
  /** Soft-delete flag. */
  is_active: boolean

  created_at: string
  updated_at: string
}

// ══════════════════════════════════════════════════════════════════════════════
// lesson_phrase_variations — alternative wordings
// ══════════════════════════════════════════════════════════════════════════════

/** Row type for the `lesson_phrase_variations` table. */
export type LessonPhraseVariationRow = {
  /** UUID primary key. */
  id: string
  /** FK → lesson_phrases.id */
  phrase_id: string
  /** Ordering index (0-based). */
  sort_order: number

  conversation_answer: string
  typing_answer: string
  native_hint: string
  mix_hint: string

  is_active: boolean
  created_at: string
}

// ══════════════════════════════════════════════════════════════════════════════
// lesson_semantic_chunks — vocabulary chunks per phrase
// ══════════════════════════════════════════════════════════════════════════════

/** Chunk type matching SemanticChunkType in lesson-blueprint-adapter.ts. */
export type SemanticChunkKind = 'phrase' | 'verb' | 'noun' | 'adjective' | 'adverb' | 'preposition'

/** Row type for the `lesson_semantic_chunks` table. */
export type LessonSemanticChunkRow = {
  /** UUID primary key. */
  id: string
  /** FK → lesson_phrases.id */
  phrase_id: string

  /** English chunk text. */
  chunk: string
  /** Native-language meaning. */
  meaning: string
  /** Chunk type. */
  chunk_kind: SemanticChunkKind
  /** Lower = more important. Null = default priority. */
  importance: number | null
  /** TTS override for the meaning text. */
  meaning_tts: string | null

  sort_order: number
  is_active: boolean
  created_at: string
}

// ══════════════════════════════════════════════════════════════════════════════
// lesson_conversation_enrichments — region/age-specific enrichments
// ══════════════════════════════════════════════════════════════════════════════

/** Row type for the `lesson_conversation_enrichments` table. */
export type LessonConversationEnrichmentRow = {
  /** UUID primary key. */
  id: string
  /** FK → lesson_scenes.id */
  scene_id: string
  /** Denormalized for fast lookup. */
  scene_key: string
  /** Region slug (e.g., 'en_us_general', 'en_gb_london'). */
  region_slug: string
  /** Age group (e.g., '20s', '40s'). */
  age_group: string
  /** Level band. */
  level_band: LevelBand

  /** AI comprehension question text (overrides base phrase). */
  ai_question_text: string
  /** AI conversation opener. */
  ai_conversation_opener: string
  /** Typing variation texts (JSON array stored as string[]). */
  typing_variations: string[]

  /** Flavor metadata — stored as JSONB. */
  flavor: {
    topics?: string[]
    references?: string[]
    cultureNotes?: string[]
    setting?: string
    lifestyle?: string[]
  } | null

  content_version: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// ══════════════════════════════════════════════════════════════════════════════
// lesson_core_chunks — enrichment-level vocabulary chunks
// ══════════════════════════════════════════════════════════════════════════════

/** Row type for enrichment core chunks (sub-table of enrichments). */
export type LessonCoreChunkRow = {
  id: string
  /** FK → lesson_conversation_enrichments.id */
  enrichment_id: string
  chunk: string
  meaning: string
  sort_order: number
}

// ══════════════════════════════════════════════════════════════════════════════
// lesson_related_expressions — related expressions per enrichment
// ══════════════════════════════════════════════════════════════════════════════

export type RelatedExpressionCategory = 'action' | 'follow-up' | 'support'

/** Row type for the `lesson_related_expressions` table. */
export type LessonRelatedExpressionRow = {
  id: string
  /** FK → lesson_conversation_enrichments.id */
  enrichment_id: string

  /** Expression in target language. */
  expression_en: string
  /** Expression in native language. */
  expression_ja: string
  /** Semantic category. */
  category: RelatedExpressionCategory
  /** TTS override for the native expression. */
  ja_tts: string | null

  sort_order: number
  is_active: boolean
  created_at: string
}

// ══════════════════════════════════════════════════════════════════════════════
// Mapping helpers — DB rows ↔ repository DTOs
// ══════════════════════════════════════════════════════════════════════════════

import type { CurrentLevel } from './constants'
import type { SemanticChunk } from './lesson-blueprint-adapter'
import type {
  ScenePhraseContent,
  ScenePhraseVariation,
  SceneConversationEnrichment,
  SceneLookupResult,
} from './lesson-content-repository'

/** Map a LessonPhraseRow + its variations + chunks to the repository DTO. */
export function mapPhraseRowToDTO(
  row: LessonPhraseRow,
  variations: LessonPhraseVariationRow[],
  chunks: LessonSemanticChunkRow[],
): ScenePhraseContent {
  return {
    sceneKey: row.scene_key,
    level: row.level_band as CurrentLevel,
    conversationAnswer: row.conversation_answer,
    typingAnswer: row.typing_answer,
    reviewPrompt: row.review_prompt,
    aiConversationPrompt: row.ai_conversation_prompt,
    nativeHint: row.native_hint,
    nativeHintTts: row.native_hint_tts,
    mixHint: row.mix_hint,
    aiQuestionText: row.ai_question_text,
    variations: variations
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((v): ScenePhraseVariation => ({
        conversationAnswer: v.conversation_answer,
        typingAnswer: v.typing_answer,
        nativeHint: v.native_hint,
        mixHint: v.mix_hint,
      })),
    semanticChunks: chunks
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((c): SemanticChunk => ({
        chunk: c.chunk,
        meaning: c.meaning,
        type: c.chunk_kind as SemanticChunk['type'],
        importance: c.importance ?? undefined,
        meaningTts: c.meaning_tts ?? undefined,
      })),
    contentVersion: row.content_version,
    source: 'database',
  }
}

/** Map an enrichment row + its sub-rows to the repository DTO. */
export function mapEnrichmentRowToDTO(
  row: LessonConversationEnrichmentRow,
  coreChunks: LessonCoreChunkRow[],
  relatedExpressions: LessonRelatedExpressionRow[],
): SceneConversationEnrichment {
  return {
    sceneKey: row.scene_key,
    region: row.region_slug,
    ageGroup: row.age_group,
    level: row.level_band as CurrentLevel,
    aiQuestionText: row.ai_question_text,
    typingVariations: row.typing_variations,
    aiConversationOpener: row.ai_conversation_opener,
    coreChunks: coreChunks
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((c) => ({ chunk: c.chunk, meaning: c.meaning })),
    relatedExpressions: relatedExpressions.length > 0
      ? relatedExpressions
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((r) => ({ en: r.expression_en, ja: r.expression_ja, category: r.category }))
      : null,
    flavor: row.flavor,
    source: 'database',
  }
}

/** Map a phrase row to a lookup result. */
export function mapPhraseRowToLookup(row: LessonPhraseRow): SceneLookupResult {
  return {
    sceneKey: row.scene_key,
    nativeHint: row.native_hint,
  }
}
