import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/admin-api-guard'
import { supabaseServer } from '@/lib/supabase-server'

/**
 * PATCH /api/admin/lesson-content
 *
 * Updates a single lesson_phrases row.
 * Body: { phraseId, fields: { conversation_answer?, typing_answer?, native_hint?, mix_hint?, ai_question_text? } }
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
