-- RPC atómico para importación CSV: todos los rows o ninguno.
-- Reemplaza el createBatch chunkeado no atómico del service.
CREATE OR REPLACE FUNCTION public.rpc_transactions_batch_insert(
  p_transactions JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_count   INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF jsonb_array_length(p_transactions) = 0 THEN
    RETURN jsonb_build_object('inserted', 0);
  END IF;

  INSERT INTO public.transactions
    (user_id, description, amount, type, currency, crypto_type,
     category_id, wallet_id, date, is_recurring, recurring_id, notes)
  SELECT
    v_user_id,
    (t->>'description')::text,
    (t->>'amount')::numeric,
    (t->>'type')::text,
    (t->>'currency')::text,
    (t->>'crypto_type')::text,
    (t->>'category_id')::uuid,
    (t->>'wallet_id')::uuid,
    (t->>'date')::date,
    COALESCE((t->>'is_recurring')::boolean, false),
    (t->>'recurring_id')::uuid,
    (t->>'notes')::text
  FROM jsonb_array_elements(p_transactions) AS t;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN jsonb_build_object('inserted', v_count);
EXCEPTION WHEN OTHERS THEN RAISE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_transactions_batch_insert(jsonb) FROM PUBLIC;
