-- Transferencia interna atómica entre billeteras del mismo usuario.
-- Crea un par expense+income con label='internal_transfer' que el cliente
-- filtra de estadísticas. El balance total neto no cambia.
CREATE OR REPLACE FUNCTION public.rpc_wallet_transfer(
  p_from_wallet_id UUID,
  p_to_wallet_id   UUID,
  p_amount         NUMERIC,
  p_currency       TEXT,
  p_description    TEXT,
  p_date           DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id     UUID := auth.uid();
  v_balance     NUMERIC;
  v_transfer_id UUID;
  v_from_tx_id  UUID;
  v_to_tx_id    UUID;
  v_notes       TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'El monto debe ser mayor a 0';
  END IF;
  IF p_from_wallet_id = p_to_wallet_id THEN
    RAISE EXCEPTION 'Las billeteras de origen y destino deben ser diferentes';
  END IF;

  -- Bloquear en orden ascendente de ID para evitar deadlocks
  PERFORM id FROM public.wallets
  WHERE id = LEAST(p_from_wallet_id, p_to_wallet_id) AND user_id = v_user_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Billetera no encontrada o no autorizada';
  END IF;

  PERFORM id FROM public.wallets
  WHERE id = GREATEST(p_from_wallet_id, p_to_wallet_id) AND user_id = v_user_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Billetera no encontrada o no autorizada';
  END IF;

  -- Verificar saldo suficiente
  SELECT current_balance INTO v_balance
  FROM public.wallet_current_balance
  WHERE id = p_from_wallet_id AND user_id = v_user_id;

  IF v_balance IS NULL OR v_balance < p_amount THEN
    RAISE EXCEPTION 'Saldo insuficiente (disponible: %, requerido: %)',
      COALESCE(v_balance, 0), p_amount;
  END IF;

  v_transfer_id := gen_random_uuid();
  v_notes := jsonb_build_object(
    'transfer_id', v_transfer_id,
    'from_wallet_id', p_from_wallet_id,
    'to_wallet_id', p_to_wallet_id
  )::text;

  -- Egreso en billetera origen
  INSERT INTO public.transactions
    (user_id, description, amount, type, currency, wallet_id, date, label, notes, is_recurring)
  VALUES
    (v_user_id, p_description, p_amount, 'expense', p_currency, p_from_wallet_id, p_date, 'internal_transfer', v_notes, false)
  RETURNING id INTO v_from_tx_id;

  -- Ingreso en billetera destino
  INSERT INTO public.transactions
    (user_id, description, amount, type, currency, wallet_id, date, label, notes, is_recurring)
  VALUES
    (v_user_id, p_description, p_amount, 'income', p_currency, p_to_wallet_id, p_date, 'internal_transfer', v_notes, false)
  RETURNING id INTO v_to_tx_id;

  RETURN jsonb_build_object(
    'transfer_id', v_transfer_id,
    'from_tx_id', v_from_tx_id,
    'to_tx_id', v_to_tx_id
  );
EXCEPTION WHEN OTHERS THEN RAISE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_wallet_transfer(uuid, uuid, numeric, text, text, date) FROM anon;
GRANT  EXECUTE ON FUNCTION public.rpc_wallet_transfer(uuid, uuid, numeric, text, text, date) TO authenticated;
