/* =========================================
   GUESTBOOK MODULE (LAZY GISCUS / DISCUSSIONS)
   ========================================= */

const GISCUS_ORIGIN = 'https://giscus.app';
const GISCUS_SCRIPT_SRC = `${GISCUS_ORIGIN}/client.js`;
const CUSTOM_THEME_URL = 'https://undexerorrr.github.io/assets/css/giscus-noir.css';

const GISCUS_CONFIG = {
  repo: 'undexerorrr/undexerorrr.github.io',
  repoId: 'R_kgDOV4EzMQ',
  category: 'General',
  categoryId: 'DIC_kwDOV4EzMc4DL5GC',
  mapping: 'specific',
  term: 'undexeror-archive-guestbook',
  strict: '0',
  reactionsEnabled: '1',
  emitMetadata: '0',
  inputPosition: 'top',
  lang: 'ru'
};

function resolveGiscusTheme() {
  const { hostname, protocol } = window.location;
  const isLocal =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    protocol === 'file:';
  return isLocal ? 'transparent_dark' : CUSTOM_THEME_URL;
}

export function initGuestbook() {
  const section = document.getElementById('guestbook');
  const stage = document.getElementById('guestbook-stage');
  const mount = document.getElementById('guestbook-mount');
  const badge = document.getElementById('guestbook-status-badge');
  const skelNote = document.getElementById('guestbook-skel-note');

  if (!section || !stage || !mount) return;

  let loaded = false;
  let hasGiscusError = false;
  let hasSoftNotice = false;
  let loadTimer = null;

  const setStatus = (state, badgeText, noteText) => {
    stage.dataset.state = state;
    if (badge && badgeText) badge.textContent = badgeText;
    if (skelNote && noteText) skelNote.textContent = noteText;
  };

  const onMessage = (event) => {
    if (event.origin !== GISCUS_ORIGIN) return;
    const payload = event.data && event.data.giscus;
    if (!payload || typeof payload !== 'object') return;

    if (loadTimer) {
      clearTimeout(loadTimer);
      loadTimer = null;
    }

    if (payload.error) {
      const isSetupMissing = String(payload.error).toLowerCase().includes('not installed');
      const iframePresent = Boolean(mount.querySelector('iframe.giscus-frame'));
      if (isSetupMissing) {
        hasGiscusError = true;
        setStatus(
          iframePresent ? 'loaded' : 'error',
          'SETUP',
          'Нужно установить GitHub App Giscus на репозиторий.'
        );
        return;
      }
      if (iframePresent) {
        hasSoftNotice = true;
        setStatus('loaded', 'READY');
        return;
      }
      hasGiscusError = true;
      setStatus(
        'error',
        'OFFLINE',
        'Giscus временно недоступен — открой Discussions ↗'
      );
      return;
    }

    if (!hasGiscusError && !hasSoftNotice) {
      setStatus('loaded', 'LIVE');
    }
  };

  const injectGiscus = () => {
    if (loaded) return;
    loaded = true;

    window.addEventListener('message', onMessage);
    setStatus('loading', 'SYNC...', 'Подключение к GitHub Discussions...');

    const frameObserver = new MutationObserver(() => {
      const iframe = mount.querySelector('iframe.giscus-frame');
      if (!iframe) return;
      frameObserver.disconnect();
      iframe.addEventListener(
        'load',
        () => {
          if (loadTimer) {
            clearTimeout(loadTimer);
            loadTimer = null;
          }
          if (hasGiscusError || hasSoftNotice) {
            stage.dataset.state = 'loaded';
          } else {
            setStatus('loaded', 'LIVE');
          }
        },
        { once: true }
      );
    });
    frameObserver.observe(mount, { childList: true, subtree: true });

    const script = document.createElement('script');
    script.src = GISCUS_SCRIPT_SRC;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.dataset.repo = GISCUS_CONFIG.repo;
    script.dataset.repoId = GISCUS_CONFIG.repoId;
    script.dataset.category = GISCUS_CONFIG.category;
    script.dataset.categoryId = GISCUS_CONFIG.categoryId;
    script.dataset.mapping = GISCUS_CONFIG.mapping;
    script.dataset.term = GISCUS_CONFIG.term;
    script.dataset.strict = GISCUS_CONFIG.strict;
    script.dataset.reactionsEnabled = GISCUS_CONFIG.reactionsEnabled;
    script.dataset.emitMetadata = GISCUS_CONFIG.emitMetadata;
    script.dataset.inputPosition = GISCUS_CONFIG.inputPosition;
    script.dataset.theme = resolveGiscusTheme();
    script.dataset.lang = GISCUS_CONFIG.lang;

    script.onerror = () => {
      frameObserver.disconnect();
      if (loadTimer) {
        clearTimeout(loadTimer);
        loadTimer = null;
      }
      setStatus(
        'error',
        'OFFLINE',
        'Не удалось загрузить Giscus — открой Discussions напрямую ↗'
      );
    };

    loadTimer = window.setTimeout(() => {
      if (stage.dataset.state === 'loading' && skelNote) {
        skelNote.textContent = 'Загрузка занимает дольше обычного · Discussions ↗';
      }
    }, 12000);

    mount.appendChild(script);
  };

  let observer = null;

  const maybeLoadIfVisible = () => {
    if (loaded) return;
    if (section.closest('[hidden]')) return;
    const main = document.querySelector('main.container');
    const isAllMode = main && main.dataset.navMode === 'all';
    const rect = section.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;

    if (!isAllMode || rect.top <= window.innerHeight + 420) {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      injectGiscus();
    }
  };

  document.addEventListener('archive:sectorchange', () => {
    if (loaded) return;
    requestAnimationFrame(maybeLoadIfVisible);
  });

  if (typeof IntersectionObserver !== 'function') {
    requestAnimationFrame(maybeLoadIfVisible);
    return;
  }

  observer = new IntersectionObserver(
    (entries) => {
      if (loaded || section.closest('[hidden]')) return;
      for (const entry of entries) {
        const rect = entry.boundingClientRect;
        if (rect.width === 0 && rect.height === 0) continue;
        if (entry.isIntersecting || rect.top <= window.innerHeight + 420) {
          observer.disconnect();
          observer = null;
          injectGiscus();
          break;
        }
      }
    },
    { rootMargin: '420px 0px', threshold: 0.01 }
  );

  observer.observe(section);
  requestAnimationFrame(maybeLoadIfVisible);
}
