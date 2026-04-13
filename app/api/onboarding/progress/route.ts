import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * GET  /api/onboarding/progress — Read saved onboarding progress
 * POST /api/onboarding/progress — Save critical onboarding fields per step
 *
 * Persists: targetLanguageCode, targetRegionSlug, currentLevel, plannedPlanCode.
 * Draft inputs (username, freetext) stay in sessionStorage only.
 */

function extractToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim()
  return token && token.length > 0 ? token : null
}

function createAuthClient(token: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    }
  )
}

export async function GET(request: Request) {
  const token = extractToken(request)
  if (!token) {
    return NextResponse.json({}, { status: 401 })
  }

  try {
    const supabase = createAuthClient(token)
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({}, { status: 401 })

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('target_language_code, target_region_slug, current_level, planned_plan_code')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile) return NextResponse.json({})

    return NextResponse.json({
      targetLanguageCode: profile.target_language_code ?? undefined,
      targetRegionSlug: profile.target_region_slug ?? undefined,
      currentLevel: profile.current_level ?? undefined,
      plannedPlanCode: profile.planned_plan_code ?? undefined,
    })
  } catch {
    return NextResponse.json({})
  }
}

export async function POST(request: Request) {
  const token = extractToken(request)
  if (!token) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  try {
    const supabase = createAuthClient(token)
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Only allow known fields — ignore anything else
    const update: Record<string, string> = {}
    if (typeof body.targetLanguageCode === 'string') update.target_language_code = body.targetLanguageCode
    if (typeof body.targetRegionSlug === 'string') update.target_region_slug = body.targetRegionSlug
    if (typeof body.currentLevel === 'string') update.current_level = body.currentLevel
    if (typeof body.plannedPlanCode === 'string') update.planned_plan_code = body.plannedPlanCode

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ success: true }) // Nothing to update
    }

    const { error: updateError } = await supabase
      .from('user_profiles')
      .upsert({ id: user.id, ...update }, { onConflict: 'id' })

    if (updateError) {
      console.error('Onboarding progress save failed', updateError)
      return NextResponse.json({ error: 'Save failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
