/**
 * Corpus Audio Generate All — Batch loop until complete
 *
 * Usage:
 *   npx tsx scripts/corpus-audio-generate-all.ts              # default: batch 50, delay 2s
 *   npx tsx scripts/corpus-audio-generate-all.ts --batch 20   # custom batch size
 *   npx tsx scripts/corpus-audio-generate-all.ts --delay 5    # custom delay in seconds
 *
 * Repeatedly calls processCorpusAudioBatch() until no pending rows remain.
 * Stops safely on:
 *   - pending = 0
 *   - 3 consecutive all-fail batches
 *   - batch returns 0 processed
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

function parseArgs(): { batchSize: number; delaySeconds: number } {
  const args = process.argv.slice(2)
  let batchSize = 50
  let delaySeconds = 2

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--batch' && args[i + 1]) {
      batchSize = parseInt(args[i + 1], 10)
      i++
    } else if (args[i] === '--delay' && args[i + 1]) {
      delaySeconds = parseFloat(args[i + 1])
      i++
    } else {
      // Positional: first arg = batchSize for backward compat
      const n = parseInt(args[i], 10)
      if (!isNaN(n)) batchSize = n
    }
  }

  return { batchSize: Math.max(1, batchSize), delaySeconds: Math.max(0, delaySeconds) }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

async function main() {
  const { batchSize, delaySeconds } = parseArgs()

  console.log('=== Corpus Audio Generate All ===')
  console.log(`Batch size: ${batchSize}`)
  console.log(`Delay between batches: ${delaySeconds}s`)
  console.log()

  let totalProcessed = 0
  let totalSucceeded = 0
  let totalFailed = 0
  let batchNumber = 0
  let consecutiveAllFail = 0
  const MAX_CONSECUTIVE_FAIL = 3
  const startTime = Date.now()

  while (true) {
    batchNumber++

    let result
    try {
      result = await processCorpusAudioBatch(batchSize)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`\n[FATAL] Batch ${batchNumber} threw: ${msg}`)
      consecutiveAllFail++
      if (consecutiveAllFail >= MAX_CONSECUTIVE_FAIL) {
        console.error(`\nStopping: ${MAX_CONSECUTIVE_FAIL} consecutive fatal errors.`)
        break
      }
      console.log(`Waiting ${delaySeconds}s before retry...`)
      await sleep(delaySeconds * 1000)
      continue
    }

    totalProcessed += result.processed
    totalSucceeded += result.succeeded
    totalFailed += result.failed

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)

    // No pending rows left
    if (result.processed === 0) {
      console.log(`\nBatch ${batchNumber}: no pending rows. Done.`)
      break
    }

    // Progress line
    console.log(
      `Batch ${batchNumber}: ${result.succeeded}/${result.processed} ok, ${result.failed} fail | ` +
      `Running total: ${totalSucceeded} done, ${totalFailed} fail | ${elapsed}s elapsed`
    )

    // Check consecutive all-fail
    if (result.processed > 0 && result.succeeded === 0) {
      consecutiveAllFail++
      if (consecutiveAllFail >= MAX_CONSECUTIVE_FAIL) {
        console.error(`\nStopping: ${MAX_CONSECUTIVE_FAIL} consecutive batches with 0 successes.`)
        console.error('Check failed rows with: npx tsx scripts/corpus-audio-status.ts')
        break
      }
    } else {
      consecutiveAllFail = 0
    }

    // Delay between batches
    if (delaySeconds > 0) {
      await sleep(delaySeconds * 1000)
    }
  }

  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1)

  console.log()
  console.log('=== Final Summary ===')
  console.log(`Batches run: ${batchNumber}`)
  console.log(`Processed:   ${totalProcessed}`)
  console.log(`Succeeded:   ${totalSucceeded}`)
  console.log(`Failed:      ${totalFailed}`)
  console.log(`Time:        ${totalElapsed}s`)
  console.log()

  if (totalFailed > 0) {
    console.log('Note: Some rows failed. To retry:')
    console.log('  npx tsx scripts/corpus-audio-retry-failed.ts')
    console.log('  npx tsx scripts/corpus-audio-generate-all.ts')
  }

  // Warn about stale processing rows
  console.log()
  console.log('Tip: If rows are stuck in "processing", reset them manually:')
  console.log("  UPDATE corpus_audio_assets SET status = 'pending' WHERE status = 'processing';")
  console.log()
  console.log('Done.')

  if (totalFailed > 0) process.exit(1)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
