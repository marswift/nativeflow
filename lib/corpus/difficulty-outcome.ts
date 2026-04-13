/**
 * Difficulty Outcome — Post-lesson difficulty signal computation
 *
 * Pure function. Computes a suggested difficulty adjustment from
 * lesson_run_items data. No side effects, no DB writes, no UI.
 *
 * Used by runLessonCompletionEffect for logging only (Phase 4.1).
 */

// ── Types ──

export type DifficultyOutcome = {
  repeatResult: 'good' | 'ok' | 'retry' | 'skipped' | null
  avgReplayCount: number
  typingAccuracy: number // 0–1
  suggestedDifficultyDelta: number // -10 to +10
}

/** Minimal row shape needed from lesson_run_items */
export type RunItemRow = {
  block_title: string
  is_correct: boolean | null
  user_input_text: string | null
}

// ── Extraction helpers ──

function parseMetrics(userInputText: string | null): { replayCount?: number } | null {
  if (!userInputText) return null
  try {
    const parsed = JSON.parse(userInputText)
    if (parsed && typeof parsed === 'object' && parsed.metrics) {
      return parsed.metrics
    }
  } catch {
    // Not JSON — plain text input
  }
  return null
}

// ── Main ──

/**
 * Compute a difficulty outcome from lesson run items.
 * Deterministic, pure, no side effects.
 */
export function computeDifficultyOutcome(items: RunItemRow[]): DifficultyOutcome {
  // Extract repeat signal
  const repeatItems = items.filter((i) => i.block_title === 'repeat')
  let repeatResult: DifficultyOutcome['repeatResult'] = null
  let totalReplayCount = 0
  let replayCountSamples = 0

  for (const ri of repeatItems) {
    // Map is_correct to result — accumulate worst result
    if (ri.is_correct === false) {
      repeatResult = 'retry'
    } else if (ri.is_correct === true && repeatResult !== 'retry') {
      repeatResult = 'good'
    }

    // Parse replay count from metrics
    const metrics = parseMetrics(ri.user_input_text)
    if (metrics && typeof metrics.replayCount === 'number') {
      totalReplayCount += metrics.replayCount
      replayCountSamples++
    }
  }

  // If no repeat items, check for listen stage (may be combined)
  if (repeatItems.length === 0) {
    const listenItems = items.filter((i) => i.block_title === 'listen')
    for (const li of listenItems) {
      const metrics = parseMetrics(li.user_input_text)
      if (metrics && typeof metrics.replayCount === 'number') {
        totalReplayCount += metrics.replayCount
        replayCountSamples++
      }
    }
  }

  const avgReplayCount = replayCountSamples > 0
    ? Math.round((totalReplayCount / replayCountSamples) * 10) / 10
    : 0

  // Extract typing accuracy
  const typingItems = items.filter((i) => i.block_title === 'typing')
  const typingTotal = typingItems.length
  const typingCorrect = typingItems.filter((i) => i.is_correct === true).length
  const typingAccuracy = typingTotal > 0 ? Math.round((typingCorrect / typingTotal) * 100) / 100 : 0

  // Compute delta
  let delta = 0

  // Repeat (primary signal)
  if (repeatResult === 'good') delta += 5
  else if (repeatResult === 'retry') delta -= 5

  // Replay count (effort signal)
  if (avgReplayCount === 0 && repeatItems.length > 0) delta += 3
  else if (avgReplayCount >= 3) delta -= 3

  // Typing accuracy (secondary signal)
  if (typingAccuracy > 0.8) delta += 2
  else if (typingAccuracy < 0.4 && typingTotal > 0) delta -= 2

  // Clamp
  const suggestedDifficultyDelta = Math.max(-10, Math.min(10, delta))

  return {
    repeatResult,
    avgReplayCount,
    typingAccuracy,
    suggestedDifficultyDelta,
  }
}
