/**
 * POST /api/admin/language/create
 *
 * Create draft content bundles for a new language.
 * Internal admin use only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createLanguageBundle, getAvailableRegions, AVAILABLE_AGE_GROUPS } from '@/lib/content-pipeline/language-expansion'
import type { AgeGroup } from '@/lib/daily-timeline'
import { verifyAdminRequest, logAdminAction } from '@/lib/admin-api-guard'

export const runtime = 'nodejs'

type CreateRequest = {
  baseLanguage: string
  targetLanguage: string
  region: string
  ageGroups?: AgeGroup[]
}

export async function POST(request: NextRequest) {
  try {
    const adminUserId = await verifyAdminRequest(request)
    if (!adminUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = (await request.json()) as CreateRequest

    if (!body.targetLanguage?.trim()) {
      return NextResponse.json({ error: 'targetLanguage is required' }, { status: 400 })
    }
    if (!body.region?.trim()) {
      return NextResponse.json({ error: 'region is required' }, { status: 400 })
    }

    // Validate region exists
    const validRegions = getAvailableRegions(body.targetLanguage)
    if (validRegions.length > 0 && !validRegions.includes(body.region)) {
      return NextResponse.json({
        error: `Invalid region "${body.region}". Available: ${validRegions.join(', ')}`,
      }, { status: 400 })
    }

    const ageGroups = body.ageGroups ?? AVAILABLE_AGE_GROUPS

    const result = createLanguageBundle({
      baseLanguage: body.baseLanguage ?? 'ja',
      targetLanguage: body.targetLanguage,
      region: body.region,
      ageGroups,
    })

    logAdminAction(adminUserId, 'language_create', {
      targetLanguage: body.targetLanguage,
      region: body.region,
      bundleCount: result.bundles.length,
    })

    return NextResponse.json({
      success: true,
      bundleCount: result.bundles.length,
      bundles: result.bundles.map((b) => ({
        bundleId: b.bundleId,
        version: b.versions[0]?.version,
        status: b.versions[0]?.status,
      })),
      summary: result.summary,
      generatedAt: result.generatedAt,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
