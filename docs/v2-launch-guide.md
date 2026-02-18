# Merch Configurator v2 — запуск

## 1. Применить миграцию в Supabase

Открой [Supabase Dashboard](https://supabase.com/dashboard) → SQL Editor и выполни по очереди:

```
-- Сначала миграция (создаёт новые таблицы, удаляет старые)
supabase/migrations/002_v2_schema.sql

-- Потом сид-данные
supabase/seed.sql
```

Проверь что таблицы появились: `fits`, `materials`, `product_variants`, `print_methods`, `quantity_tiers`, `color_palettes`.

## 2. Настроить .env для виджета

```bash
cp widget/.env.example widget/.env
```

Вписать свои `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY` (те же, что в `admin/.env`).

## 3. Запуск

```bash
# Виджет (dev-сервер на :5173)
cd widget && npm run dev

# Админка (dev-сервер на :5174)
cd admin && npm run dev
```

## 4. Проверка

- **Виджет:** выбери категорию → фасон → материал → должна считаться цена
- **Админка:** проверь все страницы в навигации — Фасоны, Материалы, Цены (матрица), Нанесение, Множители, Палитры, Заявки
