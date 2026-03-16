/**
 * Deterministic spaced repetition algorithm for NativeFlow review scheduling.
 * Pure logic only. No React, Supabase, or OpenAI.
 */

export type SRSRating = 'again' | 'hard' | 'good' | 'easy'

export type SRSState = {
  interval: number
  repetition: number
  easeFactor: number
}

const AGAIN_EASE_DELTA = 0.2
const HARD_INTERVAL_MULTIPLIER = 1.2
const HARD_EASE_DELTA = 0.15
const EASY_INTERVAL_MULTIPLIER = 1.3
const EASY_EASE_DELTA = 0.1

const EASE_FACTOR_MIN = 1.3
const INTERVAL_MIN = 1

function getNextRepetition(
  currentRepetition: number,
  rating: SRSRating
): number {
  return rating === 'again' ? 0 : currentRepetition + 1
}

function clampEaseFactor(value: number): number {
  return Math.max(EASE_FACTOR_MIN, value)
}

function clampInterval(value: number): number {
  return Math.max(INTERVAL_MIN, Math.round(value))
}

/**
 * Returns the next SRS state after applying the given rating.
 */
export function updateSRS(state: SRSState, rating: SRSRating): SRSState {
  const nextRepetition = getNextRepetition(state.repetition, rating)

  switch (rating) {
    case 'again': {
      return {
        interval: INTERVAL_MIN,
        repetition: nextRepetition,
        easeFactor: clampEaseFactor(state.easeFactor - AGAIN_EASE_DELTA),
      }
    }
    case 'hard': {
      return {
        interval: clampInterval(state.interval * HARD_INTERVAL_MULTIPLIER),
        repetition: nextRepetition,
        easeFactor: clampEaseFactor(state.easeFactor - HARD_EASE_DELTA),
      }
    }
    case 'good': {
      return {
        interval: clampInterval(state.interval * state.easeFactor),
        repetition: nextRepetition,
        easeFactor: state.easeFactor,
      }
    }
    case 'easy': {
      return {
        interval: clampInterval(state.interval * state.easeFactor * EASY_INTERVAL_MULTIPLIER),
        repetition: nextRepetition,
        easeFactor: clampEaseFactor(state.easeFactor + EASY_EASE_DELTA),
      }
    }
  }
}
