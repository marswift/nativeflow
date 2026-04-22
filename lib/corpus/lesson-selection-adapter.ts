/**
 * Corpus → Lesson Selection Adapter
 *
 * Bridge between corpus selection logic and lesson session preparation.
 * Read-only: fetches corpus candidates, runs selection, returns metadata.
 *
 * Does NOT modify lesson data or UI. Purely additive.
 * If anything fails, returns null — lesson continues unaffected.
 */

import { createClient } from '@supabase/supabase-js'
import {
  selectSessionSequence,
  type ConversationCandidate,
  type SelectionResult,
} from './selection-algorithm'
import { applyDifficultyAdjustment } from './difficulty-adjustment'
import { readPersonalization } from '../personalization/personalization-storage'

// ── Types ──

export type CorpusSelectionSequenceItem = {
  id: string
  difficulty: number
}

export type CorpusSelectionSummary = {
  count: number
  minDifficulty: number | null
  maxDifficulty: number | null
  avgDifficulty: number | null
}

export type CorpusSelectionMetadata = {
  /** Flat ordered sequence: conversation ID + difficulty only */
  sequence: CorpusSelectionSequenceItem[]
  /** Target difficulty used */
  targetDifficulty: number
  /** User level that determined the target */
  userLevel: string
  /** Number of corpus candidates available */
  candidateCount: number
  /** Timestamp of selection */
  selectedAt: string
  /** Pre-computed summary of selected sequence */
  summary: CorpusSelectionSummary
  /** Full selection result (debug only — not for UI consumption) */
  _debug_fullSelection?: SelectionResult
}

// ── Level → difficulty mapping ──

const LEVEL_TARGET_MAP: Record<string, number> = {
  beginner: 30,
  intermediate: 50,
  advanced: 70,
}

const DEFAULT_TOLERANCE = 12
const DEFAULT_SESSION_SIZE = 5

// ── Main adapter ──

/**
 * Fetch corpus candidates and run selection for a lesson session.
 *
 * @param userLevel - User's current_level ('beginner' | 'intermediate' | 'advanced')
 * @param recentConversationIds - Recently seen corpus conversation IDs (for recency avoidance)
 * @param sessionSize - Number of conversations to select (default 5)
 * @returns CorpusSelectionMetadata or null if unavailable
 */
export async function selectCorpusForLesson(
  userLevel: string,
  recentConversationIds: string[] = [],
  sessionSize = DEFAULT_SESSION_SIZE,
): Promise<CorpusSelectionMetadata | null> {
  try {
    const supabase = getSupabaseReadonly()

    // Fetch scored, commercially safe conversations
    const { data: rows, error } = await supabase
      .from('corpus_conversations')
      .select('id, topic, scene, difficulty_score')
      .eq('is_commercially_safe', true)
      .not('difficulty_score', 'is', null)
      .order('difficulty_score')

    if (error || !rows?.length) return null

    const candidates: ConversationCandidate[] = rows.map((r: {
      id: string; topic: string; scene: string; difficulty_score: number
    }) => ({
      id: r.id,
      topic: r.topic,
      scene: r.scene,
      difficultyScore: r.difficulty_score,
    }))

    const baseDifficulty = LEVEL_TARGET_MAP[userLevel] ?? LEVEL_TARGET_MAP.intermediate
    const targetDifficulty = applyDifficultyAdjustment(baseDifficulty)

    // Personalization bias: scene preference + weakness-aware nudge
    // Max total bias per candidate ≤ 5 points
    const personalization = readPersonalization()
    const preferredScene = personalization?.dominantScene ?? null
    const ss = personalization?.skillScores ?? null

    // Weakness scores: 0 = strong, 1 = weak
    const weakListening = ss ? Math.max(0, Math.min(1, 1 - ss.listening)) : 0
    const weakTyping = ss ? Math.max(0, Math.min(1, 1 - ss.typing)) : 0
    const weaknessBias = (weakListening > 0.5 ? 2 : 0) + (weakTyping > 0.5 ? 2 : 0)

    let sceneBiasCount = 0
    let _weaknessBiasCount = 0

    const biasedCandidates = candidates.map((c) => {
      let totalBias = 0

      // Scene preference bias (max 3)
      if (preferredScene && (c.topic === preferredScene || c.scene === preferredScene)) {
        totalBias += 3
        sceneBiasCount++
      }

      // Weakness bias (max 4, but total capped at 5)
      if (weaknessBias > 0) {
        totalBias += weaknessBias
        _weaknessBiasCount++
      }

      // Cap total bias at 5
      totalBias = Math.min(5, totalBias)

      if (totalBias === 0) return c

      // Nudge toward target difficulty
      const direction = c.difficultyScore > targetDifficulty ? -1 : 1
      return { ...c, difficultyScore: c.difficultyScore + direction * totalBias }
    })

    if (sceneBiasCount > 0 || weaknessBias > 0) {
      console.log('[personalization-applied]', {
        dominantScene: preferredScene,
        sceneBiased: sceneBiasCount,
        weakListening: Math.round(weakListening * 100) / 100,
        weakTyping: Math.round(weakTyping * 100) / 100,
        weaknessBias,
      })
    }

    const selection = selectSessionSequence(biasedCandidates, {
      targetDifficulty,
      tolerance: DEFAULT_TOLERANCE,
      recentIds: recentConversationIds,
      sessionSize,
    })

    if (selection.sequence.length === 0) return null

    // Flatten sequence for clean metadata
    const sequence: CorpusSelectionSequenceItem[] = selection.sequence.map((s) => ({
      id: s.id,
      difficulty: s.difficultyScore,
    }))

    // Compute summary
    const difficulties = sequence.map((s) => s.difficulty)
    const summary: CorpusSelectionSummary = {
      count: difficulties.length,
      minDifficulty: difficulties.length > 0 ? Math.min(...difficulties) : null,
      maxDifficulty: difficulties.length > 0 ? Math.max(...difficulties) : null,
      avgDifficulty: difficulties.length > 0
        ? Math.round(difficulties.reduce((a, b) => a + b, 0) / difficulties.length)
        : null,
    }

    return {
      sequence,
      targetDifficulty,
      userLevel,
      candidateCount: candidates.length,
      selectedAt: new Date().toISOString(),
      summary,
      _debug_fullSelection: selection,
    }
  } catch {
    // Corpus selection failure must never break lesson flow
    return null
  }
}

// ── Supabase helper (read-only, no service role needed) ──

function getSupabaseReadonly() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error('Missing Supabase credentials for corpus selection')
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
