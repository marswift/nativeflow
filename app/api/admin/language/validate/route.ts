/**
 * POST /api/admin/language/validate
 *
 * Validate a draft content version.
 * Must pass validation before publish is allowed.
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateDraft } from '@/lib/content-pipeline/lifecycle'
import { verifyAdminRequest } from '@/lib/admin-api-guard'

export const runtime = 'nodejs'

type ValidateRequest = {
  bundleId: string
  versionNumber: number
}

export async function POST(request: NextRequest) {
  try {
    const adminUserId = await verifyAdminRequest(request)
    if (!adminUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = (await request.json()) as ValidateRequest

    if (!body.bundleId?.trim()) {
      return NextResponse.json({ error: 'bundleId is required' }, { status: 400 })
    }
    if (typeof body.versionNumber !== 'number') {
      return NextResponse.json({ error: 'versionNumber is required' }, { status: 400 })
    }

    const result = await validateDraft(body.bundleId, body.versionNumber)

    if (!result) {
      return NextResponse.json({
        error: 'Bundle or version not found, or version is not a draft',
      }, { status: 404 })
    }

    return NextResponse.json({
      bundleId: body.bundleId,
      versionNumber: body.versionNumber,
      valid: result.valid,
      errors: result.errors,
      warnings: result.warnings,
      checkedAt: result.checkedAt,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
