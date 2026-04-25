/**
 * GET /api/languages/regions?language=en
 *
 * Returns enabled region options for a given learning language.
 * Runtime source of truth: reads from region_registry DB table.
 * Falls back to REGION_MASTER constants if DB is unreachable.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getActiveRegionsForLanguage,
  getRegionsFallback,
} from '@/lib/region-registry-repository'

export const runtime = 'nodejs'

type RegionOption = {
  code: string
  languageCode: string
  displayLabel: string
  countryLabel: string
  cityLabel: string
}

type RegionsResponse = {
  regions: RegionOption[]
}

export async function GET(request: NextRequest): Promise<NextResponse<RegionsResponse>> {
  const language = request.nextUrl.searchParams.get('language')?.trim()

  if (!language) {
    return NextResponse.json({ regions: [] })
  }

  try {
    const items = await getActiveRegionsForLanguage(language)
    const regions: RegionOption[] = items.map((r) => ({
      code: r.code,
      languageCode: r.languageCode,
      displayLabel: r.displayName,
      countryLabel: r.countryCode ?? '',
      cityLabel: r.cityOrVariant ?? '',
    }))
    return NextResponse.json({ regions })
  } catch {
    // DB unreachable — fall back to REGION_MASTER constants
    const fallback = getRegionsFallback(language)
    const regions: RegionOption[] = fallback.map((r) => ({
      code: r.code,
      languageCode: r.languageCode,
      displayLabel: r.displayName,
      countryLabel: r.countryCode ?? '',
      cityLabel: r.cityOrVariant ?? '',
    }))
    return NextResponse.json({ regions })
  }
}
