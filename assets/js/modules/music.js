import {
  VOLUME_STORAGE_KEY,
  DEFAULT_VOLUME,
  PLAYLIST,
  SPOTIFY_PLAYLISTS,
  DISCORD_USER_ID,
  formatRank,
  formatClock,
  escapeHtml,
  fetchWithTimeout
} from './config.js';
import { appState } from './data.js';

/* =========================================
   BEAT-REACTIVE PLAYLIST PLAYER (REAL TRACKS + ANALYSER)
   ========================================= */
export function initMusicPlayer() {
  const audio = new Audio();
  audio.preload = 'metadata';

  function loadSavedVolume() {
    try {
      const raw = localStorage.getItem(VOLUME_STORAGE_KEY);
      if (raw !== null && raw !== '') {
        const num = Number(raw);
        if (isFinite(num) && num >= 0 && num <= 1) return num;
      }
    } catch (e) {}
    return DEFAULT_VOLUME;
  }

  function saveVolume(val) {
    try {
      localStorage.setItem(VOLUME_STORAGE_KEY, String(Math.round(val * 100) / 100));
    } catch (e) {}
  }

  let targetVolume = loadSavedVolume();
  let fadeRafId = null;
  let hasStartedOnce = false;
  audio.volume = targetVolume;

  const isHttp = location.protocol === 'http:' || location.protocol === 'https:';
  if (isHttp) audio.crossOrigin = 'anonymous';

  const dock = document.getElementById('music-dock');
  const dockPlayBtn = document.getElementById('dock-play-btn');
  const dockPrevBtn = document.getElementById('dock-prev-btn');
  const dockNextBtn = document.getElementById('dock-next-btn');
  const dockListBtn = document.getElementById('dock-list-btn');
  const dockMinBtn = document.getElementById('dock-min-btn');
  const dockTitle = document.getElementById('dock-title');
  const dockArtist = document.getElementById('dock-artist');
  const dockCurTime = document.getElementById('dock-cur-time');
  const dockDurTime = document.getElementById('dock-dur-time');
  const dockSeek = document.getElementById('dock-seek');
  const dockVolume = document.getElementById('dock-volume');
  const dockStatusNote = document.getElementById('dock-status-note');
  const dockPlaylist = document.getElementById('dock-playlist');

  const topBtn = document.getElementById('audio-toggle-btn');
  const topIcon = document.getElementById('audio-icon');
  const topLabel = document.getElementById('topbar-track-label');

  const visCanvas = document.getElementById('visualizer-canvas');
  const visCtx = visCanvas ? visCanvas.getContext('2d') : null;

  let trackIdx = 0;
  let isPlaying = false;
  let isSeeking = false;
  let candidateUrls = [];
  let candidateCursor = 0;

  let audioCtx = null;
  let analyser = null;
  let freqData = null;
  let analyserConnected = false;

  // Подписчики внешних модулей (Cinema Mode): переиспользуем один AudioContext/analyser и один RAF-цикл.
  const stateListeners = [];
  const frameListeners = [];

  function notifyState() {
    const snap = { playing: isPlaying, track: PLAYLIST[trackIdx] || null };
    for (let i = 0; i < stateListeners.length; i++) stateListeners[i](snap);
  }

  function buildCandidates(track) {
    const urls = [];
    (track.files || []).forEach((fname) => {
      const enc = encodeURIComponent(fname);
      urls.push('./music/' + enc);
      urls.push('./' + enc);
    });
    return urls;
  }

  function renderPlaylistUI() {
    if (!dockPlaylist) return;
    dockPlaylist.innerHTML = PLAYLIST.map((t, i) => `
      <button type="button" class="track-row ${i === trackIdx ? 'is-current' : ''}" data-idx="${i}">
        <span class="track-num">${formatRank(i + 1)}</span>
        <div class="track-row-info">
          <div class="track-row-title">${escapeHtml(t.title)}</div>
          <div class="track-row-artist">${escapeHtml(t.artist)}</div>
        </div>
      </button>
    `).join('');

    dockPlaylist.querySelectorAll('.track-row').forEach((row) => {
      row.addEventListener('click', () => {
        const idx = Number(row.dataset.idx);
        loadTrack(idx, true);
      });
    });
  }

  function updatePlayUI() {
    const symbol = isPlaying ? '❚❚' : '▶';
    if (dockPlayBtn) dockPlayBtn.textContent = symbol;
    if (topIcon) topIcon.textContent = symbol;
    if (topBtn) topBtn.classList.toggle('is-playing', isPlaying);
    document.body.classList.toggle('is-audio-playing', isPlaying);
    if (typeof syncVisualizer === 'function') syncVisualizer();
    notifyState();
  }

  function setupAnalyser() {
    if (analyserConnected || !isHttp) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      audioCtx = new AudioCtx();
      const source = audioCtx.createMediaElementSource(audio);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.76;
      source.connect(analyser);
      analyser.connect(audioCtx.destination);
      freqData = new Uint8Array(analyser.frequencyBinCount);
      analyserConnected = true;
    } catch (e) {
      analyser = null;
    }
  }

  function loadTrack(idx, autoplay) {
    trackIdx = (idx + PLAYLIST.length) % PLAYLIST.length;
    const track = PLAYLIST[trackIdx];
    if (dockTitle) dockTitle.textContent = track.title;
    if (dockArtist) dockArtist.textContent = track.artist;
    if (topLabel) topLabel.textContent = track.title;
    if (dockStatusNote) dockStatusNote.textContent = `TRACK ${formatRank(trackIdx + 1)} / ${formatRank(PLAYLIST.length)} · BEAT-SYNC`;
    if (dockCurTime) dockCurTime.textContent = '0:00';
    if (dockDurTime) dockDurTime.textContent = '0:00';
    if (dockSeek) dockSeek.value = '0';

    candidateUrls = buildCandidates(track);
    candidateCursor = 0;
    audio.src = candidateUrls[0] || '';
    audio.load();
    renderPlaylistUI();
    notifyState();

    if (autoplay) {
      playCurrent();
    }
  }

  if (dockVolume) {
    dockVolume.value = String(targetVolume);
  }

  function cancelVolumeFade(restoreTarget) {
    if (fadeRafId !== null) {
      cancelAnimationFrame(fadeRafId);
      fadeRafId = null;
    }
    if (restoreTarget) {
      audio.volume = targetVolume;
    }
  }

  function startVolumeFadeIn(durationMs) {
    cancelVolumeFade(false);
    const goal = targetVolume;
    if (goal <= 0.001) {
      audio.volume = 0;
      return;
    }
    audio.volume = 0;
    const startAt = performance.now();
    function stepFade(now) {
      const progress = Math.min(1, (now - startAt) / durationMs);
      // Smooth ease-out curve for gentle onset
      const eased = 1 - Math.pow(1 - progress, 2);
      audio.volume = Math.max(0, Math.min(1, goal * eased));
      if (progress < 1 && !audio.paused) {
        fadeRafId = requestAnimationFrame(stepFade);
      } else {
        fadeRafId = null;
        audio.volume = targetVolume;
      }
    }
    fadeRafId = requestAnimationFrame(stepFade);
  }

  function playCurrent(opts) {
    setupAnalyser();
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    const shouldFade = Boolean((opts && opts.fadeIn) || !hasStartedOnce);
    if (shouldFade) {
      cancelVolumeFade(false);
      audio.volume = 0;
    } else {
      cancelVolumeFade(true);
    }

    const p = audio.play();
    if (p && typeof p.then === 'function') {
      p.then(() => {
        isPlaying = true;
        hasStartedOnce = true;
        updatePlayUI();
        if (shouldFade) startVolumeFadeIn(1200);
      }).catch(() => {
        isPlaying = false;
        cancelVolumeFade(true);
        updatePlayUI();
      });
    } else {
      isPlaying = true;
      hasStartedOnce = true;
      updatePlayUI();
      if (shouldFade) startVolumeFadeIn(1200);
    }
  }

  function pauseCurrent() {
    cancelVolumeFade(true);
    audio.pause();
    isPlaying = false;
    updatePlayUI();
  }

  function togglePlay() {
    if (isPlaying) pauseCurrent();
    else playCurrent();
  }

  audio.addEventListener('error', () => {
    candidateCursor++;
    if (candidateCursor < candidateUrls.length) {
      audio.src = candidateUrls[candidateCursor];
      audio.load();
      if (isPlaying) playCurrent();
    } else {
      isPlaying = false;
      updatePlayUI();
      if (dockStatusNote) {
        dockStatusNote.textContent = 'Закинь аудиофайлы в папку сайта';
      }
    }
  });

  audio.addEventListener('loadedmetadata', () => {
    if (dockDurTime) dockDurTime.textContent = formatClock(audio.duration);
  });

  audio.addEventListener('timeupdate', () => {
    if (dockCurTime) dockCurTime.textContent = formatClock(audio.currentTime);
    if (!isSeeking && dockSeek && audio.duration) {
      dockSeek.value = String((audio.currentTime / audio.duration) * 100);
    }
  });

  audio.addEventListener('ended', () => {
    loadTrack(trackIdx + 1, true);
  });

  dockPlayBtn?.addEventListener('click', togglePlay);
  topBtn?.addEventListener('click', togglePlay);
  dockPrevBtn?.addEventListener('click', () => loadTrack(trackIdx - 1, true));
  dockNextBtn?.addEventListener('click', () => loadTrack(trackIdx + 1, true));

  dockListBtn?.addEventListener('click', () => {
    const open = dockPlaylist.classList.toggle('is-open');
    dockListBtn.classList.toggle('active', open);
  });

  dockMinBtn?.addEventListener('click', () => {
    const min = dock.classList.toggle('is-minimized');
    dockMinBtn.textContent = min ? '+' : '–';
  });

  dockSeek?.addEventListener('input', () => {
    isSeeking = true;
    if (audio.duration && dockCurTime) {
      dockCurTime.textContent = formatClock((Number(dockSeek.value) / 100) * audio.duration);
    }
  });

  dockSeek?.addEventListener('change', () => {
    if (audio.duration) {
      audio.currentTime = (Number(dockSeek.value) / 100) * audio.duration;
    }
    isSeeking = false;
  });

  dockVolume?.addEventListener('input', () => {
    const v = Math.max(0, Math.min(1, Number(dockVolume.value)));
    targetVolume = isFinite(v) ? v : DEFAULT_VOLUME;
    cancelVolumeFade(false);
    audio.volume = targetVolume;
    saveVolume(targetVolume);
  });

  // Visualizer + Beat-Reactive Avatar Ring Loop (on-demand RAF — zero idle overhead)
  let smoothBeat = 0;
  let lastWrittenBeat = -1;
  let fallbackPhase = 0;
  let visRafId = null;
  const avatarBeatHost = document.querySelector('.avatar-wrap');

  function drawIdleBaseline() {
    if (!visCtx || !visCanvas) return;
    const vw = visCanvas.width;
    const vh = visCanvas.height;
    const barCount = 24;
    const gap = 3;
    const barW = (vw - gap * (barCount - 1)) / barCount;
    visCtx.clearRect(0, 0, vw, vh);
    visCtx.fillStyle = 'rgba(173, 191, 222, 0.22)';
    for (let i = 0; i < barCount; i++) {
      visCtx.fillRect(i * (barW + gap), vh - 2, barW, 2);
    }
  }

  function writeBeatEnergy(val) {
    if (Math.abs(val - lastWrittenBeat) <= 0.004) return;
    lastWrittenBeat = val;
    const bStr = val.toFixed(3);
    if (avatarBeatHost) avatarBeatHost.style.setProperty('--beat-energy', bStr);
    if (dock) dock.style.setProperty('--beat-energy', bStr);
  }

  function shouldRunVisualizer() {
    if (document.hidden) return false;
    if (document.body.classList.contains('galaxy-active')) return false;
    return isPlaying || smoothBeat > 0.004;
  }

  function stopVisualizerLoop() {
    if (visRafId !== null) {
      cancelAnimationFrame(visRafId);
      visRafId = null;
    }
  }

  function syncVisualizer() {
    if (shouldRunVisualizer()) {
      if (visRafId === null) {
        visRafId = requestAnimationFrame(visualizerFrame);
      }
    } else {
      stopVisualizerLoop();
      if (!isPlaying) {
        smoothBeat = 0;
        appState.liveBeatEnergy = 0;
        writeBeatEnergy(0);
        drawIdleBaseline();
      }
    }
  }

  function visualizerFrame() {
    visRafId = null;
    if (!shouldRunVisualizer()) {
      if (!isPlaying) {
        smoothBeat = 0;
        appState.liveBeatEnergy = 0;
        writeBeatEnergy(0);
        drawIdleBaseline();
      }
      return;
    }

    let targetEnergy = 0;
    const barCount = 24;

    if (visCtx && visCanvas) {
      const vw = visCanvas.width;
      const vh = visCanvas.height;
      visCtx.clearRect(0, 0, vw, vh);

      if (isPlaying && analyser && freqData) {
        analyser.getByteFrequencyData(freqData);
        let bassSum = 0;
        for (let b = 0; b < 6; b++) bassSum += freqData[b];
        const bassNorm = bassSum / (6 * 255);
        targetEnergy = Math.pow(Math.max(0, (bassNorm - 0.12) / 0.88), 1.35);

        const gap = 3;
        const barW = (vw - gap * (barCount - 1)) / barCount;
        for (let i = 0; i < barCount; i++) {
          const bin = Math.min(freqData.length - 1, Math.floor(i * 1.4));
          const v = freqData[bin] / 255;
          const bh = Math.max(2, v * (vh - 2));
          const x = i * (barW + gap);
          const y = vh - bh;
          const grad = visCtx.createLinearGradient(0, vh, 0, y);
          grad.addColorStop(0, 'rgba(173, 191, 222, 0.45)');
          grad.addColorStop(1, 'rgba(245, 248, 255, 0.95)');
          visCtx.fillStyle = grad;
          visCtx.fillRect(x, y, barW, bh);
        }
      } else if (isPlaying) {
        fallbackPhase += 0.14;
        targetEnergy = 0.25 + 0.35 * Math.pow((Math.sin(fallbackPhase * 1.7) + 1) * 0.5, 2);
        const gap = 3;
        const barW = (vw - gap * (barCount - 1)) / barCount;
        for (let i = 0; i < barCount; i++) {
          const v = 0.18 + 0.65 * Math.abs(Math.sin(fallbackPhase + i * 0.45));
          const bh = Math.max(2, v * (vh - 4));
          visCtx.fillStyle = 'rgba(195, 210, 235, 0.72)';
          visCtx.fillRect(i * (barW + gap), vh - bh, barW, bh);
        }
      } else {
        drawIdleBaseline();
      }
    }

    smoothBeat += (targetEnergy - smoothBeat) * (targetEnergy > smoothBeat ? 0.38 : 0.16);
    if (!isPlaying && smoothBeat < 0.004) smoothBeat = 0;
    appState.liveBeatEnergy = smoothBeat;
    writeBeatEnergy(smoothBeat);
    if (frameListeners.length) {
      const liveFreq = isPlaying && analyser && freqData ? freqData : null;
      for (let i = 0; i < frameListeners.length; i++) frameListeners[i](liveFreq, smoothBeat, isPlaying);
    }

    if (shouldRunVisualizer()) {
      visRafId = requestAnimationFrame(visualizerFrame);
    } else if (!isPlaying) {
      drawIdleBaseline();
    }
  }

  document.addEventListener('visibilitychange', syncVisualizer);
  loadTrack(0, false);
  drawIdleBaseline();

  return {
    play: playCurrent,
    pause: pauseCurrent,
    isPlaying: () => isPlaying,
    toggle: togglePlay,
    next: () => loadTrack(trackIdx + 1, true),
    prev: () => loadTrack(trackIdx - 1, true),
    getTrack: () => PLAYLIST[trackIdx] || null,
    getTrackIndex: () => trackIdx,
    playTrack(idx) {
      if (idx === trackIdx) {
        if (!isPlaying) playCurrent();
        return;
      }
      loadTrack(idx, true);
    },
    onState(fn) {
      stateListeners.push(fn);
      fn({ playing: isPlaying, track: PLAYLIST[trackIdx] || null });
    },
    onFrame(fn) {
      frameListeners.push(fn);
    },
    syncVisualizer
  };
}

