/**
 * Corpus Audio Retry Failed — Reset failed rows to pending
 *
 * Usage:
 *   npx tsx scripts/corpus-audio-retry-failed.ts              # retry all failed
 *   npx tsx scripts/corpus-audio-retry-failed.ts --limit 20   # retry up to 20
 *   npx tsx scripts/corpus-audio-retry-failed.ts --voice nova  # retry only nova voice
 *   npx tsx scripts/corpus-audio-retry-failed.ts --speed 0.85  # retry only speed 0.85
 *
 * Resets status from 'failed' -> 'pending' and clears error_message.
 * Does NOT touch 'done' or 'processing' rows.
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

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

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

function parseArgs(): { limit: number | null; voice: string | null; speed: number | null } {
  const args = process.argv.slice(2)
  let limit: number | null = null
  let voice: string | null = null
  let speed: number | null = null

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
      limit = parseInt(args[i + 1], 10)
      i++
    } else if (args[i] === '--voice' && args[i + 1]) {
      voice = args[i + 1]
      i++
    } else if (args[i] === '--speed' && args[i + 1]) {
      speed = parseFloat(args[i + 1])
      i++
    }
  }

  return { limit, voice, speed }
}

async function main() {
  const supabase = getSupabase()
  const { limit, voice, speed } = parseArgs()

  console.log('=== Corpus Audio Retry Failed ===')
  if (voice) console.log(`Filter: voice_id = ${voice}`)
  if (speed !== null) console.log(`Filter: speed = ${speed}`)
  if (limit !== null) console.log(`Limit: ${limit}`)
  console.log()

  // First, find the IDs of failed rows (with optional filters)
  let query = supabase
    .from('corpus_audio_assets')
    .select('id')
    .eq('status', 'failed')

  if (voice) query = query.eq('voice_id', voice)
  if (speed !== null) query = query.eq('speed', speed)
  if (limit !== null) query = query.limit(limit)

  const { data: failedRows, error: fetchError } = await query

  if (fetchError) { console.error('Fetch error:', fetchError.message); process.exit(1) }
  if (!failedRows?.length) {
    console.log('No failed rows found matching criteria.')
    return
  }

  const ids = failedRows.map((r: { id: string }) => r.id)
  console.log(`Found ${ids.length} failed rows to retry.`)

  // Reset in batches of 100 to avoid payload limits
  let resetCount = 0
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100)
    const { error: updateError } = await supabase
      .from('corpus_audio_assets')
      .update({ status: 'pending', error_message: null })
      .in('id', batch)

    if (updateError) {
      console.error(`Update error at batch ${i}: ${updateError.message}`)
    } else {
      resetCount += batch.length
    }
  }

  console.log(`Reset ${resetCount} rows from 'failed' to 'pending'.`)
  console.log('Done.')
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
