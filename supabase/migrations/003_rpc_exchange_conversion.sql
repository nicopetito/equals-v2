-- auth.uid() determina el usuario — no se acepta p_user_id del cliente
CREATE OR REPLACE FUNCTION public.rpc_exchange_conversion(
  p_from_wallet_id UUID,
  p_to_wallet_id   UUID,
  p_from_amount    NUMERIC,
  p_to_amount      NUMERIC,
  p_from_currency  TEXT,
  p_to_currency    TEXT,
  p_exchange_rate  NUMERIC,
  p_exchange_type  TEXT,
  p_operation_type TEXT,
  p_date           DATE,
  p_description    TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id        UUID := auth.uid();
  v_wallet_balance NUMERIC;
  v_conversion_id  UUID;
  v_leg1_id        UUID;
  v_leg2_id        UUID;
  v_notes          TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_from_amount <= 0 OR p_to_amount <= 0 THEN
    RAISE EXCEPTION 'Los montos deben ser mayores a 0';
  END IF;
  IF p_from_wallet_id = p_to_wallet_id THEN
    RAISE EXCEPTION 'Las billeteras de origen y destino deben ser diferentes';
  END IF;

  PERFORM id FROM public.wallets
  WHERE id = p_from_wallet_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Billetera de origen no encontrada o no autorizada';
  END IF;

  SELECT current_balance INTO v_wallet_balance
  FROM public.wallet_current_balance
  WHERE id = p_from_wallet_id AND user_id = v_user_id;

  IF v_wallet_balance < p_from_amount THEN
    RAISE EXCEPTION 'Saldo insuficiente (disponible: %, requerido: %)', v_wallet_balance, p_from_amount;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.wallets WHERE id = p_to_wallet_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Billetera de destino no encontrada o no autorizada';
  END IF;

  v_conversion_id := gen_random_uuid();
  v_notes := jsonb_build_object(
    'conversion_id', v_conversion_id, 'exchange_rate', p_exchange_rate,
    'exchange_type', p_exchange_type, 'operation', p_operation_type,
    'from_wallet_id', p_from_wallet_id, 'to_wallet_id', p_to_wallet_id,
    'from_amount', p_from_amount, 'from_currency', p_from_currency,
    'to_amount', p_to_amount, 'to_currency', p_to_currency
  )::text;

  INSERT INTO public.transactions
    (user_id, description, amount, type, currency, wallet_id, date, notes)
  VALUES
    (v_user_id, p_description, p_from_amount, 'expense', p_from_currency, p_from_wallet_id, p_date, v_notes)
  RETURNING id INTO v_leg1_id;

  INSERT INTO public.transactions
    (user_id, description, amount, type, currency, wallet_id, date, notes)
  VALUES
    (v_user_id, p_description, p_to_amount, 'income', p_to_currency, p_to_wallet_id, p_date, v_notes)
  RETURNING id INTO v_leg2_id;

  RETURN jsonb_build_object('leg1_id', v_leg1_id, 'leg2_id', v_leg2_id, 'conversion_id', v_conversion_id);
EXCEPTION WHEN OTHERS THEN RAISE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_exchange_conversion(uuid,uuid,numeric,numeric,text,text,numeric,text,text,date,text) FROM anon;
