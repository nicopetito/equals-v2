-- Tipo semántico de billetera: efectivo, banco, billetera virtual, inversión
ALTER TABLE wallets
  ADD COLUMN IF NOT EXISTS wallet_type TEXT DEFAULT 'digital'
    CHECK (wallet_type IN ('cash', 'bank', 'digital', 'investment'));

-- Flag para excluir billetera del balance y patrimonio neto (útil para dinero bloqueado)
ALTER TABLE wallets
  ADD COLUMN IF NOT EXISTS include_in_balance BOOLEAN NOT NULL DEFAULT true;

-- Backfill para billeteras existentes según su provider
UPDATE wallets SET wallet_type = 'cash'       WHERE provider = 'Cash';
UPDATE wallets SET wallet_type = 'bank'       WHERE provider IN ('Banco', 'Brubank');
UPDATE wallets SET wallet_type = 'investment' WHERE provider = 'Binance';
-- Las demás ('Mercado Pago', 'Ualá', 'Otro', NULL) quedan como 'digital' por el DEFAULT
