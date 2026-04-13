# Knowledge Graph News App — MVP Plan

## Принятые решения

| Вопрос | Решение |
|--------|---------|
| Ввод статей | Только URL — система сама скачивает страницу и парсит |
| Заголовок | Берётся из `<title>` страницы |
| AI-бэкенд | LM Studio (OpenAI-совместимый API, `http://localhost:1234`) |
| Выбор модели | Динамически через `/v1/models`, пользователь выбирает в UI |
| Анализ | Запускается автоматически при добавлении статьи |
| Граф | Клик на узел → связанные статьи + фильтр по типу концепта |
| Список статей | Отдельный роут, удаление статьи → каскадное удаление осиротевших концептов |
| Страница статьи | Отдельный роут `/articles/:id` с полным текстом |
| Концепты | Сохраняются автоматически без подтверждения пользователя |
| Деплой | VPS/Linux, SSH-туннель до локального LM Studio |
| Аутентификация | Нет — персональный инструмент |

---

## Стек

```
Browser (React + Vite + Cytoscape.js + react-router-dom)
    │ HTTP  dev: :5173 → proxy /api → :3000
    ▼
Express :3000
    ├── /api/articles     CRUD + URL-fetch + Ollama analysis
    ├── /api/concepts     список + детали
    ├── /api/graph        узлы + рёбра для Cytoscape
    ├── /api/lm           список моделей + статус LM Studio
    └── SQLite  data/articles.db  (better-sqlite3, WAL mode)
         ▼
    LM Studio  http://localhost:1234  (OpenAI-compatible)
```

**Новые зависимости (добавить в `package.json`):**

```bash
npm install cheerio        # HTML-парсер (title + текст)
npm install react-router-dom cytoscape
```

Node 18+ встроенный `fetch` используется для загрузки URL и вызовов LM Studio — внешние HTTP-клиенты не нужны.

---

## Фаза 2 — REST API

### Новые файлы

```
server/
├── db/
│   ├── articles.js     # prepared statements для articles
│   └── concepts.js     # prepared statements + orphan cleanup
└── routes/
    ├── articles.js     # CRUD + URL-fetch + анализ
    ├── concepts.js     # GET /api/concepts, GET /api/concepts/:id
    ├── graph.js        # GET /api/graph
    └── lm.js           # GET /api/lm/models, GET /api/lm/status
```

Редактируемые файлы: `server.js` — подключить роутеры.

### Порядок работы

1. `server/db/articles.js` — prepared statements
2. `server/db/concepts.js` — включая orphan-cleanup
3. Роуты: articles → concepts → graph → lm
4. Подключить в `server.js`
5. Smoke-тест: `curl` по всем эндпоинтам

### API — спецификация

#### `POST /api/articles`

Принимает URL, скачивает страницу, парсит, анализирует, сохраняет.

**Тело запроса:**
```json
{ "url": "https://...", "modelId": "mistral-7b-instruct" }
```

**Поток обработки:**
```
fetch(url)
  → cheerio: title = $('title').text(), text = $('body').text().slice(0, 4000)
  → INSERT INTO articles (title, content, source, ...)
  → LM Studio /v1/chat/completions
  → extractJson(response)
  → upsert concepts + article_concepts
  → UPDATE articles SET summary, sentiment
  → вернуть полную статью с концептами
```

**Ответ `201`:**
```json
{
  "id": 1,
  "title": "Заголовок из <title>",
  "source": "https://...",
  "summary": "Краткое резюме",
  "sentiment": "positive",
  "concepts": [
    { "id": 1, "name": "LLM", "type": "concept" }
  ],
  "created_at": "2026-04-13T10:00:00Z"
}
```

**Ответ `503`** (LM Studio недоступен):
```json
{
  "id": 1,
  "analysis_skipped": true,
  "error": "lm_studio_unavailable",
  "message": "Статья сохранена без анализа"
}
```

**Ответ `422`** (страница не загружается):
```json
{ "error": "fetch_failed", "message": "Не удалось загрузить URL" }
```

---

#### `GET /api/articles?page=1&limit=20`

```json
{
  "data": [
    { "id": 1, "title": "...", "source": "...", "sentiment": "neutral", "summary": "...", "created_at": "..." }
  ],
  "total": 47, "page": 1, "limit": 20
}
```

#### `GET /api/articles/:id`

```json
{
  "id": 1, "title": "...", "content": "...", "source": "...",
  "summary": "...", "sentiment": "...", "created_at": "...",
  "concepts": [{ "id": 1, "name": "LLM", "type": "concept" }]
}
```

#### `DELETE /api/articles/:id`

```
1. DELETE FROM articles WHERE id = ?          → cascade → article_concepts
2. DELETE FROM concepts WHERE id NOT IN       → orphan cleanup
   (SELECT DISTINCT concept_id FROM article_concepts)
```

**Ответ `200`:**
```json
{ "deleted": 1, "orphanedConceptsRemoved": 3 }
```