/* =========================================
   SPOTIFY PLAYLISTS DRAWER (3 PLAYLISTS)
   ========================================= */
export function initSpotifyDrawer(player) {
  const drawer = document.getElementById('spotify-drawer');
  const backdrop = document.getElementById('spotify-backdrop');
  const closeBtn = document.getElementById('spotify-close-btn');
  const tabsWrap = document.getElementById('spotify-tabs');
  const iframe = document.getElementById('spotify-iframe');
  const extLink = document.getElementById('spotify-ext-link');

  if (!drawer || !tabsWrap || !iframe) return;

  let activeIdx = 0;
  let hasLoadedEmbed = false;

  function renderTabs() {
    tabsWrap.innerHTML = SPOTIFY_PLAYLISTS.map((pl, idx) => `
      <button type="button" class="spotify-tab ${idx === activeIdx ? 'active' : ''}" data-sp-idx="${idx}" title="${escapeHtml(pl.label)}">
        ${escapeHtml(pl.label)}
      </button>
    `).join('');

    tabsWrap.querySelectorAll('.spotify-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectPlaylist(Number(btn.dataset.spIdx));
      });
    });
  }

  function selectPlaylist(idx) {
    activeIdx = idx;
    const pl = SPOTIFY_PLAYLISTS[idx];
    if (!pl) return;
    renderTabs();
    iframe.src = `https://open.spotify.com/embed/playlist/${pl.id}?utm_source=generator&theme=0`;
    if (extLink) extLink.href = pl.url;
    hasLoadedEmbed = true;
  }

  function openDrawer() {
    if (!hasLoadedEmbed) {
      selectPlaylist(activeIdx);
    }
    drawer.classList.add('is-open');
    backdrop?.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    backdrop?.setAttribute('aria-hidden', 'false');
  }

  function closeDrawer() {
    drawer.classList.remove('is-open');
    backdrop?.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    backdrop?.setAttribute('aria-hidden', 'true');
  }

  document.getElementById('hero-spotify-btn')?.addEventListener('click', openDrawer);
  document.getElementById('discord-spotify-btn')?.addEventListener('click', openDrawer);
  document.getElementById('dock-spotify-btn')?.addEventListener('click', openDrawer);
  closeBtn?.addEventListener('click', closeDrawer);
  backdrop?.addEventListener('click', closeDrawer);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('is-open')) closeDrawer();
  });

  renderTabs();

  // Try fetching actual Spotify playlist titles via public oEmbed
  SPOTIFY_PLAYLISTS.forEach((pl, idx) => {
    fetchWithTimeout(`https://open.spotify.com/oembed?url=${encodeURIComponent(pl.url)}`, {}, 6500)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && data.title) {
          SPOTIFY_PLAYLISTS[idx].label = `${formatRank(idx + 1)} · ${data.title}`;
          renderTabs();
        }
      })
      .catch(() => {});
  });
}

