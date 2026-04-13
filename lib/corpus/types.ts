/**
 * Conversation Corpus Pipeline — Type Definitions
 *
 * Core types for collecting, structuring, chunking, classifying,
 * and preparing natural conversation data for language learning.
 */

// ── Source & Level ──

export type CorpusSource = 'multiwoz' | 'tatoeba' | 'manual' | 'generated'

export type CorpusLevel = 'beginner' | 'intermediate' | 'advanced'

// ── Chunks (2-layer: meaning + speech) ──

export type ChunkType = 'meaning' | 'speech'

export type ConversationChunk = {
  id: string
  order: number
  text: string
  normalizedText: string
  type: ChunkType
}

// ── Turn ──

export type ConversationTurn = {
  id: string
  order: number
  speaker: 'A' | 'B'
  text: string
  normalizedText: string

  /** Semantic unit chunks — verb + object + prepositional phrase etc. */
  meaningChunks: ConversationChunk[]

  /** Prosodic unit chunks — subject+verb split, prepositional phrases standalone */
  speechChunks: ConversationChunk[]

  audioAssetKey?: string | null
}

// ── Record ──

export type ConversationRecord = {
  id: string
  source: CorpusSource
  sourceLicense: string
  isCommerciallySafe: boolean

  topic: string
  scene: string
  level: CorpusLevel

  turns: ConversationTurn[]
}

// ── Source Policy ──

export type LicenseEvaluation = {
  textAllowed: boolean
  audioAllowed: boolean
  reason: string
}

// ── Audio Manifest ──

export type AudioManifestEntry = {
  /** Dedupe key: normalizedText + type */
  key: string
  text: string
  normalizedText: string
  type: 'turn' | 'chunk'
  chunkType?: ChunkType
  turnId: string
  conversationId: string
  /** Filled after generation */
  audioAssetKey?: string | null
}

// ── Translation Manifest ──

export type TranslationTargetLang = 'ja' | 'ko' | 'zh'

export type TranslationManifestEntry = {
  key: string
  sourceText: string
  normalizedSourceText: string
  targetLang: TranslationTargetLang
  /** Explanation-oriented translation, not literal */
  translatedText?: string | null
  turnId: string
  conversationId: string
}

// ── Quality Filter ──

export type QualityFilterResult = {
  pass: boolean
  reason: string | null
}

// ── Import Result ──

export type ImportResult = {
  record: ConversationRecord | null
  skipped: boolean
  skipReason: string | null
}
