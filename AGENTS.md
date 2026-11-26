# AGENTS.md — Правила работы с проектом `undexeror // archive`

Этот файл задаёт строгие обязательные правила для всех изменений в репозитории личного аниме-архива `undexeror // archive` (`https://undexerorrr.github.io/`). Нарушать их нельзя без прямого разрешения владельца.

---

## 1. Архитектура и структура проекта

- Статический сайт для GitHub Pages без сборщика и транспиляции (**релиз v41 Obsidian Edition** — завершены Спринты 1–3: Obsidian Noir во всех 4 секторах Archive OS, встроенная погода `53.9° N` в `01 // DOSSIER`, свёрнутый по умолчанию `#music-dock`, журнальный `Showcase 2.0` в `02 // VAULT`, `ARENA Featured Stage` в `03 // ARENA`, `SIGNAL Listening Room` в `04 // SIGNAL` и Performance First стабилизация 60–144 Гц):
  - `index.html` — разметка, мета-теги (`viewport-fit=cover`), шрифты Google Fonts и подключение ресурсов с версионированием (`?v=41`).
  - `assets/css/` — 7 логических таблиц стилей, подключаемых в `index.html` строго в порядке каскада `1 → 7` (без CSS `@import`):
    1. `assets/css/tokens.css` — `:root` переменные, сбросы, шрифты, скроллбар, базовый фон, `#atmosphere-canvas`, `.film-grain`.
    2. `assets/css/layout.css` — `.topbar`, `.os-nav-cluster`, `.sector-telemetry`, `.sector-masthead`, `.sector-stage`, View Transitions, свёрнутый по умолчанию `.music-dock`, встроенный `.weather-hud` (`53.9° N`), `.mobile-dock`, `.footer`, `.intro-overlay`.
    3. `assets/css/sections.css` — стили всех 4 секторов Archive OS (асимметричный Editorial Bento, интегрированный Discord/Lanyard, Аниме-ДНК на 1px-разделителях, Сейчас смотрю, История/График, Коллекция + Showcase 2.0, WAIFU, матрица Трофеев, ARENA Featured Stage, База/Кооп, Hot Takes, SIGNAL Listening Room & Signal Hub, Гостевая) и `content-visibility`.
    4. `assets/css/overlays.css` — полноэкранные режимы и модалки (3D-Галактика + Time Machine, 3D-Голокарты, Бустер-пак, Турнир 1v1, Кооп-свайп, Трофей-инспектор, Spotify Drawer, Cinema Mode, Command Palette ⌘K, скрытый Performance HUD `?perf=1`, единая система модалок).
    5. `assets/css/vinyl.css` — витрина `VINYL // AUDIO` (12 LP в отсеке `04 // SIGNAL`, выезжающая вращающаяся пластинка, полоса прогресса 30с-превью и адаптив).
    6. `assets/css/editorial-bw.css` — финальный слой Obsidian Noir (перебивающие правила обсидиановой палитры, 3-уровневый контраст матовых поверхностей, инверты активных состояний `#F3F4F6` / `#08090B`, цветной hover постеров).
    7. `assets/css/responsive.css` — все capability-запросы (`hover`/`pointer`), `@media`-брейкпоинты строго по убыванию ширин (`1280/1160/1080/860/720/480/420px`) и `prefers-reduced-motion`.
    - Дополнительно: `assets/css/giscus-noir.css` — кастомная Obsidian Noir тема для iframe Giscus (`#08090B` / `#111318` / `#15181E` / `#C5CBD5`, монохромная кнопка авторизации `#F3F4F6` / `#08090B`).
  - `assets/js/main.js` + `assets/js/modules/` — модульная ES-архитектура без сборщика (16 JS-модулей: `main.js` + `config.js`, `data.js`, `sectors.js`, `shikimori.js`, `music.js`, `weather.js`, `galaxy.js`, `coop.js`, `trophies.js`, `cinema.js`, `vinyl.js`, `guestbook.js`, `palette.js`, `ui.js` и динамически подгружаемый строго по `?perf=1` модуль `perf.js`), где `main.js` выступает точкой входа и задаёт порядок инициализации (с ранним запуском `initSectors()` до модулей рендера/ленивой загрузки), а `data.js` хранит общее состояние `appState` (включая `perfState`), локальные снапшоты (`SNAPSHOT`, `PEAK_FICTION`, `WAIFU_LIST`, `LITERALLY_ME`, `PLAYLIST`) и `localStorage`-кэши; сетевые интеграции — Shikimori, AniList GraphQL, Lanyard, Open-Meteo, ленивый Spotify Embed/oEmbed, iTunes Search API (ленивая очередь для `vinyl.js` с 7-дневным кэшем и 30с превью), Giscus / GitHub Discussions (ленивая загрузка) и локальный `assets/js/vendor/three.min.js` для 3D-Галактики (`Galaxy 2.0`: кастомные GLSL-шейдеры звёзд, пыли и созвездий `starMat`/`dustMat`/`linkMat`/`highlightMat`, интерактивная «Машина времени» с осями `updatedAt`/`year`, скраббингом и импульсами `aReveal`/`aFlash`, плюс zero-alloc спектр Web Audio через `player.sampleSpectrum(now)` из `music.js`).
  - `assets/data/snapshot.json` + `scripts/sync-snapshot.mjs` + `.github/workflows/sync-snapshot.yml` — система ежедневного авто-снапшота данных Shikimori + AniList (чистый Node.js 20+, 0 внешних зависимостей; запуск по `schedule` в `03:15 UTC` и `workflow_dispatch` с защитой от порчи данных и проверкой диффа). При старте сайта `bootstrapShikimoriSync()` мгновенно гидрирует все блоки и HD-обложки (`dnaMeta.covers`) из `assets/data/snapshot.json`, после чего тихо запускает фоновый `syncShikimoriLive()` (при недоступности API сохраняется статус `SNAPSHOT`).
