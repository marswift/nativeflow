/**
 * Personalization Storage — Local persistence for scene preference bias
 *
 * Uses localStorage to persist a minimal personalization snapshot
 * for corpus selection scene preference.
 *
 * Fully fail-safe — falls back to null on any error.
 * No schema change, no DB writes.
 */

const STORAGE_KEY = 'nativeflow:personalization-summary'

// ── Types ──

export type StoredPersonalization = {
  dominantScene: string | null
  difficultyTrend: number
  skillScores?: { listening: number; typing: number } | null
  updatedAt: number
}

// ── Read ──

export function readPersonalization(): StoredPersonalization | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const ss = parsed.skillScores
    const skillScores = ss && typeof ss === 'object' && typeof ss.listening === 'number' && typeof ss.typing === 'number'
      ? { listening: ss.listening, typing: ss.typing }
      : null

    return {
      dominantScene: typeof parsed.dominantScene === 'string' ? parsed.dominantScene : null,
      difficultyTrend: typeof parsed.difficultyTrend === 'number' ? parsed.difficultyTrend : 0,
      skillScores,
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0,
    }
  } catch {
    return null
  }
}

// ── Write ──

export function writePersonalization(data: {
  dominantScene: string | null
  difficultyTrend: number
  skillScores?: { listening: number; typing: number } | null
}): void {
  if (typeof window === 'undefined') return
  try {
    const stored: StoredPersonalization = {
      dominantScene: data.dominantScene,
      difficultyTrend: data.difficultyTrend,
      skillScores: data.skillScores ?? null,
      updatedAt: Date.now(),
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))

    // eslint-disable-next-line no-console
    console.log('[personalization-update]', {
      dominantScene: stored.dominantScene,
      updatedAt: stored.updatedAt,
    })
  } catch {
    // Non-blocking
  }
}