/* =========================================
   LIVE DISCORD / SPOTIFY PRESENCE (LANYARD API)
   ========================================= */
export function initLanyardPresence() {
  const card = document.getElementById('discord-card');
  const artEl = document.getElementById('discord-art');
  const dotEl = document.getElementById('discord-status-dot');
  const stateLabelEl = document.getElementById('discord-state-label');
  const userEl = document.getElementById('discord-username');
  const titleEl = document.getElementById('discord-main-title');
  const subEl = document.getElementById('discord-sub');
  const spProgWrap = document.getElementById('spotify-progress');
  const spCurEl = document.getElementById('sp-time-cur');
  const spEndEl = document.getElementById('sp-time-end');
  const spFillEl = document.getElementById('sp-bar-fill');

  if (!card) return;

  let currentSpotify = null;
  let currentActivityStart = null;
  let ws = null;
  let hbTimer = null;
  let reconnectDelay = 2000;

  const STATUS_MAP = {
    online:  'ONLINE',
    idle:    'IDLE',
    dnd:     'DO NOT DISTURB',
    offline: 'OFFLINE'
  };

  function resolveActivityImage(act) {
    const large = act?.assets?.large_image;
    if (!large) return '';
    if (large.startsWith('mp:external/')) {
      return 'https://media.discordapp.net/' + large.slice(3);
    }
    if (large.startsWith('spotify:')) {
      return 'https://i.scdn.co/image/' + large.slice(8);
    }
    if (/^https?:\/\//i.test(large)) return large;
    if (act.application_id) {
      return `https://cdn.discordapp.com/app-assets/${act.application_id}/${large}.png`;
    }
    return '';
  }

  function setTitleContent(text, href) {
    if (!titleEl) return;
    if (href) {
      titleEl.innerHTML = `<a class="discord-main-title" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(text)}</a>`;
    } else {
      titleEl.textContent = text;
    }
  }

  function renderPresence(d) {
    if (!d) return;
    const status = d.discord_status || 'offline';
    const u = d.discord_user || {};
    const displayName = u.global_name || u.display_name || u.username || 'undexeror';
    const userAvatar = u.avatar
      ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.${u.avatar.startsWith('a_') ? 'gif' : 'webp'}?size=128`
      : 'https://shikimori.one/system/users/x160/1308586.png';

    if (dotEl) {
      dotEl.className = 'discord-status-badge ' + status;
    }
    if (userEl) {
      userEl.textContent = u.username ? `@${u.username}` : displayName;
    }

    // Priority 1: Spotify listening
    if (d.listening_to_spotify && d.spotify) {
      const sp = d.spotify;
      currentSpotify = sp;
      currentActivityStart = null;
      card.classList.add('is-spotify');
      if (artEl) {
        artEl.src = sp.album_art_url || userAvatar;
        artEl.classList.remove('is-round');
      }
      if (stateLabelEl) {
        stateLabelEl.innerHTML = '<span class="live-tag">● SPOTIFY</span> · СЛУШАЮ';
      }
      const trackUrl = sp.track_id ? `https://open.spotify.com/track/${sp.track_id}` : '';
      setTitleContent(sp.song || 'Spotify Track', trackUrl);
      if (subEl) {
        subEl.textContent = `${sp.artist || ''}${sp.album ? ' · ' + sp.album : ''}`;
      }
      spProgWrap?.classList.add('is-visible');
      updateTimers();
      return;
    }

    currentSpotify = null;
    card.classList.remove('is-spotify');
    spProgWrap?.classList.remove('is-visible');

    // Priority 2: Game / App activity (type !== 4)
    const activities = Array.isArray(d.activities) ? d.activities : [];
    const gameAct = activities.find((a) => a.type !== 4 && a.name !== 'Spotify');
    const customAct = activities.find((a) => a.type === 4);

    if (gameAct) {
      const actImg = resolveActivityImage(gameAct);
      if (artEl) {
        artEl.src = actImg || userAvatar;
        artEl.classList.toggle('is-round', !actImg);
      }
      const verb = gameAct.type === 2 ? 'СЛУШАЮ' : gameAct.type === 3 ? 'СМОТРЮ' : 'ИГРАЮ';
      if (stateLabelEl) {
        stateLabelEl.innerHTML = `<span class="live-tag">● ${verb}</span> · DISCORD`;
      }
      setTitleContent(gameAct.name || 'Активность', '');
      currentActivityStart = gameAct.timestamps?.start || null;
      const detailParts = [gameAct.details, gameAct.state].filter(Boolean);
      if (subEl) {
        subEl.dataset.baseText = detailParts.join(' · ') || STATUS_MAP[status];
        subEl.textContent = subEl.dataset.baseText;
      }
      updateTimers();
      return;
    }

    // Priority 3: Custom status or plain online/offline
    currentActivityStart = null;
    if (artEl) {
      artEl.src = userAvatar;
      artEl.classList.add('is-round');
    }
    if (stateLabelEl) {
      const livePrefix = status === 'online' ? '<span class="live-tag">● ONLINE</span>' : STATUS_MAP[status];
      stateLabelEl.innerHTML = `DISCORD · ${livePrefix}`;
    }
    setTitleContent(displayName, '');
    if (subEl) {
      if (customAct && (customAct.state || customAct.emoji?.name)) {
        subEl.textContent = `${customAct.emoji?.name ? customAct.emoji.name + ' ' : ''}${customAct.state || ''}`.trim();
      } else if (status === 'online') {
        subEl.textContent = 'В сети · тишина в эфире';
      } else if (status === 'idle') {
        subEl.textContent = 'Не активен';
      } else if (status === 'dnd') {
        subEl.textContent = 'Не беспокоить';
      } else {
        subEl.textContent = 'Оффлайн · сейчас не в сети';
      }
    }
  }

  function renderNotMonitored() {
    currentSpotify = null;
    currentActivityStart = null;
    card.classList.remove('is-spotify');
    spProgWrap?.classList.remove('is-visible');
    if (dotEl) dotEl.className = 'discord-status-badge offline';
    if (stateLabelEl) stateLabelEl.textContent = 'DISCORD · LANYARD';
    setTitleContent('Зайди на discord.gg/lanyard', 'https://discord.gg/lanyard');
    if (subEl) subEl.textContent = 'Один раз — чтобы API видел твой онлайн и Spotify';
  }

  function updateTimers() {
    const now = Date.now();
    if (currentSpotify && currentSpotify.timestamps) {
      const { start, end } = currentSpotify.timestamps;
      if (start && end && end > start) {
        const totalMs = end - start;
        const elapsedMs = Math.max(0, Math.min(totalMs, now - start));
        const pct = (elapsedMs / totalMs) * 100;
        if (spFillEl) spFillEl.style.width = pct.toFixed(2) + '%';
        if (spCurEl) spCurEl.textContent = formatClock(elapsedMs / 1000);
        if (spEndEl) spEndEl.textContent = formatClock(totalMs / 1000);
      }
    } else if (currentActivityStart && subEl) {
      const elapsedSec = Math.max(0, Math.floor((now - currentActivityStart) / 1000));
      const hrs = Math.floor(elapsedSec / 3600);
      const mins = Math.floor((elapsedSec % 3600) / 60);
      const secs = elapsedSec % 60;
      const clock = hrs > 0
        ? `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
        : `${mins}:${String(secs).padStart(2, '0')}`;
      const base = subEl.dataset.baseText || '';
      subEl.textContent = base ? `${base} · ${clock}` : `В игре ${clock}`;
    }
  }

  let hasRenderedPresence = false;
  setInterval(() => { if (!document.hidden) updateTimers(); }, 1000);

  function renderLanyardUnavailable() {
    if (hasRenderedPresence) return;
    currentSpotify = null;
    currentActivityStart = null;
    card.classList.remove('is-spotify');
    spProgWrap?.classList.remove('is-visible');
    if (dotEl) dotEl.className = 'discord-status-badge offline';
    if (stateLabelEl) stateLabelEl.textContent = 'DISCORD · OFFLINE';
    setTitleContent('undereror nyashka', '');
    if (subEl) subEl.textContent = 'Статус Discord временно недоступен · плейлисты активны';
  }

  async function fetchRest() {
    try {
      const res = await fetchWithTimeout(`https://api.lanyard.rest/v1/users/${DISCORD_USER_ID}`, {}, 8000);
      if (res.status === 404) {
        hasRenderedPresence = true;
        renderNotMonitored();
        return false;
      }
      if (!res.ok) {
        renderLanyardUnavailable();
        return false;
      }
      const json = await res.json();
      if (json && json.success && json.data) {
        hasRenderedPresence = true;
        renderPresence(json.data);
        return true;
      }
    } catch (e) {
      renderLanyardUnavailable();
    }
    return false;
  }

  function connectWS() {
    try {
      ws = new WebSocket('wss://api.lanyard.rest/socket');
    } catch (e) {
      return;
    }

    ws.addEventListener('message', (event) => {
      let msg;
      try { msg = JSON.parse(event.data); } catch (e) { return; }
      if (msg.op === 1 && msg.d?.heartbeat_interval) {
        if (hbTimer) clearInterval(hbTimer);
        hbTimer = setInterval(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ op: 3 }));
          }
        }, msg.d.heartbeat_interval);
        ws.send(JSON.stringify({ op: 2, d: { subscribe_to_id: DISCORD_USER_ID } }));
      } else if (msg.op === 0 && (msg.t === 'INIT_STATE' || msg.t === 'PRESENCE_UPDATE')) {
        if (msg.d && msg.d.discord_user) {
          reconnectDelay = 2000;
          renderPresence(msg.d);
        }
      }
    });

    ws.addEventListener('close', () => {
      if (hbTimer) clearInterval(hbTimer);
      setTimeout(connectWS, reconnectDelay);
      reconnectDelay = Math.min(30000, reconnectDelay * 1.6);
    });

    ws.addEventListener('error', () => {
      try { ws.close(); } catch (e) {}
    });
  }

  fetchRest().then((ok) => {
    if (ok) connectWS();
  });
  setInterval(() => { if (!document.hidden) fetchRest(); }, 45000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      updateTimers();
      if (!ws || ws.readyState !== WebSocket.OPEN) fetchRest();
    }
  });
}
