/**
 * Corpus Difficulty Score Runner
 *
 * Usage:
 *   npx tsx scripts/corpus-difficulty-score.ts
 *
 * Computes difficulty scores for all corpus turns and conversations.
 * Idempotent — overwrites scores on each run (same input → same output).
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import { scoreTurnDifficulty, scoreConversationDifficulty } from '../lib/corpus/difficulty-score'

const envPath = resolve(__dirname, '../.env.local')
for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const eq = t.indexOf('=')
  if (eq === -1) continue
  if (!process.env[t.slice(0, eq).trim()]) process.env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim()
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

async function main() {
  const supabase = getSupabase()

  console.log('=== Corpus Difficulty Score ===')
  console.log()

  // Fetch all conversations
  const { data: conversations, error: convError } = await supabase
    .from('corpus_conversations')
    .select('id')

  if (convError) { console.error('Conv fetch error:', convError.message); process.exit(1) }
  if (!conversations?.length) { console.log('No conversations found.'); return }

  // Fetch all turns
  const { data: turns, error: turnError } = await supabase
    .from('corpus_turns')
    .select('id, conversation_id, text')

  if (turnError) { console.error('Turn fetch error:', turnError.message); process.exit(1) }

  // Fetch chunk counts per turn
  const turnIds = (turns ?? []).map((t: { id: string }) => t.id)

  // Paginate chunk fetch
  const chunkCounts = new Map<string, number>()
  const PAGE = 1000
  for (let offset = 0; offset < turnIds.length; offset += PAGE) {
    const batch = turnIds.slice(offset, offset + PAGE)
    const { data: chunks } = await supabase
      .from('corpus_chunks')
      .select('turn_id')
      .in('turn_id', batch)

    for (const c of chunks ?? []) {
      chunkCounts.set(c.turn_id, (chunkCounts.get(c.turn_id) ?? 0) + 1)
    }
  }

  // Score each turn
  let turnsScoredCount = 0
  const convTurnScores = new Map<string, number[]>()

  for (const turn of turns ?? []) {
    const chunkCount = chunkCounts.get(turn.id) ?? 0
    const score = scoreTurnDifficulty(turn.text, chunkCount)

    // Update turn score
    const { error } = await supabase
      .from('corpus_turns')
      .update({ difficulty_score: score })
      .eq('id', turn.id)

    if (error) {
      console.error(`Turn update error (${turn.id}): ${error.message}`)
    } else {
      turnsScoredCount++
    }

    // Collect for conversation average
    if (!convTurnScores.has(turn.conversation_id)) {
      convTurnScores.set(turn.conversation_id, [])
    }
    convTurnScores.get(turn.conversation_id)!.push(score)
  }

  // Score each conversation (average of its turns)
  let convsScoredCount = 0

  for (const conv of conversations) {
    const turnScores = convTurnScores.get(conv.id) ?? []
    const score = scoreConversationDifficulty(turnScores)

    const { error } = await supabase
      .from('corpus_conversations')
      .update({ difficulty_score: score })
      .eq('id', conv.id)

    if (error) {
      console.error(`Conv update error (${conv.id}): ${error.message}`)
    } else {
      convsScoredCount++
    }
  }

  console.log('=== Summary ===')
  console.log(`Turns scored:         ${turnsScoredCount}`)
  console.log(`Conversations scored: ${convsScoredCount}`)
  console.log()
  console.log('Done. Run corpus-difficulty-status.ts to view distribution.')
}

main().catch((err) => { console.error('Fatal error:', err); process.exit(1) })
