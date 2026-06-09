-- Corrige el monto de una transacción de rendimiento estimado.
-- La transacción original se mantiene intacta (trazabilidad).
-- Se crea una transacción de corrección con corrected_from_transaction_id apuntando al original.
CREATE OR REPLACE FUNCTION public.rpc_correct_yield_transaction(
  p_transaction_id   UUID,
  p_corrected_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id       UUID := auth.uid();
  v_original      RECORD;
  v_delta         NUMERIC;
  v_tx_type       TEXT;
  v_correction_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_corrected_amount < 0 THEN
    RAISE EXCEPTION 'El monto corregido debe ser mayor o igual a 0';
  END IF;

  -- Obtener transacción de rendimiento original
  SELECT t.id, t.user_id, t.wallet_id, t.currency, t.amount, t.subtype, w.name AS wallet_name, t.category_id
  INTO v_original
  FROM public.transactions t
  JOIN public.wallets w ON w.id = t.wallet_id AND w.user_id = v_user_id
  WHERE t.id = p_transaction_id AND t.user_id = v_user_id AND t.subtype = 'yield';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'transaction_not_found');
  END IF;

  v_delta := p_corrected_amount - v_original.amount;

  IF v_delta = 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'no_change');
  END IF;

  -- income si necesitamos sumar más, expense si sobreestimamos
  v_tx_type := CASE WHEN v_delta > 0 THEN 'income' ELSE 'expense' END;

  -- Insertar transacción de corrección (diferencia neta, no el total)
  INSERT INTO public.transactions (
    user_id, wallet_id, description, amount, type, currency,
    category_id, date, subtype, is_estimated, affects_budget,
    corrected_from_transaction_id, original_amount, is_recurring
  ) VALUES (
    v_user_id, v_original.wallet_id,
    'Corrección de rendimiento - ' || v_original.wallet_name,
    ABS(v_delta), v_tx_type, v_original.currency,
    v_original.category_id, CURRENT_DATE, 'correction', false, false,
    p_transaction_id, v_original.amount, false
  )
  RETURNING id INTO v_correction_id;

  RETURN jsonb_build_object(
    'success', true,
    'correction_id', v_correction_id,
    'delta', v_delta,
    'message', 'ok'
  );

EXCEPTION WHEN OTHERS THEN RAISE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_correct_yield_transaction(uuid, numeric) FROM anon;
GRANT  EXECUTE ON FUNCTION public.rpc_correct_yield_transaction(uuid, numeric) TO authenticated;
