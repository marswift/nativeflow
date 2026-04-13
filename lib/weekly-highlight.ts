/**
 * Weekly Growth Highlight — personalized learning feedback with progression.
 *
 * Pure function. No DB access, no side effects.
 * Always returns a positive message — never negative comparison.
 */

export type WeeklyStats = {
  pronAvg: number | null
  pronPrevAvg: number | null
  typingCorrect: number
  lessonsCompleted: number
  reviewsCorrect: number
}

/** Stored snapshot from previous week for progression tracking */
export type WeeklySnapshot = {
  weekStart: string
  pronAvg: number | null
  typingCorrect: number
  lessonsCompleted: number
  reviewsCorrect: number
}

type Direction = '↑' | '→'

export type WeeklyHighlight = {
  highlight: string
  encouragement: string
  /** Direction indicators for key skills */
  directions: { label: string; direction: Direction }[]
  /** Optional numeric goal for next week */
  nextGoal: string | null
}

function getDirection(current: number | null, previous: number | null): Direction {
  if (current === null || previous === null) return '→'
  return current > previous ? '↑' : '→'
}

export function computeWeeklyHighlight(
  stats: WeeklyStats,
  prevSnapshot: WeeklySnapshot | null,
): WeeklyHighlight {
  const { pronAvg, pronPrevAvg, typingCorrect, lessonsCompleted, reviewsCorrect } = stats

  // Direction indicators
  const directions: { label: string; direction: Direction }[] = []

  if (pronAvg !== null) {
    directions.push({ label: '発音', direction: getDirection(pronAvg, prevSnapshot?.pronAvg ?? pronPrevAvg) })
  }
  if (typingCorrect > 0 || (prevSnapshot?.typingCorrect ?? 0) > 0) {
    directions.push({ label: 'タイピング', direction: getDirection(typingCorrect, prevSnapshot?.typingCorrect ?? null) })
  }
  if (reviewsCorrect > 0 || (prevSnapshot?.reviewsCorrect ?? 0) > 0) {
    directions.push({ label: '復習', direction: getDirection(reviewsCorrect, prevSnapshot?.reviewsCorrect ?? null) })
  }

  // Next-week goal
  let nextGoal: string | null = null

  // Highlight + encouragement (priority-based)
  // Priority 1: Pronunciation improved
  if (pronAvg !== null && pronPrevAvg !== null && pronAvg > pronPrevAvg + 5) {
    nextGoal = typingCorrect < 3
      ? '次はタイピングも少し意識してみましょう'
      : '次も発音を意識して練習してみましょう'
    return {
      highlight: 'リスニング・発音が先週より伸びています',
      encouragement: 'この調子で続けましょう',
      directions,
      nextGoal,
    }
  }

  // Priority 2: Pronunciation strong
  if (pronAvg !== null && pronAvg >= 75) {
    nextGoal = reviewsCorrect < 2
      ? '次は復習も取り入れてみましょう'
      : '次も発音を少し意識してみましょう'
    return {
      highlight: '発音の正確さが安定しています',
      encouragement: 'この調子で続けましょう',
      directions,
      nextGoal,
    }
  }

  // Priority 3: Typing strong
  if (typingCorrect >= 5) {
    nextGoal = pronAvg !== null && pronAvg < 60
      ? '次は発音も少し意識してみましょう'
      : '次もタイピングを丁寧にやってみましょう'
    return {
      highlight: 'タイピングの正確さが上がっています',
      encouragement: 'この調子で続けましょう',
      directions,
      nextGoal,
    }
  }

  // Priority 4: Review progress
  if (reviewsCorrect >= 3) {
    return {
      highlight: '復習でフレーズが定着してきました',
      encouragement: 'この調子で続けましょう',
      directions,
      nextGoal: '次も覚えたフレーズを使ってみましょう',
    }
  }

  // Priority 5: Lesson count
  if (lessonsCompleted >= 3) {
    return {
      highlight: '今週もよく頑張りました',
      encouragement: '続けることが一番の力になります',
      directions,
      nextGoal: '次のレッスンも楽しんでいきましょう',
    }
  }

  // Fallback
  return {
    highlight: '着実に進んでいます',
    encouragement: '少しずつでも続けることが大切です',
    directions,
    nextGoal: '次のレッスンを気軽に始めてみましょう',
  }
}

/** Build a snapshot to store for next week's comparison */
export function buildWeeklySnapshot(stats: WeeklyStats, weekStart: string): WeeklySnapshot {
  return {
    weekStart,
    pronAvg: stats.pronAvg,
    typingCorrect: stats.typingCorrect,
    lessonsCompleted: stats.lessonsCompleted,
    reviewsCorrect: stats.reviewsCorrect,
  }
}
