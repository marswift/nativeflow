/**
 * POST /api/diamonds/restore-streak
 *
 * Restores a broken streak by spending 3 diamonds.
 * Server-side validation — no client-trusted calculations.
 *
 * Eligibility:
 * 1. last_streak_date must be exactly 2 days ago (yesterday was missed)
 * 2. total_diamonds >= 3
 * 3. last_streak_restore_date !== yesterday (no repeat restore for same day)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const RESTORE_COST = 3

function getDateStr(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().slice(0, 10)
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Server config error' }, { status: 500 })
    }

    // Authenticate
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    })

    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Read current profile (server-side, fresh)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('total_diamonds, current_streak_days, best_streak_days, last_streak_date, last_streak_restore_date')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const diamonds = (profile.total_diamonds as number) ?? 0
    const currentStreak = (profile.current_streak_days as number) ?? 0
    const bestStreak = (profile.best_streak_days as number) ?? 0
    const lastStudyDate = profile.last_streak_date as string | null
    const lastRestoreDate = profile.last_streak_restore_date as string | null

    const today = getDateStr(0)
    const yesterday = getDateStr(1)
    const dayBeforeYesterday = getDateStr(2)

    // Validation 1: sufficient diamonds
    if (diamonds < RESTORE_COST) {
      return NextResponse.json({
        error: 'insufficient_diamonds',
        message: 'ダイヤが足りません',
        required: RESTORE_COST,
        current: diamonds,
      }, { status: 400 })
    }

    // Validation 2: streak is actually broken (yesterday was missed)
    // last_streak_date must be day-before-yesterday (exactly 1 day gap)
    if (lastStudyDate === today || lastStudyDate === yesterday) {
      return NextResponse.json({
        error: 'not_restorable',
        message: 'ストリークは途切れていません',
      }, { status: 400 })
    }

    if (lastStudyDate !== dayBeforeYesterday) {
      return NextResponse.json({
        error: 'not_restorable',
        message: '復元できるのは1日分の途切れのみです',
      }, { status: 400 })
    }

    // Validation 3: not already restored for this gap
    if (lastRestoreDate === yesterday) {
      return NextResponse.json({
        error: 'already_restored',
        message: 'すでに復元済みです',
      }, { status: 400 })
    }

    // Execute: deduct diamonds + restore streak
    const restoredStreak = currentStreak + 1
    const newBest = Math.max(bestStreak, restoredStreak)

    const { error } = await supabase
      .from('user_profiles')
      .update({
        total_diamonds: diamonds - RESTORE_COST,
        current_streak_days: restoredStreak,
        best_streak_days: newBest,
        last_streak_date: yesterday,
        last_streak_restore_date: yesterday,
      })
      .eq('id', user.id)

    if (error) {
      return NextResponse.json({ error: 'Update failed' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      newDiamonds: diamonds - RESTORE_COST,
      restoredStreak,
      bestStreak: newBest,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
