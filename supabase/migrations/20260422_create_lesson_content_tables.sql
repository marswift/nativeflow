-- Lesson Content Tables
-- Matches types in lib/lesson-content-schema.ts
-- Used by SupabaseLessonContentRepository

-- ══════════════════════════════════════════════════════════════════════════════
-- lesson_scenes — scene registry
-- ══════════════════════════════════════════════════════════════════════════════

create table if not exists lesson_scenes (
  id          uuid primary key default gen_random_uuid(),
  scene_key   text not null,
  scene_category text not null default 'daily-flow',
  label_ja    text not null,
  label_en    text not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint lesson_scenes_scene_key_unique unique (scene_key)
);

create index if not exists idx_lesson_scenes_active
  on lesson_scenes (is_active) where is_active = true;

-- ══════════════════════════════════════════════════════════════════════════════
-- lesson_phrases — base phrase content per scene + level
-- ══════════════════════════════════════════════════════════════════════════════

create table if not exists lesson_phrases (
  id                     uuid primary key default gen_random_uuid(),
  scene_id               uuid not null references lesson_scenes(id) on delete cascade,
  scene_key              text not null,
  level_band             text not null check (level_band in ('beginner', 'intermediate', 'advanced')),
  language_code          text not null default 'en',

  conversation_answer    text not null,
  typing_answer          text not null,
  review_prompt          text not null,
  ai_conversation_prompt text not null,

  native_hint            text not null,
  native_hint_tts        text,
  mix_hint               text not null,

  ai_question_text       text not null,
  tts_text               text,

  content_version        text not null default '1',
  is_active              boolean not null default true,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  constraint lesson_phrases_scene_level_lang_unique
    unique (scene_key, level_band, language_code)
);

-- Primary lookup: scene_key + level_band (used by getScenePhrase)
create index if not exists idx_lesson_phrases_scene_level
  on lesson_phrases (scene_key, level_band) where is_active = true;

-- Reverse lookup: conversation_answer (used by lookupByAnswer)
create index if not exists idx_lesson_phrases_answer
  on lesson_phrases (lower(conversation_answer)) where is_active = true;

-- ══════════════════════════════════════════════════════════════════════════════
-- lesson_phrase_variations — alternative wordings per phrase
-- ══════════════════════════════════════════════════════════════════════════════

create table if not exists lesson_phrase_variations (
  id                  uuid primary key default gen_random_uuid(),
  phrase_id           uuid not null references lesson_phrases(id) on delete cascade,
  sort_order          int not null default 0,

  conversation_answer text not null,
  typing_answer       text not null,
  native_hint         text not null,
  mix_hint            text not null,

  is_active           boolean not null default true,
  created_at          timestamptz not null default now()
);

create index if not exists idx_lesson_phrase_variations_phrase
  on lesson_phrase_variations (phrase_id) where is_active = true;

-- ══════════════════════════════════════════════════════════════════════════════
-- lesson_semantic_chunks — vocabulary chunks per phrase
-- ══════════════════════════════════════════════════════════════════════════════

create table if not exists lesson_semantic_chunks (
  id           uuid primary key default gen_random_uuid(),
  phrase_id    uuid not null references lesson_phrases(id) on delete cascade,

  chunk        text not null,
  meaning      text not null,
  chunk_kind   text not null default 'phrase'
               check (chunk_kind in ('phrase', 'verb', 'noun', 'adjective', 'adverb', 'preposition')),
  importance   int,
  meaning_tts  text,

  sort_order   int not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

create index if not exists idx_lesson_semantic_chunks_phrase
  on lesson_semantic_chunks (phrase_id) where is_active = true;

-- ══════════════════════════════════════════════════════════════════════════════
-- lesson_conversation_enrichments — region/age-specific enrichments
-- ══════════════════════════════════════════════════════════════════════════════

create table if not exists lesson_conversation_enrichments (
  id                      uuid primary key default gen_random_uuid(),
  scene_id                uuid not null references lesson_scenes(id) on delete cascade,
  scene_key               text not null,
  region_slug             text not null,
  age_group               text not null,
  level_band              text not null check (level_band in ('beginner', 'intermediate', 'advanced')),

  ai_question_text        text not null,
  ai_conversation_opener  text not null,
  typing_variations       jsonb not null default '[]'::jsonb,

  flavor                  jsonb,

  content_version         text not null default '1',
  is_active               boolean not null default true,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  constraint lesson_enrichments_natural_key_unique
    unique (scene_key, region_slug, age_group, level_band)
);

-- Primary lookup (used by getConversationEnrichment)
create index if not exists idx_lesson_enrichments_lookup
  on lesson_conversation_enrichments (scene_key, region_slug, age_group, level_band)
  where is_active = true;

-- ══════════════════════════════════════════════════════════════════════════════
-- lesson_core_chunks — enrichment-level vocabulary chunks
-- ══════════════════════════════════════════════════════════════════════════════

create table if not exists lesson_core_chunks (
  id             uuid primary key default gen_random_uuid(),
  enrichment_id  uuid not null references lesson_conversation_enrichments(id) on delete cascade,
  chunk          text not null,
  meaning        text not null,
  sort_order     int not null default 0
);

create index if not exists idx_lesson_core_chunks_enrichment
  on lesson_core_chunks (enrichment_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- lesson_related_expressions — related expressions per enrichment
-- ══════════════════════════════════════════════════════════════════════════════

create table if not exists lesson_related_expressions (
  id              uuid primary key default gen_random_uuid(),
  enrichment_id   uuid not null references lesson_conversation_enrichments(id) on delete cascade,

  expression_en   text not null,
  expression_ja   text not null,
  category        text not null default 'action'
                  check (category in ('action', 'follow-up', 'support')),
  ja_tts          text,

  sort_order      int not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

create index if not exists idx_lesson_related_expressions_enrichment
  on lesson_related_expressions (enrichment_id) where is_active = true;

-- ══════════════════════════════════════════════════════════════════════════════
-- RLS — enable row-level security (public read, no anon write)
-- ══════════════════════════════════════════════════════════════════════════════

alter table lesson_scenes enable row level security;
alter table lesson_phrases enable row level security;
alter table lesson_phrase_variations enable row level security;
alter table lesson_semantic_chunks enable row level security;
alter table lesson_conversation_enrichments enable row level security;
alter table lesson_core_chunks enable row level security;
alter table lesson_related_expressions enable row level security;

-- Read-only access for authenticated users
create policy "lesson_scenes_read" on lesson_scenes for select to authenticated using (true);
create policy "lesson_phrases_read" on lesson_phrases for select to authenticated using (true);
create policy "lesson_phrase_variations_read" on lesson_phrase_variations for select to authenticated using (true);
create policy "lesson_semantic_chunks_read" on lesson_semantic_chunks for select to authenticated using (true);
create policy "lesson_conversation_enrichments_read" on lesson_conversation_enrichments for select to authenticated using (true);
create policy "lesson_core_chunks_read" on lesson_core_chunks for select to authenticated using (true);
create policy "lesson_related_expressions_read" on lesson_related_expressions for select to authenticated using (true);
