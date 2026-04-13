/**
 * MVP Skill Estimation — v2
 *
 * Derives 4 skill scores (0–100) from two data sources:
 *   1. lesson_run_items  (block_title, is_correct, user_input_text with JSON metrics)
 *   2. pronunciation_scores  (total_score 0–100)
 *
 * Dimensions:
 *   A. 会話到達度 (conversation) — ai_conversation + ai_question results
 *   B. リスニング (listening)    — listen/scaffold completion + replayCount penalty
 *   C. スピーキング (speaking)   — pronunciation_scores.total_score (primary),
 *                                  repeat is_correct as fallback
 *   D. ライティング (writing)    — typing is_correct + non-empty input check
 *
 * MVP only — intentionally simple. Designed to be replaced later.
 * Pure function — no DB calls, no side effects.
 */

// ── Types ───────────────────────────────────────────────────

export type SkillEstimate = {
  conversation: number | null
  listening: number | null
  speaking: number | null
  writing: number | null
}

/** Row shape from lesson_run_items. */
export type LessonItemRow = {
  block_title: string | null
  is_correct: boolean | null
  user_input_text: string | null
}

/** Row shape from pronunciation_scores. */
export type PronunciationRow = {
  total_score: number | null
}

// ── Internal helpers ────────────────────────────────────────

/** Parse JSON-encoded metrics from user_input_text if present. */
function parseMetrics(raw: string | null): {
  replayCount?: number
  durationMs?: number
  didRecord?: boolean
} | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && parsed.metrics) {
      return parsed.metrics
    }
  } catch {
    // Not JSON — plain text
  }
  return null
}

/**
 * MVP score from is_correct boolean.
 *   true  → 80  (good or ok — we can't distinguish)
 *   false → 25  (retry or wrong)
 *   null  → 50  (completed but not evaluated — e.g. old flow)
 */
function booleanScore(isCorrect: boolean | null): number {
  if (isCorrect === true) return 80
  if (isCorrect === false) return 25
  return 50
}

/** Clamp to 0–100 integer. */
function clamp(n: number): number {
  return Math.round(Math.max(0, Math.min(100, n)))
}

/** Average of numbers, or null if empty. */
function avg(values: number[]): number | null {
  if (values.length === 0) return null
  return clamp(values.reduce((a, b) => a + b, 0) / values.length)
}

// ── Per-dimension estimators ────────────────────────────────

/**
 * A. 会話到達度 — conversation reach
 *
 * Sources:
 *   - ai_conversation items: is_correct (true=80, false=25)
 *   - ai_question items:     is_correct (true=80, false=25)
 *
 * Weight: ai_conversation × 0.7,  ai_question × 0.3
 * If only one source exists, use it alone.
 */
function estimateConversation(items: LessonItemRow[]): number | null {
  const convoItems = items.filter((r) => r.block_title === 'ai_conversation')
  const questionItems = items.filter((r) => r.block_title === 'ai_question')

  const convoScores = convoItems.map((r) => booleanScore(r.is_correct))
  const questionScores = questionItems.map((r) => booleanScore(r.is_correct))

  const convoAvg = avg(convoScores)
  const questionAvg = avg(questionScores)

  if (convoAvg !== null && questionAvg !== null) {
    return clamp(convoAvg * 0.7 + questionAvg * 0.3)
  }
  return convoAvg ?? questionAvg
}

/**
 * B. リスニング — listening comprehension
 *
 * Sources:
 *   - listen + scaffold items: base score from is_correct
 *   - replayCount from metrics: penalty (each replay beyond 1 subtracts 5 pts)
 *
 * Listen/scaffold stages always pass (is_correct=true or null), so the
 * real signal comes from replayCount. More replays → lower score.
 *
 * Base: 85 (listen stages are rarely "wrong")
 * Penalty: -5 per excess replay (above 1), floored at 30
 */
function estimateListening(items: LessonItemRow[]): number | null {
  const listenItems = items.filter(
    (r) => r.block_title === 'listen' || r.block_title === 'scaffold'
  )
  if (listenItems.length === 0) return null

  const scores = listenItems.map((row) => {
    const metrics = parseMetrics(row.user_input_text)
    const replays = metrics?.replayCount ?? 0
    // Base 85; penalty for heavy replaying
    const penalty = Math.max(0, replays - 1) * 5
    return Math.max(30, 85 - penalty)
  })

  return avg(scores)
}

/**
 * C. スピーキング — speaking / pronunciation
 *
 * Primary: pronunciation_scores.total_score (0-100, already well-calibrated)
 * Fallback: repeat stage is_correct from lesson_run_items
 *
 * If pronunciation scores exist, use their average directly.
 * Otherwise fall back to is_correct boolean scoring.
 */
function estimateSpeaking(
  items: LessonItemRow[],
  pronunciationRows: PronunciationRow[]
): number | null {
  // Primary: pronunciation score table
  const validScores = pronunciationRows
    .map((r) => r.total_score)
    .filter((s): s is number => typeof s === 'number' && s >= 0)

  if (validScores.length > 0) {
    return avg(validScores)
  }

  // Fallback: repeat stage results
  const repeatItems = items.filter((r) => r.block_title === 'repeat')
  if (repeatItems.length === 0) return null

  return avg(repeatItems.map((r) => booleanScore(r.is_correct)))
}

/**
 * D. ライティング — typing / writing accuracy
 *
 * Sources:
 *   - typing items: is_correct (true=80, false=25)
 *   - bonus: if user_input_text is non-empty (user engaged) → +10
 *
 * Clamped to 0–100.
 */
function estimateWriting(items: LessonItemRow[]): number | null {
  const typingItems = items.filter((r) => r.block_title === 'typing')
  if (typingItems.length === 0) return null

  const scores = typingItems.map((row) => {
    const base = booleanScore(row.is_correct)
    // Small engagement bonus: user typed something
    const hasInput = row.user_input_text && row.user_input_text.trim().length > 0
    return hasInput ? Math.min(100, base + 10) : base
  })

  return avg(scores)
}

// ── Main entry point ────────────────────────────────────────

/**
 * Compute MVP skill estimates from available data.
 * Returns null for any dimension with zero data points.
 */
export function estimateSkills(
  lessonItems: LessonItemRow[],
  pronunciationRows: PronunciationRow[]
): SkillEstimate {
  return {
    conversation: estimateConversation(lessonItems),
    listening: estimateListening(lessonItems),
    speaking: estimateSpeaking(lessonItems, pronunciationRows),
    writing: estimateWriting(lessonItems),
  }
}
