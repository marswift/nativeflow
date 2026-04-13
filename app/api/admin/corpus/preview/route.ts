/**
 * Admin Corpus Preview API
 *
 * POST /api/admin/corpus/preview
 *
 * Accepts raw text and returns:
 * - meaningChunks + speechChunks
 * - level classification
 * - quality filter result
 * - source safety evaluation
 *
 * For internal/admin use only — no auth required in dev.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/admin-api-guard'
import { buildMeaningChunks, buildSpeechChunks } from '@/lib/corpus/chunking'
import { classifyTurnLevel } from '@/lib/corpus/leveling'
import { filterConversationQuality } from '@/lib/corpus/quality-filter'
import { isCommerciallySafeSource } from '@/lib/corpus/source-policy'
import { normalizeCorpusText } from '@/lib/corpus/normalize'

export const runtime = 'nodejs'

type PreviewRequest = {
  text: string
  source?: string
  license?: string
}

export async function POST(request: NextRequest) {
  try {
    const adminUserId = await verifyAdminRequest(request)
    if (!adminUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    const body = (await request.json()) as PreviewRequest
    const text = (body.text ?? '').trim()

    if (!text) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 })
    }

    const quality = filterConversationQuality(text)
    const meaningChunks = buildMeaningChunks(text)
    const speechChunks = buildSpeechChunks(text)
    const level = classifyTurnLevel(text)
    const normalized = normalizeCorpusText(text)

    const source = body.source ?? 'manual'
    const license = body.license ?? 'owned'
    const safety = isCommerciallySafeSource(source, license)

    return NextResponse.json({
      text,
      normalized,
      quality,
      level,
      safety,
      meaningChunks,
      speechChunks,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
