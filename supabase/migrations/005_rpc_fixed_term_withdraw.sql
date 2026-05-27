-- auth.uid() determina el usuario — no se acepta p_user_id del cliente
CREATE OR REPLACE FUNCTION public.rpc_fixed_term_withdraw(
  p_fixed_term_id  UUID,
  p_wallet_id      UUID,
  p_amount         NUMERIC,
  p_currency       TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id   UUID := auth.uid();
  v_ft_name   TEXT;
  v_ft_status TEXT;
  v_tx_id     UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'El monto debe ser mayor a 0';
  END IF;

  SELECT name, status INTO v_ft_name, v_ft_status
  FROM public.fixed_terms WHERE id = p_fixed_term_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plazo fijo no encontrado o no autorizado';
  END IF;
  IF v_ft_status NOT IN ('active', 'matured') THEN
    RAISE EXCEPTION 'El plazo fijo no está disponible para retiro (estado: %)', v_ft_status;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.wallets WHERE id = p_wallet_id AND user_id = v_user_id) THEN
    RAISE EXCEPTION 'Billetera no encontrada o no autorizada';
  END IF;

  INSERT INTO public.transactions
    (user_id, description, amount, type, currency, wallet_id, date)
  VALUES
    (v_user_id, 'Retiro plazo fijo: ' || v_ft_name, p_amount, 'income', p_currency, p_wallet_id, CURRENT_DATE)
  RETURNING id INTO v_tx_id;

  UPDATE public.fixed_terms SET status = 'withdrawn', updated_at = NOW()
  WHERE id = p_fixed_term_id AND user_id = v_user_id;

  RETURN jsonb_build_object('transaction_id', v_tx_id, 'fixed_term_id', p_fixed_term_id);
EXCEPTION WHEN OTHERS THEN RAISE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_fixed_term_withdraw(uuid,uuid,numeric,text) FROM anon;
