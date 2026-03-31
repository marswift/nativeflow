/**
 * Service layer for Flow Point-based rank progression.
 * Pure read/compute service for dashboard, lesson, and future profile surfaces.
 */
import type { PostgrestError } from '@supabase/supabase-js'
import {
  computeRankCodeFromFlowPoints,
  computeAvatarLevelFromFlowPoints,
  getNextRankRequirement,
  getFlowPointsToNextRank,
  type RankCode,
} from './progression-utils'
import { getSupabaseBrowserClient } from './supabase/browser-client'

const supabase = getSupabaseBrowserClient()

export type RankProgressData = {
  flowPoints: number
  rankCode: RankCode
  avatarLevel: number
  nextRankCode: RankCode | null
  nextRankMinFlowPoints: number | null
  flowPointsToNextRank: number
}

export type RankProgressResult = {
  data: RankProgressData | null
  error: PostgrestError | null
}

export async function getUserRankProgress(
  userId: string
): Promise<RankProgressResult> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('flow_points')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    return { data: null, error }
  }

  const flowPoints = Number((data as { flow_points?: unknown } | null)?.flow_points ?? 0)
  const rankCode = computeRankCodeFromFlowPoints(flowPoints)
  const avatarLevel = computeAvatarLevelFromFlowPoints(flowPoints)
  const nextRequirement = getNextRankRequirement(flowPoints)

  return {
    data: {
      flowPoints,
      rankCode,
      avatarLevel,
      nextRankCode: nextRequirement?.rank ?? null,
      nextRankMinFlowPoints: nextRequirement?.minFlowPoints ?? null,
      flowPointsToNextRank: getFlowPointsToNextRank(flowPoints),
    },
    error: null,
  }
}