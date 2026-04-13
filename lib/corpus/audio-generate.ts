/**
 * Corpus Audio Generate — Process pending audio rows
 *
 * Fetches pending rows from corpus_audio_assets, generates TTS audio,
 * uploads to Supabase Storage, and updates the row status.
 *
 * Reuses the project's existing OpenAI TTS and Supabase Storage patterns.
 * Designed for offline/admin batch execution — never runs from lesson UI.
 */

import { createHash } from 'crypto'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>

const BUCKET = 'lesson-audio'

// ── Standalone TTS (avoids 'server-only' import from openai-client.ts) ──

let openai: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (openai) return openai
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set')
  openai = new OpenAI({ apiKey, timeout: 30_000 })
  return openai
}

async function generateTTS(text: string, voice: string, speed: number): Promise<Buffer | null> {
  try {
    const response = await getOpenAI().audio.speech.create({
      model: 'gpt-4o-mini-tts',
      voice,
      input: text,
      response_format: 'mp3',
      speed,
    })
    return Buffer.from(await response.arrayBuffer())
  } catch (err) {
    console.error('TTS error:', err)
    return null
  }
}

// ── Types ──

export type GenerateBatchResult = {
  processed: number
  succeeded: number
  failed: number
  details: {
    id: string
    status: 'done' | 'failed'
    error?: string
  }[]
}

// ── Helpers ──

function getSupabaseAdmin(): AnySupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/** Deterministic cache key matching the existing audio API pattern */
function buildCacheKey(text: string, locale: string, voice: string, speed: number): string {
  const normalized = `${text.replace(/\s+/g, ' ').trim()}|${locale}|${voice}|${speed}|openai-v1`
  return createHash('sha256').update(normalized).digest('hex')
}

function buildStoragePath(locale: string, voice: string, cacheKey: string): string {
  return `${locale}/${voice}/${cacheKey}.mp3`
}

// ── Main generation ──

/**
 * Process a batch of pending corpus audio rows.
 *
 * Flow per row:
 * 1. Mark as 'processing'
 * 2. Check if file already exists in storage (reuse if so)
 * 3. Generate TTS via OpenAI
 * 4. Upload to Supabase Storage
 * 5. Update row → 'done' + asset_url
 * 6. On failure → 'failed' + error_message
 *
 * @param batchSize Number of pending rows to process (default 10)
 */
export async function processCorpusAudioBatch(
  batchSize = 10,
): Promise<GenerateBatchResult> {
  const supabase = getSupabaseAdmin()

  const result: GenerateBatchResult = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    details: [],
  }

  // Fetch pending rows
  const { data: rows, error: fetchError } = await supabase
    .from('corpus_audio_assets')
    .select('id, text, normalized_text, locale, voice_id, speed')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(batchSize)

  if (fetchError) throw new Error(`Failed to fetch pending rows: ${fetchError.message}`)
  if (!rows?.length) return result

  for (const row of rows) {
    result.processed++

    try {
      // Mark processing
      await supabase
        .from('corpus_audio_assets')
        .update({ status: 'processing' })
        .eq('id', row.id)

      const voice = row.voice_id ?? 'alloy'
      const speed = row.speed ?? 1.0
      const locale = row.locale ?? 'en-US'
      const cacheKey = buildCacheKey(row.text, locale, voice, speed)
      const storagePath = buildStoragePath(locale, voice, cacheKey)

      // Check if audio already exists in storage (dedup at storage level)
      let assetUrl: string | null = null

      const { data: existing, error: dlError } = await supabase.storage
        .from(BUCKET)
        .download(storagePath)

      if (!dlError && existing) {
        // File already in storage — reuse
        const { data: publicUrlData } = supabase.storage
          .from(BUCKET)
          .getPublicUrl(storagePath)
        assetUrl = publicUrlData.publicUrl
      } else {
        // Generate TTS
        const audioBuffer = await generateTTS(row.text, voice, speed)

        if (!audioBuffer) {
          throw new Error('TTS generation returned null')
        }

        // Upload
        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(storagePath, audioBuffer, {
            contentType: 'audio/mpeg',
            upsert: false,
          })

        // If upload fails with duplicate, still get the URL
        if (uploadError && !uploadError.message.includes('already exists')) {
          throw new Error(`Upload failed: ${uploadError.message}`)
        }

        const { data: publicUrlData } = supabase.storage
          .from(BUCKET)
          .getPublicUrl(storagePath)
        assetUrl = publicUrlData.publicUrl
      }

      // Mark done
      await supabase
        .from('corpus_audio_assets')
        .update({
          status: 'done',
          asset_url: assetUrl,
        })
        .eq('id', row.id)

      result.succeeded++
      result.details.push({ id: row.id, status: 'done' })

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)

      // Mark failed (best-effort — don't mask original error)
      try {
        await supabase
          .from('corpus_audio_assets')
          .update({
            status: 'failed',
            error_message: message,
          })
          .eq('id', row.id)
      } catch {
        // ignore
      }

      result.failed++
      result.details.push({ id: row.id, status: 'failed', error: message })
    }
  }

  return result
}
