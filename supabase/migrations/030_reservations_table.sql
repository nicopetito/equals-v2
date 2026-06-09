CREATE TABLE IF NOT EXISTS public.reservations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_id   UUID        REFERENCES public.wallets(id) ON DELETE SET NULL,
  name        TEXT        NOT NULL,
  description TEXT,
  amount      NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  currency    TEXT        NOT NULL DEFAULT 'ARS',
  status      TEXT        NOT NULL DEFAULT 'active'
              CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reservations_user_status
  ON public.reservations(user_id, status);

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reservations_owner"
  ON public.reservations FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_reservations_updated_at
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
