-- Fase 1: Vínculo formal entre los dos lados de una transferencia interna.
-- Reemplaza el mecanismo anterior que vinculaba pares via notes::jsonb->>'transfer_id'.
-- transfer_group_id es un UUID compartido por ambas transacciones del par (expense + income).

-- 1. Agregar columna
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS transfer_group_id UUID;

-- 2. Backfill desde notes JSON para transferencias existentes.
--    El campo notes contiene transfer_id (wallet transfers) o conversion_id (exchange).
--    Ambos son UUIDs generados por la RPC y compartidos por el par.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, notes
    FROM public.transactions
    WHERE transaction_kind = 'transfer' AND notes IS NOT NULL
  LOOP
    BEGIN
      UPDATE public.transactions
      SET transfer_group_id = COALESCE(
        (r.notes::jsonb->>'transfer_id')::uuid,
        (r.notes::jsonb->>'conversion_id')::uuid
      )
      WHERE id = r.id;
    EXCEPTION WHEN OTHERS THEN
      -- Si notes no es JSON válido (dato corrupto), ignorar esta fila
      RAISE NOTICE 'transfer_group_id backfill skip id=%: %', r.id, SQLERRM;
    END;
  END LOOP;
END $$;

-- 3. Índice para lookups de "la otra mitad" de una transferencia
CREATE INDEX IF NOT EXISTS idx_transactions_transfer_group
  ON public.transactions (transfer_group_id)
  WHERE transfer_group_id IS NOT NULL;

-- 4. Actualizar la vista para exponer transfer_group_id (al final, preservando orden)
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
  t.transaction_kind,
  t.transfer_group_id
FROM public.transactions t
LEFT JOIN public.categories c ON c.id = t.category_id
LEFT JOIN public.wallets    w ON w.id = t.wallet_id;
