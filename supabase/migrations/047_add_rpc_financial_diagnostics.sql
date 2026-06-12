-- Fase 3: RPC de diagnóstico de integridad de transaction_kind y transfer_group_id.
-- Retorna un JSONB con 7 contadores en una sola llamada.

CREATE OR REPLACE FUNCTION public.rpc_financial_diagnostics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id            UUID := auth.uid();
  v_null_kind          BIGINT;
  v_transfer_no_group  BIGINT;
  v_unbalanced_groups  BIGINT;
  v_missing_leg        BIGINT;
  v_multi_initial      BIGINT;
  v_zero_adjustment    BIGINT;
  v_orphan_refund      BIGINT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 1. Transacciones sin transaction_kind (anteriores a migración 037 que no fueron backfilleadas)
  SELECT COUNT(*) INTO v_null_kind
  FROM public.transactions
  WHERE user_id = v_user_id
    AND transaction_kind IS NULL;

  -- 2. Transacciones de tipo 'transfer' sin transfer_group_id (no vinculables a su par)
  SELECT COUNT(*) INTO v_transfer_no_group
  FROM public.transactions
  WHERE user_id = v_user_id
    AND transaction_kind = 'transfer'
    AND transfer_group_id IS NULL;

  -- 3. Grupos con count != 2 (leg faltante o duplicada)
  -- 4. Grupos sin un leg expense + un leg income
  SELECT
    COUNT(*) FILTER (WHERE leg_count <> 2),
    COUNT(*) FILTER (WHERE NOT has_expense OR NOT has_income)
  INTO v_unbalanced_groups, v_missing_leg
  FROM (
    SELECT
      transfer_group_id,
      COUNT(*)                  AS leg_count,
      BOOL_OR(type = 'expense') AS has_expense,
      BOOL_OR(type = 'income')  AS has_income
    FROM public.transactions
    WHERE user_id = v_user_id
      AND transaction_kind = 'transfer'
      AND transfer_group_id IS NOT NULL
    GROUP BY transfer_group_id
  ) g;

  -- 5. Billeteras con más de un saldo inicial registrado
  SELECT COUNT(*) INTO v_multi_initial
  FROM (
    SELECT wallet_id
    FROM public.transactions
    WHERE user_id = v_user_id
      AND transaction_kind = 'initial_balance'
      AND wallet_id IS NOT NULL
    GROUP BY wallet_id
    HAVING COUNT(*) > 1
  ) dup;

  -- 6. Ajustes de saldo con monto cero (registros probablemente erróneos)
  SELECT COUNT(*) INTO v_zero_adjustment
  FROM public.transactions
  WHERE user_id = v_user_id
    AND transaction_kind = 'wallet_adjustment'
    AND amount = 0;

  -- 7. Transacciones refund_credit sin referencia en tabla refunds (acreditado)
  SELECT COUNT(*) INTO v_orphan_refund
  FROM public.transactions t
  WHERE t.user_id = v_user_id
    AND t.transaction_kind = 'refund_credit'
    AND NOT EXISTS (
      SELECT 1
      FROM public.refunds r
      WHERE r.user_id = v_user_id
        AND r.status = 'credited'
        AND r.transaction_id = t.id
    );

  RETURN jsonb_build_object(
    'null_kind',            v_null_kind,
    'transfer_no_group',    v_transfer_no_group,
    'unbalanced_groups',    v_unbalanced_groups,
    'missing_leg',          v_missing_leg,
    'multi_initial_balance',v_multi_initial,
    'zero_adjustment',      v_zero_adjustment,
    'orphan_refund_credit', v_orphan_refund
  );
EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_financial_diagnostics() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.rpc_financial_diagnostics() TO authenticated;
