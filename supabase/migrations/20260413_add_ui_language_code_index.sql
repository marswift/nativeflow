-- ============================================================================
-- Indexes for locale-aware queries
-- ============================================================================

-- Speed up locale lookup on login (read profile → set cookie).
CREATE INDEX IF NOT EXISTS idx_user_profiles_ui_language_code
  ON public.user_profiles (ui_language_code)
  WHERE ui_language_code IS NOT NULL;

-- Speed up language registry lookups (onboarding page load).
CREATE INDEX IF NOT EXISTS idx_language_registry_status_sort
  ON public.language_registry (status, sort_order)
  WHERE status IN ('active', 'beta');
