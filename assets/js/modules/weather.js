import { fetchJsonWithTimeout } from './config.js';
import { appState } from './data.js';

/* =========================================
   LIVE WEATHER ENGINE (53.9° N · OPEN-METEO) + DYNAMIC CANVAS PHYSICS
   ========================================= */
const weatherEngineState = {
  liveMode: 'clear',
  activeMode: 'clear',
  override: null,
  isDay: 0,
  temp: null,
  windSpeed: 8,
  code: 0,
  condRu: 'Ясно',
  condShort: 'CLEAR'
};

const WEATHER_PRESETS = {
  clear:  { icon: '', short: 'CLEAR', ru: 'Ясно / звёздное небо', wind: 6 },
  clouds: { icon: '', short: 'CLOUDS', ru: 'Облачно', wind: 10 },
  fog:    { icon: '', short: 'FOG', ru: 'Туман / дымка', wind: 4 },
  rain:   { icon: '', short: 'RAIN', ru: 'Дождь', wind: 16 },
  storm:  { icon: '', short: 'STORM', ru: 'Гроза', wind: 26 },
  snow:   { icon: '', short: 'SNOW', ru: 'Снег', wind: 11 }
};

function mapWmoToWeather(code) {
  const c = Number(code) || 0;
  if (c >= 95) return 'storm';
  if ((c >= 71 && c <= 77) || c === 85 || c === 86) return 'snow';
  if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82)) return 'rain';
  if (c === 45 || c === 48) return 'fog';
  if (c === 2 || c === 3) return 'clouds';
  return 'clear';
}

let weatherCycleHandler = null;

export function getWeatherSnapshot() {
  const mode = weatherEngineState.override || weatherEngineState.liveMode || 'clear';
  const preset = WEATHER_PRESETS[mode] || WEATHER_PRESETS.clear;
  return {
    mode,
    icon: preset.icon,
    short: weatherEngineState.override ? `${preset.short}*` : preset.short,
    ru: preset.ru,
    isOverride: Boolean(weatherEngineState.override),
    temp: weatherEngineState.temp !== null && isFinite(weatherEngineState.temp)
      ? `${weatherEngineState.temp > 0 ? '+' : ''}${Math.round(weatherEngineState.temp)}°C`
      : '--°C'
  };
}

export function cycleWeatherMode() {
  if (weatherCycleHandler) weatherCycleHandler();
}

