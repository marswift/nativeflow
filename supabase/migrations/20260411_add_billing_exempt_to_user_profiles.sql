-- Billing exemption columns for admin-granted free access
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS billing_exempt boolean NOT NULL DEFAULT false;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS billing_exempt_until timestamptz;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS billing_exempt_reason text;

-- Backfill: internal users (owner/admin/staff) get billing exemption
UPDATE user_profiles SET billing_exempt = true, billing_exempt_reason = 'internal'
WHERE role IN ('owner', 'admin', 'staff') AND billing_exempt = false;
