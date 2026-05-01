-- ============================================================================
-- Content Publish Pipeline (Admin Lifecycle) - Initial Schema
--
-- Purpose:
--   Create Supabase-backed source-of-truth tables for admin draft/validate/publish lifecycle.
--   These tables are lifecycle metadata/content containers and are NOT lesson runtime tables directly.
--
-- Notes:
--   - This migration does not modify lesson runtime code paths.
--   - This migration does not alter lesson_phrases / lesson_conversation_enrichments data.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) content_bundles
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.content_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id text NOT NULL UNIQUE,
  language_code text NOT NULL,
  region_slug text,
  published_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.content_bundles IS
  'Admin content publish lifecycle root entity. Not a direct lesson runtime delivery table.';

COMMENT ON COLUMN public.content_bundles.bundle_id IS
  'Stable logical bundle key used by admin publish lifecycle and referenced by content_versions.';

COMMENT ON COLUMN public.content_bundles.published_version IS
  'Currently published version_number for the bundle (metadata pointer).';

-- ----------------------------------------------------------------------------
-- 2) content_versions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.content_versions (
  id text PRIMARY KEY,
  bundle_id text NOT NULL REFERENCES public.content_bundles(bundle_id) ON DELETE CASCADE,
  version_number text NOT NULL,
  status text NOT NULL CHECK (status IN ('draft', 'validated', 'published', 'archived')),
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  validation jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  validated_at timestamptz,
  published_at timestamptz,
  archived_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  validated_by uuid REFERENCES auth.users(id),
  published_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT content_versions_bundle_version_unique UNIQUE (bundle_id, version_number)
);

COMMENT ON TABLE public.content_versions IS
  'Versioned content payloads and lifecycle state for admin publish flow. Not lesson runtime tables directly.';

COMMENT ON COLUMN public.content_versions.content IS
  'Raw content payload snapshot for the specific version.';

COMMENT ON COLUMN public.content_versions.validation IS
  'Validation result payload (errors/warnings/metadata) captured at validate step.';

-- ----------------------------------------------------------------------------
-- 3) Indexes
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_content_versions_bundle_status
  ON public.content_versions (bundle_id, status);

-- At most one published version per bundle.
CREATE UNIQUE INDEX IF NOT EXISTS idx_content_versions_one_published_per_bundle
  ON public.content_versions (bundle_id)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_content_bundles_language_code
  ON public.content_bundles (language_code);

CREATE INDEX IF NOT EXISTS idx_content_bundles_region_slug
  ON public.content_bundles (region_slug);

-- ----------------------------------------------------------------------------
-- 4) updated_at trigger (minimal local convention)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_content_bundles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_content_bundles_touch_updated_at'
  ) THEN
    CREATE TRIGGER trg_content_bundles_touch_updated_at
    BEFORE UPDATE ON public.content_bundles
    FOR EACH ROW
    EXECUTE FUNCTION public.touch_content_bundles_updated_at();
  END IF;
END
$$;

-- updated_at trigger for content_versions (same pattern)
CREATE OR REPLACE FUNCTION public.touch_content_versions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_content_versions_touch_updated_at'
  ) THEN
    CREATE TRIGGER trg_content_versions_touch_updated_at
    BEFORE UPDATE ON public.content_versions
    FOR EACH ROW
    EXECUTE FUNCTION public.touch_content_versions_updated_at();
  END IF;
END
$$;

-- ----------------------------------------------------------------------------
-- 5) RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.content_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_versions ENABLE ROW LEVEL SECURITY;

-- Restrictive by default:
-- No policies are created here intentionally.
-- Result:
--   - anon/authenticated cannot read/write these tables.
--   - service_role/admin backend flows can manage writes via server-side access.

