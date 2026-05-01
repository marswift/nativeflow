-- ============================================================================
-- Seed: minimal lesson content for DB-delivery verification
--
-- Scene: wake_up / beginner / en
-- Purpose: verify that SupabaseLessonContentRepository returns DB rows
--          instead of object-catalog fallback
--
-- SAFETY:
--   1. Deactivate any existing active rows for same natural key first
--   2. Insert with is_active = true, content_version = 'seed_v1'
--   3. Uses ON CONFLICT DO NOTHING on insert (idempotent)
--
-- ROLLBACK:
--   UPDATE lesson_phrases SET is_active = false WHERE content_version = 'seed_v1';
--   DELETE FROM lesson_phrases WHERE content_version = 'seed_v1';
-- ============================================================================

-- Step 0: Ensure lesson_scenes has wake_up
INSERT INTO lesson_scenes (scene_key, scene_category, label_ja, label_en)
VALUES ('wake_up', 'daily-flow', '起床', 'Wake Up')
ON CONFLICT (scene_key) DO NOTHING;

-- Step 1: Deactivate any existing active rows for this natural key
UPDATE lesson_phrases
SET is_active = false, updated_at = now()
WHERE scene_key = 'wake_up'
  AND level_band = 'beginner'
  AND language_code = 'en'
  AND is_active = true;

-- Step 2: Insert test phrase (matching object catalog content exactly)
INSERT INTO lesson_phrases (
  scene_id,
  scene_key,
  level_band,
  language_code,
  conversation_answer,
  typing_answer,
  review_prompt,
  ai_conversation_prompt,
  native_hint,
  native_hint_tts,
  mix_hint,
  ai_question_text,
  tts_text,
  content_version,
  is_active
)
SELECT
  s.id,
  'wake_up',
  'beginner',
  'en',
  'I just woke up.',
  'I just woke up.',
  'Review the basic wake-up phrase for this scene.',
  'Tell the AI what time you usually wake up.',
  '今、起きたところです。',
  NULL,
  'I 起きたところです。',
  'What time did you wake up?',
  NULL,
  'seed_v1',
  true
FROM lesson_scenes s
WHERE s.scene_key = 'wake_up'
ON CONFLICT (scene_key, level_band, language_code) DO UPDATE SET
  conversation_answer = EXCLUDED.conversation_answer,
  typing_answer = EXCLUDED.typing_answer,
  review_prompt = EXCLUDED.review_prompt,
  ai_conversation_prompt = EXCLUDED.ai_conversation_prompt,
  native_hint = EXCLUDED.native_hint,
  mix_hint = EXCLUDED.mix_hint,
  ai_question_text = EXCLUDED.ai_question_text,
  content_version = EXCLUDED.content_version,
  is_active = true,
  updated_at = now();

-- Step 3: Insert semantic chunks for this phrase
INSERT INTO lesson_semantic_chunks (phrase_id, chunk, meaning, chunk_kind, sort_order, is_active)
SELECT
  p.id,
  'just woke up',
  '起きたばかり',
  'phrase',
  0,
  true
FROM lesson_phrases p
WHERE p.scene_key = 'wake_up'
  AND p.level_band = 'beginner'
  AND p.language_code = 'en'
  AND p.content_version = 'seed_v1'
ON CONFLICT DO NOTHING;

-- Step 4: Deactivate existing enrichment for same natural key
UPDATE lesson_conversation_enrichments
SET is_active = false, updated_at = now()
WHERE scene_key = 'wake_up'
  AND region_slug = 'en_us_general'
  AND age_group = '20s'
  AND level_band = 'beginner'
  AND is_active = true;

-- Step 5: Insert test enrichment
INSERT INTO lesson_conversation_enrichments (
  scene_id,
  scene_key,
  region_slug,
  age_group,
  level_band,
  ai_question_text,
  ai_conversation_opener,
  typing_variations,
  flavor,
  content_version,
  is_active
)
SELECT
  s.id,
  'wake_up',
  'en_us_general',
  '20s',
  'beginner',
  'What time did you wake up?',
  'Good morning! Did you sleep well?',
  '["I just woke up.", "I''m up.", "I just got up."]'::jsonb,
  '{"setting": "bedroom", "topics": ["morning routine", "alarm"]}'::jsonb,
  'seed_v1',
  true
FROM lesson_scenes s
WHERE s.scene_key = 'wake_up'
ON CONFLICT (scene_key, region_slug, age_group, level_band) DO UPDATE SET
  ai_question_text = EXCLUDED.ai_question_text,
  ai_conversation_opener = EXCLUDED.ai_conversation_opener,
  typing_variations = EXCLUDED.typing_variations,
  flavor = EXCLUDED.flavor,
  content_version = EXCLUDED.content_version,
  is_active = true,
  updated_at = now();

-- Step 6: Insert core chunks for the enrichment
INSERT INTO lesson_core_chunks (enrichment_id, chunk, meaning, sort_order)
SELECT
  e.id,
  'just woke up',
  '起きたばかり',
  0
FROM lesson_conversation_enrichments e
WHERE e.scene_key = 'wake_up'
  AND e.region_slug = 'en_us_general'
  AND e.age_group = '20s'
  AND e.level_band = 'beginner'
  AND e.content_version = 'seed_v1'
ON CONFLICT DO NOTHING;

-- Verification query (run after seed to confirm):
-- SELECT scene_key, level_band, is_active, content_version, conversation_answer
-- FROM lesson_phrases
-- WHERE scene_key = 'wake_up' AND level_band = 'beginner';
--
-- Expected: one row with is_active=true, content_version='seed_v1'
--
-- After lesson load, check browser console for:
-- [CONTENT_RESOLVE] — should NOT appear for wake_up (means DB was used, not fallback)
-- [LESSON_CONTENT_SOURCE] DB-backed repo set — should appear
