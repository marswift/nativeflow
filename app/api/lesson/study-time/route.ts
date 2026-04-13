/**
 * POST /api/lesson/study-time
 *
 * Records study time for abandoned lesson runs.
 * Called via sendBeacon on page unload — must be fast and non-blocking.
 * Marks the lesson_run as 'abandoned' (NOT completed).
 */

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

type StudyTimePayload = {
  userId: string
  lessonRunId: string | null
  studyMinutes: number
  statDate: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as StudyTimePayload

    if (!body.userId || !body.studyMinutes || body.studyMinutes <= 0) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    // Cap: single session cannot exceed 60 minutes in one sendBeacon
    const MAX_SESSION_MINUTES = 60
    const safeMins = Math.min(body.studyMinutes, MAX_SESSION_MINUTES)

    // Lazy import to avoid server-only at module level
    const { supabaseServer } = await import('@/lib/supabase-server')

    const date = body.statDate || new Date().toISOString().slice(0, 10)

    // Read existing daily_stats for this user + date
    const { data: existing } = await supabaseServer
      .from('daily_stats')
      .select('id, study_minutes, lesson_runs_completed')
      .eq('user_id', body.userId)
      .eq('stat_date', date)
      .maybeSingle()

    const currentMinutes = existing?.study_minutes ?? 0
    const currentCompleted = existing?.lesson_runs_completed ?? 0

    if (existing) {
      await supabaseServer
        .from('daily_stats')
        .update({
          study_minutes: currentMinutes + safeMins,
        })
        .eq('id', existing.id)
    } else {
      await supabaseServer
        .from('daily_stats')
        .insert({
          user_id: body.userId,
          stat_date: date,
          study_minutes: safeMins,
          lesson_runs_completed: 0,
          lesson_runs_started: 1,
          lesson_items_completed: 0,
          typing_items_correct: 0,
          flow_points_today: 0,
        })
    }

    // Mark lesson run as abandoned (NOT completed) if still in progress
    if (body.lessonRunId) {
      await supabaseServer
        .from('lesson_runs')
        .update({
          status: 'abandoned',
          abandoned_at: new Date().toISOString(),
        })
        .eq('id', body.lessonRunId)
        .eq('status', 'in_progress') // only if still in progress
    }

    // Update streak in user_profiles (idempotent — skips if already updated today)
    try {
      const { computeUpdatedStreakProfile } = await import('@/lib/progression-utils')

      const { data: profile } = await supabaseServer
        .from('user_profiles')
        .select('current_streak_days, best_streak_days, last_streak_date')
        .eq('id', body.userId)
        .maybeSingle()

      if (profile) {
        const update = computeUpdatedStreakProfile({
          todayYmd: date,
          lastStreakDate: (profile.last_streak_date as string | null) ?? null,
          currentStreakDays: Number(profile.current_streak_days) || 0,
          bestStreakDays: Number(profile.best_streak_days) || 0,
        })

        await supabaseServer
          .from('user_profiles')
          .update({
            current_streak_days: update.current_streak_days,
            best_streak_days: update.best_streak_days,
            last_streak_date: update.last_streak_date,
          })
          .eq('id', body.userId)
      }
    } catch { /* non-blocking */ }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
