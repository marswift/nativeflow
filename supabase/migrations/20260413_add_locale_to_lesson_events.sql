-- ============================================================================
-- lesson_events.locale: NOT NULL column with FK to language_registry
-- ============================================================================

-- 1. Add locale column. NOT NULL, default 'en' (MVP learners were English).
ALTER TABLE public.lesson_events
  ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'en';

-- 2. FK to language_registry instead of hard CHECK.
--    This allows adding new locales via admin without a migration.
--    language_registry.code already contains 'en', 'ja', 'ko', etc.
ALTER TABLE public.lesson_events
  ADD CONSTRAINT fk_lesson_events_locale
  FOREIGN KEY (locale) REFERENCES public.language_registry(code);

-- 3. Index for per-locale health monitoring queries.
CREATE INDEX IF NOT EXISTS idx_lesson_events_locale
  ON public.lesson_events (locale);

-- 4. Backfill historical rows from user_profiles.ui_language_code.
--    Falls back to 'en' for rows with no matching profile.
--    Only updates rows still at the default to avoid overwriting.
UPDATE public.lesson_events le
SET locale = COALESCE(
  (SELECT up.ui_language_code
   FROM public.user_profiles up
   WHERE up.id = le.user_id
     AND up.ui_language_code IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.language_registry lr WHERE lr.code = up.ui_language_code)),
  'en'
)
WHERE le.locale = 'en';

-- 5. Drop hard CHECK on user_profiles if it was added previously.
--    Replace with FK to language_registry for consistency.
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS chk_user_profiles_ui_language_code;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT fk_user_profiles_ui_language_code
  FOREIGN KEY (ui_language_code) REFERENCES public.language_registry(code);
