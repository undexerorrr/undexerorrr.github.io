import { appState } from './data.js';

/* =========================================
   HIDDEN PERFORMANCE DIAGNOSTIC HUD (?perf=1)
   Loaded strictly on demand when URL contains ?perf=1.
   Zero DOM nodes, zero rAF loops, zero overhead otherwise.
   ========================================= */

const WINDOW_SIZE = 120;
const UI_FLUSH_MS = 250;

export function initPerfHud() {
  if (document.getElementById('perf-hud')) return;

  const hud = document.createElement('aside');
  hud.id = 'perf-hud';
  hud.className = 'perf-hud';
  hud.setAttribute('role', 'status');
  hud.setAttribute('aria-live', 'off');
  hud.setAttribute('aria-label', 'Performance Telemetry');

  hud.innerHTML = `
    <div class="perf-hud-head">
      <span class="perf-hud-title">PERF // TELEMETRY</span>
      <div class="perf-hud-actions">
        <button type="button" class="perf-hud-btn" id="perf-hud-reset" title="Сбросить счётчики">RST</button>
        <button type="button" class="perf-hud-btn" id="perf-hud-close" aria-label="Скрыть HUD" title="Закрыть">×</button>
      </div>
    </div>
    <div class="perf-hud-grid">
      <div class="perf-metric">
        <span class="perf-metric-lbl">RAF RATE</span>
        <strong class="perf-metric-val" id="perf-raf-fps">—</strong>
      </div>
      <div class="perf-metric">
        <span class="perf-metric-lbl">FRAME INTERVAL</span>
        <strong class="perf-metric-val" id="perf-frame-avg">—</strong>
      </div>
      <div class="perf-metric">
        <span class="perf-metric-lbl">P95 MS</span>
        <strong class="perf-metric-val" id="perf-frame-p95">—</strong>
      </div>
      <div class="perf-metric">
        <span class="perf-metric-lbl">MISSED DEADLINES</span>
        <strong class="perf-metric-val" id="perf-missed">0</strong>
      </div>
      <div class="perf-metric is-wide">
        <span class="perf-metric-lbl">ADAPTIVE DPR</span>
        <strong class="perf-metric-val" id="perf-dpr">IDLE</strong>
      </div>
    </div>
    <div class="perf-hud-loops">
      <span class="perf-loop-item">WEBGL <b id="perf-loop-webgl">PAUSED</b></span>
      <span class="perf-loop-sep" aria-hidden="true">·</span>
      <span class="perf-loop-item">ATMOSPHERE <b id="perf-loop-atmo">PAUSED</b></span>
      <span class="perf-loop-sep" aria-hidden="true">·</span>
      <span class="perf-loop-item">AUDIO <b id="perf-loop-audio">PAUSED</b></span>
    </div>
  `;

  document.body.appendChild(hud);

  const fpsEl = hud.querySelector('#perf-raf-fps');
  const avgEl = hud.querySelector('#perf-frame-avg');
  const p95El = hud.querySelector('#perf-frame-p95');
  const missedEl = hud.querySelector('#perf-missed');
  const dprEl = hud.querySelector('#perf-dpr');
  const webglEl = hud.querySelector('#perf-loop-webgl');
  const atmoEl = hud.querySelector('#perf-loop-atmo');
  const audioEl = hud.querySelector('#perf-loop-audio');
  const resetBtn = hud.querySelector('#perf-hud-reset');
  const closeBtn = hud.querySelector('#perf-hud-close');

  const samples = new Float32Array(WINDOW_SIZE);
  const scratch = new Float32Array(WINDOW_SIZE);
  let count = 0;
  let cursor = 0;
  let sumMs = 0;
  let missedDeadlines = 0;
  let baselineMs = 16.67;
  let lastTs = 0;
  let lastFlushAt = 0;
  let rafId = null;
  let disposed = false;

  const cache = {
    fps: '',
    avg: '',
    p95: '',
    missed: '',
    dpr: '',
    webgl: '',
    atmo: '',
    audio: ''
  };

  function setLoopBadge(el, key, isRunning) {
    const label = isRunning ? 'RUNNING' : 'PAUSED';
    if (cache[key] === label || !el) return;
    cache[key] = label;
    el.textContent = label;
    el.classList.toggle('is-running', isRunning);
  }

  function resetCounters() {
    count = 0;
    cursor = 0;
    sumMs = 0;
    missedDeadlines = 0;
    baselineMs = 16.67;
    lastTs = 0;
    lastFlushAt = 0;
    if (missedEl) {
      cache.missed = '0';
      missedEl.textContent = '0';
    }
  }

  function flushUI() {
    if (count > 0) {
      const avg = sumMs / count;
      const fps = avg > 0 ? 1000 / avg : 0;

      for (let i = 0; i < count; i++) scratch[i] = samples[i];
      const view = scratch.subarray(0, count);
      view.sort();

      const p15 = view[Math.min(count - 1, Math.floor(count * 0.15))];
      if (count >= 16 && p15 >= 3.0 && p15 <= 22.0) {
        baselineMs = p15;
      }
      const p95 = view[Math.min(count - 1, Math.floor((count - 1) * 0.95))];

      const fpsStr = `${fps.toFixed(1)} HZ`;
      const avgStr = `${avg.toFixed(2)} MS`;
      const p95Str = `${p95.toFixed(2)} MS`;

      if (fpsEl && cache.fps !== fpsStr) {
        cache.fps = fpsStr;
        fpsEl.textContent = fpsStr;
      }
      if (avgEl && cache.avg !== avgStr) {
        cache.avg = avgStr;
        avgEl.textContent = avgStr;
      }
      if (p95El && cache.p95 !== p95Str) {
        cache.p95 = p95Str;
        p95El.textContent = p95Str;
      }
    }

    const missedStr = String(missedDeadlines);
    if (missedEl && cache.missed !== missedStr) {
      cache.missed = missedStr;
      missedEl.textContent = missedStr;
    }

    const ps = appState.perfState;
    if (ps) {
      const dprStr = ps.galaxyOpen
        ? `${Number(ps.galaxyDpr || 1).toFixed(2)}× · S${(ps.galaxyStep || 0) + 1}/${ps.galaxyStepsTotal || 1}`
        : 'IDLE';
      if (dprEl && cache.dpr !== dprStr) {
        cache.dpr = dprStr;
        dprEl.textContent = dprStr;
      }
      setLoopBadge(webglEl, 'webgl', Boolean(ps.webglRunning));
      setLoopBadge(atmoEl, 'atmo', Boolean(ps.atmosphereRunning));
      setLoopBadge(audioEl, 'audio', Boolean(ps.audioRunning));
    }
  }

  function tick(now) {
    rafId = null;
    if (disposed || document.hidden) return;

    if (lastTs > 0) {
      const dtMs = now - lastTs;
      if (dtMs > 0.5 && dtMs < 250) {
        if (dtMs < baselineMs) {
          baselineMs = baselineMs * 0.85 + dtMs * 0.15;
        }
        const deadlineMs = Math.max(baselineMs * 1.5, baselineMs + 4.0);
        if (count >= 12 && dtMs > deadlineMs) {
          missedDeadlines++;
        }

        if (count === WINDOW_SIZE) {
          sumMs -= samples[cursor];
        } else {
          count++;
        }
        samples[cursor] = dtMs;
        sumMs += dtMs;
        cursor = (cursor + 1) % WINDOW_SIZE;
      }
    }
    lastTs = now;

    if (lastFlushAt === 0 || (now - lastFlushAt) >= UI_FLUSH_MS) {
      lastFlushAt = now;
      flushUI();
    }

    rafId = requestAnimationFrame(tick);
  }

  function syncLoop() {
    if (disposed || document.hidden) {
      lastTs = 0;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      return;
    }
    if (rafId === null) {
      lastTs = 0;
      rafId = requestAnimationFrame(tick);
    }
  }

  function onVisibility() {
    syncLoop();
  }

  resetBtn?.addEventListener('click', resetCounters);
  closeBtn?.addEventListener('click', () => {
    disposed = true;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    document.removeEventListener('visibilitychange', onVisibility);
    hud.remove();
  });

  document.addEventListener('visibilitychange', onVisibility);
  flushUI();
  syncLoop();
}
