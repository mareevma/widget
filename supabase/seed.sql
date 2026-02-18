-- ============================================
-- Merch Configurator v4 — seed data (TZ-aligned)
-- ============================================

TRUNCATE
  category_customization_prices,
  category_customizations,
  category_print_methods,
  customizations,
  category_fits,
  category_materials,
  product_variants,
  color_palettes,
  quantity_tiers,
  print_methods,
  materials,
  fits,
  categories
RESTART IDENTITY CASCADE;

-- Categories (product types from TZ)
INSERT INTO categories (name, sort_order, is_active) VALUES
  ('Футболки', 1, true),
  ('Лонгсливы', 2, true),
  ('Худи', 3, true),
  ('Худи зип', 4, true),
  ('Поло', 5, true),
  ('Свитшоты', 6, true),
  ('Бейсболки', 7, true),
  ('Бомберы', 8, true),
  ('Шопперы', 9, true);

-- Fits
INSERT INTO fits (name, description, sort_order, is_active) VALUES
  ('Оверсайз', 'Свободная посадка', 1, true),
  ('Стандарт', 'Классическая посадка', 2, true),
  ('Классика', 'Базовый крой для поло/лонгсливов', 3, true);

-- Materials (grouped for flexible linking in admin)
INSERT INTO materials (name, material_group, composition, description, sort_order, is_active) VALUES
  ('Кулирка 200г', 'jersey', '92% хлопок / 8% полиэстер', 'Для футболок и лонгсливов', 1, true),
  ('Кулирка 240г', 'jersey', '100% хлопок', 'Для футболок и лонгсливов', 2, true),
  ('Кулирка 300г', 'jersey', '100% хлопок', 'Для футболок и лонгсливов', 3, true),
  ('Френч терри 240г', 'jersey', '92% хлопок / 8% полиэстер', 'Для футболок и лонгсливов', 4, true),
  ('Футер 330г петля', 'fleece', '92% хлопок / 8% полиэстер', 'Для худи/свитшотов/бомберов', 5, true),
  ('Футер 330г начес', 'fleece', '92% хлопок / 8% полиэстер', 'Для худи/свитшотов/бомберов', 6, true),
  ('Футер 350г пич эффект', 'fleece', '92% хлопок / 8% полиэстер', 'Для худи/свитшотов/бомберов', 7, true),
  ('Футер 430г диагональ', 'fleece', '100% хлопок', 'Для худи/свитшотов/бомберов', 8, true),
  ('Футер 430г микроначес', 'fleece', '100% хлопок', 'Для худи/свитшотов/бомберов', 9, true),
  ('Футер 470г петля', 'fleece', '100% хлопок', 'Для худи/свитшотов/бомберов', 10, true),
  ('Футер 500г петля', 'fleece', '100% хлопок', 'Для худи/свитшотов/бомберов', 11, true),
  ('Пике 190г', 'pique', 'Пике', 'Для поло', 12, true),
  ('Пике 210г', 'pique', 'Пике', 'Для поло', 13, true),
  ('Пике 300г', 'pique', 'Пике', 'Для поло', 14, true);

-- Print methods
INSERT INTO print_methods (name, description, price, sort_order, is_active) VALUES
  ('Без нанесения', 'Без печати', 0, 1, true),
  ('Шелкография (А4)', 'Классическая шелкография', 500, 2, true),
  ('Шелкография (пафф) (А4)', 'Объемный эффект', 650, 3, true),
  ('Шелкография (3D) (А4)', '3D печать шелкографией', 700, 4, true),
  ('Вышивка (до А5)', 'Вышивка до формата A5', 800, 5, true),
  ('Эмбосинг 3D (А4)', 'Тиснение с 3D-эффектом', 850, 6, true),
  ('Флекстран (А5)', 'Термотрансфер до A5', 750, 7, true),
  ('DTF (А4)', 'DTF-печать до A4', 600, 8, true);

-- Customizations
INSERT INTO customizations (name, description, price, sort_order, is_active) VALUES
  ('Варка изделия', 'Дополнительная обработка ткани', 300, 1, true),
  ('Дистресс', 'Состаривание/эффект потертости', 250, 2, true),
  ('Лейблы', 'Кастомные лейблы и бирки', 200, 3, true),
  ('Упаковка', 'Индивидуальная упаковка', 120, 4, true);

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

-- Product variants (base prices are placeholders and can be tuned in admin)
INSERT INTO product_variants (category_id, fit_id, material_id, base_price)
SELECT c.id, f.id, m.id,
  CASE
    WHEN c.name IN ('Футболки', 'Лонгсливы') THEN 1600
    WHEN c.name IN ('Поло') THEN 1750
    WHEN c.name IN ('Худи', 'Худи зип', 'Свитшоты', 'Бомберы') THEN 2600
    ELSE 1900
  END
FROM categories c
JOIN fits f ON
  (c.name IN ('Футболки', 'Лонгсливы', 'Поло') AND f.name IN ('Оверсайз', 'Стандарт', 'Классика'))
  OR (c.name IN ('Худи', 'Худи зип', 'Свитшоты', 'Бомберы') AND f.name IN ('Оверсайз', 'Стандарт'))
JOIN materials m ON
  (c.name IN ('Футболки', 'Лонгсливы') AND m.material_group = 'jersey')
  OR (c.name IN ('Поло') AND m.material_group = 'pique')
  OR (c.name IN ('Худи', 'Худи зип', 'Свитшоты', 'Бомберы') AND m.material_group = 'fleece');

-- Category bindings (derived from variants)
INSERT INTO category_fits (category_id, fit_id, sort_order)
SELECT DISTINCT pv.category_id, pv.fit_id, f.sort_order
FROM product_variants pv
JOIN fits f ON f.id = pv.fit_id
ORDER BY pv.category_id, f.sort_order;

INSERT INTO category_materials (category_id, material_id, sort_order)
SELECT DISTINCT pv.category_id, pv.material_id, m.sort_order
FROM product_variants pv
JOIN materials m ON m.id = pv.material_id
ORDER BY pv.category_id, m.sort_order;

-- Bind print methods/customizations to categories that have variants
INSERT INTO category_print_methods (category_id, print_method_id, sort_order)
SELECT c.id, pm.id, pm.sort_order
FROM categories c
JOIN print_methods pm ON true
WHERE EXISTS (SELECT 1 FROM product_variants pv WHERE pv.category_id = c.id);

INSERT INTO category_customizations (category_id, customization_id, sort_order)
SELECT c.id, cu.id, cu.sort_order
FROM categories c
JOIN customizations cu ON true
WHERE EXISTS (SELECT 1 FROM product_variants pv WHERE pv.category_id = c.id);

-- Color palette per material (can be edited in admin later)
WITH base_colors AS (
  SELECT * FROM (VALUES
    ('Белый', '#F2F2F2', 1),
    ('Черный', '#1A1A1A', 2),
    ('Серый', '#7A7A7A', 3),
    ('Бежевый', '#D6C3A5', 4),
    ('Синий', '#2F4F9D', 5),
    ('Зеленый', '#4A7C59', 6),
    ('Красный', '#B33A3A', 7),
    ('Оранжевый', '#FF5100', 8)
  ) AS t(color_name, hex_code, sort_order)
)
INSERT INTO color_palettes (material_id, color_name, hex_code, sort_order, is_active)
SELECT m.id, bc.color_name, bc.hex_code, bc.sort_order, true
FROM materials m
CROSS JOIN base_colors bc;
