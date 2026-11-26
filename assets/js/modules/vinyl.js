import {
  VINYL_CACHE_KEY,
  VINYL_SHELF,
  escapeHtml,
  formatClock,
  sleep,
  fetchJsonWithTimeout
} from './config.js';

/* =========================================
   VINYL // AUDIO SHELF (iTUNES PREVIEW + SYNC)
   ========================================= */

const ITUNES_SEARCH_BASE = 'https://itunes.apple.com/search';
const ITUNES_LOOKUP_BASE = 'https://itunes.apple.com/lookup';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const QUEUE_CONCURRENCY = 2;
const QUEUE_DELAY_MS = 160;
const PREVIEW_VOLUME = 0.35;
const DEFAULT_PREVIEW_DURATION = 30;

const SVG_PLAY =
  '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><polygon points="4.5,3 13,8 4.5,13"/></svg>';
const SVG_PAUSE =
  '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" aria-hidden="true"><line x1="5.5" y1="3.5" x2="5.5" y2="12.5"/><line x1="10.5" y1="3.5" x2="10.5" y2="12.5"/></svg>';
const SVG_UNAVAILABLE =
  '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="8" cy="8" r="5.5"/><line x1="4.2" y1="4.2" x2="11.8" y2="11.8"/></svg>';

const PENALTY_KEYWORDS = [
  'karaoke',
  'tribute',
  'instrumental',
  'lullaby',
  'ringtone',
  '8-bit',
  '8 bit',
  'sped up',
  'slowed',
  'reverb',
  'nightcore',
  'piano cover',
  'acoustic cover',
  'made famous'
];

function normalizeCompact(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\u0400-\u04ff]+/gi, '');
}

function normalizeWords(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\u0400-\u04ff]+/gi, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function stripParens(str) {
  return String(str || '').replace(/\([^)]*\)|\[[^\]]*\]/g, ' ').trim();
}

function upgradeArtworkUrl(url) {
  if (!url) return '';
  return String(url).replace(/\d+x\d+bb\./i, '600x600bb.');
}

function extractReleaseYear(releaseDate, fallbackYear) {
  const m = /^(\d{4})/.exec(String(releaseDate || ''));
  if (m) {
    const yr = Number(m[1]);
    if (yr >= 1950 && yr <= 2035) return yr;
  }
  return fallbackYear;
}

