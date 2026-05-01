-- ============================================================================
-- Seed: ALL preloaded scenes for DB-delivery verification
--
-- Scenes: wake_up, eat_breakfast, leave_home, talk_with_friends, go_to_bed
-- Level: beginner only (MVP)
-- Language: en
-- Region: en_us_general / age_group: 20s
--
-- ROLLBACK:
--   UPDATE lesson_phrases SET is_active = false WHERE content_version = 'seed_v1';
--   UPDATE lesson_conversation_enrichments SET is_active = false WHERE content_version = 'seed_v1';
-- ============================================================================

-- ═══════════════════════════════════════════════════════════════════════════
-- Step 0: Ensure lesson_scenes rows exist (idempotent)
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO lesson_scenes (scene_key, scene_category, label_ja, label_en) VALUES
  ('wake_up',           'daily-flow', '起床',           'Wake Up'),
  ('eat_breakfast',     'daily-flow', '朝食を食べる',   'Eat Breakfast'),
  ('get_ready_to_leave',        'daily-flow', '出発準備',       'Get Ready to Leave'),
  ('talk_with_friends', 'daily-flow', '友人との会話',   'Talk with Friends'),
  ('go_to_bed',         'daily-flow', '就寝',           'Go to Bed')
ON CONFLICT (scene_key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- Step 1: Deactivate existing active phrases for these natural keys
-- ═══════════════════════════════════════════════════════════════════════════

UPDATE lesson_phrases SET is_active = false, updated_at = now()
WHERE scene_key IN ('wake_up', 'eat_breakfast', 'get_ready_to_leave', 'talk_with_friends', 'go_to_bed')
  AND level_band = 'beginner' AND language_code = 'en' AND is_active = true;

-- ═══════════════════════════════════════════════════════════════════════════
-- Step 2: Insert / upsert phrases
-- ═══════════════════════════════════════════════════════════════════════════

-- wake_up / beginner
INSERT INTO lesson_phrases (scene_id, scene_key, level_band, language_code,
  conversation_answer, typing_answer, review_prompt, ai_conversation_prompt,
  native_hint, native_hint_tts, mix_hint, ai_question_text, tts_text,
  content_version, is_active)
SELECT s.id, 'wake_up', 'beginner', 'en',
  'I just woke up.', 'I just woke up.',
  'Review the basic wake-up phrase for this scene.',
  'Tell the AI what time you usually wake up.',
  '今、起きたところです。', NULL, 'I 起きたところです。',
  'What time did you wake up?', NULL,
  'seed_v1', true
FROM lesson_scenes s WHERE s.scene_key = 'wake_up'
ON CONFLICT (scene_key, level_band, language_code) DO UPDATE SET
  conversation_answer = EXCLUDED.conversation_answer,
  typing_answer = EXCLUDED.typing_answer,
  review_prompt = EXCLUDED.review_prompt,
  ai_conversation_prompt = EXCLUDED.ai_conversation_prompt,
  native_hint = EXCLUDED.native_hint,
  mix_hint = EXCLUDED.mix_hint,
  ai_question_text = EXCLUDED.ai_question_text,
  content_version = EXCLUDED.content_version,
  is_active = true, updated_at = now();

-- eat_breakfast / beginner
INSERT INTO lesson_phrases (scene_id, scene_key, level_band, language_code,
  conversation_answer, typing_answer, review_prompt, ai_conversation_prompt,
  native_hint, native_hint_tts, mix_hint, ai_question_text, tts_text,
  content_version, is_active)
SELECT s.id, 'eat_breakfast', 'beginner', 'en',
  'I eat breakfast at home.', 'I eat breakfast at home.',
  'Review a simple breakfast sentence.',
  'Tell the AI what you eat for breakfast.',
  '家で朝食を食べます。', NULL, 'I 朝食を食べます at home.',
  'What do you eat for breakfast?', NULL,
  'seed_v1', true
FROM lesson_scenes s WHERE s.scene_key = 'eat_breakfast'
ON CONFLICT (scene_key, level_band, language_code) DO UPDATE SET
  conversation_answer = EXCLUDED.conversation_answer,
  typing_answer = EXCLUDED.typing_answer,
  review_prompt = EXCLUDED.review_prompt,
  ai_conversation_prompt = EXCLUDED.ai_conversation_prompt,
  native_hint = EXCLUDED.native_hint,
  mix_hint = EXCLUDED.mix_hint,
  ai_question_text = EXCLUDED.ai_question_text,
  content_version = EXCLUDED.content_version,
  is_active = true, updated_at = now();

-- leave_home / beginner
INSERT INTO lesson_phrases (scene_id, scene_key, level_band, language_code,
  conversation_answer, typing_answer, review_prompt, ai_conversation_prompt,
  native_hint, native_hint_tts, mix_hint, ai_question_text, tts_text,
  content_version, is_active)
SELECT s.id, 'get_ready_to_leave', 'beginner', 'en',
  'I grab my bag and head out.', 'I grab my bag and head out.',
  'Review a simple leaving-home phrase.',
  'Tell the AI what you do before leaving the house.',
  'カバン持って出かける。', NULL, 'I カバン持って head out.',
  'Are you ready to go?', NULL,
  'seed_v1', true
FROM lesson_scenes s WHERE s.scene_key = 'get_ready_to_leave'
ON CONFLICT (scene_key, level_band, language_code) DO UPDATE SET
  conversation_answer = EXCLUDED.conversation_answer,
  typing_answer = EXCLUDED.typing_answer,
  review_prompt = EXCLUDED.review_prompt,
  ai_conversation_prompt = EXCLUDED.ai_conversation_prompt,
  native_hint = EXCLUDED.native_hint,
  mix_hint = EXCLUDED.mix_hint,
  ai_question_text = EXCLUDED.ai_question_text,
  content_version = EXCLUDED.content_version,
  is_active = true, updated_at = now();

-- talk_with_friends / beginner
INSERT INTO lesson_phrases (scene_id, scene_key, level_band, language_code,
  conversation_answer, typing_answer, review_prompt, ai_conversation_prompt,
  native_hint, native_hint_tts, mix_hint, ai_question_text, tts_text,
  content_version, is_active)
SELECT s.id, 'talk_with_friends', 'beginner', 'en',
  'I talked with my friend today.', 'I talked with my friend.',
  'Review a simple socializing sentence.',
  'Tell the AI about a recent conversation with a friend.',
  '今日友達と話した。', NULL, 'I 友達と talked today.',
  'Who did you talk to today?', NULL,
  'seed_v1', true
FROM lesson_scenes s WHERE s.scene_key = 'talk_with_friends'
ON CONFLICT (scene_key, level_band, language_code) DO UPDATE SET
  conversation_answer = EXCLUDED.conversation_answer,
  typing_answer = EXCLUDED.typing_answer,
  review_prompt = EXCLUDED.review_prompt,
  ai_conversation_prompt = EXCLUDED.ai_conversation_prompt,
  native_hint = EXCLUDED.native_hint,
  mix_hint = EXCLUDED.mix_hint,
  ai_question_text = EXCLUDED.ai_question_text,
  content_version = EXCLUDED.content_version,
  is_active = true, updated_at = now();

-- go_to_bed / beginner
INSERT INTO lesson_phrases (scene_id, scene_key, level_band, language_code,
  conversation_answer, typing_answer, review_prompt, ai_conversation_prompt,
  native_hint, native_hint_tts, mix_hint, ai_question_text, tts_text,
  content_version, is_active)
SELECT s.id, 'go_to_bed', 'beginner', 'en',
  'I go to bed at eleven.', 'I go to bed at eleven.',
  'Review a basic bedtime sentence.',
  'Tell the AI what time you usually go to bed.',
  '11時に寝ます。', NULL, 'I 寝ます at eleven.',
  'When do you go to bed?', NULL,
  'seed_v1', true
FROM lesson_scenes s WHERE s.scene_key = 'go_to_bed'
ON CONFLICT (scene_key, level_band, language_code) DO UPDATE SET
  conversation_answer = EXCLUDED.conversation_answer,
  typing_answer = EXCLUDED.typing_answer,
  review_prompt = EXCLUDED.review_prompt,
  ai_conversation_prompt = EXCLUDED.ai_conversation_prompt,
  native_hint = EXCLUDED.native_hint,
  mix_hint = EXCLUDED.mix_hint,
  ai_question_text = EXCLUDED.ai_question_text,
  content_version = EXCLUDED.content_version,
  is_active = true, updated_at = now();

-- ═══════════════════════════════════════════════════════════════════════════
-- Step 3: Semantic chunks (one per scene/beginner)
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO lesson_semantic_chunks (phrase_id, chunk, meaning, chunk_kind, sort_order, is_active)
SELECT p.id, c.chunk, c.meaning, 'phrase', c.sort_order, true
FROM (VALUES
  ('wake_up',           'just woke up',       '起きたばかり',     0),
  ('eat_breakfast',     'eat breakfast',       '朝食を食べる',     0),
  ('get_ready_to_leave',        'grab my bag',         'カバンを持つ',     0),
  ('talk_with_friends', 'talk with a friend',  '友達と話す',       0),
  ('go_to_bed',         'go to bed',           '寝る',             0)
) AS c(scene_key, chunk, meaning, sort_order)
JOIN lesson_phrases p ON p.scene_key = c.scene_key
  AND p.level_band = 'beginner' AND p.language_code = 'en'
  AND p.content_version = 'seed_v1'
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- Step 4: Deactivate existing enrichments
-- ═══════════════════════════════════════════════════════════════════════════

UPDATE lesson_conversation_enrichments SET is_active = false, updated_at = now()
WHERE scene_key IN ('wake_up', 'eat_breakfast', 'get_ready_to_leave', 'talk_with_friends', 'go_to_bed')
  AND region_slug = 'en_us_general' AND age_group = '20s' AND level_band = 'beginner'
  AND is_active = true;

-- ═══════════════════════════════════════════════════════════════════════════
-- Step 5: Insert / upsert enrichments
-- ═══════════════════════════════════════════════════════════════════════════

-- wake_up
INSERT INTO lesson_conversation_enrichments (scene_id, scene_key, region_slug, age_group, level_band,
  ai_question_text, ai_conversation_opener, typing_variations, flavor, content_version, is_active)
SELECT s.id, 'wake_up', 'en_us_general', '20s', 'beginner',
  'What time did you wake up?', 'Good morning! Did you sleep well?',
  '["I just woke up.", "I''m up.", "I just got up."]'::jsonb,
  '{"setting":"bedroom","topics":["morning routine","alarm"]}'::jsonb,
  'seed_v1', true
FROM lesson_scenes s WHERE s.scene_key = 'wake_up'
ON CONFLICT (scene_key, region_slug, age_group, level_band) DO UPDATE SET
  ai_question_text = EXCLUDED.ai_question_text, ai_conversation_opener = EXCLUDED.ai_conversation_opener,
  typing_variations = EXCLUDED.typing_variations, flavor = EXCLUDED.flavor,
  content_version = EXCLUDED.content_version, is_active = true, updated_at = now();

-- eat_breakfast
INSERT INTO lesson_conversation_enrichments (scene_id, scene_key, region_slug, age_group, level_band,
  ai_question_text, ai_conversation_opener, typing_variations, flavor, content_version, is_active)
SELECT s.id, 'eat_breakfast', 'en_us_general', '20s', 'beginner',
  'What do you eat for breakfast?', 'Morning! What did you have for breakfast?',
  '["I eat breakfast at home.", "I had toast and coffee.", "I had rice and miso soup."]'::jsonb,
  '{"setting":"kitchen","topics":["breakfast","food"]}'::jsonb,
  'seed_v1', true
FROM lesson_scenes s WHERE s.scene_key = 'eat_breakfast'
ON CONFLICT (scene_key, region_slug, age_group, level_band) DO UPDATE SET
  ai_question_text = EXCLUDED.ai_question_text, ai_conversation_opener = EXCLUDED.ai_conversation_opener,
  typing_variations = EXCLUDED.typing_variations, flavor = EXCLUDED.flavor,
  content_version = EXCLUDED.content_version, is_active = true, updated_at = now();

-- leave_home
INSERT INTO lesson_conversation_enrichments (scene_id, scene_key, region_slug, age_group, level_band,
  ai_question_text, ai_conversation_opener, typing_variations, flavor, content_version, is_active)
SELECT s.id, 'get_ready_to_leave', 'en_us_general', '20s', 'beginner',
  'Are you ready to go?', 'Time to head out! Got everything?',
  '["I grab my bag and head out.", "OK, I''m heading out.", "Time to go!"]'::jsonb,
  '{"setting":"entrance","topics":["commute","morning"]}'::jsonb,
  'seed_v1', true
FROM lesson_scenes s WHERE s.scene_key = 'get_ready_to_leave'
ON CONFLICT (scene_key, region_slug, age_group, level_band) DO UPDATE SET
  ai_question_text = EXCLUDED.ai_question_text, ai_conversation_opener = EXCLUDED.ai_conversation_opener,
  typing_variations = EXCLUDED.typing_variations, flavor = EXCLUDED.flavor,
  content_version = EXCLUDED.content_version, is_active = true, updated_at = now();

-- talk_with_friends
INSERT INTO lesson_conversation_enrichments (scene_id, scene_key, region_slug, age_group, level_band,
  ai_question_text, ai_conversation_opener, typing_variations, flavor, content_version, is_active)
SELECT s.id, 'talk_with_friends', 'en_us_general', '20s', 'beginner',
  'Who did you talk to today?', 'Hey! Did you hang out with anyone today?',
  '["I talked with my friend today.", "I hung out with a friend.", "I chatted with a friend."]'::jsonb,
  '{"setting":"outdoors","topics":["friends","social"]}'::jsonb,
  'seed_v1', true
FROM lesson_scenes s WHERE s.scene_key = 'talk_with_friends'
ON CONFLICT (scene_key, region_slug, age_group, level_band) DO UPDATE SET
  ai_question_text = EXCLUDED.ai_question_text, ai_conversation_opener = EXCLUDED.ai_conversation_opener,
  typing_variations = EXCLUDED.typing_variations, flavor = EXCLUDED.flavor,
  content_version = EXCLUDED.content_version, is_active = true, updated_at = now();

-- go_to_bed
INSERT INTO lesson_conversation_enrichments (scene_id, scene_key, region_slug, age_group, level_band,
  ai_question_text, ai_conversation_opener, typing_variations, flavor, content_version, is_active)
SELECT s.id, 'go_to_bed', 'en_us_general', '20s', 'beginner',
  'When do you go to bed?', 'Getting sleepy? What time do you usually go to bed?',
  '["I go to bed at eleven.", "I hit the bed around eleven.", "I try to sleep by midnight."]'::jsonb,
  '{"setting":"bedroom","topics":["sleep","night routine"]}'::jsonb,
  'seed_v1', true
FROM lesson_scenes s WHERE s.scene_key = 'go_to_bed'
ON CONFLICT (scene_key, region_slug, age_group, level_band) DO UPDATE SET
  ai_question_text = EXCLUDED.ai_question_text, ai_conversation_opener = EXCLUDED.ai_conversation_opener,
  typing_variations = EXCLUDED.typing_variations, flavor = EXCLUDED.flavor,
  content_version = EXCLUDED.content_version, is_active = true, updated_at = now();

-- ═══════════════════════════════════════════════════════════════════════════
-- Step 6: Core chunks for enrichments
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO lesson_core_chunks (enrichment_id, chunk, meaning, sort_order)
SELECT e.id, c.chunk, c.meaning, c.sort_order
FROM (VALUES
  ('wake_up',           'just woke up',       '起きたばかり',   0),
  ('eat_breakfast',     'eat breakfast',       '朝食を食べる',   0),
  ('get_ready_to_leave',        'grab my bag',         'カバンを持つ',   0),
  ('talk_with_friends', 'talk with a friend',  '友達と話す',     0),
  ('go_to_bed',         'go to bed',           '寝る',           0)
) AS c(scene_key, chunk, meaning, sort_order)
JOIN lesson_conversation_enrichments e ON e.scene_key = c.scene_key
  AND e.region_slug = 'en_us_general' AND e.age_group = '20s' AND e.level_band = 'beginner'
  AND e.content_version = 'seed_v1'
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- Verification queries
-- ═══════════════════════════════════════════════════════════════════════════

-- SELECT scene_key, is_active, content_version FROM lesson_phrases
-- WHERE level_band = 'beginner' AND language_code = 'en' AND is_active = true
-- ORDER BY scene_key;
-- Expected: 5 rows, all seed_v1

-- SELECT scene_key, is_active, content_version FROM lesson_conversation_enrichments
-- WHERE level_band = 'beginner' AND region_slug = 'en_us_general' AND is_active = true
-- ORDER BY scene_key;
-- Expected: 5 rows, all seed_v1

-- Browser console after lesson load:
-- [CONTENT_RESOLVE] phrase DB hit scene=wake_up ...
-- [CONTENT_RESOLVE] phrase DB hit scene=eat_breakfast ...
-- [CONTENT_RESOLVE] phrase DB hit scene=leave_home ...
-- [CONTENT_RESOLVE] phrase DB hit scene=talk_with_friends ...
-- [CONTENT_RESOLVE] phrase DB hit scene=go_to_bed ...
-- NO "[CONTENT_RESOLVE] phrase fallback" for any of these 5 scenes.
