-- Region registry: single source of truth for regional variants.
-- Replaces hardcoded REGION_MASTER in lib/constants.ts.

CREATE TABLE IF NOT EXISTS public.region_registry (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  region_code text NOT NULL UNIQUE,
  language_code text NOT NULL REFERENCES public.language_registry(code),
  display_name text NOT NULL,
  native_display_name text,
  country_code text,
  city_or_variant text,
  is_default boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'internal', 'beta', 'released', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for runtime queries: filter by language + active status
CREATE INDEX IF NOT EXISTS idx_region_registry_language_status
  ON public.region_registry (language_code, status);

-- Seed currently active regions (matching REGION_MASTER enabled=true entries)
INSERT INTO public.region_registry (region_code, language_code, display_name, native_display_name, country_code, city_or_variant, is_default, status)
VALUES
  ('en_us_new_york',    'en', 'アメリカ / ニューヨーク',    'US / New York',      'US', 'new_york',    false, 'released'),
  ('en_us_los_angeles', 'en', 'アメリカ / ロサンゼルス',    'US / Los Angeles',   'US', 'los_angeles', false, 'released'),
  ('en_gb_london',      'en', 'イギリス / ロンドン',        'UK / London',        'GB', 'london',      false, 'released'),
  ('en_au_sydney',      'en', 'オーストラリア / シドニー',   'AU / Sydney',        'AU', 'sydney',      false, 'released'),
  ('ko_kr_seoul',       'ko', '韓国 / ソウル',              '한국 / 서울',         'KR', 'seoul',       true,  'released')
ON CONFLICT (region_code) DO NOTHING;

-- Grant read access to authenticated users (for runtime queries)
GRANT SELECT ON public.region_registry TO authenticated;
