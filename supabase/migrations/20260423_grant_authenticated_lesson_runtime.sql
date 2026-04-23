-- Grant authenticated role access to lesson runtime tables
-- These tables are queried from the browser client during lesson sessions

-- Lesson tracking: INSERT new runs + UPDATE progress
GRANT INSERT, UPDATE ON public.lesson_runs TO authenticated;
GRANT INSERT, UPDATE ON public.lesson_run_items TO authenticated;
GRANT INSERT, UPDATE ON public.daily_stats TO authenticated;

-- Review system: full CRUD for own review items
GRANT INSERT, UPDATE, DELETE ON public.review_items TO authenticated;

-- Pronunciation scoring: INSERT new scores
GRANT INSERT ON public.pronunciation_scores TO authenticated;

-- Lesson events: INSERT + SELECT own events
GRANT SELECT, INSERT ON public.lesson_events TO authenticated;

-- Lesson content tables: read-only for authenticated users
GRANT SELECT ON public.lesson_scenes TO authenticated;
GRANT SELECT ON public.lesson_phrases TO authenticated;
GRANT SELECT ON public.lesson_phrase_variations TO authenticated;
GRANT SELECT ON public.lesson_semantic_chunks TO authenticated;
GRANT SELECT ON public.lesson_conversation_enrichments TO authenticated;
GRANT SELECT ON public.lesson_core_chunks TO authenticated;
GRANT SELECT ON public.lesson_related_expressions TO authenticated;

-- Announcements: read-only for all roles
GRANT SELECT ON public.announcements TO authenticated;
GRANT SELECT ON public.announcements TO anon;
