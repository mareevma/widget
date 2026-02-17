# Merch Configurator Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a JS widget configurator for merch products (embedded in Tilda) with an admin panel for managing products, options, pricing, and palettes.

**Architecture:** Vanilla JS widget (Shadow DOM, single bundle) + React admin panel + Supabase (PostgreSQL, Auth, Storage, REST API). Monorepo with `widget/` and `admin/` directories.

**Tech Stack:** Vanilla JS, React, Vite, Tailwind CSS, Supabase, Vitest

**Design doc:** `docs/plans/2026-02-17-merch-configurator-design.md`

---

## Phase 1: Project Setup & Database

### Task 1: Initialize monorepo structure

**Files:**
- Create: `package.json` (root workspace)
- Create: `widget/package.json`
- Create: `widget/vite.config.js`
- Create: `admin/package.json`
- Create: `admin/vite.config.js`
- Create: `.gitignore`

**Step 1: Create root package.json with workspaces**

```json
{
  "name": "merch-configurator",
  "private": true,
  "workspaces": ["widget", "admin"]
}
```

**Step 2: Create widget package.json**

```json
{
  "name": "merch-widget",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "vite": "^6.1.0",
    "vitest": "^3.0.0"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.49.0"
  }
}
```

**Step 3: Create widget/vite.config.js**

```js
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/main.js',
      name: 'MerchConfigurator',
      fileName: () => 'configurator.js',
      formats: ['iife'],
    },
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
  },
});
```

**Step 4: Create admin package.json**

```json
{
  "name": "merch-admin",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.5.0",
    "tailwindcss": "^4.0.0",
    "vite": "^6.1.0"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.49.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.2.0"
  }
}
```

**Step 5: Create admin/vite.config.js**

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
```

**Step 6: Create .gitignore**

```
node_modules/
dist/
.env
.env.local
```

**Step 7: Install dependencies**

Run: `npm install`

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: initialize monorepo with widget and admin packages"
```

---

### Task 2: Create Supabase database migration

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`
- Create: `supabase/seed.sql`

**Step 1: Write the migration SQL**

Create `supabase/migrations/001_initial_schema.sql`:

```sql
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
```

**Step 2: Write seed data**

Create `supabase/seed.sql`:

```sql
-- Seed categories
INSERT INTO categories (name, sort_order) VALUES
  ('Футболки', 1),
  ('Лонгсливы', 2),
  ('Худи', 3),
  ('Худи зип', 4),
  ('Поло', 5),
  ('Свитшоты', 6),
  ('Бомберы', 7),
  ('Шопперы', 8),
  ('Бейсболки', 9);

-- Seed sections
INSERT INTO sections (name, slug, sort_order, depends_on_category) VALUES
  ('Фасон', 'fit', 1, false),
  ('Материал', 'material', 2, true),
  ('Цвет материала', 'color', 3, true),
  ('Нанесение спереди', 'print-front', 4, false),
  ('Нанесение сзади', 'print-back', 5, false),
  ('Кастомизация', 'customization', 6, false);

-- Seed options: Фасон
INSERT INTO options (section_id, name, sort_order, available_for_categories) VALUES
  (1, 'Фит', 1, '{1,2,3,4,5,6,7}'),
  (1, 'Оверсайз', 2, '{1,2,3,4,5,6,7}');

-- Seed options: Материал (for Футболки/Лонгсливы = categories 1,2)
INSERT INTO options (section_id, name, description, sort_order, available_for_categories) VALUES
  (2, 'Кулирка 200г', '92% хлопок / 8% полиэстер', 1, '{1,2}'),
  (2, 'Кулирка 240г', '100% хлопок', 2, '{1,2}'),
  (2, 'Кулирка 300г', '100% хлопок', 3, '{1,2}'),
  (2, 'Френч терри 240г', '92% хлопок / 8% полиэстер', 4, '{1,2}');

-- Seed options: Материал (for Худи/Худи-зип/Свитшоты/Бомберы = categories 3,4,6,7)
INSERT INTO options (section_id, name, description, sort_order, available_for_categories) VALUES
  (2, 'Футер 330г петля', '92% хлопок / 8% полиэстер', 5, '{3,4,6,7}'),
  (2, 'Футер 330г начёс', '92% хлопок / 8% полиэстер', 6, '{3,4,6,7}'),
  (2, 'Футер 350г пич эффект', '92% хлопок / 8% полиэстер', 7, '{3,4,6,7}'),
  (2, 'Футер 430г диагональ', '100% хлопок', 8, '{3,4,6,7}'),
  (2, 'Футер 430г микроначёс', '100% хлопок', 9, '{3,4,6,7}'),
  (2, 'Футер 470г петля', '100% хлопок', 10, '{3,4,6,7}'),
  (2, 'Футер 500г петля', '100% хлопок', 11, '{3,4,6,7}');

-- Seed options: Материал (for Поло = category 5)
INSERT INTO options (section_id, name, sort_order, available_for_categories) VALUES
  (2, 'Пике 190г', 12, '{5}'),
  (2, 'Пике 210г', 13, '{5}'),
  (2, 'Пике 300г', 14, '{5}');

-- Seed options: Нанесение спереди
INSERT INTO options (section_id, name, sort_order, available_for_categories) VALUES
  (4, 'Шелкография (А4)', 1, '{1,2,3,4,5,6,7,8,9}'),
  (4, 'Шелкография пафф (А4)', 2, '{1,2,3,4,5,6,7,8,9}'),
  (4, 'Шелкография 3D (А4)', 3, '{1,2,3,4,5,6,7,8,9}'),
  (4, 'Вышивка (до А5)', 4, '{1,2,3,4,5,6,7,8,9}'),
  (4, 'Эмбосинг 3D (А4)', 5, '{1,2,3,4,5,6,7,8,9}'),
  (4, 'Флекстран (А5)', 6, '{1,2,3,4,5,6,7,8,9}'),
  (4, 'DTF (А4)', 7, '{1,2,3,4,5,6,7,8,9}'),
  (4, 'Без нанесения', 8, '{1,2,3,4,5,6,7,8,9}');

-- Seed options: Нанесение сзади
INSERT INTO options (section_id, name, sort_order, available_for_categories) VALUES
  (5, 'Шелкография (А4)', 1, '{1,2,3,4,5,6,7,8,9}'),
  (5, 'Шелкография пафф (А4)', 2, '{1,2,3,4,5,6,7,8,9}'),
  (5, 'Шелкография 3D (А4)', 3, '{1,2,3,4,5,6,7,8,9}'),
  (5, 'Вышивка (до А5)', 4, '{1,2,3,4,5,6,7,8,9}'),
  (5, 'Эмбосинг 3D (А4)', 5, '{1,2,3,4,5,6,7,8,9}'),
  (5, 'Флекстран (А5)', 6, '{1,2,3,4,5,6,7,8,9}'),
  (5, 'DTF (А4)', 7, '{1,2,3,4,5,6,7,8,9}'),
  (5, 'Без нанесения', 8, '{1,2,3,4,5,6,7,8,9}');

