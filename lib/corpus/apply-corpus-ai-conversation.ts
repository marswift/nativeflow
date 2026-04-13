/**
 * Apply Corpus Content to AI Conversation Block
 *
 * Replaces the AI conversation block's prompt/answer with content
 * from the first corpus-selected conversation, using up to 3 turns
 * for conversational continuity with learner-suitability filtering.
 *
 * - Only touches the ai_conversation block (identified by title 'AI会話')
 * - All other blocks remain unchanged
 * - Falls back to original content on any failure
 * - Read-only DB access (fetches corpus conversation + turns)
 *
 * Does NOT modify lesson runtime, UI, or other block types.
 */

import { createClient } from '@supabase/supabase-js'
import type { LessonPageData } from '../lesson-page-data'
import { isNaturalConversation } from './quality-filter'

const AI_CONVERSATION_BLOCK_TITLE = 'AI会話'
const MIN_LEN = 3
const MAX_LEN = 100

// ── Types ──

type ConvRow = { topic: string; scene: string }
type TurnRow = { speaker: string; text: string; turn_order: number }
type ExtractionMode = 'continuation' | 'two-turn' | 'single-turn'

type Extracted = {
  setupLine: string | null
  learnerLine: string
  partnerReply: string | null
  scene: string
  mode: ExtractionMode
}

// ── Learner suitability filter ──

/** Excessive punctuation noise: "!!!", "???", "....." etc. */
const PUNCT_NOISE = /[!?]{3,}|\.{4,}/

/** Placeholder/debug-like patterns */
const META_LIKE = /\b(TODO|FIXME|placeholder|test|example sentence|undefined)\b/i

/** Repeated word pairs: "go go", "very very very" */
function hasWordStutter(text: string): boolean {
  const words = text.toLowerCase().split(/\s+/)
  for (let i = 0; i < words.length - 1; i++) {
    if (words[i] === words[i + 1] && words[i].length > 2) return true
  }
  return false
}

/**
 * Check if an utterance is suitable for learner-facing lesson content.
 * Combines existing corpus quality filter with additional learner-focused checks.
 */
function isSuitableForLearner(text: string): boolean {
  const trimmed = text.trim()
  const len = trimmed.length

  // Length bounds
  if (len < MIN_LEN || len > MAX_LEN) return false

  // Reuse existing corpus quality filter (repetition, meta, abstract, non-English)
  if (!isNaturalConversation(trimmed)) return false

  // Additional learner-focused checks
  if (PUNCT_NOISE.test(trimmed)) return false
  if (META_LIKE.test(trimmed)) return false
  if (hasWordStutter(trimmed)) return false

  return true
}

// ── Extraction ──

/**
 * Extract the best conversational window from the first few turns.
 * All selected turns must pass learner-suitability checks.
 *
 * Preferred patterns (in priority order):
 * 1. B→A→B  (continuation) — entering mid-conversation
 * 2. A→B    (two-turn) — learner opens, partner responds
 * 3. A only  (single-turn) — minimal
 */
function extractBestWindow(turns: TurnRow[], scene: string): Extracted | null {
  const suitable = turns.filter((t) => isSuitableForLearner(t.text))
  if (suitable.length === 0) return null

  // Pattern 1: B→A→B (continuation)
  const firstB = suitable.find((t) => t.speaker === 'B')
  if (firstB) {
    const nextA = suitable.find(
      (t) => t.speaker === 'A' && t.turn_order > firstB.turn_order,
    )
    if (nextA) {
      const nextB2 = suitable.find(
        (t) => t.speaker === 'B' && t.turn_order > nextA.turn_order,
      )
      return {
        setupLine: firstB.text,
        learnerLine: nextA.text,
        partnerReply: nextB2?.text ?? null,
        scene,
        mode: nextB2 ? 'continuation' : 'two-turn',
      }
    }
  }

  // Pattern 2: A→B (two-turn)
  const firstA = suitable.find((t) => t.speaker === 'A')
  if (!firstA) return null

  const followB = suitable.find(
    (t) => t.speaker === 'B' && t.turn_order > firstA.turn_order,
  )

  if (followB) {
    return {
      setupLine: null,
      learnerLine: firstA.text,
      partnerReply: followB.text,
      scene,
      mode: 'two-turn',
    }
  }

  // Pattern 3: A only (single-turn)
  return {
    setupLine: null,
    learnerLine: firstA.text,
    partnerReply: null,
    scene,
    mode: 'single-turn',
  }
}

// ── Prompt building ──

function buildPrompt(e: Extracted): string {
  const s = e.scene.replace(/_/g, ' ').toLowerCase()

  if (e.mode === 'continuation' && e.setupLine) {
    return (
      `You're in a ${s} conversation.\n` +
      `Your partner says: "${e.setupLine}"\n` +
      `Reply naturally in English.`
    )
  }

  if (e.mode === 'two-turn') {
    return `Situation: ${s}. Respond naturally in English.`
  }

  return `Situation: ${s}. Say something natural in English.`
}

// ── Main ──

export async function applyCorpusToAiConversation(
  data: LessonPageData,
): Promise<LessonPageData> {
  try {
    const cs = data.corpusSelection
    if (!cs || cs.sequence.length === 0) return data

    const convId = cs.sequence[0].id
    const fetched = await fetchConvTurns(convId)
    if (!fetched) return data

    const e = extractBestWindow(fetched.turns, fetched.conv.scene)
    if (!e) return data

    const prompt = buildPrompt(e)
    const answer = e.learnerLine
    const aiQuestion = e.partnerReply

    // Find AI conversation block
    const lesson = data.lesson
    const bi = lesson.blocks.findIndex((b) => b.title === AI_CONVERSATION_BLOCK_TITLE)
    if (bi === -1) return data

    const block = lesson.blocks[bi]
    if (!block.items?.length) return data

    const orig = block.items[0]
    const updated = {
      ...orig,
      prompt,
      answer,
      aiQuestionText: aiQuestion ?? orig.aiQuestionText,
    }

    const blocks = [...lesson.blocks]
    blocks[bi] = { ...block, items: [updated, ...block.items.slice(1)] }

    // eslint-disable-next-line no-console
    console.log('[corpus-ai-conversation]', {
      conversationId: convId,
      injected: true,
      mode: e.mode,
      filtered: true,
      scene: fetched.conv.scene,
      openerPreview: answer.slice(0, 60),
    })

    return { ...data, lesson: { ...lesson, blocks } }
  } catch {
    return data
  }
}

// ── DB fetch ──

async function fetchConvTurns(
  id: string,
): Promise<{ conv: ConvRow; turns: TurnRow[] } | null> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) return null

    const sb = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: c, error: ce } = await sb
      .from('corpus_conversations')
      .select('topic, scene')
      .eq('id', id)
      .single()
    if (ce || !c) return null

    const { data: t, error: te } = await sb
      .from('corpus_turns')
      .select('speaker, text, turn_order')
      .eq('conversation_id', id)
      .order('turn_order', { ascending: true })
      .limit(4)
    if (te || !t?.length) return null

    return { conv: c as ConvRow, turns: t as TurnRow[] }
  } catch {
    return null
  }
}
