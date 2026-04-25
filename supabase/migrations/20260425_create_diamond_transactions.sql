-- Diamond transaction ledger: append-only record of all diamond credits/debits
CREATE TABLE IF NOT EXISTS diamond_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  type text NOT NULL,              -- 'purchase' | 'earn_lesson' | 'earn_event' | 'spend'
  diamonds integer NOT NULL,       -- positive = credit, negative = debit
  amount_jpy integer,              -- null for non-purchase transactions
  source text,                     -- 'stripe' | 'lesson_complete' | 'weekly_challenge' | 'streak_restore' | 'reward_boost'
  stripe_session_id text,          -- Stripe checkout session ID (purchases only)
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE diamond_transactions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_diamond_tx_user ON diamond_transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_diamond_tx_stripe ON diamond_transactions (stripe_session_id) WHERE stripe_session_id IS NOT NULL;
