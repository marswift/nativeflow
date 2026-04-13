/**
 * Corpus Translation Generate All — Loop until complete
 *
 * Usage:
 *   npx tsx scripts/corpus-translation-generate-all.ts
 *   npx tsx scripts/corpus-translation-generate-all.ts --batch 50 --delay 2000
 *
 * Loops processCorpusTranslationBatch() with delay until no pending rows remain.
 * Stops on 3 consecutive all-fail batches.
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import { processCorpusTranslationBatch } from '../lib/corpus/translation-generate'

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

async function countPending(): Promise<number> {
  const { count, error } = await getSupabase()
    .from('corpus_translations')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')
  if (error) throw new Error(`Count error: ${error.message}`)
  return count ?? 0
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function parseArgs(): { batchSize: number; delayMs: number } {
  const args = process.argv.slice(2)
  let batchSize = 20
  let delayMs = 1000
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--batch' && args[i + 1]) { batchSize = parseInt(args[i + 1], 10); i++ }
    else if (args[i] === '--delay' && args[i + 1]) { delayMs = parseInt(args[i + 1], 10); i++ }
  }
  return { batchSize: Math.max(1, batchSize), delayMs: Math.max(0, delayMs) }
}

async function main() {
  const { batchSize: BATCH_SIZE, delayMs: DELAY_MS } = parseArgs()
  const MAX_CONSECUTIVE_FAIL = 3

  console.log('=== Corpus Translation Generate All ===')
  console.log(`Batch size: ${BATCH_SIZE}, Delay: ${DELAY_MS}ms`)
  console.log()

  let batch = 0
  let totalSucceeded = 0
  let totalFailed = 0
  let consecutiveFail = 0
  const start = Date.now()

  while (true) {
    const pending = await countPending()
    if (pending === 0) {
      console.log('\nNo pending rows. Done.')
      break
    }

    batch++
    let result
    try {
      result = await processCorpusTranslationBatch(BATCH_SIZE)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[FATAL] Batch ${batch}: ${msg}`)
      consecutiveFail++
      if (consecutiveFail >= MAX_CONSECUTIVE_FAIL) {
        console.error(`Stopping: ${MAX_CONSECUTIVE_FAIL} consecutive fatal errors.`)
        break
      }
      await sleep(DELAY_MS)
      continue
    }

    totalSucceeded += result.succeeded
    totalFailed += result.failed
    const remaining = pending - result.processed
    const elapsed = ((Date.now() - start) / 1000).toFixed(0)

    console.log(
      `Batch ${batch}: ${result.succeeded}/${result.processed} ok, ${result.failed} fail | ` +
      `remaining ~${remaining} | ${elapsed}s elapsed`
    )

    if (result.processed > 0 && result.succeeded === 0) {
      consecutiveFail++
      if (consecutiveFail >= MAX_CONSECUTIVE_FAIL) {
        console.error(`\nStopping: ${MAX_CONSECUTIVE_FAIL} consecutive batches with 0 successes.`)
        break
      }
    } else {
      consecutiveFail = 0
    }

    await sleep(DELAY_MS)
  }

  const totalElapsed = ((Date.now() - start) / 1000).toFixed(1)
  console.log()
  console.log('=== Summary ===')
  console.log(`Batches:   ${batch}`)
  console.log(`Succeeded: ${totalSucceeded}`)
  console.log(`Failed:    ${totalFailed}`)
  console.log(`Time:      ${totalElapsed}s`)
  console.log()

  if (totalFailed > 0) {
    console.log('To retry failed rows:')
    console.log('  npx tsx scripts/corpus-translation-retry-failed.ts')
    process.exit(1)
  }
}

main().catch((err) => { console.error('Fatal error:', err); process.exit(1) })