export function initAtmosphereCanvas() {
  const canvas = document.getElementById('atmosphere-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0;
  const mouse = { x: -9999, y: -9999 };
  let stars = [];
  let petals = [];
  let raindrops = [];
  let snowflakes = [];
  let fogBanks = [];
  let splashes = [];
  let lightningAlpha = 0;
  let nextLightningAt = performance.now() + 4500;

  function resize() {
    const dpr = window.innerWidth <= 720 ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const starCount = Math.min(92, Math.floor((w * h) / 16500));
    stars = Array.from({ length: starCount }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.45 + 0.4,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.012 + 0.004,
      depth: Math.random() * 0.6 + 0.4
    }));

    const petalCount = Math.min(34, Math.floor(w / 42));
    petals = Array.from({ length: petalCount }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: -(Math.random() * 0.42 + 0.16),
      vy: Math.random() * 0.45 + 0.18,
      rx: Math.random() * 2.8 + 1.4,
      ry: Math.random() * 1.3 + 0.6,
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 0.015,
      alpha: Math.random() * 0.45 + 0.20
    }));

    const rainCount = Math.min(135, Math.max(55, Math.floor(w / 11)));
    raindrops = Array.from({ length: rainCount }, () => ({
      x: Math.random() * (w + 220) - 110,
      y: Math.random() * h,
      len: Math.random() * 16 + 11,
      speed: Math.random() * 7.5 + 10.5,
      alpha: Math.random() * 0.34 + 0.16,
      width: Math.random() * 0.75 + 0.55
    }));

    const snowCount = Math.min(95, Math.max(40, Math.floor(w / 16)));
    snowflakes = Array.from({ length: snowCount }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 2.5 + 0.9,
      vy: Math.random() * 1.05 + 0.42,
      phase: Math.random() * Math.PI * 2,
      swaySpeed: Math.random() * 0.018 + 0.007,
      swayAmp: Math.random() * 0.75 + 0.25,
      alpha: Math.random() * 0.55 + 0.25
    }));

    fogBanks = Array.from({ length: 7 }, (_, idx) => ({
      x: Math.random() * w,
      y: (h / 7) * idx + Math.random() * 90,
      r: Math.max(w, h) * (0.26 + Math.random() * 0.18),
      vx: (idx % 2 === 0 ? 1 : -1) * (0.18 + Math.random() * 0.24),
      alpha: 0.055 + Math.random() * 0.045
    }));
  }

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resize();
    }, 120);
  }, { passive: true });
  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  }, { passive: true });
  window.addEventListener('mouseleave', () => {
    mouse.x = -9999;
    mouse.y = -9999;
  }, { passive: true });

  resize();

  const heavyModalEls = [
    'holo-modal',
    'detail-modal',
    'arena-modal',
    'coop-modal',
    'pack-modal',
    'trophy-modal'
  ].map((id) => document.getElementById(id)).filter(Boolean);

  let atmoRafId = null;

  function isAtmospherePaused() {
    if (document.hidden) return true;
    if (document.body.classList.contains('galaxy-active') || document.body.classList.contains('is-modal-open')) return true;
    for (let i = 0; i < heavyModalEls.length; i++) {
      if (heavyModalEls[i].classList.contains('is-open')) return true;
    }
    return false;
  }

  function syncAtmosphereLoop() {
    if (isAtmospherePaused()) {
      if (atmoRafId !== null) {
        cancelAnimationFrame(atmoRafId);
        atmoRafId = null;
      }
    } else if (atmoRafId === null) {
      atmoRafId = requestAnimationFrame(frame);
    }
  }

  function frame(now) {
    atmoRafId = null;
    if (isAtmospherePaused()) return;
    ctx.clearRect(0, 0, w, h);
    const mode = weatherEngineState.activeMode || 'clear';
    const beatBoost = 1 + appState.liveBeatEnergy * 1.15;
    const isNight = weatherEngineState.isDay === 0;

    // 1. Stars (always softly present in clear/clouds, dim in snow/fog/rain)
    const starMul = mode === 'clear' ? (isNight ? 1.1 : 0.72)
      : mode === 'clouds' ? 0.48
      : mode === 'snow' ? 0.36
      : 0.18;

    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      s.phase += s.speed;
      const alpha = Math.min(1, (0.14 + ((Math.sin(s.phase) + 1) * 0.5) * 0.68 + appState.liveBeatEnergy * 0.15) * starMul);
      if (alpha < 0.03) continue;
      const px = mouse.x > -1000 ? (mouse.x / w - 0.5) * 10 * s.depth : 0;
      const py = mouse.y > -1000 ? (mouse.y / h - 0.5) * 10 * s.depth : 0;
      ctx.beginPath();
      ctx.arc(s.x - px, s.y - py, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(243, 244, 246, ${alpha.toFixed(3)})`;
      ctx.fill();
    }

    // 2. Fog / Clouds Mist Layer
    if (mode === 'fog' || mode === 'clouds') {
      const fogScale = mode === 'fog' ? 1.35 : 0.55;
      for (let i = 0; i < fogBanks.length; i++) {
        const fb = fogBanks[i];
        fb.x += fb.vx * (1 + appState.liveBeatEnergy * 0.4);
        if (fb.x - fb.r > w + 80) fb.x = -fb.r - 60;
        if (fb.x + fb.r < -80) fb.x = w + fb.r + 60;

        const g = ctx.createRadialGradient(fb.x, fb.y, 10, fb.x, fb.y, fb.r);
        g.addColorStop(0, `rgba(197, 203, 213, ${(fb.alpha * fogScale).toFixed(3)})`);
        g.addColorStop(0.55, `rgba(119, 127, 141, ${(fb.alpha * fogScale * 0.45).toFixed(3)})`);
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(fb.x, fb.y, fb.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 3. Weather-Specific Particles
    if (mode === 'rain' || mode === 'storm') {
      const isStorm = mode === 'storm';
      const windSlant = isStorm ? -3.4 : Math.max(-3.0, Math.min(-1.0, -(weatherEngineState.windSpeed || 12) * 0.12));
      const speedMul = (isStorm ? 1.35 : 1.0) * (1 + appState.liveBeatEnergy * 0.35);
      const activeDrops = isStorm ? raindrops.length : Math.floor(raindrops.length * 0.78);

      ctx.lineCap = 'round';
      for (let i = 0; i < activeDrops; i++) {
        const d = raindrops[i];
        const dx = d.x - mouse.x;
        const dy = d.y - mouse.y;
        if (dx * dx + dy * dy < 9500) {
          d.x += (dx >= 0 ? 1.4 : -1.4);
        }
        d.x += windSlant * speedMul;
        d.y += d.speed * speedMul;

        if (d.y > h + 20) {
          if (splashes.length < 24 && Math.random() < (isStorm ? 0.24 : 0.14)) {
            splashes.push({ x: d.x, y: h - 4 - Math.random() * 14, r: 1, maxR: 6 + Math.random() * 7, alpha: 0.42 });
          }
          d.y = -20 - Math.random() * 80;
          d.x = Math.random() * (w + 260) - 80;
        }
        if (d.x < -120) d.x = w + 100;

        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + windSlant * 1.45, d.y + d.len * (isStorm ? 1.25 : 1));
        ctx.strokeStyle = `rgba(197, 203, 213, ${(d.alpha * (isStorm ? 1.22 : 1)).toFixed(3)})`;
        ctx.lineWidth = d.width;
        ctx.stroke();
      }

      // Tiny bottom ripples
      for (let i = splashes.length - 1; i >= 0; i--) {
        const sp = splashes[i];
        sp.r += 0.45;
        sp.alpha -= 0.025;
        if (sp.alpha <= 0 || sp.r >= sp.maxR) {
          splashes.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.ellipse(sp.x, sp.y, sp.r * 1.6, sp.r * 0.42, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(197, 203, 213, ${sp.alpha.toFixed(3)})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      // Distant monochrome lightning flashes in storm mode
      if (isStorm) {
        if (now >= nextLightningAt) {
          lightningAlpha = 0.18 + Math.random() * 0.14;
          nextLightningAt = now + 3800 + Math.random() * 6800;
        }
        if (lightningAlpha > 0.004) {
          ctx.fillStyle = `rgba(243, 244, 246, ${lightningAlpha.toFixed(3)})`;
          ctx.fillRect(0, 0, w, h);
          lightningAlpha *= 0.86;
        }
      }
    } else if (mode === 'snow') {
      const windDrift = -0.35 - Math.min(1.2, (weatherEngineState.windSpeed || 8) * 0.04);
      for (let i = 0; i < snowflakes.length; i++) {
        const sf = snowflakes[i];
        sf.phase += sf.swaySpeed;
        const dx = sf.x - mouse.x;
        const dy = sf.y - mouse.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < 14000 && distSq > 1) {
          const dist = Math.sqrt(distSq);
          const force = (1 - dist / 118) * 1.1;
          sf.x += (dx / dist) * force;
          sf.y += (dy / dist) * force;
        }
        sf.x += (Math.sin(sf.phase) * sf.swayAmp + windDrift) * beatBoost;
        sf.y += sf.vy * beatBoost;

        if (sf.x < -10) sf.x = w + 10;
        if (sf.x > w + 10) sf.x = -10;
        if (sf.y > h + 10) {
          sf.y = -10;
          sf.x = Math.random() * w;
        }

        ctx.beginPath();
        ctx.arc(sf.x, sf.y, sf.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(243, 244, 246, ${sf.alpha.toFixed(3)})`;
        ctx.fill();
      }
    } else {
      // Clear / Clouds / Fog: signature silver drifting petals
      const petalAlphaMul = mode === 'fog' ? 0.55 : 1;
      for (let i = 0; i < petals.length; i++) {
        const p = petals[i];
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < 13000 && distSq > 1) {
          const dist = Math.sqrt(distSq);
          const force = (1 - dist / 114) * 0.9;
          p.x += (dx / dist) * force;
          p.y += (dy / dist) * force;
        }
        p.x += p.vx * beatBoost;
        p.y += p.vy * beatBoost;
        p.rot += p.vrot;

        if (p.x < -12) p.x = w + 12;
        if (p.y > h + 12) {
          p.y = -12;
          p.x = Math.random() * w;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.beginPath();
        ctx.ellipse(0, 0, p.rx, p.ry, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(197, 203, 213, ${(p.alpha * petalAlphaMul).toFixed(3)})`;
        ctx.fill();
        ctx.restore();
      }
    }

    if (!isAtmospherePaused()) {
      atmoRafId = requestAnimationFrame(frame);
    }
  }

  if (typeof MutationObserver !== 'undefined') {
    const mo = new MutationObserver(syncAtmosphereLoop);
    mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    heavyModalEls.forEach((el) => mo.observe(el, { attributes: true, attributeFilter: ['class'] }));
  }
  document.addEventListener('visibilitychange', syncAtmosphereLoop);
  document.addEventListener('archive:motionchange', syncAtmosphereLoop);


  syncAtmosphereLoop();
}

export function initLiveWeather() {
  const hud = document.getElementById('weather-hud');
  const hudBtn = document.getElementById('weather-hud-btn');
  const hudIcon = document.getElementById('weather-hud-icon');
  const hudClock = document.getElementById('weather-hud-clock');
  const hudTemp = document.getElementById('weather-hud-temp');
  const hudCond = document.getElementById('weather-hud-cond');
  const popMode = document.getElementById('weather-pop-mode');
  const popDesc = document.getElementById('weather-pop-desc');
  const popWind = document.getElementById('weather-pop-wind');
  const pilotChip = document.getElementById('pilot-weather-chip');
  const chips = Array.from(document.querySelectorAll('.weather-chip'));

  function getLocalClock539() {
    try {
      return new Intl.DateTimeFormat('ru-RU', {
        timeZone: 'Europe/Minsk',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date());
    } catch (e) {
      const d = new Date();
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
  }

  function updateWeatherUI() {
    const mode = weatherEngineState.override || weatherEngineState.liveMode || 'clear';
    weatherEngineState.activeMode = mode;
    const preset = WEATHER_PRESETS[mode] || WEATHER_PRESETS.clear;
    const clock = getLocalClock539();
    const tempStr = weatherEngineState.temp !== null && isFinite(weatherEngineState.temp)
      ? `${weatherEngineState.temp > 0 ? '+' : ''}${Math.round(weatherEngineState.temp)}°C`
      : '--°C';
    const windStr = isFinite(weatherEngineState.windSpeed)
      ? `${Math.round(weatherEngineState.windSpeed)} км/ч`
      : '—';

    if (hudIcon) hudIcon.textContent = '';
    if (hudClock) hudClock.textContent = clock;
    if (hudTemp) hudTemp.textContent = tempStr;
    if (hudCond) hudCond.textContent = weatherEngineState.override ? `${preset.short}*` : preset.short;

    if (popMode) popMode.textContent = weatherEngineState.override ? `PREVIEW · ${preset.short}` : 'LIVE · OPEN-METEO';
    if (popDesc) popDesc.textContent = `${preset.ru} · ${tempStr}`;
    if (popWind) popWind.textContent = `Ветер ${windStr}`;

    if (pilotChip) {
      const summary = `53.9° N · ${clock} · ${tempStr} · ${preset.short}`;
      pilotChip.title = `${summary} · нажми для быстрой смены эффекта`;
      pilotChip.setAttribute('aria-label', `Сменить режим погоды (${summary})`);
      if (!pilotChip.querySelector('svg')) {
        pilotChip.textContent = summary;
      }
    }

    document.body.classList.toggle('weather-night', weatherEngineState.isDay === 0);
    document.body.classList.toggle('weather-fog', mode === 'fog');

    const activeKey = weatherEngineState.override || 'live';
    chips.forEach((c) => c.classList.toggle('active', c.dataset.wmode === activeKey));
    document.dispatchEvent(new CustomEvent('archive:weatherchange'));
  }

  async function fetchOpenMeteo() {
    try {
      const url = 'https://api.open-meteo.com/v1/forecast?latitude=53.9&longitude=27.6&current=temperature_2m,weather_code,is_day,wind_speed_10m&timezone=Europe%2FMinsk';
      const { ok, status, data: json } = await fetchJsonWithTimeout(url, {}, 8000);
      if (!ok) throw new Error('HTTP ' + status);
      const cur = json?.current;
      if (!cur) return;
      weatherEngineState.temp = Number(cur.temperature_2m);
      weatherEngineState.code = Number(cur.weather_code) || 0;
      weatherEngineState.isDay = Number(cur.is_day) === 1 ? 1 : 0;
      weatherEngineState.windSpeed = Number(cur.wind_speed_10m) || 8;
      weatherEngineState.liveMode = mapWmoToWeather(weatherEngineState.code);
      updateWeatherUI();
    } catch (e) {
      if (weatherEngineState.temp === null && popDesc) {
        popDesc.textContent = 'Погода офлайн · режим по умолчанию';
      }
    }
  }

  function setPopoverOpen(open) {
    if (!hud) return;
    hud.classList.toggle('is-open', open);
    hudBtn?.setAttribute('aria-expanded', String(open));
  }

  hudBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    setPopoverOpen(!hud?.classList.contains('is-open'));
  });

  document.addEventListener('click', (e) => {
    if (hud && hud.classList.contains('is-open') && !hud.contains(e.target)) {
      setPopoverOpen(false);
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && hud && hud.classList.contains('is-open')) {
      setPopoverOpen(false);
    }
  });

  document.addEventListener('archive:sectorchange', () => {
    if (hud && hud.classList.contains('is-open')) {
      setPopoverOpen(false);
    }
  });

  window.addEventListener('scroll', () => {
    if (hud && hud.classList.contains('is-open')) {
      setPopoverOpen(false);
    }
  }, { passive: true });

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const m = chip.dataset.wmode;
      weatherEngineState.override = (m === 'live') ? null : m;
      updateWeatherUI();
    });
  });

  // Clicking pilot top-bar weather chip cycles live -> rain -> snow -> fog -> storm -> live
  const cycleOrder = [null, 'rain', 'snow', 'fog', 'storm', 'clear'];
  function cycleOverride() {
    const curIdx = cycleOrder.indexOf(weatherEngineState.override);
    weatherEngineState.override = cycleOrder[(curIdx + 1) % cycleOrder.length];
    updateWeatherUI();
  }
  weatherCycleHandler = cycleOverride;
  pilotChip?.addEventListener('click', cycleOverride);

  updateWeatherUI();
  fetchOpenMeteo();
  setInterval(() => { if (!document.hidden) updateWeatherUI(); }, 30000);
  setInterval(() => { if (!document.hidden) fetchOpenMeteo(); }, 15 * 60 * 1000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) updateWeatherUI();
  });
}
