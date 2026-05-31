-- 1. Agregar columna is_system
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE;

-- 2. Crear "Sin categoría" expense por usuario (idempotente)
-- INNER JOIN auth.users filtra perfiles huérfanos que ya no tienen usuario activo
INSERT INTO categories (user_id, name, type, color, icon, is_system)
SELECT p.id, 'Sin categoría', 'expense', '#9ca3af', 'tag', true
FROM profiles p
INNER JOIN auth.users au ON au.id = p.id
WHERE NOT EXISTS (
  SELECT 1 FROM categories c
  WHERE c.user_id = p.id AND c.name = 'Sin categoría'
    AND c.type = 'expense' AND c.is_system = true
);

-- 3. Crear "Sin categoría" income por usuario (idempotente)
INSERT INTO categories (user_id, name, type, color, icon, is_system)
SELECT p.id, 'Sin categoría', 'income', '#9ca3af', 'tag', true
FROM profiles p
INNER JOIN auth.users au ON au.id = p.id
WHERE NOT EXISTS (
  SELECT 1 FROM categories c
  WHERE c.user_id = p.id AND c.name = 'Sin categoría'
    AND c.type = 'income' AND c.is_system = true
);

-- 4. Migrar transacciones con category_id NULL → asignar "Sin categoría" del mismo type
UPDATE transactions t
SET category_id = (
  SELECT c.id FROM categories c
  WHERE c.user_id = t.user_id
    AND c.name = 'Sin categoría'
    AND c.type = t.type
    AND c.is_system = true
  LIMIT 1
)
WHERE t.category_id IS NULL;
