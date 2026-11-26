import {
  VOLUME_STORAGE_KEY,
  DEFAULT_VOLUME,
  PLAYLIST,
  SPOTIFY_PLAYLISTS,
  DISCORD_USER_ID,
  formatRank,
  formatClock,
  escapeHtml,
  fetchJsonWithTimeout
} from './config.js';
import { appState } from './data.js';
import { getSharedAudioContext } from './sfx.js';

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
    const svg = isPlaying
      ? '<svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><line x1="4" y1="2.5" x2="4" y2="9.5"/><line x1="8" y1="2.5" x2="8" y2="9.5"/></svg>'
      : '<svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><polygon points="3,2 10,6 3,10"/></svg>';
    if (dockPlayBtn) dockPlayBtn.innerHTML = svg;
    if (topIcon) topIcon.innerHTML = svg;
    if (topBtn) topBtn.classList.toggle('is-playing', isPlaying);
    document.body.classList.toggle('is-audio-playing', isPlaying);
    if (typeof syncVisualizer === 'function') syncVisualizer();
    notifyState();
  }

  function setupAnalyser() {
    if (analyserConnected || !isHttp) return;
    try {
      audioCtx = getSharedAudioContext();
      if (!audioCtx) return;
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

  function syncDockMinimizeUI() {
    if (!dock || !dockMinBtn) return;
    const min = dock.classList.contains('is-minimized');
    dockMinBtn.textContent = min ? '+' : '–';
    dockMinBtn.setAttribute('aria-expanded', String(!min));
    dockMinBtn.setAttribute('title', min ? 'Развернуть плеер' : 'Свернуть плеер');
    dockMinBtn.setAttribute('aria-label', min ? 'Развернуть плеер' : 'Свернуть плеер');
  }

  dock?.classList.add('is-minimized');
  syncDockMinimizeUI();

  dockListBtn?.addEventListener('click', () => {
    if (dock?.classList.contains('is-minimized')) {
      dock.classList.remove('is-minimized');
      syncDockMinimizeUI();
      dockPlaylist.classList.add('is-open');
      dockListBtn.classList.add('active');
      return;
    }
    const open = dockPlaylist.classList.toggle('is-open');
    dockListBtn.classList.toggle('active', open);
  });

  dockMinBtn?.addEventListener('click', () => {
    const nextMin = dock?.classList.toggle('is-minimized');
    if (nextMin && dockPlaylist) {
      dockPlaylist.classList.remove('is-open');
      dockListBtn?.classList.remove('active');
    }
    syncDockMinimizeUI();
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
  let smoothBass = 0;
  let smoothMid = 0;
  let smoothHigh = 0;
  let lastSpectrumAt = 0;
  let lastWrittenBeat = -1;
  let fallbackPhase = 0;
  let visRafId = null;
  const avatarBeatHost = document.querySelector('.avatar-wrap');
  const audioSpectrum = { energy: 0, bass: 0, mid: 0, high: 0, isPlaying: false };

  function resetAudioSpectrum() {
    smoothBeat = 0;
    smoothBass = 0;
    smoothMid = 0;
    smoothHigh = 0;
    lastSpectrumAt = 0;
    audioSpectrum.energy = 0;
    audioSpectrum.bass = 0;
    audioSpectrum.mid = 0;
    audioSpectrum.high = 0;
    audioSpectrum.isPlaying = false;
    appState.liveBeatEnergy = 0;
  }

  function updateSpectrumBands(now) {
    const ts = now || performance.now();
    const dtMs = lastSpectrumAt > 0 ? Math.min(50, Math.max(1, ts - lastSpectrumAt)) : 16.67;
    lastSpectrumAt = ts;
    const frameFactor = dtMs / 16.67;
    const atk = 1 - Math.pow(1 - 0.38, frameFactor);
    const rel = 1 - Math.pow(1 - 0.14, frameFactor);

    let targetBass = 0;
    let targetMid = 0;
    let targetHigh = 0;
    let targetEnergy = 0;

    if (isPlaying && analyser && freqData) {
      analyser.getByteFrequencyData(freqData);
      let bassSum = 0;
      for (let b = 0; b <= 4; b++) bassSum += freqData[b];
      const bassNorm = bassSum / (5 * 255);
      targetBass = Math.pow(Math.max(0, (bassNorm - 0.10) / 0.90), 1.3);

      let midSum = 0;
      for (let m = 5; m <= 18; m++) midSum += freqData[m];
      const midNorm = midSum / (14 * 255);
      targetMid = Math.pow(Math.max(0, (midNorm - 0.08) / 0.92), 1.15);

      let highSum = 0;
      const highEnd = Math.min(42, freqData.length - 1);
      const highCount = Math.max(1, highEnd - 19 + 1);
      for (let h = 19; h <= highEnd; h++) highSum += freqData[h];
      const highNorm = highSum / (highCount * 255);
      targetHigh = Math.min(1, Math.pow(Math.max(0, (highNorm - 0.05) / 0.95), 1.1) * 1.25);

      targetEnergy = Math.min(1, targetBass * 0.62 + targetMid * 0.28 + targetHigh * 0.10);
    } else if (isPlaying) {
      fallbackPhase += 0.14 * frameFactor;
      targetBass = 0.22 + 0.38 * Math.pow((Math.sin(fallbackPhase * 1.7) + 1) * 0.5, 2);
      targetMid = 0.18 + 0.34 * Math.pow((Math.sin(fallbackPhase * 2.3 + 0.9) + 1) * 0.5, 1.6);
      targetHigh = 0.14 + 0.30 * Math.pow((Math.sin(fallbackPhase * 3.1 + 1.8) + 1) * 0.5, 1.4);
      targetEnergy = Math.min(1, targetBass * 0.62 + targetMid * 0.28 + targetHigh * 0.10);
    }

    smoothBass += (targetBass - smoothBass) * (targetBass > smoothBass ? atk : rel);
    smoothMid += (targetMid - smoothMid) * (targetMid > smoothMid ? atk : rel);
    smoothHigh += (targetHigh - smoothHigh) * (targetHigh > smoothHigh ? atk : rel);
    smoothBeat += (targetEnergy - smoothBeat) * (targetEnergy > smoothBeat ? atk : rel);

    if (!isPlaying) {
      if (smoothBass < 0.002) smoothBass = 0;
      if (smoothMid < 0.002) smoothMid = 0;
      if (smoothHigh < 0.002) smoothHigh = 0;
      if (smoothBeat < 0.002) smoothBeat = 0;
      if (smoothBeat === 0 && smoothBass === 0 && smoothMid === 0 && smoothHigh === 0) {
        lastSpectrumAt = 0;
      }
    }

    audioSpectrum.energy = smoothBeat;
    audioSpectrum.bass = smoothBass;
    audioSpectrum.mid = smoothMid;
    audioSpectrum.high = smoothHigh;
    audioSpectrum.isPlaying = isPlaying;
    appState.liveBeatEnergy = smoothBeat;
  }

  function sampleSpectrum(now) {
    if (!isPlaying && smoothBeat === 0 && smoothBass === 0 && smoothMid === 0 && smoothHigh === 0) {
      audioSpectrum.energy = 0;
      audioSpectrum.bass = 0;
      audioSpectrum.mid = 0;
      audioSpectrum.high = 0;
      audioSpectrum.isPlaying = false;
      return audioSpectrum;
    }
    if (now && now === lastSpectrumAt) {
      return audioSpectrum;
    }
    updateSpectrumBands(now || performance.now());
    return audioSpectrum;
  }

  function drawIdleBaseline() {
    if (!visCtx || !visCanvas) return;
    const vw = visCanvas.width;
    const vh = visCanvas.height;
    const barCount = 24;
    const gap = 3;
    const barW = (vw - gap * (barCount - 1)) / barCount;
    visCtx.clearRect(0, 0, vw, vh);
    visCtx.fillStyle = 'rgba(235, 235, 235, 0.22)';
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

  function setPerfAudioRunning(running) {
    if (appState.perfState) {
      appState.perfState.audioRunning = Boolean(running);
    }
  }

  function stopVisualizerLoop() {
    if (visRafId !== null) {
      cancelAnimationFrame(visRafId);
      visRafId = null;
    }
    setPerfAudioRunning(false);
  }

  function syncVisualizer() {
    if (shouldRunVisualizer()) {
      if (visRafId === null) {
        visRafId = requestAnimationFrame(visualizerFrame);
      }
      setPerfAudioRunning(true);
    } else {
      stopVisualizerLoop();
      if (!isPlaying && !document.body.classList.contains('galaxy-active')) {
        resetAudioSpectrum();
        writeBeatEnergy(0);
        drawIdleBaseline();
      }
    }
  }

  function visualizerFrame(now) {
    visRafId = null;
    if (!shouldRunVisualizer()) {
      setPerfAudioRunning(false);
      if (!isPlaying && !document.body.classList.contains('galaxy-active')) {
        resetAudioSpectrum();
        writeBeatEnergy(0);
        drawIdleBaseline();
      }
      return;
    }

    updateSpectrumBands(now || performance.now());
    const barCount = 24;

    if (visCtx && visCanvas) {
      const vw = visCanvas.width;
      const vh = visCanvas.height;
      visCtx.clearRect(0, 0, vw, vh);

      if (isPlaying && analyser && freqData) {
        const gap = 3;
        const barW = (vw - gap * (barCount - 1)) / barCount;
        for (let i = 0; i < barCount; i++) {
          const bin = Math.min(freqData.length - 1, Math.floor(i * 1.4));
          const v = freqData[bin] / 255;
          const bh = Math.max(2, v * (vh - 2));
          const x = i * (barW + gap);
          const y = vh - bh;
          const grad = visCtx.createLinearGradient(0, vh, 0, y);
          grad.addColorStop(0, 'rgba(214, 214, 214, 0.45)');
          grad.addColorStop(1, 'rgba(255, 255, 255, 0.95)');
          visCtx.fillStyle = grad;
          visCtx.fillRect(x, y, barW, bh);
        }
      } else if (isPlaying) {
        const gap = 3;
        const barW = (vw - gap * (barCount - 1)) / barCount;
        for (let i = 0; i < barCount; i++) {
          const v = 0.18 + 0.65 * Math.abs(Math.sin(fallbackPhase + i * 0.45));
          const bh = Math.max(2, v * (vh - 4));
          visCtx.fillStyle = 'rgba(235, 235, 235, 0.72)';
          visCtx.fillRect(i * (barW + gap), vh - bh, barW, bh);
        }
      } else {
        drawIdleBaseline();
      }
    }

    writeBeatEnergy(smoothBeat);
    if (frameListeners.length) {
      const liveFreq = isPlaying && analyser && freqData ? freqData : null;
      for (let i = 0; i < frameListeners.length; i++) frameListeners[i](liveFreq, smoothBeat, isPlaying);
    }

    if (shouldRunVisualizer()) {
      visRafId = requestAnimationFrame(visualizerFrame);
      setPerfAudioRunning(true);
    } else {
      setPerfAudioRunning(false);
      if (!isPlaying) {
        resetAudioSpectrum();
        writeBeatEnergy(0);
        drawIdleBaseline();
      }
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
    sampleSpectrum,
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
  let hasFetchedTitles = false;

  // Guarantee iframe carries zero network src until the very first drawer open
  if (iframe.hasAttribute('src')) {
    iframe.removeAttribute('src');
  }

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

  function fetchPlaylistTitlesOnce() {
    if (hasFetchedTitles) return;
    hasFetchedTitles = true;
    SPOTIFY_PLAYLISTS.forEach((pl, idx) => {
      fetchJsonWithTimeout(`https://open.spotify.com/oembed?url=${encodeURIComponent(pl.url)}`, {}, 6500)
        .then(({ ok, data }) => {
          if (ok && data && data.title) {
            SPOTIFY_PLAYLISTS[idx].label = `${formatRank(idx + 1)} · ${data.title}`;
            renderTabs();
          }
        })
        .catch(() => {});
    });
  }

  function selectPlaylist(idx) {
    activeIdx = idx;
    const pl = SPOTIFY_PLAYLISTS[idx];
    if (!pl) return;
    renderTabs();
    const targetUrl = `https://open.spotify.com/embed/playlist/${pl.id}?utm_source=generator&theme=0`;
    if (extLink) extLink.href = pl.url;
    if (!hasLoadedEmbed || iframe.getAttribute('src') !== targetUrl) {
      iframe.src = targetUrl;
      hasLoadedEmbed = true;
    }
  }

  function openDrawer() {
    if (!hasLoadedEmbed) {
      selectPlaylist(activeIdx);
    }
    fetchPlaylistTitlesOnce();
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
  document.getElementById('signal-spotify-btn')?.addEventListener('click', openDrawer);
  closeBtn?.addEventListener('click', closeDrawer);
  backdrop?.addEventListener('click', closeDrawer);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('is-open')) closeDrawer();
  });

  renderTabs();
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
  const signalDotEl = document.getElementById('signal-discord-dot');
  const signalSubEl = document.getElementById('signal-discord-sub');

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
    if (signalDotEl) {
      signalDotEl.className = 'signal-discord-dot ' + status;
    }
    if (userEl) {
      userEl.textContent = u.username ? `@${u.username}` : displayName;
    }
    if (signalSubEl) {
      const tag = u.username ? `@${u.username}` : displayName;
      signalSubEl.textContent = `${tag} · ${STATUS_MAP[status] || 'OFFLINE'}`;
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
        stateLabelEl.innerHTML = '<span class="live-tag">SPOTIFY</span> · СЛУШАЮ';
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
        stateLabelEl.innerHTML = `<span class="live-tag">${verb}</span> · DISCORD`;
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
      const livePrefix = status === 'online' ? '<span class="live-tag">ONLINE</span>' : STATUS_MAP[status];
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
    if (signalDotEl) signalDotEl.className = 'signal-discord-dot offline';
    if (stateLabelEl) stateLabelEl.textContent = 'DISCORD · LANYARD';
    setTitleContent('Зайди на discord.gg/lanyard', 'https://discord.gg/lanyard');
    if (subEl) subEl.textContent = 'Один раз — чтобы API видел твой онлайн и Spotify';
    if (signalSubEl) signalSubEl.textContent = 'Discord Profile';
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
    if (signalDotEl) signalDotEl.className = 'signal-discord-dot offline';
    if (stateLabelEl) stateLabelEl.textContent = 'DISCORD · OFFLINE';
    setTitleContent('undereror nyashka', '');
    if (subEl) subEl.textContent = 'Статус Discord временно недоступен · плейлисты активны';
    if (signalSubEl) signalSubEl.textContent = 'Discord Profile';
  }

  async function fetchRest() {
    try {
      const { ok, status, data: json } = await fetchJsonWithTimeout(`https://api.lanyard.rest/v1/users/${DISCORD_USER_ID}`, {}, 8000);
      if (status === 404) {
        hasRenderedPresence = true;
        renderNotMonitored();
        return false;
      }
      if (!ok) {
        renderLanyardUnavailable();
        return false;
      }
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
  setInterval(() => {
    if (document.hidden) return;
    if (ws && ws.readyState === WebSocket.OPEN) return;
    fetchRest();
  }, 45000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      updateTimers();
      if (!ws || ws.readyState !== WebSocket.OPEN) fetchRest();
    }
  });
}
