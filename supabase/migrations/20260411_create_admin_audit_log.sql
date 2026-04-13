-- Admin audit log: append-only, service-role write only
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_user_id uuid NOT NULL,
  target_user_id uuid,
  event_type text NOT NULL,
  before_value jsonb,
  after_value jsonb,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON admin_audit_log (actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_event ON admin_audit_log (event_type, created_at DESC);
