import { PLAYLIST, formatRank, escapeHtml } from './config.js';
import { appState, PEAK_FICTION, WAIFU_LIST, LITERALLY_ME } from './data.js';
import { openHoloDeck } from './ui.js';

/* =========================================
   ARCHIVE COMMAND PALETTE (CTRL+K / ⌘K)
   ========================================= */

// Overlays that own the screen: the palette never opens on top of them.
const BLOCKING_MODAL_IDS = [
  'detail-modal',
  'arena-modal',
  'coop-modal',
  'trophy-modal',
  'holo-modal',
  'pack-modal',
  'spotify-drawer'
];

const NAV_SECTIONS = [
  { id: 'profile', label: 'Профиль', kw: 'profile hero главная пилот discord' },
  { id: 'hottakes', label: 'Hot Takes', kw: 'хот тейки мнения толпа оценки' },
  { id: 'trophies', label: 'Трофеи', kw: 'trophies достижения ачивки xp' },
  { id: 'activity', label: 'Активность', kw: 'activity история график' },
  { id: 'watching', label: 'Смотрю сейчас', kw: 'watching онгоинги полка' },
  { id: 'waifu', label: 'Waifu', kw: 'вайфу персонажи избранное' },
  { id: 'collection', label: 'Коллекция', kw: 'collection peak fiction топ литерали' }
];

const WEATHER_ITEMS = [
  { mode: 'live', icon: '●', label: 'LIVE', hint: 'Реальная погода 53.9° N · Open-Meteo', kw: 'live лайв реальная авто сейчас' },
  { mode: 'rain', icon: '☂', label: 'Дождь', hint: 'Косые капли и мокрый нуар', kw: 'rain дождь ливень капли' },
  { mode: 'snow', icon: '❄', label: 'Снег', hint: 'Медленный снегопад', kw: 'snow снег зима снегопад' },
  { mode: 'fog', icon: '≋', label: 'Туман', hint: 'Дымка и приглушённый свет', kw: 'fog mist туман дымка' },
  { mode: 'storm', icon: '⚡', label: 'Гроза', hint: 'Ливень и вспышки молний', kw: 'storm thunder гроза молния шторм' },
  { mode: 'clear', icon: '✦', label: 'Ясно', hint: 'Звёздное небо', kw: 'clear sun ясно звёзды солнце небо' }
];

const EN_KEYS = 'qwertyuiop[]asdfghjkl;\'zxcvbnm,.`';
const RU_KEYS = 'йцукенгшщзхъфывапролджэячсмитьбюё';

function swapLayout(str, from, to) {
  let out = '';
  for (let i = 0; i < str.length; i++) {
    const idx = from.indexOf(str[i]);
    out += idx >= 0 ? to[idx] : str[i];
  }
  return out;
}

// Length-preserving fold (1:1 chars) so match offsets map back onto labels.
function fold(str) {
  return String(str || '').toLowerCase().replace(/ё/g, 'е');
}

