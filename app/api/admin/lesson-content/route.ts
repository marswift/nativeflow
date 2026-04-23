import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/admin-api-guard'
import { supabaseServer } from '@/lib/supabase-server'

/**
 * POST /api/admin/lesson-content
 *
 * Creates a new lesson_scenes row.
 * Body: { scene_key, label_ja, label_en, scene_category?, is_active? }
 *
 * PATCH /api/admin/lesson-content
 *
 * Updates a single lesson_phrases row.
 * Body: { phraseId, fields: { conversation_answer?, typing_answer?, native_hint?, mix_hint?, ai_question_text? } }
 *
 * PUT /api/admin/lesson-content
 *
 * Updates a single lesson_conversation_enrichments row.
 * Body: { enrichmentId, fields: { ai_question_text?, ai_conversation_opener?, typing_variations?, flavor? } }
 */
export async function POST(req: NextRequest) {
  const adminUserId = await verifyAdminRequest(req)
  if (!adminUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Route by action
  if (body.action === 'create_phrase') {
    return handleCreatePhrase(body)
  }
  if (body.action === 'create_enrichment') {
    return handleCreateEnrichment(body)
  }

  // Default: create scene
  const sceneKey = (body.scene_key as string | undefined)?.trim()
  const labelJa = (body.label_ja as string | undefined)?.trim()
  const labelEn = (body.label_en as string | undefined)?.trim()

  if (!sceneKey || !labelJa || !labelEn) {
    return NextResponse.json({ error: 'scene_key, label_ja, and label_en are required' }, { status: 400 })
  }

  // Validate scene_key format: lowercase, underscores only
  if (!/^[a-z][a-z0-9_]*$/.test(sceneKey)) {
    return NextResponse.json({ error: 'scene_key must be lowercase letters, numbers, and underscores (start with letter)' }, { status: 400 })
  }

  // Check uniqueness
  const { data: existing } = await supabaseServer
    .from('lesson_scenes')
    .select('scene_key')
    .eq('scene_key', sceneKey)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: `scene_key "${sceneKey}" already exists` }, { status: 409 })
  }

  const { error } = await supabaseServer
    .from('lesson_scenes')
    .insert({
      scene_key: sceneKey,
      label_ja: labelJa,
      label_en: labelEn,
      scene_category: (body.scene_category as string | undefined)?.trim() || 'daily-flow',
      is_active: body.is_active !== false,
    })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, scene_key: sceneKey })
}

const VALID_LEVELS = new Set(['beginner', 'intermediate', 'advanced'])

async function handleCreatePhrase(body: Record<string, unknown>) {
  const sceneKey = (body.scene_key as string | undefined)?.trim()
  const levelBand = (body.level_band as string | undefined)?.trim()
  const conversationAnswer = (body.conversation_answer as string | undefined)?.trim()
  const typingAnswer = (body.typing_answer as string | undefined)?.trim() || conversationAnswer
  const nativeHint = (body.native_hint as string | undefined)?.trim() || ''
  const mixHint = (body.mix_hint as string | undefined)?.trim() || ''
  const aiQuestionText = (body.ai_question_text as string | undefined)?.trim() || ''

  if (!sceneKey || !levelBand || !conversationAnswer) {
    return NextResponse.json({ error: 'scene_key, level_band, and conversation_answer are required' }, { status: 400 })
  }

  if (!VALID_LEVELS.has(levelBand)) {
    return NextResponse.json({ error: 'level_band must be beginner, intermediate, or advanced' }, { status: 400 })
  }

  // Verify scene exists
  const { data: scene } = await supabaseServer
    .from('lesson_scenes')
    .select('id')
    .eq('scene_key', sceneKey)
    .maybeSingle()

  if (!scene) {
    return NextResponse.json({ error: `Scene "${sceneKey}" not found` }, { status: 404 })
  }

  // Check uniqueness: (scene_key, level_band, language_code)
  const { data: existing } = await supabaseServer
    .from('lesson_phrases')
    .select('id')
    .eq('scene_key', sceneKey)
    .eq('level_band', levelBand)
    .eq('language_code', 'en')
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: `Phrase already exists for ${sceneKey} / ${levelBand} / en` }, { status: 409 })
  }

  const { data: inserted, error } = await supabaseServer
    .from('lesson_phrases')
    .insert({
      scene_id: scene.id,
      scene_key: sceneKey,
      level_band: levelBand,
      language_code: 'en',
      conversation_answer: conversationAnswer,
      typing_answer: typingAnswer,
      review_prompt: conversationAnswer,
      ai_conversation_prompt: `Talk about: ${conversationAnswer}`,
      native_hint: nativeHint,
      mix_hint: mixHint,
      ai_question_text: aiQuestionText,
      content_version: '1',
      is_active: true,
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, phraseId: inserted.id })
}

