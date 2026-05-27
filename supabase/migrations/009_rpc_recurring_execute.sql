-- auth.uid() determina el usuario — no se acepta p_user_id del cliente
CREATE OR REPLACE FUNCTION public.rpc_recurring_execute(
  p_recurring_id UUID,
  p_wallet_id    UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id    UUID := auth.uid();
  v_item       RECORD;
  v_next_date  DATE;
  v_tx_id      UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id, description, amount, type, currency, category_id, cadence, next_date, active
  INTO   v_item
  FROM   public.recurring_transactions
  WHERE  id = p_recurring_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transacción recurrente no encontrada o no autorizada';
  END IF;
  IF NOT v_item.active THEN
    RAISE EXCEPTION 'La transacción recurrente está pausada';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.wallets WHERE id = p_wallet_id AND user_id = v_user_id) THEN
    RAISE EXCEPTION 'Billetera no encontrada o no autorizada';
  END IF;

  INSERT INTO public.transactions
    (user_id, description, amount, type, currency, wallet_id, date, is_recurring, recurring_id, category_id)
  VALUES
    (v_user_id, v_item.description, v_item.amount, v_item.type, v_item.currency,
     p_wallet_id, CURRENT_DATE, true, p_recurring_id, v_item.category_id)
  RETURNING id INTO v_tx_id;

  v_next_date := CASE v_item.cadence
    WHEN 'daily'     THEN v_item.next_date + INTERVAL '1 day'
    WHEN 'weekly'    THEN v_item.next_date + INTERVAL '7 days'
    WHEN 'biweekly'  THEN v_item.next_date + INTERVAL '14 days'
    WHEN 'monthly'   THEN v_item.next_date + INTERVAL '1 month'
    WHEN 'quarterly' THEN v_item.next_date + INTERVAL '3 months'
    WHEN 'yearly'    THEN v_item.next_date + INTERVAL '1 year'
    ELSE                  v_item.next_date + INTERVAL '1 month'
  END;

  UPDATE public.recurring_transactions
  SET next_date = v_next_date, updated_at = NOW()
  WHERE id = p_recurring_id AND user_id = v_user_id;

  RETURN jsonb_build_object('transaction_id', v_tx_id, 'next_date', v_next_date);
EXCEPTION WHEN OTHERS THEN RAISE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_recurring_execute(uuid, uuid) FROM anon;
