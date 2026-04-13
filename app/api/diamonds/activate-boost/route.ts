/**
 * POST /api/diamonds/activate-boost
 *
 * Activates a diamond reward boost by spending 5 diamonds.
 * Next lesson completion gives +2 bonus diamonds.
 * Boost expires after 24 hours.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const BOOST_COST = 5
const BOOST_DURATION_MS = 24 * 60 * 60 * 1000

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

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('total_diamonds, diamond_boost_until')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const diamonds = (profile.total_diamonds as number) ?? 0
    const existingBoost = profile.diamond_boost_until as string | null

    if (diamonds < BOOST_COST) {
      return NextResponse.json({
        error: 'insufficient_diamonds',
        message: 'ダイヤが足りません',
        required: BOOST_COST,
        current: diamonds,
      }, { status: 400 })
    }

    // Check if boost already active
    if (existingBoost && new Date(existingBoost) > new Date()) {
      return NextResponse.json({
        error: 'already_active',
        message: 'ブーストはすでに有効です',
      }, { status: 400 })
    }

    const boostUntil = new Date(Date.now() + BOOST_DURATION_MS).toISOString()

    const { error } = await supabase
      .from('user_profiles')
      .update({
        total_diamonds: diamonds - BOOST_COST,
        diamond_boost_until: boostUntil,
      })
      .eq('id', user.id)

    if (error) return NextResponse.json({ error: 'Update failed' }, { status: 500 })

    return NextResponse.json({
      success: true,
      newDiamonds: diamonds - BOOST_COST,
      boostUntil,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
