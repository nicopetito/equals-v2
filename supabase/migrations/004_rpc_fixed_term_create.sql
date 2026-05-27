-- auth.uid() determina el usuario — no se acepta p_user_id del cliente
CREATE OR REPLACE FUNCTION public.rpc_fixed_term_create(
  p_wallet_id          UUID,
  p_name               TEXT,
  p_principal_amount   NUMERIC,
  p_currency           TEXT,
  p_tna                NUMERIC,
  p_term_days          INTEGER,
  p_start_date         DATE,
  p_maturity_date      DATE,
  p_estimated_interest NUMERIC,
  p_estimated_total    NUMERIC,
  p_note               TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id        UUID := auth.uid();
  v_wallet_balance NUMERIC;
  v_ft_id          UUID;
  v_tx_id          UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_principal_amount <= 0 THEN
    RAISE EXCEPTION 'El capital debe ser mayor a 0';
  END IF;

  PERFORM id FROM public.wallets WHERE id = p_wallet_id AND user_id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Billetera no encontrada o no autorizada';
  END IF;

  SELECT current_balance INTO v_wallet_balance
  FROM public.wallet_current_balance WHERE id = p_wallet_id AND user_id = v_user_id;

  IF v_wallet_balance < p_principal_amount THEN
    RAISE EXCEPTION 'Saldo insuficiente (disponible: %, requerido: %)', v_wallet_balance, p_principal_amount;
  END IF;

  INSERT INTO public.fixed_terms
    (user_id, name, principal_amount, currency, tna, term_days,
     start_date, maturity_date, estimated_interest, estimated_total,
     wallet_id, status, auto_reinvest, note)
  VALUES
    (v_user_id, p_name, p_principal_amount, p_currency, p_tna, p_term_days,
     p_start_date, p_maturity_date, p_estimated_interest, p_estimated_total,
     p_wallet_id, 'active', false, p_note)
  RETURNING id INTO v_ft_id;

  INSERT INTO public.transactions
    (user_id, description, amount, type, currency, wallet_id, date)
  VALUES
    (v_user_id, 'Plazo fijo: ' || p_name, p_principal_amount, 'expense', p_currency, p_wallet_id, p_start_date)
  RETURNING id INTO v_tx_id;

  RETURN jsonb_build_object('fixed_term_id', v_ft_id, 'transaction_id', v_tx_id);
EXCEPTION WHEN OTHERS THEN RAISE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_fixed_term_create(uuid,text,numeric,text,numeric,integer,date,date,numeric,numeric,text) FROM anon;
