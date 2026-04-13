-- Add role column for role-based admin access
-- Roles: 'user' (default), 'staff', 'admin', 'owner'
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';

-- Backfill: existing is_admin=true users become 'owner'
UPDATE user_profiles SET role = 'owner' WHERE is_admin = true AND role = 'user';
