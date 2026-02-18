# Интеграция виджета в Tilda + варианты хостинга

Этот гайд написан с нуля: как показать конфигуратор в Tilda, как проверить 2 варианта встраивания, и можно ли держать админку на Supabase.

---

## 0) Что нужно заранее

- Доступ к проекту Supabase (URL + anon key)
- Локально установлен Node.js и npm
- Доступ к Tilda

Переменные:
- `SUPABASE_URL` = `https://<project-ref>.supabase.co`
- `SUPABASE_ANON_KEY` = публичный anon key проекта

---

## 1) Подготовить виджет

В терминале:

```bash
cd widget
npm install
npm run build
```

После сборки должен появиться файл:
- `widget/dist/configurator.js`

---

## 2) Вариант A (рекомендуемый): хостинг `configurator.js` в Supabase Storage

### 2.1 Создать bucket для ассетов

В Supabase:
1. `Storage` -> `Create bucket`
2. Название: `widget-assets`
3. Включить `Public bucket`
4. Создать bucket

### 2.2 Загрузить файл

1. Открыть bucket `widget-assets`
2. Нажать `Upload`
3. Выбрать `widget/dist/configurator.js`
4. Скопировать `Public URL` файла

Ссылка будет вида:
`https://<project-ref>.supabase.co/storage/v1/object/public/widget-assets/configurator.js`

---

## 3) Tilda с нуля: как вставить виджет

### 3.1 Создать сайт и страницу

1. Войти в Tilda
2. Нажать `Создать новый сайт`
3. Внутри сайта: `Создать страницу`
4. Имя страницы: например `Configurator Test`

### 3.2 Добавить HTML-блок

1. Нажать `+ Добавить блок`
2. Найти блок `T123` (HTML-код)
3. Добавить его на страницу
4. Нажать у блока `Контент`

### 3.3 Вставить код виджета (URL-версия)

В `T123` вставить:

```html
<div style="width:100%;max-width:1200px;margin:0 auto;padding:20px 0;">
  <merch-configurator
    supabase-url="https://YOUR_PROJECT.supabase.co"
    supabase-key="YOUR_SUPABASE_ANON_KEY">
  </merch-configurator>
</div>

<script src="https://YOUR_PROJECT.supabase.co/storage/v1/object/public/widget-assets/configurator.js?v=1" defer></script>
```

Подставить:
- `YOUR_PROJECT` (ваш project ref)
- `YOUR_SUPABASE_ANON_KEY` (ваш anon key)

### 3.4 Опубликовать и проверить

1. Нажать `Опубликовать` страницу
2. Открыть опубликованный URL
3. Проверить:
   - грузятся категории
   - работает выбор фасон/материал
   - пересчитывается цена
   - отправляется заявка

### 3.5 Когда обновляете виджет

1. Пересобираете: `npm run build`
2. Перезаливаете новый `configurator.js`
3. Меняете версию в URL, например `?v=2` (чтобы сбросить кэш)

---

## 4) Вариант B: "одним куском" (inline snippet)

Подходит для быстрого демо, но хуже для продакшна.

### 4.1 Сгенерировать inline snippet

Из корня проекта:

```bash
node -e "
const fs = require('fs');
let js = fs.readFileSync('widget/dist/configurator.js','utf8')
  .replace(/<\\/script>/gi, '<\\\\/script>')
  .replace(
    'customElements.define(\"merch-configurator\",Ii)',
    'customElements.get(\"merch-configurator\")||customElements.define(\"merch-configurator\",Ii)'
  );

const html = `
<div style='width:100%;max-width:1200px;margin:0 auto;padding:20px 0;'>
  <merch-configurator
    supabase-url='https://YOUR_PROJECT.supabase.co'
    supabase-key='YOUR_SUPABASE_ANON_KEY'>
  </merch-configurator>
</div>
<script>${js}</script>
`.trim();

fs.writeFileSync('widget/dist/tilda-inline-snippet.html', html);
console.log('Done: widget/dist/tilda-inline-snippet.html');
"
```

### 4.2 Вставить в Tilda

1. Создать отдельную тестовую страницу (например `Configurator Inline Test`)
2. Добавить `T123`
3. Открыть `widget/dist/tilda-inline-snippet.html`
4. Скопировать весь файл и вставить в `T123`
5. Опубликовать страницу и проверить

---

## 5) Что выбрать

- Для продакшна: **Вариант A (хостинг js + ссылка)**
- Для быстрого теста: **Вариант B (inline)**

Почему A лучше:
- проще обновлять
- стабильнее в Tilda
- меньше риск, что Tilda обрежет большой inline-код

---

## 6) Можно ли хостить админку на Supabase?

Короткий ответ: **да, можно, но есть ограничения**.

### 6.1 Что важно про текущую админку

Админка — это React SPA с роутингом (`BrowserRouter`), поэтому для статического хостинга нужен fallback всех путей на `index.html`.

В Supabase Storage "из коробки" нет удобного SPA-rewrite как у Vercel/Netlify. Из-за этого:
- `.../index.html` откроется
- но прямой переход на `.../pricing` может не открыться без доп. настройки

### 6.2 Если все же хостить в Supabase Storage

1. Собрать админку:

```bash
cd admin
npm install
npm run build
```

2. Создать public bucket, например `admin-panel`
3. Залить содержимое `admin/dist` в bucket
4. Открывать по URL `.../admin-panel/index.html`

Ограничение:
- глубокие ссылки могут ломаться из-за отсутствия rewrite.

### 6.3 Рекомендуемый вариант для админки

Для админки лучше:
- **Vercel** или **Netlify** (там SPA fallback решается штатно)
- Supabase используется как backend (Auth/DB/Storage)

---

## 7) Чеклист проблем и быстрые решения

- Ошибка `Missing Supabase config`:
  - проверить `supabase-url` и `supabase-key` в HTML

- Виджет не рендерится:
  - открыть URL `configurator.js` напрямую в браузере
  - проверить, что файл публичный

- Загружается старая версия:
  - сменить `?v=1` на `?v=2`

- `new row violates row-level security policy` при загрузке файлов:
  - применить SQL из `supabase/migrations/004_storage_images_policies.sql`

---

## 8) Минимальный рабочий шаблон для Tilda

```html
<div style="width:100%;max-width:1200px;margin:0 auto;padding:20px 0;">
  <merch-configurator
    supabase-url="https://YOUR_PROJECT.supabase.co"
    supabase-key="YOUR_SUPABASE_ANON_KEY">
  </merch-configurator>
</div>
<script src="https://YOUR_PROJECT.supabase.co/storage/v1/object/public/widget-assets/configurator.js?v=1" defer></script>
```

