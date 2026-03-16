/**
 * Deterministic spaced repetition scheduler for phrase reviews.
 * Pure logic only; no I/O or external dependencies.
 */

export type ReviewRating = 'again' | 'hard' | 'good'

export type PhraseProgress = {
  phraseId: string
  reviewCount: number
  lapses: number
  streak: number
  lastReviewedAt: string | null
  nextReviewAt: string | null
}

const BASE_INTERVAL_DAYS: number[] = [0, 1, 3, 7, 30]

/** Returns base interval in days for the given review count (1-based). Counts beyond the table use 1.5x extension. */
export function getBaseIntervalDays(reviewCount: number): number {
  const n = Math.max(0, reviewCount)
  if (n <= 0) return 0
  if (n <= BASE_INTERVAL_DAYS.length) {
    return BASE_INTERVAL_DAYS[n - 1]
  }
  let interval = BASE_INTERVAL_DAYS[BASE_INTERVAL_DAYS.length - 1]
  for (let i = BASE_INTERVAL_DAYS.length; i < n; i++) {
    interval = Math.round(interval * 1.5)
  }
  return interval
}

/** Computes the next interval in days for the given progress and rating (does not mutate state). */
export function calculateNextIntervalDays(
  progress: PhraseProgress,
  rating: ReviewRating
): number {
  if (rating === 'again') return 0
  const nextCount = Math.max(0, progress.reviewCount) + 1
  const base = getBaseIntervalDays(nextCount)
  if (rating === 'hard') {
    return Math.max(1, Math.round(base * 0.6))
  }
  return base
}

/** Returns ISO date string for the next review by adding intervalDays to nowIso (date-only or full ISO). */
export function calculateNextReviewAt(
  nowIso: string,
  intervalDays: number
): string {
  const date = new Date(nowIso)
  date.setUTCDate(date.getUTCDate() + intervalDays)
  return date.toISOString()
}

/** True if nextReviewAt is null or nowIso is at or past nextReviewAt. */
export function isPhraseDue(
  progress: PhraseProgress,
  nowIso: string
): boolean {
  if (progress.nextReviewAt === null) return true
  return new Date(nowIso).getTime() >= new Date(progress.nextReviewAt).getTime()
}

/** Returns new progress after applying the rating at nowIso. Immutable. */
export function applyReviewResult(
  progress: PhraseProgress,
  rating: ReviewRating,
  nowIso: string
): PhraseProgress {
  const reviewCount = Math.max(0, progress.reviewCount)
  if (rating === 'again') {
    return {
      ...progress,
      lapses: progress.lapses + 1,
      streak: 0,
      lastReviewedAt: nowIso,
      nextReviewAt: nowIso,
    }
  }
  const intervalDays = calculateNextIntervalDays(progress, rating)
  const nextReviewAt = calculateNextReviewAt(nowIso, intervalDays)
  if (rating === 'hard') {
    return {
      ...progress,
      reviewCount: reviewCount + 1,
      lastReviewedAt: nowIso,
      nextReviewAt,
    }
  }
  return {
    ...progress,
    reviewCount: reviewCount + 1,
    streak: progress.streak + 1,
    lastReviewedAt: nowIso,
    nextReviewAt,
  }
}
