-- Fase 1: Clasificación semántica de transacciones.
-- Agrega transaction_kind como ENUM explícito que distingue ingresos/gastos
-- reales de movimientos internos (transferencias, ajustes, reservas, etc.).
--
-- Diseño: type (income/expense) sigue determinando la dirección contable para
-- wallet_current_balance. transaction_kind añade semántica para reporting.

-- 1. Crear el ENUM
DO $$ BEGIN
  CREATE TYPE public.transaction_kind_enum AS ENUM (
    'income',            -- ingreso real del usuario
    'expense',           -- gasto real del usuario
    'transfer',          -- un lado de una transferencia interna entre billeteras
    'initial_balance',   -- saldo inicial al registrar una billetera
    'wallet_adjustment', -- corrección manual de saldo
    'reserve_deposit',   -- movimiento de dinero disponible a reserva
    'reserve_withdrawal',-- movimiento de reserva a dinero disponible
    'yield',             -- rendimiento estimado o corrección de rendimiento
    'refund_credit'      -- reintegro acreditado
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Agregar columna (nullable para permitir backfill)
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS transaction_kind public.transaction_kind_enum;

-- 3. Backfill desde label + subtype + descripción
UPDATE public.transactions SET transaction_kind =
  CASE
    WHEN label = 'initial_balance'                         THEN 'initial_balance'::public.transaction_kind_enum
    WHEN label = 'internal_transfer'                       THEN 'transfer'::public.transaction_kind_enum
    WHEN label = 'reservation_deposit'                     THEN 'reserve_deposit'::public.transaction_kind_enum
    WHEN label = 'reservation_withdraw'                    THEN 'reserve_withdrawal'::public.transaction_kind_enum
    WHEN label = 'wallet_adjustment'                       THEN 'wallet_adjustment'::public.transaction_kind_enum
    WHEN label = 'yield' OR subtype IN ('yield', 'correction') THEN 'yield'::public.transaction_kind_enum
    WHEN description LIKE 'Reintegro: %'                   THEN 'refund_credit'::public.transaction_kind_enum
    WHEN type = 'income'                                   THEN 'income'::public.transaction_kind_enum
    ELSE                                                        'expense'::public.transaction_kind_enum
  END
WHERE transaction_kind IS NULL;

-- 4. Hacer NOT NULL y poner DEFAULT conservador (income; las RPCs siempre setean explícitamente)
ALTER TABLE public.transactions
  ALTER COLUMN transaction_kind SET NOT NULL,
  ALTER COLUMN transaction_kind SET DEFAULT 'income';

-- 5. Índice compuesto para los filtros de reporting más frecuentes
CREATE INDEX IF NOT EXISTS idx_transactions_kind_date
  ON public.transactions (user_id, transaction_kind, date DESC);

-- 6. Actualizar la vista para exponer transaction_kind y las columnas de yield.
--    Las nuevas columnas van AL FINAL para no cambiar el orden de las existentes
--    (CREATE OR REPLACE VIEW no permite reordenar columnas ya definidas).
CREATE OR REPLACE VIEW public.transactions_with_details AS
SELECT
  t.id,
  t.user_id,
  t.description,
  t.amount,
  t.type,
  t.currency,
  t.crypto_type,
  t.category_id,
  t.wallet_id,
  t.date,
  t.is_recurring,
  t.recurring_id,
  t.notes,
  t.created_at,
  t.updated_at,
  c.name  AS category_name,
  c.color AS category_color,
  c.icon  AS category_icon,
  w.name     AS wallet_name,
  w.provider AS wallet_provider,
  t.label,
  t.subtype,
  t.is_estimated,
  t.estimated_rate,
  t.original_amount,
  t.corrected_from_transaction_id,
  t.affects_budget,
  t.yield_period_start,
  t.yield_period_end,
  t.transaction_kind
FROM public.transactions t
LEFT JOIN public.categories c ON c.id = t.category_id
LEFT JOIN public.wallets    w ON w.id = t.wallet_id;
