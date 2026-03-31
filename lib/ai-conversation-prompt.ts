import 'server-only'
import type { ChatMessage } from './openai-client'

// ——— API contract ———

export type AiConversationRequest = {
  turnIndex: number
  userMessage: string
  lessonPhrase: string
  conversationHistory: { ai: string; user: string }[]
}

export type AiConversationEvaluation = {
  isRelevant: boolean
  isNatural: boolean
  isComplete: boolean
  score: number
  feedback: string
  correction: string | null
}

export type AiConversationResponse = {
  aiReply: string
  /** Simplified result for UI flow control */
  evaluation: 'good' | 'retry'
  /** Detailed evaluation breakdown */
  evaluationDetail: AiConversationEvaluation
  hint: string | null
  nextPrompt: string | null
}

// ——— Prompt builder ———

const SYSTEM_PROMPT_TEMPLATE = `You are a friendly English conversation partner helping a Japanese student practice speaking.

The student just learned this phrase: "{lessonPhrase}"

Conversation structure (4 turns total):
- Turn 0: Greet the student warmly. The student should respond to your greeting.
- Turn 1: React to their greeting, then naturally ask about the lesson phrase.
- Turn 2: React to their answer, ask a simple follow-up question.
- Turn 3: Wrap up with brief encouragement and say goodbye.

Rules:
- Keep aiReply to 1-2 SHORT sentences (under 20 words).
- Use simple English (A2-B1 level).
- React naturally to what the student actually said.
- Gently guide them to use the lesson phrase.

Evaluate the student's reply with these criteria:
- isRelevant: does the reply relate to what was asked?
- isNatural: does it sound like natural English (not random words)?
- isComplete: is it a full sentence (not just one word)?
- score: 0-100 overall quality
- feedback: one short sentence explaining the evaluation (in Japanese)
- correction: if the student's sentence has errors, provide the corrected version. null if correct.

Result:
- "good" if score >= 50
- "retry" if score < 50

You MUST respond in this exact JSON format, no other text:
{
  "aiReply": "your next message to the student",
  "result": "good" or "retry",
  "evaluation": {
    "isRelevant": true/false,
    "isNatural": true/false,
    "isComplete": true/false,
    "score": 0-100,
    "feedback": "Japanese feedback sentence",
    "correction": "corrected English sentence or null"
  },
  "hint": "Japanese advice if retry, null if good",
  "nextPrompt": "example English sentence if retry, null if good"
}`

export function buildSystemPrompt(lessonPhrase: string): string {
  return SYSTEM_PROMPT_TEMPLATE.replace('{lessonPhrase}', lessonPhrase)
}

export function buildChatMessages(
  request: AiConversationRequest,
): ChatMessage[] {
  const messages: ChatMessage[] = [
    { role: 'system', content: buildSystemPrompt(request.lessonPhrase) },
  ]

  // Replay conversation history (includes the current turn's user message)
  for (const turn of request.conversationHistory) {
    messages.push({ role: 'assistant', content: turn.ai })
    if (turn.user) {
      messages.push({ role: 'user', content: turn.user })
    }
  }

  // Instruction for current turn
  messages.push({
    role: 'system',
    content: `This is turn ${request.turnIndex} of 4. Evaluate the student's last message and provide your reply. Respond in JSON only.`,
  })

  return messages
}

function parseEvaluationDetail(obj: unknown): AiConversationEvaluation {
  if (typeof obj === 'object' && obj !== null) {
    const e = obj as Record<string, unknown>
    return {
      isRelevant: e.isRelevant === true,
      isNatural: e.isNatural === true,
      isComplete: e.isComplete === true,
      score: typeof e.score === 'number' ? Math.max(0, Math.min(100, e.score)) : 0,
      feedback: typeof e.feedback === 'string' ? e.feedback : '',
      correction: typeof e.correction === 'string' ? e.correction : null,
    }
  }
  return { isRelevant: false, isNatural: false, isComplete: false, score: 0, feedback: '', correction: null }
}

export function parseAiConversationResponse(raw: string): AiConversationResponse | null {
  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    const parsed = JSON.parse(jsonMatch[0])

    if (typeof parsed.aiReply !== 'string') return null

    // Support both "result" (new) and "evaluation" (old) field names for the pass/fail
    const result: string | undefined = parsed.result ?? (
      typeof parsed.evaluation === 'string' ? parsed.evaluation : undefined
    )
    if (result !== 'good' && result !== 'retry') return null

    const detail = parseEvaluationDetail(
      typeof parsed.evaluation === 'object' ? parsed.evaluation : null
    )

    return {
      aiReply: parsed.aiReply.trim(),
      evaluation: result,
      evaluationDetail: detail,
      hint: typeof parsed.hint === 'string' ? parsed.hint : null,
      nextPrompt: typeof parsed.nextPrompt === 'string' ? parsed.nextPrompt : null,
    }
  } catch {
    return null
  }
}
