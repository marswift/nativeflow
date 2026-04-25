-- Atomic diamond crediting: updates user_profiles.total_diamonds and
-- diamond_transactions.credited_at in a single transaction.
-- Prevents double-credit on webhook retries.
CREATE OR REPLACE FUNCTION credit_diamonds(
  p_user_id uuid,
  p_tx_id uuid,
  p_diamonds integer
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_rows integer;
BEGIN
  -- Guard: only credit if credited_at is still null (idempotency)
  UPDATE diamond_transactions
  SET credited_at = now()
  WHERE id = p_tx_id
    AND credited_at IS NULL;

  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;

  IF v_updated_rows = 0 THEN
    RAISE EXCEPTION 'credit_diamonds: transaction % already credited or not found', p_tx_id;
  END IF;

  -- Credit diamonds
  UPDATE user_profiles
  SET total_diamonds = COALESCE(total_diamonds, 0) + p_diamonds
  WHERE id = p_user_id;
END;
$$;
