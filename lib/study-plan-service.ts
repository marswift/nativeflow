/**
 * Study plan calculation service.
 * Pure logic: computes recommended daily study minutes from deadline and level.
 * No React, UI, or Supabase.
 */
import type { CurrentLevel } from './constants'

const TARGET_HOURS_BY_LEVEL: Record<CurrentLevel, number> = {
  beginner: 550,
  intermediate: 400,
  advanced: 200,
}

const SAFETY_FACTOR = 1.2

const DEADLINE_DAYS: Record<string, number> = {
  '6ヶ月': 183,
  '1年': 365,
  '1年6ヶ月': 548,
  '2年': 730,
  '2年6ヶ月': 913,
  '3年': 1095,
  '3年以上': 9999,  // 追加
}

const DEFAULT_DAYS = 730

export type StudyPlanInput = {
  deadlineText: string
  currentLevel: CurrentLevel
}

export type StudyPlanResult = {
  remainingDays: number
  recommendedTotalMinutes: number
  recommendedDailyMinutes: number
}

function roundToNearestFive(value: number): number {
  return Math.ceil(value / 5) * 5
}

function daysFromDeadline(deadlineText: string): number {
  return DEADLINE_DAYS[deadlineText.trim()] ?? DEFAULT_DAYS
}

export function computeStudyPlan(input: StudyPlanInput): StudyPlanResult {
  // 3年以上は30分固定
  if (input.deadlineText.trim() === '3年以上') {
    return {
      remainingDays: 9999,
      recommendedTotalMinutes: TARGET_HOURS_BY_LEVEL[input.currentLevel] * 60,
      recommendedDailyMinutes: 30,
    }
  }

  const remainingDays = daysFromDeadline(input.deadlineText)
  const targetHours = TARGET_HOURS_BY_LEVEL[input.currentLevel] ?? 550
  const recommendedTotalMinutes = targetHours * 60
  const recommendedDailyMinutes = roundToNearestFive(
    (recommendedTotalMinutes / remainingDays) * SAFETY_FACTOR
  )

  return {
    remainingDays,
    recommendedTotalMinutes,
    recommendedDailyMinutes,
  }
}