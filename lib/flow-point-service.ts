/**
 * Service layer for user Flow Point operations.
 * Keeps Flow Point updates separate from lesson run persistence and daily stats aggregation.
 */
import type { PostgrestError } from '@supabase/supabase-js'
import { recordLessonFlowPointsForToday } from './daily-stats-service'
import { supabase } from './supabase'

export type FlowPointResult<T> = {
  data: T | null
  error: PostgrestError | null
}

export type UserFlowPointRow = {
  total_flow_points: number
}

export async function getUserFlowPoints(
  userId: string
): Promise<FlowPointResult<UserFlowPointRow>> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('total_flow_points')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    return { data: null, error }
  }

  if (!data) {
    return {
      data: null,
      error: {
        message: 'User profile not found',
        details: '',
        hint: '',
        code: 'FLOW_POINT_USER_NOT_FOUND',
      } as PostgrestError,
    }
  }

  return {
    data: {
      total_flow_points: Number(
        (data as { total_flow_points?: unknown }).total_flow_points ?? 0
      ),
    },
    error: null,
  }
}

export async function addFlowPoints(
  userId: string,
  points: number
): Promise<FlowPointResult<UserFlowPointRow>> {
  const safePoints = Number.isFinite(points) ? Math.max(0, Math.floor(points)) : 0

  if (!userId) {
    return {
      data: null,
      error: {
        message: 'userId is required',
        details: '',
        hint: '',
        code: 'FLOW_POINT_INVALID_USER_ID',
      } as PostgrestError,
    }
  }

  if (safePoints === 0) {
    return getUserFlowPoints(userId)
  }

  const currentResult = await getUserFlowPoints(userId)

  if (currentResult.error || !currentResult.data) {
    return {
      data: null,
      error:
        currentResult.error ??
        ({
          message: 'User flow points not found',
          details: '',
          hint: '',
          code: 'FLOW_POINT_NOT_FOUND',
        } as PostgrestError),
    }
  }

  const nextTotalFlowPoints = currentResult.data.total_flow_points + safePoints

  const { data, error } = await supabase
    .from('user_profiles')
    .update({ total_flow_points: nextTotalFlowPoints })
    .eq('id', userId)
    .select('total_flow_points')
    .single()

  if (error) {
    return { data: null, error }
  }

  return {
    data: {
      total_flow_points: Number(
        (data as { total_flow_points?: unknown } | null)?.total_flow_points ?? 0
      ),
    },
    error: null,
  }
}

export async function awardLessonFlowPoints(
  userId: string,
  awardedPoints: number
): Promise<FlowPointResult<UserFlowPointRow>> {
  const safePoints = Number.isFinite(awardedPoints)
    ? Math.max(0, Math.floor(awardedPoints))
    : 0

  if (!userId) {
    return {
      data: null,
      error: {
        message: 'userId is required',
        details: '',
        hint: '',
        code: 'FLOW_POINT_INVALID_USER_ID',
      } as PostgrestError,
    }
  }

  if (safePoints === 0) {
    return getUserFlowPoints(userId)
  }

  const dailyResult = await recordLessonFlowPointsForToday(userId, safePoints)

  if (dailyResult.error) {
    console.error('recordLessonFlowPointsForToday failed', {
      userId,
      safePoints,
      dailyResult,
    })
  }

  return await addFlowPoints(userId, safePoints)
}