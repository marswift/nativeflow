-- Add difficulty_score to corpus_conversations and corpus_turns.
-- Nullable smallint 0-100. Higher = harder. Corpus-only metadata.
-- Applied: 2026-04-09

ALTER TABLE corpus_conversations ADD COLUMN IF NOT EXISTS difficulty_score smallint;
ALTER TABLE corpus_turns ADD COLUMN IF NOT EXISTS difficulty_score smallint;

COMMENT ON COLUMN corpus_conversations.difficulty_score IS 'Computed difficulty 0-100. Higher = harder.';
COMMENT ON COLUMN corpus_turns.difficulty_score IS 'Computed difficulty 0-100. Higher = harder.';
