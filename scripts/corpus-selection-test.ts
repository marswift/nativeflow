/**
 * Corpus Selection Test — Run selection algorithm against real DB data
 *
 * Usage:
 *   npx tsx scripts/corpus-selection-test.ts
 *
 * Tests multiple target difficulties and prints sequences.
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import {
  selectSessionSequence,
  buildProgressionCurve,
  type ConversationCandidate,
} from '../lib/corpus/selection-algorithm'

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

  // Fetch all scored conversations
  const { data: rows, error } = await supabase
    .from('corpus_conversations')
    .select('id, topic, scene, difficulty_score')
    .not('difficulty_score', 'is', null)
    .order('difficulty_score')

  if (error) { console.error(error.message); process.exit(1) }

  const candidates: ConversationCandidate[] = (rows ?? []).map((r: {
    id: string; topic: string; scene: string; difficulty_score: number
  }) => ({
    id: r.id,
    topic: r.topic,
    scene: r.scene,
    difficultyScore: r.difficulty_score,
  }))

  console.log(`=== Corpus Selection Test ===`)
  console.log(`Candidates: ${candidates.length}`)
  console.log(`Score range: ${candidates[0]?.difficultyScore}–${candidates[candidates.length - 1]?.difficultyScore}`)
  console.log()

  // Test scenarios
  const tests = [
    { label: 'Beginner (target=25)', target: 25 },
    { label: 'Intermediate (target=50)', target: 50 },
    { label: 'Advanced (target=70)', target: 70 },
    { label: 'With recent history', target: 50, recentIds: candidates.slice(0, 10).map(c => c.id) },
  ]

  for (const test of tests) {
    console.log(`--- ${test.label} ---`)

    const curve = buildProgressionCurve(test.target, 5)
    console.log(`Curve: [${curve.join(', ')}]`)

    const result = selectSessionSequence(candidates, {
      targetDifficulty: test.target,
      tolerance: 10,
      recentIds: test.recentIds ?? [],
      sessionSize: 5,
    })

    if (result.sequence.length === 0) {
      console.log('  No conversations found.')
    } else {
      for (const s of result.sequence) {
        console.log(
          `  slot=${s.slotTarget} → score=${s.difficultyScore} | ${s.topic}: ${s.scene} | ${s.reason}`
        )
      }
      const scores = result.sequence.map(s => s.difficultyScore)
      console.log(`  Actual scores: [${scores.join(', ')}]`)
    }
    console.log()
  }

  // Diversity test: run 3 sessions in a row, tracking recency
  console.log('--- Sequential sessions (diversity test) ---')
  const allRecent: string[] = []
  for (let session = 1; session <= 3; session++) {
    const result = selectSessionSequence(candidates, {
      targetDifficulty: 45,
      tolerance: 10,
      recentIds: allRecent,
      sessionSize: 5,
    })

    console.log(`Session ${session}:`)
    const topics: string[] = []
    for (const s of result.sequence) {
      console.log(`  score=${s.difficultyScore} | ${s.topic}: ${s.scene}`)
      allRecent.push(s.id)
      topics.push(s.topic)
    }
    const uniqueTopics = new Set(topics).size
    console.log(`  Topics: ${uniqueTopics}/${topics.length} unique`)
    console.log()
  }
}

main().catch((err) => { console.error('Fatal error:', err); process.exit(1) })