- Сохранять существующий порядок CSS-каскада, ключи `localStorage` и работу в оффлайн/fallback-режиме (через `SNAPSHOT`, `assets/data/snapshot.json` и `fetchWithTimeout`).

---

## 2. Визуальная система: Obsidian Noir (Editorial Noir · Cinematic Interface · Zero Clutter)

- **Палитра**: холодный обсидиановый монохром с графитово-стальным подтоном (**Obsidian Noir**):
  - **Поверхности**:
    - Void Black (`--bg-base: #08090B`) — базовый фон страницы.
    - Obsidian L1 (`--surface-1: #111318`) — крупные архитектурные плиты.
    - Obsidian L2 (`--surface-2: #15181E`) — приподнятые поверхности и состояние hover.
    - Obsidian L3 (`--surface-3: #1C2029`) — интерактивные контролы и кнопки.
  - **Типографика по тону**:
    - Ivory (`--text-ivory: #F3F4F6`, `--bright: 243, 244, 246`) — основной текст, заголовки, ключевые цифры.
    - Silver (`--text-silver: #C5CBD5`, `--light: 197, 203, 213`) — вторичный текст и описания.
    - Steel (`--text-steel: #777F8D`, `--muted: 119, 127, 141`) — телеметрия, метаданные, технические подписи.
    - Dim (`--text-dim: #4B5260`, `--dim: 75, 82, 96`) — служебные индексы и разделители.
  - **Линии и студийный блик**: тонкие архитектурные hairline-границы `--border-subtle: rgba(197, 203, 213, 0.08)` по умолчанию, `--border-default: rgba(197, 203, 213, 0.12)` на контролах, `--border-strong: rgba(197, 203, 213, 0.18)` на акцентах/hover и верхний студийный блик `--edge-specular: inset 0 1px 0 rgba(243, 244, 246, 0.06)`.
  - **0 цветных акцентов в UI**: запрещены мятный (`#6ee7b7`), циан, синий, зелёный, фиолетовый/лавандовый, янтарный, красный и любые яркие цветные акценты в шапке, табах, кнопках, статус-точках, прогресс-барах, эквалайзере, PNG-карточках и 3D-Галактике.
  - **Единственный цвет на сайте** — сами постеры и обложки контента (лёгкое приглушение в покое → 100% чистый цвет при наведении/фокусе).
  - **Монохромные статусы**: активный LIVE/онлайн — `#F3F4F6`; снапшот/неактивно — `#777F8D` / `#4B5260` или полый `1px` контур; `STALE` — контрастная пунктирная рамка `1px dashed #F3F4F6` без цвета.
  - **Активные состояния**: чёткий обсидианово-айвори инверт (`background: #F3F4F6; color: #08090B; border-color: #F3F4F6;`) либо строгая `1px` рамка `rgba(197, 203, 213, 0.18)`.
