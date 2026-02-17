# Merch Configurator v2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace generic sections/options model with explicit Category → Fit → Material hierarchy, matrix pricing, print method costs, and quantity-based multipliers.

**Architecture:** Supabase PostgreSQL with new tables (fits, materials, product_variants, print_methods, quantity_tiers). Widget rewrites pricing engine, API, state, and UI to use the new sequential flow. Admin gets new CRUD pages and a matrix price editor.

**Tech Stack:** Vanilla JS (widget, Shadow DOM), React 19 (admin), Supabase, Vite, Vitest, Tailwind CSS v4

---

## Phase 1: Database Migration

### Task 1: Write v2 database migration

**Files:**
- Create: `supabase/migrations/002_v2_schema.sql`

**Step 1: Write the migration SQL**

Create `supabase/migrations/002_v2_schema.sql`:

```sql
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
```

**Step 2: Commit**

```bash
git add supabase/migrations/002_v2_schema.sql
git commit -m "feat: add v2 schema migration — fits, materials, product_variants, print_methods, quantity_tiers"
```

---

### Task 2: Write v2 seed data

**Files:**
- Modify: `supabase/seed.sql` (full rewrite)

**Step 1: Rewrite seed.sql**

Replace entire contents of `supabase/seed.sql`:

```sql
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
```

**Step 2: Commit**

```bash
git add supabase/seed.sql
git commit -m "feat: rewrite seed data for v2 schema with real product variants"
```

---

## Phase 2: Widget Core Logic (TDD)

### Task 3: Rewrite pricing engine with tests

**Files:**
- Modify: `widget/src/pricing.js` (full rewrite)
- Modify: `widget/src/__tests__/pricing.test.js` (full rewrite)

**Step 1: Write the failing tests**

Replace `widget/src/__tests__/pricing.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { getMultiplier, calculatePrice } from '../pricing.js';

describe('getMultiplier', () => {
  const tiers = [
    { min_qty: 1, max_qty: 9, multiplier: 2.0 },
    { min_qty: 10, max_qty: 19, multiplier: 0.9 },
    { min_qty: 20, max_qty: 49, multiplier: 0.8 },
    { min_qty: 50, max_qty: 99, multiplier: 0.7 },
    { min_qty: 100, max_qty: 199, multiplier: 0.6 },
    { min_qty: 200, max_qty: 499, multiplier: 0.5 },
    { min_qty: 500, max_qty: 999, multiplier: 0.45 },
    { min_qty: 1000, max_qty: null, multiplier: 0.4 },
  ];

  it('returns 2.0 for qty=5', () => {
    expect(getMultiplier(tiers, 5)).toBe(2.0);
  });

  it('returns 0.9 for qty=10', () => {
    expect(getMultiplier(tiers, 10)).toBe(0.9);
  });

  it('returns 0.6 for qty=100', () => {
    expect(getMultiplier(tiers, 100)).toBe(0.6);
  });

  it('returns 0.4 for qty=1000', () => {
    expect(getMultiplier(tiers, 1000)).toBe(0.4);
  });

  it('returns 0.4 for qty=5000 (open-ended last tier)', () => {
    expect(getMultiplier(tiers, 5000)).toBe(0.4);
  });

  it('returns 1 when no tiers provided', () => {
    expect(getMultiplier([], 100)).toBe(1);
  });
});

describe('calculatePrice', () => {
  const tiers = [
    { min_qty: 1, max_qty: 9, multiplier: 2.0 },
    { min_qty: 10, max_qty: 19, multiplier: 0.9 },
    { min_qty: 100, max_qty: 199, multiplier: 0.6 },
    { min_qty: 1000, max_qty: null, multiplier: 0.4 },
  ];

  it('calculates with no print methods', () => {
    const result = calculatePrice({
      basePrice: 1550,
      frontPrintPrice: 0,
      backPrintPrice: 0,
      quantity: 1000,
      tiers,
    });
    // subtotal = 1550, multiplier = 0.4, unit = 620, total = 620000
    expect(result.unitPrice).toBe(620);
    expect(result.total).toBe(620000);
    expect(result.multiplier).toBe(0.4);
  });

  it('calculates with front + back print', () => {
    const result = calculatePrice({
      basePrice: 1550,
      frontPrintPrice: 250,
      backPrintPrice: 500,
      quantity: 100,
      tiers,
    });
    // subtotal = 1550 + 250 + 500 = 2300, multiplier = 0.6, unit = 1380, total = 138000
    expect(result.unitPrice).toBe(1380);
    expect(result.total).toBe(138000);
  });

  it('calculates with small quantity (multiplier > 1)', () => {
    const result = calculatePrice({
      basePrice: 1550,
      frontPrintPrice: 250,
      backPrintPrice: 0,
      quantity: 5,
      tiers,
    });
    // subtotal = 1800, multiplier = 2.0, unit = 3600, total = 18000
    expect(result.unitPrice).toBe(3600);
    expect(result.total).toBe(18000);
  });

  it('returns zeros when basePrice is 0', () => {
    const result = calculatePrice({
      basePrice: 0,
      frontPrintPrice: 0,
      backPrintPrice: 0,
      quantity: 100,
      tiers,
    });
    expect(result.unitPrice).toBe(0);
    expect(result.total).toBe(0);
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
cd widget && npx vitest run src/__tests__/pricing.test.js
```

