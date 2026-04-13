/**
 * GET /api/admin/language/preview?bundleId=...&version=...
 *
 * Preview a content version without publishing.
 */

import { NextRequest, NextResponse } from 'next/server'
import { previewVersion } from '@/lib/content-pipeline/lifecycle'
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
    const versionStr = searchParams.get('version')

    if (!bundleId) {
      return NextResponse.json({ error: 'bundleId query param is required' }, { status: 400 })
    }
    if (!versionStr) {
      return NextResponse.json({ error: 'version query param is required' }, { status: 400 })
    }

    const versionNumber = parseInt(versionStr, 10)
    if (isNaN(versionNumber)) {
      return NextResponse.json({ error: 'version must be a number' }, { status: 400 })
    }

    const version = previewVersion(bundleId, versionNumber)

    if (!version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 })
    }

    return NextResponse.json({
      bundleId,
      versionNumber: version.version,
      status: version.status,
      content: version.content,
      validation: version.validation,
      flags: version.flags ?? [],
      isAtRisk: version.isAtRisk ?? false,
      createdAt: version.createdAt,
      publishedAt: version.publishedAt,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
