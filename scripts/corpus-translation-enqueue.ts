/**
 * Corpus Translation Enqueue Runner
 *
 * Usage:
 *   npx tsx scripts/corpus-translation-enqueue.ts
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { enqueueCorpusTranslationJobs } from '../lib/corpus/translation-jobs'

const envPath = resolve(__dirname, '../.env.local')
for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const eq = t.indexOf('=')
  if (eq === -1) continue
  if (!process.env[t.slice(0, eq).trim()]) process.env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim()
}

async function main() {
  console.log('=== Corpus Translation Enqueue ===')
  console.log()

  const summary = await enqueueCorpusTranslationJobs()

  console.log('=== Summary ===')
  console.log(`Turns scanned:  ${summary.turnsScanned}`)
  console.log(`Rows inserted:  ${summary.rowsInserted}`)
  console.log(`Rows skipped:   ${summary.rowsSkipped}`)
  console.log(`Errors:         ${summary.errors}`)
  console.log()
  console.log('Done.')
}

main().catch((err) => { console.error('Fatal error:', err); process.exit(1) })
