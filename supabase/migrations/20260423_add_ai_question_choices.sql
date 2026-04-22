-- Add ai_question_choices column to lesson_conversation_enrichments
-- Stores pre-authored comprehension quiz choices as JSONB array
-- Shape: [{ "label": "...", "isCorrect": true/false }, ...]

ALTER TABLE public.lesson_conversation_enrichments
ADD COLUMN IF NOT EXISTS ai_question_choices jsonb DEFAULT NULL;
