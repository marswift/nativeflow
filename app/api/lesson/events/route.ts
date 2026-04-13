/**
 * POST /api/lesson/events
 *
 * Ingest lesson runtime events for content quality monitoring.
 * Fire-and-forget from client side — must never block lesson UX.
 *
 * Stores events in Supabase `lesson_events` table.
 * Falls back to console logging if DB is unavailable.
 */

import { NextRequest, NextResponse } from 'next/server'
import type { LessonEventPayload } from '@/lib/content-pipeline/lesson-events'

export const runtime = 'nodejs'

// ── Supabase lazy init (avoids import of server-only at module level) ──

async function getSupabase() {
  try {
    const { supabaseServer } = await import('@/lib/supabase-server')
    return supabaseServer
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LessonEventPayload

    if (!body.eventType) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    const row = {
      user_id: body.userId ?? null,
      bundle_id: body.bundleId ?? '',
      version_number: body.versionNumber ?? 0,
      age_group: body.ageGroup ?? null,
      region: body.region ?? null,
      stage: body.stage ?? null,
      event_type: body.eventType,
      metadata: body.metadata ?? null,
      created_at: new Date().toISOString(),
    }

    // Try Supabase insert
    const supabase = await getSupabase()
    if (supabase) {
      const { error } = await supabase.from('lesson_events').insert(row)
      if (error) {
        // Fallback to console log — table may not exist yet
        // eslint-disable-next-line no-console
        console.log('[lesson-event][fallback]', JSON.stringify(row))
      }
    } else {
      // No Supabase — log to console
      // eslint-disable-next-line no-console
      console.log('[lesson-event]', JSON.stringify(row))
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
}
