ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS weekly_challenge_unlocked_at timestamptz;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS weekly_challenge_completed_at timestamptz;