Expected: FAIL (old functions don't match new signatures)

**Step 3: Write the implementation**

Replace `widget/src/pricing.js`:

```js
/**
 * Find quantity multiplier from tiers.
 * @param {Array<{min_qty: number, max_qty: number|null, multiplier: number}>} tiers
 * @param {number} quantity
 * @returns {number}
 */
export function getMultiplier(tiers, quantity) {
  if (!tiers || tiers.length === 0) return 1;
  for (const tier of tiers) {
    if (quantity >= tier.min_qty && (tier.max_qty === null || quantity <= tier.max_qty)) {
      return Number(tier.multiplier);
    }
  }
  return 1;
}

/**
 * Calculate price using v2 formula:
 *   subtotal = basePrice + frontPrintPrice + backPrintPrice
 *   unitPrice = subtotal × multiplier(qty)
 *   total = unitPrice × quantity
 *
 * @param {{basePrice: number, frontPrintPrice: number, backPrintPrice: number, quantity: number, tiers: Array}} params
 * @returns {{unitPrice: number, total: number, multiplier: number, subtotal: number}}
 */
export function calculatePrice({ basePrice, frontPrintPrice, backPrintPrice, quantity, tiers }) {
  const subtotal = basePrice + frontPrintPrice + backPrintPrice;
  const multiplier = getMultiplier(tiers, quantity);
  const unitPrice = Math.round(subtotal * multiplier);
  const total = unitPrice * quantity;
  return { unitPrice, total, multiplier, subtotal };
}
```

**Step 4: Run tests to verify they pass**

```bash
cd widget && npx vitest run src/__tests__/pricing.test.js
```

Expected: all PASS

**Step 5: Commit**

```bash
git add widget/src/pricing.js widget/src/__tests__/pricing.test.js
git commit -m "feat: rewrite pricing engine for v2 multiplier model (TDD)"
```

---

### Task 4: Rewrite API module

**Files:**
- Modify: `widget/src/api.js` (full rewrite)

**Step 1: Rewrite api.js**

Replace entire `widget/src/api.js`:

```js
import { getSupabase } from './supabase.js';

export async function fetchCategories() {
  const { data, error } = await getSupabase()
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw error;
  return data;
}

export async function fetchFits() {
  const { data, error } = await getSupabase()
    .from('fits')
    .select('*')
    .order('sort_order');
  if (error) throw error;
  return data;
}

export async function fetchMaterials() {
  const { data, error } = await getSupabase()
    .from('materials')
    .select('*')
    .order('sort_order');
  if (error) throw error;
  return data;
}

export async function fetchProductVariants() {
  const { data, error } = await getSupabase()
    .from('product_variants')
    .select('*');
  if (error) throw error;
  return data;
}

export async function fetchPrintMethods() {
  const { data, error } = await getSupabase()
    .from('print_methods')
    .select('*')
    .order('sort_order');
  if (error) throw error;
  return data;
}

export async function fetchQuantityTiers() {
  const { data, error } = await getSupabase()
    .from('quantity_tiers')
    .select('*')
    .order('sort_order');
  if (error) throw error;
  return data;
}

export async function fetchColorPalettes() {
  const { data, error } = await getSupabase()
    .from('color_palettes')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw error;
  return data;
}

export async function submitOrder(order) {
  const { data, error } = await getSupabase()
    .from('orders')
    .insert(order)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchAllData() {
  const [categories, fits, materials, productVariants, printMethods, quantityTiers, colorPalettes] =
    await Promise.all([
      fetchCategories(),
      fetchFits(),
      fetchMaterials(),
      fetchProductVariants(),
      fetchPrintMethods(),
      fetchQuantityTiers(),
      fetchColorPalettes(),
    ]);
  return { categories, fits, materials, productVariants, printMethods, quantityTiers, colorPalettes };
}
```

**Step 2: Commit**

```bash
git add widget/src/api.js
git commit -m "feat: rewrite API module for v2 data model"
```

---

### Task 5: Rewrite state management

**Files:**
- Modify: `widget/src/state.js` (full rewrite)

**Step 1: Rewrite state.js**

Replace entire `widget/src/state.js`:

```js
export function createStore() {
  let state = {
    categoryId: null,
    fitId: null,
    materialId: null,
    colorId: null,
    printFrontId: null,
    printBackId: null,
    quantity: 100,
  };

  let data = {
    categories: [],
    fits: [],
    materials: [],
    productVariants: [],
    printMethods: [],
    quantityTiers: [],
    colorPalettes: [],
  };

  const listeners = new Set();

  function getState() {
    return { ...state };
  }

  function update(partial) {
    state = { ...state, ...partial };
    listeners.forEach((fn) => fn(state));
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function setData(newData) {
    data = newData;
  }

  function getData() {
    return data;
  }

  /** Fits available for selected category (from product_variants) */
  function getAvailableFits() {
    if (!state.categoryId) return [];
    const fitIds = new Set(
      data.productVariants
        .filter((v) => v.category_id === state.categoryId)
        .map((v) => v.fit_id)
    );
    return data.fits.filter((f) => fitIds.has(f.id));
  }

  /** Materials available for selected (category, fit) */
  function getAvailableMaterials() {
    if (!state.categoryId || !state.fitId) return [];
    const materialIds = new Set(
      data.productVariants
        .filter((v) => v.category_id === state.categoryId && v.fit_id === state.fitId)
        .map((v) => v.material_id)
    );
    return data.materials.filter((m) => materialIds.has(m.id));
  }

  /** Colors for selected material */
  function getAvailableColors() {
    if (!state.materialId) return [];
    return data.colorPalettes.filter((c) => c.material_id === state.materialId);
  }

  /** Get the base price for current (category, fit, material) triple */
  function getBasePrice() {
    if (!state.categoryId || !state.fitId || !state.materialId) return 0;
    const variant = data.productVariants.find(
      (v) =>
        v.category_id === state.categoryId &&
        v.fit_id === state.fitId &&
        v.material_id === state.materialId
    );
    return variant ? Number(variant.base_price) : 0;
  }

  /** Get print method price by id */
  function getPrintPrice(printMethodId) {
    if (!printMethodId) return 0;
    const method = data.printMethods.find((m) => m.id === printMethodId);
    return method ? Number(method.price) : 0;
  }

  /** Reset downstream selections when upstream changes */
  function selectCategory(categoryId) {
    update({ categoryId, fitId: null, materialId: null, colorId: null });
  }

  function selectFit(fitId) {
    update({ fitId, materialId: null, colorId: null });
  }

  function selectMaterial(materialId) {
    update({ materialId, colorId: null });
  }

  return {
    getState,
    update,
    subscribe,
    setData,
    getData,
    getAvailableFits,
    getAvailableMaterials,
    getAvailableColors,
    getBasePrice,
    getPrintPrice,
    selectCategory,
    selectFit,
    selectMaterial,
  };
}
```

**Step 2: Commit**

```bash
git add widget/src/state.js
git commit -m "feat: rewrite state management for v2 cascading selection model"
```

---

## Phase 3: Widget UI

### Task 6: Rewrite widget main.js and styles

**Files:**
- Modify: `widget/src/main.js` (full rewrite)
- Modify: `widget/src/styles.js` (update for new sections)

**Step 1: Update styles.js**

Replace `widget/src/styles.js` — keep existing styles, add material description and print price badge support:

```js
export const CSS = `
  :host {
    --primary: #FF5100;
    --primary-hover: #FF6B2B;
    --bg: #1A1A1A;
    --bg-card: #2A2A2A;
    --bg-card-hover: #333333;
    --text: #FFFFFF;
    --text-secondary: #999999;
    --radius-card: 12px;
    --radius-btn: 8px;
    --font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

    display: block;
    font-family: var(--font);
    color: var(--text);
    background: var(--bg);
    border-radius: var(--radius-card);
    overflow: hidden;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  .configurator {
    display: grid;
    grid-template-columns: 45% 55%;
    min-height: 600px;
  }

  .preview-panel {
    position: sticky;
    top: 0;
    height: 100vh;
    max-height: 800px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg);
    padding: 24px;
  }

  .preview-panel img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    border-radius: var(--radius-card);
  }

  .preview-placeholder {
    width: 100%;
    height: 300px;
    background: var(--bg-card);
    border-radius: var(--radius-card);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
    font-size: 14px;
  }

  .config-panel {
    padding: 24px;
    overflow-y: auto;
    max-height: 800px;
  }

  .section {
    margin-bottom: 24px;
  }

  .section.hidden {
    display: none;
  }

  .section-title {
    font-size: 14px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-secondary);
    margin-bottom: 12px;
  }

  .options-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 8px;
  }

  .option-card {
    background: var(--bg-card);
    border: 2px solid transparent;
    border-radius: var(--radius-card);
    padding: 12px;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
    text-align: center;
  }

  .option-card:hover {
    background: var(--bg-card-hover);
  }

  .option-card.selected {
    border-color: var(--primary);
  }

  .option-card img {
    width: 100%;
    height: 80px;
    object-fit: cover;
    border-radius: 8px;
    margin-bottom: 8px;
  }

  .option-card .name {
    font-size: 13px;
    font-weight: 500;
  }

  .option-card.coming-soon {
    opacity: 0.5;
    cursor: default;
  }

  .buttons-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .option-btn {
    background: var(--bg-card);
    border: 2px solid transparent;
    border-radius: var(--radius-btn);
    padding: 8px 16px;
    cursor: pointer;
    color: var(--text);
    font-size: 13px;
    font-family: var(--font);
    transition: border-color 0.15s, background 0.15s;
  }

  .option-btn:hover {
    background: var(--bg-card-hover);
  }

  .option-btn.selected {
    border-color: var(--primary);
  }

  .material-btn {
    background: var(--bg-card);
    border: 2px solid transparent;
    border-radius: var(--radius-btn);
    padding: 10px 16px;
    cursor: pointer;
    color: var(--text);
    font-size: 13px;
    font-family: var(--font);
    transition: border-color 0.15s, background 0.15s;
    text-align: left;
  }

  .material-btn:hover {
    background: var(--bg-card-hover);
  }

  .material-btn.selected {
    border-color: var(--primary);
  }

  .material-btn .mat-desc {
    font-size: 11px;
    color: var(--text-secondary);
    margin-top: 2px;
  }

  .print-btn {
    background: var(--bg-card);
    border: 2px solid transparent;
    border-radius: var(--radius-btn);
    padding: 8px 16px;
    cursor: pointer;
    color: var(--text);
    font-size: 13px;
    font-family: var(--font);
    transition: border-color 0.15s, background 0.15s;
  }

  .print-btn:hover {
    background: var(--bg-card-hover);
  }

  .print-btn.selected {
    border-color: var(--primary);
  }

  .print-btn .price-badge {
    font-size: 11px;
    color: var(--text-secondary);
    margin-left: 4px;
  }

  .color-swatches {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  .color-swatch {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
    transition: border-color 0.15s, transform 0.15s;
  }

  .color-swatch:hover {
    transform: scale(1.1);
  }

  .color-swatch.selected {
    border-color: #FFFFFF;
    box-shadow: 0 0 0 2px var(--primary);
  }

  .color-name {
    font-size: 12px;
    color: var(--text-secondary);
    margin-left: 4px;
  }

  .footer {
    position: sticky;
    bottom: 0;
    background: var(--bg);
    border-top: 1px solid var(--bg-card);
    padding: 16px 24px;
  }

  .quantity-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }

  .quantity-label {
    font-size: 13px;
    color: var(--text-secondary);
  }

  .quantity-input {
    background: var(--bg-card);
    border: 1px solid var(--bg-card-hover);
    border-radius: var(--radius-btn);
    color: var(--text);
    padding: 8px 12px;
    width: 100px;
    font-size: 14px;
    font-family: var(--font);
    text-align: center;
  }

  .quantity-input:focus {
    outline: none;
    border-color: var(--primary);
  }

  .price-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .price-unit {
    font-size: 14px;
    color: var(--text-secondary);
  }

  .price-total {
    font-size: 20px;
    font-weight: 700;
  }

  .submit-btn {
    width: 100%;
    background: var(--primary);
    color: #FFFFFF;
    border: none;
    border-radius: var(--radius-btn);
    padding: 14px;
    font-size: 15px;
    font-weight: 600;
    font-family: var(--font);
    cursor: pointer;
    transition: background 0.15s;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .submit-btn:hover {
    background: var(--primary-hover);
  }

  .submit-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .min-qty-hint {
    font-size: 12px;
    color: var(--primary);
    margin-bottom: 8px;
  }

  /* Modal */
  .modal-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  }

  .modal {
    background: var(--bg);
    border-radius: var(--radius-card);
    padding: 32px;
    width: 90%;
    max-width: 420px;
  }

  .modal h2 {
    font-size: 18px;
    margin-bottom: 20px;
  }

  .modal-field {
    margin-bottom: 16px;
  }

  .modal-field label {
    display: block;
    font-size: 12px;
    color: var(--text-secondary);
    margin-bottom: 6px;
  }

  .modal-field input,
  .modal-field textarea {
    width: 100%;
    background: var(--bg-card);
    border: 1px solid var(--bg-card-hover);
    border-radius: var(--radius-btn);
    color: var(--text);
    padding: 10px 12px;
    font-size: 14px;
    font-family: var(--font);
  }

  .modal-field textarea {
    resize: vertical;
    min-height: 60px;
  }

  .modal-field input:focus,
  .modal-field textarea:focus {
    outline: none;
    border-color: var(--primary);
  }

  .modal-actions {
    display: flex;
    gap: 12px;
    margin-top: 20px;
  }

  .modal-cancel {
    flex: 1;
    background: var(--bg-card);
    color: var(--text);
    border: none;
    border-radius: var(--radius-btn);
    padding: 12px;
    font-size: 14px;
    font-family: var(--font);
    cursor: pointer;
  }

  .modal-submit {
    flex: 2;
    background: var(--primary);
    color: #FFFFFF;
    border: none;
    border-radius: var(--radius-btn);
    padding: 12px;
    font-size: 14px;
    font-weight: 600;
    font-family: var(--font);
    cursor: pointer;
  }

  .modal-submit:hover {
    background: var(--primary-hover);
  }

  .success-msg {
    text-align: center;
    padding: 40px 20px;
  }

  .success-msg h2 {
    color: var(--primary);
    margin-bottom: 12px;
  }

  /* Mobile */
  @media (max-width: 768px) {
    .configurator {
      grid-template-columns: 1fr;
    }

    .preview-panel {
      position: relative;
      height: auto;
      max-height: 250px;
      padding: 16px;
    }

    .config-panel {
      max-height: none;
      padding: 16px;
    }

    .options-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
`;
```

**Step 2: Rewrite main.js**

Replace entire `widget/src/main.js`:

```js
import { initSupabase } from './supabase.js';
import { fetchAllData, submitOrder } from './api.js';
import { createStore } from './state.js';
import { calculatePrice } from './pricing.js';
import { CSS } from './styles.js';

class MerchConfigurator extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.store = createStore();
  }

  async connectedCallback() {
    const envUrl = import.meta.env.VITE_SUPABASE_URL;
    const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const attrUrl = this.getAttribute('supabase-url');
    const attrKey = this.getAttribute('supabase-key');
    const url = envUrl || attrUrl;
    const key = envKey || attrKey;

    if (!url || !key) {
      this.shadowRoot.innerHTML = `<p style="color:red">Missing Supabase config.</p>`;
      return;
    }

    try {
      initSupabase(url, key);
    } catch (err) {
      this.shadowRoot.innerHTML = `<p style="color:red">Invalid Supabase config: ${err.message}</p>`;
      return;
    }
    this.renderShell();
    await this.loadData();
  }

  renderShell() {
    this.shadowRoot.innerHTML = `
      <style>${CSS}</style>
      <div class="configurator">
        <div class="preview-panel">
          <div class="preview-placeholder">Выберите изделие</div>
        </div>
        <div class="config-panel">
          <div style="text-align:center;padding:40px;color:#999">Загрузка...</div>
        </div>
      </div>
    `;
  }

  async loadData() {
    try {
      const data = await fetchAllData();
      this.store.setData(data);
      this.renderConfigurator();
      this.store.subscribe(() => this.onStateChange());
    } catch (err) {
      this.shadowRoot.querySelector('.config-panel').innerHTML =
        `<p style="color:red;padding:20px">Ошибка загрузки: ${err.message}</p>`;
    }
  }

  renderConfigurator() {
    const data = this.store.getData();
    const panel = this.shadowRoot.querySelector('.config-panel');

    // Find "Без нанесения" default
    const noPrint = data.printMethods.find((m) => m.price === 0 || m.name === 'Без нанесения');
    if (noPrint) {
      this.store.update({ printFrontId: noPrint.id, printBackId: noPrint.id });
    }

    panel.innerHTML = `
      ${this._renderCategories(data.categories)}
      <div class="section hidden" data-section="fit">
        <div class="section-title">Фасон</div>
        <div class="buttons-row" data-fit-buttons></div>
      </div>
      <div class="section hidden" data-section="material">
        <div class="section-title">Материал</div>
        <div class="buttons-row" data-material-buttons></div>
      </div>
      <div class="section hidden" data-section="color">
        <div class="section-title">Цвет</div>
        <div class="color-swatches" data-color-swatches></div>
        <span class="color-name" data-color-name></span>
      </div>
      <div class="section hidden" data-section="print-front">
        <div class="section-title">Нанесение спереди</div>
        <div class="buttons-row" data-print-front-buttons></div>
      </div>
      <div class="section hidden" data-section="print-back">
        <div class="section-title">Нанесение сзади</div>
        <div class="buttons-row" data-print-back-buttons></div>
      </div>
      ${this._renderFooter()}
    `;

    this._bindCategoryEvents();
    this._bindFooterEvents();
  }

  /* ---- Render helpers ---- */

  _renderCategories(categories) {
    // Categories without variants get "coming soon"
    const variants = this.store.getData().productVariants;
    const cards = categories.map((c) => {
      const hasVariants = variants.some((v) => v.category_id === c.id);
      return `
        <div class="option-card ${hasVariants ? '' : 'coming-soon'}"
             data-category-id="${c.id}" ${hasVariants ? '' : 'data-disabled'}>
          ${c.image_url ? `<img src="${c.image_url}" alt="${c.name}">` : ''}
          <div class="name">${c.name}</div>
          ${hasVariants ? '' : '<div style="font-size:11px;color:#999;margin-top:4px">Скоро появится</div>'}
        </div>
      `;
    }).join('');

    return `
      <div class="section" data-section="category">
        <div class="section-title">Изделие</div>
        <div class="options-grid">${cards}</div>
      </div>
    `;
  }

  _renderFooter() {
    return `
      <div class="footer">
        <div class="quantity-row">
          <span class="quantity-label">Тираж:</span>
          <input type="number" class="quantity-input" value="100" min="1">
          <span class="quantity-label">шт.</span>
        </div>
        <div class="min-qty-hint" data-min-qty-hint style="display:none"></div>
        <div class="price-row">
          <span class="price-unit">Цена за шт: <strong data-unit-price>—</strong></span>
          <span class="price-total" data-total-price>—</span>
        </div>
        <button class="submit-btn" disabled>Оставить заявку</button>
      </div>
    `;
  }

  /* ---- Event binding ---- */

  _bindCategoryEvents() {
    this.shadowRoot.querySelectorAll('[data-category-id]').forEach((el) => {
      if (el.hasAttribute('data-disabled')) return;
      el.addEventListener('click', () => {
        this.store.selectCategory(Number(el.dataset.categoryId));
      });
    });
  }

  _bindFooterEvents() {
    const qtyInput = this.shadowRoot.querySelector('.quantity-input');
    if (qtyInput) {
      qtyInput.addEventListener('input', () => {
        this.store.update({ quantity: Math.max(1, parseInt(qtyInput.value) || 1) });
      });
    }
    const submitBtn = this.shadowRoot.querySelector('.submit-btn');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => this._showOrderModal());
    }
  }

  /* ---- State change handler ---- */

  onStateChange() {
    const state = this.store.getState();
    const data = this.store.getData();
    const shadow = this.shadowRoot;

    // Category highlighting
    shadow.querySelectorAll('[data-category-id]').forEach((el) => {
      el.classList.toggle('selected', Number(el.dataset.categoryId) === state.categoryId);
    });

    // Preview image
    const previewPanel = shadow.querySelector('.preview-panel');
    const cat = data.categories.find((c) => c.id === state.categoryId);
    if (cat && cat.image_url) {
      previewPanel.innerHTML = `<img src="${cat.image_url}" alt="${cat.name}">`;
    } else {
      previewPanel.innerHTML = '<div class="preview-placeholder">Выберите изделие</div>';
    }

    // Fit section
    this._updateFitSection(state);

    // Material section
    this._updateMaterialSection(state);

    // Color section
    this._updateColorSection(state);

    // Print sections
    this._updatePrintSection(state, 'print-front', 'printFrontId', 'data-print-front-buttons');
    this._updatePrintSection(state, 'print-back', 'printBackId', 'data-print-back-buttons');

    // Price
    this._updatePrice(state, data);
  }

  _updateFitSection(state) {
    const section = this.shadowRoot.querySelector('[data-section="fit"]');
    const container = this.shadowRoot.querySelector('[data-fit-buttons]');
    if (!state.categoryId) {
      section.classList.add('hidden');
      return;
    }
    section.classList.remove('hidden');
    const fits = this.store.getAvailableFits();
    container.innerHTML = fits.map((f) =>
      `<button class="option-btn ${f.id === state.fitId ? 'selected' : ''}" data-fit-id="${f.id}">${f.name}</button>`
    ).join('');
    container.querySelectorAll('[data-fit-id]').forEach((btn) => {
      btn.addEventListener('click', () => this.store.selectFit(Number(btn.dataset.fitId)));
    });
  }

  _updateMaterialSection(state) {
    const section = this.shadowRoot.querySelector('[data-section="material"]');
    const container = this.shadowRoot.querySelector('[data-material-buttons]');
    if (!state.fitId) {
      section.classList.add('hidden');
      return;
    }
    section.classList.remove('hidden');
    const materials = this.store.getAvailableMaterials();
    container.innerHTML = materials.map((m) =>
      `<button class="material-btn ${m.id === state.materialId ? 'selected' : ''}" data-material-id="${m.id}">
        ${m.name}
        ${m.description ? `<div class="mat-desc">${m.description}</div>` : ''}
      </button>`
    ).join('');
    container.querySelectorAll('[data-material-id]').forEach((btn) => {
      btn.addEventListener('click', () => this.store.selectMaterial(Number(btn.dataset.materialId)));
    });
  }

  _updateColorSection(state) {
    const section = this.shadowRoot.querySelector('[data-section="color"]');
    const container = this.shadowRoot.querySelector('[data-color-swatches]');
    const nameEl = this.shadowRoot.querySelector('[data-color-name]');
    const colors = this.store.getAvailableColors();
    if (!state.materialId || colors.length === 0) {
      section.classList.add('hidden');
      return;
    }
    section.classList.remove('hidden');
    container.innerHTML = colors.map((c) =>
      `<div class="color-swatch ${c.id === state.colorId ? 'selected' : ''}"
           data-color-id="${c.id}" data-color-name="${c.color_name}"
           style="background:${c.hex_code}" title="${c.color_name}"></div>`
    ).join('');
    const sel = colors.find((c) => c.id === state.colorId);
    nameEl.textContent = sel ? sel.color_name : '';
    container.querySelectorAll('[data-color-id]').forEach((el) => {
      el.addEventListener('click', () => {
        this.store.update({ colorId: Number(el.dataset.colorId) });
      });
    });
  }

  _updatePrintSection(state, sectionName, stateKey, containerAttr) {
    const section = this.shadowRoot.querySelector(`[data-section="${sectionName}"]`);
    const container = this.shadowRoot.querySelector(`[${containerAttr}]`);
    if (!state.materialId) {
      section.classList.add('hidden');
      return;
    }
    section.classList.remove('hidden');
    const methods = this.store.getData().printMethods;
    const selectedId = state[stateKey];
    container.innerHTML = methods.map((m) =>
      `<button class="print-btn ${m.id === selectedId ? 'selected' : ''}" data-print-id="${m.id}" data-section-key="${stateKey}">
        ${m.name}${Number(m.price) > 0 ? `<span class="price-badge">+${Number(m.price)}₽</span>` : ''}
      </button>`
    ).join('');
    container.querySelectorAll('[data-print-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.store.update({ [btn.dataset.sectionKey]: Number(btn.dataset.printId) });
      });
    });
  }

  _updatePrice(state, data) {
    const basePrice = this.store.getBasePrice();
    const frontPrice = this.store.getPrintPrice(state.printFrontId);
    const backPrice = this.store.getPrintPrice(state.printBackId);

    const { unitPrice, total, multiplier } = calculatePrice({
      basePrice,
      frontPrintPrice: frontPrice,
      backPrintPrice: backPrice,
      quantity: state.quantity,
      tiers: data.quantityTiers,
    });

    const unitEl = this.shadowRoot.querySelector('[data-unit-price]');
    const totalEl = this.shadowRoot.querySelector('[data-total-price]');
    const submitBtn = this.shadowRoot.querySelector('.submit-btn');
    const hintEl = this.shadowRoot.querySelector('[data-min-qty-hint]');

    if (basePrice > 0) {
      unitEl.textContent = `${unitPrice.toLocaleString('ru-RU')} ₽`;
      totalEl.textContent = `${total.toLocaleString('ru-RU')} ₽`;
    } else {
      unitEl.textContent = '—';
      totalEl.textContent = '—';
    }

    // Enable submit only when full selection made
    const canSubmit = state.categoryId && state.fitId && state.materialId && basePrice > 0;
    submitBtn.disabled = !canSubmit;

    // Min qty hint
    if (state.quantity < 10 && hintEl) {
      hintEl.style.display = 'block';
      hintEl.textContent = 'При заказе менее 10 шт. действует повышенный коэффициент ×2.0';
    } else if (hintEl) {
      hintEl.style.display = 'none';
    }
  }

  /* ---- Order modal ---- */

  _showOrderModal() {
    const state = this.store.getState();
    if (!state.categoryId) return;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <h2>Оставить заявку</h2>
        <div class="modal-field">
          <label>Имя *</label>
          <input type="text" data-field="name" required>
        </div>
        <div class="modal-field">
          <label>Телефон или Email *</label>
          <input type="text" data-field="contact" required>
        </div>
        <div class="modal-field">
          <label>Комментарий</label>
          <textarea data-field="comment"></textarea>
        </div>
        <div class="modal-actions">
          <button class="modal-cancel">Отмена</button>
          <button class="modal-submit">Отправить</button>
        </div>
      </div>
    `;

    this.shadowRoot.appendChild(overlay);

    overlay.querySelector('.modal-cancel').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    overlay.querySelector('.modal-submit').addEventListener('click', async () => {
      const name = overlay.querySelector('[data-field="name"]').value.trim();
      const contact = overlay.querySelector('[data-field="contact"]').value.trim();
      const comment = overlay.querySelector('[data-field="comment"]').value.trim();

      if (!name || !contact) {
        alert('Заполните имя и контакт');
        return;
      }

      const data = this.store.getData();
      const basePrice = this.store.getBasePrice();
      const frontPrice = this.store.getPrintPrice(state.printFrontId);
      const backPrice = this.store.getPrintPrice(state.printBackId);
      const { unitPrice, total, multiplier } = calculatePrice({
        basePrice,
        frontPrintPrice: frontPrice,
        backPrintPrice: backPrice,
        quantity: state.quantity,
        tiers: data.quantityTiers,
      });

      try {
        await submitOrder({
          customer_name: name,
          customer_contact: contact,
          customer_comment: comment || null,
          configuration: {
            category_id: state.categoryId,
            fit_id: state.fitId,
            material_id: state.materialId,
            color_id: state.colorId,
            print_front_id: state.printFrontId,
            print_back_id: state.printBackId,
            quantity: state.quantity,
            unit_price: unitPrice,
            multiplier,
          },
          quantity: state.quantity,
          calculated_price: total,
        });

        overlay.querySelector('.modal').innerHTML = `
          <div class="success-msg">
            <h2>Заявка отправлена!</h2>
            <p style="color:#999">Мы свяжемся с вами в ближайшее время.</p>
            <button class="submit-btn" style="margin-top:20px;width:auto;padding:12px 32px">Закрыть</button>
          </div>
        `;
        overlay.querySelector('.submit-btn').addEventListener('click', () => overlay.remove());
      } catch (err) {
        alert('Ошибка отправки: ' + err.message);
      }
    });
  }
}

