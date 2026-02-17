-- Categories (product types)
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Configurator sections
CREATE TABLE sections (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  depends_on_category BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Options within sections
CREATE TABLE options (
  id SERIAL PRIMARY KEY,
  section_id INT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  available_for_categories INT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pricing rules
CREATE TABLE pricing_rules (
  id SERIAL PRIMARY KEY,
  category_id INT REFERENCES categories(id) ON DELETE CASCADE,
  option_id INT REFERENCES options(id) ON DELETE CASCADE,
  base_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  price_type TEXT NOT NULL DEFAULT 'fixed' CHECK (price_type IN ('fixed', 'per_unit', 'tiered')),
  tiers JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Color palettes linked to material options
CREATE TABLE color_palettes (
  id SERIAL PRIMARY KEY,
  material_option_id INT NOT NULL REFERENCES options(id) ON DELETE CASCADE,
  color_name TEXT NOT NULL,
  hex_code TEXT NOT NULL,
  swatch_image_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Customer orders
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  customer_name TEXT NOT NULL,
  customer_contact TEXT NOT NULL,
  customer_comment TEXT,
  configuration JSONB NOT NULL,
  quantity INT NOT NULL,
  calculated_price NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'new'
);

-- Indexes
CREATE INDEX idx_options_section_id ON options(section_id);
CREATE INDEX idx_options_available_categories ON options USING gin(available_for_categories);
CREATE INDEX idx_pricing_rules_category ON pricing_rules(category_id);
CREATE INDEX idx_pricing_rules_option ON pricing_rules(option_id);
CREATE INDEX idx_color_palettes_material ON color_palettes(material_option_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- RLS Policies
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE options ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE color_palettes ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Public read access for widget
CREATE POLICY "Public read categories" ON categories FOR SELECT USING (is_active = true);
CREATE POLICY "Public read sections" ON sections FOR SELECT USING (is_active = true);
CREATE POLICY "Public read options" ON options FOR SELECT USING (is_active = true);
CREATE POLICY "Public read pricing_rules" ON pricing_rules FOR SELECT USING (true);
CREATE POLICY "Public read color_palettes" ON color_palettes FOR SELECT USING (is_active = true);

-- Public insert for orders (anyone can submit)
CREATE POLICY "Public insert orders" ON orders FOR INSERT WITH CHECK (true);

-- Admin full access (authenticated users)
CREATE POLICY "Admin full categories" ON categories FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full sections" ON sections FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full options" ON options FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full pricing_rules" ON pricing_rules FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full color_palettes" ON color_palettes FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full orders" ON orders FOR ALL USING (auth.role() = 'authenticated');

-- Storage bucket for images
-- (Run in Supabase dashboard: create 'images' bucket, public access)
