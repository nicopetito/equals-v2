-- Tabla para registrar pagos pendientes (por cobrar y por pagar).
-- No afecta el balance hasta que se marcan como cobrados/pagados.
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.pending_payments (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type                    TEXT NOT NULL CHECK (type IN ('receivable', 'payable')),
  person_name             TEXT NOT NULL,
  amount                  NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  currency                TEXT NOT NULL DEFAULT 'ARS',
  description             TEXT,
  due_date                DATE,
  status                  TEXT NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'collected', 'paid', 'cancelled')),
  wallet_id_on_completion UUID REFERENCES public.wallets(id) ON DELETE SET NULL,
  transaction_id          UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pending_payments_user_status
  ON public.pending_payments(user_id, status);

CREATE INDEX IF NOT EXISTS idx_pending_payments_user_type
  ON public.pending_payments(user_id, type, status);

ALTER TABLE public.pending_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pending_payments_owner"
  ON public.pending_payments FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_pending_payments_updated_at
  BEFORE UPDATE ON public.pending_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
