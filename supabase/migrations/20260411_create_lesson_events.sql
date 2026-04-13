-- lesson_events: runtime event collection for content quality monitoring
-- Used by monitoring / safety-actions pipeline

CREATE TABLE IF NOT EXISTS lesson_events (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  bundle_id     text NOT NULL,
  version_number integer NOT NULL DEFAULT 0,
  age_group     text,
  region        text,
  stage         text,
  event_type    text NOT NULL,
  metadata      jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Index for aggregation queries (bundle + version)
CREATE INDEX IF NOT EXISTS idx_lesson_events_bundle_version
  ON lesson_events (bundle_id, version_number);

-- Index for time-range queries
CREATE INDEX IF NOT EXISTS idx_lesson_events_created_at
  ON lesson_events (created_at);

-- Index for per-user queries
CREATE INDEX IF NOT EXISTS idx_lesson_events_user_id
  ON lesson_events (user_id)
  WHERE user_id IS NOT NULL;
