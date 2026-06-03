-- Crear categoría sistema "Ajuste" (income) por usuario
INSERT INTO categories (user_id, name, type, color, icon, is_system)
SELECT p.id, 'Ajuste', 'income', '#6366f1', 'sliders-horizontal', true
FROM profiles p
INNER JOIN auth.users au ON au.id = p.id
WHERE NOT EXISTS (
  SELECT 1 FROM categories c
  WHERE c.user_id = p.id AND c.name = 'Ajuste'
    AND c.type = 'income' AND c.is_system = true
);

-- Crear categoría sistema "Ajuste" (expense) por usuario
INSERT INTO categories (user_id, name, type, color, icon, is_system)
SELECT p.id, 'Ajuste', 'expense', '#6366f1', 'sliders-horizontal', true
FROM profiles p
INNER JOIN auth.users au ON au.id = p.id
WHERE NOT EXISTS (
  SELECT 1 FROM categories c
  WHERE c.user_id = p.id AND c.name = 'Ajuste'
    AND c.type = 'expense' AND c.is_system = true
);
