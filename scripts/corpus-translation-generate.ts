/**
 * Corpus Translation Generate Runner
 *
 * Usage:
 *   npx tsx scripts/corpus-translation-generate.ts         # default batch 10
 *   npx tsx scripts/corpus-translation-generate.ts 20      # batch of 20
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { processCorpusTranslationBatch } from '../lib/corpus/translation-generate'

const envPath = resolve(__dirname, '../.env.local')
for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const eq = t.indexOf('=')
  if (eq === -1) continue
  if (!process.env[t.slice(0, eq).trim()]) process.env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim()
}

async function main() {
  const batchSize = parseInt(process.argv[2] ?? '10', 10)

  console.log('=== Corpus Translation Generate ===')
  console.log(`Batch size: ${batchSize}`)
  console.log()

  const result = await processCorpusTranslationBatch(batchSize)

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

main().catch((err) => { console.error('Fatal error:', err); process.exit(1) })