customElements.define('merch-configurator', MerchConfigurator);
```

**Step 3: Run widget build to verify no errors**

```bash
cd widget && npx vite build
```

Expected: build succeeds

**Step 4: Run tests**

```bash
cd widget && npx vitest run
```

Expected: all PASS

**Step 5: Commit**

```bash
git add widget/src/main.js widget/src/styles.js
git commit -m "feat: rewrite widget UI for v2 cascading selection flow"
```

---

## Phase 4: Admin Panel

### Task 7: Update admin navigation and routes

**Files:**
- Modify: `admin/src/components/Layout.jsx`
- Modify: `admin/src/App.jsx`

**Step 1: Update Layout.jsx**

Replace the `NAV` array in `admin/src/components/Layout.jsx` (line 4-10):

```jsx
const NAV = [
  { to: '/categories', label: 'Категории' },
  { to: '/fits', label: 'Фасоны' },
  { to: '/materials', label: 'Материалы' },
  { to: '/pricing', label: 'Цены (матрица)' },
  { to: '/print-methods', label: 'Нанесение' },
  { to: '/quantity-tiers', label: 'Множители' },
  { to: '/palettes', label: 'Палитры' },
  { to: '/orders', label: 'Заявки' },
];
```

**Step 2: Update App.jsx**

Replace `admin/src/App.jsx`:

```jsx
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabase';
import Login from './pages/Login';
import Layout from './components/Layout';
import Categories from './pages/Categories';
import Fits from './pages/Fits';
import Materials from './pages/Materials';
import Pricing from './pages/Pricing';
import PrintMethods from './pages/PrintMethods';
import QuantityTiers from './pages/QuantityTiers';
import Palettes from './pages/Palettes';
import Orders from './pages/Orders';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400">Загрузка...</div>;

  if (!session) return <Login />;

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/categories" replace />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/fits" element={<Fits />} />
          <Route path="/materials" element={<Materials />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/print-methods" element={<PrintMethods />} />
          <Route path="/quantity-tiers" element={<QuantityTiers />} />
          <Route path="/palettes" element={<Palettes />} />
          <Route path="/orders" element={<Orders />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
```

**Step 3: Commit**

```bash
git add admin/src/components/Layout.jsx admin/src/App.jsx
git commit -m "feat: update admin navigation and routes for v2 pages"
```

---

### Task 8: Create Fits CRUD page

**Files:**
- Create: `admin/src/pages/Fits.jsx`

**Step 1: Create Fits.jsx**

```jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function Fits() {
  const [fits, setFits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', sort_order: 0 });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('fits').select('*').order('sort_order');
    setFits(data || []);
    setLoading(false);
  }

  function startNew() {
    setForm({ name: '', sort_order: fits.length });
    setEditing('new');
  }

  function startEdit(fit) {
    setForm({ name: fit.name, sort_order: fit.sort_order });
    setEditing(fit);
  }

  async function save() {
    if (!form.name.trim()) return;
    if (editing === 'new') {
      await supabase.from('fits').insert(form);
    } else {
      await supabase.from('fits').update(form).eq('id', editing.id);
    }
    setEditing(null);
    load();
  }

  async function remove(id) {
    if (!confirm('Удалить фасон? Это удалит все связанные варианты товаров.')) return;
    await supabase.from('fits').delete().eq('id', id);
    load();
  }

  if (loading) return <p className="text-gray-400">Загрузка...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Фасоны</h2>
        <button onClick={startNew} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">
          + Добавить
        </button>
      </div>

      {editing && (
        <div className="bg-gray-800 p-4 rounded-xl mb-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-gray-400 text-xs mb-1">Название</label>
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="w-24">
              <label className="block text-gray-400 text-xs mb-1">Порядок</label>
              <input
                type="number"
                value={form.sort_order}
                onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <button onClick={save} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm">Сохранить</button>
            <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-white px-4 py-2 text-sm">Отмена</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {fits.map(fit => (
          <div key={fit.id} className="bg-gray-800 p-3 rounded-xl flex items-center gap-4">
            <div className="flex-1">
              <span className="font-medium text-sm">{fit.name}</span>
            </div>
            <span className="text-gray-500 text-xs">#{fit.sort_order}</span>
            <button onClick={() => startEdit(fit)} className="text-gray-400 hover:text-white text-sm">Изменить</button>
            <button onClick={() => remove(fit.id)} className="text-red-400 hover:text-red-300 text-sm">Удалить</button>
          </div>
        ))}
        {fits.length === 0 && <p className="text-gray-500 text-sm">Нет фасонов</p>}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add admin/src/pages/Fits.jsx
git commit -m "feat: add Fits CRUD admin page"
```

---

### Task 9: Create Materials CRUD page

**Files:**
- Create: `admin/src/pages/Materials.jsx`

**Step 1: Create Materials.jsx**

```jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function Materials() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', sort_order: 0 });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('materials').select('*').order('sort_order');
    setMaterials(data || []);
    setLoading(false);
  }

  function startNew() {
    setForm({ name: '', description: '', sort_order: materials.length });
    setEditing('new');
  }

  function startEdit(mat) {
    setForm({ name: mat.name, description: mat.description || '', sort_order: mat.sort_order });
    setEditing(mat);
  }

  async function save() {
    if (!form.name.trim()) return;
    if (editing === 'new') {
      await supabase.from('materials').insert(form);
    } else {
      await supabase.from('materials').update(form).eq('id', editing.id);
    }
    setEditing(null);
    load();
  }

  async function remove(id) {
    if (!confirm('Удалить материал? Это удалит все связанные варианты и палитры.')) return;
    await supabase.from('materials').delete().eq('id', id);
    load();
  }

  if (loading) return <p className="text-gray-400">Загрузка...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Материалы</h2>
        <button onClick={startNew} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">
          + Добавить
        </button>
      </div>

      {editing && (
        <div className="bg-gray-800 p-4 rounded-xl mb-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-gray-400 text-xs mb-1">Название</label>
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-gray-400 text-xs mb-1">Описание</label>
              <input
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="w-24">
              <label className="block text-gray-400 text-xs mb-1">Порядок</label>
              <input
                type="number"
                value={form.sort_order}
                onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <button onClick={save} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm">Сохранить</button>
            <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-white px-4 py-2 text-sm">Отмена</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {materials.map(mat => (
          <div key={mat.id} className="bg-gray-800 p-3 rounded-xl flex items-center gap-4">
            <div className="flex-1">
              <span className="font-medium text-sm">{mat.name}</span>
              {mat.description && <span className="text-gray-500 text-xs ml-2">{mat.description}</span>}
            </div>
            <span className="text-gray-500 text-xs">#{mat.sort_order}</span>
            <button onClick={() => startEdit(mat)} className="text-gray-400 hover:text-white text-sm">Изменить</button>
            <button onClick={() => remove(mat.id)} className="text-red-400 hover:text-red-300 text-sm">Удалить</button>
          </div>
        ))}
        {materials.length === 0 && <p className="text-gray-500 text-sm">Нет материалов</p>}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add admin/src/pages/Materials.jsx
