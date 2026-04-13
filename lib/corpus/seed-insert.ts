/**
 * Corpus Seed Insert — Batch Insert for Seed Data
 *
 * Inserts seed JSON data into Supabase corpus tables.
 * Respects FK order: conversations → turns → chunks.
 * Each conversation is inserted independently; on failure, the partially
 * inserted conversation row is deleted (CASCADE removes turns + chunks)
 * so the next run can retry cleanly.
 * Conflicts (duplicates) are skipped, not crashed.
 *
 * Does NOT touch audio or translation tables.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { ConversationRecord } from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>

// ── Types ──

type InsertSummary = {
  total: number
  inserted: number
  skipped: number
  failed: number
  details: {
    id: string
    status: 'success' | 'skipped' | 'error'
    reason?: string
  }[]
}

// ── Helpers ──

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// ── Main Insert Function ──

/**
 * Insert an array of ConversationRecord into Supabase corpus tables.
 *
 * - Each conversation is inserted independently (one failure doesn't break the batch)
 * - Duplicates are detected via UNIQUE(source, external_id) and skipped
 * - Import logs are written for every attempt
 */
export async function insertCorpusSeedBatch(
  records: ConversationRecord[],
): Promise<InsertSummary> {
  const supabase = getSupabaseAdmin()

  const summary: InsertSummary = {
    total: records.length,
    inserted: 0,
    skipped: 0,
    failed: 0,
    details: [],
  }

  for (const record of records) {
    let convId: string | null = null
    try {
      // Step 1: Insert conversation (detect duplicate via ON CONFLICT)
      const { data: convRows, error: convError } = await supabase
        .from('corpus_conversations')
        .insert({
          external_id: record.id,
          source: record.source,
          source_license: record.sourceLicense,
          is_commercially_safe: record.isCommerciallySafe,
          source_locale: 'en',
          topic: record.topic,
          scene: record.scene,
          level: record.level,
          turn_count: record.turns.length,
        })
        .select('id')

      // Check for unique violation (duplicate)
      if (convError) {
        if (convError.code === '23505') {
          // Unique constraint violation → already exists
          summary.skipped++
          summary.details.push({ id: record.id, status: 'skipped', reason: 'Already exists (duplicate external_id).' })
          await logImport(supabase, null, record, 'skipped', 'Already exists.')
          continue
        }
        throw new Error(`conversation insert: ${convError.message}`)
      }

      convId = convRows?.[0]?.id as string
      if (!convId) throw new Error('No conversation ID returned.')

      // Step 2: Insert turns
      const turnIdMap = new Map<number, string>() // turn_order → DB uuid

      for (const turn of record.turns) {
        const { data: turnRows, error: turnError } = await supabase
          .from('corpus_turns')
          .insert({
            conversation_id: convId,
            turn_order: turn.order,
            speaker: turn.speaker,
            text: turn.text,
            normalized_text: turn.normalizedText,
            audio_asset_key: turn.audioAssetKey ?? null,
          })
          .select('id')

        if (turnError) throw new Error(`turn insert (order ${turn.order}): ${turnError.message}`)

        const turnId = turnRows?.[0]?.id as string
        if (!turnId) throw new Error(`No turn ID returned for order ${turn.order}.`)
        turnIdMap.set(turn.order, turnId)

        // Step 3: Insert chunks for this turn
        const chunkRows: {
          turn_id: string
          chunk_type: 'meaning' | 'speech'
          chunk_order: number
          text: string
          normalized_text: string
        }[] = []

        for (const mc of turn.meaningChunks) {
          chunkRows.push({
            turn_id: turnId,
            chunk_type: 'meaning',
            chunk_order: mc.order,
            text: mc.text,
            normalized_text: mc.normalizedText,
          })
        }

        for (const sc of turn.speechChunks) {
          chunkRows.push({
            turn_id: turnId,
            chunk_type: 'speech',
            chunk_order: sc.order,
            text: sc.text,
            normalized_text: sc.normalizedText,
          })
        }

        if (chunkRows.length > 0) {
          const { error: chunkError } = await supabase
            .from('corpus_chunks')
            .insert(chunkRows)

          if (chunkError) throw new Error(`chunk insert (turn ${turn.order}): ${chunkError.message}`)
        }
      }

      // Success
      summary.inserted++
      summary.details.push({ id: record.id, status: 'success' })
      await logImport(supabase, convId, record, 'success', null)

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)

      // Rollback: delete partially inserted conversation (CASCADE removes turns + chunks)
      if (convId) {
        try {
          await supabase.from('corpus_conversations').delete().eq('id', convId)
        } catch {
          // Best-effort cleanup — don't mask the original error
        }
      }

      summary.failed++
      summary.details.push({ id: record.id, status: 'error', reason: message })
      await logImport(supabase, null, record, 'error', message)
    }
  }

  return summary
}

// ── Import log helper ──

async function logImport(
  supabase: AnySupabaseClient,
  conversationId: string | null,
  record: ConversationRecord,
  status: 'success' | 'skipped' | 'error',
  errorOrReason: string | null,
) {
  try {
    await supabase.from('corpus_import_logs').insert({
      conversation_id: conversationId,
      source: record.source,
      external_id: record.id,
      status,
      skip_reason: status === 'skipped' ? errorOrReason : null,
      error_message: status === 'error' ? errorOrReason : null,
    })
  } catch {
    // Don't let log failure break the batch
  }
}
