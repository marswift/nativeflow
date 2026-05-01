/**
 * GET /api/admin/language/health?bundleId=...
 *
 * Fetch monitoring health data for a content bundle.
 * Evaluates current health and optionally compares with previous version.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getBundleInfo } from '@/lib/content-pipeline/lifecycle'
import { handleContentHealth } from '@/lib/content-pipeline/safety-actions'
import { fetchAndAggregateLessonEvents } from '@/lib/content-pipeline/event-aggregation'
import type { ContentHealthInput } from '@/lib/content-pipeline/monitoring-types'
import { verifyAdminRequest } from '@/lib/admin-api-guard'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const adminUserId = await verifyAdminRequest(request)
    if (!adminUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { searchParams } = request.nextUrl
    const bundleId = searchParams.get('bundleId')

    if (!bundleId) {
      return NextResponse.json({ error: 'bundleId query param is required' }, { status: 400 })
    }

    const bundle = await getBundleInfo(bundleId)
    if (!bundle) {
      return NextResponse.json({ error: 'Bundle not found' }, { status: 404 })
    }

    // Build version list with status and flags
    const versions = bundle.versions.map((v) => ({
      version: v.version,
      status: v.status,
      flags: v.flags ?? [],
      isAtRisk: v.isAtRisk ?? false,
      lastHealthCheckAt: v.lastHealthCheckAt ?? null,
      createdAt: v.createdAt,
      publishedAt: v.publishedAt,
      archivedAt: v.archivedAt,
    }))

    const publishedVersion = bundle.publishedVersion
    const published = bundle.versions.find(
      (v) => v.version === publishedVersion && v.status === 'published'
    )

    return NextResponse.json({
      bundleId,
      languageCode: bundle.languageCode,
      regionSlug: bundle.regionSlug,
      publishedVersion,
      versions,
      publishedContent: published
        ? {
            scenes: published.content.scenes,
            labels: published.content.labels,
            ageGroup: published.content.ageGroup,
            region: published.content.region,
          }
        : null,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * POST /api/admin/language/health
 *
 * Run health evaluation with aggregated runtime data.
 * Triggers safety actions if anomalies are detected.
 */
export async function POST(request: NextRequest) {
  try {
    const adminUserId = await verifyAdminRequest(request)
    if (!adminUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = (await request.json()) as ContentHealthInput

    if (!body.bundleId?.trim()) {
      return NextResponse.json({ error: 'bundleId is required' }, { status: 400 })
    }
    if (typeof body.versionNumber !== 'number') {
      return NextResponse.json({ error: 'versionNumber is required' }, { status: 400 })
    }
    if (typeof body.totalStarts !== 'number') {
      return NextResponse.json({ error: 'totalStarts is required' }, { status: 400 })
    }

    // If body has no totalStarts but has 'autoAggregate' flag,
    // fetch real events from DB and aggregate
    let input: ContentHealthInput = body
    if (body.totalStarts === 0 && (body as Record<string, unknown>).autoAggregate) {
      const aggregated = await fetchAndAggregateLessonEvents(
        body.bundleId,
        body.versionNumber,
        body.publishedAt ?? new Date().toISOString(),
      )
      if (aggregated) {
        input = aggregated
      }
    }

    const result = await handleContentHealth(input)

    return NextResponse.json({
      bundleId: result.bundleId,
      versionNumber: result.versionNumber,
      action: result.action,
      anomalyFlags: result.anomalyFlags,
      regressionFlags: result.regressionFlags,
      rollbackTarget: result.rollbackTarget,
      rollbackSuccess: result.rollbackSuccess,
      reason: result.reason,
      evaluatedAt: result.evaluatedAt,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
