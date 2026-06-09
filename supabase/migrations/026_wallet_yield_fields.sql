ALTER TABLE wallets
  ADD COLUMN generates_yield          BOOLEAN       NOT NULL DEFAULT false,
  ADD COLUMN yield_mode               TEXT          DEFAULT 'estimated'
                                      CHECK (yield_mode IN ('estimated', 'manual')),
  ADD COLUMN annual_yield_rate        NUMERIC(10,6),
  ADD COLUMN yield_frequency          TEXT          DEFAULT 'daily'
                                      CHECK (yield_frequency IN ('daily', 'business_days')),
  ADD COLUMN last_yield_calculated_at DATE;
