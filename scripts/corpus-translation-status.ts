/**
 * Corpus Translation Status
 *
 * Usage:
 *   npx tsx scripts/corpus-translation-status.ts
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

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

type Row = { status: string; target_locale: string }

async function fetchAll(supabase: ReturnType<typeof getSupabase>): Promise<Row[]> {
  const all: Row[] = []
  const PAGE = 1000
  let offset = 0
  while (true) {
    const { data, error } = await supabase
      .from('corpus_translations')
      .select('status, target_locale')
      .range(offset, offset + PAGE - 1)
    if (error) throw new Error(error.message)
    if (!data?.length) break
    all.push(...data)
    if (data.length < PAGE) break
    offset += PAGE
  }
  return all
}

async function main() {
  const supabase = getSupabase()
  const rows = await fetchAll(supabase)

  if (!rows.length) { console.log('No corpus translation rows found.'); return }

  const total = rows.length
  const byStatus: Record<string, number> = {}
  for (const r of rows) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1

  const done = byStatus['done'] ?? 0
  const pct = total > 0 ? ((done / total) * 100).toFixed(1) : '0.0'

  console.log('=== Corpus Translation Status ===')
  console.log()
  console.log(`Total:      ${total}`)
  console.log(`Pending:    ${byStatus['pending'] ?? 0}`)
  console.log(`Processing: ${byStatus['processing'] ?? 0}`)
  console.log(`Done:       ${done}`)
  console.log(`Failed:     ${byStatus['failed'] ?? 0}`)
  console.log(`Progress:   ${pct}%`)
  console.log()

  const byLocale: Record<string, Record<string, number>> = {}
  for (const r of rows) {
    if (!byLocale[r.target_locale]) byLocale[r.target_locale] = {}
    byLocale[r.target_locale][r.status] = (byLocale[r.target_locale][r.status] ?? 0) + 1
  }

  console.log('--- By target_locale ---')
  for (const [loc, statuses] of Object.entries(byLocale).sort()) {
    const t = Object.values(statuses).reduce((a, b) => a + b, 0)
    console.log(`  ${loc.padEnd(5)} total=${t}  done=${statuses['done'] ?? 0}  pending=${statuses['pending'] ?? 0}  failed=${statuses['failed'] ?? 0}`)
  }
  console.log()
}

main().catch((err) => { console.error('Fatal error:', err); process.exit(1) })
