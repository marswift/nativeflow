/**
 * Difficulty Adjustment — Local adaptive difficulty storage with time decay
 *
 * Uses localStorage to persist a difficulty adjustment value
 * that modifies the corpus selection targetDifficulty.
 *
 * - Updated on lesson completion (via difficulty outcome)
 * - Read during corpus selection (with time-based decay)
 * - Fully fail-safe — falls back to 0 on any error
 * - No schema change, no DB writes
 *
 * Decay: stored values weaken by 10% per day since last update.
 * This ensures recent performance matters more than stale data.
 */

const STORAGE_KEY = 'nativeflow:difficulty-adjustment'
const MIN_ADJUSTMENT = -20
const MAX_ADJUSTMENT = 20
const SMOOTHING_WEIGHT = 0.5
const DAILY_DECAY_FACTOR = 0.9
const ONE_DAY_MS = 86_400_000

// ── Types ──

type StoredAdjustment = {
  value: number
  updatedAt: number
}

// ── Internal: raw read without decay ──

function readRaw(): StoredAdjustment | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: StoredAdjustment = JSON.parse(raw)
    if (typeof parsed.value !== 'number' || !Number.isFinite(parsed.value)) return null
    if (typeof parsed.updatedAt !== 'number' || !Number.isFinite(parsed.updatedAt)) return null
    return parsed
  } catch {
    return null
  }
}

function computeDecay(value: number, updatedAt: number): { decayed: number; elapsedDays: number } {
  const elapsed = Date.now() - updatedAt
  const elapsedDays = Math.max(0, Math.floor(elapsed / ONE_DAY_MS))

  if (elapsedDays <= 0) return { decayed: value, elapsedDays: 0 }

  const decayed = value * Math.pow(DAILY_DECAY_FACTOR, elapsedDays)

  // Round to 1 decimal; snap to 0 if tiny
  const rounded = Math.round(decayed * 10) / 10
  return { decayed: Math.abs(rounded) < 0.5 ? 0 : rounded, elapsedDays }
}

// ── Read (with decay) ──

/**
 * Read the current difficulty adjustment from localStorage.
 * Applies time-based decay: 10% reduction per elapsed day since last update.
 * Returns 0 if unavailable or invalid.
 */
export function readDifficultyAdjustment(): number {
  const stored = readRaw()
  if (!stored) return 0

  const { decayed } = computeDecay(stored.value, stored.updatedAt)
  return Math.max(MIN_ADJUSTMENT, Math.min(MAX_ADJUSTMENT, decayed))
}

/** Read with elapsed days info (for logging). */
function readWithDecayInfo(): { value: number; elapsedDays: number } {
  const stored = readRaw()
  if (!stored) return { value: 0, elapsedDays: 0 }

  const { decayed, elapsedDays } = computeDecay(stored.value, stored.updatedAt)
  return {
    value: Math.max(MIN_ADJUSTMENT, Math.min(MAX_ADJUSTMENT, decayed)),
    elapsedDays,
  }
}

// ── Write ──

/**
 * Update the difficulty adjustment based on a new outcome delta.
 * Reads the decayed current value, adds smoothed delta, saves with fresh timestamp.
 *
 * newValue = decayedCurrent + (delta * SMOOTHING_WEIGHT)
 * Clamped to [-20, +20]
 */
export function updateDifficultyAdjustment(outcomeDelta: number): void {
  if (typeof window === 'undefined') return
  try {
    const { value: decayedPrev, elapsedDays } = readWithDecayInfo()
    const smoothed = outcomeDelta * SMOOTHING_WEIGHT
    const next = Math.max(MIN_ADJUSTMENT, Math.min(MAX_ADJUSTMENT, decayedPrev + smoothed))
    const rounded = Math.round(next * 10) / 10

    const stored: StoredAdjustment = {
      value: rounded,
      updatedAt: Date.now(),
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))

    // eslint-disable-next-line no-console
    console.log('[difficulty-adjustment-update]', {
      prev: readRaw()?.value ?? 0,
      decayedPrev,
      delta: outcomeDelta,
      smoothed,
      next: rounded,
      elapsedDays,
    })
  } catch {
    // Non-blocking
  }
}

// ── Apply ──

/**
 * Compute adjusted target difficulty from base + decayed stored adjustment.
 * Clamped to [0, 100].
 */
export function applyDifficultyAdjustment(baseDifficulty: number): number {
  const { value: adjustment, elapsedDays } = readWithDecayInfo()
  const adjusted = Math.max(0, Math.min(100, baseDifficulty + adjustment))

  if (adjustment !== 0) {
    // eslint-disable-next-line no-console
    console.log('[difficulty-applied]', {
      base: baseDifficulty,
      adjustment,
      final: adjusted,
      elapsedDays,
    })
  }

  return adjusted
}
