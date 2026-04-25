/**
 * Diamond transaction types — used for purchase history and audit.
 *
 * DB table: diamond_transactions (to be created via Supabase migration)
 *
 * CREATE TABLE IF NOT EXISTS diamond_transactions (
 *   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *   user_id uuid NOT NULL,
 *   type text NOT NULL,          -- 'purchase' | 'earn_lesson' | 'earn_event' | 'spend'
 *   diamonds integer NOT NULL,   -- positive = credit, negative = debit
 *   amount_jpy integer,          -- null for non-purchase transactions
 *   source text,                 -- 'stripe' | 'lesson_complete' | 'weekly_challenge' | 'streak_restore' | 'reward_boost'
 *   stripe_session_id text,      -- Stripe checkout session ID (purchases only)
 *   credited_at timestamptz,     -- null until diamonds are credited to user_profiles
 *   created_at timestamptz NOT NULL DEFAULT now()
 * );
 *
 * ALTER TABLE diamond_transactions ENABLE ROW LEVEL SECURITY;
 * CREATE INDEX IF NOT EXISTS idx_diamond_tx_user ON diamond_transactions (user_id, created_at DESC);
 */

export type DiamondTransactionType = 'purchase' | 'earn_lesson' | 'earn_event' | 'spend'

export type DiamondTransactionRow = {
  id: string
  user_id: string
  type: DiamondTransactionType
  diamonds: number
  amount_jpy: number | null
  source: string | null
  stripe_session_id: string | null
  credited_at: string | null
  created_at: string
}
