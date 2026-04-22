/**
 * Seed script: populates lesson content tables from object catalogs.
 *
 * Usage:
 *   npx tsx supabase/seed-lesson-content.ts
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 *
 * Idempotent: uses upsert on natural keys so reruns are safe.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { selectScenePhraseVariant, getSemanticChunks } from '../lib/lesson-blueprint-adapter'
import { buildScenarioLabel } from '../lib/lesson-blueprint-service'
import {
  DAILY_FLOW_CONVERSATION_CATALOG,
  type ConversationVariant,
} from '../lib/daily-flow-conversation-catalog'
import type { CurrentLevel } from '../lib/constants'

// Load .env.local manually (no dotenv dependency)
try {
  const envFile = readFileSync('.env.local', 'utf8')
  for (const line of envFile.split('\n')) {
    const match = line.match(/^([A-Z_]+)=(.*)$/)
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim()
  }
} catch { /* .env.local may not exist in CI */ }

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// ── Scene key registry with labels ──

const SCENE_LABELS: Record<string, { ja: string; en: string }> = {
  wake_up: { ja: '起床', en: 'Wake Up' },
  alarm_clock: { ja: '目覚まし', en: 'Alarm Clock' },
  make_bed: { ja: '布団をたたむ', en: 'Make the Bed' },
  wash_face: { ja: '洗顔', en: 'Wash Face' },
  brush_teeth: { ja: '歯磨き', en: 'Brush Teeth' },
  take_a_shower: { ja: 'シャワー', en: 'Take a Shower' },
  get_dressed: { ja: '着替え', en: 'Get Dressed' },
  make_breakfast: { ja: '朝食を作る', en: 'Make Breakfast' },
  eat_breakfast: { ja: '朝食を食べる', en: 'Eat Breakfast' },
  clean_up_after_breakfast: { ja: '朝食の片付け', en: 'Clean Up After Breakfast' },
  morning_grooming: { ja: '身だしなみ', en: 'Morning Grooming' },
  get_ready_to_leave: { ja: '出発準備', en: 'Get Ready to Leave' },
  take_out_the_garbage: { ja: 'ゴミ出し', en: 'Take Out the Garbage' },
  walk_to_station: { ja: '駅まで歩く', en: 'Walk to the Station' },
  ride_a_bike: { ja: '自転車移動', en: 'Ride a Bike' },
  take_the_train: { ja: '電車移動', en: 'Take the Train' },
  take_the_bus: { ja: 'バス移動', en: 'Take the Bus' },
  wait_for_the_bus: { ja: 'バス待ち', en: 'Wait for the Bus' },
  transfer_trains: { ja: '乗り換え', en: 'Transfer Trains' },
  arrive_at_work: { ja: '出勤', en: 'Arrive at Work' },
  greet_coworkers: { ja: '職場の挨拶', en: 'Greet Coworkers' },
  school_attendance: { ja: '出席・授業', en: 'Attend Class' },
  talk_with_friends: { ja: '友人との会話', en: 'Talk with Friends' },
  go_to_a_convenience_store: { ja: 'コンビニ', en: 'Convenience Store' },
  shop_at_the_supermarket: { ja: 'スーパー', en: 'Supermarket' },
  go_to_a_drugstore: { ja: 'ドラッグストア', en: 'Drugstore' },
  use_an_atm: { ja: 'ATM', en: 'Use an ATM' },
  go_to_the_post_office: { ja: '郵便局', en: 'Post Office' },
  go_to_a_hospital: { ja: '病院', en: 'Hospital' },
  go_to_a_pharmacy: { ja: '薬局', en: 'Pharmacy' },
  come_home: { ja: '帰宅', en: 'Come Home' },
  make_dinner: { ja: '夕食を作る', en: 'Make Dinner' },
  eat_dinner: { ja: '夕食を食べる', en: 'Eat Dinner' },
  wash_the_dishes: { ja: '食器洗い', en: 'Wash the Dishes' },
  do_the_laundry: { ja: '洗濯', en: 'Do the Laundry' },
  take_a_bath: { ja: '入浴', en: 'Take a Bath' },
  sort_the_garbage: { ja: 'ゴミ分別', en: 'Sort the Garbage' },
  watch_videos: { ja: '動画を見る', en: 'Watch Videos' },
  play_games: { ja: 'ゲーム', en: 'Play Games' },
  go_for_a_walk: { ja: '散歩', en: 'Go for a Walk' },
  read_a_book: { ja: '読書', en: 'Read a Book' },
  prepare_for_tomorrow: { ja: '翌日の準備', en: 'Prepare for Tomorrow' },
  write_a_diary: { ja: '日記', en: 'Write a Diary' },
  go_to_bed: { ja: '就寝', en: 'Go to Bed' },
}