git commit -m "feat: add Materials CRUD admin page"
```

---

### Task 10: Create PrintMethods CRUD page

**Files:**
- Create: `admin/src/pages/PrintMethods.jsx`

**Step 1: Create PrintMethods.jsx**

```jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function PrintMethods() {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', price: 0, sort_order: 0 });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('print_methods').select('*').order('sort_order');
    setMethods(data || []);
    setLoading(false);
  }

  function startNew() {
    setForm({ name: '', price: 0, sort_order: methods.length });
    setEditing('new');
  }

  function startEdit(m) {
    setForm({ name: m.name, price: Number(m.price), sort_order: m.sort_order });
    setEditing(m);
  }

  async function save() {
    if (!form.name.trim()) return;
    if (editing === 'new') {
      await supabase.from('print_methods').insert(form);
    } else {
      await supabase.from('print_methods').update(form).eq('id', editing.id);
    }
    setEditing(null);
    load();
  }

  async function remove(id) {
    if (!confirm('Удалить метод нанесения?')) return;
    await supabase.from('print_methods').delete().eq('id', id);
    load();
  }

  if (loading) return <p className="text-gray-400">Загрузка...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Методы нанесения</h2>
        <button onClick={startNew} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">
          + Добавить
        </button>
      </div>

      {editing && (
        <div className="bg-gray-800 p-4 rounded-xl mb-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-gray-400 text-xs mb-1">Название</label>
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="w-32">
              <label className="block text-gray-400 text-xs mb-1">Цена (₽)</label>
              <input
                type="number"
                value={form.price}
                onChange={e => setForm({ ...form, price: Number(e.target.value) })}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="w-24">
              <label className="block text-gray-400 text-xs mb-1">Порядок</label>
              <input
                type="number"
                value={form.sort_order}
                onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <button onClick={save} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm">Сохранить</button>
            <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-white px-4 py-2 text-sm">Отмена</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {methods.map(m => (
          <div key={m.id} className="bg-gray-800 p-3 rounded-xl flex items-center gap-4">
            <div className="flex-1">
              <span className="font-medium text-sm">{m.name}</span>
            </div>
            <span className="text-sm text-gray-400">{Number(m.price)} ₽</span>
            <span className="text-gray-500 text-xs">#{m.sort_order}</span>
            <button onClick={() => startEdit(m)} className="text-gray-400 hover:text-white text-sm">Изменить</button>
            <button onClick={() => remove(m.id)} className="text-red-400 hover:text-red-300 text-sm">Удалить</button>
          </div>
        ))}
        {methods.length === 0 && <p className="text-gray-500 text-sm">Нет методов</p>}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add admin/src/pages/PrintMethods.jsx
