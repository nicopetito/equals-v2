-- Calcula y registra rendimiento estimado para una billetera.
-- Idempotente: el índice único (wallet_id, yield_period_start, yield_period_end) impide duplicados.
-- business_days: no calcula en sábado/domingo; el lunes acumula sábado+domingo+lunes automáticamente.
CREATE OR REPLACE FUNCTION public.rpc_calculate_wallet_yield(
  p_wallet_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id            UUID    := auth.uid();
  v_wallet             RECORD;
  v_available_balance  NUMERIC;
  v_period_start       DATE;
  v_period_end         DATE    := CURRENT_DATE;
  v_days_pending       INTEGER;
  v_yield_amount       NUMERIC;
  v_category_id        UUID;
  v_tx_id              UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verificar ownership y configuración
  SELECT id, name, currency, generates_yield, annual_yield_rate, yield_frequency, last_yield_calculated_at
  INTO v_wallet
  FROM public.wallets
  WHERE id = p_wallet_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'yield_amount', 0, 'days_calculated', 0, 'message', 'wallet_not_found');
  END IF;

  IF NOT v_wallet.generates_yield THEN
    RETURN jsonb_build_object('success', false, 'yield_amount', 0, 'days_calculated', 0, 'message', 'not_configured');
  END IF;

  IF v_wallet.annual_yield_rate IS NULL OR v_wallet.annual_yield_rate <= 0 THEN
    RETURN jsonb_build_object('success', false, 'yield_amount', 0, 'days_calculated', 0, 'message', 'no_rate');
  END IF;

  -- business_days: no calcular en sábado (6) ni domingo (0)
  -- El lunes acumula sáb+dom+lun porque period_start vendrá desde el viernes+1
  IF v_wallet.yield_frequency = 'business_days' AND EXTRACT(DOW FROM CURRENT_DATE) IN (0, 6) THEN
    RETURN jsonb_build_object('success', false, 'yield_amount', 0, 'days_calculated', 0, 'message', 'no_yield_on_weekend');
  END IF;

  -- Calcular período pendiente
  -- Si nunca se calculó: asumir que el primer período es ayer (1 día)
  v_period_start := COALESCE(v_wallet.last_yield_calculated_at, CURRENT_DATE - 1) + 1;

  IF v_period_start > v_period_end THEN
    RETURN jsonb_build_object('success', false, 'yield_amount', 0, 'days_calculated', 0, 'message', 'already_calculated');
  END IF;

  v_days_pending := v_period_end - v_period_start + 1;

  -- Obtener saldo disponible de la vista
  SELECT current_balance INTO v_available_balance
  FROM public.wallet_current_balance
  WHERE id = p_wallet_id AND user_id = v_user_id;

  IF v_available_balance IS NULL OR v_available_balance <= 0 THEN
    RETURN jsonb_build_object('success', false, 'yield_amount', 0, 'days_calculated', 0, 'message', 'no_balance');
  END IF;

  -- dailyYield = balance * (tna / 100) / 365 * días
  v_yield_amount := ROUND(v_available_balance * (v_wallet.annual_yield_rate / 100.0) / 365.0 * v_days_pending, 2);

  IF v_yield_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'yield_amount', 0, 'days_calculated', 0, 'message', 'yield_too_small');
  END IF;

  -- Obtener o crear categoría sistema "Rendimientos"
  SELECT id INTO v_category_id FROM public.categories
  WHERE user_id = v_user_id AND name = 'Rendimientos' AND type = 'income' AND is_system = true
  LIMIT 1;

  IF v_category_id IS NULL THEN
    BEGIN
      INSERT INTO public.categories (user_id, name, type, color, icon, is_system)
      VALUES (v_user_id, 'Rendimientos', 'income', '#6d3bd7', 'trending-up', true)
      RETURNING id INTO v_category_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_category_id FROM public.categories
      WHERE user_id = v_user_id AND name = 'Rendimientos' AND type = 'income' AND is_system = true
      LIMIT 1;
    END;
  END IF;

  -- Insertar transacción de rendimiento
  BEGIN
    INSERT INTO public.transactions (
      user_id, wallet_id, description, amount, type, currency,
      category_id, date, label, subtype, is_estimated, estimated_rate,
      affects_budget, yield_period_start, yield_period_end, is_recurring
    ) VALUES (
      v_user_id, p_wallet_id,
      'Rendimiento estimado - ' || v_wallet.name,
      v_yield_amount, 'income', v_wallet.currency,
      v_category_id, CURRENT_DATE, 'yield', 'yield', true, v_wallet.annual_yield_rate,
      false, v_period_start, v_period_end, false
    )
    RETURNING id INTO v_tx_id;
  EXCEPTION WHEN unique_violation THEN
    -- El índice parcial detectó un período ya calculado (race condition)
    RETURN jsonb_build_object('success', false, 'yield_amount', 0, 'days_calculated', 0, 'message', 'already_calculated');
  END;

  -- Actualizar fecha del último cálculo
  UPDATE public.wallets
  SET last_yield_calculated_at = CURRENT_DATE
  WHERE id = p_wallet_id AND user_id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'yield_amount', v_yield_amount,
    'days_calculated', v_days_pending,
    'transaction_id', v_tx_id,
    'message', 'ok'
  );

EXCEPTION WHEN OTHERS THEN RAISE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_calculate_wallet_yield(uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.rpc_calculate_wallet_yield(uuid) TO authenticated;
