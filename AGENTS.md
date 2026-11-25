# AGENTS.md — Правила работы с проектом `undexeror // archive`

Этот файл задаёт строгие обязательные правила для всех изменений в репозитории личного аниме-архива `undexeror // archive` (`https://undexerorrr.github.io/`). Нарушать их нельзя без прямого разрешения владельца.

---

## 1. Архитектура и структура проекта

- Статический сайт для GitHub Pages без сборщика и транспиляции:
  - `index.html` — разметка, мета-теги (`viewport-fit=cover`), шрифты Google Fonts и подключение ресурсов с версионированием.
  - `assets/css/archive.css` — единая таблица стилей (токены `:root` в начале файла, единая система модалок, `content-visibility`, capability- и responsive-медиазапросы в конце); `assets/css/giscus-noir.css` — кастомная нуар-тема для iframe Giscus.
  - `assets/js/main.js` + `assets/js/modules/` — модульная ES-архитектура без сборщика (`config.js`, `data.js`, `sectors.js`, `shikimori.js`, `music.js`, `weather.js`, `galaxy.js`, `coop.js`, `trophies.js`, `cinema.js`, `guestbook.js`, `palette.js`, `ui.js`), где `main.js` выступает точкой входа и задаёт порядок инициализации (с ранним запуском `initSectors()` до модулей рендера/ленивой загрузки), а `data.js` хранит общее состояние `appState`, локальные снапшоты (`SNAPSHOT`, `PEAK_FICTION`, `WAIFU_LIST`, `LITERALLY_ME`, `PLAYLIST`) и `localStorage`-кэши; сетевые интеграции — Shikimori, AniList GraphQL, Lanyard, Open-Meteo, Spotify Embed/oEmbed, Giscus / GitHub Discussions (ленивая загрузка) и локальный `assets/js/vendor/three.min.js` для 3D-Галактики (`Galaxy 2.0`: кастомные GLSL-шейдеры звёзд, пыли и созвездий `starMat`/`dustMat`/`linkMat`/`highlightMat`, интерактивная «Машина времени» с осями `updatedAt`/`year`, скраббингом и импульсами `aReveal`/`aFlash`, плюс zero-alloc спектр Web Audio через `player.sampleSpectrum(now)` из `music.js`).
  - `assets/data/snapshot.json` + `scripts/sync-snapshot.mjs` + `.github/workflows/sync-snapshot.yml` — система ежедневного авто-снапшота данных Shikimori + AniList (чистый Node.js 20+, 0 внешних зависимостей; запуск по `schedule` в `03:15 UTC` и `workflow_dispatch` с защитой от порчи данных и проверкой диффа). При старте сайта `bootstrapShikimoriSync()` мгновенно гидрирует все блоки и HD-обложки (`dnaMeta.covers`) из `assets/data/snapshot.json`, после чего тихо запускает фоновый `syncShikimoriLive()` (при недоступности API сохраняется статус `SNAPSHOT`).
- Сохранять существующий порядок CSS-каскада, ключи `localStorage` и работу в оффлайн/fallback-режиме (через `SNAPSHOT`, `assets/data/snapshot.json` и `fetchWithTimeout`).

---

## 2. Визуальная система: холодный нуар-монохром

- **Палитра**: строго холодный нуар-монохром вокруг `--bg-base: #07090d` и холодных серо-стальных оттенков (`--white`, `--light`, `--muted`, `--bright`, `--accent-dark`).
  - Допускаются только уже принятые в проекте точечные семантические акценты (изумрудный `#6ee7b7` для LIVE / Co-op / «Выше толпы» / «Смотрю», приглушённый красный `#f87171` / `#fca5a5` для конфликтов и «Ниже толпы»). Никаких тёплых, кислотных или случайных ярких тем.
- **Типографика** — использовать исключительно три подключённых в `index.html` семейства через CSS-переменные:
  - `--font-display`: `Unbounded` (500, 600, 700) — заголовки секций, никнейм, крупные hero-цифры.
  - `--font-mono`: `JetBrains Mono` (400, 500, 600) — бейджи, кикеры, навигация, счётчики, HUD и метаданные.
  - `--font-sans`: `Inter` (400, 500, 600, 700) — основной текст, описания, заметки.
  - Не подключать сторонние шрифты и не задавать произвольные `font-family` в обход `--font-*`.

---

## 3. Матовые обсидиановые поверхности и запрет `backdrop-filter`

- **Строгий запрет на `backdrop-filter` и `-webkit-backdrop-filter`**: в `assets/css/archive.css` их должно быть **ноль**.
- Вместо тяжёлого blur использовать матовые обсидиановые поверхности (`--surface-*`), внутренний верхний блик (`--edge-specular`, `--edge-specular-hover`) и многослойные тени (`--shadow-card`, `--shadow-card-hover`, `--shadow-floating`, `--modal-shadow`).

---

## 4. Только токены `:root`

Для поверхностей, границ, слоёв и модальных окон обязательно использовать централизованные переменные из `:root` в `assets/css/archive.css` — не хардкодить дублирующие цвета, радиусы и произвольные `z-index`:

