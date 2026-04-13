/**
 * Corpus Audio Enqueue Runner
 *
 * Usage:
 *   npx tsx scripts/corpus-audio-enqueue.ts
 *
 * Scans all commercially safe corpus data and enqueues missing audio
 * generation jobs into corpus_audio_assets with status='pending'.
 *
 * Safe to run multiple times — duplicates are skipped.
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { enqueueCorpusAudioJobs } from '../lib/corpus/audio-jobs'

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
  console.log('=== Corpus Audio Enqueue ===')
  console.log()

  const summary = await enqueueCorpusAudioJobs()

  console.log('=== Summary ===')
  console.log(`Turns scanned:  ${summary.turnsScanned}`)
  console.log(`Chunks scanned: ${summary.chunksScanned}`)
  console.log(`Rows inserted:  ${summary.rowsInserted}`)
  console.log(`Rows skipped:   ${summary.rowsSkipped}`)
  console.log(`Errors:         ${summary.errors}`)
  console.log()
  console.log('Done.')
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
