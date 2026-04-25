/**
 * GET /api/languages/options
 *
 * Returns language options for onboarding and settings from the language_registry table.
 * This is the runtime source of truth for language selection UI.
 *
 * Applies platform-language-config safety gate: only built-in codes are returned
 * until runtime is fully dynamic.
 *
 * Response shape:
 * {
 *   uiLanguages: { code, englishName, nativeName }[]
 *   learningLanguages: { code, englishName, nativeName }[]
 * }
 */

import { NextResponse } from 'next/server'
import {
  getActiveLanguageRegistry,
  type LanguageRegistryItem,
} from '@/lib/language-registry-repository'
import {
  isSupportedAppLocale,
  isSupportedLearningLanguage,
  BUILT_IN_LANGUAGE_CATALOG,
} from '@/lib/platform-language-config'

export const runtime = 'nodejs'

type LanguageOption = {
  code: string
  englishName: string
  nativeName: string
}

type OptionsResponse = {
  uiLanguages: LanguageOption[]
  learningLanguages: LanguageOption[]
}

function toOption(item: LanguageRegistryItem): LanguageOption {
  return {
    code: item.code,
    englishName: item.englishName,
    nativeName: item.nativeName,
  }
}

/** Hardcoded fallback when DB is unreachable — matches current production behavior. */
function buildFallbackOptions(): OptionsResponse {
  return {
    uiLanguages: BUILT_IN_LANGUAGE_CATALOG
      .filter((l) => l.enabledForUi)
      .map((l) => ({ code: l.code, englishName: l.englishName, nativeName: l.nativeName })),
    learningLanguages: BUILT_IN_LANGUAGE_CATALOG
      .filter((l) => l.enabledForLearning)
      .map((l) => ({ code: l.code, englishName: l.englishName, nativeName: l.nativeName })),
  }
}

export async function GET(): Promise<NextResponse<OptionsResponse>> {
  try {
    const registry = await getActiveLanguageRegistry()

    const uiLanguages = registry
      .filter((item) => item.enabledForUi && isSupportedAppLocale(item.code))
      .map(toOption)

    const learningLanguages = registry
      .filter((item) => item.enabledForLearning && isSupportedLearningLanguage(item.code))
      .map(toOption)

    return NextResponse.json({ uiLanguages, learningLanguages })
  } catch {
    // DB unreachable — return built-in fallback so onboarding never breaks
    return NextResponse.json(buildFallbackOptions())
  }
}
