-- ============================================
-- Merch Configurator v5 — customization prices per category
-- Optional price overrides for customizations by category.
-- ============================================

CREATE TABLE IF NOT EXISTS category_customization_prices (
  id SERIAL PRIMARY KEY,
  category_id INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  customization_id INT NOT NULL REFERENCES customizations(id) ON DELETE CASCADE,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (category_id, customization_id)
);

CREATE INDEX IF NOT EXISTS idx_category_customization_prices_category
  ON category_customization_prices(category_id);
CREATE INDEX IF NOT EXISTS idx_category_customization_prices_customization
  ON category_customization_prices(customization_id);

ALTER TABLE category_customization_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read category_customization_prices" ON category_customization_prices;
DROP POLICY IF EXISTS "Admin full category_customization_prices" ON category_customization_prices;

CREATE POLICY "Public read category_customization_prices"
ON category_customization_prices
FOR SELECT
USING (true);

CREATE POLICY "Admin full category_customization_prices"
ON category_customization_prices
FOR ALL
USING (auth.role() = 'authenticated');
