CREATE OR REPLACE FUNCTION public.rpc_reservation_withdraw(
  p_reservation_id UUID,
  p_wallet_id      UUID,
  p_amount         NUMERIC,
  p_description    TEXT    DEFAULT NULL,
  p_date           DATE    DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id      UUID    := auth.uid();
  v_res_name     TEXT;
  v_res_currency TEXT;
  v_res_amount   NUMERIC;
  v_new_amount   NUMERIC;
  v_tx_id        UUID;
  v_mov_id       UUID;
  v_desc         TEXT;
  v_notes        TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'El monto debe ser mayor a 0';
  END IF;

  -- Verificar ownership y obtener datos de la reserva (FOR UPDATE para evitar race conditions)
  SELECT name, currency, amount INTO v_res_name, v_res_currency, v_res_amount
  FROM public.reservations
  WHERE id = p_reservation_id AND user_id = v_user_id AND status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reserva no encontrada, no autorizada o no activa';
  END IF;

  IF v_res_amount < p_amount THEN
    RAISE EXCEPTION 'Monto insuficiente en reserva (disponible: %, requerido: %)',
      v_res_amount, p_amount;
  END IF;

  -- Verificar ownership de la billetera
  IF NOT EXISTS (
    SELECT 1 FROM public.wallets WHERE id = p_wallet_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Billetera no encontrada o no autorizada';
  END IF;

  v_desc  := COALESCE(p_description, 'Retiro de reserva: ' || v_res_name);
  v_notes := jsonb_build_object(
    'reservation_id', p_reservation_id,
    'reservation_name', v_res_name
  )::text;

  -- Crear transacción income en la billetera (sube disponible)
  INSERT INTO public.transactions
    (user_id, description, amount, type, currency, wallet_id, date, label, notes, is_recurring, affects_budget)
  VALUES
    (v_user_id, v_desc, p_amount, 'income', v_res_currency, p_wallet_id, p_date,
     'reservation_withdraw', v_notes, false, false)
  RETURNING id INTO v_tx_id;

  -- Restar del monto de la reserva
  UPDATE public.reservations
  SET amount = amount - p_amount, updated_at = NOW()
  WHERE id = p_reservation_id AND user_id = v_user_id
  RETURNING amount INTO v_new_amount;

  -- Registrar movimiento en historial
  INSERT INTO public.reservation_movements
    (reservation_id, user_id, type, amount, transaction_id, note)
  VALUES
    (p_reservation_id, v_user_id, 'withdrawal', p_amount, v_tx_id, p_description)
  RETURNING id INTO v_mov_id;

  RETURN jsonb_build_object(
    'transaction_id', v_tx_id,
    'movement_id',    v_mov_id,
    'new_amount',     v_new_amount
  );

EXCEPTION WHEN OTHERS THEN RAISE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_reservation_withdraw(uuid, uuid, numeric, text, date) FROM anon;
GRANT  EXECUTE ON FUNCTION public.rpc_reservation_withdraw(uuid, uuid, numeric, text, date) TO authenticated;
