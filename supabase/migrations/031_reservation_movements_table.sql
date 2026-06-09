CREATE TABLE IF NOT EXISTS public.reservation_movements (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID        NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type           TEXT        NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
  amount         NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  transaction_id UUID        REFERENCES public.transactions(id) ON DELETE SET NULL,
  note           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reservation_movements_reservation
  ON public.reservation_movements(reservation_id);

CREATE INDEX idx_reservation_movements_user
  ON public.reservation_movements(user_id);

ALTER TABLE public.reservation_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reservation_movements_owner"
  ON public.reservation_movements FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
