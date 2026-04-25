-- Add credited_at to track whether diamonds have actually been credited to user_profiles.
-- null = transaction row exists but credit not yet applied (retry-safe).
-- non-null = credit applied successfully.
ALTER TABLE diamond_transactions
ADD COLUMN IF NOT EXISTS credited_at timestamptz;
