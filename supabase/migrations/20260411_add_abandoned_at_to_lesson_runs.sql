-- Add abandoned_at column and update status check for lesson_runs
ALTER TABLE lesson_runs ADD COLUMN IF NOT EXISTS abandoned_at timestamptz;
