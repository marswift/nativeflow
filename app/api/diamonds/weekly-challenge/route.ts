/**
 * POST /api/diamonds/weekly-challenge
 *
 * Action: "unlock" or "complete"
 *
 * unlock: Spend 7 diamonds to unlock this week's challenge.
 * complete: Mark challenge as completed, award 5 bonus diamonds.
 *
 * One unlock per calendar week (Monday-based).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const UNLOCK_COST = 7
const COMPLETION_REWARD = 5

/** Get the Monday of the current week as YYYY-MM-DD */
function getWeekStart(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? 6 : day - 1 // Monday = 0
  const monday = new Date(now)
  monday.setDate(now.getDate() - diff)
  return monday.toISOString().slice(0, 10)
}

function isThisWeek(isoTimestamp: string | null): boolean {
  if (!isoTimestamp) return false
  const weekStart = getWeekStart()
  const dateStr = isoTimestamp.slice(0, 10)
  return dateStr >= weekStart
}

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
    const action = body.action as string

    if (action !== 'unlock' && action !== 'complete') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('total_diamonds, weekly_challenge_unlocked_at, weekly_challenge_completed_at')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const diamonds = (profile.total_diamonds as number) ?? 0
    const unlockedAt = profile.weekly_challenge_unlocked_at as string | null
    const completedAt = profile.weekly_challenge_completed_at as string | null

    if (action === 'unlock') {
      if (isThisWeek(unlockedAt)) {
        return NextResponse.json({ error: 'already_unlocked', message: '今週はすでに解放済みです' }, { status: 400 })
      }
      if (diamonds < UNLOCK_COST) {
        return NextResponse.json({ error: 'insufficient_diamonds', message: 'ダイヤが足りません', required: UNLOCK_COST, current: diamonds }, { status: 400 })
      }

      const { error } = await supabase
        .from('user_profiles')
        .update({
          total_diamonds: diamonds - UNLOCK_COST,
          weekly_challenge_unlocked_at: new Date().toISOString(),
          weekly_challenge_completed_at: null,
        })
        .eq('id', user.id)

      if (error) return NextResponse.json({ error: 'Update failed' }, { status: 500 })

      return NextResponse.json({ success: true, action: 'unlock', newDiamonds: diamonds - UNLOCK_COST })
    }

    if (action === 'complete') {
      if (!isThisWeek(unlockedAt)) {
        return NextResponse.json({ error: 'not_unlocked', message: 'チャレンジが解放されていません' }, { status: 400 })
      }
      if (isThisWeek(completedAt)) {
        return NextResponse.json({ error: 'already_completed', message: 'すでに完了しています' }, { status: 400 })
      }

      const newTotal = diamonds + COMPLETION_REWARD
      const { error } = await supabase
        .from('user_profiles')
        .update({
          total_diamonds: newTotal,
          weekly_challenge_completed_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) return NextResponse.json({ error: 'Update failed' }, { status: 500 })

      return NextResponse.json({ success: true, action: 'complete', newDiamonds: newTotal, reward: COMPLETION_REWARD })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
