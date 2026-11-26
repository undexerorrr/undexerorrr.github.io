import { NAV_MODE_STORAGE_KEY } from './config.js';
import { appState } from './data.js';

/* =========================================
   ARCHIVE OS — 4-SECTOR NAVIGATION & VIEW TRANSITIONS
   ========================================= */
export const SECTORS = [
  {
    id: 'dossier',
    num: '01',
    label: 'DOSSIER',
    title: '01 // DOSSIER',
    subtitle: 'PILOT DECK, WATCHING & TELEMETRY',
    hint: 'Профиль, Сейчас смотрю, Активность',
    kw: 'dossier досье профиль главная днк смотрю активность 01'
  },
  {
    id: 'vault',
    num: '02',
    label: 'VAULT',
    title: '02 // VAULT',
    subtitle: 'COLLECTIBLES, WAIFU & 3D TROPHIES',
    hint: 'Коллекция, Waifu, Трофеи архива',
    kw: 'vault сейф коллекция peak fiction literally me waifu вайфу трофеи 02'
  },
  {
    id: 'arena',
    num: '03',
    label: 'ARENA',
    title: '03 // ARENA',
    subtitle: 'FEATURED PACK, TASTE MATCH & HOT TAKES',
    hint: 'ARCHIVE PACK, Турнир 1v1, Проверка на базу, Кооп, Hot Takes',
    kw: 'arena арена база совместимость кооп coop hot takes турнир бустер галактика 03'
  },
  {
    id: 'signal',
    num: '04',
    label: 'SIGNAL',
    title: '04 // SIGNAL',
    subtitle: 'LISTENING ROOM, CHANNELS & GUESTBOOK',
    hint: 'Виниловая полка, Контакты, GitHub, Spotify и Гостевая стена',
    kw: 'signal сигнал контакты ссылки tiktok discord github spotify vinyl винил пластинки audio стена guestbook giscus 04'
  }
];

const SECTOR_MAP = new Map(SECTORS.map((s, idx) => [s.id, { ...s, index: idx }]));

const ANCHOR_TO_SECTOR = {
  dossier: 'dossier',
  'sector-dossier': 'dossier',
  profile: 'dossier',
  'anime-dna-card': 'dossier',
  watching: 'dossier',
  activity: 'dossier',
  vault: 'vault',
  'sector-vault': 'vault',
  collection: 'vault',
  waifu: 'vault',
  trophies: 'vault',
  arena: 'arena',
  'sector-arena': 'arena',
  'arena-deck': 'arena',
  compatibility: 'arena',
  hottakes: 'arena',
  signal: 'signal',
  'sector-signal': 'signal',
  'signal-hub': 'signal',
  vinyl: 'signal',
  guestbook: 'signal'
};

const SECTOR_ALIAS_SET = new Set([
  'dossier',
  'vault',
  'arena',
  'signal',
  'sector-dossier',
  'sector-vault',
  'sector-arena',
  'sector-signal'
]);

const BLOCKING_OVERLAY_IDS = [
  'detail-modal',
  'arena-modal',
  'coop-modal',
  'trophy-modal',
  'holo-modal',
  'pack-modal',
  'spotify-drawer',
  'cmdk-modal'
];

const KEY_TO_SECTOR = {
  Digit1: 'dossier',
  Digit2: 'vault',
  Digit3: 'arena',
  Digit4: 'signal',
  1: 'dossier',
  2: 'vault',
  3: 'arena',
  4: 'signal'
};

const reducedMotionMQ = window.matchMedia
  ? window.matchMedia('(prefers-reduced-motion: reduce)')
  : null;
const finePointerMQ = window.matchMedia
  ? window.matchMedia('(hover: hover) and (pointer: fine)')
  : null;

let initialized = false;
let activeTransition = null;
let allModeObserver = null;
let fallbackEnterTimer = null;

function prefersReducedMotion() {
  return Boolean(appState.prefersReducedMotion || (reducedMotionMQ && reducedMotionMQ.matches));
}

function isTypingTarget(el) {
  if (!el || !el.tagName) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable === true;
}

