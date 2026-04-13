-- ============================================================
-- Corpus Schema Patch: UNIQUE constraint refinement
-- ============================================================
-- Applied: 2026-04-09
-- 1. corpus_audio_assets: add voice_id + speed to dedupe key
-- 2. corpus_translations: add turn_id for context-aware dedupe
-- Both tables had 0 rows at time of migration — no data impact.
-- ============================================================

-- ── 1. corpus_audio_assets ──

ALTER TABLE corpus_audio_assets
  DROP CONSTRAINT uq_corpus_audio_dedupe;

ALTER TABLE corpus_audio_assets
  ADD CONSTRAINT uq_corpus_audio_dedupe
  UNIQUE (normalized_text, source_type, locale, voice_id, speed);

-- ── 2. corpus_translations ──

ALTER TABLE corpus_translations
  DROP CONSTRAINT uq_corpus_translation_dedupe;

ALTER TABLE corpus_translations
  ADD CONSTRAINT uq_corpus_translation_dedupe
  UNIQUE (normalized_source_text, source_locale, target_locale, turn_id);