function scoreItunesCandidate(cand, item, isFallback) {
  if (!cand || typeof cand !== 'object') return -1000;
  if (!cand.trackName && !cand.collectionName) return -1000;

  const targetArtist = normalizeCompact(item.artist);
  const candArtist = normalizeCompact(cand.artistName);
  const targetTitle = normalizeCompact(item.title);
  const targetTitleCore = normalizeCompact(stripParens(item.title));
  const candTitle = normalizeCompact(cand.trackName);
  const candTitleCore = normalizeCompact(stripParens(cand.trackName));
  const targetAlbum = normalizeCompact(item.album);
  const candAlbum = normalizeCompact(cand.collectionName);

  let artistScore = 0;
  if (candArtist && targetArtist) {
    if (candArtist === targetArtist) {
      artistScore = 60;
    } else if (candArtist.includes(targetArtist) || targetArtist.includes(candArtist)) {
      artistScore = 44;
    } else {
      const aWords = normalizeWords(item.artist);
      const cWords = new Set(normalizeWords(cand.artistName));
      const overlap = aWords.filter((w) => cWords.has(w)).length;
      if (overlap > 0 && overlap === aWords.length) artistScore = 36;
      else if (overlap > 0) artistScore = 18;
    }
  }

  if (artistScore === 0) return -500;

  let titleScore = 0;
  if (candTitle && targetTitle) {
    if (candTitle === targetTitle) {
      titleScore = 80;
    } else if (candTitleCore && targetTitleCore && candTitleCore === targetTitleCore) {
      titleScore = 70;
    } else if (candTitle.includes(targetTitle) || targetTitle.includes(candTitle)) {
      titleScore = 52;
    } else if (
      candTitleCore &&
      targetTitleCore &&
      (candTitleCore.includes(targetTitleCore) || targetTitleCore.includes(candTitleCore))
    ) {
      titleScore = 44;
    } else {
      const tWords = normalizeWords(stripParens(item.title));
      const cWords = new Set(normalizeWords(stripParens(cand.trackName)));
      const hits = tWords.filter((w) => w.length > 1 && cWords.has(w)).length;
      if (tWords.length > 0 && hits > 0) {
        titleScore = Math.round((hits / tWords.length) * 34);
      }
    }
  }

  if (isFallback && titleScore < 35) {
    const fbCompact = normalizeCompact(item.fallbackQuery);
    if (candTitle && targetAlbum && (candTitle === targetAlbum || candTitle.includes(targetAlbum))) {
      titleScore = Math.max(titleScore, 62);
    } else if (candTitle && fbCompact && fbCompact.includes(candTitle)) {
      titleScore = Math.max(titleScore, 56);
    } else if (candAlbum && targetAlbum && candAlbum.includes(targetAlbum)) {
      titleScore = Math.max(titleScore, 48);
    }
  }

  if (titleScore < 22) return -400;

  let total = artistScore + titleScore;

  if (candAlbum && targetAlbum) {
    if (candAlbum === targetAlbum) total += 18;
    else if (candAlbum.includes(targetAlbum) || targetAlbum.includes(candAlbum)) total += 12;
  }

  if (cand.previewUrl) total += 35;
  if (cand.artworkUrl100 || cand.artworkUrl60) total += 15;

  const rawText = `${cand.trackName || ''} ${cand.collectionName || ''} ${cand.artistName || ''}`.toLowerCase();
  const targetRaw = `${item.title || ''} ${item.album || ''} ${item.artist || ''}`.toLowerCase();
  for (let i = 0; i < PENALTY_KEYWORDS.length; i++) {
    const kw = PENALTY_KEYWORDS[i];
    if (rawText.includes(kw) && !targetRaw.includes(kw)) {
      total -= 70;
    }
  }

  if (/\blive\b/i.test(rawText) && !/\blive\b/i.test(targetRaw)) {
    total -= 22;
  }
  if (/\bremix\b/i.test(rawText) && !/\bremix\b/i.test(targetRaw)) {
    total -= 20;
  }

  return total;
}

function pickBestItunesMatch(results, item, isFallback) {
  if (!Array.isArray(results) || !results.length) return null;
  let best = null;
  let bestScore = -Infinity;

  for (let i = 0; i < results.length; i++) {
    const cand = results[i];
    const score = scoreItunesCandidate(cand, item, isFallback);
    if (score > bestScore) {
      bestScore = score;
      best = cand;
    }
  }

  if (!best || bestScore < 60) return null;
  return best;
}

