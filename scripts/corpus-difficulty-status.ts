/**
 * Corpus Difficulty Status — Score Distribution Dashboard
 *
 * Usage:
 *   npx tsx scripts/corpus-difficulty-status.ts
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import { scoreToBand } from '../lib/corpus/difficulty-score'

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

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
}

async function main() {
  const supabase = getSupabase()

  // Fetch conversations with scores and levels
  const { data: convs, error: convError } = await supabase
    .from('corpus_conversations')
    .select('id, level, difficulty_score')

  if (convError) { console.error(convError.message); process.exit(1) }

  const scored = (convs ?? []).filter((c: { difficulty_score: number | null }) => c.difficulty_score !== null)
  const unscored = (convs ?? []).length - scored.length

  console.log('=== Corpus Difficulty Status (Conversations) ===')
  console.log()
  console.log(`Total conversations: ${(convs ?? []).length}`)
  console.log(`Scored:              ${scored.length}`)
  console.log(`Unscored:            ${unscored}`)
  console.log()

  if (scored.length === 0) {
    console.log('No scored conversations. Run corpus-difficulty-score.ts first.')
    return
  }

  const scores = scored.map((c: { difficulty_score: number }) => c.difficulty_score)
  const min = Math.min(...scores)
  const max = Math.max(...scores)
  const avg = Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
  const med = median(scores)

  console.log(`Min:    ${min}`)
  console.log(`Max:    ${max}`)
  console.log(`Avg:    ${avg}`)
  console.log(`Median: ${med}`)
  console.log()

  // Distribution by computed band
  const bandCounts: Record<string, number> = { beginner: 0, intermediate: 0, advanced: 0 }
  for (const s of scores) bandCounts[scoreToBand(s)]++

  console.log('--- By computed band ---')
  console.log(`  beginner:     ${bandCounts.beginner}`)
  console.log(`  intermediate: ${bandCounts.intermediate}`)
  console.log(`  advanced:     ${bandCounts.advanced}`)
  console.log()

  // Average score by existing level label
  const byLevel: Record<string, number[]> = {}
  for (const c of scored) {
    const lvl = (c as { level: string }).level
    if (!byLevel[lvl]) byLevel[lvl] = []
    byLevel[lvl].push(c.difficulty_score)
  }

  console.log('--- Avg score by existing level label ---')
  for (const [level, levelScores] of Object.entries(byLevel).sort()) {
    const levelAvg = Math.round(levelScores.reduce((a, b) => a + b, 0) / levelScores.length)
    const levelMin = Math.min(...levelScores)
    const levelMax = Math.max(...levelScores)
    console.log(`  ${level.padEnd(14)} avg=${levelAvg}  min=${levelMin}  max=${levelMax}  count=${levelScores.length}`)
  }
  console.log()

  // Mismatches: score band differs from existing label
  let mismatchCount = 0
  const mismatchExamples: string[] = []
  for (const c of scored) {
    const existingLevel = (c as { level: string }).level
    const computedBand = scoreToBand(c.difficulty_score)
    if (existingLevel !== computedBand) {
      mismatchCount++
      if (mismatchExamples.length < 5) {
        mismatchExamples.push(`  ${(c as { id: string }).id}: label=${existingLevel} computed=${computedBand} score=${c.difficulty_score}`)
      }
    }
  }

  console.log(`--- Label vs computed band mismatches: ${mismatchCount} ---`)
  if (mismatchExamples.length > 0) {
    for (const ex of mismatchExamples) console.log(ex)
    if (mismatchCount > 5) console.log(`  ... and ${mismatchCount - 5} more`)
  }
  console.log()

  // Score histogram (buckets of 10)
  const histogram: Record<string, number> = {}
  for (const s of scores) {
    const bucket = `${Math.floor(s / 10) * 10}-${Math.floor(s / 10) * 10 + 9}`
    histogram[bucket] = (histogram[bucket] ?? 0) + 1
  }

  console.log('--- Score histogram ---')
  for (const [bucket, count] of Object.entries(histogram).sort()) {
    const bar = '█'.repeat(Math.ceil(count / 2))
    console.log(`  ${bucket.padEnd(6)} ${String(count).padStart(3)} ${bar}`)
  }
  console.log()
}

main().catch((err) => { console.error('Fatal error:', err); process.exit(1) })
