ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;
