import { NextResponse } from 'next/server'
import { requireLessonEntitlement } from '@/lib/api-auth'
import { generateChatCompletion } from '@/lib/openai-client'
import {
  buildChatMessages,
  parseAiConversationResponse,
  sanitizeEchoFromReply,
  type AiConversationRequest,
  type AiConversationResponse,
  type V25AssemblyContext,
} from '@/lib/ai-conversation-prompt'
import { hasScript, advanceScript, type ScriptClassification } from '@/lib/scripted-conversation-engine'
import { ALL_SCRIPTS } from '@/lib/scripted-conversation-scripts'
import { matchSceneQuestions } from '@/lib/ai-conversation-scene-questions'
import { classifyMeaningLocal } from '@/lib/scripted-conversation-classifier'

export const runtime = 'nodejs'

/** Fire-and-forget error event to lesson_events table */
function logConvError(turn: number, error: string, llmMs: number, totalMs: number): void {
  import('@/lib/supabase-server').then(({ supabaseServer }) => {
    supabaseServer.from('lesson_events').insert({
      user_id: null,
      bundle_id: '',
      version_number: 0,
      stage: 'ai_conversation',
      event_type: 'ai_conv_error',
      metadata: { turn, error, llmMs, totalMs },
      created_at: new Date().toISOString(),
    }).then(() => { /* non-blocking */ }, () => { /* ignore */ })
  }, () => { /* ignore */ })
}

type ApiResponse =
  | { ok: true } & AiConversationResponse
  | { ok: false; error: string }

function isValidRequest(body: unknown): body is AiConversationRequest {
  if (typeof body !== 'object' || body === null) return false
  const b = body as Record<string, unknown>
  return (
    typeof b.turnIndex === 'number' &&
    b.turnIndex >= 0 &&
    b.turnIndex <= 4 &&
    typeof b.userMessage === 'string' &&
    typeof b.lessonPhrase === 'string' &&
    Array.isArray(b.conversationHistory)
  )
}