const LEVELS: CurrentLevel[] = ['beginner', 'intermediate', 'advanced']

function log(msg: string) {
  console.log(`[seed] ${msg}`)
}

async function seedScenes() {
  log('Seeding lesson_scenes...')
  const rows = Object.entries(SCENE_LABELS).map(([key, labels]) => ({
    scene_key: key,
    scene_category: 'daily-flow',
    label_ja: labels.ja,
    label_en: labels.en,
    is_active: true,
  }))

  const { error } = await supabase
    .from('lesson_scenes')
    .upsert(rows, { onConflict: 'scene_key' })

  if (error) throw new Error(`lesson_scenes: ${error.message}`)
  log(`  ${rows.length} scenes upserted`)
}

async function getSceneIdMap(): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from('lesson_scenes')
    .select('id, scene_key')
  if (error) throw new Error(`scene id lookup: ${error.message}`)
  return new Map((data ?? []).map((r: { id: string; scene_key: string }) => [r.scene_key, r.id]))
}

async function seedPhrases(sceneIdMap: Map<string, string>) {
  log('Seeding lesson_phrases...')
  let phraseCount = 0

  for (const sceneKey of Object.keys(SCENE_LABELS)) {
    const sceneId = sceneIdMap.get(sceneKey)
    if (!sceneId) continue

    for (const level of LEVELS) {
      try {
        const base = selectScenePhraseVariant(sceneKey, level, 'base', 0)

        const phraseRow = {
          scene_id: sceneId,
          scene_key: sceneKey,
          level_band: level,
          language_code: 'en',
          conversation_answer: base.conversationAnswer,
          typing_answer: base.typingAnswer,
          review_prompt: base.reviewPrompt,
          ai_conversation_prompt: base.aiConversationPrompt,
          native_hint: base.nativeHint,
          mix_hint: base.mixHint,
          ai_question_text: base.aiQuestionText,
          content_version: '1',
          is_active: true,
        }

        const { data: upserted, error } = await supabase
          .from('lesson_phrases')
          .upsert(phraseRow, { onConflict: 'scene_key,level_band,language_code' })
          .select('id')
          .single()

        if (error) {
          log(`  WARN phrase ${sceneKey}/${level}: ${error.message}`)
          continue
        }

        const phraseId = upserted.id
        phraseCount++

        // Variations
        const variations: { phrase_id: string; sort_order: number; conversation_answer: string; typing_answer: string; native_hint: string; mix_hint: string; is_active: boolean }[] = []
        for (let i = 0; i < 5; i++) {
          try {
            const v = selectScenePhraseVariant(sceneKey, level, 'variation', i)
            if (v.conversationAnswer !== base.conversationAnswer) {
              variations.push({
                phrase_id: phraseId,
                sort_order: variations.length,
                conversation_answer: v.conversationAnswer,
                typing_answer: v.typingAnswer,
                native_hint: v.nativeHint,
                mix_hint: v.mixHint,
                is_active: true,
              })
            }
          } catch { break }
        }

        if (variations.length > 0) {
          // Delete existing variations for this phrase, then insert fresh
          await supabase.from('lesson_phrase_variations').delete().eq('phrase_id', phraseId)
          const { error: vErr } = await supabase.from('lesson_phrase_variations').insert(variations)
          if (vErr) log(`  WARN variations ${sceneKey}/${level}: ${vErr.message}`)
        }

        // Semantic chunks
        const chunks = getSemanticChunks(sceneKey, level)
        if (chunks && chunks.length > 0) {
          await supabase.from('lesson_semantic_chunks').delete().eq('phrase_id', phraseId)
          const chunkRows = chunks.map((c, i) => ({
            phrase_id: phraseId,
            chunk: c.chunk,
            meaning: c.meaning,
            chunk_kind: c.type ?? 'phrase',
            importance: c.importance ?? null,
            meaning_tts: c.meaningTts ?? null,
            sort_order: i,
            is_active: true,
          }))
          const { error: cErr } = await supabase.from('lesson_semantic_chunks').insert(chunkRows)
          if (cErr) log(`  WARN chunks ${sceneKey}/${level}: ${cErr.message}`)
        }
      } catch {
        // Scene/level combo doesn't exist in catalog — skip
      }
    }
  }
  log(`  ${phraseCount} phrases upserted`)
}

