/**
 * Daily Language Lock — Prevents language switching during active study
 *
 * Uses localStorage to enforce single-language study sessions.
 * Lock is set when study begins and released when the daily target is met.
 *
 * Rules:
 * - Once locked, active language cannot be changed
 * - Lock auto-expires at midnight local time
 * - After target problems completed, lock releases
 * - No DB schema change needed
 */

const STORAGE_KEY = 'nativeflow:daily-language-lock'
const DEFAULT_DAILY_TARGET = 10

// ── Types ──

export type DailyLanguageLock = {
  languageCode: string
  lockedAt: number
  completedProblems: number
  targetProblems: number
  released: boolean
}

// ── Read ──

export function readDailyLanguageLock(): DailyLanguageLock | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: DailyLanguageLock = JSON.parse(raw)

    // Check if lock is from today
    const lockDate = new Date(parsed.lockedAt)
    const today = new Date()
    if (
      lockDate.getFullYear() !== today.getFullYear() ||
      lockDate.getMonth() !== today.getMonth() ||
      lockDate.getDate() !== today.getDate()
    ) {
      // Lock is from a previous day — expired
      window.localStorage.removeItem(STORAGE_KEY)
      return null
    }

    return parsed
  } catch {
    return null
  }
}

// ── Write ──

export function setDailyLanguageLock(languageCode: string, targetProblems = DEFAULT_DAILY_TARGET): void {
  if (typeof window === 'undefined') return
  try {
    const lock: DailyLanguageLock = {
      languageCode,
      lockedAt: Date.now(),
      completedProblems: 0,
      targetProblems,
      released: false,
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lock))
  } catch {
    // Non-blocking
  }
}

export function incrementDailyLockProgress(): DailyLanguageLock | null {
  if (typeof window === 'undefined') return null
  try {
    const lock = readDailyLanguageLock()
    if (!lock || lock.released) return lock

    lock.completedProblems += 1
    if (lock.completedProblems >= lock.targetProblems) {
      lock.released = true
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lock))
    return lock
  } catch {
    return null
  }
}

export function clearDailyLanguageLock(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(STORAGE_KEY)
}

// ── Queries ──

export function isDailyLanguageLocked(): boolean {
  const lock = readDailyLanguageLock()
  return lock !== null && !lock.released
}

export function getDailyLockedLanguage(): string | null {
  const lock = readDailyLanguageLock()
  if (!lock) return null
  return lock.languageCode
}

export function canSwitchLanguage(): boolean {
  const lock = readDailyLanguageLock()
  if (!lock) return true
  return lock.released
}
