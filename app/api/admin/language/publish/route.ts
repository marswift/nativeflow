/**
 * POST /api/admin/language/publish
 *
 * Publish a validated content version.
 * BLOCKS if version is not validated.
 */

import { NextRequest, NextResponse } from 'next/server'
import { publish, getBundleInfo } from '@/lib/content-pipeline/lifecycle'
import { verifyAdminRequest, logAdminAction } from '@/lib/admin-api-guard'

export const runtime = 'nodejs'

type PublishRequest = {
  bundleId: string
  versionNumber: number
}

export async function POST(request: NextRequest) {
  try {
    const adminUserId = await verifyAdminRequest(request)
    if (!adminUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = (await request.json()) as PublishRequest

    if (!body.bundleId?.trim()) {
      return NextResponse.json({ error: 'bundleId is required' }, { status: 400 })
    }
    if (typeof body.versionNumber !== 'number') {
      return NextResponse.json({ error: 'versionNumber is required' }, { status: 400 })
    }

    // Pre-check: version must be validated
    const bundle = getBundleInfo(body.bundleId)
    if (!bundle) {
      return NextResponse.json({ error: 'Bundle not found' }, { status: 404 })
    }

    const version = bundle.versions.find((v) => v.version === body.versionNumber)
    if (!version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 })
    }

    if (version.status !== 'validated') {
      return NextResponse.json({
        error: `Cannot publish: version status is "${version.status}", must be "validated"`,
        currentStatus: version.status,
      }, { status: 409 })
    }

    const success = publish(body.bundleId, body.versionNumber)

    if (!success) {
      return NextResponse.json({ error: 'Publish failed' }, { status: 500 })
    }

    logAdminAction(adminUserId, 'language_publish', {
      bundleId: body.bundleId,
      versionNumber: body.versionNumber,
      previousVersion: bundle.publishedVersion,
    })

    return NextResponse.json({
      success: true,
      bundleId: body.bundleId,
      versionNumber: body.versionNumber,
      status: 'published',
      previousVersion: bundle.publishedVersion,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
