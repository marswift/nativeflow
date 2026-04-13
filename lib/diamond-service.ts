/**
 * Diamond Reward & Consumption Service
 *
 * Awards diamonds on lesson completion with streak bonus.
 * Supports spending diamonds for streak restore and reward boost.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

// ── Award constants ──

const BASE_DIAMONDS = 1
const STREAK_BONUS_THRESHOLD = 3
const STREAK_BONUS_DIAMONDS = 1

// ── Consumption constants ──

export type DiamondAction = 'streak_restore' | 'reward_boost'

export type DiamondActionConfig = {
  id: DiamondAction
  cost: number
  labelJa: string
  descriptionJa: string
}

export const DIAMOND_ACTIONS: DiamondActionConfig[] = [
  {
    id: 'streak_restore',
    cost: 3,
    labelJa: 'ストリーク復元',
    descriptionJa: '途切れたストリークを1日分回復します',
  },
  {
    id: 'reward_boost',
    cost: 5,
    labelJa: '報酬ブースト',
    descriptionJa: '次のレッスンのダイヤ獲得を2倍にします',
  },
]

export function getDiamondActionCost(action: DiamondAction): number {
  return DIAMOND_ACTIONS.find((a) => a.id === action)?.cost ?? 0
}

// ── Award ──

export function computeDiamondReward(streakDays: number): {
  base: number
  streakBonus: number
  total: number
} {
  const base = BASE_DIAMONDS
  const streakBonus = streakDays >= STREAK_BONUS_THRESHOLD ? STREAK_BONUS_DIAMONDS : 0
  return { base, streakBonus, total: base + streakBonus }
}

export async function awardDiamonds(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
): Promise<number | null> {
  try {
    const { data } = await supabase
      .from('user_profiles')
      .select('total_diamonds')
      .eq('id', userId)
      .maybeSingle()

    const current = (data?.total_diamonds as number) ?? 0
    const newTotal = current + amount

    const { error } = await supabase
      .from('user_profiles')
      .update({ total_diamonds: newTotal })
      .eq('id', userId)

    if (error) return null
    return newTotal
  } catch {
    return null
  }
}

// ── Consumption ──

export type SpendResult = {
  success: boolean
  newTotal: number
  error?: string
}

/**
 * Spend diamonds for an action. Deducts cost from total_diamonds.
 * Returns error if insufficient balance.
 */
export async function spendDiamonds(
  supabase: SupabaseClient,
  userId: string,
  action: DiamondAction,
): Promise<SpendResult> {
  const cost = getDiamondActionCost(action)
  if (cost <= 0) return { success: false, newTotal: 0, error: 'Invalid action' }

  try {
    const { data } = await supabase
      .from('user_profiles')
      .select('total_diamonds')
      .eq('id', userId)
      .maybeSingle()

    const current = (data?.total_diamonds as number) ?? 0
    if (current < cost) {
      return { success: false, newTotal: current, error: 'ダイヤが足りません' }
    }

    const newTotal = current - cost
    const { error } = await supabase
      .from('user_profiles')
      .update({ total_diamonds: newTotal })
      .eq('id', userId)

    if (error) return { success: false, newTotal: current, error: error.message }
    return { success: true, newTotal }
  } catch {
    return { success: false, newTotal: 0, error: 'Unknown error' }
  }
}

// ── Effect application ──

/**
 * Apply the effect of a diamond action.
 * Called after successful spend.
 */
export async function applyDiamondEffect(
  supabase: SupabaseClient,
  userId: string,
  action: DiamondAction,
): Promise<boolean> {
  try {
    if (action === 'streak_restore') {
      // Restore streak: set last_streak_date to yesterday, increment current_streak_days
      const { data } = await supabase
        .from('user_profiles')
        .select('current_streak_days, best_streak_days')
        .eq('id', userId)
        .maybeSingle()

      const current = (data?.current_streak_days as number) ?? 0
      const best = (data?.best_streak_days as number) ?? 0
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().slice(0, 10)

      const restored = current + 1
      await supabase
        .from('user_profiles')
        .update({
          current_streak_days: restored,
          best_streak_days: Math.max(best, restored),
          last_streak_date: yesterdayStr,
        })
        .eq('id', userId)

      return true
    }

    if (action === 'reward_boost') {
      // Store boost flag in localStorage (client reads it on next lesson completion)
      // This is handled client-side after spend confirmation
      return true
    }

    return false
  } catch {
    return false
  }
}