function normalize(str) {
  return fold(str).replace(/[^\p{L}\p{N}#]+/gu, ' ').trim();
}

export function initCommandPalette(player) {
  const modal = document.getElementById('cmdk-modal');
  const input = document.getElementById('cmdk-input');
  const list = document.getElementById('cmdk-list');
  const countEl = document.getElementById('cmdk-count');
  const closeBtn = document.getElementById('cmdk-close');
  const openBtn = document.getElementById('cmdk-open-btn');
  if (!modal || !input || !list) return null;

  const body = document.body;
  const isApple = /Mac|iPhone|iPad|iPod/i.test(
    (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || navigator.userAgent || ''
  );
  const shortcutLabel = isApple ? '⌘K' : 'Ctrl K';
  document.querySelectorAll('[data-cmdk-shortcut]').forEach((el) => { el.textContent = shortcutLabel; });
  openBtn?.setAttribute('title', `Командная палитра · ${isApple ? '⌘K' : 'Ctrl+K'}`);

  const reducedMotionMq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const finePointerMq = window.matchMedia ? window.matchMedia('(hover: hover) and (pointer: fine)') : null;

  let isOpen = false;
  let items = [];
  let results = [];
  let activeIdx = 0;
  let lastFocus = null;

  modal.setAttribute('inert', '');

  /* ---------- Helpers ---------- */
  function prefersReducedMotion() {
    return Boolean(appState.prefersReducedMotion || (reducedMotionMq && reducedMotionMq.matches));
  }

  function isCinemaActive() {
    return body.classList.contains('is-cinema-mode');
  }

  function exitCinemaIfActive() {
    if (isCinemaActive()) document.getElementById('cinema-toggle-btn')?.click();
  }

  function clickById(id) {
    document.getElementById(id)?.click();
  }

  function goToSection(id, focusSelector) {
    const target = document.getElementById(id);
    if (!target) return;
    const smooth = !prefersReducedMotion();
    // Wait one frame so the unified scroll lock releases <body> first.
    requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
      if (focusSelector && finePointerMq && finePointerMq.matches) {
        const field = document.querySelector(focusSelector);
        if (field) setTimeout(() => field.focus({ preventScroll: true }), smooth ? 520 : 0);
      }
    });
  }

  function canOpen() {
    if (document.querySelector('.intro-overlay:not(.is-hidden)')) return false;
    if (body.classList.contains('galaxy-active')) return false;
    for (let i = 0; i < BLOCKING_MODAL_IDS.length; i++) {
      const el = document.getElementById(BLOCKING_MODAL_IDS[i]);
      if (el && el.classList.contains('is-open')) return false;
    }
    return true;
  }

  /* ---------- Item registry (rebuilt on every open: labels reflect live state) ---------- */
  function buildItems() {
    const out = [];
    const cinemaOn = isCinemaActive();

    out.push(
      {
        group: 'Команды', icon: '✦', label: 'Открыть 3D-Галактику', hint: 'WebGL-космос всех тайтлов архива',
        kw: 'галактика galaxy космос 3d вселенная звезды webgl three', page: true,
        run: () => clickById('open-galaxy-topbar-btn')
      },
      {
        group: 'Команды', icon: '▣', label: cinemaOn ? 'Выключить Cinema Mode' : 'Включить Cinema Mode',
        hint: 'Чистый экран для второго монитора', meta: 'C', kw: 'cinema кино синема режим экран монитор фокус',
        run: () => clickById('cinema-toggle-btn')
      },
      {
        group: 'Команды', icon: '◈', label: 'Вскрыть Бустер-пак', hint: 'ARCHIVE PACK · Top 16 и все 9–10★',
        kw: 'booster pack бустер пак рандом карты randomizer крутануть', page: true,
        run: () => clickById('randomizer-btn')
      },
      {
        group: 'Команды', icon: '⚔', label: 'Запустить Турнир 1v1', hint: 'Кто лучший из моего топа · Peak Fiction',
        kw: 'tournament arena турнир арена битва 1v1 versus дуэль', page: true,
        run: () => clickById('collection-arena-btn')
      },
      {
        group: 'Команды', icon: '⚔', label: 'Турнир 1v1 · Waifu', hint: 'Дуэли персонажей из WAIFU',
        kw: 'tournament arena турнир арена waifu вайфу 1v1 дуэль', page: true,
        run: () => clickById('waifu-arena-btn')
      },
      {
        group: 'Команды', icon: '◎', label: 'Перейти к проверке на базу', hint: 'Taste Match по нику Shikimori',
        kw: 'база taste match совместимость вкус проверка ник shikimori compatibility', page: true,
        run: () => goToSection('compatibility', '#base-nick-input')
      },
      {
        group: 'Команды', icon: '✎', label: 'Перейти к гостевой стене', hint: 'Guestbook · GitHub Discussions',
        kw: 'guestbook стена гостевая комментарии giscus отзывы', page: true,
        run: () => goToSection('guestbook')
      },
      {
        group: 'Команды', icon: '♫', label: 'Открыть Spotify-плейлисты', hint: 'Шторка с плейлистами',
        kw: 'spotify спотифай плейлисты drawer музыка', page: true,
        run: () => clickById('hero-spotify-btn')
      }
    );

    NAV_SECTIONS.forEach((s) => {
      if (!document.getElementById(s.id)) return;
      out.push({
        group: 'Навигация', icon: '↳', label: `Перейти: ${s.label}`, hint: `#${s.id}`,
        kw: `перейти секция раздел ${s.kw}`, page: true,
        run: () => goToSection(s.id)
      });
    });

    WEATHER_ITEMS.forEach((w) => {
      const chip = document.querySelector(`.weather-chip[data-wmode="${w.mode}"]`);
      if (!chip) return;
      const on = chip.classList.contains('active');
      out.push({
        group: 'Погода', icon: w.icon, label: `Погода: ${w.label}`, hint: w.hint,
        meta: on ? 'АКТИВНО' : '', on, kw: `погода weather атмосфера ${w.kw}`,
        run: () => chip.click()
      });
    });

    if (player) {
      const playing = player.isPlaying();
      const current = player.getTrack();
      out.push(
        {
          group: 'Музыка', icon: playing ? '❚❚' : '▶', label: playing ? 'Музыка: Пауза' : 'Музыка: Play',
          hint: current ? `${current.title} — ${current.artist}` : 'Плейлист архива',
          kw: 'play pause плей пауза стоп играть музыка трек', run: () => player.toggle()
        },
        {
          group: 'Музыка', icon: '⏭', label: 'Следующий трек', hint: 'Next',
          kw: 'next следующий дальше skip музыка', run: () => player.next()
        },
        {
          group: 'Музыка', icon: '⏮', label: 'Предыдущий трек', hint: 'Prev',
          kw: 'prev previous предыдущий назад музыка', run: () => player.prev()
        }
      );
      PLAYLIST.forEach((track, idx) => {
        const isCurrent = current === track;
        out.push({
          group: 'Музыка', icon: '♪', label: track.title, hint: track.artist,
          meta: isCurrent ? (playing ? 'ИГРАЕТ' : 'ВЫБРАН') : formatRank(idx + 1), on: isCurrent && playing,
          kw: `трек песня track музыка play ${formatRank(idx + 1)}`,
          run: () => player.playTrack(idx)
        });
      });
    }

    PEAK_FICTION.forEach((a, idx) => {
      out.push({
        group: 'Peak Fiction · 3D-карты', thumb: appState.coverCache['anime_' + a.malId] || '', icon: '★',
        label: a.title, hint: `${a.kind} · ${a.year}`, meta: `#${formatRank(a.rank)}`,
        kw: `peak fiction тайтл аниме карта ${a.year} ${(a.vibes || []).join(' ')}`, page: true,
        run: () => openHoloDeck('peak', idx)
      });
    });

    WAIFU_LIST.forEach((w, idx) => {
      out.push({
        group: 'Waifu · 3D-карты', thumb: appState.coverCache['char_' + w.key] || w.shikiImg || '', icon: '♡',
        label: w.name, hint: w.anime, meta: `#${formatRank(w.rank)}`,
        kw: `waifu вайфу персонаж карта ${w.search || ''}`, page: true,
        run: () => openHoloDeck('waifu', idx)
      });
    });

    LITERALLY_ME.forEach((c, idx) => {
      out.push({
        group: 'Literally Me · 3D-карты', thumb: appState.coverCache['char_' + c.key] || '', icon: '◇',
        label: c.name, hint: c.anime, meta: `#${formatRank(c.rank)}`,
        kw: `literally me литерали персонаж карта ${c.search || ''}`, page: true,
        run: () => openHoloDeck('literally', idx)
      });
    });

    out.forEach((item, i) => {
      item.order = i;
      item.labelNorm = normalize(item.label);
      item.hay = normalize(`${item.label} ${item.hint || ''} ${item.kw || ''} ${item.group}`);
    });
    return out;
  }

  /* ---------- Search ---------- */
  function scoreItem(item, tokens, phrase) {
    let score = 0;
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (item.hay.indexOf(t) === -1) return -1;
      const inLabel = item.labelNorm.indexOf(t);
      if (inLabel === 0) score += 60;
      else if (inLabel > 0 && item.labelNorm[inLabel - 1] === ' ') score += 40;
      else if (inLabel > 0) score += 22;
      else score += 6;
    }
    if (phrase && item.labelNorm.indexOf(phrase) === 0) score += 80;
    return score;
  }

  function search(rawQuery) {
    const q = normalize(rawQuery);
    if (!q) return { list: items.map((item) => ({ item, score: 0, token: '' })), ordered: false };

    const variants = [q];
    const toRu = normalize(swapLayout(fold(rawQuery), EN_KEYS, RU_KEYS));
    const toEn = normalize(swapLayout(fold(rawQuery), RU_KEYS, EN_KEYS));
    if (toRu && variants.indexOf(toRu) === -1) variants.push(toRu);
    if (toEn && variants.indexOf(toEn) === -1) variants.push(toEn);

    const found = [];
    for (let i = 0; i < items.length; i++) {
      let best = -1;
      let bestToken = '';
      for (let v = 0; v < variants.length; v++) {
        const tokens = variants[v].split(' ');
        // Exact-layout hits always outrank keyboard-layout guesses.
        const s = scoreItem(items[i], tokens, variants[v]);
        const adj = s < 0 ? -1 : (v === 0 ? s + 1000 : s);
        if (adj > best) {
          best = adj;
          bestToken = tokens[0];
        }
      }
      if (best >= 0) found.push({ item: items[i], score: best, token: bestToken });
    }
    return { list: found, ordered: true };
  }

  function groupResults(found, ordered) {
    const groups = new Map();
    found.forEach((r) => {
      if (!groups.has(r.item.group)) groups.set(r.item.group, { name: r.item.group, best: -1, first: r.item.order, rows: [] });
      const g = groups.get(r.item.group);
      g.rows.push(r);
      if (r.score > g.best) g.best = r.score;
    });
    const arr = Array.from(groups.values());
    if (ordered) {
      arr.forEach((g) => g.rows.sort((a, b) => b.score - a.score || a.item.order - b.item.order));
      arr.sort((a, b) => b.best - a.best || a.first - b.first);
    }
    return arr;
  }

  function highlight(label, token) {
    if (!token) return escapeHtml(label);
    const at = fold(label).indexOf(token);
    if (at < 0) return escapeHtml(label);
    return `${escapeHtml(label.slice(0, at))}<mark>${escapeHtml(label.slice(at, at + token.length))}</mark>${escapeHtml(label.slice(at + token.length))}`;
  }

  /* ---------- Render ---------- */
  function render() {
    const { list: found, ordered } = search(input.value);
    const groups = groupResults(found, ordered);
    results = [];
    let html = '';

    groups.forEach((g, gi) => {
      html += `<div class="cmdk-group" role="group" aria-labelledby="cmdk-g-${gi}"><div class="cmdk-group-label" id="cmdk-g-${gi}" aria-hidden="true">${escapeHtml(g.name)}</div>`;
      g.rows.forEach((r) => {
        const idx = results.length;
        results.push(r.item);
        const it = r.item;
        const visual = it.thumb
          ? `<span class="cmdk-thumb" aria-hidden="true"><img src="${escapeHtml(it.thumb)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" /><span class="cmdk-thumb-fallback">${escapeHtml(it.icon)}</span></span>`
          : `<span class="cmdk-icon" aria-hidden="true">${escapeHtml(it.icon)}</span>`;
        const meta = it.meta ? `<span class="cmdk-meta${it.on ? ' is-on' : ''}">${escapeHtml(it.meta)}</span>` : '';
        html += `<div class="cmdk-item" role="option" id="cmdk-opt-${idx}" data-idx="${idx}" aria-selected="false">${visual}<span class="cmdk-text"><span class="cmdk-label">${highlight(it.label, r.token)}</span>${it.hint ? `<span class="cmdk-hint">${escapeHtml(it.hint)}</span>` : ''}</span>${meta}</div>`;
      });
      html += '</div>';
    });

    if (!results.length) {
      html = '<div class="cmdk-empty" role="presentation">Ничего не найдено<span>Попробуй «дождь», «галактика», «резе» или «турнир»</span></div>';
    }

    list.innerHTML = html;
    list.scrollTop = 0;
    if (countEl) countEl.textContent = `${results.length} ${pluralResults(results.length)}`;
    setActive(0, false);
  }

  function pluralResults(n) {
    const m10 = n % 10;
    const m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return 'результат';
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'результата';
    return 'результатов';
  }

  function setActive(idx, scroll) {
    const prev = list.querySelector('.cmdk-item.is-active');
    if (prev) {
      prev.classList.remove('is-active');
      prev.setAttribute('aria-selected', 'false');
    }
    if (!results.length) {
      activeIdx = -1;
      input.removeAttribute('aria-activedescendant');
      return;
    }
    activeIdx = (idx + results.length) % results.length;
    const el = document.getElementById(`cmdk-opt-${activeIdx}`);
    if (!el) return;
    el.classList.add('is-active');
    el.setAttribute('aria-selected', 'true');
    input.setAttribute('aria-activedescendant', el.id);
    if (scroll) el.scrollIntoView({ block: 'nearest' });
  }

  /* ---------- Open / close / execute ---------- */
  function open() {
    if (isOpen || !canOpen()) return;
    isOpen = true;
    lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    items = buildItems();
    input.value = '';
    render();
    modal.removeAttribute('inert');
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('is-open');
    openBtn?.setAttribute('aria-expanded', 'true');
    input.focus({ preventScroll: true });
    requestAnimationFrame(() => {
      if (isOpen && document.activeElement !== input) input.focus({ preventScroll: true });
    });
  }

  function close(restoreFocus) {
    if (!isOpen) return;
    isOpen = false;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('inert', '');
    openBtn?.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    if (modal.contains(document.activeElement)) document.activeElement.blur();
    if (restoreFocus && lastFocus && lastFocus.isConnected && !lastFocus.closest('[inert]')) {
      lastFocus.focus({ preventScroll: true });
    }
    lastFocus = null;
  }

  function execute(idx) {
    const item = results[idx];
    if (!item) return;
    close(false);
    if (item.page) exitCinemaIfActive();
    item.run();
  }

  /* ---------- Wiring ---------- */
  openBtn?.addEventListener('click', open);
  closeBtn?.addEventListener('click', () => close(true));
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close(true);
  });

  input.addEventListener('input', render);

  // Keep keyboard focus in the input while choosing with the pointer.
  list.addEventListener('mousedown', (e) => e.preventDefault());
  list.addEventListener('pointermove', (e) => {
    const opt = e.target.closest && e.target.closest('.cmdk-item');
    if (!opt) return;
    const idx = Number(opt.dataset.idx);
    if (idx !== activeIdx) setActive(idx, false);
  });
  list.addEventListener('click', (e) => {
    const opt = e.target.closest && e.target.closest('.cmdk-item');
    if (opt) execute(Number(opt.dataset.idx));
  });
  // Broken covers fall back to the glyph (error events don't bubble — capture them).
  list.addEventListener('error', (e) => {
    const img = e.target;
    if (img && img.tagName === 'IMG') img.closest('.cmdk-thumb')?.classList.add('is-broken');
  }, true);

  document.addEventListener('focusin', (e) => {
    if (isOpen && !modal.contains(e.target)) input.focus({ preventScroll: true });
  });

  // Capture phase on window: runs before every other keydown handler, so while the
  // palette is open no global hotkey (C / Esc / Enter / arrows) leaks to the page.
  window.addEventListener('keydown', (e) => {
    const isK = e.code === 'KeyK' || e.key === 'k' || e.key === 'K' || e.key === 'л' || e.key === 'Л';
    if (isK && (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey) {
      if (isOpen) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (!e.repeat) close(true);
        return;
      }
      if (e.repeat || !canOpen()) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      open();
      return;
    }

    if (!isOpen) return;
    e.stopImmediatePropagation();
    if (e.isComposing) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActive(activeIdx + 1, true);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActive(activeIdx - 1, true);
        break;
      case 'PageDown':
        e.preventDefault();
        setActive(Math.min(results.length - 1, activeIdx + 6), true);
        break;
      case 'PageUp':
        e.preventDefault();
        setActive(Math.max(0, activeIdx - 6), true);
        break;
      case 'Tab':
        e.preventDefault();
        setActive(activeIdx + (e.shiftKey ? -1 : 1), true);
        break;
      case 'Enter':
        e.preventDefault();
        if (!e.repeat && activeIdx >= 0) execute(activeIdx);
        break;
      case 'Escape':
        e.preventDefault();
        close(true);
        break;
      default:
        if (document.activeElement !== input) input.focus({ preventScroll: true });
    }
  }, true);

  return { open, close: () => close(true), isOpen: () => isOpen };
}
