/**
 * Minimal OpenAI client wrapper for NativeFlow lesson generation.
 * Server-side only. No lesson logic. OPENAI_API_KEY required.
 */

import OpenAI from 'openai'

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set')
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

const MODEL = 'gpt-4.1-mini'
const TEMPERATURE = 0.7
const MAX_TOKENS = 1200

/**
 * Sends a chat-completion request and returns the assistant message content.
 * @throws Error if the response has no assistant content
 */
export async function generateChatCompletion(
  messages: ChatMessage[]
): Promise<string> {
  const response = await openai.chat.completions.create({
    model: MODEL,
    temperature: TEMPERATURE,
    max_tokens: MAX_TOKENS,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  })

  if (!response.choices || response.choices.length === 0) {
    throw new Error('OpenAI returned no choices')
  }

  const choice = response.choices[0]
  const content = choice?.message?.content

  if (content == null || (typeof content === 'string' && content.trim() === '')) {
    throw new Error('OpenAI response had no assistant content')
  }

  return content
}
