ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE categories
SET is_default = true
WHERE is_system = false
  AND (name, type) IN (
    ('Alimentación',    'expense'),
    ('Transporte',      'expense'),
    ('Salud',           'expense'),
    ('Entretenimiento', 'expense'),
    ('Ropa',            'expense'),
    ('Hogar',           'expense'),
    ('Educación',       'expense'),
    ('Servicios',       'expense'),
    ('Otros gastos',    'expense'),
    ('Sueldo',          'income'),
    ('Freelance',       'income'),
    ('Inversiones',     'income'),
    ('Otros ingresos',  'income')
  );
