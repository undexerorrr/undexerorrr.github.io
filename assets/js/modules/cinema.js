import { getWeatherSnapshot, cycleWeatherMode } from './weather.js';

/* =========================================
   CINEMA MODE (SECOND MONITOR / CLEAN VIBE)
   Живой фон + частицы погоды + компактный нуар-HUD.
   Аудио, анализатор и RAF-цикл переиспользуются из music.js.
   ========================================= */
const IDLE_DELAY_MS = 4000;
const BAR_COUNT = 20;

export function initCinemaMode(player) {
  const body = document.body;
  const toggleBtn = document.getElementById('cinema-toggle-btn');
  const hud = document.getElementById('cinema-hud');
  if (!toggleBtn || !hud) return;

  const exitBtn = document.getElementById('cinema-exit-btn');
  const weatherBtn = document.getElementById('cinema-weather-btn');
  const weatherIcon = document.getElementById('cinema-weather-icon');
  const weatherClock = document.getElementById('cinema-weather-clock');
  const weatherTemp = document.getElementById('cinema-weather-temp');
  const titleEl = document.getElementById('cinema-track-title');
  const artistEl = document.getElementById('cinema-track-artist');
  const prevBtn = document.getElementById('cinema-prev-btn');
  const playBtn = document.getElementById('cinema-play-btn');
  const nextBtn = document.getElementById('cinema-next-btn');
  const canvas = document.getElementById('cinema-vis');
  const ctx = canvas ? canvas.getContext('2d') : null;

  let active = false;
  let enteredByButton = false;
  let lastActivity = 0;
  let idleTimer = null;
  let canvasW = 0;
  let canvasH = 0;
  let lastBeat = -1;
  let playing = false;

  /* ---------- Guards ---------- */
  function isTypingTarget(el) {
    if (!el || !el.tagName) return false;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable === true;
  }

  function isBlockedByOverlay() {
    if (body.classList.contains('is-modal-open') || body.classList.contains('galaxy-active')) return true;
    if (document.querySelector('.intro-overlay:not(.is-hidden)')) return true;
    return false;
  }

  /* ---------- Idle dimming ---------- */
  function setIdle(value) {
    hud.classList.toggle('is-idle', value);
  }

  function scheduleIdleCheck(delay) {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(checkIdle, delay);
  }

  function checkIdle() {
    if (!active) return;
    const left = IDLE_DELAY_MS - (performance.now() - lastActivity);
    if (left <= 0) {
      idleTimer = null;
      setIdle(true);
    } else {
      scheduleIdleCheck(left);
    }
  }

  function onActivity() {
    if (!active) return;
    lastActivity = performance.now();
    if (hud.classList.contains('is-idle')) setIdle(false);
    if (idleTimer === null) scheduleIdleCheck(IDLE_DELAY_MS);
  }

  const activityEvents = ['pointermove', 'pointerdown', 'touchstart', 'wheel'];

  /* ---------- Weather ---------- */
  function renderWeather() {
    const snap = getWeatherSnapshot();
    if (weatherIcon) weatherIcon.textContent = snap.icon;
    if (weatherTemp) weatherTemp.textContent = snap.temp;
    if (weatherClock) {
      let clock;
      try {
        clock = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Minsk', hour: '2-digit', minute: '2-digit' }).format(new Date());
      } catch (e) {
        const d = new Date();
        clock = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      }
      weatherClock.textContent = clock;
    }
    if (weatherBtn) {
      weatherBtn.setAttribute('aria-label', `Погода: ${snap.ru}, ${snap.temp}. Сменить режим погоды`);
    }
  }

  /* ---------- Player state ---------- */
  function renderTrack(snap) {
    playing = Boolean(snap.playing);
    if (snap.track) {
      if (titleEl) titleEl.textContent = snap.track.title;
      if (artistEl) artistEl.textContent = snap.track.artist;
    }
    if (playBtn) {
      playBtn.innerHTML = playing
        ? '<svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><line x1="4" y1="2.5" x2="4" y2="9.5"/><line x1="8" y1="2.5" x2="8" y2="9.5"/></svg>'
        : '<svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><polygon points="3,2 10,6 3,10"/></svg>';
      playBtn.setAttribute('aria-label', playing ? 'Поставить на паузу' : 'Воспроизвести');
    }
    hud.classList.toggle('is-playing', playing);
    if (active && !playing) drawBars(null, 0);
  }

  /* ---------- Visualizer (draws from music.js analyser frames) ---------- */
  function sizeCanvas() {
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvasW = Math.round(rect.width * dpr);
    canvasH = Math.round(rect.height * dpr);
    canvas.width = canvasW;
    canvas.height = canvasH;
  }

  let fallbackPhase = 0;

  function drawBars(freq, energy) {
    if (!active || !ctx || !canvasW) return;
    ctx.clearRect(0, 0, canvasW, canvasH);
    const gap = Math.max(2, Math.round(canvasW / (BAR_COUNT * 6)));
    const barW = (canvasW - gap * (BAR_COUNT - 1)) / BAR_COUNT;
    const minH = Math.max(2, Math.round(canvasH * 0.08));

    if (!playing) {
      ctx.fillStyle = 'rgba(214, 214, 214, 0.24)';
      for (let i = 0; i < BAR_COUNT; i++) ctx.fillRect(i * (barW + gap), canvasH - minH, barW, minH);
      return;
    }

    if (!freq) fallbackPhase += 0.14;
    for (let i = 0; i < BAR_COUNT; i++) {
      let v;
      if (freq) {
        const bin = Math.min(freq.length - 1, Math.floor(i * (freq.length * 0.72 / BAR_COUNT)));
        v = freq[bin] / 255;
      } else {
        v = (0.18 + 0.65 * Math.abs(Math.sin(fallbackPhase + i * 0.45))) * (0.6 + energy);
      }
      const bh = Math.max(minH, v * (canvasH - 2));
      const lum = Math.round(180 + 75 * v);
      ctx.fillStyle = `rgba(${lum}, ${lum}, ${lum}, ${(0.45 + 0.5 * v).toFixed(2)})`;
      ctx.fillRect(i * (barW + gap), canvasH - bh, barW, bh);
    }
  }

  function onFrame(freq, energy) {
    if (!active) return;
    if (Math.abs(energy - lastBeat) > 0.01) {
      lastBeat = energy;
      hud.style.setProperty('--beat-energy', energy.toFixed(3));
    }
    drawBars(freq, energy);
  }

  /* ---------- Enter / Exit ---------- */
  function enter(viaButton) {
    if (active || isBlockedByOverlay()) return;
    active = true;
    enteredByButton = Boolean(viaButton);
    const focused = document.activeElement;
    if (focused && focused !== body && typeof focused.blur === 'function') focused.blur();

    body.classList.add('is-cinema-mode');
    hud.removeAttribute('inert');
    hud.setAttribute('aria-hidden', 'false');
    toggleBtn.setAttribute('aria-pressed', 'true');
    toggleBtn.setAttribute('aria-label', 'Выключить Cinema Mode (клавиша C)');

    renderWeather();
    setIdle(false);
    lastActivity = performance.now();
    activityEvents.forEach((name) => window.addEventListener(name, onActivity, { passive: true }));
    hud.addEventListener('focusin', onActivity);
    scheduleIdleCheck(IDLE_DELAY_MS);

    requestAnimationFrame(() => {
      sizeCanvas();
      drawBars(null, 0);
      if (player && typeof player.syncVisualizer === 'function') player.syncVisualizer();
    });
  }

  function exit() {
    if (!active) return;
    active = false;
    clearTimeout(idleTimer);
    idleTimer = null;
    activityEvents.forEach((name) => window.removeEventListener(name, onActivity));
    hud.removeEventListener('focusin', onActivity);

    hud.setAttribute('inert', '');
    hud.setAttribute('aria-hidden', 'true');
    if (hud.contains(document.activeElement)) document.activeElement.blur();
    body.classList.remove('is-cinema-mode');
    setIdle(false);
    toggleBtn.setAttribute('aria-pressed', 'false');
    toggleBtn.setAttribute('aria-label', 'Включить Cinema Mode (клавиша C)');
    if (enteredByButton) toggleBtn.focus({ preventScroll: true });
  }

  function toggle(viaButton) {
    if (active) exit();
    else enter(viaButton);
  }

  /* ---------- Wiring ---------- */
  toggleBtn.addEventListener('click', () => toggle(true));
  exitBtn?.addEventListener('click', exit);
  weatherBtn?.addEventListener('click', () => {
    cycleWeatherMode();
    renderWeather();
  });

  if (player) {
    prevBtn?.addEventListener('click', () => player.prev());
    nextBtn?.addEventListener('click', () => player.next());
    playBtn?.addEventListener('click', () => player.toggle());
    player.onState(renderTrack);
    player.onFrame(onFrame);
  }

  document.addEventListener('archive:weatherchange', () => {
    if (active) renderWeather();
  });

  window.addEventListener('resize', () => {
    if (!active) return;
    sizeCanvas();
    drawBars(null, 0);
  });

  window.addEventListener('keydown', (e) => {
    if (e.defaultPrevented) return;
    if (e.key === 'Escape') {
      if (active) {
        e.preventDefault();
        exit();
      }
      return;
    }
    const isC = e.code === 'KeyC' || e.key === 'c' || e.key === 'C';
    if (!isC || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.repeat) return;
    if (isTypingTarget(e.target)) return;
    if (!active && isBlockedByOverlay()) return;
    e.preventDefault();
    toggle(false);
  });
}