async function seedEnrichments(sceneIdMap: Map<string, string>) {
  log('Seeding lesson_conversation_enrichments...')
  let count = 0

  for (const [catalogKey, variant] of Object.entries(DAILY_FLOW_CONVERSATION_CATALOG)) {
    const parts = catalogKey.split('__')
    if (parts.length !== 4) continue
    const [sceneKey, region, ageGroup, level] = parts

    const sceneId = sceneIdMap.get(sceneKey)
    if (!sceneId) continue

    const enrichmentRow = {
      scene_id: sceneId,
      scene_key: sceneKey,
      region_slug: region,
      age_group: ageGroup,
      level_band: level,
      ai_question_text: variant.aiQuestionText,
      ai_conversation_opener: variant.aiConversationOpener,
      typing_variations: variant.typingVariations,
      flavor: variant.flavor ?? null,
      content_version: '1',
      is_active: true,
    }

    const { data: upserted, error } = await supabase
      .from('lesson_conversation_enrichments')
      .upsert(enrichmentRow, { onConflict: 'scene_key,region_slug,age_group,level_band' })
      .select('id')
      .single()

    if (error) {
      log(`  WARN enrichment ${catalogKey}: ${error.message}`)
      continue
    }

    const enrichmentId = upserted.id
    count++

    // Core chunks
    if (variant.coreChunks && variant.coreChunks.length > 0) {
      await supabase.from('lesson_core_chunks').delete().eq('enrichment_id', enrichmentId)
      const chunkRows = variant.coreChunks.map((c: { chunk: string; meaning: string }, i: number) => ({
        enrichment_id: enrichmentId,
        chunk: c.chunk,
        meaning: c.meaning,
        sort_order: i,
      }))
      const { error: cErr } = await supabase.from('lesson_core_chunks').insert(chunkRows)
      if (cErr) log(`  WARN core_chunks ${catalogKey}: ${cErr.message}`)
    }

    // Related expressions
    if (variant.relatedExpressions && variant.relatedExpressions.length > 0) {
      await supabase.from('lesson_related_expressions').delete().eq('enrichment_id', enrichmentId)
      const exprRows = variant.relatedExpressions.map((r, i) => ({
        enrichment_id: enrichmentId,
        expression_en: r.en,
        expression_ja: r.ja,
        category: r.category,
        ja_tts: r.jaTts ?? null,
        sort_order: i,
        is_active: true,
      }))
      const { error: eErr } = await supabase.from('lesson_related_expressions').insert(exprRows)
      if (eErr) log(`  WARN expressions ${catalogKey}: ${eErr.message}`)
    }
  }
  log(`  ${count} enrichments upserted`)
}

async function main() {
  log('Starting lesson content seed...')
  try {
    await seedScenes()
    const sceneIdMap = await getSceneIdMap()
    await seedPhrases(sceneIdMap)
    await seedEnrichments(sceneIdMap)
    log('Seed complete.')
  } catch (err) {
    console.error('Seed failed:', err)
    process.exit(1)
  }
}

main()
