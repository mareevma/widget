-- ============================================
-- Merch Configurator v2 — seed data
-- ============================================

-- Clear existing data
TRUNCATE categories, fits, materials, product_variants, print_methods, quantity_tiers, color_palettes CASCADE;

-- Categories (from Figma)
INSERT INTO categories (name, sort_order, is_active) VALUES
  ('Худи', 1, true),
  ('Футболки', 2, true),
  ('Свитшот', 3, true),
  ('Поло', 4, true),
  ('Лонгслив', 5, true),
  ('Шоппер', 6, true),
  ('Аксессуары', 7, true),
  ('Сувенирка', 8, true);

-- Fits
INSERT INTO fits (name, sort_order) VALUES
  ('Оверсайз', 1),
  ('Стандарт', 2),
  ('Длинный рукав', 3),
  ('Оверсайз Зип', 4),
  ('Стандарт Зип', 5);

-- Materials
INSERT INTO materials (name, description, sort_order) VALUES
  ('240г френч терри', '92% хлопок / 8% полиэстер', 1),
  ('250г х/б', '100% хлопок', 2),
  ('300г х/б', '100% хлопок', 3),
  ('200г 92/8', '92% хлопок / 8% полиэстер', 4),
  ('230г пике', '100% хлопок, пике', 5),
  ('300г пике', '100% хлопок, пике', 6),
  ('420г х/б', '100% хлопок', 7),
  ('380г 92/8 peach', '92% хлопок / 8% полиэстер, пич эффект', 8),
  ('470г х/б', '100% хлопок', 9),
  ('350г 92/8', '92% хлопок / 8% полиэстер', 10);

-- Print methods
INSERT INTO print_methods (name, price, sort_order) VALUES
  ('Без нанесения', 0, 1),
  ('DTF', 250, 2),
  ('Шелкография', 500, 3),
  ('Пафф', 550, 4),
  ('Флекстран', 650, 5),
  ('Вышивка', 650, 6),
  ('3D эмбосинг', 650, 7);

-- Quantity tiers
INSERT INTO quantity_tiers (min_qty, max_qty, multiplier, sort_order) VALUES
  (1, 9, 2.0, 1),
  (10, 19, 0.9, 2),
  (20, 49, 0.8, 3),
  (50, 99, 0.7, 4),
  (100, 199, 0.6, 5),
  (200, 499, 0.5, 6),
  (500, 999, 0.45, 7),
  (1000, NULL, 0.4, 8);

-- Product variants: Футболки (category 2)
-- Оверсайз (fit 1) + materials
INSERT INTO product_variants (category_id, fit_id, material_id, base_price) VALUES
  (2, 1, 1, 1550),   -- Футболки + Оверсайз + 240г френч терри
  (2, 1, 2, 1550),   -- Футболки + Оверсайз + 250г х/б
  (2, 1, 3, 1650),   -- Футболки + Оверсайз + 300г х/б
  (2, 2, 2, 1550),   -- Футболки + Стандарт + 250г х/б
  (2, 2, 4, 1650);   -- Футболки + Стандарт + 200г 92/8

-- Product variants: Поло (category 4)
INSERT INTO product_variants (category_id, fit_id, material_id, base_price) VALUES
  (4, 2, 5, 1550),   -- Поло + Стандарт + 230г пике
  (4, 2, 6, 1650),   -- Поло + Стандарт + 300г пике
  (4, 3, 5, 1550),   -- Поло + Длинный рукав + 230г пике
  (4, 3, 6, 1650);   -- Поло + Длинный рукав + 300г пике

-- Product variants: Худи (category 1) — prices TBD, using placeholders
INSERT INTO product_variants (category_id, fit_id, material_id, base_price) VALUES
  (1, 1, 7, 2500),   -- Худи + Оверсайз + 420г х/б
  (1, 1, 8, 2400),   -- Худи + Оверсайз + 380г 92/8 peach
  (1, 1, 9, 2700),   -- Худи + Оверсайз + 470г х/б
  (1, 4, 7, 2600),   -- Худи + Оверсайз Зип + 420г х/б
  (1, 4, 8, 2500),   -- Худи + Оверсайз Зип + 380г 92/8 peach
  (1, 4, 9, 2800),   -- Худи + Оверсайз Зип + 470г х/б
  (1, 2, 10, 2300),  -- Худи + Стандарт + 350г 92/8
  (1, 2, 8, 2400),   -- Худи + Стандарт + 380г 92/8 peach
  (1, 5, 10, 2400),  -- Худи + Стандарт Зип + 350г 92/8
  (1, 5, 8, 2500);   -- Худи + Стандарт Зип + 380г 92/8 peach

-- Product variants: Свитшот (category 3) — prices TBD
INSERT INTO product_variants (category_id, fit_id, material_id, base_price) VALUES
  (3, 1, 7, 2200),   -- Свитшот + Оверсайз + 420г х/б
  (3, 1, 8, 2100),   -- Свитшот + Оверсайз + 380г 92/8 peach
  (3, 1, 9, 2400),   -- Свитшот + Оверсайз + 470г х/б
  (3, 2, 10, 2000),  -- Свитшот + Стандарт + 350г 92/8
  (3, 2, 8, 2100);   -- Свитшот + Стандарт + 380г 92/8 peach

-- Product variants: Лонгслив (category 5) — prices TBD
INSERT INTO product_variants (category_id, fit_id, material_id, base_price) VALUES
  (5, 1, 2, 1650),   -- Лонгслив + Оверсайз + 250г х/б
  (5, 1, 3, 1750),   -- Лонгслив + Оверсайз + 300г х/б
  (5, 2, 2, 1650),   -- Лонгслив + Стандарт + 250г х/б
  (5, 2, 4, 1750);   -- Лонгслив + Стандарт + 200г 92/8
