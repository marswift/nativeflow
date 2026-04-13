/**
 * Corpus Translation Retry Failed
 *
 * Usage:
 *   npx tsx scripts/corpus-translation-retry-failed.ts                # all failed
 *   npx tsx scripts/corpus-translation-retry-failed.ts --limit 20     # up to 20
 *   npx tsx scripts/corpus-translation-retry-failed.ts --locale ja    # only ja
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

function parseArgs(): { limit: number | null; locale: string | null } {
  const args = process.argv.slice(2)
  let limit: number | null = null
  let locale: string | null = null
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) { limit = parseInt(args[i + 1], 10); i++ }
    else if (args[i] === '--locale' && args[i + 1]) { locale = args[i + 1]; i++ }
  }
  return { limit, locale }
}

async function main() {
  const supabase = getSupabase()
  const { limit, locale } = parseArgs()

  console.log('=== Corpus Translation Retry Failed ===')
  if (locale) console.log(`Filter: target_locale = ${locale}`)
  if (limit !== null) console.log(`Limit: ${limit}`)
  console.log()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase.from('corpus_translations').select('id').eq('status', 'failed')
  if (locale) query = query.eq('target_locale', locale)
  if (limit !== null) query = query.limit(limit)

  const { data: failedRows, error: fetchError } = await query
  if (fetchError) { console.error('Fetch error:', fetchError.message); process.exit(1) }
  if (!failedRows?.length) { console.log('No failed rows found.'); return }

  const ids = failedRows.map((r: { id: string }) => r.id)
  console.log(`Found ${ids.length} failed rows to retry.`)

  let resetCount = 0
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100)
    const { error } = await supabase
      .from('corpus_translations')
      .update({ status: 'pending', error_message: null })
      .in('id', batch)
    if (error) console.error(`Update error: ${error.message}`)
    else resetCount += batch.length
  }

  console.log(`Reset ${resetCount} rows from 'failed' to 'pending'.`)
  console.log('Done.')
}

main().catch((err) => { console.error('Fatal error:', err); process.exit(1) })
