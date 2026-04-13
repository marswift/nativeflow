/**
 * Corpus Selection & Sequencing Algorithm (v1)
 *
 * Selects and orders corpus conversations for a learning session
 * based on difficulty progression, recency avoidance, and topic diversity.
 *
 * Pure logic — no DB access. Operates on pre-fetched candidate arrays.
 * No lesson UI integration.
 */

// ── Types ──

export type ConversationCandidate = {
  id: string
  topic: string
  scene: string
  difficultyScore: number
}

export type SelectionParams = {
  /** Target difficulty center (0–100) */
  targetDifficulty: number
  /** Tolerance range: candidates within ±tolerance are considered */
  tolerance: number
  /** IDs of recently shown conversations to avoid */
  recentIds: string[]
  /** Number of conversations to select for the session */
  sessionSize: number
}

export type SelectedConversation = {
  id: string
  topic: string
  scene: string
  difficultyScore: number
  /** Target difficulty for this slot in the sequence */
  slotTarget: number
  /** Why this was chosen (debug) */
  reason: string
}

export type SelectionResult = {
  sequence: SelectedConversation[]
  params: SelectionParams
}

// ── Progression curve ──

/**
 * Build a difficulty curve for a session.
 * Starts slightly below target, ramps up, ends at or slightly above.
 *
 * Example for target=50, size=5:
 *   [42, 46, 50, 53, 48]  (warmup → climb → peak → cool-down)
 */
export function buildProgressionCurve(
  target: number,
  sessionSize: number,
): number[] {
  if (sessionSize <= 0) return []
  if (sessionSize === 1) return [target]
  if (sessionSize === 2) return [target - 5, target]

  const curve: number[] = []
  const warmupOffset = Math.min(10, Math.round(target * 0.15))
  const peakOffset = Math.min(5, Math.round(target * 0.06))

  for (let i = 0; i < sessionSize; i++) {
    const t = i / (sessionSize - 1) // 0 → 1

    let slotTarget: number
    if (t <= 0.6) {
      // Warmup → climb phase (0% to 60% of session)
      const ramp = t / 0.6 // 0 → 1 within this phase
      slotTarget = target - warmupOffset + (warmupOffset + peakOffset) * ramp
    } else {
      // Cool-down phase (60% to 100%)
      const cooldown = (t - 0.6) / 0.4 // 0 → 1 within this phase
      slotTarget = target + peakOffset - (peakOffset + 2) * cooldown
    }

    curve.push(Math.round(Math.max(0, Math.min(100, slotTarget))))
  }

  return curve
}

// ── Selection ──

/**
 * Select and sequence conversations for a learning session.
 *
 * Algorithm:
 * 1. Build progression curve (slot targets)
 * 2. For each slot, find best candidate:
 *    a. Filter: within tolerance of slot target
 *    b. Exclude: recently seen + already selected
 *    c. Prefer: topic not yet used in session (diversity)
 *    d. Prefer: closest to slot target (accuracy)
 * 3. If no candidate in range, expand tolerance gradually
 * 4. Return ordered sequence
 */
export function selectSessionSequence(
  candidates: ConversationCandidate[],
  params: SelectionParams,
): SelectionResult {
  const { targetDifficulty, tolerance, recentIds, sessionSize } = params
  const curve = buildProgressionCurve(targetDifficulty, sessionSize)

  const recentSet = new Set(recentIds)
  const selectedIds = new Set<string>()
  const usedTopics = new Set<string>()
  const sequence: SelectedConversation[] = []

  for (let slot = 0; slot < curve.length; slot++) {
    const slotTarget = curve[slot]
    const picked = pickBestCandidate(
      candidates,
      slotTarget,
      tolerance,
      recentSet,
      selectedIds,
      usedTopics,
    )

    if (picked) {
      sequence.push({
        ...picked.candidate,
        slotTarget,
        reason: picked.reason,
      })
      selectedIds.add(picked.candidate.id)
      usedTopics.add(picked.candidate.topic)
    }
  }

  return { sequence, params }
}

// ── Candidate picker ──

const MAX_EXPAND = 25
const EXPAND_STEP = 5

function pickBestCandidate(
  candidates: ConversationCandidate[],
  slotTarget: number,
  baseTolerance: number,
  recentSet: Set<string>,
  selectedIds: Set<string>,
  usedTopics: Set<string>,
): { candidate: ConversationCandidate; reason: string } | null {

  // Try with increasing tolerance
  for (let expand = 0; expand <= MAX_EXPAND; expand += EXPAND_STEP) {
    const tol = baseTolerance + expand
    const inRange = candidates.filter((c) => {
      if (recentSet.has(c.id)) return false
      if (selectedIds.has(c.id)) return false
      return Math.abs(c.difficultyScore - slotTarget) <= tol
    })

    if (inRange.length === 0) continue

    // Score each candidate: lower = better
    const scored = inRange.map((c) => {
      const distancePenalty = Math.abs(c.difficultyScore - slotTarget)
      const topicPenalty = usedTopics.has(c.topic) ? 10 : 0
      return { candidate: c, total: distancePenalty + topicPenalty }
    })

    scored.sort((a, b) => a.total - b.total)
    const best = scored[0]

    const reason = expand === 0
      ? `in range (±${baseTolerance}), dist=${Math.abs(best.candidate.difficultyScore - slotTarget)}`
      : `expanded range (±${tol}), dist=${Math.abs(best.candidate.difficultyScore - slotTarget)}`

    return { candidate: best.candidate, reason }
  }

  return null
}
