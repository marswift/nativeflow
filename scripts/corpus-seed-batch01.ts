/**
 * Corpus Seed Insert Runner — Batch 01
 *
 * Usage:
 *   npx tsx scripts/corpus-seed-batch01.ts
 *
 * Requires environment variables:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Reads: data/corpus/manual-seed-en-us-v1-batch-01.json
 * Inserts into: corpus_conversations, corpus_turns, corpus_chunks, corpus_import_logs
 * Does NOT touch: audio, translation, or any lesson tables
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { insertCorpusSeedBatch } from '../lib/corpus/seed-insert'
import type { ConversationRecord } from '../lib/corpus/types'

// Load .env.local manually (no dotenv dependency)
const envPath = resolve(__dirname, '../.env.local')
const envContent = readFileSync(envPath, 'utf-8')
for (const line of envContent.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eqIdx = trimmed.indexOf('=')
  if (eqIdx === -1) continue
  const key = trimmed.slice(0, eqIdx).trim()
  const val = trimmed.slice(eqIdx + 1).trim()
  if (!process.env[key]) process.env[key] = val
}

async function main() {
  const filePath = resolve(__dirname, '../data/corpus/manual-seed-en-us-v1-batch-01.json')

  console.log('=== Corpus Seed Insert: Batch 01 ===')
  console.log(`File: ${filePath}`)
  console.log()

  const raw = readFileSync(filePath, 'utf-8')
  const records: ConversationRecord[] = JSON.parse(raw)

  console.log(`Records to insert: ${records.length}`)
  console.log()

  const summary = await insertCorpusSeedBatch(records)

  console.log('=== Summary ===')
  console.log(`Total:    ${summary.total}`)
  console.log(`Inserted: ${summary.inserted}`)
  console.log(`Skipped:  ${summary.skipped}`)
  console.log(`Failed:   ${summary.failed}`)
  console.log()

  for (const d of summary.details) {
    const suffix = d.reason ? ` — ${d.reason}` : ''
    console.log(`  [${d.status.toUpperCase().padEnd(7)}] ${d.id}${suffix}`)
  }

  console.log()
  console.log('Done.')

  // Exit with non-zero if any failures
  if (summary.failed > 0) process.exit(1)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
