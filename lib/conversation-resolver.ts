/**
 * Conversation Resolver
 *
 * Resolves scene conversation content from the catalog with multi-step fallback:
 *   1. Exact region + exact age
 *   2. Exact region + fallback age chain
 *   3. General region for the same country (e.g. en_us_new_york → en_us_general)
 *   4. Language default general region (e.g. en_gb_london → en_gb_general → en_us_general)
 *   5. null (scene not in catalog — use existing SCENE_CONTENT)
 *
 * Each region step tries the full age fallback chain before moving to the next region.
 */

import {
  DAILY_FLOW_CONVERSATION_CATALOG,
  buildCatalogKey,
  type ConversationVariant,
} from './daily-flow-conversation-catalog'

/** Age fallback chains: each age group tries progressively younger groups. */
const AGE_FALLBACK: Record<string, string[]> = {
  '50plus': ['40s', '20s'],
  '40s':    ['20s'],
  '30s':    ['20s'],
  '20s':    [],
}

/**
 * Default general region per language prefix.
 * Used as the final region fallback when no specific match is found.
 */
const LANGUAGE_DEFAULT_REGION: Record<string, string> = {
  en: 'en_us_general',
  ko: 'ko_kr_general',
  ja: 'ja_jp_general',
  zh: 'zh_cn_general',
  es: 'es_es_general',
  fr: 'fr_fr_general',
  de: 'de_de_general',
  pt: 'pt_br_general',
  it: 'it_it_general',
  th: 'th_th_general',
  vi: 'vi_vn_general',
  ar: 'ar_msa_general',
  ru: 'ru_ru_general',
}

function lookup(key: string): ConversationVariant | undefined {
  return DAILY_FLOW_CONVERSATION_CATALOG[key]
}

/**
 * Derive the general region from a specific region code.
 * e.g. "en_us_new_york" → "en_us_general", "en_gb_london" → "en_gb_general"
 * For codes already ending in "_general" or with only 2 segments, returns as-is.
 */
function toGeneralRegion(region: string): string {
  if (region.endsWith('_general')) return region
  const parts = region.split('_')
  if (parts.length < 3) return region + '_general'
  return parts.slice(0, 2).join('_') + '_general'
}

/** Extract language prefix from a region code. e.g. "en_us_new_york" → "en" */
function getLanguagePrefix(region: string): string {
  return region.split('_')[0] ?? ''
}

/** Try a region with the full age fallback chain. */
function tryRegionWithAgeFallback(
  sceneId: string,
  region: string,
  ageGroup: string,
  level: string,
  ageFallbacks: string[]
): ConversationVariant | null {
  const exact = lookup(buildCatalogKey(sceneId, region, ageGroup, level))
  if (exact) return exact
  for (const fallbackAge of ageFallbacks) {
    const found = lookup(buildCatalogKey(sceneId, region, fallbackAge, level))
    if (found) return found
  }
  return null
}

export function resolveSceneConversation(
  sceneId: string,
  region: string,
  ageGroup: string,
  level: string
): ConversationVariant | null {
  const ageFallbacks = AGE_FALLBACK[ageGroup] ?? ['20s']

  // 1. Exact region (e.g. en_us_new_york) + age chain
  const exact = tryRegionWithAgeFallback(sceneId, region, ageGroup, level, ageFallbacks)
  if (exact) return exact

  // 2. General region for the same country (e.g. en_us_new_york → en_us_general)
  const generalRegion = toGeneralRegion(region)
  if (generalRegion !== region) {
    const general = tryRegionWithAgeFallback(sceneId, generalRegion, ageGroup, level, ageFallbacks)
    if (general) return general
  }

  // 3. Language default region (e.g. en_gb_general → en_us_general)
  const langPrefix = getLanguagePrefix(region)
  const langDefault = LANGUAGE_DEFAULT_REGION[langPrefix]
  if (langDefault && langDefault !== region && langDefault !== generalRegion) {
    const langFallback = tryRegionWithAgeFallback(sceneId, langDefault, ageGroup, level, ageFallbacks)
    if (langFallback) return langFallback
  }

  return null
}