-- Seed options: Кастомизация
INSERT INTO options (section_id, name, sort_order, available_for_categories) VALUES
  (6, 'Варка изделия', 1, '{1,2,3,4,5,6,7}'),
  (6, 'Дистресс', 2, '{1,2,3,4,5,6,7}'),
  (6, 'Лейблы', 3, '{1,2,3,4,5,6,7,8,9}'),
  (6, 'Упаковка', 4, '{1,2,3,4,5,6,7,8,9}');
```

**Step 3: Commit**

```bash
git add supabase/
git commit -m "feat: add database migration and seed data"
```

---

### Task 3: Create Supabase project and apply schema

**This task is manual — done in the Supabase dashboard:**

**Step 1:** Go to https://supabase.com, create a new project. Note down:
- Project URL (e.g., `https://xxxxx.supabase.co`)
- Anon key (public)
- Service role key (admin only — never expose)

**Step 2:** In SQL Editor, run `supabase/migrations/001_initial_schema.sql`

**Step 3:** In SQL Editor, run `supabase/seed.sql`

**Step 4:** Create Storage bucket:
- Go to Storage → New bucket → name: `images` → Public bucket: ON

**Step 5:** Create `.env` files:

Create `widget/.env`:
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Create `admin/.env`:
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Step 6:** Create admin user in Supabase Auth dashboard (Authentication → Users → Add user)

**Step 7: Commit (without .env)**

```bash
git add -A
git commit -m "chore: document Supabase setup steps"
```

---

## Phase 2: Widget — Core Logic

### Task 4: Write price calculation engine with tests

**Files:**
- Create: `widget/src/pricing.js`
- Create: `widget/tests/pricing.test.js`

**Step 1: Write the failing tests**

Create `widget/tests/pricing.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { calculatePrice, getTieredPrice } from '../src/pricing.js';

describe('getTieredPrice', () => {
  const tiers = [
    { min_qty: 1, max_qty: 49, price: 100 },
    { min_qty: 50, max_qty: 99, price: 80 },
    { min_qty: 100, max_qty: null, price: 60 },
  ];

  it('returns price for first tier', () => {
    expect(getTieredPrice(tiers, 10)).toBe(100);
  });

  it('returns price for middle tier', () => {
    expect(getTieredPrice(tiers, 75)).toBe(80);
  });

  it('returns price for last tier (no max)', () => {
    expect(getTieredPrice(tiers, 500)).toBe(60);
  });

  it('returns 0 for empty tiers', () => {
    expect(getTieredPrice([], 10)).toBe(0);
  });
});

describe('calculatePrice', () => {
  const rules = [
    { category_id: 1, option_id: null, base_price: 500, price_type: 'fixed', tiers: null },
    { category_id: null, option_id: 10, base_price: 200, price_type: 'fixed', tiers: null },
    { category_id: null, option_id: 20, base_price: 0, price_type: 'tiered', tiers: [
      { min_qty: 1, max_qty: 49, price: 150 },
      { min_qty: 50, max_qty: null, price: 100 },
    ]},
  ];

  it('sums fixed prices for selected options', () => {
    const selection = { categoryId: 1, optionIds: [10], quantity: 1 };
    // 500 (category base) + 200 (option 10) = 700
    expect(calculatePrice(rules, selection)).toEqual({ unitPrice: 700, total: 700 });
  });

  it('applies tiered pricing based on quantity', () => {
    const selection = { categoryId: 1, optionIds: [20], quantity: 100 };
    // 500 (category base) + 100 (tiered, qty 100) = 600
    expect(calculatePrice(rules, selection)).toEqual({ unitPrice: 600, total: 60000 });
  });

  it('handles no matching rules gracefully', () => {
    const selection = { categoryId: 99, optionIds: [], quantity: 1 };
    expect(calculatePrice(rules, selection)).toEqual({ unitPrice: 0, total: 0 });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd widget && npx vitest run tests/pricing.test.js`
Expected: FAIL — module not found

**Step 3: Implement pricing.js**

Create `widget/src/pricing.js`:

```js
/**
 * Get price from tiered pricing based on quantity.
 * @param {Array<{min_qty: number, max_qty: number|null, price: number}>} tiers
 * @param {number} quantity
 * @returns {number}
 */
export function getTieredPrice(tiers, quantity) {
  if (!tiers || tiers.length === 0) return 0;
  for (const tier of tiers) {
    if (quantity >= tier.min_qty && (tier.max_qty === null || quantity <= tier.max_qty)) {
      return tier.price;
    }
  }
  return 0;
}

/**
 * Calculate total price based on pricing rules and user selection.
 * @param {Array} rules - pricing_rules from Supabase
 * @param {{categoryId: number, optionIds: number[], quantity: number}} selection
 * @returns {{unitPrice: number, total: number}}
 */
export function calculatePrice(rules, selection) {
  let unitPrice = 0;

  // Category base price
  const categoryRule = rules.find(
    (r) => r.category_id === selection.categoryId && r.option_id === null
  );
  if (categoryRule) {
    if (categoryRule.price_type === 'tiered' && categoryRule.tiers) {
      unitPrice += getTieredPrice(categoryRule.tiers, selection.quantity);
    } else {
      unitPrice += Number(categoryRule.base_price);
    }
  }

  // Option prices
  for (const optionId of selection.optionIds) {
    const rule = rules.find((r) => r.option_id === optionId);
    if (rule) {
      if (rule.price_type === 'tiered' && rule.tiers) {
        unitPrice += getTieredPrice(rule.tiers, selection.quantity);
      } else {
        unitPrice += Number(rule.base_price);
      }
    }
  }

  return {
    unitPrice,
    total: unitPrice * selection.quantity,
  };
}
```

**Step 4: Run tests to verify they pass**

Run: `cd widget && npx vitest run tests/pricing.test.js`
Expected: All 7 tests PASS

**Step 5: Commit**

```bash
git add widget/src/pricing.js widget/tests/pricing.test.js
git commit -m "feat(widget): add price calculation engine with tests"
```

---

### Task 5: Create Supabase client and data fetching

**Files:**
- Create: `widget/src/supabase.js`
- Create: `widget/src/api.js`

**Step 1: Create Supabase client**

Create `widget/src/supabase.js`:

```js
import { createClient } from '@supabase/supabase-js';

let client = null;

export function initSupabase(url, anonKey) {
  client = createClient(url, anonKey);
  return client;
}

export function getSupabase() {
  if (!client) throw new Error('Supabase not initialized. Call initSupabase() first.');
  return client;
}
```

