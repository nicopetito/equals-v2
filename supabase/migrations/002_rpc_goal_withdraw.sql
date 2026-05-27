-- auth.uid() determina el usuario — no se acepta p_user_id del cliente
CREATE OR REPLACE FUNCTION public.rpc_goal_withdraw(
  p_goal_id    UUID,
  p_wallet_id  UUID,
  p_amount     NUMERIC,
  p_currency   TEXT,
  p_goal_name  TEXT,
  p_note       TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id        UUID := auth.uid();
  v_current_amount NUMERIC;
  v_new_amount     NUMERIC;
  v_tx_id          UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'El monto debe ser mayor a 0';
  END IF;

  SELECT current_amount
  INTO   v_current_amount
  FROM   public.goals
  WHERE  id = p_goal_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Objetivo no encontrado o no autorizado';
  END IF;

  IF v_current_amount < p_amount THEN
    RAISE EXCEPTION 'Saldo insuficiente en el objetivo (disponible: %, requerido: %)', v_current_amount, p_amount;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.wallets WHERE id = p_wallet_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Billetera no encontrada o no autorizada';
  END IF;

  INSERT INTO public.transactions
    (user_id, description, amount, type, currency, wallet_id, date)
  VALUES
    (v_user_id, 'Retiro de objetivo: ' || p_goal_name, p_amount, 'income', p_currency, p_wallet_id, CURRENT_DATE)
  RETURNING id INTO v_tx_id;

  v_new_amount := v_current_amount - p_amount;

  UPDATE public.goals
  SET    current_amount = v_new_amount, is_completed = FALSE
  WHERE  id = p_goal_id AND user_id = v_user_id;

  INSERT INTO public.goal_movements
    (user_id, goal_id, type, amount, wallet_id, description, transaction_id)
  VALUES
    (v_user_id, p_goal_id, 'withdrawal', p_amount, p_wallet_id, p_note, v_tx_id);

  RETURN jsonb_build_object('transaction_id', v_tx_id, 'new_amount', v_new_amount);
EXCEPTION WHEN OTHERS THEN RAISE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_goal_withdraw(uuid,uuid,numeric,text,text,text) FROM anon;
