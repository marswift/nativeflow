import OpenAI from 'openai'

const MODEL = 'gpt-4.1-mini'
const TEMPERATURE = 0.7

type HistoryMessage = { role: 'user' | 'assistant'; content: string }

export type GenerateAssistantTurnResult = {
  role: 'assistant'
  content: string
}

export async function generateAssistantTurn(
  systemPrompt: string,
  conversationHistory: HistoryMessage[],
  userMessage: string
): Promise<GenerateAssistantTurnResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('OPENAI_API_KEY is not set')
  }

  const openai = new OpenAI({ apiKey })

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage },
  ]

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages,
    temperature: TEMPERATURE,
  })

  const choice = completion.choices?.[0]
  const content = choice?.message?.content

  if (choice?.finish_reason === 'content_filter') {
    throw new Error('OpenAI content filter triggered')
  }
  if (content == null || typeof content !== 'string') {
    throw new Error('OpenAI returned no assistant content')
  }

  return { role: 'assistant', content }
}