git commit -m "feat: add PrintMethods CRUD admin page"
```

---

### Task 11: Create QuantityTiers page

**Files:**
- Create: `admin/src/pages/QuantityTiers.jsx`

**Step 1: Create QuantityTiers.jsx**

```jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function QuantityTiers() {
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ min_qty: 1, max_qty: '', multiplier: 1.0, sort_order: 0 });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('quantity_tiers').select('*').order('sort_order');
    setTiers(data || []);
    setLoading(false);
  }

  function startNew() {
    setForm({ min_qty: 1, max_qty: '', multiplier: 1.0, sort_order: tiers.length });
    setEditing('new');
  }

  function startEdit(tier) {
    setForm({
      min_qty: tier.min_qty,
      max_qty: tier.max_qty ?? '',
      multiplier: Number(tier.multiplier),
      sort_order: tier.sort_order,
    });
    setEditing(tier);
  }

  async function save() {
    const payload = {
      min_qty: form.min_qty,
      max_qty: form.max_qty === '' ? null : Number(form.max_qty),
      multiplier: form.multiplier,
      sort_order: form.sort_order,
    };
    if (editing === 'new') {
      await supabase.from('quantity_tiers').insert(payload);
    } else {
      await supabase.from('quantity_tiers').update(payload).eq('id', editing.id);
    }
    setEditing(null);
    load();
  }

  async function remove(id) {
    if (!confirm('Удалить порог?')) return;
    await supabase.from('quantity_tiers').delete().eq('id', id);
    load();
  }

  if (loading) return <p className="text-gray-400">Загрузка...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Множители (тираж)</h2>
        <button onClick={startNew} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">
          + Добавить порог
        </button>
      </div>

      {editing && (
        <div className="bg-gray-800 p-4 rounded-xl mb-6">
          <div className="flex gap-4 items-end">
            <div className="w-28">
              <label className="block text-gray-400 text-xs mb-1">От (шт)</label>
              <input
                type="number"
                value={form.min_qty}
                onChange={e => setForm({ ...form, min_qty: Number(e.target.value) })}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="w-28">
              <label className="block text-gray-400 text-xs mb-1">До (шт)</label>
              <input
                type="number"
                value={form.max_qty}
                placeholder="∞"
                onChange={e => setForm({ ...form, max_qty: e.target.value === '' ? '' : Number(e.target.value) })}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="w-28">
              <label className="block text-gray-400 text-xs mb-1">Множитель</label>
              <input
                type="number"
                step="0.05"
                value={form.multiplier}
                onChange={e => setForm({ ...form, multiplier: Number(e.target.value) })}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="w-24">
              <label className="block text-gray-400 text-xs mb-1">Порядок</label>
              <input
                type="number"
                value={form.sort_order}
                onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <button onClick={save} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm">Сохранить</button>
            <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-white px-4 py-2 text-sm">Отмена</button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 text-xs text-left">
              <th className="pb-3 pr-4">Диапазон</th>
              <th className="pb-3 pr-4">Множитель</th>
              <th className="pb-3 pr-4">Пример (базовая 1550₽)</th>
              <th className="pb-3"></th>
            </tr>
          </thead>
          <tbody>
            {tiers.map(tier => (
              <tr key={tier.id} className="border-t border-gray-800">
                <td className="py-3 pr-4">
                  {tier.min_qty} — {tier.max_qty ?? '∞'} шт
                </td>
                <td className="py-3 pr-4 font-semibold">
                  ×{Number(tier.multiplier)}
                </td>
                <td className="py-3 pr-4 text-gray-400">
                  {Math.round(1550 * Number(tier.multiplier))} ₽/шт
                </td>
                <td className="py-3 text-right">
                  <button onClick={() => startEdit(tier)} className="text-gray-400 hover:text-white text-sm mr-3">Изменить</button>
                  <button onClick={() => remove(tier.id)} className="text-red-400 hover:text-red-300 text-sm">Удалить</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {tiers.length === 0 && <p className="text-gray-500 text-sm mt-4">Нет порогов</p>}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add admin/src/pages/QuantityTiers.jsx
git commit -m "feat: add QuantityTiers admin page with example pricing"
```

---

### Task 12: Rewrite Pricing as matrix editor

**Files:**
- Modify: `admin/src/pages/Pricing.jsx` (full rewrite)

**Step 1: Rewrite Pricing.jsx as matrix editor**

Replace entire `admin/src/pages/Pricing.jsx`:

```jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function Pricing() {
  const [categories, setCategories] = useState([]);
  const [fits, setFits] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [variants, setVariants] = useState([]);
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState(null); // { fitId, materialId }
  const [cellPrice, setCellPrice] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [{ data: c }, { data: f }, { data: m }, { data: v }] = await Promise.all([
      supabase.from('categories').select('id, name').order('sort_order'),
      supabase.from('fits').select('*').order('sort_order'),
      supabase.from('materials').select('*').order('sort_order'),
      supabase.from('product_variants').select('*'),
    ]);
    setCategories(c || []);
    setFits(f || []);
    setMaterials(m || []);
    setVariants(v || []);
    if (!activeCategoryId && c?.length) setActiveCategoryId(c[0].id);
    setLoading(false);
  }

  function getVariant(fitId, materialId) {
    return variants.find(
      (v) => v.category_id === activeCategoryId && v.fit_id === fitId && v.material_id === materialId
    );
  }

  function startEditCell(fitId, materialId) {
    const existing = getVariant(fitId, materialId);
    setCellPrice(existing ? String(Number(existing.base_price)) : '');
    setEditingCell({ fitId, materialId });
  }

  async function saveCell() {
    if (!editingCell) return;
    const { fitId, materialId } = editingCell;
    const existing = getVariant(fitId, materialId);
    const price = cellPrice.trim();

    if (price === '' && existing) {
      // Remove variant
      await supabase.from('product_variants').delete().eq('id', existing.id);
    } else if (price !== '' && !existing) {
      // Create variant
      await supabase.from('product_variants').insert({
        category_id: activeCategoryId,
        fit_id: fitId,
        material_id: materialId,
        base_price: Number(price),
      });
    } else if (price !== '' && existing && Number(price) !== Number(existing.base_price)) {
      // Update variant
      await supabase.from('product_variants').update({ base_price: Number(price) }).eq('id', existing.id);
    }

    setEditingCell(null);
    load();
  }

  function handleCellKeyDown(e) {
    if (e.key === 'Enter') saveCell();
    if (e.key === 'Escape') setEditingCell(null);
  }

  if (loading) return <p className="text-gray-400">Загрузка...</p>;

  // Determine which fits/materials are relevant for this category
  // Show all fits and materials so new combinations can be added
  const categoryVariants = variants.filter((v) => v.category_id === activeCategoryId);
  const usedFitIds = new Set(categoryVariants.map((v) => v.fit_id));
  const usedMaterialIds = new Set(categoryVariants.map((v) => v.material_id));

  // Show fits/materials that are either used or all of them (for adding new combos)
  const displayFits = fits;
  const displayMaterials = materials;

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Цены (матрица)</h2>

      {/* Category tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {categories.map(c => (
          <button
            key={c.id}
            onClick={() => { setActiveCategoryId(c.id); setEditingCell(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              c.id === activeCategoryId ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      <p className="text-gray-500 text-xs mb-4">
        Кликните на ячейку, чтобы задать цену. Пустое поле = комбинация недоступна.
      </p>

      {/* Matrix table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left text-gray-400 text-xs pb-3 pr-4 sticky left-0 bg-gray-900 z-10">
                Фасон ↓ / Материал →
              </th>
              {displayMaterials.map(m => (
                <th key={m.id} className="text-center text-gray-400 text-xs pb-3 px-2 min-w-[100px]">
                  {m.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayFits.map(fit => (
              <tr key={fit.id} className="border-t border-gray-800">
                <td className="py-2 pr-4 font-medium text-sm sticky left-0 bg-gray-900 z-10">
                  {fit.name}
                </td>
                {displayMaterials.map(mat => {
                  const variant = getVariant(fit.id, mat.id);
                  const isEditing = editingCell?.fitId === fit.id && editingCell?.materialId === mat.id;

                  return (
                    <td key={mat.id} className="py-2 px-2 text-center">
                      {isEditing ? (
                        <input
                          autoFocus
                          type="number"
                          value={cellPrice}
                          onChange={e => setCellPrice(e.target.value)}
                          onBlur={saveCell}
                          onKeyDown={handleCellKeyDown}
                          placeholder="—"
                          className="w-20 bg-gray-700 text-white rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      ) : (
                        <button
                          onClick={() => startEditCell(fit.id, mat.id)}
                          className={`w-20 py-1 rounded text-sm transition-colors ${
                            variant
                              ? 'bg-gray-800 text-white hover:bg-gray-700 font-semibold'
                              : 'bg-transparent text-gray-600 hover:bg-gray-800 hover:text-gray-400'
                          }`}
                        >
                          {variant ? `${Number(variant.base_price)}` : '—'}
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {categoryVariants.length > 0 && (
        <p className="text-gray-500 text-xs mt-4">
          {categoryVariants.length} вариант(ов) для этой категории
        </p>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add admin/src/pages/Pricing.jsx
git commit -m "feat: rewrite Pricing page as matrix editor (fit × material grid)"
```

---

### Task 13: Update Palettes page

**Files:**
- Modify: `admin/src/pages/Palettes.jsx` (update to use materials table directly)

**Step 1: Rewrite Palettes.jsx**

Replace entire `admin/src/pages/Palettes.jsx`:

```jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function Palettes() {
  const [palettes, setPalettes] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [activeMaterialId, setActiveMaterialId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ color_name: '', hex_code: '#000000', sort_order: 0, is_active: true });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [{ data: m }, { data: p }] = await Promise.all([
      supabase.from('materials').select('id, name').order('sort_order'),
      supabase.from('color_palettes').select('*').order('sort_order'),
    ]);
    setMaterials(m || []);
    setPalettes(p || []);
    if (!activeMaterialId && m?.length) setActiveMaterialId(m[0].id);
    setLoading(false);
  }

  const materialColors = palettes.filter(p => p.material_id === activeMaterialId);

  function startNew() {
    setForm({ color_name: '', hex_code: '#000000', sort_order: materialColors.length, is_active: true });
    setEditing('new');
  }

  function startEdit(color) {
    setForm({ color_name: color.color_name, hex_code: color.hex_code, sort_order: color.sort_order, is_active: color.is_active });
    setEditing(color);
  }

  async function save() {
    if (!form.color_name.trim()) return;
    const payload = { ...form, material_id: activeMaterialId };
    if (editing === 'new') {
      await supabase.from('color_palettes').insert(payload);
    } else {
      await supabase.from('color_palettes').update(payload).eq('id', editing.id);
    }
    setEditing(null);
    load();
  }

  async function remove(id) {
    if (!confirm('Удалить цвет?')) return;
    await supabase.from('color_palettes').delete().eq('id', id);
    load();
  }

  if (loading) return <p className="text-gray-400">Загрузка...</p>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Палитры цветов</h2>

      <div className="flex gap-2 mb-6 flex-wrap">
        {materials.map(m => (
          <button
            key={m.id}
            onClick={() => { setActiveMaterialId(m.id); setEditing(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              m.id === activeMaterialId ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {m.name}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Цвета: {materials.find(m => m.id === activeMaterialId)?.name}</h3>
        <button onClick={startNew} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">
          + Добавить цвет
        </button>
      </div>

      {editing && (
        <div className="bg-gray-800 p-4 rounded-xl mb-4 space-y-3">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-gray-400 text-xs mb-1">Название цвета</label>
              <input
                value={form.color_name}
                onChange={e => setForm({ ...form, color_name: e.target.value })}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="w-24">
              <label className="block text-gray-400 text-xs mb-1">Цвет</label>
              <input
                type="color"
                value={form.hex_code}
                onChange={e => setForm({ ...form, hex_code: e.target.value })}
                className="w-full h-10 bg-gray-700 rounded-lg cursor-pointer"
              />
            </div>
            <div className="w-28">
              <label className="block text-gray-400 text-xs mb-1">HEX</label>
              <input
                value={form.hex_code}
                onChange={e => setForm({ ...form, hex_code: e.target.value })}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="w-20">
              <label className="block text-gray-400 text-xs mb-1">Порядок</label>
              <input
                type="number"
                value={form.sort_order}
                onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <button onClick={save} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm">Сохранить</button>
            <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-white px-4 py-2 text-sm">Отмена</button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {materialColors.map(color => (
          <div key={color.id} className="bg-gray-800 p-3 rounded-xl flex items-center gap-3 min-w-[200px]">
            <div className="w-8 h-8 rounded-full border-2 border-gray-600" style={{ background: color.hex_code }} />
            <div className="flex-1">
              <span className="text-sm font-medium">{color.color_name}</span>
              <span className="text-xs text-gray-500 ml-2">{color.hex_code}</span>
            </div>
            <button onClick={() => startEdit(color)} className="text-gray-400 hover:text-white text-xs">Ред.</button>
            <button onClick={() => remove(color.id)} className="text-red-400 hover:text-red-300 text-xs">✕</button>
          </div>
        ))}
        {materialColors.length === 0 && <p className="text-gray-500 text-sm">Нет цветов для этого материала</p>}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add admin/src/pages/Palettes.jsx
git commit -m "feat: update Palettes to use materials table directly (v2)"
```

---

### Task 14: Remove old Sections page

**Files:**
- Delete: `admin/src/pages/Sections.jsx`

**Step 1: Delete Sections.jsx**

```bash
rm admin/src/pages/Sections.jsx
```

**Step 2: Commit**

```bash
git add admin/src/pages/Sections.jsx
git commit -m "chore: remove old Sections page (replaced by Fits, Materials, PrintMethods)"
```

---

## Phase 5: Build & Verify

### Task 15: Build both packages and run tests

**Step 1: Run widget tests**

```bash
cd widget && npx vitest run
```

Expected: all PASS

**Step 2: Build widget**

```bash
cd widget && npx vite build
```

Expected: `dist/configurator.js` created

**Step 3: Build admin**

```bash
cd admin && npx vite build
```

Expected: `dist/` created with no errors

**Step 4: Commit build verification**

No commit needed — just verify both packages build.

---

### Task 16: Apply migration in Supabase (MANUAL)

**Manual steps for the user:**

1. Go to Supabase Dashboard → SQL Editor
2. Paste and run the contents of `supabase/migrations/002_v2_schema.sql`
3. Paste and run the contents of `supabase/seed.sql`
4. Verify tables: `fits`, `materials`, `product_variants`, `print_methods`, `quantity_tiers`, `color_palettes` exist
5. Start admin with `cd admin && npm run dev` — verify all pages load
6. Start widget with `cd widget && npm run dev` — verify category selection → fit → material → price flow works