#### `POST /api/articles/:id/analyze`

Повторный анализ (смена модели).

```json
// Запрос
{ "modelId": "llama-3.2" }
// Ответ — та же форма что GET /api/articles/:id
```

#### `GET /api/concepts?type=concept|tool|person|org`

```json
[
  { "id": 1, "name": "LLM", "type": "concept", "articleCount": 5 }
]
```

#### `GET /api/concepts/:id`

```json
{
  "id": 1, "name": "LLM", "type": "concept",
  "articles": [{ "id": 1, "title": "...", "source": "...", "created_at": "..." }]
}
```

#### `GET /api/graph?type=concept|tool|person|org`

```json
{
  "nodes": [
    { "data": { "id": "a-1", "label": "GPT-4 Overview", "type": "article", "sentiment": "positive" } },
    { "data": { "id": "c-1", "label": "LLM", "type": "concept", "articleCount": 5 } }
  ],
  "edges": [
    { "data": { "id": "e-1-1", "source": "a-1", "target": "c-1" } }
  ]
}
```

#### `GET /api/lm/models`

Прокси к LM Studio `/v1/models`. Кэш 60 сек.

```json
{ "models": [{ "id": "mistral-7b-instruct", "object": "model" }] }
```

#### `GET /api/lm/status`

```json
{ "online": true, "models": [...] }
// или
{ "online": false, "error": "Connection refused" }
```

---

## Фаза 3 — LM Studio интеграция

### Файлы

```
server/lm/
├── client.js     # HTTP-клиент + кэш моделей
└── analyzer.js   # buildPrompt() + extractJson()
```

### Конфигурация

```js
// server/lm/client.js
const LM_STUDIO_URL = process.env.LM_STUDIO_URL ?? 'http://localhost:1234';
const LM_TIMEOUT_MS = Number(process.env.LM_TIMEOUT_MS ?? 30_000);
```

### Промпт

```js
export function buildPrompt(title, text) {
  return [
    {
      role: 'system',
      content: 'You are a knowledge extraction assistant. Respond ONLY with valid JSON — no prose, no markdown fences.'
    },
    {
      role: 'user',
      content: `Extract from this article and return ONLY this JSON:
{
  "concepts": ["string"],
  "tools": ["string"],
  "persons": ["string"],
  "orgs": ["string"],
  "summary": "2-3 sentence summary in Russian",
  "sentiment": "positive" | "neutral" | "negative"
}

Title: ${title}
Text: ${text.slice(0, 4000)}`
    }
  ];
}
```

### Парсинг ответа (защита от prose-обёртки)

```js
export function extractJson(raw) {
  try { return JSON.parse(raw); } catch {}
  const match = raw.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch {} }
  throw new Error('Не удалось распарсить ответ LM Studio как JSON');
}
```

### URL-fetch + парсинг HTML

```js
// в server/routes/articles.js
import * as cheerio from 'cheerio';

async function fetchArticle(url) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(10_000),
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KGNewsBot/1.0)' }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);
  const title = $('title').text().trim() || url;
  // Удалить скрипты/стили, взять текст body
  $('script, style, nav, header, footer').remove();
  const text = $('body').text().replace(/\s+/g, ' ').trim();
  return { title, text };
}
```

---

## Фаза 4 — Frontend

### Установка

```bash
npm install cytoscape react-router-dom
```

### Структура компонентов

```
src/
├── main.jsx
├── App.jsx                    # HashRouter + NavBar + Routes + LmContext
├── api/
│   ├── articles.js            # fetch /api/articles
│   ├── concepts.js            # fetch /api/concepts, /api/graph
│   └── lm.js                  # fetch /api/lm/*
├── hooks/
│   ├── useArticles.js         # список + удаление + пагинация
│   ├── useLmModels.js         # список моделей + выбранная модель
│   └── useGraph.js            # данные графа + фильтр по типу
├── components/
│   ├── NavBar.jsx             # ссылки + LmStatusBadge
│   ├── LmStatusBadge.jsx      # онлайн/офлайн + dropdown моделей
│   ├── UrlForm.jsx            # одно поле URL + выбор модели + кнопка
│   ├── AnalysisResult.jsx     # резюме + тональность + чипы концептов
│   ├── ArticleList.jsx        # таблица + пагинация + удаление
│   ├── GraphView.jsx          # Cytoscape canvas + фильтр-бар
│   ├── GraphFilterBar.jsx     # Все / Концепт / Инструмент / Персона / Орг
│   └── NodeDetailPanel.jsx    # боковая панель при клике на узел
└── pages/
    ├── GraphPage.jsx          # / — основной экран
    ├── ArticleListPage.jsx    # /list
    ├── ArticleDetailPage.jsx  # /articles/:id — полный текст
    └── AddArticlePage.jsx     # /add — форма добавления
```

### Роутинг (`HashRouter`)