function isBlockedByOverlay() {
  const body = document.body;
  if (document.querySelector('.intro-overlay:not(.is-hidden)')) return true;
  if (body.classList.contains('is-modal-open')) return true;
  if (body.classList.contains('galaxy-active')) return true;
  if (body.classList.contains('is-cinema-mode')) return true;
  for (let i = 0; i < BLOCKING_OVERLAY_IDS.length; i++) {
    const el = document.getElementById(BLOCKING_OVERLAY_IDS[i]);
    if (el && el.classList.contains('is-open')) return true;
  }
  return false;
}

function getDomEls() {
  return {
    main: document.querySelector('main.container'),
    stage: document.getElementById('sector-stage'),
    panels: Array.from(document.querySelectorAll('.sector-panel[data-sector]')),
    sectorTabs: Array.from(document.querySelectorAll('[data-sector-tab]')),
    modeButtons: Array.from(document.querySelectorAll('[data-nav-mode]')),
    telCode: document.getElementById('sector-tel-code'),
    telDesc: document.getElementById('sector-tel-desc'),
    telModeBtn: document.getElementById('sector-tel-mode-btn'),
    telModeLabel: document.getElementById('sector-tel-mode-label')
  };
}

export function resolveSectorForAnchor(rawHashOrId) {
  let clean = String(rawHashOrId || '').trim().replace(/^#/, '');
  if (!clean) return { sector: 'dossier', anchor: null };
  try {
    clean = decodeURIComponent(clean);
  } catch (e) {}

  if (ANCHOR_TO_SECTOR[clean]) {
    const sector = ANCHOR_TO_SECTOR[clean];
    const anchor = SECTOR_ALIAS_SET.has(clean) ? null : clean;
    return { sector, anchor };
  }

  const targetEl = document.getElementById(clean);
  const hostPanel = targetEl ? targetEl.closest('[data-sector]') : null;
  if (hostPanel && SECTOR_MAP.has(hostPanel.dataset.sector)) {
    return {
      sector: hostPanel.dataset.sector,
      anchor: clean
    };
  }

  return { sector: 'dossier', anchor: null };
}

export function getSectorState() {
  return {
    sector: appState.activeSector || 'dossier',
    navMode: appState.navMode === 'all' ? 'all' : 'os'
  };
}

function updateActiveIndicators(sectorId) {
  const meta = SECTOR_MAP.get(sectorId) || SECTOR_MAP.get('dossier');
  const { stage, sectorTabs, telCode, telDesc } = getDomEls();

  if (stage) stage.dataset.activeSector = meta.id;

  sectorTabs.forEach((btn) => {
    const active = btn.dataset.sectorTab === meta.id;
    btn.classList.toggle('is-active', active);
    if (btn.getAttribute('role') === 'tab') {
      btn.setAttribute('aria-selected', String(active));
    }
    if (active) {
      btn.setAttribute('aria-current', 'page');
    } else {
      btn.removeAttribute('aria-current');
    }
  });

  if (telCode) telCode.textContent = `SECTOR ${meta.num} // ${meta.label}`;
  if (telDesc) telDesc.textContent = meta.subtitle;
}

function applyPanelsVisibility(sectorId, navMode) {
  const { main, panels, modeButtons, telModeBtn, telModeLabel } = getDomEls();
  const isAll = navMode === 'all';

  if (main) main.dataset.navMode = isAll ? 'all' : 'os';

  panels.forEach((panel) => {
    const isSelected = panel.dataset.sector === sectorId;
    panel.hidden = isAll ? false : !isSelected;
    panel.classList.toggle('is-active', isAll ? isSelected : isSelected);
  });

  modeButtons.forEach((btn) => {
    const active = btn.dataset.navMode === (isAll ? 'all' : 'os');
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
  });

  if (telModeBtn) {
    telModeBtn.setAttribute('aria-pressed', String(isAll));
  }
  if (telModeLabel) {
    telModeLabel.textContent = isAll ? 'VIEW: ALL' : 'VIEW: OS';
  }

  updateActiveIndicators(sectorId);
}

function clearFallbackClasses() {
  if (fallbackEnterTimer !== null) {
    clearTimeout(fallbackEnterTimer);
    fallbackEnterTimer = null;
  }
  document.querySelectorAll('.sector-panel.is-vt-fallback-enter').forEach((el) => {
    el.classList.remove('is-vt-fallback-enter');
  });
}

function triggerFallbackEnterAnimation(sectorId) {
  if (prefersReducedMotion()) return;
  clearFallbackClasses();
  const panel = document.querySelector(`.sector-panel[data-sector="${sectorId}"]`);
  if (!panel || panel.hidden) return;
  void panel.offsetWidth;
  panel.classList.add('is-vt-fallback-enter');
  const cleanup = () => {
    panel.classList.remove('is-vt-fallback-enter');
    if (fallbackEnterTimer !== null) {
      clearTimeout(fallbackEnterTimer);
      fallbackEnterTimer = null;
    }
  };
  panel.addEventListener('animationend', cleanup, { once: true });
  fallbackEnterTimer = window.setTimeout(cleanup, 280);
}

function runViewTransition(updateDom, dir, onUpdated, targetSectorId) {
  const root = document.documentElement;
  const reduced = prefersReducedMotion();

  if (reduced || typeof document.startViewTransition !== 'function' || document.hidden) {
    updateDom();
    if (!reduced && targetSectorId) triggerFallbackEnterAnimation(targetSectorId);
    if (typeof onUpdated === 'function') onUpdated();
    return Promise.resolve();
  }

  if (activeTransition && typeof activeTransition.skipTransition === 'function') {
    try { activeTransition.skipTransition(); } catch (e) {}
  }

  clearFallbackClasses();
  root.dataset.vtDir = dir || 'forward';
  root.classList.add('is-sector-transitioning');

  let vt = null;
  try {
    vt = document.startViewTransition(() => {
      updateDom();
    });
  } catch (e) {
    root.classList.remove('is-sector-transitioning');
    delete root.dataset.vtDir;
    updateDom();
    if (targetSectorId) triggerFallbackEnterAnimation(targetSectorId);
    if (typeof onUpdated === 'function') onUpdated();
    return Promise.resolve();
  }

  activeTransition = vt;
  if (vt.ready && typeof vt.ready.catch === 'function') vt.ready.catch(() => {});
  if (vt.updateCallbackDone && typeof vt.updateCallbackDone.then === 'function') {
    vt.updateCallbackDone.then(() => {
      if (typeof onUpdated === 'function') onUpdated();
    }).catch(() => {});
  } else if (typeof onUpdated === 'function') {
    onUpdated();
  }

  return (vt.finished ? vt.finished.catch(() => {}) : Promise.resolve()).finally(() => {
    if (activeTransition === vt) {
      activeTransition = null;
      root.classList.remove('is-sector-transitioning');
      delete root.dataset.vtDir;
    }
  });
}

function updateUrlHash(nextHash, replace) {
  const clean = String(nextHash || '').replace(/^#/, '');
  if (!clean) return;
  const desired = `#${clean}`;
  if (window.location.hash === desired) return;
  try {
    if (replace) {
      history.replaceState(null, '', desired);
    } else {
      history.pushState(null, '', desired);
    }
  } catch (e) {
    window.location.hash = desired;
  }
}

function scrollToTargetElement(anchorId, focusSelector) {
  const target = anchorId ? document.getElementById(anchorId) : null;
  if (!target) return;
  const smooth = !prefersReducedMotion();
  requestAnimationFrame(() => {
    target.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
    if (focusSelector && finePointerMQ && finePointerMQ.matches) {
      const field = document.querySelector(focusSelector);
      if (field) {
        setTimeout(() => field.focus({ preventScroll: true }), smooth ? 420 : 0);
      }
    }
  });
}

function emitSectorChange(sector, prevSector, targetAnchor) {
  document.dispatchEvent(new CustomEvent('archive:sectorchange', {
    detail: {
      sector,
      prevSector,
      navMode: appState.navMode,
      targetAnchor: targetAnchor || null
    }
  }));
}

function disconnectAllModeSpy() {
  if (allModeObserver) {
    allModeObserver.disconnect();
    allModeObserver = null;
  }
}

function setupAllModeSpy() {
  disconnectAllModeSpy();
  if (appState.navMode !== 'all' || typeof IntersectionObserver !== 'function') return;

  const { panels } = getDomEls();
  if (!panels.length) return;

  allModeObserver = new IntersectionObserver(
    (entries) => {
      if (appState.navMode !== 'all') return;
      let best = null;
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        if (!entry.isIntersecting) continue;
        if (!best || entry.intersectionRatio > best.intersectionRatio) {
          best = entry;
        }
      }
      if (best && best.target?.dataset?.sector) {
        const secId = best.target.dataset.sector;
        if (secId !== appState.activeSector && SECTOR_MAP.has(secId)) {
          const prev = appState.activeSector;
          appState.activeSector = secId;
          updateActiveIndicators(secId);
          panels.forEach((p) => p.classList.toggle('is-active', p.dataset.sector === secId));
          emitSectorChange(secId, prev, null);
        }
      }
    },
    { rootMargin: '-22% 0px -58% 0px', threshold: [0.05, 0.25, 0.5] }
  );

  panels.forEach((panel) => allModeObserver.observe(panel));
}

export function setSector(sectorId, opts) {
  const options = opts || {};
  const meta = SECTOR_MAP.get(sectorId) || SECTOR_MAP.get('dossier');
  const nextSector = meta.id;
  const prevSector = appState.activeSector || 'dossier';
  const transition = options.transition !== false;
  const updateUrl = options.updateUrl !== false;
  const scrollTop = options.scrollTop !== false;
  const targetAnchor = options.targetAnchor || null;
  const focusSelector = options.focusSelector || null;
  const replaceHistory = Boolean(options.replaceHistory);
  const nextHash = targetAnchor || nextSector;

  if (appState.navMode === 'all') {
    appState.activeSector = nextSector;
    applyPanelsVisibility(nextSector, 'all');
    if (updateUrl) updateUrlHash(nextHash, replaceHistory);
    emitSectorChange(nextSector, prevSector, targetAnchor);

    const destId = targetAnchor || `sector-${nextSector}`;
    scrollToTargetElement(destId, focusSelector);
    return Promise.resolve();
  }

  if (nextSector === prevSector && !targetAnchor) {
    if (updateUrl) updateUrlHash(nextSector, replaceHistory);
    if (scrollTop && window.scrollY > 0) {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }
    return Promise.resolve();
  }

  const prevMeta = SECTOR_MAP.get(prevSector) || SECTOR_MAP.get('dossier');
  const dir = meta.index >= prevMeta.index ? 'forward' : 'backward';

  const applyDom = () => {
    appState.activeSector = nextSector;
    applyPanelsVisibility(nextSector, 'os');
  };

  const afterDom = () => {
    if (updateUrl) updateUrlHash(nextHash, replaceHistory);
    emitSectorChange(nextSector, prevSector, targetAnchor);
    if (targetAnchor) {
      scrollToTargetElement(targetAnchor, focusSelector);
    } else if (scrollTop && window.scrollY > 2) {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }
  };

  if (!transition) {
    applyDom();
    afterDom();
    return Promise.resolve();
  }

  return runViewTransition(applyDom, dir, afterDom, nextSector);
}

export function setNavMode(mode, opts) {
  const options = opts || {};
  const nextMode = mode === 'all' ? 'all' : 'os';
  const prevMode = appState.navMode;
  const transition = options.transition !== false;

  try {
    localStorage.setItem(NAV_MODE_STORAGE_KEY, nextMode);
  } catch (e) {}

  if (nextMode === prevMode) {
    applyPanelsVisibility(appState.activeSector, nextMode);
    if (nextMode === 'all') setupAllModeSpy();
    else disconnectAllModeSpy();
    return Promise.resolve();
  }

  const sector = appState.activeSector || 'dossier';
  const dir = nextMode === 'all' ? 'forward' : 'backward';

  const applyDom = () => {
    appState.navMode = nextMode;
    applyPanelsVisibility(sector, nextMode);
  };

  const afterDom = () => {
    if (nextMode === 'all') {
      setupAllModeSpy();
      if (sector !== 'dossier') {
        scrollToTargetElement(`sector-${sector}`, null);
      }
    } else {
      disconnectAllModeSpy();
      if (window.scrollY > 2) {
        window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      }
    }
    emitSectorChange(sector, sector, null);
  };

  if (!transition) {
    applyDom();
    afterDom();
    return Promise.resolve();
  }

  return runViewTransition(applyDom, dir, afterDom, sector);
}

export function toggleNavMode(opts) {
  return setNavMode(appState.navMode === 'all' ? 'os' : 'all', opts);
}

export function navigateToTarget(rawHashOrId, opts) {
  const options = opts || {};
  const resolved = resolveSectorForAnchor(rawHashOrId);
  return setSector(resolved.sector, {
    transition: options.transition !== false,
    updateUrl: options.updateUrl !== false,
    scrollTop: options.scrollTop !== false,
    targetAnchor: resolved.anchor,
    focusSelector: options.focusSelector || null,
    replaceHistory: Boolean(options.replaceHistory)
  });
}

function wireArenaLaunchpad() {
  const packBtn = document.getElementById('arena-launch-pack');
  const tourneyBtn = document.getElementById('arena-launch-tournament');
  const galaxyBtn = document.getElementById('arena-launch-galaxy');

  packBtn?.addEventListener('click', () => {
    document.getElementById('randomizer-btn')?.click();
  });
  tourneyBtn?.addEventListener('click', () => {
    document.getElementById('collection-arena-btn')?.click();
  });
  galaxyBtn?.addEventListener('click', () => {
    document.getElementById('open-galaxy-topbar-btn')?.click();
  });
}

export function initSectors() {
  if (initialized) return getSectorState();
  initialized = true;

  const { sectorTabs, modeButtons, telModeBtn } = getDomEls();

  sectorTabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetSector = btn.dataset.sectorTab || 'dossier';
      setSector(targetSector, { transition: true, updateUrl: true, scrollTop: true });
    });
  });

  modeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = btn.dataset.navMode === 'all' ? 'all' : 'os';
      setNavMode(next, { transition: true });
    });
  });

  telModeBtn?.addEventListener('click', () => {
    toggleNavMode({ transition: true });
  });

  const brandLink = document.querySelector('.topbar .brand');
  brandLink?.addEventListener('click', (e) => {
    e.preventDefault();
    if (appState.navMode === 'all') {
      const prev = appState.activeSector;
      appState.activeSector = 'dossier';
      applyPanelsVisibility('dossier', 'all');
      updateUrlHash('dossier', false);
      emitSectorChange('dossier', prev, null);
      window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      return;
    }
    if (appState.activeSector === 'dossier') {
      updateUrlHash('dossier', true);
      window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      return;
    }
    setSector('dossier', { transition: true, updateUrl: true, scrollTop: true });
  });

  document.addEventListener('click', (e) => {
    const link = e.target.closest && e.target.closest('a[href^="#"]');
    if (!link || link.classList.contains('brand')) return;
    const href = link.getAttribute('href');
    if (!href || href === '#') return;
    const clean = href.slice(1);
    if (!ANCHOR_TO_SECTOR[clean] && !document.getElementById(clean)) return;
    e.preventDefault();
    navigateToTarget(href);
  });

  let lastRouteHash = window.location.hash;
  let lastRouteTs = 0;
  const onRouteSync = () => {
    const raw = window.location.hash;
    const now = performance.now();
    if (raw === lastRouteHash && now - lastRouteTs < 80) return;
    lastRouteHash = raw;
    lastRouteTs = now;
    if (!raw || raw === '#') {
      setSector('dossier', { transition: true, updateUrl: false, scrollTop: true });
      return;
    }
    navigateToTarget(raw, { transition: true, updateUrl: false });
  };

  window.addEventListener('hashchange', onRouteSync);
  window.addEventListener('popstate', onRouteSync);

  window.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.repeat || e.isComposing) return;
    if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
    if (isTypingTarget(e.target)) return;
    if (isBlockedByOverlay()) return;

    const targetSector = KEY_TO_SECTOR[e.code] || KEY_TO_SECTOR[e.key];
    if (!targetSector) return;
    e.preventDefault();
    setSector(targetSector, { transition: true, updateUrl: true, scrollTop: true });
  });

  wireArenaLaunchpad();

  // Synchronous initial boot (zero flash of DOSSIER on direct deep links)
  const initialHash = window.location.hash;
  const resolved = initialHash && initialHash !== '#'
    ? resolveSectorForAnchor(initialHash)
    : { sector: 'dossier', anchor: null };

  appState.activeSector = resolved.sector;
  applyPanelsVisibility(resolved.sector, appState.navMode);
  if (appState.navMode === 'all') setupAllModeSpy();
  emitSectorChange(resolved.sector, resolved.sector, resolved.anchor);

  if (resolved.anchor) {
    scrollToTargetElement(resolved.anchor, null);
  } else if (appState.navMode === 'all' && resolved.sector !== 'dossier') {
    scrollToTargetElement(`sector-${resolved.sector}`, null);
  }

  return getSectorState();
}
