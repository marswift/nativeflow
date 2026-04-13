/**
 * Corpus Audio Jobs — Enqueue pending audio generation rows
 *
 * Scans corpus_turns and corpus_chunks for commercially safe conversations
 * and inserts missing rows into corpus_audio_assets.
 *
 * Uses ON CONFLICT DO NOTHING for idempotency.
 * Does NOT generate audio — only creates pending job rows.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { normalizeForDedupeKey } from './normalize'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>

// ── Voice/speed variants for initial generation ──

type AudioVariant = {
  voice_id: string
  speed: number
}

const AUDIO_VARIANTS: AudioVariant[] = [
  { voice_id: 'nova', speed: 1.0 },     // female_1
  { voice_id: 'nova', speed: 0.85 },     // female_1 slow
  { voice_id: 'echo', speed: 1.0 },      // male_1
  { voice_id: 'echo', speed: 0.85 },     // male_1 slow
]

const LOCALE = 'en-US'

// ── Types ──

export type EnqueueSummary = {
  turnsScanned: number
  chunksScanned: number
  rowsInserted: number
  rowsSkipped: number
  errors: number
}

// ── Helpers ──

function getSupabaseAdmin(): AnySupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// ── Enqueue ──

/**
 * Scan corpus data and enqueue missing audio generation jobs.
 * Idempotent — duplicates are silently skipped via UNIQUE constraint.
 */
export async function enqueueCorpusAudioJobs(): Promise<EnqueueSummary> {
  const supabase = getSupabaseAdmin()

  const summary: EnqueueSummary = {
    turnsScanned: 0,
    chunksScanned: 0,
    rowsInserted: 0,
    rowsSkipped: 0,
    errors: 0,
  }

  // Fetch all safe conversations
  const { data: conversations, error: convError } = await supabase
    .from('corpus_conversations')
    .select('id')
    .eq('is_commercially_safe', true)

  if (convError) throw new Error(`Failed to fetch conversations: ${convError.message}`)
  if (!conversations?.length) return summary

  const convIds = conversations.map((c: { id: string }) => c.id)

  // Fetch all turns for these conversations
  const { data: turns, error: turnError } = await supabase
    .from('corpus_turns')
    .select('id, conversation_id, text, normalized_text')
    .in('conversation_id', convIds)

  if (turnError) throw new Error(`Failed to fetch turns: ${turnError.message}`)

  // Fetch all chunks for these turns
  const turnIds = (turns ?? []).map((t: { id: string }) => t.id)
  const { data: chunks, error: chunkError } = await supabase
    .from('corpus_chunks')
    .select('id, turn_id, chunk_type, text, normalized_text')
    .in('turn_id', turnIds)

  if (chunkError) throw new Error(`Failed to fetch chunks: ${chunkError.message}`)

  // Build turn lookup for conversation_id
  const turnConvMap = new Map<string, string>()
  for (const t of turns ?? []) {
    turnConvMap.set(t.id, t.conversation_id)
  }

  // Build chunk lookup for turn_id → conversation_id
  const chunkConvMap = new Map<string, string>()
  for (const c of chunks ?? []) {
    const convId = turnConvMap.get(c.turn_id)
    if (convId) chunkConvMap.set(c.id, convId)
  }

  // Enqueue turn-level audio
  for (const turn of turns ?? []) {
    summary.turnsScanned++
    for (const variant of AUDIO_VARIANTS) {
      const inserted = await insertAudioRow(supabase, {
        conversation_id: turn.conversation_id,
        turn_id: turn.id,
        chunk_id: null,
        source_type: 'turn',
        chunk_type: null,
        text: turn.text,
        normalized_text: normalizeForDedupeKey(turn.text),
        locale: LOCALE,
        voice_id: variant.voice_id,
        speed: variant.speed,
      })
      if (inserted === 'inserted') summary.rowsInserted++
      else if (inserted === 'skipped') summary.rowsSkipped++
      else summary.errors++
    }
  }

  // Enqueue chunk-level audio
  for (const chunk of chunks ?? []) {
    summary.chunksScanned++
    const convId = chunkConvMap.get(chunk.id)
    for (const variant of AUDIO_VARIANTS) {
      const inserted = await insertAudioRow(supabase, {
        conversation_id: convId ?? null,
        turn_id: chunk.turn_id,
        chunk_id: chunk.id,
        source_type: 'chunk',
        chunk_type: chunk.chunk_type,
        text: chunk.text,
        normalized_text: normalizeForDedupeKey(chunk.text),
        locale: LOCALE,
        voice_id: variant.voice_id,
        speed: variant.speed,
      })
      if (inserted === 'inserted') summary.rowsInserted++
      else if (inserted === 'skipped') summary.rowsSkipped++
      else summary.errors++
    }
  }

  return summary
}

// ── Row insert with conflict handling ──

async function insertAudioRow(
  supabase: AnySupabaseClient,
  row: {
    conversation_id: string | null
    turn_id: string
    chunk_id: string | null
    source_type: string
    chunk_type: string | null
    text: string
    normalized_text: string
    locale: string
    voice_id: string
    speed: number
  },
): Promise<'inserted' | 'skipped' | 'error'> {
  const { error } = await supabase
    .from('corpus_audio_assets')
    .insert({
      conversation_id: row.conversation_id,
      turn_id: row.turn_id,
      chunk_id: row.chunk_id,
      source_type: row.source_type,
      chunk_type: row.chunk_type,
      text: row.text,
      normalized_text: row.normalized_text,
      locale: row.locale,
      voice_id: row.voice_id,
      speed: row.speed,
      status: 'pending',
    })

  if (!error) return 'inserted'
  if (error.code === '23505') return 'skipped' // unique violation
  console.error(`Audio row insert error: ${error.message}`)
  return 'error'
}