export async function POST(req: Request): Promise<NextResponse<ApiResponse>> {
  const t0 = performance.now()

  const auth = await requireLessonEntitlement(req)
  if (auth instanceof NextResponse) return auth as NextResponse<ApiResponse>
  const authMs = Math.round(performance.now() - t0)

  try {
    const tParse = performance.now()
    const body: unknown = await req.json()
    const parseMs = Math.round(performance.now() - tParse)

    if (!isValidRequest(body)) {
      return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 })
    }

    const rank = typeof body.rank === 'number' ? body.rank : 100

    // ── Script-path fast return: skip LLM entirely when a script matches ──
    const levelStr = rank < 40 ? 'beginner' : rank < 70 ? 'intermediate' : 'advanced'
    const sceneMatch = matchSceneQuestions(body.lessonPhrase)
    const activeScript = hasScript(ALL_SCRIPTS, body.lessonPhrase, levelStr)
      ?? (sceneMatch ? hasScript(ALL_SCRIPTS, sceneMatch.id, levelStr) : null)

    if (activeScript) {
      const classification = classifyMeaningLocal(body.userMessage)
      // Reconstruct script state from client-provided fields (repair-aware)
      const reqBody = body as Record<string, unknown>
      const scriptTurnIdx = typeof reqBody.scriptTurnIndex === 'number' ? reqBody.scriptTurnIndex : body.turnIndex
      const scriptRepairs = typeof reqBody.scriptRepairCount === 'number' ? reqBody.scriptRepairCount : 0
      const scriptState = {
        scriptId: activeScript.id,
        currentTurnIndex: Math.min(scriptTurnIdx, activeScript.turns.length - 1),
        totalTurns: activeScript.turns.length,
        repairCount: scriptRepairs,
        completed: scriptTurnIdx >= activeScript.turns.length,
      }
      const result = advanceScript(activeScript, scriptState, classification, body.userMessage)
      const totalMs = Math.round(performance.now() - t0)
      // eslint-disable-next-line no-console
      console.log('[SCRIPT_PATH]', JSON.stringify({
        turn: body.turnIndex, scriptTurn: scriptTurnIdx, scriptId: activeScript.id,
        meaning: classification.meaningType, isClosing: result.isClosing,
        isRepair: result.isRepair, repairCount: result.state.repairCount,
        totalMs,
      }))
      return NextResponse.json({
        ok: true,
        aiReply: result.reply,
        evaluation: 'good' as const,
        evaluationDetail: { isRelevant: true, isNatural: true, isComplete: true, score: 80, feedback: '', correction: null, naturalAlternative: null, followUp: null },
        hint: null,
        nextPrompt: null,
        // Script state for client to echo back on next call
        scriptTurnIndex: result.state.currentTurnIndex,
        scriptRepairCount: result.state.repairCount,
        scriptIsRepair: result.isRepair,
      })
    }

    // ── Legacy LLM path for scenes without scripts ──
    const tPrompt = performance.now()
    const messages = buildChatMessages(body)
    const maxTokens = rank < 40 ? 150 : rank < 60 ? 200 : 300
    const promptMs = Math.round(performance.now() - tPrompt)

    const tLlm = performance.now()
    const { text } = await generateChatCompletion({
      messages,
      temperature: 0.7,
      maxTokens,
    })
    const llmMs = Math.round(performance.now() - tLlm)

    if (!text) {
      const totalMs = Math.round(performance.now() - t0)
      console.log('[AI_CONV_API]', JSON.stringify({ turn: body.turnIndex, llmMs, ok: false, error: 'empty' }))
      logConvError(body.turnIndex, 'empty', llmMs, totalMs)
      return NextResponse.json({ ok: false, error: 'Empty AI response' }, { status: 502 })
    }

    // eslint-disable-next-line no-console
    console.log('[AI_CONVERSATION_PATH]', JSON.stringify({
      turn: body.turnIndex,
      lessonPhrase: (body.lessonPhrase as string)?.slice(0, 50) ?? null,
      rank,
      llmMs,
    }))

    const tAssembly = performance.now()
    const assemblyCtx: V25AssemblyContext = {
      turnIndex: body.turnIndex,
      engineQuestion: body.engineSuggestedQuestion ?? null,
      engineAction: body.engineAction ?? null,
      wrapPrompts: body.engineWrapPrompts ?? ['Nice talking with you. See you next time!'],
      clarificationPrompts: body.engineClarificationPrompts ?? null,
      lessonPhrase: body.lessonPhrase,
      engineDimension: body.engineDimension ?? null,
      userMessage: body.userMessage,
      rank,
    }
    const parsed = parseAiConversationResponse(text, assemblyCtx)

    if (!parsed) {
      const totalMs = Math.round(performance.now() - t0)
      console.log('[AI_CONV_API]', JSON.stringify({ turn: body.turnIndex, llmMs, ok: false, error: 'parse' }))
      logConvError(body.turnIndex, 'parse', llmMs, totalMs)
      return NextResponse.json({ ok: false, error: 'Failed to parse AI response' }, { status: 502 })
    }

    // Runtime anti-echo guard: strip copied user phrases from AI reply
    parsed.aiReply = sanitizeEchoFromReply(parsed.aiReply, body.userMessage)

    const assemblyMs = Math.round(performance.now() - tAssembly)
    const totalMs = Math.round(performance.now() - t0)
    console.log('[AI_CONVO_LATENCY]', JSON.stringify({ turn: body.turnIndex, auth_ms: authMs, parse_ms: parseMs, prompt_ms: promptMs, llm_ms: llmMs, assembly_ms: assemblyMs, total_ms: totalMs }))
    console.log('[AI_CONV_API]', JSON.stringify({ turn: body.turnIndex, llmMs, totalMs, ok: true, eval: parsed.evaluation }))

    return NextResponse.json({ ok: true, ...parsed })
  } catch {
    const totalMs = Math.round(performance.now() - t0)
    console.log('[AI_CONV_API]', JSON.stringify({ turn: -1, totalMs, ok: false, error: 'exception' }))
    logConvError(-1, 'exception', 0, totalMs)
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 })
  }
}
