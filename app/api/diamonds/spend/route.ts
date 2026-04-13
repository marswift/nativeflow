/**
 * POST /api/diamonds/spend
 *
 * Spend diamonds for an action. Authenticated users only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { spendDiamonds, applyDiamondEffect, type DiamondAction } from '@/lib/diamond-service'

export const runtime = 'nodejs'

const VALID_ACTIONS = new Set(['streak_restore', 'reward_boost'])

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

    const body = await request.json()
    const action = body.action as string

    if (!action || !VALID_ACTIONS.has(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Spend
    const result = await spendDiamonds(supabase, user.id, action as DiamondAction)
    if (!result.success) {
      return NextResponse.json({ error: result.error, newTotal: result.newTotal }, { status: 400 })
    }

    // Apply effect
    await applyDiamondEffect(supabase, user.id, action as DiamondAction)

    return NextResponse.json({ success: true, newTotal: result.newTotal, action })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
