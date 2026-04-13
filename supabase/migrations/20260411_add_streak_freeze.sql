ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS streak_frozen_date date;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS streak_freeze_expiry timestamptz;
