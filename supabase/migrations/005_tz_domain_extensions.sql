-- ============================================
-- Merch Configurator v4 — TZ domain extensions
-- Adds explicit domain entities for:
-- products/categories, fits, materials, print methods, customizations
-- and their category bindings.
-- ============================================

-- 1) Extend existing dictionaries (backward compatible)
ALTER TABLE fits
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE materials
  ADD COLUMN IF NOT EXISTS material_group TEXT,
  ADD COLUMN IF NOT EXISTS composition TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE print_methods
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- 2) New dictionary: customizations
CREATE TABLE IF NOT EXISTS customizations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3) Category bindings for print methods and customizations
CREATE TABLE IF NOT EXISTS category_print_methods (
  id SERIAL PRIMARY KEY,
  category_id INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  print_method_id INT NOT NULL REFERENCES print_methods(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (category_id, print_method_id)
);

CREATE TABLE IF NOT EXISTS category_customizations (
  id SERIAL PRIMARY KEY,
  category_id INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  customization_id INT NOT NULL REFERENCES customizations(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (category_id, customization_id)
);

CREATE INDEX IF NOT EXISTS idx_category_print_methods_category ON category_print_methods(category_id);
CREATE INDEX IF NOT EXISTS idx_category_print_methods_method ON category_print_methods(print_method_id);
CREATE INDEX IF NOT EXISTS idx_category_customizations_category ON category_customizations(category_id);
CREATE INDEX IF NOT EXISTS idx_category_customizations_customization ON category_customizations(customization_id);

-- 4) RLS
ALTER TABLE customizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_print_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_customizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read customizations" ON customizations;
DROP POLICY IF EXISTS "Public read category_print_methods" ON category_print_methods;
DROP POLICY IF EXISTS "Public read category_customizations" ON category_customizations;
DROP POLICY IF EXISTS "Admin full customizations" ON customizations;
DROP POLICY IF EXISTS "Admin full category_print_methods" ON category_print_methods;
DROP POLICY IF EXISTS "Admin full category_customizations" ON category_customizations;

CREATE POLICY "Public read customizations" ON customizations FOR SELECT USING (is_active = true);
CREATE POLICY "Public read category_print_methods" ON category_print_methods FOR SELECT USING (true);
CREATE POLICY "Public read category_customizations" ON category_customizations FOR SELECT USING (true);

CREATE POLICY "Admin full customizations" ON customizations FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full category_print_methods" ON category_print_methods FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full category_customizations" ON category_customizations FOR ALL USING (auth.role() = 'authenticated');
