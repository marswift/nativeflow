/**
 * Minimal streak tracker — localStorage-based.
 * Updates only on conversation_complete.
 */

const STORAGE_KEY = 'nf_streak'

type StreakData = {
  currentStreak: number
  lastActiveDate: string // YYYY-MM-DD
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function load(): StreakData {
  if (typeof window === 'undefined') return { currentStreak: 0, lastActiveDate: '' }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as StreakData
  } catch { /* ignore */ }
  return { currentStreak: 0, lastActiveDate: '' }
}

function save(data: StreakData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch { /* ignore */ }
}

/** Returns the updated streak count. */
export function updateStreak(): number {
  const data = load()
  const now = today()

  // Same day — no change
  if (data.lastActiveDate === now) return data.currentStreak

  // Check if yesterday
  const last = data.lastActiveDate ? new Date(data.lastActiveDate + 'T00:00:00') : null
  const todayDate = new Date(now + 'T00:00:00')
  const diffMs = last ? todayDate.getTime() - last.getTime() : Infinity
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  const newStreak = diffDays === 1 ? data.currentStreak + 1 : 1
  save({ currentStreak: newStreak, lastActiveDate: now })
  return newStreak
}

export function getStreak(): number {
  return load().currentStreak
}

export function getStreakMessage(streak: number): string | null {
  if (streak === 1) return 'Great start!'
  if (streak === 3) return "You're building a habit."
  if (streak === 7) return 'One week strong!'
  if (streak === 14) return 'Two weeks! Amazing.'
  if (streak === 30) return 'One month! Incredible.'
  if (streak > 0 && streak % 10 === 0) return `${streak} days! Keep going!`
  return null
}
