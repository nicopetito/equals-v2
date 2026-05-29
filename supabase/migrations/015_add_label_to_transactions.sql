-- Add label column to transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS label TEXT;

-- Recreate view to expose label
CREATE OR REPLACE VIEW transactions_with_details AS
 SELECT t.id,
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
    c.name AS category_name,
    c.color AS category_color,
    c.icon AS category_icon,
    w.name AS wallet_name,
    w.provider AS wallet_provider,
    t.label
   FROM ((transactions t
     LEFT JOIN categories c ON ((c.id = t.category_id)))
     LEFT JOIN wallets w ON ((w.id = t.wallet_id)));