async function handleCreateEnrichment(body: Record<string, unknown>) {
  const sceneKey = (body.scene_key as string | undefined)?.trim()
  const regionSlug = (body.region_slug as string | undefined)?.trim()
  const ageGroup = (body.age_group as string | undefined)?.trim()
  const levelBand = (body.level_band as string | undefined)?.trim()
  const aiQuestionText = (body.ai_question_text as string | undefined)?.trim()
  const aiConversationOpener = (body.ai_conversation_opener as string | undefined)?.trim()

  if (!sceneKey || !regionSlug || !ageGroup || !levelBand || !aiQuestionText || !aiConversationOpener) {
    return NextResponse.json({ error: 'scene_key, region_slug, age_group, level_band, ai_question_text, and ai_conversation_opener are required' }, { status: 400 })
  }

  if (!VALID_LEVELS.has(levelBand)) {
    return NextResponse.json({ error: 'level_band must be beginner, intermediate, or advanced' }, { status: 400 })
  }

  // Verify scene exists
  const { data: scene } = await supabaseServer
    .from('lesson_scenes')
    .select('id')
    .eq('scene_key', sceneKey)
    .maybeSingle()

  if (!scene) {
    return NextResponse.json({ error: `Scene "${sceneKey}" not found` }, { status: 404 })
  }

  // Check uniqueness
  const { data: existing } = await supabaseServer
    .from('lesson_conversation_enrichments')
    .select('id')
    .eq('scene_key', sceneKey)
    .eq('region_slug', regionSlug)
    .eq('age_group', ageGroup)
    .eq('level_band', levelBand)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: `Enrichment already exists for ${sceneKey} / ${regionSlug} / ${ageGroup} / ${levelBand}` }, { status: 409 })
  }

  const { data: inserted, error } = await supabaseServer
    .from('lesson_conversation_enrichments')
    .insert({
      scene_id: scene.id,
      scene_key: sceneKey,
      region_slug: regionSlug,
      age_group: ageGroup,
      level_band: levelBand,
      ai_question_text: aiQuestionText,
      ai_conversation_opener: aiConversationOpener,
      typing_variations: [],
      flavor: null,
      ai_question_choices: null,
      content_version: '1',
      is_active: true,
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, enrichmentId: inserted.id })
}

export async function PATCH(req: NextRequest) {
  const adminUserId = await verifyAdminRequest(req)
  if (!adminUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  let body: { phraseId?: string; fields?: Record<string, unknown> }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { phraseId, fields } = body
  if (!phraseId || !fields || typeof fields !== 'object') {
    return NextResponse.json({ error: 'Missing phraseId or fields' }, { status: 400 })
  }

  // Whitelist editable columns
  const ALLOWED_STRING = new Set(['conversation_answer', 'typing_answer', 'native_hint', 'mix_hint', 'ai_question_text'])
  const update: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(fields)) {
    if (ALLOWED_STRING.has(key) && typeof value === 'string') {
      update[key] = value
    }
  }
  if ('is_active' in fields && typeof fields.is_active === 'boolean') {
    update.is_active = fields.is_active
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  // Validate: conversation_answer must not be blank
  if ('conversation_answer' in update && typeof update.conversation_answer === 'string' && !update.conversation_answer.trim()) {
    return NextResponse.json({ error: 'conversation_answer cannot be blank' }, { status: 400 })
  }

  // Validate: ai_question_text should not be blanked if phrase already has one
  if ('ai_question_text' in update && typeof update.ai_question_text === 'string' && !update.ai_question_text.trim()) {
    const { data: existing } = await supabaseServer
      .from('lesson_phrases')
      .select('ai_question_text')
      .eq('id', phraseId)
      .maybeSingle()
    if (existing?.ai_question_text?.trim()) {
      return NextResponse.json({ error: 'ai_question_text cannot be cleared (phrase already uses AI Question)' }, { status: 400 })
    }
  }

  const { error } = await supabaseServer
    .from('lesson_phrases')
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq('id', phraseId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function PUT(req: NextRequest) {
  const adminUserId = await verifyAdminRequest(req)
  if (!adminUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  let body: { enrichmentId?: string; fields?: Record<string, unknown> }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { enrichmentId, fields } = body
  if (!enrichmentId || !fields || typeof fields !== 'object') {
    return NextResponse.json({ error: 'Missing enrichmentId or fields' }, { status: 400 })
  }

  // Whitelist editable columns + type validation
  const update: Record<string, unknown> = {}

  if ('ai_question_text' in fields && typeof fields.ai_question_text === 'string') {
    update.ai_question_text = fields.ai_question_text
  }
  if ('ai_conversation_opener' in fields && typeof fields.ai_conversation_opener === 'string') {
    update.ai_conversation_opener = fields.ai_conversation_opener
  }
  if ('typing_variations' in fields && Array.isArray(fields.typing_variations)) {
    if (fields.typing_variations.every((v: unknown) => typeof v === 'string')) {
      update.typing_variations = fields.typing_variations
    }
  }
  if ('flavor' in fields) {
    if (fields.flavor === null || (typeof fields.flavor === 'object' && !Array.isArray(fields.flavor))) {
      update.flavor = fields.flavor
    }
  }
  if ('ai_question_choices' in fields) {
    const choices = fields.ai_question_choices
    if (choices === null) {
      update.ai_question_choices = null
    } else if (Array.isArray(choices)) {
      // Validate structure: exactly 3 choices, exactly 1 correct, non-empty labels, no duplicates
      if (choices.length !== 3) {
        return NextResponse.json({ error: 'ai_question_choices must have exactly 3 entries' }, { status: 400 })
      }
      const correctCount = choices.filter((c: { isCorrect?: boolean }) => c.isCorrect === true).length
      if (correctCount !== 1) {
        return NextResponse.json({ error: 'Exactly one choice must be marked correct' }, { status: 400 })
      }
      const labels = choices.map((c: { label?: string }) => (typeof c.label === 'string' ? c.label.trim() : ''))
      if (labels.some((l: string) => !l)) {
        return NextResponse.json({ error: 'All choice labels must be non-empty' }, { status: 400 })
      }
      if (new Set(labels).size !== labels.length) {
        return NextResponse.json({ error: 'Choice labels must not be duplicated' }, { status: 400 })
      }
      update.ai_question_choices = choices.map((c: { label: string; isCorrect: boolean }) => ({
        label: c.label.trim(),
        isCorrect: c.isCorrect === true,
      }))
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { error } = await supabaseServer
    .from('lesson_conversation_enrichments')
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq('id', enrichmentId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
