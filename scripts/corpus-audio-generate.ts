/**
 * Corpus Audio Generate Runner
 *
 * Usage:
 *   npx tsx scripts/corpus-audio-generate.ts [batchSize]
 *
 * Processes pending corpus audio rows: TTS generation → Supabase Storage → status update.
 *
 * Default batch size: 10
 * Safe to run multiple times — only processes pending rows.
 *
 * Example:
 *   npx tsx scripts/corpus-audio-generate.ts 5
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { processCorpusAudioBatch } from '../lib/corpus/audio-generate'

// Load env
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
  const batchSize = parseInt(process.argv[2] ?? '10', 10)

  console.log('=== Corpus Audio Generate ===')
  console.log(`Batch size: ${batchSize}`)
  console.log()

  const result = await processCorpusAudioBatch(batchSize)

  console.log('=== Summary ===')
  console.log(`Processed: ${result.processed}`)
  console.log(`Succeeded: ${result.succeeded}`)
  console.log(`Failed:    ${result.failed}`)
  console.log()

  for (const d of result.details) {
    const suffix = d.error ? ` — ${d.error}` : ''
    console.log(`  [${d.status.toUpperCase().padEnd(6)}] ${d.id}${suffix}`)
  }

  console.log()
  console.log('Done.')

  if (result.failed > 0) process.exit(1)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
