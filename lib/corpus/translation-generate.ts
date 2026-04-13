/**
 * Corpus Translation Generate — Process pending translation rows
 *
 * Fetches pending rows from corpus_translations, generates translations
 * via OpenAI chat API, and updates the row with the result.
 *
 * Translation quality rules:
 * - Comprehension support, not localization
 * - Natural, easy-to-understand wording
 * - No annotations, furigana, or notes
 * - Short and UI-friendly
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>

// ── Types ──

export type TranslationBatchResult = {
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

let openai: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (openai) return openai
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set')
  openai = new OpenAI({ apiKey, timeout: 15_000 })
  return openai
}

// ── Language labels for prompts ──

const LANG_LABELS: Record<string, string> = {
  ja: 'Japanese',
  es: 'Spanish',
  ko: 'Korean',
  zh: 'Chinese (Simplified)',
}

// ── Translation prompt ──

function buildTranslationPrompt(sourceText: string, targetLocale: string): string {
  const langName = LANG_LABELS[targetLocale] ?? targetLocale
  return [
    `Translate the following English sentence into ${langName}.`,
    '',
    'Rules:',
    '- Output ONLY the translated text, nothing else.',
    '- Preserve the original meaning naturally.',
    '- Use common, easy-to-understand wording.',
    '- Do not add explanations, annotations, or notes.',
    '- Keep it short and natural.',
    '- This is for language learners who need comprehension support.',
    '',
    `English: ${sourceText}`,
    '',
    `${langName}:`,
  ].join('\n')
}

async function translateText(sourceText: string, targetLocale: string): Promise<string> {
  const client = getOpenAI()
  const prompt = buildTranslationPrompt(sourceText, targetLocale)

  const completion = await client.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [
      { role: 'system', content: 'You are a professional translator. Output only the translation.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.3,
    max_tokens: 200,
  })

  const text = completion.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('Empty translation response')
  return text
}

// ── Main generation ──

export async function processCorpusTranslationBatch(
  batchSize = 10,
): Promise<TranslationBatchResult> {
  const supabase = getSupabaseAdmin()

  const result: TranslationBatchResult = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    details: [],
  }

  // Fetch pending rows
  const { data: rows, error: fetchError } = await supabase
    .from('corpus_translations')
    .select('id, source_text, target_locale')
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
        .from('corpus_translations')
        .update({ status: 'processing' })
        .eq('id', row.id)

      // Generate translation
      const translated = await translateText(row.source_text, row.target_locale)

      // Mark done
      await supabase
        .from('corpus_translations')
        .update({
          status: 'done',
          translated_text: translated,
        })
        .eq('id', row.id)

      result.succeeded++
      result.details.push({ id: row.id, status: 'done' })

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)

      try {
        await supabase
          .from('corpus_translations')
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
