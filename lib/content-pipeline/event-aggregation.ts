/**
 * Lesson Event Aggregation
 *
 * Converts raw lesson_events rows into ContentHealthInput
 * for the monitoring / safety-actions pipeline.
 *
 * Can run server-side (Supabase query) or from pre-fetched rows.
 */

import type { ContentHealthInput, StageAggregates } from './monitoring-types'

// ── Raw event row (matches Supabase `lesson_events` table) ──

export type LessonEventRow = {
  id?: string
  user_id: string | null
  bundle_id: string
  version_number: number
  age_group: string | null
  region: string | null
  stage: string | null
  event_type: string
  metadata: Record<string, string | number | boolean | null> | null
  created_at: string
}

// ── Aggregation from raw rows ──

/**
 * Aggregate raw lesson event rows into ContentHealthInput
 * for a specific bundle + version.
 */
export function aggregateLessonEvents(
  bundleId: string,
  versionNumber: number,
  publishedAt: string,
  rows: LessonEventRow[],
): ContentHealthInput {
  // Filter to this bundle + version
  const events = rows.filter(
    (r) => r.bundle_id === bundleId && r.version_number === versionNumber
  )

  // ── Lesson-level counts ──
  let totalStarts = 0
  let totalCompletions = 0
  let totalAbandonments = 0
  let totalCompletionSeconds = 0

  for (const e of events) {
    switch (e.event_type) {
      case 'lesson_start':
        totalStarts++
        break
      case 'lesson_complete':
        totalCompletions++
        if (e.metadata && typeof e.metadata.completionSeconds === 'number') {
          totalCompletionSeconds += e.metadata.completionSeconds
        }
        break
      case 'lesson_abandon':
        totalAbandonments++
        break
    }
  }

  // ── Stage-level aggregation ──
  const stageMap = new Map<string, StageAggregates>()

  function getStage(stage: string): StageAggregates {
    let s = stageMap.get(stage)
    if (!s) {
      s = { starts: 0, completions: 0, retries: 0, silentAttempts: 0, dropoffs: 0 }
      stageMap.set(stage, s)
    }
    return s
  }

  // Track which stages each user entered vs completed for dropoff
  const userStageEntered = new Map<string, Set<string>>()
  const userStageCompleted = new Map<string, Set<string>>()

  for (const e of events) {
    if (!e.stage) continue
    const stage = e.stage
    const userId = e.user_id ?? 'anonymous'

    switch (e.event_type) {
      case 'stage_enter': {
        const s = getStage(stage)
        s.starts++
        if (!userStageEntered.has(userId)) userStageEntered.set(userId, new Set())
        userStageEntered.get(userId)!.add(stage)
        break
      }
      case 'stage_complete': {
        const s = getStage(stage)
        s.completions++
        if (!userStageCompleted.has(userId)) userStageCompleted.set(userId, new Set())
        userStageCompleted.get(userId)!.add(stage)
        break
      }
      case 'stage_retry': {
        const s = getStage(stage)
        s.retries++
        break
      }
      case 'stage_silent': {
        const s = getStage(stage)
        s.silentAttempts++
        break
      }
    }
  }

  // Compute dropoffs: entered but never completed
  for (const [userId, entered] of userStageEntered) {
    const completed = userStageCompleted.get(userId) ?? new Set()
    for (const stage of entered) {
      if (!completed.has(stage)) {
        const s = getStage(stage)
        s.dropoffs++
      }
    }
  }

  const stageStats: Record<string, StageAggregates> = {}
  for (const [stage, agg] of stageMap) {
    stageStats[stage] = agg
  }

  // ── Segment breakdowns ──
  const ageGroupMap = new Map<string, { starts: number; completions: number }>()
  const regionMap = new Map<string, { starts: number; completions: number }>()

  for (const e of events) {
    if (e.event_type === 'lesson_start' && e.age_group) {
      const ag = ageGroupMap.get(e.age_group) ?? { starts: 0, completions: 0 }
      ag.starts++
      ageGroupMap.set(e.age_group, ag)
    }
    if (e.event_type === 'lesson_complete' && e.age_group) {
      const ag = ageGroupMap.get(e.age_group) ?? { starts: 0, completions: 0 }
      ag.completions++
      ageGroupMap.set(e.age_group, ag)
    }
    if (e.event_type === 'lesson_start' && e.region) {
      const rg = regionMap.get(e.region) ?? { starts: 0, completions: 0 }
      rg.starts++
      regionMap.set(e.region, rg)
    }
    if (e.event_type === 'lesson_complete' && e.region) {
      const rg = regionMap.get(e.region) ?? { starts: 0, completions: 0 }
      rg.completions++
      regionMap.set(e.region, rg)
    }
  }

  const byAgeGroup: Record<string, { starts: number; completions: number }> = {}
  for (const [k, v] of ageGroupMap) byAgeGroup[k] = v

  const byRegion: Record<string, { starts: number; completions: number }> = {}
  for (const [k, v] of regionMap) byRegion[k] = v

  return {
    bundleId,
    versionNumber,
    publishedAt,
    totalStarts,
    totalCompletions,
    totalAbandonments,
    totalCompletionSeconds,
    stageStats,
    byAgeGroup: Object.keys(byAgeGroup).length > 0 ? byAgeGroup : undefined,
    byRegion: Object.keys(byRegion).length > 0 ? byRegion : undefined,
  }
}

// ── Supabase query + aggregate (server-side) ──

/**
 * Fetch events from Supabase and aggregate for a bundle + version.
 * Returns null if Supabase is unavailable or query fails.
 */
export async function fetchAndAggregateLessonEvents(
  bundleId: string,
  versionNumber: number,
  publishedAt: string,
): Promise<ContentHealthInput | null> {
  try {
    const { supabaseServer } = await import('@/lib/supabase-server')
    const { INTERNAL_ROLE_SQL_LIST } = await import('@/lib/analytics-user-scope')

    // Fetch internal user IDs to exclude from analytics
    const { data: internalUsers } = await supabaseServer
      .from('user_profiles')
      .select('id')
      .in('role', INTERNAL_ROLE_SQL_LIST.split(','))

    const internalIds = new Set((internalUsers ?? []).map((u: { id: string }) => u.id))

    const PAGE = 1000
    let offset = 0
    const allRows: LessonEventRow[] = []

    // Paginate to handle > 1000 rows
    while (true) {
      const { data, error } = await supabaseServer
        .from('lesson_events')
        .select('*')
        .eq('bundle_id', bundleId)
        .eq('version_number', versionNumber)
        .range(offset, offset + PAGE - 1)

      if (error) {
        // eslint-disable-next-line no-console
        console.error('[event-aggregation] query error', error.message)
        return null
      }

      if (!data || data.length === 0) break
      // Exclude internal users from aggregation
      const filtered = (data as LessonEventRow[]).filter(
        (row) => !row.user_id || !internalIds.has(row.user_id)
      )
      allRows.push(...filtered)
      if (data.length < PAGE) break
      offset += PAGE
    }

    return aggregateLessonEvents(bundleId, versionNumber, publishedAt, allRows)
  } catch {
    return null
  }
}
