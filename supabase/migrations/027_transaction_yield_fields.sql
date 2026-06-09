ALTER TABLE transactions
  ADD COLUMN subtype                          TEXT
                                              CHECK (subtype IN ('yield', 'correction')),
  ADD COLUMN is_estimated                     BOOLEAN       NOT NULL DEFAULT false,
  ADD COLUMN estimated_rate                   NUMERIC(10,6),
  ADD COLUMN original_amount                  NUMERIC(18,2),
  ADD COLUMN corrected_from_transaction_id    UUID          REFERENCES transactions(id) ON DELETE SET NULL,
  ADD COLUMN affects_budget                   BOOLEAN       NOT NULL DEFAULT true,
  ADD COLUMN yield_period_start               DATE,
  ADD COLUMN yield_period_end                 DATE;

-- Garantiza idempotencia: un solo rendimiento por billetera por período
CREATE UNIQUE INDEX idx_unique_yield_period
  ON transactions (wallet_id, yield_period_start, yield_period_end)
  WHERE subtype = 'yield' AND yield_period_start IS NOT NULL;
