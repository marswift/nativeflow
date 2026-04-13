import { NextResponse } from 'next/server'
import { generateChatCompletion } from '@/lib/openai-client'
import {
  buildChatMessages,
  parseAiConversationResponse,
  type AiConversationRequest,
  type AiConversationResponse,
} from '@/lib/ai-conversation-prompt'

export const runtime = 'nodejs'

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
  try {
    const body: unknown = await req.json()

    if (!isValidRequest(body)) {
      return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 })
    }

    const messages = buildChatMessages(body)

    const { text } = await generateChatCompletion({
      messages,
      temperature: 0.7,
      maxTokens: 300,
    })

    if (!text) {
      return NextResponse.json({ ok: false, error: 'Empty AI response' }, { status: 502 })
    }

    const parsed = parseAiConversationResponse(text)

    if (!parsed) {
      return NextResponse.json({ ok: false, error: 'Failed to parse AI response' }, { status: 502 })
    }

    return NextResponse.json({ ok: true, ...parsed })
  } catch {
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 })
  }
}
