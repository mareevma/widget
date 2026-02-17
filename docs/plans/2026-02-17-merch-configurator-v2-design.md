# Merch Configurator v2 — Design Document

## Overview

Rework the merch configurator to match real business logic from Figma specs. The current generic sections/options model is replaced with an explicit Category → Fit → Material hierarchy with matrix pricing, print method costs, and quantity-based multipliers.

## Data Model

### Tables (replacing sections, options, pricing_rules)

**Keep unchanged:** `categories`, `orders`

**New tables:**

```
fits                — Оверсайз, Стандарт, Длинный рукав, Оверсайз Зип, Стандарт Зип
materials           — 470г х/б, 250г х/б, 230г пике, ...  (name + description)
product_variants    — (category_id, fit_id, material_id) → base_price  [UNIQUE triple]
print_methods       — DTF (250₽), Шелкография (500₽), Пафф (550₽), ... (name + price)
quantity_tiers      — min_qty, max_qty, multiplier (0.4–2.0)
color_palettes      — same structure, linked to material_id instead of option_id
```

**Remove:** `sections`, `options`, `pricing_rules`

### Price Formula

```
base_price    = product_variants[category, fit, material]
front_print   = print_methods[selected_front].price    // 0 if "Без нанесения"
back_print    = print_methods[selected_back].price      // 0 if "Без нанесения"

subtotal      = base_price + front_print + back_print
multiplier    = quantity_tiers.find(qty).multiplier

unit_price    = subtotal × multiplier
total         = unit_price × quantity
```

### Quantity Tier Multipliers

| Qty Range | Multiplier |
|-----------|------------|
| >10       | ×2.0       |
| 10–20     | ×0.9       |
| 20–50     | ×0.8       |
| 50–100    | ×0.7       |
| 100–200   | ×0.6       |
| 200–500   | ×0.5       |
| 500–1000  | ×0.45      |
| 1000+     | ×0.4       |

### Print Method Prices (initial, managed via admin)

| Method | Price |
|--------|-------|
| Без нанесения | 0₽ |
| DTF | 250₽ |
| Шелкография | 500₽ |
| Пафф | 550₽ |
| Флекстран | 650₽ |
| Вышивка | 650₽ |
| 3D эмбосинг | 650₽ |

## Widget UI/UX

### Flow (single scrollable form, sections appear sequentially)

1. **ИЗДЕЛИЕ** — card grid (2-3 per row), with photo. Always visible.
2. **ФАСОН** — pill buttons. Appears after category selected. Options derived from product_variants for selected category.
3. **МАТЕРИАЛ** — buttons with description (name + weight + composition). Appears after fit selected. Options derived from product_variants for (category, fit).
4. **ЦВЕТ** — round swatches + selected color name. Appears after material selected. From color_palettes for material_id. Skipped if no colors exist.
5. **НАНЕСЕНИЕ СПЕРЕДИ** — pill buttons with price (+250₽). "Без нанесения" selected by default.
6. **НАНЕСЕНИЕ СЗАДИ** — same as front.
7. **ТИРАЖ + ЦЕНА** — sticky footer. Quantity input (default 100), unit price, total (live update), "Оставить заявку" button.

### Reset behavior

- Category changed → reset fit, material, color
- Fit changed → reset material, color
- Material changed → reset color

### Layout

- Desktop: 45% preview / 55% configurator (two columns)
- Mobile: single column, preview on top (compact)

### Style

- Primary: `#FF5100` (orange)
- Background: `#1A1A1A`
- Cards: `#2A2A2A` with 12px radius
- Flat design, rounded blocks
- Font: system stack (site will use custom fonts later)

## Admin Panel

### Pages

```
Категории    — CRUD + image upload (add: Аксессуары, Сувенирка)
Фасоны       — simple CRUD list
Материалы    — CRUD with name + description
Цены         — matrix editor: category tabs → fit×material grid → price cells
Нанесение    — CRUD for print_methods (name + price)
Множители    — table: min_qty / max_qty / multiplier
Палитры      — same as before, linked to material_id
Заявки       — unchanged
```

### Matrix Price Editor

Select category → see table:

```
              │ 240г фр.терри │ 250г х/б │ 300г х/б │
──────────────┼───────────────┼──────────┼──────────┤
Оверсайз      │     1550      │   1550   │   1650   │
Стандарт      │       —       │   1550   │     —    │
```

- Filled cell = variant exists with this price
- Empty cell = combination not offered
- Click cell → edit price → save
- Adding fits/materials done on their respective pages

## Edge Cases

- No variant for selected triple → submit button disabled
- Quantity below min tier → show nearest tier multiplier or "Минимальный тираж: 10 шт"
- No colors for material → skip color step, don't block order
- Category with no variants (Аксессуары/Сувенирка) → show "Скоро появится"

## Order Data (saved to orders.configuration)

```json
{
  "category_id": 1,
  "fit_id": 2,
  "material_id": 5,
  "color_id": 12,
  "print_front_id": 3,
  "print_back_id": null,
  "quantity": 1000,
  "unit_price": 620,
  "multiplier": 0.4
}
```

## Categories (from Figma)

Худи, Футболки, Свитшот, Поло, Лонгслив, Шоппер, Аксессуары, Сувенирка

## Product Variants (from Figma screens)

### Футболки (розовый)
- Оверсайз + 240г френч терри = 1550₽
- Оверсайз + 250г х/б = 1550₽
- Оверсайз + 300г х/б = 1650₽
- Стандарт + 250г х/б = 1550₽
- Стандарт + 200г 92/8 = 1650₽

### Поло (бирюзовый)
- Стандарт + 230г пике = 1550₽
- Стандарт + 300г пике = 1650₽
- Длинный рукав + 230г пике = 1550₽
- Длинный рукав + 300г пике = 1650₽

### Худи (серый)
- Оверсайз + 420г х/б, 380г 92/8 peach, 470г х/б → prices from Figma
- Оверсайз Зип + same materials
- Стандарт + 350г 92/8, 380г 92/8 peach
- Стандарт Зип + same materials

### Свитшот (голубой)
- Оверсайз + 420г, 380г, 470г, 350г, 380г
- Стандарт + same materials

### Лонгслив (жёлтый)
- Оверсайз + 250г, 300г
- Стандарт + 250г, 200г

*Exact prices for Худи/Свитшот/Лонгслив to be entered via admin matrix editor.*
