/**
 * Admin Sentence Workbench — types and helpers.
 */

// ── Types ──

export type SentenceMaster = {
  id: string
  meaning_ja: string
  base_language_code: string
  base_text: string
  structure_text: string | null
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  tags: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export type SentenceLocalization = {
  id: string
  sentence_master_id: string
  language_code: string
  region_code: string | null
  localized_text: string
  review_ja: string | null
  naturalness_score: number | null
  status: 'draft' | 'approved' | 'needs_regeneration' | 'archived'
  source: 'manual' | 'ai_generated' | 'ai_regenerated'
  created_at: string
  updated_at: string
}

export type SentenceRevisionRequest = {
  id: string
  sentence_localization_id: string | null
  sentence_master_id: string
  target_language_code: string
  target_region_code: string | null
  instruction_ja: string
  result_summary_ja: string | null
  status: 'pending' | 'completed' | 'failed'
  created_at: string
}

export type RegenerationInput = {
  sentenceMasterId: string
  localizationId?: string
  targetLanguageCode: string
  targetRegionCode?: string | null
  instructionJa: string
}

export type RegenerationOutput = {
  localizedText: string
  reviewJa: string
  naturalnessScore: number | null
  candidates: string[]
}

// ── Owner check ──

const OWNER_EMAILS = new Set([
  process.env.ADMIN_OWNER_EMAIL ?? 'admin@marswift.co.jp',
])

export function isOwner(email: string | undefined | null): boolean {
  if (!email) return false
  return OWNER_EMAILS.has(email.toLowerCase())
}