- **Строгая геометрия (без pill-капсул и glow)**:
  - **Запрет на `border-radius: 999px`** для кнопок, табов, фильтров, чипов, инпутов и бейджей — использовать строгую геометрию (`2px–3px` для кнопок, бейджей и инпутов; `4px–6px` для карточек, контейнеров и модалок; `50%` допускается только для круглых аватаров и статус-точек).
  - **Запрет на декоративное свечение (glow)** (`box-shadow: 0 0 ...`, `text-shadow: 0 0 ...`), цветные/градиентные заливки кнопок, а также анимации `shimmer-text` и `badge-sheen`.
- **Чистый интерфейс без юникод-мусора и эмодзи**:
  - **Запрет на декоративные символы и эмодзи** (`✦`, `◈`, `✧`, `◇`, `★`, `◎`, `⚔`, `♫`, 🔥, ⚡, 🎬, 🎲 и т.п.) в кнопках, заголовках, бейджах, `.mobile-dock`, командной палитре, тостах и HUD. Использовать сухой редакционный текст либо плоские монохромные SVG-иконки (`stroke="currentColor"`, `stroke-width="1.5"`).
- **Типографика** — использовать исключительно три подключённых в `index.html` семейства через CSS-переменные:
  - `--font-display`: `Unbounded` (500, 600, 700) — заголовки секций, никнейм, крупные hero-цифры.
  - `--font-mono`: `JetBrains Mono` (400, 500, 600) — бейджи, кикеры, навигация, счётчики, HUD и метаданные.
  - `--font-sans`: `Inter` (400, 500, 600, 700) — основной текст, описания, заметки.
  - Не подключать сторонние шрифты и не задавать произвольные `font-family` в обход `--font-*`.

---

## 3. Матовые обсидиановые поверхности и запрет `backdrop-filter`

- **Строгий запрет на `backdrop-filter` и `-webkit-backdrop-filter`**: во всех файлах `assets/css/*.css` их должно быть **ноль**.
- Вместо тяжёлого blur использовать матовые обсидиановые поверхности (`--surface-*`), внутренний верхний блик (`--edge-specular`, `--edge-specular-hover`) и многослойные тени (`--shadow-card`, `--shadow-card-hover`, `--shadow-floating`, `--modal-shadow`).

---

## 4. Только токены `:root`

Для поверхностей, границ, слоёв и модальных окон обязательно использовать централизованные переменные из `:root` в `assets/css/tokens.css` — не хардкодить дублирующие цвета, радиусы и произвольные `z-index`:

