-- auth.uid() determina el usuario — no se acepta p_user_id del cliente
CREATE OR REPLACE FUNCTION public.rpc_fixed_term_reinvest(
  p_old_fixed_term_id  UUID,
  p_wallet_id          UUID,
  p_old_total          NUMERIC,
  p_new_principal      NUMERIC,
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
  v_user_id       UUID := auth.uid();
  v_old_name      TEXT;
  v_old_status    TEXT;
  v_new_ft_id     UUID;
  v_income_tx_id  UUID;
  v_expense_tx_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_new_principal <= 0 THEN
    RAISE EXCEPTION 'El nuevo capital debe ser mayor a 0';
  END IF;
  IF p_old_total <= 0 THEN
    RAISE EXCEPTION 'El total del plazo anterior debe ser mayor a 0';
  END IF;

  SELECT name, status INTO v_old_name, v_old_status
  FROM public.fixed_terms WHERE id = p_old_fixed_term_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plazo fijo no encontrado o no autorizado';
  END IF;
  IF v_old_status NOT IN ('active', 'matured') THEN
    RAISE EXCEPTION 'El plazo fijo no está disponible para reinversión (estado: %)', v_old_status;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.wallets WHERE id = p_wallet_id AND user_id = v_user_id) THEN
    RAISE EXCEPTION 'Billetera no encontrada o no autorizada';
  END IF;

  INSERT INTO public.transactions
    (user_id, description, amount, type, currency, wallet_id, date)
  VALUES
    (v_user_id, 'Retiro para renovar: ' || v_old_name, p_old_total, 'income', p_currency, p_wallet_id, CURRENT_DATE)
  RETURNING id INTO v_income_tx_id;

  UPDATE public.fixed_terms SET status = 'reinvested', updated_at = NOW()
  WHERE id = p_old_fixed_term_id AND user_id = v_user_id;

  INSERT INTO public.fixed_terms
    (user_id, name, principal_amount, currency, tna, term_days,
     start_date, maturity_date, estimated_interest, estimated_total,
     wallet_id, status, auto_reinvest, note)
  VALUES
    (v_user_id, v_old_name, p_new_principal, p_currency, p_tna, p_term_days,
     p_start_date, p_maturity_date, p_estimated_interest, p_estimated_total,
     p_wallet_id, 'active', false, p_note)
  RETURNING id INTO v_new_ft_id;

  INSERT INTO public.transactions
    (user_id, description, amount, type, currency, wallet_id, date)
  VALUES
    (v_user_id, 'Renovación plazo fijo: ' || v_old_name, p_new_principal, 'expense', p_currency, p_wallet_id, p_start_date)
  RETURNING id INTO v_expense_tx_id;

  RETURN jsonb_build_object(
    'old_fixed_term_id', p_old_fixed_term_id, 'new_fixed_term_id', v_new_ft_id,
    'income_tx_id', v_income_tx_id, 'expense_tx_id', v_expense_tx_id
  );
EXCEPTION WHEN OTHERS THEN RAISE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_fixed_term_reinvest(uuid,uuid,numeric,numeric,text,numeric,integer,date,date,numeric,numeric,text) FROM anon;
