/**
 * Language Expansion Service
 *
 * Admin-side service for creating new language content bundles.
 * Generates draft bundles via AI scene selection, feeds into
 * the existing draft → validated → published lifecycle.
 *
 * Pure logic. No DB access. Uses existing daily-timeline + lifecycle modules.
 */

import type { LessonContentPayload } from './types'
import { createDraft } from './lifecycle'
import { selectDailyFlowScenes, getDailyFlowLabel, REGION_CONTEXT } from '../daily-timeline'
import type { AgeGroup } from '../daily-timeline'
import type { ContentBundle } from './types'

// ── Types ──

export type LanguageExpansionInput = {
  /** Base language code (learner's native language, e.g. 'ja') */
  baseLanguage: string
  /** Target language code to learn (e.g. 'en', 'ko') */
  targetLanguage: string
  /** Region slug for locale-specific content (e.g. 'en_us_general', 'ko_kr_seoul') */
  region: string
  /** Age groups to generate for */
  ageGroups: AgeGroup[]
}

export type LanguageExpansionResult = {
  bundles: ContentBundle[]
  generatedAt: string
  summary: string
}

// ── Block type assignment ──

const BLOCK_TYPES_SEQUENCE = ['conversation', 'typing', 'review', 'ai_conversation'] as const

function assignBlockTypes(sceneCount: number): string[] {
  return Array.from({ length: sceneCount }, (_, i) =>
    BLOCK_TYPES_SEQUENCE[i % BLOCK_TYPES_SEQUENCE.length]
  )
}

// ── Scene description generation ──

function generateSceneDescription(
  sceneKey: string,
  label: string,
  region: string,
): string {
  const regionCtx = REGION_CONTEXT[region]
  if (!regionCtx) return label

  const style = regionCtx.speechStyle
  if (style === 'polite') {
    return `Perhaps at a ${regionCtx.storeExamples[0] ?? 'shop'} — ${label}`
  }
  return `Maybe at a ${regionCtx.storeExamples[0] ?? 'store'} — ${label}`
}

// ── Core: create language bundle ──

/**
 * Generate draft content bundles for a new language + region combination.
 * Creates one bundle per age group, each with 4 scenes (one per daily slot).
 *
 * Returns draft bundles ready for validation → preview → publish.
 */
export async function createLanguageBundle(input: LanguageExpansionInput): Promise<LanguageExpansionResult> {
  const { targetLanguage, region, ageGroups } = input
  const bundles: ContentBundle[] = []
  const seed = Date.now()

  for (const ageGroup of ageGroups) {
    // Select age-appropriate scenes using daily timeline
    const scenes = selectDailyFlowScenes(4, ageGroup, seed)

    const sceneKeys = scenes.map((s) => s.sceneKey)
    const labels = scenes.map((s) => getDailyFlowLabel(s.key, 'ja'))
    const blockTypes = assignBlockTypes(scenes.length)
    const descriptions = scenes.map((s) =>
      generateSceneDescription(s.sceneKey, s.label, region)
    )

    const payload: LessonContentPayload = {
      scenes: sceneKeys,
      labels,
      blockTypes,
      ageGroup,
      region,
      descriptions,
      blueprintData: {
        generatedBy: 'language-expansion',
        baseLanguage: input.baseLanguage,
        targetLanguage,
        region,
        ageGroup,
        seed,
      },
    }

    // Create draft via lifecycle
    const bundle = await createDraft(targetLanguage, region, payload)

    // Override bundleId to include ageGroup for multi-age support
    // The lifecycle uses `languageCode-regionSlug` by default,
    // so we store the ageGroup in the payload for differentiation
    bundles.push(bundle)
  }

  const summary = [
    `Created ${bundles.length} draft bundle(s)`,
    `Language: ${targetLanguage}`,
    `Region: ${region}`,
    `Age groups: ${ageGroups.join(', ')}`,
    `Each bundle has ${4} scenes across morning → outgoing → daytime → evening`,
  ].join('\n')

  return {
    bundles,
    generatedAt: new Date().toISOString(),
    summary,
  }
}

/**
 * List all supported regions for a given target language.
 */
export function getAvailableRegions(targetLanguage: string): string[] {
  return Object.keys(REGION_CONTEXT).filter((slug) =>
    slug.startsWith(targetLanguage === 'en' ? 'en_' : `${targetLanguage}_`)
  )
}

/**
 * Standard age groups available for content generation.
 */
export const AVAILABLE_AGE_GROUPS: AgeGroup[] = [
  'toddler', 'child', 'teen', 'adult', 'senior',
]
