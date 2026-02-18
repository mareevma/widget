-- ============================================
-- Merch Configurator v3 — category bindings and global palette
-- ============================================

-- 1) Bind fits/materials to categories
CREATE TABLE IF NOT EXISTS category_fits (
  id SERIAL PRIMARY KEY,
  category_id INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  fit_id INT NOT NULL REFERENCES fits(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (category_id, fit_id)
);

CREATE TABLE IF NOT EXISTS category_materials (
  id SERIAL PRIMARY KEY,
  category_id INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  material_id INT NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (category_id, material_id)
);

CREATE INDEX IF NOT EXISTS idx_category_fits_category ON category_fits(category_id);
CREATE INDEX IF NOT EXISTS idx_category_fits_fit ON category_fits(fit_id);
CREATE INDEX IF NOT EXISTS idx_category_materials_category ON category_materials(category_id);
CREATE INDEX IF NOT EXISTS idx_category_materials_material ON category_materials(material_id);

-- 2) Palette is now global (not bound to a single material)
ALTER TABLE color_palettes
  ALTER COLUMN material_id DROP NOT NULL;

-- 3) RLS for new binding tables
ALTER TABLE category_fits ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read category_fits" ON category_fits FOR SELECT USING (true);
CREATE POLICY "Public read category_materials" ON category_materials FOR SELECT USING (true);

CREATE POLICY "Admin full category_fits" ON category_fits FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full category_materials" ON category_materials FOR ALL USING (auth.role() = 'authenticated');