- **Поверхности (`--surface-*`)**: `--surface-1`, `--surface-2`, `--surface-3`, `--surface-modal`, `--surface-overlay` (и алиас `--glass-bg`).
- **Границы и глубина (`--border-*`)**: `--border-subtle`, `--border-default`, `--border-strong` (и алиас `--glass-border`), `--edge-specular`, `--edge-specular-hover`, `--shadow-card`, `--shadow-card-hover`, `--shadow-floating`.
- **Слои (`--z-*`)**: только централизованная шкала:
  - `--z-bg` (0), `--z-canvas` (1), `--z-shell` (2), `--z-grain` (50), `--z-topbar` (100), `--z-hud` (315), `--z-dock` (320), `--z-mobile-music` (455), `--z-mobile-dock` (460), `--z-modal` (500), `--z-arena` (560), `--z-coop` (570), `--z-galaxy` (580), `--z-spotify-bg` (600), `--z-spotify` (610), `--z-trophy` (640), `--z-pack` (645), `--z-holo` (650), `--z-holo-close` (660), `--z-palette` (670), `--z-perf` (9990), `--z-intro` (9999).
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

## 6. Производительность и чистота кода (Performance First)

- **Честные 60–144 Гц и тихий Adaptive Performance (`galaxy.js`)**:
  - Все сглаживания камеры/орбиты/зума в 3D-Галактике работают через `dt = Math.min(rawDt, 0.05)` и экспоненциальное сглаживание `1 - Math.exp(-lambda * dt)`, вращения — в радианах/сек `* dt`, Star-Hopping — по реальному прошедшему времени (`dtMs`).
  - Adaptive Performance работает тихо и строго без UI-тумблеров качества (стартовый потолок DPR `1.5` на десктопе / `1.25` на touch-mobile, ступенчатое понижение DPR и uniform-параметров пыли без пересоздания WebGL-буферов, жёсткий cooldown/гистерезис).
  - При открытии `#holo-modal` или `#detail-modal` поверх Галактики WebGL rAF-цикл автоматически ставится на паузу и возобновляется после закрытия модалки.
- **Лёгкость глобального runtime и CLS**:
  - `#spotify-drawer` ленивый: `<iframe>` не получает `src`, а oEmbed-запросы не отправляются до самого первого открытия шторки (далее iframe сохраняется в DOM).
  - Старый `initGlassSpotlight()` и глобальные `pointermove`-циклы от glassmorphism удалены и не возвращаются.
  - Диагностический HUD (`perf.js`) подгружается динамически строго при `?perf=1` в URL (0 DOM-узлов, 0 rAF и 0 сетевых запросов для обычных пользователей).
  - Изображения ниже первого экрана (VAULT, ARENA, SIGNAL) используют `loading="lazy"`, `decoding="async"` и зарезервированные размеры; аватар и визуалы первого экрана `01 // DOSSIER` загружаются без `loading="lazy"`.
- **Никаких постоянных `will-change`**:
  - Запрещено вешать `will-change` на статичные или неактивные элементы (карточки, сетки, фоны, доки).
  - `will-change: transform` допустим **только** в кратковременных активных состояниях взаимодействия или открытых 3D/drag-оверлеях (например, `.is-tilting`, `.is-open` на активной 3D-сцене/карте, как это сделано в `assets/css/overlays.css` и `assets/css/responsive.css`).
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
  - После **любого** изменения файлов `assets/css/*.css`, `assets/js/main.js` или модулей `assets/js/modules/*.js` обязательно увеличивать числовой параметр `?v=...` в `index.html`:
    - `<link rel="stylesheet" href="./assets/css/{tokens,layout,sections,overlays,vinyl,editorial-bw,responsive}.css?v=..." />`
    - `<script type="module" src="./assets/js/main.js?v=..."></script>`
  - Текущие ссылки в `index.html` должны оставаться синхронизированы с актуальной версией (повышать номер при правках CSS/JS; при правке только документации/мета-файлов не менять).

---

## 8. Git и публикация

- **Никогда не пушить в `main`** (`git push`, `git push origin main`, force-push и т.п.) без явного подтверждения пользователя в текущем запросе.
- Не выполнять деструктивные git-операции (`reset --hard`, `clean -fd`, `checkout -- .` и т.п.) без прямого указания.
- Перед сдачей изменений проверять `git status` и `git diff`, чтобы убедиться, что затронуты только целевые файлы, не появилось `backdrop-filter`, постоянных `will-change` или вызовов `console.*`.