```
/           → GraphPage        (граф, фильтр, NodeDetailPanel)
/add        → AddArticlePage   (URL-форма + результат анализа)
/list       → ArticleListPage  (таблица статей, удаление)
/articles/:id → ArticleDetailPage (полный текст, концепты)
```

### Ключевые детали компонентов

**`LmStatusBadge`** — опрашивает `/api/lm/status` при маунте и каждые 30 сек. Зелёная/красная точка + выпадающий список моделей. Выбор хранится в `LmContext`.

**`UrlForm`** — одно поле URL, выбор модели из `LmContext`, кнопка «Загрузить и проанализировать». Во время запроса — спиннер «Загружаем страницу... / Анализируем...». При `analysis_skipped: true` — предупреждение.

**`GraphView`** — Cytoscape инициализируется через `useRef` + `useEffect`. При смене фильтра перезапрашивает `/api/graph?type=...` и перерисовывает. Цветовая схема узлов:

| Тип | Форма | Цвет |
|-----|-------|------|
| article | rectangle | `#1E4A7F` |
| concept | ellipse | `#7C3AED` |
| tool | ellipse | `#065F46` |
| person | ellipse | `#92400E` |
| org | rectangle | `#374151` |

**`NodeDetailPanel`** — абсолютно позиционированная панель справа (320px). Клик на статью → заголовок, источник, резюме, тональность, концепты. Клик на концепт → название, тип, список статей с ссылками.

**`ArticleList`** — таблица: Заголовок / Источник / Тональность / Дата / Удалить. Удаление — `window.confirm` → `DELETE /api/articles/:id` → обновить список. Пагинация через query params.

---

## Фаза 5 — Деплой

### Переменные окружения

```bash
# .env (не коммитить, есть в .gitignore)
PORT=3000
NODE_ENV=production
LM_STUDIO_URL=http://localhost:1234
LM_TIMEOUT_MS=30000
```

Создать `.env.example` с теми же ключами без значений.

### LM Studio на VPS — SSH-туннель

На сервере создать постоянный туннель от VPS до локальной машины разработчика:

```bash
# На VPS: пробросить удалённый порт 1234 → локальный LM Studio
ssh -N -R 1234:localhost:1234 user@vps-ip
```

Или в `~/.ssh/config` на VPS для автоматического реконнекта через `autossh`:

```bash
autossh -M 0 -N -R 1234:localhost:1234 user@vps-ip
```

`LM_STUDIO_URL=http://localhost:1234` — сервер не замечает разницы между локальным и туннельным LM Studio.

### PM2

```bash
npm run build
npm install -g pm2
pm2 start ecosystem.config.cjs --env production
pm2 save && pm2 startup
```

**`ecosystem.config.cjs`:**
```js
module.exports = {
  apps: [{
    name: 'kg-news',
    script: './server.js',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      LM_STUDIO_URL: 'http://localhost:1234',
      LM_TIMEOUT_MS: '30000'
    }
  }]
};
```

### Nginx

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_read_timeout 60s;  # LM Studio может отвечать 20-30 сек
    }
}
```

---

## Порядок реализации

```
Фаза 2 — API
  server/db/articles.js
  server/db/concepts.js
  server/routes/articles.js   (CRUD без анализа)
  server/routes/concepts.js
  server/routes/graph.js
  server.js                   (подключить роутеры)
  → smoke-test curl

Фаза 3 — LM Studio
  npm install cheerio
  server/lm/client.js
  server/lm/analyzer.js
  server/routes/lm.js
  server/routes/articles.js   (добавить URL-fetch + анализ)
  → smoke-test: POST /api/articles с реальным URL

Фаза 4 — Frontend
  npm install cytoscape react-router-dom
  src/api/*.js
  src/hooks/*.js
  src/components/NavBar + LmStatusBadge
  src/components/UrlForm + AnalysisResult
  src/components/ArticleList
  src/components/GraphView + GraphFilterBar + NodeDetailPanel
  src/pages/*.jsx
  src/App.jsx   (заменить плейсхолдер)
  → интеграционный тест: добавить статью по URL → граф → клик → удалить

Фаза 5 — Деплой
  .env.example
  ecosystem.config.cjs
  npm run build && npm start
  → проверить на сервере
```

---

## Риски

| # | Риск | Митигация |
|---|------|-----------|
| 1 | Сайт блокирует парсинг (403, CAPTCHA) | Вернуть `422 fetch_failed`, показать сообщение в UI |
| 2 | LM Studio возвращает prose вместо JSON | `extractJson()` regex-фоллбэк + флаг `analysis_skipped` |
| 3 | Длинная страница переполняет контекст модели | Обрезать текст до 4000 символов до передачи |
| 4 | SSH-туннель обрывается на VPS | `autossh` для автореконнекта; UI покажет «LM Studio офлайн» |
| 5 | Cytoscape тормозит при 200+ узлах | Для MVP приемлемо; после MVP — `cose-bilkent` layout |
| 6 | Очистка осиротевших концептов медленная | `NOT IN (SELECT ...)` — нормально до ~10k строк |
