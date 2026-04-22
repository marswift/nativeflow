/**
 * POST /api/diamonds/freeze-streak
 *
 * Purchase a streak freeze for 15 diamonds.
 * Protects the next missed day from breaking the streak.
 * One active freeze at a time. Expires after 7 days.
 *
 * Body: { targetDate: "YYYY-MM-DD" } — the date to freeze (must be tomorrow or later)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const FREEZE_COST = 15
const FREEZE_EXPIRY_DAYS = 7

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Server config error' }, { status: 500 })
    }

    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    })

    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const targetDate = body.targetDate as string | undefined

    // Validate target date
    const today = new Date()
    const tomorrowStr = new Date(today.getTime() + 86400000).toISOString().slice(0, 10)

    if (!targetDate || targetDate < tomorrowStr) {
      return NextResponse.json({
        error: 'invalid_date',
        message: '明日以降の日付を指定してください',
      }, { status: 400 })
    }

    // Read profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('total_diamonds, streak_frozen_date, streak_freeze_expiry')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const diamonds = (profile.total_diamonds as number) ?? 0
    const existingFreezeDate = profile.streak_frozen_date as string | null
    const existingExpiry = profile.streak_freeze_expiry as string | null

    // Check for active freeze
    if (existingFreezeDate && existingExpiry && new Date(existingExpiry) > new Date()) {
      return NextResponse.json({
        error: 'already_active',
        message: 'フリーズはすでに有効です',
        frozenDate: existingFreezeDate,
      }, { status: 400 })
    }

    // Check diamonds
    if (diamonds < FREEZE_COST) {
      return NextResponse.json({
        error: 'insufficient_diamonds',
        message: 'ダイヤが足りません',
        required: FREEZE_COST,
        current: diamonds,
      }, { status: 400 })
    }

    // Apply freeze
    const expiry = new Date()
    expiry.setDate(expiry.getDate() + FREEZE_EXPIRY_DAYS)

    const { error } = await supabase
      .from('user_profiles')
      .update({
        total_diamonds: diamonds - FREEZE_COST,
        streak_frozen_date: targetDate,
        streak_freeze_expiry: expiry.toISOString(),
      })
      .eq('id', user.id)

    if (error) return NextResponse.json({ error: 'Update failed' }, { status: 500 })

    return NextResponse.json({
      success: true,
      newDiamonds: diamonds - FREEZE_COST,
      frozenDate: targetDate,
      expiresAt: expiry.toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