**Step 2: Create API module for fetching configurator data**

Create `widget/src/api.js`:

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

export async function fetchSections() {
  const { data, error } = await getSupabase()
    .from('sections')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw error;
  return data;
}

export async function fetchOptions() {
  const { data, error } = await getSupabase()
    .from('options')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw error;
  return data;
}

export async function fetchPricingRules() {
  const { data, error } = await getSupabase()
    .from('pricing_rules')
    .select('*');
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
  const [categories, sections, options, pricingRules, colorPalettes] = await Promise.all([
    fetchCategories(),
    fetchSections(),
    fetchOptions(),
    fetchPricingRules(),
    fetchColorPalettes(),
  ]);
  return { categories, sections, options, pricingRules, colorPalettes };
}
```

**Step 3: Commit**

```bash
git add widget/src/supabase.js widget/src/api.js
git commit -m "feat(widget): add Supabase client and data fetching API"
```

---

### Task 6: Create state management

**Files:**
- Create: `widget/src/state.js`
- Create: `widget/tests/state.test.js`

**Step 1: Write failing tests for state**

Create `widget/tests/state.test.js`:

```js
import { describe, it, expect, vi } from 'vitest';
import { createStore } from '../src/state.js';

describe('createStore', () => {
  it('initializes with default state', () => {
    const store = createStore();
    expect(store.getState().categoryId).toBe(null);
    expect(store.getState().quantity).toBe(100);
  });

  it('updates state and notifies listeners', () => {
    const store = createStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.update({ categoryId: 1 });

    expect(store.getState().categoryId).toBe(1);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('filters options by selected category', () => {
    const store = createStore();
    store.setData({
      categories: [{ id: 1, name: 'Футболки' }],
      sections: [{ id: 1, slug: 'material', depends_on_category: true }],
      options: [
        { id: 10, section_id: 1, name: 'Кулирка', available_for_categories: [1, 2] },
        { id: 11, section_id: 1, name: 'Футер', available_for_categories: [3, 4] },
      ],
      pricingRules: [],
      colorPalettes: [],
    });
    store.update({ categoryId: 1 });

    const filtered = store.getOptionsForSection(1);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('Кулирка');
  });

  it('filters color palettes by selected material', () => {
    const store = createStore();
    store.setData({
      categories: [],
      sections: [],
      options: [],
      pricingRules: [],
      colorPalettes: [
        { id: 1, material_option_id: 10, color_name: 'Чёрный', hex_code: '#000' },
        { id: 2, material_option_id: 11, color_name: 'Белый', hex_code: '#FFF' },
      ],
    });

    const colors = store.getColorsForMaterial(10);
    expect(colors).toHaveLength(1);
    expect(colors[0].color_name).toBe('Чёрный');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd widget && npx vitest run tests/state.test.js`
Expected: FAIL

**Step 3: Implement state.js**

Create `widget/src/state.js`:

```js
export function createStore() {
  let state = {
    categoryId: null,
    selections: {},   // sectionSlug -> optionId
    customizations: [], // array of selected customization option IDs
    quantity: 100,
  };

  let data = {
    categories: [],
    sections: [],
    options: [],
    pricingRules: [],
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

  function getOptionsForSection(sectionId) {
    const section = data.sections.find((s) => s.id === sectionId);
    const opts = data.options.filter((o) => o.section_id === sectionId);

    if (section && section.depends_on_category && state.categoryId) {
      return opts.filter((o) => o.available_for_categories.includes(state.categoryId));
    }
    return opts;
  }

  function getColorsForMaterial(materialOptionId) {
    return data.colorPalettes.filter((c) => c.material_option_id === materialOptionId);
  }

  return { getState, update, subscribe, setData, getData, getOptionsForSection, getColorsForMaterial };
}
```

**Step 4: Run tests to verify they pass**

Run: `cd widget && npx vitest run tests/state.test.js`
Expected: All 4 tests PASS

**Step 5: Commit**

```bash
git add widget/src/state.js widget/tests/state.test.js
git commit -m "feat(widget): add reactive state management with tests"
```

---

## Phase 3: Widget — UI Components

### Task 7: Create Shadow DOM shell and base styles

**Files:**
- Create: `widget/src/main.js`
- Create: `widget/src/styles.js`
- Create: `widget/index.html` (dev preview)

**Step 1: Create styles.js with all CSS**

Create `widget/src/styles.js`:

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

  .option-card .desc {
    font-size: 11px;
    color: var(--text-secondary);
    margin-top: 4px;
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

  .buttons-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
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

  .checkbox-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .checkbox-item {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--bg-card);
    border: 2px solid transparent;
    border-radius: var(--radius-btn);
    padding: 8px 16px;
    cursor: pointer;
    font-size: 13px;
    color: var(--text);
    font-family: var(--font);
    transition: border-color 0.15s;
  }

  .checkbox-item.selected {
    border-color: var(--primary);
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

  /* Modal */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
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

**Step 2: Create main.js entry point with Shadow DOM**

Create `widget/src/main.js`:

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
    // Get config from attributes
    const url = this.getAttribute('supabase-url');
    const key = this.getAttribute('supabase-key');

    if (!url || !key) {
      this.shadowRoot.innerHTML = '<p style="color:red">Missing supabase-url or supabase-key attributes</p>';
      return;
    }

    initSupabase(url, key);
    this.render();
    await this.loadData();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>${CSS}</style>
      <div class="configurator">
        <div class="preview-panel">
          <div class="preview-placeholder">Выберите изделие</div>
        </div>
        <div class="config-panel">
          <div class="loading" style="text-align:center;padding:40px;color:var(--text-secondary)">
            Загрузка...
          </div>
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
      const panel = this.shadowRoot.querySelector('.config-panel');
      panel.innerHTML = `<p style="color:red;padding:20px">Ошибка загрузки: ${err.message}</p>`;
    }
  }

  renderConfigurator() {
    const data = this.store.getData();
    const panel = this.shadowRoot.querySelector('.config-panel');

    let html = '';

    // Category section
    html += this.renderCategorySection(data.categories);

    // Dynamic sections
    for (const section of data.sections) {
      if (section.slug === 'color') {
        html += this.renderColorSection(section);
      } else if (section.slug === 'customization') {
        html += this.renderCustomizationSection(section, data.options.filter(o => o.section_id === section.id));
      } else {
        html += this.renderOptionSection(section);
      }
    }

    // Footer
    html += this.renderFooter();

    panel.innerHTML = html;
    this.bindEvents();
  }

  renderCategorySection(categories) {
    const cards = categories.map(c => `
      <div class="option-card" data-category-id="${c.id}">
        ${c.image_url ? `<img src="${c.image_url}" alt="${c.name}">` : ''}
        <div class="name">${c.name}</div>
      </div>
    `).join('');

    return `
      <div class="section" data-section="category">
        <div class="section-title">Изделие</div>
        <div class="options-grid">${cards}</div>
      </div>
    `;
  }

  renderOptionSection(section) {
    return `
      <div class="section" data-section="${section.slug}">
        <div class="section-title">${section.name}</div>
        <div class="buttons-row" data-section-id="${section.id}"></div>
      </div>
    `;
  }

  renderColorSection(section) {
    return `
      <div class="section" data-section="color">
        <div class="section-title">${section.name}</div>
        <div class="color-swatches" data-section-id="${section.id}"></div>
        <span class="color-name"></span>
      </div>
    `;
  }

  renderCustomizationSection(section, options) {
    const items = options.map(o => `
      <div class="checkbox-item" data-option-id="${o.id}">
        ${o.name}
      </div>
    `).join('');

    return `
      <div class="section" data-section="customization">
        <div class="section-title">${section.name}</div>
        <div class="checkbox-grid">${items}</div>
      </div>
    `;
  }

  renderFooter() {
    return `
      <div class="footer">
        <div class="quantity-row">
          <span class="quantity-label">Тираж:</span>
          <input type="number" class="quantity-input" value="100" min="1">
          <span class="quantity-label">шт.</span>
        </div>
        <div class="price-row">
          <span class="price-unit">Цена за шт: <strong data-unit-price>0 ₽</strong></span>
          <span class="price-total" data-total-price>0 ₽</span>
        </div>
        <button class="submit-btn">Оставить заявку</button>
      </div>
    `;
  }

  bindEvents() {
    const shadow = this.shadowRoot;

    // Category click
    shadow.querySelectorAll('[data-category-id]').forEach(el => {
      el.addEventListener('click', () => {
        const id = Number(el.dataset.categoryId);
        this.store.update({ categoryId: id, selections: {}, customizations: [] });
      });
    });

    // Quantity input
    const qtyInput = shadow.querySelector('.quantity-input');
    if (qtyInput) {
      qtyInput.addEventListener('input', () => {
        const qty = Math.max(1, parseInt(qtyInput.value) || 1);
        this.store.update({ quantity: qty });
      });
    }

    // Submit button
    const submitBtn = shadow.querySelector('.submit-btn');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => this.showOrderModal());
    }

    // Customization checkboxes
    shadow.querySelectorAll('.checkbox-item').forEach(el => {
      el.addEventListener('click', () => {
        const id = Number(el.dataset.optionId);
        const customs = [...this.store.getState().customizations];
        const idx = customs.indexOf(id);
        if (idx >= 0) customs.splice(idx, 1);
        else customs.push(id);
        this.store.update({ customizations: customs });
      });
    });
  }

  onStateChange() {
    const state = this.store.getState();
    const data = this.store.getData();
    const shadow = this.shadowRoot;

    // Update category selection
    shadow.querySelectorAll('[data-category-id]').forEach(el => {
      el.classList.toggle('selected', Number(el.dataset.categoryId) === state.categoryId);
    });

    // Update preview image
    const previewPanel = shadow.querySelector('.preview-panel');
    const selectedCat = data.categories.find(c => c.id === state.categoryId);
    if (selectedCat && selectedCat.image_url) {
      previewPanel.innerHTML = `<img src="${selectedCat.image_url}" alt="${selectedCat.name}">`;
    } else {
      previewPanel.innerHTML = '<div class="preview-placeholder">Выберите изделие</div>';
    }

    // Update dynamic option sections
    for (const section of data.sections) {
      if (section.slug === 'color') {
        this.updateColorSection(section, state);
      } else if (section.slug !== 'customization') {
        this.updateOptionSection(section, state);
      }
    }

    // Update customization checkboxes
    shadow.querySelectorAll('.checkbox-item').forEach(el => {
      el.classList.toggle('selected', state.customizations.includes(Number(el.dataset.optionId)));
    });

    // Update price
    this.updatePrice(state);
  }

  updateOptionSection(section, state) {
    const container = this.shadowRoot.querySelector(`[data-section-id="${section.id}"].buttons-row`);
    if (!container) return;

    const options = this.store.getOptionsForSection(section.id);
    const selectedId = state.selections[section.slug];

    container.innerHTML = options.map(o => `
      <button class="option-btn ${o.id === selectedId ? 'selected' : ''}" data-opt-id="${o.id}" data-section-slug="${section.slug}">
        ${o.name}
        ${o.description ? `<br><small style="color:var(--text-secondary)">${o.description}</small>` : ''}
      </button>
    `).join('');

    container.querySelectorAll('[data-opt-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const selections = { ...state.selections, [btn.dataset.sectionSlug]: Number(btn.dataset.optId) };
        this.store.update({ selections });
      });
    });
  }

  updateColorSection(section, state) {
    const container = this.shadowRoot.querySelector(`[data-section-id="${section.id}"].color-swatches`);
    const nameEl = this.shadowRoot.querySelector('.color-name');
    if (!container) return;

    // Find selected material option
    const materialSection = this.store.getData().sections.find(s => s.slug === 'material');
    const materialOptId = materialSection ? state.selections['material'] : null;

    if (!materialOptId) {
      container.innerHTML = '<span style="color:var(--text-secondary);font-size:13px">Сначала выберите материал</span>';
      if (nameEl) nameEl.textContent = '';
      return;
    }

    const colors = this.store.getColorsForMaterial(materialOptId);
    const selectedColorId = state.selections['color'];

    container.innerHTML = colors.map(c => `
      <div class="color-swatch ${c.id === selectedColorId ? 'selected' : ''}"
           data-color-id="${c.id}"
           data-color-name="${c.color_name}"
           style="background:${c.hex_code}"
           title="${c.color_name}">
      </div>
    `).join('');

    if (nameEl) {
      const sel = colors.find(c => c.id === selectedColorId);
      nameEl.textContent = sel ? sel.color_name : '';
    }

    container.querySelectorAll('[data-color-id]').forEach(el => {
      el.addEventListener('click', () => {
        const selections = { ...state.selections, color: Number(el.dataset.colorId) };
        this.store.update({ selections });
      });
    });
  }

  updatePrice(state) {
    const data = this.store.getData();
    const allOptionIds = [
      ...Object.values(state.selections).filter(v => typeof v === 'number'),
      ...state.customizations,
    ];

    const { unitPrice, total } = calculatePrice(data.pricingRules, {
      categoryId: state.categoryId,
      optionIds: allOptionIds,
      quantity: state.quantity,
    });

    const unitEl = this.shadowRoot.querySelector('[data-unit-price]');
    const totalEl = this.shadowRoot.querySelector('[data-total-price]');
    if (unitEl) unitEl.textContent = `${unitPrice.toLocaleString('ru-RU')} ₽`;
    if (totalEl) totalEl.textContent = `${total.toLocaleString('ru-RU')} ₽`;
  }

  showOrderModal() {
    const state = this.store.getState();
    if (!state.categoryId) {
      alert('Пожалуйста, выберите изделие');
      return;
    }

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
      const allOptionIds = [
        ...Object.values(state.selections).filter(v => typeof v === 'number'),
        ...state.customizations,
      ];
      const { unitPrice, total } = calculatePrice(data.pricingRules, {
        categoryId: state.categoryId,
        optionIds: allOptionIds,
        quantity: state.quantity,
      });

      try {
        await submitOrder({
          customer_name: name,
          customer_contact: contact,
          customer_comment: comment || null,
          configuration: {
            categoryId: state.categoryId,
            selections: state.selections,
            customizations: state.customizations,
          },
          quantity: state.quantity,
          calculated_price: total,
        });

        overlay.querySelector('.modal').innerHTML = `
          <div class="success-msg">
            <h2>Заявка отправлена!</h2>
            <p style="color:var(--text-secondary)">Мы свяжемся с вами в ближайшее время.</p>
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

**Step 3: Create index.html for dev preview**

Create `widget/index.html`:

```html
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Merch Configurator — Dev</title>
  <style>
    body { margin: 0; padding: 40px; background: #111; }
  </style>
</head>
<body>
  <merch-configurator
    supabase-url="YOUR_SUPABASE_URL"
    supabase-key="YOUR_ANON_KEY"
  ></merch-configurator>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

**Step 4: Build and verify it compiles**

Run: `cd widget && npx vite build`
Expected: Output in `widget/dist/configurator.js`

**Step 5: Commit**

```bash
git add widget/
git commit -m "feat(widget): add Shadow DOM shell, styles, and full configurator UI"
```

---

## Phase 4: Admin Panel

### Task 8: Setup admin with React Router, Tailwind, Auth

**Files:**
- Create: `admin/index.html`
- Create: `admin/src/main.jsx`
- Create: `admin/src/App.jsx`
- Create: `admin/src/supabase.js`
- Create: `admin/src/pages/Login.jsx`
- Create: `admin/src/components/Layout.jsx`
- Create: `admin/src/index.css`
- Create: `admin/postcss.config.js`

**Step 1: Create admin/index.html**

```html
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Админка конфигуратора</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
```

**Step 2: Create admin/src/index.css**

```css
@import "tailwindcss";
```

**Step 3: Create admin/postcss.config.js**

```js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```

**Step 4: Create admin/src/supabase.js**

```js
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

**Step 5: Create admin/src/main.jsx**

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**Step 6: Create admin/src/App.jsx with auth guard and routing**

```jsx
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabase';
import Login from './pages/Login';
import Layout from './components/Layout';
import Categories from './pages/Categories';
import Sections from './pages/Sections';
import Pricing from './pages/Pricing';
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
          <Route path="/sections" element={<Sections />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/palettes" element={<Palettes />} />
          <Route path="/orders" element={<Orders />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
```

**Step 7: Create admin/src/pages/Login.jsx**

```jsx
import { useState } from 'react';
import { supabase } from '../supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-gray-800 p-8 rounded-xl w-full max-w-sm">
        <h1 className="text-xl font-bold text-white mb-6">Вход в админку</h1>
        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
        <div className="mb-4">
          <label className="block text-gray-400 text-sm mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
            required
          />
        </div>
        <div className="mb-6">
          <label className="block text-gray-400 text-sm mb-1">Пароль</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? 'Вход...' : 'Войти'}
        </button>
      </form>
    </div>
  );
}
```

**Step 8: Create admin/src/components/Layout.jsx**

```jsx
import { NavLink } from 'react-router-dom';
import { supabase } from '../supabase';

const NAV = [
  { to: '/categories', label: 'Категории' },
  { to: '/sections', label: 'Разделы и опции' },
  { to: '/pricing', label: 'Цены' },
  { to: '/palettes', label: 'Палитры' },
  { to: '/orders', label: 'Заявки' },
];

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex">
      <aside className="w-56 bg-gray-800 p-4 flex flex-col">
        <h1 className="text-lg font-bold text-orange-500 mb-6">UNFRM Admin</h1>
        <nav className="flex flex-col gap-1 flex-1">
          {NAV.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-orange-500/20 text-orange-400' : 'text-gray-300 hover:bg-gray-700'
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-sm text-gray-400 hover:text-white mt-4"
        >
          Выйти
        </button>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
```

**Step 9: Create placeholder pages**

Create these files with minimal content (to be filled in subsequent tasks):

`admin/src/pages/Categories.jsx`:
```jsx
export default function Categories() {
  return <h2 className="text-xl font-bold">Категории</h2>;
}
```

`admin/src/pages/Sections.jsx`:
```jsx
export default function Sections() {
  return <h2 className="text-xl font-bold">Разделы и опции</h2>;
}
```

`admin/src/pages/Pricing.jsx`:
```jsx
export default function Pricing() {
  return <h2 className="text-xl font-bold">Ценообразование</h2>;
}
```

`admin/src/pages/Palettes.jsx`:
```jsx
export default function Palettes() {
  return <h2 className="text-xl font-bold">Палитры цветов</h2>;
}
```

`admin/src/pages/Orders.jsx`:
```jsx
export default function Orders() {
  return <h2 className="text-xl font-bold">Заявки</h2>;
}
```

**Step 10: Verify admin builds**

Run: `cd admin && npx vite build`
Expected: Successful build

**Step 11: Commit**

```bash
git add admin/
git commit -m "feat(admin): setup React admin with auth, routing, and layout"
```

---

### Task 9: Implement Categories CRUD page

**Files:**
- Modify: `admin/src/pages/Categories.jsx`

**Step 1: Implement full Categories page**

Replace `admin/src/pages/Categories.jsx`:

```jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | 'new' | category object
  const [form, setForm] = useState({ name: '', sort_order: 0, is_active: true });
  const [uploading, setUploading] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('categories').select('*').order('sort_order');
    setCategories(data || []);
    setLoading(false);
  }

  function startNew() {
    setForm({ name: '', sort_order: categories.length, is_active: true });
    setEditing('new');
  }

  function startEdit(cat) {
    setForm({ name: cat.name, sort_order: cat.sort_order, is_active: cat.is_active });
    setEditing(cat);
  }

  async function save() {
    if (!form.name.trim()) return;
    if (editing === 'new') {
      await supabase.from('categories').insert(form);
    } else {
      await supabase.from('categories').update(form).eq('id', editing.id);
    }
    setEditing(null);
    load();
  }

  async function remove(id) {
    if (!confirm('Удалить категорию?')) return;
    await supabase.from('categories').delete().eq('id', id);
    load();
  }

  async function uploadImage(catId, file) {
    setUploading(true);
    const path = `categories/${catId}-${Date.now()}.${file.name.split('.').pop()}`;
    const { error: uploadErr } = await supabase.storage.from('images').upload(path, file);
    if (uploadErr) { alert(uploadErr.message); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(path);
    await supabase.from('categories').update({ image_url: publicUrl }).eq('id', catId);
    setUploading(false);
    load();
  }

  if (loading) return <p className="text-gray-400">Загрузка...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Категории</h2>
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
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={e => setForm({ ...form, is_active: e.target.checked })}
                className="accent-orange-500"
              />
              Активна
            </label>
            <button onClick={save} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm">
              Сохранить
            </button>
            <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-white px-4 py-2 text-sm">
              Отмена
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {categories.map(cat => (
          <div key={cat.id} className="bg-gray-800 p-4 rounded-xl flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
              {cat.image_url
                ? <img src={cat.image_url} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">—</div>
              }
            </div>
            <div className="flex-1">
              <span className="font-medium">{cat.name}</span>
              {!cat.is_active && <span className="ml-2 text-xs text-gray-500">(скрыта)</span>}
            </div>
            <span className="text-gray-500 text-xs">#{cat.sort_order}</span>
            <label className="text-xs text-gray-400 cursor-pointer hover:text-orange-400">
              {uploading ? '...' : 'Фото'}
              <input type="file" accept="image/*" className="hidden" onChange={e => {
                if (e.target.files[0]) uploadImage(cat.id, e.target.files[0]);
              }} />
            </label>
            <button onClick={() => startEdit(cat)} className="text-gray-400 hover:text-white text-sm">
              Изменить
            </button>
            <button onClick={() => remove(cat.id)} className="text-red-400 hover:text-red-300 text-sm">
              Удалить
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Verify it builds**

Run: `cd admin && npx vite build`
Expected: Successful build

**Step 3: Commit**

```bash
git add admin/src/pages/Categories.jsx
git commit -m "feat(admin): implement Categories CRUD with image upload"
```

---

### Task 10: Implement Sections & Options page

**Files:**
- Modify: `admin/src/pages/Sections.jsx`

**Step 1: Implement full Sections page**

Replace `admin/src/pages/Sections.jsx`:

```jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function Sections() {
  const [sections, setSections] = useState([]);
  const [options, setOptions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeSectionId, setActiveSectionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingOption, setEditingOption] = useState(null);
  const [optForm, setOptForm] = useState({ name: '', description: '', sort_order: 0, is_active: true, available_for_categories: [] });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [{ data: s }, { data: o }, { data: c }] = await Promise.all([
      supabase.from('sections').select('*').order('sort_order'),
      supabase.from('options').select('*').order('sort_order'),
      supabase.from('categories').select('id, name').order('sort_order'),
    ]);
    setSections(s || []);
    setOptions(o || []);
    setCategories(c || []);
    if (!activeSectionId && s?.length) setActiveSectionId(s[0].id);
    setLoading(false);
  }

  const sectionOptions = options.filter(o => o.section_id === activeSectionId);

  function startNewOption() {
    setOptForm({ name: '', description: '', sort_order: sectionOptions.length, is_active: true, available_for_categories: categories.map(c => c.id) });
    setEditingOption('new');
  }

  function startEditOption(opt) {
    setOptForm({
      name: opt.name,
      description: opt.description || '',
      sort_order: opt.sort_order,
      is_active: opt.is_active,
      available_for_categories: opt.available_for_categories || [],
    });
    setEditingOption(opt);
  }

  async function saveOption() {
    if (!optForm.name.trim()) return;
    const payload = { ...optForm, section_id: activeSectionId };
    if (editingOption === 'new') {
      await supabase.from('options').insert(payload);
    } else {
      await supabase.from('options').update(payload).eq('id', editingOption.id);
    }
    setEditingOption(null);
    load();
  }

  async function removeOption(id) {
    if (!confirm('Удалить опцию?')) return;
    await supabase.from('options').delete().eq('id', id);
    load();
  }

  function toggleCategory(catId) {
    const cats = [...optForm.available_for_categories];
    const idx = cats.indexOf(catId);
    if (idx >= 0) cats.splice(idx, 1);
    else cats.push(catId);
    setOptForm({ ...optForm, available_for_categories: cats });
  }

  if (loading) return <p className="text-gray-400">Загрузка...</p>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Разделы и опции</h2>

      {/* Section tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => { setActiveSectionId(s.id); setEditingOption(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              s.id === activeSectionId ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Options list */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          Опции: {sections.find(s => s.id === activeSectionId)?.name}
        </h3>
        <button onClick={startNewOption} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">
          + Добавить опцию
        </button>
      </div>

      {editingOption && (
        <div className="bg-gray-800 p-4 rounded-xl mb-4 space-y-3">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-gray-400 text-xs mb-1">Название</label>
              <input
                value={optForm.name}
                onChange={e => setOptForm({ ...optForm, name: e.target.value })}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-gray-400 text-xs mb-1">Описание</label>
              <input
                value={optForm.description}
                onChange={e => setOptForm({ ...optForm, description: e.target.value })}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="w-24">
              <label className="block text-gray-400 text-xs mb-1">Порядок</label>
              <input
                type="number"
                value={optForm.sort_order}
                onChange={e => setOptForm({ ...optForm, sort_order: Number(e.target.value) })}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-gray-400 text-xs mb-2">Доступна для категорий:</label>
            <div className="flex gap-2 flex-wrap">
              {categories.map(c => (
                <button
                  key={c.id}
                  onClick={() => toggleCategory(c.id)}
                  className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                    optForm.available_for_categories.includes(c.id)
                      ? 'bg-orange-500/30 text-orange-300 border border-orange-500'
                      : 'bg-gray-700 text-gray-400 border border-transparent'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={saveOption} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm">
              Сохранить
            </button>
            <button onClick={() => setEditingOption(null)} className="text-gray-400 hover:text-white px-4 py-2 text-sm">
              Отмена
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {sectionOptions.map(opt => (
          <div key={opt.id} className="bg-gray-800 p-3 rounded-xl flex items-center gap-4">
            <div className="flex-1">
              <span className="font-medium text-sm">{opt.name}</span>
              {opt.description && <span className="text-gray-500 text-xs ml-2">{opt.description}</span>}
              {!opt.is_active && <span className="ml-2 text-xs text-gray-500">(скрыта)</span>}
            </div>
            <div className="flex gap-1 flex-wrap">
              {(opt.available_for_categories || []).map(catId => {
                const cat = categories.find(c => c.id === catId);
                return cat ? <span key={catId} className="text-[10px] bg-gray-700 px-2 py-0.5 rounded">{cat.name}</span> : null;
              })}
            </div>
            <button onClick={() => startEditOption(opt)} className="text-gray-400 hover:text-white text-sm">
              Изменить
            </button>
            <button onClick={() => removeOption(opt.id)} className="text-red-400 hover:text-red-300 text-sm">
              Удалить
            </button>
          </div>
        ))}
        {sectionOptions.length === 0 && <p className="text-gray-500 text-sm">Нет опций</p>}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add admin/src/pages/Sections.jsx
git commit -m "feat(admin): implement Sections & Options management page"
```

---

### Task 11: Implement Pricing page

**Files:**
- Modify: `admin/src/pages/Pricing.jsx`

**Step 1: Implement Pricing page**

Replace `admin/src/pages/Pricing.jsx`:

```jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function Pricing() {
  const [rules, setRules] = useState([]);
  const [categories, setCategories] = useState([]);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ category_id: null, option_id: null, base_price: 0, price_type: 'fixed', tiers: [] });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [{ data: r }, { data: c }, { data: o }] = await Promise.all([
      supabase.from('pricing_rules').select('*'),
      supabase.from('categories').select('id, name').order('sort_order'),
      supabase.from('options').select('id, name, section_id').order('sort_order'),
    ]);
    setRules(r || []);
    setCategories(c || []);
    setOptions(o || []);
    setLoading(false);
  }

  function startNew() {
    setForm({ category_id: null, option_id: null, base_price: 0, price_type: 'fixed', tiers: [] });
    setEditing('new');
  }

  function startEdit(rule) {
    setForm({
      category_id: rule.category_id,
      option_id: rule.option_id,
      base_price: rule.base_price,
      price_type: rule.price_type,
      tiers: rule.tiers || [],
    });
    setEditing(rule);
  }

  async function save() {
    const payload = {
      ...form,
      tiers: form.price_type === 'tiered' ? form.tiers : null,
    };
    if (editing === 'new') {
      await supabase.from('pricing_rules').insert(payload);
    } else {
      await supabase.from('pricing_rules').update(payload).eq('id', editing.id);
    }
    setEditing(null);
    load();
  }

  async function remove(id) {
    if (!confirm('Удалить правило?')) return;
    await supabase.from('pricing_rules').delete().eq('id', id);
    load();
  }

  function addTier() {
    setForm({ ...form, tiers: [...form.tiers, { min_qty: 1, max_qty: null, price: 0 }] });
  }

  function updateTier(idx, field, value) {
    const tiers = [...form.tiers];
    tiers[idx] = { ...tiers[idx], [field]: value === '' ? null : Number(value) };
    setForm({ ...form, tiers });
  }

  function removeTier(idx) {
    setForm({ ...form, tiers: form.tiers.filter((_, i) => i !== idx) });
  }

  function getName(rule) {
    if (rule.category_id && !rule.option_id) {
      return `Категория: ${categories.find(c => c.id === rule.category_id)?.name || rule.category_id}`;
    }
    if (rule.option_id) {
      return `Опция: ${options.find(o => o.id === rule.option_id)?.name || rule.option_id}`;
    }
    return 'Общее правило';
  }

  if (loading) return <p className="text-gray-400">Загрузка...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Ценообразование</h2>
        <button onClick={startNew} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">
          + Добавить правило
        </button>
      </div>

      {editing && (
        <div className="bg-gray-800 p-4 rounded-xl mb-6 space-y-3">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-gray-400 text-xs mb-1">Категория (необяз.)</label>
              <select
                value={form.category_id || ''}
                onChange={e => setForm({ ...form, category_id: e.target.value ? Number(e.target.value) : null })}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm"
              >
                <option value="">— Не выбрана —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-gray-400 text-xs mb-1">Опция (необяз.)</label>
              <select
                value={form.option_id || ''}
                onChange={e => setForm({ ...form, option_id: e.target.value ? Number(e.target.value) : null })}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm"
              >
                <option value="">— Не выбрана —</option>
                {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-32">
              <label className="block text-gray-400 text-xs mb-1">Базовая цена</label>
              <input
                type="number"
                value={form.base_price}
                onChange={e => setForm({ ...form, base_price: Number(e.target.value) })}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="w-40">
              <label className="block text-gray-400 text-xs mb-1">Тип</label>
              <select
                value={form.price_type}
                onChange={e => setForm({ ...form, price_type: e.target.value })}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm"
              >
                <option value="fixed">Фиксированная</option>
                <option value="per_unit">За единицу</option>
                <option value="tiered">Пороговая (тираж)</option>
              </select>
            </div>
          </div>

          {form.price_type === 'tiered' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-gray-400 text-xs">Пороги:</label>
                <button onClick={addTier} className="text-orange-400 hover:text-orange-300 text-xs">+ Добавить порог</button>
              </div>
              {form.tiers.map((tier, idx) => (
                <div key={idx} className="flex gap-2 mb-2 items-center">
                  <input type="number" placeholder="от" value={tier.min_qty} onChange={e => updateTier(idx, 'min_qty', e.target.value)}
                    className="w-20 bg-gray-700 text-white rounded px-2 py-1 text-sm" />
                  <span className="text-gray-500 text-xs">—</span>
                  <input type="number" placeholder="до (пусто = ∞)" value={tier.max_qty ?? ''} onChange={e => updateTier(idx, 'max_qty', e.target.value)}
                    className="w-20 bg-gray-700 text-white rounded px-2 py-1 text-sm" />
                  <span className="text-gray-500 text-xs">шт →</span>
                  <input type="number" placeholder="цена" value={tier.price} onChange={e => updateTier(idx, 'price', e.target.value)}
                    className="w-24 bg-gray-700 text-white rounded px-2 py-1 text-sm" />
                  <span className="text-gray-500 text-xs">₽</span>
                  <button onClick={() => removeTier(idx)} className="text-red-400 text-xs">✕</button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={save} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm">Сохранить</button>
            <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-white px-4 py-2 text-sm">Отмена</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {rules.map(rule => (
          <div key={rule.id} className="bg-gray-800 p-3 rounded-xl flex items-center gap-4">
            <div className="flex-1">
              <span className="font-medium text-sm">{getName(rule)}</span>
            </div>
            <span className="text-sm text-gray-400">{rule.base_price} ₽</span>
            <span className="text-xs bg-gray-700 px-2 py-1 rounded">{rule.price_type}</span>
            <button onClick={() => startEdit(rule)} className="text-gray-400 hover:text-white text-sm">Изменить</button>
            <button onClick={() => remove(rule.id)} className="text-red-400 hover:text-red-300 text-sm">Удалить</button>
          </div>
        ))}
        {rules.length === 0 && <p className="text-gray-500 text-sm">Нет правил</p>}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add admin/src/pages/Pricing.jsx
git commit -m "feat(admin): implement Pricing rules page with tiered pricing editor"
```

---

### Task 12: Implement Color Palettes page

**Files:**
- Modify: `admin/src/pages/Palettes.jsx`

**Step 1: Implement Palettes page**

Replace `admin/src/pages/Palettes.jsx`:

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
    // Get material section, then its options
    const { data: sections } = await supabase.from('sections').select('id').eq('slug', 'material').single();
    const materialSectionId = sections?.id;
    const [{ data: opts }, { data: p }] = await Promise.all([
      supabase.from('options').select('id, name').eq('section_id', materialSectionId).order('sort_order'),
      supabase.from('color_palettes').select('*').order('sort_order'),
    ]);
    setMaterials(opts || []);
    setPalettes(p || []);
    if (!activeMaterialId && opts?.length) setActiveMaterialId(opts[0].id);
    setLoading(false);
  }

  const materialColors = palettes.filter(p => p.material_option_id === activeMaterialId);

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
    const payload = { ...form, material_option_id: activeMaterialId };
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
git commit -m "feat(admin): implement Color Palettes page"
```

---

### Task 13: Implement Orders page

**Files:**
- Modify: `admin/src/pages/Orders.jsx`

**Step 1: Implement Orders page**

Replace `admin/src/pages/Orders.jsx`:

```jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

const STATUSES = ['new', 'in_progress', 'done', 'cancelled'];
const STATUS_LABELS = { new: 'Новая', in_progress: 'В работе', done: 'Выполнена', cancelled: 'Отменена' };
const STATUS_COLORS = { new: 'bg-orange-500', in_progress: 'bg-blue-500', done: 'bg-green-500', cancelled: 'bg-gray-500' };

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => { load(); }, [statusFilter]);

  async function load() {
    setLoading(true);
    let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (statusFilter !== 'all') query = query.eq('status', statusFilter);
    const { data } = await query;
    setOrders(data || []);
    setLoading(false);
  }

  async function updateStatus(id, status) {
    await supabase.from('orders').update({ status }).eq('id', id);
    load();
  }

  if (loading) return <p className="text-gray-400">Загрузка...</p>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Заявки</h2>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1 rounded-lg text-sm ${statusFilter === 'all' ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-300'}`}
        >
          Все ({orders.length})
        </button>
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-lg text-sm ${statusFilter === s ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-300'}`}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {orders.map(order => (
          <div key={order.id} className="bg-gray-800 rounded-xl overflow-hidden">
            <div
              className="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-750"
              onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
            >
              <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[order.status]}`} />
              <span className="font-medium text-sm flex-1">{order.customer_name}</span>
              <span className="text-gray-400 text-sm">{order.customer_contact}</span>
              <span className="text-sm font-semibold">{Number(order.calculated_price).toLocaleString('ru-RU')} ₽</span>
              <span className="text-gray-500 text-xs">{order.quantity} шт</span>
              <span className="text-gray-500 text-xs">{new Date(order.created_at).toLocaleDateString('ru-RU')}</span>
            </div>

            {expandedId === order.id && (
              <div className="px-4 pb-4 border-t border-gray-700">
                <div className="mt-3 space-y-2">
                  {order.customer_comment && (
                    <p className="text-sm text-gray-400">Комментарий: {order.customer_comment}</p>
                  )}
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Конфигурация:</p>
                    <pre className="text-xs bg-gray-900 p-2 rounded overflow-x-auto">
                      {JSON.stringify(order.configuration, null, 2)}
                    </pre>
                  </div>
                  <div className="flex gap-2 mt-3">
                    {STATUSES.map(s => (
                      <button
                        key={s}
                        onClick={() => updateStatus(order.id, s)}
                        className={`px-3 py-1 rounded text-xs ${
                          order.status === s
                            ? `${STATUS_COLORS[s]} text-white`
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
        {orders.length === 0 && <p className="text-gray-500 text-sm">Нет заявок</p>}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add admin/src/pages/Orders.jsx
git commit -m "feat(admin): implement Orders page with status management"
```

---

## Phase 5: Integration & Deployment

### Task 14: Build widget and test end-to-end

**Step 1: Build widget**

Run: `cd widget && npx vite build`
Expected: `widget/dist/configurator.js` created

**Step 2: Run all widget tests**

Run: `cd widget && npx vitest run`
Expected: All tests pass

**Step 3: Test widget locally**

- Update `widget/index.html` with real Supabase URL and anon key
- Run: `cd widget && npx vite`
- Open http://localhost:5173 in browser
- Verify: categories load, options filter by category, colors show for materials, price updates, order form submits

**Step 4: Commit final build**

```bash
git add -A
git commit -m "chore: verify widget build and tests pass"
```

---

### Task 15: Build admin and test

**Step 1: Build admin**

Run: `cd admin && npx vite build`
Expected: Successful build in `admin/dist/`

**Step 2: Test admin locally**

- Update `admin/.env` with real Supabase URL and anon key
- Run: `cd admin && npx vite`
- Open http://localhost:5174 in browser
- Verify: login works, all CRUD pages function, image upload works

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: verify admin build passes"
```

---

### Task 16: Deploy

**Step 1: Deploy admin to Vercel**

- Run: `cd admin && npx vercel` (or connect GitHub repo to Vercel)
- Set environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Framework: Vite, output: `dist`

**Step 2: Host widget JS**

Option A (Supabase Storage):
- Upload `widget/dist/configurator.js` to Supabase Storage `images` bucket (or a dedicated `scripts` bucket)
- Get public URL

Option B (CDN):
- Upload to any static hosting / CDN

**Step 3: Embed in Tilda**

Add a T123 HTML block in Tilda:

```html
<div id="merch-configurator">
  <merch-configurator
    supabase-url="https://xxxxx.supabase.co"
    supabase-key="your-anon-key"
  ></merch-configurator>
</div>
<script src="https://your-cdn.com/configurator.js"></script>
```

**Step 4: Final commit**

```bash
git add -A
git commit -m "docs: add deployment instructions"
```

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | 1-3 | Project setup, Supabase schema, seed data |
| 2 | 4-6 | Widget core: pricing engine, data fetching, state |
| 3 | 7 | Widget UI: Shadow DOM, styles, full configurator |
| 4 | 8-13 | Admin panel: auth, categories, sections, pricing, palettes, orders |
| 5 | 14-16 | Integration testing, build, deploy |
