-- auth.uid() determina el usuario — no se acepta p_user_id del cliente
CREATE OR REPLACE FUNCTION public.rpc_refund_credit(
  p_refund_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id    UUID := auth.uid();
  v_amount     NUMERIC;
  v_currency   TEXT;
  v_wallet_id  UUID;
  v_note       TEXT;
  v_orig_tx_id UUID;
  v_status     TEXT;
  v_orig_desc  TEXT;
  v_tx_id      UUID;
  v_now        TIMESTAMPTZ := NOW();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT amount, currency, destination_wallet_id, note, original_transaction_id, status
  INTO   v_amount, v_currency, v_wallet_id, v_note, v_orig_tx_id, v_status
  FROM   public.refunds
  WHERE  id = p_refund_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reintegro no encontrado o no autorizado';
  END IF;
  IF v_status <> 'pending' THEN
    RAISE EXCEPTION 'El reintegro no está pendiente (estado: %)', v_status;
  END IF;
  IF v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'El reintegro no tiene billetera de destino configurada';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.wallets WHERE id = v_wallet_id AND user_id = v_user_id) THEN
    RAISE EXCEPTION 'Billetera de destino no encontrada o no autorizada';
  END IF;

  SELECT description INTO v_orig_desc
  FROM public.transactions WHERE id = v_orig_tx_id AND user_id = v_user_id;

  v_orig_desc := COALESCE(v_orig_desc, 'Gasto');

  INSERT INTO public.transactions
    (user_id, description, amount, type, currency, wallet_id, date, notes)
  VALUES
    (v_user_id, 'Reintegro: ' || v_orig_desc, v_amount, 'income', v_currency, v_wallet_id, CURRENT_DATE, v_note)
  RETURNING id INTO v_tx_id;

  UPDATE public.refunds
  SET status = 'credited', credited_at = v_now, credited_transaction_id = v_tx_id, updated_at = v_now
  WHERE id = p_refund_id AND user_id = v_user_id;

  RETURN jsonb_build_object('transaction_id', v_tx_id, 'refund_id', p_refund_id);
EXCEPTION WHEN OTHERS THEN RAISE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_refund_credit(uuid) FROM anon;
