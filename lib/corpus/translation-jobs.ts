/**
 * Corpus Translation Jobs — Enqueue pending translation rows
 *
 * Scans corpus_turns for commercially safe conversations and inserts
 * missing rows into corpus_translations for each target locale.
 *
 * Uses ON CONFLICT DO NOTHING for idempotency.
 * Does NOT generate translations — only creates pending job rows.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { normalizeForDedupeKey } from './normalize'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>

const SOURCE_LOCALE = 'en'
const TARGET_LOCALES = ['ja', 'es']

// ── Types ──

export type TranslationEnqueueSummary = {
  turnsScanned: number
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

export async function enqueueCorpusTranslationJobs(): Promise<TranslationEnqueueSummary> {
  const supabase = getSupabaseAdmin()

  const summary: TranslationEnqueueSummary = {
    turnsScanned: 0,
    rowsInserted: 0,
    rowsSkipped: 0,
    errors: 0,
  }

  // Fetch safe conversation IDs
  const { data: conversations, error: convError } = await supabase
    .from('corpus_conversations')
    .select('id')
    .eq('is_commercially_safe', true)

  if (convError) throw new Error(`Failed to fetch conversations: ${convError.message}`)
  if (!conversations?.length) return summary

  const convIds = conversations.map((c: { id: string }) => c.id)

  // Fetch all turns
  const { data: turns, error: turnError } = await supabase
    .from('corpus_turns')
    .select('id, conversation_id, text')
    .in('conversation_id', convIds)

  if (turnError) throw new Error(`Failed to fetch turns: ${turnError.message}`)
  if (!turns?.length) return summary

  for (const turn of turns) {
    summary.turnsScanned++

    for (const targetLocale of TARGET_LOCALES) {
      const { error } = await supabase
        .from('corpus_translations')
        .insert({
          conversation_id: turn.conversation_id,
          turn_id: turn.id,
          source_text: turn.text,
          normalized_source_text: normalizeForDedupeKey(turn.text),
          source_locale: SOURCE_LOCALE,
          target_locale: targetLocale,
          status: 'pending',
        })

      if (!error) {
        summary.rowsInserted++
      } else if (error.code === '23505') {
        summary.rowsSkipped++
      } else {
        console.error(`Insert error (turn ${turn.id}, ${targetLocale}): ${error.message}`)
        summary.errors++
      }
    }
  }

  return summary
}
