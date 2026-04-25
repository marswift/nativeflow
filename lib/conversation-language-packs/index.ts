/**
 * Conversation Language Pack Registry
 *
 * Provides language-specific templates for deterministic conversation reply rendering.
 * Phase 3 skeleton — not connected to runtime assembly yet.
 *
 * Usage (future):
 *   const pack = getConversationLanguagePack('en')
 *   const reply = pack.reciprocalGreeting[turnIndex % pack.reciprocalGreeting.length]
 */

export type ConversationLanguagePack = {
  /** ISO language code */
  code: string

  // ── Social reply templates ──
  reciprocalGreeting: string[]
  greeting: string[]
  thanks: string[]
  apology: string[]
  farewell: string[]
  confusion: string[]
  continuation: string[]

  // ── Acknowledgment pool ──
  acks: string[]

  // ── Reaction pools by meaning type ──
  reactions: {
    yes: string[]
    no: string[]
    object: string[]
    person: string[]
    time: string[]
    frequency: string[]
    feeling: string[]
  }

  // ── Soft prompt for comment-only turns ──
  softPrompt: string

  // ── Wrap/closing templates ──
  wrap: string[]
}

import { englishConversationLanguagePack } from './en'
import { koreanConversationLanguagePack } from './ko'

const packs: Record<string, ConversationLanguagePack> = {
  en: englishConversationLanguagePack,
  ko: koreanConversationLanguagePack,
}

/**
 * Get the conversation language pack for a given language code.
 * Falls back to English if the requested language is not available.
 */
export function getConversationLanguagePack(languageCode = 'en'): ConversationLanguagePack {
  return packs[languageCode] ?? packs.en
}

export { englishConversationLanguagePack }
export { koreanConversationLanguagePack }
