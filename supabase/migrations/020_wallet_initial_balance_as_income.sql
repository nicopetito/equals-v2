-- Paso 1: Crear categoría sistema "Saldo inicial" (income) por usuario
INSERT INTO categories (user_id, name, type, color, icon, is_system)
SELECT p.id, 'Saldo inicial', 'income', '#10b981', 'wallet', true
FROM profiles p
INNER JOIN auth.users au ON au.id = p.id
WHERE NOT EXISTS (
  SELECT 1 FROM categories c
  WHERE c.user_id = p.id AND c.name = 'Saldo inicial'
    AND c.type = 'income' AND c.is_system = true
);

-- Paso 2: Crear transacción income para cada billetera con balance > 0
INSERT INTO transactions (user_id, wallet_id, type, amount, currency, description, category_id, date)
SELECT
  w.user_id,
  w.id,
  'income',
  w.balance,
  w.currency,
  'Saldo inicial',
  (
    SELECT c.id FROM categories c
    WHERE c.user_id = w.user_id AND c.name = 'Saldo inicial'
      AND c.type = 'income' AND c.is_system = true
    LIMIT 1
  ),
  w.created_at::date
FROM wallets w
WHERE w.balance > 0;

-- Paso 3: Poner balance en 0 (ya está capturado como transacción)
UPDATE wallets SET balance = 0 WHERE balance > 0;
