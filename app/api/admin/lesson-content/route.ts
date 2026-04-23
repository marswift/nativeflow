import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/admin-api-guard'
import { supabaseServer } from '@/lib/supabase-server'

/**
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
export async function PATCH(req: NextRequest) {
  const adminUserId = await verifyAdminRequest(req)
  if (!adminUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  let body: { phraseId?: string; fields?: Record<string, string> }
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
  const ALLOWED = new Set(['conversation_answer', 'typing_answer', 'native_hint', 'mix_hint', 'ai_question_text'])
  const update: Record<string, string> = {}
  for (const [key, value] of Object.entries(fields)) {
    if (ALLOWED.has(key) && typeof value === 'string') {
      update[key] = value
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  // Validate: conversation_answer must not be blank
  if ('conversation_answer' in update && !update.conversation_answer.trim()) {
    return NextResponse.json({ error: 'conversation_answer cannot be blank' }, { status: 400 })
  }

  // Validate: ai_question_text should not be blanked if phrase already has one
  if ('ai_question_text' in update && !update.ai_question_text.trim()) {
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
