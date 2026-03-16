/**
 * Study plan calculation service (MVP).
 * Pure logic: computes recommended total/daily study minutes from deadline and level.
 * No React, UI, or Supabase.
 */
import type { CurrentLevel } from './constants'

const HOURS_PER_LEVEL: Record<CurrentLevel, number> = {
  beginner: 600,
  intermediate: 350,
  advanced: 120,
}

const DEFAULT_REMAINING_DAYS = 180
const MIN_REMAINING_DAYS = 1
const HOURS_TO_MINUTES = 60
const DAYS_PER_MONTH = 30
const DAYS_PER_YEAR = 365

export type StudyPlanInput = {
  deadlineText: string
  currentLevel: CurrentLevel
}

export type StudyPlanResult = {
  remainingDays: number
  recommendedTotalMinutes: number
  recommendedDailyMinutes: number
}

/**
 * Parses deadline text to remaining days.
 * Supports: "3ヶ月", "6ヶ月", "1年", "1年6ヶ月", "2年6ヶ月", etc.
 * 1 month = 30 days, 1 year = 365 days.
 */
function parseDeadlineToDays(text: string): number | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  const yearMonthMatch = trimmed.match(/^(\d+)\s*年\s*(\d+)\s*ヶ?月/)
  if (yearMonthMatch)
    return Number(yearMonthMatch[1]) * DAYS_PER_YEAR + Number(yearMonthMatch[2]) * DAYS_PER_MONTH

  const monthsMatch = trimmed.match(/^(\d+)\s*ヶ?月/)
  if (monthsMatch) return Number(monthsMatch[1]) * DAYS_PER_MONTH

  const enMonthsMatch = trimmed.match(/^(\d+)\s*months?$/i)
  if (enMonthsMatch) return Number(enMonthsMatch[1]) * DAYS_PER_MONTH

  const yearMatch = trimmed.match(/^(\d+)\s*years?$/i)
  if (yearMatch) return Number(yearMatch[1]) * DAYS_PER_YEAR

  const jpYearMatch = trimmed.match(/^(\d+)\s*年/)
  if (jpYearMatch) return Number(jpYearMatch[1]) * DAYS_PER_YEAR

  return null
}

/**
 * Returns total study hours for the given level.
 */
function getTotalHoursForLevel(level: CurrentLevel): number {
  return HOURS_PER_LEVEL[level]
}

/**
 * Computes the recommended study plan from deadline text and current level.
 */
export function computeStudyPlan(input: StudyPlanInput): StudyPlanResult {
  const remainingDaysRaw = parseDeadlineToDays(input.deadlineText)
  let remainingDays =
    remainingDaysRaw != null && remainingDaysRaw > 0
      ? Math.floor(remainingDaysRaw)
      : DEFAULT_REMAINING_DAYS
  if (remainingDays < MIN_REMAINING_DAYS) remainingDays = MIN_REMAINING_DAYS

  const totalHours = getTotalHoursForLevel(input.currentLevel)
  const recommendedTotalMinutes = totalHours * HOURS_TO_MINUTES
  const recommendedDailyMinutes = Math.round(
    recommendedTotalMinutes / remainingDays
  )

  return {
    remainingDays,
    recommendedTotalMinutes,
    recommendedDailyMinutes,
  }
}
