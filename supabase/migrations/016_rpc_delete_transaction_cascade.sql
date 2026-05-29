-- Eliminación atómica de una transacción con cascada sobre reintegros acreditados.
-- Cuando una transacción tenía reintegros ya acreditados (status='credited'), sus
-- transacciones de ingreso asociadas también se eliminan para evitar saldos huérfanos.
CREATE OR REPLACE FUNCTION public.rpc_delete_transaction_cascade(
  p_transaction_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verificar que la transacción pertenece al usuario
  IF NOT EXISTS (
    SELECT 1 FROM public.transactions
    WHERE id = p_transaction_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Transacción no encontrada o no autorizada';
  END IF;

  -- Eliminar las transacciones de ingreso creadas por reintegros ya acreditados
  DELETE FROM public.transactions
  WHERE id IN (
    SELECT credited_transaction_id
    FROM public.refunds
    WHERE original_transaction_id = p_transaction_id
      AND user_id = v_user_id
      AND status = 'credited'
      AND credited_transaction_id IS NOT NULL
  )
  AND user_id = v_user_id;

  -- Marcar esos reintegros como cancelados (ya no tienen transacción asociada)
  UPDATE public.refunds
  SET status = 'cancelled', updated_at = NOW()
  WHERE original_transaction_id = p_transaction_id
    AND user_id = v_user_id
    AND status = 'credited';

  -- Eliminar movimientos de objetivo para que el trigger recalcule goal.current_amount
  DELETE FROM public.goal_movements
  WHERE transaction_id = p_transaction_id
    AND user_id = v_user_id;

  -- Eliminar la transacción original
  DELETE FROM public.transactions
  WHERE id = p_transaction_id
    AND user_id = v_user_id;

EXCEPTION WHEN OTHERS THEN RAISE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_delete_transaction_cascade(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_delete_transaction_cascade(uuid) TO authenticated;
