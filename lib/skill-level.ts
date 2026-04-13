/**
 * Skill Level — shared logic for overall level and guidance
 *
 * Used by both dashboard (full visualization) and Lesson Top (single-line insight).
 * Pure functions. No DB access, no side effects.
 */

export type SkillScores = {
  listening: number
  typing: number
  conversation: number
}

export type OverallLevel = {
  label: string
  labelJa: string
  color: string
}

/**
 * Derive overall level from 3 skill scores (0–1 each).
 * Uses min and median to prevent a single strong axis from inflating the level.
 */
export function getOverallLevel(scores: SkillScores): OverallLevel {
  const vals = [scores.listening, scores.typing, scores.conversation]
  const sorted = [...vals].sort((a, b) => a - b)
  const min = sorted[0]
  const median = sorted[1]

  if (min >= 0.75) return { label: 'Upper Intermediate', labelJa: '中上級', color: 'text-green-700' }
  if (min >= 0.6 && median >= 0.7) return { label: 'Intermediate', labelJa: '中級', color: 'text-blue-700' }
  if (median >= 0.5) return { label: 'Early Intermediate', labelJa: '初中級', color: 'text-blue-600' }
  return { label: 'Beginner', labelJa: '初級', color: 'text-amber-700' }
}

/**
 * Generate a short guidance sentence based on skill imbalance.
 */
export function getSkillGuidance(scores: SkillScores): string {
  const { listening, typing, conversation } = scores
  const min = Math.min(listening, typing, conversation)
  const max = Math.max(listening, typing, conversation)
  const gap = max - min

  if (min >= 0.7 && gap < 0.15) return 'バランスよく伸びています。少し難しいコンテンツに挑戦してみましょう。'
  if (min === listening && gap >= 0.15) return 'リスニングをもう少し強化すると、全体のレベルが上がりそうです。'
  if (min === typing && gap >= 0.15) return 'タイピング練習を増やすと、定着度がさらに上がります。'
  if (min === conversation && gap >= 0.15) return 'AI会話にもう少しチャレンジすると、会話力が伸びそうです。'
  return '最近のレッスンをもとに推定しています。'
}

/**
 * Generate a single-line insight combining level and guidance.
 */
export function getSkillInsightText(scores: SkillScores): string {
  const level = getOverallLevel(scores)
  const { listening, typing, conversation } = scores
  const min = Math.min(listening, typing, conversation)
  const max = Math.max(listening, typing, conversation)
  const gap = max - min

  if (gap >= 0.15 && min === listening) {
    return `${level.labelJa}レベル — 今日はリスニングを強化すると効果的です`
  }
  if (gap >= 0.15 && min === typing) {
    return `${level.labelJa}レベル — 今日はタイピングを意識すると伸びやすいです`
  }
  return `あなたは現在 ${level.labelJa}レベルです`
}
