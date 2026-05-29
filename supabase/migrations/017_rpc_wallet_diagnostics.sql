-- Función de diagnóstico financiero: compara el saldo calculado por billetera.
-- Solo retorna datos del usuario autenticado (auth.uid()).
-- Útil para detectar inconsistencias entre el saldo inicial y las transacciones registradas.
CREATE OR REPLACE FUNCTION public.rpc_wallet_diagnostics()
RETURNS TABLE (
  wallet_id        UUID,
  wallet_name      TEXT,
  currency         TEXT,
  initial_balance  NUMERIC,
  income_total     NUMERIC,
  expense_total    NUMERIC,
  computed_balance NUMERIC,
  transaction_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    w.id                                                              AS wallet_id,
    w.name::TEXT                                                      AS wallet_name,
    w.currency::TEXT                                                  AS currency,
    COALESCE(w.balance, 0)::NUMERIC                                   AS initial_balance,
    COALESCE(SUM(CASE WHEN t.type = 'income'  THEN t.amount ELSE 0 END), 0)::NUMERIC AS income_total,
    COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0)::NUMERIC AS expense_total,
    (COALESCE(w.balance, 0) + COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END), 0))::NUMERIC AS computed_balance,
    COUNT(t.id)                                                       AS transaction_count
  FROM public.wallets w
  LEFT JOIN public.transactions t
    ON t.wallet_id = w.id AND t.user_id = v_user_id
  WHERE w.user_id = v_user_id
  GROUP BY w.id, w.name, w.currency, w.balance
  ORDER BY w.name;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_wallet_diagnostics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_wallet_diagnostics() TO authenticated;
