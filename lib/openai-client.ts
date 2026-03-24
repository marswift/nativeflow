import 'server-only'
import OpenAI from 'openai'

const DEFAULT_MODEL = process.env.OPENAI_MODEL ?? 'gpt-4.1-mini'
const DEFAULT_TEMPERATURE = 0.7
const DEFAULT_MAX_TOKENS = 500

let openaiClient: OpenAI | null = null

export function getOpenAIClient(): OpenAI {
  if (openaiClient) return openaiClient

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('OPENAI_API_KEY is not set')
  }

  openaiClient = new OpenAI({ apiKey })
  return openaiClient
}

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

export async function generateChatCompletion(
  args: GenerateChatCompletionArgs
): Promise<GenerateChatCompletionResult> {
  const client = getOpenAIClient()
  const model = args.model ?? DEFAULT_MODEL
  const temperature = args.temperature ?? DEFAULT_TEMPERATURE
  const maxTokens = args.maxTokens ?? DEFAULT_MAX_TOKENS
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = args.messages.map(
    (m) => ({ role: m.role, content: m.content })
  )

  try {
    const completion = await client.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    })

    const raw = completion.choices?.[0]?.message?.content
    const text =
      typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : ''

    return { text }
  } catch (error) {
    console.error('OpenAI error:', error)
    return { text: '' }
  }
}

export type GenerateSpeechArgs = {
  text: string
  voice?: string
  model?: string
  responseFormat?: 'mp3' | 'wav' | 'opus' | 'aac' | 'flac' | 'pcm'
  speed?: number
}

export async function generateSpeech(
  args: GenerateSpeechArgs
): Promise<Buffer | null> {
  const client = getOpenAIClient()

  const model = args.model ?? 'gpt-4o-mini-tts'
  const voice = args.voice ?? 'alloy'
  const responseFormat = args.responseFormat ?? 'mp3'
  const speed = args.speed ?? 1

  try {
    const response = await client.audio.speech.create({
      model,
      voice,
      input: args.text,
      response_format: responseFormat,
      speed,
    })

    return Buffer.from(await response.arrayBuffer())
  } catch (error) {
    console.error('TTS error:', error)
    return null
  }
}

export type TranscribeAudioArgs = {
  file: File
  language?: string
  prompt?: string
  model?: string
}

export type TranscribeAudioResult = {
  text: string
  averageLogprob: number | null
}

function calculateAverageLogprob(
  logprobs: Array<{ logprob?: number }> | undefined
): number | null {
  if (!Array.isArray(logprobs) || logprobs.length === 0) return null

  const numeric = logprobs
    .map((entry) => (typeof entry.logprob === 'number' ? entry.logprob : null))
    .filter((value): value is number => value != null && Number.isFinite(value))

  if (numeric.length === 0) return null

  const sum = numeric.reduce((acc, value) => acc + value, 0)
  return sum / numeric.length
}

function normalizeTranscriptionText(input: string): string {
  return input
    .replace(/\r\n/g, '\n')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function transcribeAudio(
  args: TranscribeAudioArgs
): Promise<TranscribeAudioResult> {
  const client = getOpenAIClient()
  const model = args.model ?? 'gpt-4o-transcribe'
  const prompt =
    typeof args.prompt === 'string' && args.prompt.trim() !== ''
      ? args.prompt.trim()
      : undefined

  try {
    const transcription = await client.audio.transcriptions.create({
      file: args.file,
      model,
      language: args.language,
      prompt,
      response_format: 'json',
      include: ['logprobs'],
    })

    const rawText =
      typeof (transcription as { text?: unknown }).text === 'string'
        ? (transcription as { text: string }).text
        : ''

    const normalizedText = normalizeTranscriptionText(rawText)

    if (!normalizedText) {
      return {
        text: '',
        averageLogprob: null,
      }
    }

    const logprobs = (
      transcription as { logprobs?: Array<{ logprob?: number }> }
    ).logprobs

    return {
      text: normalizedText,
      averageLogprob: calculateAverageLogprob(logprobs),
    }
  } catch (error) {
    console.error('Transcription error:', error)
    return {
      text: '',
      averageLogprob: null,
    }
  }
}