- **Поверхности (`--surface-*`)**: `--surface-1`, `--surface-2`, `--surface-3`, `--surface-modal`, `--surface-overlay` (и алиас `--glass-bg`).
- **Границы и глубина (`--border-*`)**: `--border-subtle`, `--border-default`, `--border-strong` (и алиас `--glass-border`), `--edge-specular`, `--edge-specular-hover`, `--shadow-card`, `--shadow-card-hover`, `--shadow-floating`.
- **Слои (`--z-*`)**: только централизованная шкала:
  - `--z-bg` (0), `--z-canvas` (1), `--z-shell` (2), `--z-grain` (50), `--z-topbar` (100), `--z-hud` (315), `--z-dock` (320), `--z-mobile-music` (455), `--z-mobile-dock` (460), `--z-modal` (500), `--z-arena` (560), `--z-coop` (570), `--z-galaxy` (580), `--z-spotify-bg` (600), `--z-spotify` (610), `--z-trophy` (640), `--z-pack` (645), `--z-holo` (650), `--z-holo-close` (660), `--z-palette` (670), `--z-intro` (9999).
  - Если добавляется новый слой, его уровень сначала заводится токеном `--z-*` в `:root`.
- **Единая система модалок (`--modal-*`)**: `--modal-radius`, `--modal-border`, `--modal-backdrop`, `--modal-backdrop-deep`, `--modal-shadow`, `--modal-ease`.
- **Динамические runtime-токены**: `--beat-energy`, `--scrollbar-comp` (компенсация скроллбара через `initModalScrollLock()`).

---

## 5. Мобильный адаптив от `360px` (`100dvh`, `safe-area`)

- Интерфейс обязан корректно работать на ширине от **`360px`** без горизонтального переполнения (`overflow-x: hidden; overflow-x: clip;` на `body`, `minmax(0, 1fr)` в CSS Grid, `min-width: 0` у сжимаемых flex-элементов).
- **Динамическая высота вьюпорта**: для полноэкранных оверлеев, модалок, bottom-sheet и drawer обязательно использовать `dvh` (`100dvh`, `calc(100dvh - 32px)`, `calc(92dvh - env(safe-area-inset-top, 0px))`, `min(82dvh, 620px)`) с fallback на `vh` перед строкой с `dvh`.
- **Safe-area**: учитывать `env(safe-area-inset-top, 0px)`, `env(safe-area-inset-bottom, 0px)` и `env(safe-area-inset-right, 0px)` для фиксированного нижнего дока (`.mobile-dock`), музыкальной панели, кнопок закрытия, оверлеев, модалок и нижних отступов `.container` / `.footer`.
- **Touch и UX**:
  - На экранах `<= 720px` сохранять `font-size: 16px` для текстовых полей ввода (исключает автозум в iOS Safari).
  - На `<= 480px` соблюдать эргономичные тач-цели (`40–48px` для основных кнопок и контролов).
  - Hover-эффекты, кастомный курсор и 3D-tilt ограничивать `@media (hover: hover) and (pointer: fine)` / `@media (any-hover: hover) and (any-pointer: fine)`; для тач-устройств поддерживать `@media (hover: none), (pointer: coarse)`.
  - Поддерживать `@media (prefers-reduced-motion: reduce)` в CSS и `appState.prefersReducedMotion` в JS, но **никогда не блокировать фоновые частицы погоды (`initAtmosphereCanvas` / `#atmosphere-canvas`) через `prefers-reduced-motion`**.

---

## 6. Производительность и чистота кода

- **Никаких постоянных `will-change`**:
  - Запрещено вешать `will-change` на статичные или неактивные элементы (карточки, сетки, фоны, доки).
  - `will-change: transform` допустим **только** в кратковременных активных состояниях взаимодействия или открытых 3D/drag-оверлеях (например, `.is-tilting`, `.is-open` на активной 3D-сцене/карте, как это сделано в `assets/css/archive.css`).
- **Никаких `console.*` в `assets/js/main.js` и `assets/js/modules/*.js`**:
  - Запрещены `console.log`, `console.warn`, `console.error`, `console.info`, `console.debug` и любые другие вызовы `console.*` в продакшен-коде. Ошибки обрабатывать через fallback-данные и аккуратные UI-статусы.
- Сохранять offscreen-оптимизацию (`content-visibility: auto` + `contain-intrinsic-size` для секций ниже первого экрана), единую блокировку скролла (`initModalScrollLock()`) и локализованные переходы между 4 отсеками `Archive OS` через `document.startViewTransition()` (класс `is-sector-transitioning` / `view-transition-name: sector-stage` снимается в `transition.finished.finally(...)`).

---

## 7. Защищённые файлы и кэш-бастинг

- **Не трогать ни при каких обстоятельствах**:
  - `.git/` (внутренние файлы репозитория)
  - `bg.jpg` (фоновый арт)
  - `music/` (локальные аудиофайлы плейлиста и саму папку)
- **Обязательный кэш-бастинг `?v=...` в `index.html`**:
  - После **любого** изменения `assets/css/archive.css`, `assets/js/main.js` или модулей `assets/js/modules/*.js` обязательно увеличивать числовой параметр `?v=...` в `index.html`:
    - `<link rel="stylesheet" href="./assets/css/archive.css?v=..." />`
    - `<script type="module" src="./assets/js/main.js?v=..."></script>`
  - Текущие ссылки в `index.html` должны оставаться синхронизированы с актуальной версией (повышать номер при правках CSS/JS; при правке только документации/мета-файлов не менять).

---

## 8. Git и публикация

- **Никогда не пушить в `main`** (`git push`, `git push origin main`, force-push и т.п.) без явного подтверждения пользователя в текущем запросе.
- Не выполнять деструктивные git-операции (`reset --hard`, `clean -fd`, `checkout -- .` и т.п.) без прямого указания.
- Перед сдачей изменений проверять `git status` и `git diff`, чтобы убедиться, что затронуты только целевые файлы, не появилось `backdrop-filter`, постоянных `will-change` или вызовов `console.*`.
