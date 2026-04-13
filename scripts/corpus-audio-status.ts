/**
 * Corpus Audio Status — Progress Dashboard
 *
 * Usage:
 *   npx tsx scripts/corpus-audio-status.ts
 *
 * Prints a concise summary of corpus audio generation progress.
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

type Row = { status: string; source_type: string; voice_id: string; speed: number }

async function fetchAllRows(supabase: ReturnType<typeof getSupabase>): Promise<Row[]> {
  const all: Row[] = []
  const PAGE = 1000
  let offset = 0
  while (true) {
    const { data, error } = await supabase
      .from('corpus_audio_assets')
      .select('status, source_type, voice_id, speed')
      .range(offset, offset + PAGE - 1)
    if (error) throw new Error(`Query error: ${error.message}`)
    if (!data?.length) break
    all.push(...data)
    if (data.length < PAGE) break
    offset += PAGE
  }
  return all
}

async function main() {
  const supabase = getSupabase()
  const allRows = await fetchAllRows(supabase)

  if (!allRows.length) { console.log('No corpus audio rows found.'); return }

  const total = allRows.length
  const byStatus: Record<string, number> = {}
  for (const r of allRows) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1

  const done = byStatus['done'] ?? 0
  const pending = byStatus['pending'] ?? 0
  const processing = byStatus['processing'] ?? 0
  const failed = byStatus['failed'] ?? 0
  const pct = total > 0 ? ((done / total) * 100).toFixed(1) : '0.0'

  console.log('=== Corpus Audio Status ===')
  console.log()
  console.log(`Total:      ${total}`)
  console.log(`Pending:    ${pending}`)
  console.log(`Processing: ${processing}`)
  console.log(`Done:       ${done}`)
  console.log(`Failed:     ${failed}`)
  console.log(`Progress:   ${pct}%`)
  console.log()

  // By source_type
  const bySource: Record<string, Record<string, number>> = {}
  for (const r of allRows) {
    const key = r.source_type ?? 'unknown'
    if (!bySource[key]) bySource[key] = {}
    bySource[key][r.status] = (bySource[key][r.status] ?? 0) + 1
  }
  console.log('--- By source_type ---')
  for (const [src, statuses] of Object.entries(bySource).sort()) {
    const t = Object.values(statuses).reduce((a, b) => a + b, 0)
    console.log(`  ${src.padEnd(8)} total=${t}  done=${statuses['done'] ?? 0}  pending=${statuses['pending'] ?? 0}  failed=${statuses['failed'] ?? 0}`)
  }
  console.log()

  // By voice_id
  const byVoice: Record<string, Record<string, number>> = {}
  for (const r of allRows) {
    const key = r.voice_id ?? 'unknown'
    if (!byVoice[key]) byVoice[key] = {}
    byVoice[key][r.status] = (byVoice[key][r.status] ?? 0) + 1
  }
  console.log('--- By voice_id ---')
  for (const [voice, statuses] of Object.entries(byVoice).sort()) {
    const t = Object.values(statuses).reduce((a, b) => a + b, 0)
    console.log(`  ${voice.padEnd(10)} total=${t}  done=${statuses['done'] ?? 0}  pending=${statuses['pending'] ?? 0}  failed=${statuses['failed'] ?? 0}`)
  }
  console.log()

  // By speed
  const bySpeed: Record<string, Record<string, number>> = {}
  for (const r of allRows) {
    const key = String(r.speed ?? 'unknown')
    if (!bySpeed[key]) bySpeed[key] = {}
    bySpeed[key][r.status] = (bySpeed[key][r.status] ?? 0) + 1
  }
  console.log('--- By speed ---')
  for (const [spd, statuses] of Object.entries(bySpeed).sort()) {
    const t = Object.values(statuses).reduce((a, b) => a + b, 0)
    console.log(`  ${spd.padEnd(6)} total=${t}  done=${statuses['done'] ?? 0}  pending=${statuses['pending'] ?? 0}  failed=${statuses['failed'] ?? 0}`)
  }
  console.log()
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
