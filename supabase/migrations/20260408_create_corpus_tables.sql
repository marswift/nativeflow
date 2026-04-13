-- ============================================================
-- Conversation Corpus Pipeline — Database Schema
-- ============================================================
-- Applied to production: 2026-04-08
-- Stores natural conversation data for language learning.
-- Fully isolated from existing lesson/user tables (corpus_ prefix).
-- ============================================================

-- ── ENUM types ──

CREATE TYPE corpus_source AS ENUM ('multiwoz', 'tatoeba', 'manual', 'generated');
CREATE TYPE corpus_level AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE corpus_chunk_type AS ENUM ('meaning', 'speech');
CREATE TYPE corpus_speaker AS ENUM ('A', 'B');
CREATE TYPE corpus_asset_status AS ENUM ('pending', 'processing', 'done', 'failed');

-- ── 1. corpus_conversations ──

CREATE TABLE corpus_conversations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id   text,
  source        corpus_source    NOT NULL,
  source_license text            NOT NULL,
  is_commercially_safe boolean   NOT NULL DEFAULT false,

  source_locale text             NOT NULL DEFAULT 'en',
  topic         text             NOT NULL DEFAULT 'general',
  scene         text             NOT NULL DEFAULT '',
  level         corpus_level     NOT NULL DEFAULT 'beginner',

  turn_count    smallint         NOT NULL DEFAULT 0,

  created_at    timestamptz      NOT NULL DEFAULT now(),
  updated_at    timestamptz      NOT NULL DEFAULT now(),

  CONSTRAINT uq_corpus_conv_external UNIQUE (source, external_id)
);

CREATE INDEX idx_corpus_conv_source ON corpus_conversations (source);
CREATE INDEX idx_corpus_conv_level ON corpus_conversations (level);
CREATE INDEX idx_corpus_conv_safe ON corpus_conversations (is_commercially_safe) WHERE is_commercially_safe = true;
CREATE INDEX idx_corpus_conv_topic ON corpus_conversations (topic);

-- ── 2. corpus_turns ──

CREATE TABLE corpus_turns (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   uuid         NOT NULL REFERENCES corpus_conversations(id) ON DELETE CASCADE,
  turn_order        smallint     NOT NULL,
  speaker           corpus_speaker NOT NULL,

  text              text         NOT NULL,
  normalized_text   text         NOT NULL,

  audio_asset_key   text,

  created_at        timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT uq_corpus_turn_order UNIQUE (conversation_id, turn_order)
);

CREATE INDEX idx_corpus_turns_conv ON corpus_turns (conversation_id);

-- ── 3. corpus_chunks ──

CREATE TABLE corpus_chunks (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  turn_id           uuid             NOT NULL REFERENCES corpus_turns(id) ON DELETE CASCADE,
  chunk_type        corpus_chunk_type NOT NULL,
  chunk_order       smallint         NOT NULL,

  text              text             NOT NULL,
  normalized_text   text             NOT NULL,

  created_at        timestamptz      NOT NULL DEFAULT now(),

  CONSTRAINT uq_corpus_chunk_order UNIQUE (turn_id, chunk_type, chunk_order)
);

CREATE INDEX idx_corpus_chunks_turn ON corpus_chunks (turn_id);
CREATE INDEX idx_corpus_chunks_type ON corpus_chunks (turn_id, chunk_type);

-- ── 4. corpus_audio_assets ──

CREATE TABLE corpus_audio_assets (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   uuid         NOT NULL REFERENCES corpus_conversations(id) ON DELETE CASCADE,
  turn_id           uuid         REFERENCES corpus_turns(id) ON DELETE SET NULL,
  chunk_id          uuid         REFERENCES corpus_chunks(id) ON DELETE SET NULL,

  source_type       text         NOT NULL CHECK (source_type IN ('turn', 'chunk')),
  chunk_type        corpus_chunk_type,

  text              text         NOT NULL,
  normalized_text   text         NOT NULL,

  locale            text         NOT NULL DEFAULT 'en',
  voice_id          text,
  speed             real         DEFAULT 1.0,

  asset_url         text,
  status            corpus_asset_status NOT NULL DEFAULT 'pending',
  error_message     text,

  created_at        timestamptz  NOT NULL DEFAULT now(),
  updated_at        timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT uq_corpus_audio_dedupe UNIQUE (normalized_text, source_type, locale)
);

CREATE INDEX idx_corpus_audio_status ON corpus_audio_assets (status) WHERE status = 'pending';
CREATE INDEX idx_corpus_audio_conv ON corpus_audio_assets (conversation_id);

-- ── 5. corpus_translations ──

CREATE TABLE corpus_translations (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id       uuid         NOT NULL REFERENCES corpus_conversations(id) ON DELETE CASCADE,
  turn_id               uuid         NOT NULL REFERENCES corpus_turns(id) ON DELETE CASCADE,

  source_text           text         NOT NULL,
  normalized_source_text text        NOT NULL,
  source_locale         text         NOT NULL DEFAULT 'en',

  target_locale         text         NOT NULL,
  translated_text       text,

  status                corpus_asset_status NOT NULL DEFAULT 'pending',
  error_message         text,

  created_at            timestamptz  NOT NULL DEFAULT now(),
  updated_at            timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT uq_corpus_translation_dedupe UNIQUE (normalized_source_text, source_locale, target_locale)
);

CREATE INDEX idx_corpus_trans_status ON corpus_translations (status) WHERE status = 'pending';
CREATE INDEX idx_corpus_trans_conv ON corpus_translations (conversation_id);
CREATE INDEX idx_corpus_trans_locale ON corpus_translations (target_locale);

-- ── 6. corpus_import_logs ──

CREATE TABLE corpus_import_logs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   uuid         REFERENCES corpus_conversations(id) ON DELETE SET NULL,

  source            corpus_source NOT NULL,
  external_id       text,
  status            text         NOT NULL CHECK (status IN ('success', 'skipped', 'error')),
  skip_reason       text,
  error_message     text,

  created_at        timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX idx_corpus_import_source ON corpus_import_logs (source);
CREATE INDEX idx_corpus_import_status ON corpus_import_logs (status);

-- ── updated_at trigger ──

CREATE OR REPLACE FUNCTION corpus_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_corpus_conversations_updated
  BEFORE UPDATE ON corpus_conversations
  FOR EACH ROW EXECUTE FUNCTION corpus_set_updated_at();

CREATE TRIGGER trg_corpus_audio_assets_updated
  BEFORE UPDATE ON corpus_audio_assets
  FOR EACH ROW EXECUTE FUNCTION corpus_set_updated_at();

CREATE TRIGGER trg_corpus_translations_updated
  BEFORE UPDATE ON corpus_translations
  FOR EACH ROW EXECUTE FUNCTION corpus_set_updated_at();

-- ── RLS (enable, deny by default — admin-only) ──

ALTER TABLE corpus_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE corpus_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE corpus_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE corpus_audio_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE corpus_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE corpus_import_logs ENABLE ROW LEVEL SECURITY;
