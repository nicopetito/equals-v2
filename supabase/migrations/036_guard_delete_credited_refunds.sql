-- C1: Bloquear eliminación de transacción con reintegros acreditados.
-- El RPC anterior hacía cascade destructivo (borraba ingresos de reintegros ya acreditados).
-- Ahora lanza excepción si existen reintegros con status='credited' asociados.
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

  IF NOT EXISTS (
    SELECT 1 FROM public.transactions
    WHERE id = p_transaction_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Transacción no encontrada o no autorizada';
  END IF;

  -- Guard C1: no permitir eliminar si hay reintegros acreditados
  IF EXISTS (
    SELECT 1 FROM public.refunds
    WHERE original_transaction_id = p_transaction_id
      AND user_id = v_user_id
      AND status = 'credited'
  ) THEN
    RAISE EXCEPTION 'No podés eliminar esta transacción porque tiene un reintegro acreditado asociado. Primero anulá o revisá el reintegro.';
  END IF;

  DELETE FROM public.goal_movements
  WHERE transaction_id = p_transaction_id
    AND user_id = v_user_id;

  DELETE FROM public.transactions
  WHERE id = p_transaction_id
    AND user_id = v_user_id;

EXCEPTION WHEN OTHERS THEN RAISE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_delete_transaction_cascade(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_delete_transaction_cascade(uuid) TO authenticated;
