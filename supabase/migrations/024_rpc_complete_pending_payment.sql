-- Marca un pago pendiente como cobrado (receivable) o pagado (payable).
-- Crea la transacción real en la billetera indicada de forma atómica.
CREATE OR REPLACE FUNCTION public.rpc_complete_pending_payment(
  p_payment_id UUID,
  p_wallet_id  UUID,
  p_date       DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id    UUID := auth.uid();
  v_type       TEXT;
  v_amount     NUMERIC;
  v_currency   TEXT;
  v_person     TEXT;
  v_status     TEXT;
  v_tx_type    TEXT;
  v_new_status TEXT;
  v_tx_id      UUID;
  v_desc       TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT type, amount, currency, person_name, status
  INTO   v_type, v_amount, v_currency, v_person, v_status
  FROM   public.pending_payments
  WHERE  id = p_payment_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pago pendiente no encontrado o no autorizado';
  END IF;
  IF v_status <> 'pending' THEN
    RAISE EXCEPTION 'El pago no está pendiente (estado actual: %)', v_status;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.wallets WHERE id = p_wallet_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Billetera no encontrada o no autorizada';
  END IF;

  v_tx_type    := CASE WHEN v_type = 'receivable' THEN 'income' ELSE 'expense' END;
  v_new_status := CASE WHEN v_type = 'receivable' THEN 'collected' ELSE 'paid' END;
  v_desc       := CASE WHEN v_type = 'receivable'
                    THEN 'Cobro de: ' || v_person
                    ELSE 'Pago a: '   || v_person
                  END;

  INSERT INTO public.transactions
    (user_id, description, amount, type, currency, wallet_id, date, is_recurring)
  VALUES
    (v_user_id, v_desc, v_amount, v_tx_type, v_currency, p_wallet_id, p_date, false)
  RETURNING id INTO v_tx_id;

  UPDATE public.pending_payments
  SET
    status                  = v_new_status,
    transaction_id          = v_tx_id,
    wallet_id_on_completion = p_wallet_id,
    updated_at              = NOW()
  WHERE id = p_payment_id AND user_id = v_user_id;

  RETURN jsonb_build_object('transaction_id', v_tx_id, 'new_status', v_new_status);
EXCEPTION WHEN OTHERS THEN RAISE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_complete_pending_payment(uuid, uuid, date) FROM anon;
GRANT  EXECUTE ON FUNCTION public.rpc_complete_pending_payment(uuid, uuid, date) TO authenticated;
