# Merch Configurator Design

## Overview

JS widget configurator for merch products, embedded into an existing Tilda website. Includes an admin panel for managing products, options, pricing, and color palettes.

## Architecture

Three components:

### 1. Widget (Configurator)
- Vanilla JS + Vite, bundled into a single `configurator.js`
- Embedded in Tilda via T123 HTML block: `<div id="merch-configurator"></div>` + `<script>`
- Shadow DOM for style isolation from Tilda
- Fetches data from Supabase on load (categories, options, prices, palettes)

### 2. Admin Panel
- React + Vite + Tailwind CSS
- Deployed on Vercel
- Supabase Auth (email/password), 1-2 admins
- Manages: categories, sections, options, pricing rules, color palettes, orders

### 3. Backend (Supabase)
- PostgreSQL database with auto-generated REST API
- Supabase Storage for images (product photos, color swatches)
- Supabase Auth for admin authentication
- Free tier sufficient for this use case

## Database Schema

### categories
- `id` (serial PK)
- `name` (text) -- e.g. "Футболки", "Худи"
- `image_url` (text, nullable)
- `sort_order` (int)
- `is_active` (boolean, default true)

### sections
- `id` (serial PK)
- `name` (text) -- e.g. "Фасон", "Материал", "Нанесение спереди"
- `slug` (text, unique)
- `sort_order` (int)
- `is_active` (boolean, default true)
- `depends_on_category` (boolean) -- whether options change based on selected category

### options
- `id` (serial PK)
- `section_id` (FK -> sections)
- `name` (text) -- e.g. "кулирка 200г (92 хлопок / 8 полиэстер)"
- `description` (text, nullable)
- `image_url` (text, nullable)
- `sort_order` (int)
- `is_active` (boolean, default true)
- `available_for_categories` (int[]) -- which categories this option is available for

### pricing_rules
- `id` (serial PK)
- `category_id` (FK -> categories, nullable)
- `option_id` (FK -> options, nullable)
- `base_price` (numeric)
- `price_type` (text: 'fixed' | 'per_unit' | 'tiered')
- `tiers` (jsonb, nullable) -- [{min_qty, max_qty, price}]

### color_palettes
- `id` (serial PK)
- `material_option_id` (FK -> options) -- links to a material option
- `color_name` (text)
- `hex_code` (text)
- `swatch_image_url` (text, nullable)
- `sort_order` (int)
- `is_active` (boolean, default true)

### orders
- `id` (serial PK)
- `created_at` (timestamptz)
- `customer_name` (text)
- `customer_contact` (text) -- phone or email
- `configuration` (jsonb) -- full selected configuration
- `quantity` (int)
- `calculated_price` (numeric)
- `status` (text, default 'new')

## Widget UX

### Desktop Layout (two-column)
- **Left column (~45%):** Large product image. Updates when category or color changes.
- **Right column (~55%):** Scrollable configuration sections. Sticky footer with price and submit button.

### Configuration Sections (in order)
1. **Изделие** -- Product type cards with images (Футболки, Худи, etc.)
2. **Фасон** -- Fit type buttons (Фит, Оверсайз)
3. **Материал** -- Material cards, filtered by selected category
4. **Цвет материала** -- Color swatches (circles), filtered by selected material
5. **Нанесение спереди** -- Print method buttons
6. **Нанесение сзади** -- Print method buttons
7. **Кастомизация** -- Checkboxes (Варка, Дистресс, Лейблы, Упаковка)

### Price Display
- Quantity input field
- Price per unit (updates in real-time)
- Total price (quantity x unit price)
- Tiered pricing based on quantity thresholds

### Order Flow
- "Оставить заявку" button opens a modal with form: name, phone/email, comment
- On submit: saves to Supabase `orders` table
- Confirmation message shown to user

### Mobile Layout
- Image on top (compact/fixed)
- Configuration sections stacked vertically below
- Sticky footer with price and button
- Cards 2 per row

## Styling

### Colors
- Primary: `#FF5100` (orange)
- Background: `#1A1A1A` (dark)
- Card background: `#2A2A2A`
- Text primary: `#FFFFFF`
- Text secondary: `#999999`
- Hover accent: `#FF6B2B`
- Selected: `#FF5100` border

### Design Tokens
- Card border-radius: 12px
- Button border-radius: 8px
- Flat design, no shadows
- Selected options: 2px orange border
- Color swatches: 32px circles, white border on selection
- Font: system font stack

### Shadow DOM
All widget styles encapsulated in Shadow DOM to prevent conflicts with Tilda.

## Admin Panel Pages

1. **Categories** -- CRUD, image upload, drag-and-drop sorting, enable/disable
2. **Sections & Options** -- Manage configurator sections and their options, set category availability
3. **Pricing** -- Price table per category+option combo, tiered pricing editor
4. **Color Palettes** -- Link palettes to materials, upload swatches, set hex/name
5. **Orders** -- List of submitted orders with configs, statuses, contacts. Filter by date/status

## Tech Stack Summary

| Component | Stack |
|-----------|-------|
| Widget | Vanilla JS, Vite, Shadow DOM |
| Admin | React, Vite, Tailwind CSS |
| Backend | Supabase (PostgreSQL, Auth, Storage, REST API) |
| Widget hosting | CDN / Supabase Storage |
| Admin hosting | Vercel |
