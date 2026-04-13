/**
 * Apply Corpus Content to Listen Block
 *
 * Replaces the listen block's answer (target sentence) with content
 * from the corpus-selected conversation's best learner-suitable turn.
 *
 * - Only touches the listen block (identified by title '聞き取りとリピート')
 * - All other blocks remain unchanged
 * - Falls back to original content on any failure
 * - Read-only DB access (fetches corpus turns + optional translations)
 *
 * Does NOT modify lesson runtime, UI, or other block types.
 * Audio is generated downstream by hydrateLessonAudio() — no audio changes here.
 */

import { createClient } from '@supabase/supabase-js'
import type { LessonPageData } from '../lesson-page-data'
import { isNaturalConversation } from './quality-filter'

const LISTEN_BLOCK_TITLE = '聞き取りとリピート'
const MIN_LEN = 5
const MAX_LEN = 80 // tighter for listen — must be easy to hear and repeat

// ── Types ──

type TurnRow = { id: string; speaker: string; text: string; turn_order: number }

// ── Suitability ──

function isSuitableForListen(text: string): boolean {
  const trimmed = text.trim()
  const len = trimmed.length
  if (len < MIN_LEN || len > MAX_LEN) return false
  if (!isNaturalConversation(trimmed)) return false
  // Avoid questions for listen practice — statements are better for repeat
  if (trimmed.endsWith('?')) return false
  return true
}

// ── Main ──

/**
 * Inject corpus content into the listen block's first item.
 * Returns modified lesson data, or unchanged data on any failure.
 *
 * Only replaces:
 * - item.answer (target sentence for TTS + repeat)
 * - item.nativeHint (Japanese translation if available from corpus_translations)
 *
 * Audio is NOT touched — hydrateLessonAudio runs after this and generates
 * TTS from the new item.answer automatically.
 */
export async function applyCorpusToListen(
  data: LessonPageData,
): Promise<LessonPageData> {
  try {
    const cs = data.corpusSelection
    if (!cs || cs.sequence.length === 0) return data

    // Use the first corpus conversation (same as AI conversation activation)
    const convId = cs.sequence[0].id
    const turns = await fetchTurns(convId)
    if (!turns || turns.length === 0) return data

    // Find the best learner-suitable statement for listen practice
    const suitable = turns.filter((t) => isSuitableForListen(t.text))
    // Prefer speaker-A (learner role) statements
    const best = suitable.find((t) => t.speaker === 'A') ?? suitable[0]
    if (!best) return data

    // Optionally fetch Japanese translation for nativeHint
    const jaTranslation = await fetchTranslation(best.id, 'ja')

    // Find listen block
    const lesson = data.lesson
    const bi = lesson.blocks.findIndex((b) => b.title === LISTEN_BLOCK_TITLE)
    if (bi === -1) return data

    const block = lesson.blocks[bi]
    if (!block.items?.length) return data

    // Replace first item only
    const orig = block.items[0]
    const updated = {
      ...orig,
      answer: best.text,
      ...(jaTranslation ? { nativeHint: jaTranslation } : {}),
    }

    const blocks = [...lesson.blocks]
    blocks[bi] = { ...block, items: [updated, ...block.items.slice(1)] }

    // eslint-disable-next-line no-console
    console.log('[corpus-listen]', {
      conversationId: convId,
      injected: true,
      hasTranslation: !!jaTranslation,
      preview: best.text.slice(0, 60),
    })

    return { ...data, lesson: { ...lesson, blocks } }
  } catch {
    return data
  }
}

// ── DB fetch ──

async function fetchTurns(convId: string): Promise<TurnRow[] | null> {
  try {
    const sb = getSupabase()
    if (!sb) return null

    const { data, error } = await sb
      .from('corpus_turns')
      .select('id, speaker, text, turn_order')
      .eq('conversation_id', convId)
      .order('turn_order', { ascending: true })
      .limit(4)

    if (error || !data?.length) return null
    return data as TurnRow[]
  } catch {
    return null
  }
}

async function fetchTranslation(turnId: string, targetLocale: string): Promise<string | null> {
  try {
    const sb = getSupabase()
    if (!sb) return null

    const { data, error } = await sb
      .from('corpus_translations')
      .select('translated_text')
      .eq('turn_id', turnId)
      .eq('target_locale', targetLocale)
      .eq('status', 'done')
      .limit(1)
      .single()

    if (error || !data?.translated_text) return null
    return data.translated_text as string
  } catch {
    return null
  }
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
