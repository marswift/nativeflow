import OpenAI from 'openai'

const DEFAULT_MODEL = 'gpt-4.1-mini'
const DEFAULT_TEMPERATURE = 0.7
const DEFAULT_MAX_TOKENS = 500

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type GenerateChatCompletionArgs = {
  model?: string
  messages: ChatMessage[]
  temperature?: number
  maxTokens?: number
}

export type GenerateChatCompletionResult = {
  text: string
}

export function createOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('OPENAI_API_KEY is not set')
  }
  return new OpenAI({ apiKey })
}

export async function generateChatCompletion(
  args: GenerateChatCompletionArgs
): Promise<GenerateChatCompletionResult> {
  const client = createOpenAIClient()
  const model = args.model ?? DEFAULT_MODEL
  const temperature = args.temperature ?? DEFAULT_TEMPERATURE
  const maxTokens = args.maxTokens ?? DEFAULT_MAX_TOKENS
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = args.messages.map(
    (m) => ({ role: m.role, content: m.content })
  )
  const completion = await client.chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  })
  const raw = completion.choices?.[0]?.message?.content
  const text = typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : ''
  return { text }
}
