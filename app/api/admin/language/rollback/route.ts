/**
 * POST /api/admin/language/rollback
 *
 * Rollback to a previous content version.
 * Target must be validated or archived (never draft).
 */

import { NextRequest, NextResponse } from 'next/server'
import { rollbackToVersion, getBundleInfo } from '@/lib/content-pipeline/lifecycle'
import { verifyAdminRequest, logAdminAction } from '@/lib/admin-api-guard'

export const runtime = 'nodejs'

type RollbackRequest = {
  bundleId: string
  targetVersion: number
}

export async function POST(request: NextRequest) {
  try {
    const adminUserId = await verifyAdminRequest(request)
    if (!adminUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = (await request.json()) as RollbackRequest

    if (!body.bundleId?.trim()) {
      return NextResponse.json({ error: 'bundleId is required' }, { status: 400 })
    }
    if (typeof body.targetVersion !== 'number') {
      return NextResponse.json({ error: 'targetVersion is required' }, { status: 400 })
    }

    // Pre-check: target must exist and be rollback-safe
    const bundle = await getBundleInfo(body.bundleId)
    if (!bundle) {
      return NextResponse.json({ error: 'Bundle not found' }, { status: 404 })
    }

    const target = bundle.versions.find((v) => v.version === body.targetVersion)
    if (!target) {
      return NextResponse.json({ error: 'Target version not found' }, { status: 404 })
    }

    if (target.status !== 'validated' && target.status !== 'archived') {
      return NextResponse.json({
        error: `Cannot rollback to version with status "${target.status}". Must be "validated" or "archived"`,
        currentStatus: target.status,
      }, { status: 409 })
    }

    const success = await rollbackToVersion(body.bundleId, body.targetVersion)

    if (!success) {
      return NextResponse.json({ error: 'Rollback failed' }, { status: 500 })
    }

    logAdminAction(adminUserId, 'language_rollback', {
      bundleId: body.bundleId,
      rolledBackTo: body.targetVersion,
      previousPublished: bundle.publishedVersion,
    })

    return NextResponse.json({
      success: true,
      bundleId: body.bundleId,
      rolledBackTo: body.targetVersion,
      previousPublished: bundle.publishedVersion,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
