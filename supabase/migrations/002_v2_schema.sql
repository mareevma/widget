-- ============================================
-- Merch Configurator v2 — schema migration
-- Replaces sections/options/pricing_rules with
-- fits, materials, product_variants, print_methods, quantity_tiers
-- ============================================

-- 1. Drop old tables (cascade removes dependent objects)
DROP TABLE IF EXISTS pricing_rules CASCADE;
DROP TABLE IF EXISTS color_palettes CASCADE;
DROP TABLE IF EXISTS options CASCADE;
DROP TABLE IF EXISTS sections CASCADE;

-- 2. Create new tables

CREATE TABLE fits (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE materials (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE product_variants (
  id SERIAL PRIMARY KEY,
  category_id INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  fit_id INT NOT NULL REFERENCES fits(id) ON DELETE CASCADE,
  material_id INT NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  base_price NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (category_id, fit_id, material_id)
);

CREATE TABLE print_methods (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE quantity_tiers (
  id SERIAL PRIMARY KEY,
  min_qty INT NOT NULL,
  max_qty INT,
  multiplier NUMERIC(4, 2) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Re-create color_palettes linked to materials table
CREATE TABLE color_palettes (
  id SERIAL PRIMARY KEY,
  material_id INT NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  color_name TEXT NOT NULL,
  hex_code TEXT NOT NULL,
  swatch_image_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Indexes
CREATE INDEX idx_product_variants_category ON product_variants(category_id);
CREATE INDEX idx_product_variants_fit ON product_variants(fit_id);
CREATE INDEX idx_product_variants_material ON product_variants(material_id);
CREATE INDEX idx_color_palettes_material ON color_palettes(material_id);

-- 4. RLS
ALTER TABLE fits ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE quantity_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE color_palettes ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Public read fits" ON fits FOR SELECT USING (true);
CREATE POLICY "Public read materials" ON materials FOR SELECT USING (true);
CREATE POLICY "Public read product_variants" ON product_variants FOR SELECT USING (true);
CREATE POLICY "Public read print_methods" ON print_methods FOR SELECT USING (true);
CREATE POLICY "Public read quantity_tiers" ON quantity_tiers FOR SELECT USING (true);
CREATE POLICY "Public read color_palettes" ON color_palettes FOR SELECT USING (is_active = true);

-- Admin full access
CREATE POLICY "Admin full fits" ON fits FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full materials" ON materials FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full product_variants" ON product_variants FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full print_methods" ON print_methods FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full quantity_tiers" ON quantity_tiers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full color_palettes" ON color_palettes FOR ALL USING (auth.role() = 'authenticated');