function loadVinylCache() {
  try {
    const raw = localStorage.getItem(VINYL_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed.items && typeof parsed.items === 'object' ? parsed.items : {};
  } catch (e) {
    return {};
  }
}

function saveVinylCache(itemsMap) {
  try {
    localStorage.setItem(
      VINYL_CACHE_KEY,
      JSON.stringify({ updatedAt: Date.now(), items: itemsMap })
    );
  } catch (e) {}
}

function getCacheSignature(item) {
  return `${item.query || ''}|${item.fallbackQuery || ''}`;
}

function isCacheEntryFresh(entry, item) {
  if (!entry || typeof entry !== 'object') return false;
  if (!entry.ts || Date.now() - entry.ts > CACHE_TTL_MS) return false;
  if (entry.sig !== getCacheSignature(item)) return false;
  return true;
}

async function queryItunes(term) {
  const raw = String(term || '').trim();
  const isLookup = raw.startsWith('lookup:');
  const url = isLookup
    ? `${ITUNES_LOOKUP_BASE}?id=${encodeURIComponent(raw.slice(7).trim())}`
    : `${ITUNES_SEARCH_BASE}?term=${encodeURIComponent(raw)}&media=music&entity=song&limit=5`;
  try {
    const { ok, data } = await fetchJsonWithTimeout(url, {}, 8500);
    if (!ok || !data || !Array.isArray(data.results)) {
      return { ok: false, results: [] };
    }
    return { ok: true, results: data.results };
  } catch (e) {
    return { ok: false, results: [] };
  }
}

async function resolveTrackMeta(item) {
  const primary = await queryItunes(item.query);
  let match = primary.ok ? pickBestItunesMatch(primary.results, item, false) : null;
  let networkOk = primary.ok;

  if ((!match || !match.previewUrl) && item.fallbackQuery) {
    await sleep(QUEUE_DELAY_MS);
    const fallback = await queryItunes(item.fallbackQuery);
    networkOk = networkOk || fallback.ok;
    const fbMatch = fallback.ok ? pickBestItunesMatch(fallback.results, item, true) : null;
    if (fbMatch && (!match || (!match.previewUrl && fbMatch.previewUrl))) {
      match = fbMatch;
    }
  }

  if (!match) {
    return {
      networkOk,
      found: false,
      coverUrl: '',
      previewUrl: '',
      year: item.year
    };
  }

  return {
    networkOk: true,
    found: true,
    coverUrl: upgradeArtworkUrl(match.artworkUrl100 || match.artworkUrl60 || ''),
    previewUrl: match.previewUrl || '',
    year: extractReleaseYear(match.releaseDate, item.year)
  };
}

export function initVinylShelf(playerControls) {
  const section = document.getElementById('vinyl');
  const grid = document.getElementById('vinyl-grid');
  const countBadge = document.getElementById('vinyl-count-badge');
  const statusBadge = document.getElementById('vinyl-status-badge');
  const nowPlayingEl = document.getElementById('vinyl-now-playing');

  if (!section || !grid) return null;

  const cacheMap = loadVinylCache();
  const trackMetaMap = new Map();
  const cardEls = new Map();

  if (countBadge) {
    countBadge.textContent = `${VINYL_SHELF.length} LP`;
  }

  const previewAudio = new Audio();
  previewAudio.preload = 'none';
  previewAudio.volume = PREVIEW_VOLUME;

  let activeId = null;
  let isPlaying = false;
  let progressRafId = null;
  let syncStarted = false;
  let syncFinished = false;
  let loadedCount = 0;
  let readyCount = 0;
  let observer = null;

  function getItemById(id) {
    return VINYL_SHELF.find((x) => x.id === id) || null;
  }

  function updateHeaderStatus() {
    if (activeId) {
      const item = getItemById(activeId);
      const cur = previewAudio.currentTime || 0;
      const dur =
        isFinite(previewAudio.duration) && previewAudio.duration > 0
          ? previewAudio.duration
          : DEFAULT_PREVIEW_DURATION;
      if (statusBadge) {
        statusBadge.textContent = isPlaying
          ? `PLAYING · ${item ? item.catalogNo : ''}`
          : `PAUSED · ${item ? item.catalogNo : ''}`;
        statusBadge.classList.toggle('is-active-badge', isPlaying);
      }
      if (nowPlayingEl && item) {
        nowPlayingEl.textContent = `${item.catalogNo} · ${item.artist} — ${item.title} · ${formatClock(cur)} / ${formatClock(dur)}`;
      }
      return;
    }

    if (statusBadge) {
      statusBadge.classList.remove('is-active-badge');
      if (syncStarted && !syncFinished) {
        statusBadge.textContent = `SYNC ${String(loadedCount).padStart(2, '0')} / ${VINYL_SHELF.length}`;
      } else if (syncFinished) {
        statusBadge.textContent =
          readyCount > 0 ? `${readyCount} / ${VINYL_SHELF.length} READY` : 'OFFLINE · ARCHIVE';
      } else {
        statusBadge.textContent =
          readyCount === VINYL_SHELF.length
            ? `${readyCount} / ${VINYL_SHELF.length} READY`
            : 'STANDBY';
      }
    }

    if (nowPlayingEl) {
      if (syncStarted && !syncFinished) {
        nowPlayingEl.textContent = 'Подтягиваю обложки и 30с-превью из iTunes...';
      } else if (readyCount > 0) {
        nowPlayingEl.textContent = 'Нажми на любой конверт для 30с-превью · 33 RPM';
      } else {
        nowPlayingEl.textContent = 'Архивная полка · 33 RPM';
      }
    }
  }

  function setCardProgress(id, curSec, durSec) {
    const refs = cardEls.get(id);
    if (!refs) return;
    const safeDur = isFinite(durSec) && durSec > 0 ? durSec : DEFAULT_PREVIEW_DURATION;
    const safeCur = Math.max(0, Math.min(safeDur, isFinite(curSec) ? curSec : 0));
    const ratio = safeDur > 0 ? safeCur / safeDur : 0;
    if (refs.progFill) {
      refs.progFill.style.transform = `scaleX(${ratio.toFixed(4)})`;
    }
    if (refs.timerEl) {
      refs.timerEl.textContent = `${formatClock(safeCur)} / ${formatClock(safeDur)}`;
    }
  }

  function updateCardPlaybackClasses(id, state) {
    const refs = cardEls.get(id);
    if (!refs) return;
    const playing = state === 'playing';
    const paused = state === 'paused';
    refs.card.classList.toggle('is-playing', playing);
    refs.card.classList.toggle('is-paused', paused);
    if (refs.btn) {
      refs.btn.setAttribute('aria-pressed', String(playing));
    }
    if (refs.actionIcon) {
      const meta = trackMetaMap.get(id);
      if (meta && !meta.previewUrl && meta.resolved) {
        refs.actionIcon.innerHTML = SVG_UNAVAILABLE;
      } else {
        refs.actionIcon.innerHTML = playing ? SVG_PAUSE : SVG_PLAY;
      }
    }
  }

  function stopProgressRaf() {
    if (progressRafId !== null) {
      cancelAnimationFrame(progressRafId);
      progressRafId = null;
    }
  }

  function tickProgress() {
    progressRafId = null;
    if (!activeId || previewAudio.paused) return;
    const dur =
      isFinite(previewAudio.duration) && previewAudio.duration > 0
        ? previewAudio.duration
        : DEFAULT_PREVIEW_DURATION;
    setCardProgress(activeId, previewAudio.currentTime, dur);
    updateHeaderStatus();
    if (!document.hidden && !previewAudio.paused) {
      progressRafId = requestAnimationFrame(tickProgress);
    }
  }

  function startProgressRaf() {
    stopProgressRaf();
    if (!document.hidden && !previewAudio.paused && activeId) {
      progressRafId = requestAnimationFrame(tickProgress);
    }
  }

  function stopPreview(resetAll) {
    stopProgressRaf();
    const prevId = activeId;
    previewAudio.pause();
    isPlaying = false;
    if (resetAll) {
      try {
        previewAudio.currentTime = 0;
      } catch (e) {}
      if (prevId) {
        setCardProgress(prevId, 0, DEFAULT_PREVIEW_DURATION);
        updateCardPlaybackClasses(prevId, 'idle');
      }
      activeId = null;
    } else if (prevId) {
      updateCardPlaybackClasses(prevId, 'paused');
    }
    updateHeaderStatus();
  }

  function pauseMainPlayerIfNeeded() {
    if (
      playerControls &&
      typeof playerControls.isPlaying === 'function' &&
      typeof playerControls.pause === 'function' &&
      playerControls.isPlaying()
    ) {
      playerControls.pause();
    }
  }

  function toggleTrack(id) {
    const meta = trackMetaMap.get(id);
    const item = getItemById(id);
    if (!item || !meta || !meta.previewUrl) return;

    if (activeId === id) {
      if (!previewAudio.paused) {
        stopPreview(false);
        return;
      }
      pauseMainPlayerIfNeeded();
      const p = previewAudio.play();
      if (p && typeof p.then === 'function') {
        p.then(() => {
          isPlaying = true;
          updateCardPlaybackClasses(id, 'playing');
          startProgressRaf();
          updateHeaderStatus();
        }).catch(() => {
          stopPreview(true);
        });
      }
      return;
    }

    if (activeId) {
      const prevId = activeId;
      stopProgressRaf();
      previewAudio.pause();
      setCardProgress(prevId, 0, DEFAULT_PREVIEW_DURATION);
      updateCardPlaybackClasses(prevId, 'idle');
    }

    pauseMainPlayerIfNeeded();
    activeId = id;
    isPlaying = false;
    setCardProgress(id, 0, DEFAULT_PREVIEW_DURATION);
    previewAudio.src = meta.previewUrl;
    previewAudio.load();

    const p = previewAudio.play();
    if (p && typeof p.then === 'function') {
      p.then(() => {
        if (activeId !== id) return;
        isPlaying = true;
        updateCardPlaybackClasses(id, 'playing');
        startProgressRaf();
        updateHeaderStatus();
      }).catch(() => {
        if (activeId === id) {
          stopPreview(true);
        }
      });
    }
  }

  previewAudio.addEventListener('loadedmetadata', () => {
    if (!activeId) return;
    setCardProgress(activeId, previewAudio.currentTime, previewAudio.duration);
    updateHeaderStatus();
  });

  previewAudio.addEventListener('timeupdate', () => {
    if (!activeId) return;
    setCardProgress(activeId, previewAudio.currentTime, previewAudio.duration);
    updateHeaderStatus();
  });

  previewAudio.addEventListener('ended', () => {
    stopPreview(true);
  });

  previewAudio.addEventListener('error', () => {
    if (activeId) {
      stopPreview(true);
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopProgressRaf();
    } else if (activeId && !previewAudio.paused) {
      startProgressRaf();
    }
  });

  if (playerControls && typeof playerControls.onState === 'function') {
    playerControls.onState((snap) => {
      if (snap && snap.playing && (isPlaying || !previewAudio.paused)) {
        stopPreview(true);
      }
    });
  }

  function applyMetaToCard(item, meta) {
    const refs = cardEls.get(item.id);
    if (!refs) return;

    trackMetaMap.set(item.id, meta);

    const hasCover = Boolean(meta.coverUrl);
    const hasPreview = Boolean(meta.previewUrl);

    refs.card.classList.toggle('is-resolved', Boolean(meta.resolved));
    refs.card.classList.toggle('is-ready', hasPreview);
    refs.card.classList.toggle('is-no-preview', Boolean(meta.resolved) && !hasPreview);

    if (refs.yearEl) {
      refs.yearEl.textContent = String(meta.year || item.year);
    }

    if (refs.btn) {
      refs.btn.disabled = Boolean(meta.resolved) && !hasPreview;
      refs.btn.setAttribute(
        'aria-label',
        hasPreview
          ? `Превью ${item.catalogNo}: ${item.artist} — ${item.title}`
          : `${item.catalogNo}: ${item.artist} — ${item.title} (без превью)`
      );
    }

    if (refs.actionIcon && activeId !== item.id) {
      refs.actionIcon.innerHTML =
        Boolean(meta.resolved) && !hasPreview ? SVG_UNAVAILABLE : SVG_PLAY;
    }

    if (refs.fallbackNote) {
      if (Boolean(meta.resolved) && !hasPreview) {
        refs.fallbackNote.textContent = 'NO PREVIEW';
      } else if (!meta.resolved) {
        refs.fallbackNote.textContent = '33 RPM · LP';
      } else {
        refs.fallbackNote.textContent = '30S PREVIEW';
      }
    }

    if (hasCover && refs.coverSlot) {
      let img = refs.coverSlot.querySelector('img.vinyl-cover-img');
      if (!img) {
        img = document.createElement('img');
        img.className = 'vinyl-cover-img';
        img.alt = `${item.artist} — ${item.title}`;
        img.width = 300;
        img.height = 300;
        img.loading = 'lazy';
        img.decoding = 'async';
        img.referrerPolicy = 'no-referrer';
        img.addEventListener('load', () => {
          img.classList.add('is-loaded');
          refs.card.classList.add('has-cover');
        });
        img.addEventListener('error', () => {
          img.remove();
          refs.card.classList.remove('has-cover');
        });
        refs.coverSlot.appendChild(img);
      }
      if (img.src !== meta.coverUrl) {
        img.src = meta.coverUrl;
      }
    }
  }

  function renderInitialCards() {
    const frag = document.createDocumentFragment();
    readyCount = 0;

    VINYL_SHELF.forEach((item) => {
      const cached = cacheMap[item.id];
      const fresh = isCacheEntryFresh(cached, item);
      const initialMeta = fresh
        ? {
            resolved: true,
            found: Boolean(cached.found),
            coverUrl: cached.coverUrl || '',
            previewUrl: cached.previewUrl || '',
            year: cached.year || item.year
          }
        : {
            resolved: false,
            found: false,
            coverUrl: '',
            previewUrl: '',
            year: item.year
          };

      if (initialMeta.previewUrl) readyCount++;

      const card = document.createElement('article');
      card.className = 'vinyl-card';
      card.setAttribute('role', 'listitem');
      card.dataset.vinylId = item.id;
      card.innerHTML = `
        <div class="vinyl-stage">
          <div class="vinyl-sleeve-frame">
            <div class="vinyl-disc-slot" aria-hidden="true">
              <div class="vinyl-disc">
                <span class="vinyl-disc-label">
                  <span class="vinyl-disc-code">${escapeHtml(item.catalogNo)}</span>
                  <span class="vinyl-disc-rpm">33 RPM</span>
                </span>
              </div>
            </div>
            <button type="button" class="vinyl-sleeve-btn" aria-pressed="false" aria-label="Превью ${escapeHtml(item.catalogNo)}: ${escapeHtml(item.artist)} — ${escapeHtml(item.title)}">
              <div class="vinyl-sleeve">
                <div class="vinyl-typo-fallback" aria-hidden="true">
                  <span class="vinyl-typo-cat">${escapeHtml(item.catalogNo)}</span>
                  <span class="vinyl-typo-artist">${escapeHtml(item.artist)}</span>
                  <span class="vinyl-typo-title">${escapeHtml(item.title)}</span>
                  <span class="vinyl-typo-badge">33 RPM · LP</span>
                </div>
                <div class="vinyl-cover-slot"></div>
                <span class="vinyl-stamp">${escapeHtml(item.catalogNo)} · 33 RPM</span>
                <span class="vinyl-play-indicator" aria-hidden="true">${SVG_PLAY}</span>
                <div class="vinyl-progress-bar" aria-hidden="true">
                  <div class="vinyl-progress-meta">
                    <span class="vinyl-progress-label">PREVIEW</span>
                    <span class="vinyl-timer">0:00 / 0:30</span>
                  </div>
                  <div class="vinyl-progress-track">
                    <div class="vinyl-progress-fill"></div>
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>
        <div class="vinyl-meta">
          <div class="vinyl-meta-top">
            <span class="vinyl-tag">${escapeHtml(item.tag)}</span>
            <span class="vinyl-year">${escapeHtml(String(initialMeta.year))}</span>
          </div>
          <div class="vinyl-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</div>
          <div class="vinyl-sub" title="${escapeHtml(item.artist)} · ${escapeHtml(item.album)}">${escapeHtml(item.artist)} · ${escapeHtml(item.album)}</div>
        </div>
      `;

      const btn = card.querySelector('.vinyl-sleeve-btn');
      const coverSlot = card.querySelector('.vinyl-cover-slot');
      const yearEl = card.querySelector('.vinyl-year');
      const actionIcon = card.querySelector('.vinyl-play-indicator');
      const progFill = card.querySelector('.vinyl-progress-fill');
      const timerEl = card.querySelector('.vinyl-timer');
      const fallbackNote = card.querySelector('.vinyl-typo-badge');

      btn?.addEventListener('click', () => toggleTrack(item.id));

      cardEls.set(item.id, {
        card,
        btn,
        coverSlot,
        yearEl,
        actionIcon,
        progFill,
        timerEl,
        fallbackNote
      });

      applyMetaToCard(item, initialMeta);
      frag.appendChild(card);
    });

    grid.innerHTML = '';
    grid.appendChild(frag);
    updateHeaderStatus();
  }

  async function runMetadataQueue() {
    if (syncStarted) return;
    syncStarted = true;

    const pending = VINYL_SHELF.filter((item) => !isCacheEntryFresh(cacheMap[item.id], item));
    loadedCount = VINYL_SHELF.length - pending.length;

    if (!pending.length) {
      syncFinished = true;
      updateHeaderStatus();
      return;
    }

    updateHeaderStatus();

    let cursor = 0;

    async function worker() {
      while (cursor < pending.length) {
        const idx = cursor++;
        const item = pending[idx];
        const res = await resolveTrackMeta(item);

        const nextMeta = {
          resolved: true,
          found: res.found,
          coverUrl: res.coverUrl,
          previewUrl: res.previewUrl,
          year: res.year
        };

        if (nextMeta.previewUrl) readyCount++;
        loadedCount++;
        applyMetaToCard(item, nextMeta);

        if (res.networkOk) {
          cacheMap[item.id] = {
            ts: Date.now(),
            sig: getCacheSignature(item),
            found: res.found,
            coverUrl: res.coverUrl,
            previewUrl: res.previewUrl,
            year: res.year
          };
          saveVinylCache(cacheMap);
        }

        updateHeaderStatus();
        if (cursor < pending.length) {
          await sleep(QUEUE_DELAY_MS);
        }
      }
    }

    const workers = [];
    const count = Math.min(QUEUE_CONCURRENCY, pending.length);
    for (let w = 0; w < count; w++) {
      workers.push(worker());
    }
    await Promise.all(workers);

    syncFinished = true;
    updateHeaderStatus();
  }

  function maybeLoadIfVisible() {
    if (syncStarted) return;
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
      runMetadataQueue();
    }
  }

  renderInitialCards();

  document.addEventListener('archive:sectorchange', () => {
    if (syncStarted) return;
    requestAnimationFrame(maybeLoadIfVisible);
  });

  if (typeof IntersectionObserver !== 'function') {
    requestAnimationFrame(maybeLoadIfVisible);
  } else {
    observer = new IntersectionObserver(
      (entries) => {
        if (syncStarted || section.closest('[hidden]')) return;
        for (let i = 0; i < entries.length; i++) {
          const entry = entries[i];
          const rect = entry.boundingClientRect;
          if (rect.width === 0 && rect.height === 0) continue;
          if (entry.isIntersecting || rect.top <= window.innerHeight + 420) {
            observer.disconnect();
            observer = null;
            runMetadataQueue();
            break;
          }
        }
      },
      { rootMargin: '420px 0px', threshold: 0.01 }
    );
    observer.observe(section);
    requestAnimationFrame(maybeLoadIfVisible);
  }

  return {
    stop: () => stopPreview(true),
    isPlaying: () => isPlaying
  };
}
