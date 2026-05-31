-- Safe: adds cap_amount column only if it doesn't exist. Existing refunds remain unchanged (NULL).
ALTER TABLE public.refunds ADD COLUMN IF NOT EXISTS cap_amount NUMERIC;
