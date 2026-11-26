import { formatRank, escapeHtml } from './config.js';
import { appState, PEAK_FICTION, buildFallbackGalaxyNodes } from './data.js';
import { loadAnimeCoversBatch, loadHostAnimeRates } from './shikimori.js';
import { openHoloDeck } from './ui.js';

/* =========================================
   3D ARCHIVE GALAXY ENGINE (WEBGL / THREE.JS)
   ========================================= */
let threeLoadPromise = null;

function ensureThreeJsLoaded() {
  if (window.THREE) return Promise.resolve(window.THREE);
  if (threeLoadPromise) return threeLoadPromise;

  const sources = [
    './assets/js/vendor/three.min.js',
    'https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js',
    'https://unpkg.com/three@0.147.0/build/three.min.js'
  ];

  threeLoadPromise = new Promise((resolve, reject) => {
    let idx = 0;
    function tryNext() {
      if (window.THREE) return resolve(window.THREE);
      if (idx >= sources.length) {
        threeLoadPromise = null;
        return reject(new Error('Three.js load failed'));
      }
      const src = sources[idx++];
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      if (/^https?:\/\//i.test(src)) {
        script.crossOrigin = 'anonymous';
        script.referrerPolicy = 'no-referrer';
      }
      script.onload = () => {
        if (window.THREE) resolve(window.THREE);
        else tryNext();
      };
      script.onerror = () => {
        script.remove();
        tryNext();
      };
      document.head.appendChild(script);
    }
    tryNext();
  });
  return threeLoadPromise;
}

export function initArchiveGalaxy(player) {
  const overlay = document.getElementById('galaxy-overlay');
  const canvasWrap = document.getElementById('galaxy-canvas-wrap');
  const labelsLayer = document.getElementById('galaxy-labels-layer');
  const reticle = document.getElementById('galaxy-reticle');
  const hopPill = document.getElementById('galaxy-hop-pill');
  const hopStepEl = document.getElementById('galaxy-hop-step');
  const hopTitleEl = document.getElementById('galaxy-hop-title');
  const hoverTip = document.getElementById('galaxy-hover-tip');
  const tipImg = document.getElementById('galaxy-tip-img');
  const tipTitle = document.getElementById('galaxy-tip-title');
  const tipMeta = document.getElementById('galaxy-tip-meta');
  const countPill = document.getElementById('galaxy-count-pill');
  const loader = document.getElementById('galaxy-loader');
  const loaderText = document.getElementById('galaxy-loader-text');

  const searchInput = document.getElementById('galaxy-search-input');
  const tmToggleBtn = document.getElementById('galaxy-tm-btn');
  const warpBtn = document.getElementById('galaxy-warp-btn');
  const linesBtn = document.getElementById('galaxy-lines-btn');
  const orbitBtn = document.getElementById('galaxy-orbit-btn');
  const resetBtn = document.getElementById('galaxy-reset-btn');
  const musicBtn = document.getElementById('galaxy-music-btn');
  const closeBtn = document.getElementById('galaxy-close-btn');

  const tmPanel = document.getElementById('galaxy-tm-panel');
  const tmPlayBtn = document.getElementById('galaxy-tm-play-btn');
  const tmDateEl = document.getElementById('galaxy-tm-date');
  const tmScrubber = document.getElementById('galaxy-tm-scrubber');
  const tmStarsEl = document.getElementById('galaxy-tm-stars');
  const tmEpsEl = document.getElementById('galaxy-tm-eps');
  const tmSpeedBtn = document.getElementById('galaxy-tm-speed-btn');
  const tmAxisGroup = document.getElementById('galaxy-tm-axis-group');
  const tmAxisBtns = Array.from(document.querySelectorAll('[data-tmaxis]'));
  const tmCloseBtn = document.getElementById('galaxy-tm-close-btn');

  const inspector = document.getElementById('galaxy-inspector');
  const inspClose = document.getElementById('galaxy-insp-close');
  const inspImg = document.getElementById('galaxy-insp-img');
  const inspTag = document.getElementById('galaxy-insp-tag');
  const inspTitle = document.getElementById('galaxy-insp-title');
  const inspSub = document.getElementById('galaxy-insp-sub');
  const inspPills = document.getElementById('galaxy-insp-pills');
  const inspNote = document.getElementById('galaxy-insp-note');
  const inspHoloBtn = document.getElementById('galaxy-insp-holo-btn');
  const inspLink = document.getElementById('galaxy-insp-link');

  const layoutBtns = Array.from(document.querySelectorAll('[data-glayout]'));
  const filterBtns = Array.from(document.querySelectorAll('[data-gfilter]'));

  if (!overlay || !canvasWrap) return;

  const ZERO_SPECTRUM = { energy: 0, bass: 0, mid: 0, high: 0, isPlaying: false };
  const TM_MONTHS_RU = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
  const ASTROLABE_BASE_OPACITY = [0.14, 0.085, 0.06];
  const HIGHLIGHT_MAX_SEGS = 6;

  // Frame-rate independent exponential smoothing constants (matched to 60 Hz feel)
  const MAX_DT_SEC = 0.05;
  const CAM_LAMBDA = 5.34;
  const CAM_HOP_LAMBDA = 9.05;
  const LOOK_LAMBDA = 5.0;
  const LOOK_HOP_LAMBDA = 10.46;

  // Angular velocities in radians/second (60 Hz baseline × 60)
  const ORBIT_BASE_RAD_SEC = 0.084;
  const ORBIT_BASS_RAD_SEC = 0.108;
  const TM_ORBIT_BASE_RAD_SEC = 0.132;
  const TM_ORBIT_BASS_RAD_SEC = 0.084;
  const DUST_BASE_RAD_SEC = 0.0156;
  const DUST_BASS_RAD_SEC = 0.033;
  const ASTRO_BASE_RAD_SEC = 0.0252;
  const ASTRO_MID_RAD_SEC = 0.015;

  // Silent Adaptive Performance (downward-only per session + strict 6s cooldown)
  const AP_WINDOW = 60;
  const AP_SUSTAIN_MS = 2500;
  const AP_COOLDOWN_MS = 6000;
  const AP_WARMUP_MS = 2500;
  const apState = {
    frames: new Float32Array(AP_WINDOW),
    count: 0,
    cursor: 0,
    sumMs: 0,
    highRefreshOverCount: 0,
    fastBaselineMs: 16.67,
    warmupUntil: 0,
    poorSince: 0,
    lastStepAt: 0,
    stepIdx: 0,
    currentDpr: 1
  };

  function isCoarseMobileViewport() {
    const coarse = Boolean(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    return coarse || window.innerWidth <= 720;
  }

  function getAdaptiveSteps() {
    if (isCoarseMobileViewport()) {
      return [
        { maxDpr: 1.25, dustScale: 1.0, dustAlpha: 1.0 },
        { maxDpr: 1.0, dustScale: 0.82, dustAlpha: 0.78 }
      ];
    }
    return [
      { maxDpr: 1.5, dustScale: 1.0, dustAlpha: 1.0 },
      { maxDpr: 1.15, dustScale: 0.88, dustAlpha: 0.86 },
      { maxDpr: 1.0, dustScale: 0.74, dustAlpha: 0.70 }
    ];
  }

  function getStartDprCeiling() {
    return Math.min(window.devicePixelRatio || 1, isCoarseMobileViewport() ? 1.25 : 1.5);
  }

  function resetAdaptiveWindow(now, warmupMs) {
    apState.count = 0;
    apState.cursor = 0;
    apState.sumMs = 0;
    apState.highRefreshOverCount = 0;
    apState.poorSince = 0;
    apState.warmupUntil = (now || performance.now()) + (warmupMs || AP_WARMUP_MS);
  }

  function syncPerfGalaxyState() {
    const ps = appState.perfState;
    if (!ps) return;
    const steps = getAdaptiveSteps();
    ps.galaxyOpen = isOpen;
    ps.webglRunning = rafId !== null;
    ps.galaxyDpr = apState.currentDpr;
    ps.galaxyStep = apState.stepIdx;
    ps.galaxyStepsTotal = steps.length;
  }

  function applyAdaptiveStep(stepIdx, now) {
    const steps = getAdaptiveSteps();
    const clamped = Math.max(0, Math.min(steps.length - 1, stepIdx));
    const cfg = steps[clamped];
    const nextDpr = Math.min(window.devicePixelRatio || 1, cfg.maxDpr);
    apState.stepIdx = clamped;
    apState.currentDpr = nextDpr;
    if (now) apState.lastStepAt = now;

    if (renderer) {
      renderer.setPixelRatio(nextDpr);
      renderer.setSize(galaxyViewW, galaxyViewH, false);
    }
    if (starMat) starMat.uniforms.uPixelRatio.value = nextDpr;
    if (dustMat) {
      dustMat.uniforms.uPixelRatio.value = nextDpr;
      dustMat.uniforms.uDustScale.value = cfg.dustScale;
      dustMat.uniforms.uDustAlpha.value = cfg.dustAlpha;
    }
    syncPerfGalaxyState();
  }

  function sampleAdaptiveFrame(rawFrameMs, now) {
    // Ignore tab/modal resume spikes or invalid intervals
    if (!isFinite(rawFrameMs) || rawFrameMs <= 0.5 || rawFrameMs > 250) return;

    // Track display's smooth baseline cadence (converges toward ~6.9ms on 144Hz, ~8.3ms on 120Hz, ~16.7ms on 60Hz)
    if (rawFrameMs < apState.fastBaselineMs) {
      apState.fastBaselineMs = apState.fastBaselineMs * 0.85 + rawFrameMs * 0.15;
    } else if (rawFrameMs < 20) {
      apState.fastBaselineMs = apState.fastBaselineMs * 0.992 + rawFrameMs * 0.008;
    }

    const idx = apState.cursor;
    if (apState.count === AP_WINDOW) {
      const evicted = apState.frames[idx];
      apState.sumMs -= evicted;
      if (evicted > 12) apState.highRefreshOverCount--;
    } else {
      apState.count++;
    }
    apState.frames[idx] = rawFrameMs;
    apState.sumMs += rawFrameMs;
    if (rawFrameMs > 12) apState.highRefreshOverCount++;
    apState.cursor = (idx + 1) % AP_WINDOW;

    const steps = getAdaptiveSteps();
    if (apState.stepIdx >= steps.length - 1) return;
    if (now < apState.warmupUntil) return;
    if (apState.lastStepAt > 0 && (now - apState.lastStepAt) < AP_COOLDOWN_MS) return;
    if (apState.count < AP_WINDOW) return;

    const avgMs = apState.sumMs / apState.count;
    const isHighRefresh = apState.fastBaselineMs < 11.5;
    const isDegraded = isHighRefresh
      ? (avgMs > 12.0 || (apState.highRefreshOverCount / apState.count) >= 0.35)
      : (avgMs > 22.0);

    if (isDegraded) {
      if (apState.poorSince === 0) {
        apState.poorSince = now;
      } else if ((now - apState.poorSince) >= AP_SUSTAIN_MS) {
        applyAdaptiveStep(apState.stepIdx + 1, now);
        resetAdaptiveWindow(now, AP_COOLDOWN_MS);
      }
    } else {
      apState.poorSince = 0;
    }
  }

  let isOpen = false;
  let isBooting = false;
  let rafId = null;
  let lastFrameAt = 0;

  const holoModalEl = document.getElementById('holo-modal');
  const detailModalEl = document.getElementById('detail-modal');
  const hudTopEl = overlay.querySelector('.galaxy-hud-top');
  const hudBottomEl = overlay.querySelector('.galaxy-hud-bottom');

  function isGalaxyOccluded() {
    return Boolean(
      (holoModalEl && holoModalEl.classList.contains('is-open')) ||
      (detailModalEl && detailModalEl.classList.contains('is-open'))
    );
  }

  function updateMobileHudClearance() {
    if (!overlay || !isOpen) return;
    if (window.innerWidth > 720) {
      overlay.style.removeProperty('--galaxy-top-h');
      overlay.style.removeProperty('--galaxy-bottom-h');
      return;
    }
    if (hudTopEl) {
      const th = Math.ceil(hudTopEl.getBoundingClientRect().height);
      if (th > 0) overlay.style.setProperty('--galaxy-top-h', `${th}px`);
    }
    if (hudBottomEl) {
      const bh = Math.ceil(hudBottomEl.getBoundingClientRect().height);
      if (bh > 0) overlay.style.setProperty('--galaxy-bottom-h', `${bh}px`);
    }
  }

  let THREE_LIB = null;
  let renderer = null;
  let scene = null;
  let camera = null;
  let starPoints = null;
  let starGeom = null;
  let starMat = null;
  let dustPoints = null;
  let dustGeom = null;
  let dustMat = null;
  let astrolabeGroup = null;
  const astrolabeMats = [];
  let linkLines = null;
  let linkGeom = null;
  let linkMat = null;
  let linkPairs = null;
  let highlightLine = null;
  let highlightGeom = null;
  let highlightMat = null;
  let highlightPosBuf = null;
  let highlightProgBuf = null;
  let highlightSeedBuf = null;
  let hopTrailLine = null;
  let hopTrailGeom = null;
  let hopTrailMat = null;
  let hopTrailPosBuf = null;
  let hopTrailColBuf = null;
  const HOP_MAX_VERTS = 16;

  // Zero-Lag rAF Star-Hopping Roulette State
  const hopState = {
    active: false,
    chain: [],
    durations: [],
    segIdx: 0,
    segElapsedMs: 0,
    fadeElapsedMs: 0,
    fading: false,
    focusIdx: -1,
    hidePillTimer: null
  };

  // Smooth Cubic Fly-To Camera State
  const flyState = {
    active: false,
    startTime: 0,
    duration: 780,
    fromLook: { x: 0, y: 0, z: 0 },
    toLook: { x: 0, y: 0, z: 0 },
    fromRadius: 178,
    toRadius: 56,
    fromPhi: 1.12,
    toPhi: 1.12,
    fromTheta: 0.45,
    toTheta: 0.45
  };

  // Chronological Time Machine State
  const tmState = {
    open: false,
    playing: false,
    progress: 0,
    speed: 1,
    durationMs: 14000,
    axis: 'year',
    hasWatchedDates: false,
    userDraggedCamera: false,
    hasActiveFlash: false,
    order: [],
    triggers: null,
    cumEps: null,
    dateLabels: [],
    ignitedAt: null,
    revealedCount: 0,
    lastLinkRevealed: -1,
    lastDateStr: '',
    lastStarsStr: '',
    lastEpsStr: '',
    lastScrubVal: -1
  };

  let activeNodes = [];
  let activeLayout = 'spiral';
  let activeFilter = 'all';
  let activeSearch = '';
  let showLinks = true;
  let autoOrbit = !appState.prefersReducedMotion;

  let currentPos = null;
  let startPos = null;
  let targetPos = null;
  let morphStart = 0;
  let morphDuration = 1050;
  let isMorphing = false;

  let hoveredIdx = -1;
  let selectedIdx = -1;
  let clusterAnchors = [];
  let clusterLabelEls = [];
  let clusterLabelState = [];
  const reticleState = { x: -9999, y: -9999, visible: false };
  let galaxyViewW = window.innerWidth;
  let galaxyViewH = window.innerHeight;
  let lastClusterProjAt = 0;

  // Smooth Spherical Orbit Camera State
  const camState = {
    theta: 0.45,
    phi: 1.12,
    radius: 178,
    targetTheta: 0.45,
    targetPhi: 1.12,
    targetRadius: 178,
    look: { x: 0, y: 0, z: 0 },
    targetLook: { x: 0, y: 0, z: 0 }
  };

  // Deterministic hash for stable star placement
  function hash01(seed) {
    let x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x);
  }

  function nodeMatchesFilter(node) {
    const q = activeSearch.trim().toLowerCase();
    if (q && !String(node.title || '').toLowerCase().includes(q)) return false;
    if (activeFilter === 'planned') return node.status === 'planned';
    if (node.status === 'planned') return false;
    if (activeFilter === 'peak') return Boolean(node.isPeak);
    if (activeFilter === 'elite') return Boolean(node.isPeak || (Number(node.score) || 0) >= 9);
    if (activeFilter === 'watching') return node.status === 'watching' || node.status === 'rewatching';
    if (activeFilter === 'hottakes') {
      return node.score > 0 && node.shikiScore > 0 && Math.abs(node.score - node.shikiScore) >= 1.45;
    }
    return true;
  }

  function computeStarVisuals(node) {
    const s = Number(node.score) || 0;
    const sh = Number(node.shikiScore) || 0;
    const delta = (s > 0 && sh > 0) ? (s - sh) : 0;

    // Returns [r, g, b, size, spike, tier] — Strict Pure B&W Monochrome
    if (node.isPeak) {
      return [1.0, 1.0, 1.0, node.peakRank <= 3 ? 19.5 : 15.8, 1.0, 1.0];
    }
    if (node.status === 'planned') {
      if (sh >= 8.2) return [0.92, 0.92, 0.92, 13.8, 0.85, 1.0];
      if (sh >= 7.5) return [0.76, 0.76, 0.76, 10.2, 0.30, 0.35];
      return [0.54, 0.54, 0.54, 7.6, 0.0, 0.0];
    }
    if (node.status === 'watching' || node.status === 'rewatching') {
      return [0.94, 0.94, 0.94, 13.2, 0.72, 0.60];
    }
    if (s >= 10) {
      return [0.95, 0.95, 0.95, 14.2, 0.95, 1.0];
    }
    if (s >= 9) {
      return [0.82, 0.82, 0.82, 11.4, 0.50, 0.55];
    }
    if (delta <= -1.8 && sh >= 7.3) {
      return [0.72, 0.72, 0.72, 10.2, 0.32, 0.25];
    }
    if (s >= 7) {
      return [0.64, 0.64, 0.64, 8.4, 0.0, 0.0];
    }
    if (s > 0) {
      return [0.50, 0.50, 0.50, 6.8, 0.0, 0.0];
    }
    return [0.50, 0.50, 0.50, 6.4, 0.0, 0.0];
  }

  function computeLayoutPositions(nodes, layoutMode) {
    const count = nodes.length;
    const arr = new Float32Array(count * 3);
    clusterAnchors = [];
    const isPlannedMode = activeFilter === 'planned';

    if (layoutMode === 'eras') {
      // 4 Distinct 3D Floating Era Constellations
      const centers = {
        modern:  { x:  58, y:  18, z:  34, label: '2020+ · СОВРЕМЕННОСТЬ' },
        wave:    { x: -58, y:  12, z:  38, label: '2013–2019 · НОВАЯ ВОЛНА' },
        golden:  { x: -46, y: -16, z: -50, label: '2005–2012 · ЗОЛОТАЯ ЭРА' },
        classic: { x:  54, y: -20, z: -46, label: 'ДО 2005 · КЛАССИКА' }
      };
      Object.values(centers).forEach((c) => clusterAnchors.push(c));

      const buckets = { modern: [], wave: [], golden: [], classic: [] };
      nodes.forEach((n, idx) => {
        if (isPlannedMode ? n.status !== 'planned' : n.status === 'planned') return;
        const y = Number(n.year) || 2018;
        if (y >= 2020) buckets.modern.push(idx);
        else if (y >= 2013) buckets.wave.push(idx);
        else if (y >= 2005) buckets.golden.push(idx);
        else buckets.classic.push(idx);
      });

      Object.entries(buckets).forEach(([key, indices]) => {
        const c = centers[key];
        const total = Math.max(1, indices.length);
        indices.forEach((nodeIdx, k) => {
          const n = nodes[nodeIdx];
          const h1 = hash01(n.id * 1.13 + 3);
          const h2 = hash01(n.id * 2.41 + 7);
          const h3 = hash01(n.id * 3.77 + 11);
          // Fibonacci sphere distribution around cluster center
          const goldenAng = Math.PI * (3 - Math.sqrt(5));
          const py = 1 - ((k + 0.5) / total) * 2;
          const radAtY = Math.sqrt(Math.max(0, 1 - py * py));
          const theta = goldenAng * k + h1 * 0.4;
          const baseR = n.isPeak ? 9 + h2 * 10 : 14 + Math.pow(h3, 0.72) * 27;
          arr[nodeIdx * 3]     = c.x + Math.cos(theta) * radAtY * baseR;
          arr[nodeIdx * 3 + 1] = c.y + py * baseR * 0.78;
          arr[nodeIdx * 3 + 2] = c.z + Math.sin(theta) * radAtY * baseR;
        });
      });
      return arr;
    }

    if (layoutMode === 'spectrum') {
      // 3D Score Stratification Cylinder/Sphere: Y = user score (or Shiki score in planned mode)
      if (isPlannedMode) {
        clusterAnchors.push(
          { x: 0, y:  56, z: 0, label: '8.5+ · ТОП ШИКИМОРИ' },
          { x: 0, y:  18, z: 0, label: '7.5–8.4 · ОСНОВНОЙ СЛОЙ' },
          { x: 0, y: -28, z: 0, label: '< 7.5 · НИЖНЯЯ ОРБИТА' }
        );
      } else {
        clusterAnchors.push(
          { x: 0, y:  62, z: 0, label: '10/10 · ЗЕНИТ БАЗЫ' },
          { x: 0, y:  24, z: 0, label: '8–9 · ОСНОВНОЙ СЛОЙ' },
          { x: 0, y: -26, z: 0, label: '≤ 6 · НИЖНЯЯ ОРБИТА' }
        );
      }
      nodes.forEach((n, idx) => {
        const h1 = hash01(n.id * 1.7 + 19);
        const h2 = hash01(n.id * 2.9 + 5);
        const yearNorm = Math.max(0, Math.min(1, ((Number(n.year) || 2016) - 1995) / 31));
        const angle = yearNorm * Math.PI * 2 + (h1 - 0.5) * 1.2;

        if (n.status === 'planned') {
          const sh = Number(n.shikiScore) || 7.2;
          const y = Math.max(-52, Math.min(58, ((sh - 7.1) / 2.0) * 50 + (h2 - 0.5) * 7.0));
          const radius = Math.min(82, 16 + Math.max(0, 9.0 - sh) * 18 + h1 * 24);
          arr[idx * 3]     = Math.cos(angle) * radius;
          arr[idx * 3 + 1] = y;
          arr[idx * 3 + 2] = Math.sin(angle) * radius;
          return;
        }

        const s = Number(n.score) || 6.5;
        const sh = Number(n.shikiScore) || 7.2;
        const delta = Math.abs(s - sh);
        const y = ((s - 5.5) / 4.5) * 52 + (h2 - 0.5) * 6.5;
        const radius = n.isPeak
          ? 14 + (n.peakRank || 1) * 1.3
          : Math.min(86, 22 + delta * 17 + h1 * 24);
        arr[idx * 3]     = Math.cos(angle) * radius;
        arr[idx * 3 + 1] = y;
        arr[idx * 3 + 2] = Math.sin(angle) * radius;
      });
      return arr;
    }

    // Default: Logarithmic 4-Arm Spiral Galaxy (Peak 16 or Planned Shiki core -> outer rim)
    clusterAnchors.push(
      { x: 0, y: 16, z: 0, label: isPlannedMode ? 'В ПЛАНАХ · К ПРОСМОТРУ' : 'ЯДРО · PEAK 16' }
    );
    const arms = 4;
    nodes.forEach((n, idx) => {
      const h1 = hash01(n.id * 1.37 + 1);
      const h2 = hash01(n.id * 2.83 + 5);
      const h3 = hash01(n.id * 4.19 + 9);

      if (n.status === 'planned') {
        const sh = Number(n.shikiScore) || 7.0;
        const scoreNorm = Math.max(0, Math.min(1, (9.1 - sh) / 3.2));
        const r = 10 + scoreNorm * 72 + h1 * 22;
        const armIdx = idx % arms;
        const armBaseAngle = (armIdx / arms) * Math.PI * 2;
        const twist = r * 0.048;
        const scatter = (h2 - 0.5) * (0.48 + scoreNorm * 0.42);
        const angle = armBaseAngle + twist + scatter;
        const verticalSpread = (h3 - 0.5) * (16 + (1 - scoreNorm) * 10);

        arr[idx * 3]     = Math.cos(angle) * r;
        arr[idx * 3 + 1] = verticalSpread;
        arr[idx * 3 + 2] = Math.sin(angle) * r;
        return;
      }

      if (n.isPeak) {
        const rank = n.peakRank || (idx + 1);
        const a = (rank / PEAK_FICTION.length) * Math.PI * 2;
        const r = 10 + (rank <= 5 ? rank * 1.9 : 8 + rank * 1.5);
        arr[idx * 3]     = Math.cos(a) * r;
        arr[idx * 3 + 1] = (h2 - 0.5) * 9;
        arr[idx * 3 + 2] = Math.sin(a) * r;
        return;
      }

      if (n.status === 'watching' || n.status === 'rewatching') {
        const a = h1 * Math.PI * 2;
        const r = 24 + h2 * 14;
        arr[idx * 3]     = Math.cos(a) * r;
        arr[idx * 3 + 1] = 10 + (h3 - 0.5) * 10;
        arr[idx * 3 + 2] = Math.sin(a) * r;
        return;
      }

      const s = Number(n.score) || 6;
      // Higher score -> closer to galactic core
      const scoreNorm = Math.max(0, Math.min(1, (10 - s) / 8));
      const r = 24 + scoreNorm * 66 + h1 * 26;
      const armIdx = idx % arms;
      const armBaseAngle = (armIdx / arms) * Math.PI * 2;
      const twist = r * 0.044;
      const scatter = (h2 - 0.5) * (0.52 + scoreNorm * 0.45);
      const angle = armBaseAngle + twist + scatter;
      const verticalSpread = (h3 - 0.5) * (18 + (1 - scoreNorm) * 10);

      arr[idx * 3]     = Math.cos(angle) * r;
      arr[idx * 3 + 1] = verticalSpread;
      arr[idx * 3 + 2] = Math.sin(angle) * r;
    });
    return arr;
  }

  function rebuildClusterLabelsDOM() {
    if (!labelsLayer) return;
    labelsLayer.innerHTML = clusterAnchors.map((c) =>
      `<div class="galaxy-cluster-label">${escapeHtml(c.label)}</div>`
    ).join('');
    clusterLabelEls = Array.from(labelsLayer.querySelectorAll('.galaxy-cluster-label'));
    clusterLabelState = clusterLabelEls.map(() => ({ x: -9999, y: -9999, visible: false }));
    lastClusterProjAt = 0;
  }

  function buildConstellationLineIndices(positionsArr) {
    const count = activeNodes.length;
    const lineVerts = [];
    const lineCols = [];
    const segProgs = [];
    const segPhases = [];
    const segAlphas = [];
    const pairIndices = [];

    const revealAttr = starGeom?.getAttribute('aReveal');
    const revealArr = tmState.open && revealAttr ? revealAttr.array : null;

    function pushSegment(a, b, r1, g1, b1, r2, g2, b2) {
      lineVerts.push(
        positionsArr[a * 3], positionsArr[a * 3 + 1], positionsArr[a * 3 + 2],
        positionsArr[b * 3], positionsArr[b * 3 + 1], positionsArr[b * 3 + 2]
      );
      lineCols.push(r1, g1, b1, r2, g2, b2);
      segProgs.push(0.0, 1.0);
      const phase = hash01(a * 3.17 + b * 1.93) * 6.2831853;
      segPhases.push(phase, phase);
      const vis = revealArr ? ((revealArr[a] > 0.5 && revealArr[b] > 0.5) ? 1.0 : 0.0) : 1.0;
      segAlphas.push(vis, vis);
      pairIndices.push(a, b);
    }

    // 1. Peak 16 backbone ring in order (only when Peak stars match current filter)
    const peakIndices = [];
    activeNodes.forEach((n, idx) => {
      if (n.isPeak && nodeMatchesFilter(n)) peakIndices.push({ idx, rank: n.peakRank || 99 });
    });
    peakIndices.sort((a, b) => a.rank - b.rank);
    for (let i = 0; i < peakIndices.length - 1; i++) {
      pushSegment(peakIndices[i].idx, peakIndices[i + 1].idx, 0.90, 0.90, 0.90, 0.72, 0.72, 0.72);
    }

    // 2. Nearest neighbor filaments within same score/era tier (max 1 link per star to stay airy & clean)
    const maxDistSq = activeLayout === 'eras' ? 32 * 32 : 24 * 24;
    const isPlannedMode = activeFilter === 'planned';
    for (let i = 0; i < count; i++) {
      if (!nodeMatchesFilter(activeNodes[i])) continue;
      const ix = positionsArr[i * 3];
      const iy = positionsArr[i * 3 + 1];
      const iz = positionsArr[i * 3 + 2];
      let bestJ = -1;
      let bestD = maxDistSq;

      // Sample stride for fast O(N) performance
      const step = isPlannedMode ? 1 : (count > 260 ? 2 : 1);
      for (let j = i + 1; j < count; j += step) {
        if (!nodeMatchesFilter(activeNodes[j])) continue;
        const dx = positionsArr[j * 3] - ix;
        const dy = positionsArr[j * 3 + 1] - iy;
        const dz = positionsArr[j * 3 + 2] - iz;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < bestD && d2 > 4) {
          bestD = d2;
          bestJ = j;
        }
      }
      if (bestJ !== -1) {
        if (isPlannedMode) {
          pushSegment(i, bestJ, 0.62, 0.62, 0.62, 0.44, 0.44, 0.44);
        } else {
          pushSegment(i, bestJ, 0.58, 0.58, 0.58, 0.42, 0.42, 0.42);
        }
      }
    }

    linkPairs = new Int32Array(pairIndices);
    if (!linkLines || !THREE_LIB) return;
    const prevGeom = linkGeom;
    linkGeom = new THREE_LIB.BufferGeometry();
    linkGeom.setAttribute('position', new THREE_LIB.Float32BufferAttribute(lineVerts, 3));
    linkGeom.setAttribute('aColor', new THREE_LIB.Float32BufferAttribute(lineCols, 3));
    linkGeom.setAttribute('aSegProgress', new THREE_LIB.Float32BufferAttribute(segProgs, 1));
    linkGeom.setAttribute('aSegPhase', new THREE_LIB.Float32BufferAttribute(segPhases, 1));
    linkGeom.setAttribute('aSegAlpha', new THREE_LIB.Float32BufferAttribute(segAlphas, 1));
    if (lineVerts.length > 0) linkGeom.computeBoundingSphere();
    linkLines.geometry = linkGeom;
    if (prevGeom) prevGeom.dispose();
  }

  function updateHighlightStarLinks(focusIdx) {
    if (!highlightGeom || !highlightPosBuf || !highlightProgBuf || !highlightSeedBuf || !currentPos || focusIdx < 0 || focusIdx >= activeNodes.length) {
      if (highlightLine) highlightLine.visible = false;
      return;
    }
    const revealArr = tmState.open ? starGeom?.getAttribute('aReveal')?.array : null;
    if (revealArr && revealArr[focusIdx] < 0.5) {
      if (highlightLine) highlightLine.visible = false;
      return;
    }

    const fx = currentPos[focusIdx * 3];
    const fy = currentPos[focusIdx * 3 + 1];
    const fz = currentPos[focusIdx * 3 + 2];

    const neighbors = [];
    for (let i = 0; i < activeNodes.length; i++) {
      if (i === focusIdx || !nodeMatchesFilter(activeNodes[i])) continue;
      if (revealArr && revealArr[i] < 0.5) continue;
      const dx = currentPos[i * 3] - fx;
      const dy = currentPos[i * 3 + 1] - fy;
      const dz = currentPos[i * 3 + 2] - fz;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < 44 * 44) neighbors.push({ i, d2 });
    }
    neighbors.sort((a, b) => a.d2 - b.d2);

    const nCount = Math.min(HIGHLIGHT_MAX_SEGS, neighbors.length);
    for (let k = 0; k < nCount; k++) {
      const ni = neighbors[k].i;
      const v0 = k * 2;
      const v1 = v0 + 1;
      highlightPosBuf[v0 * 3]     = fx;
      highlightPosBuf[v0 * 3 + 1] = fy;
      highlightPosBuf[v0 * 3 + 2] = fz;
      highlightPosBuf[v1 * 3]     = currentPos[ni * 3];
      highlightPosBuf[v1 * 3 + 1] = currentPos[ni * 3 + 1];
      highlightPosBuf[v1 * 3 + 2] = currentPos[ni * 3 + 2];
      highlightProgBuf[v0] = 0.0;
      highlightProgBuf[v1] = 1.0;
      const seed = (ni % 13) * 0.48;
      highlightSeedBuf[v0] = seed;
      highlightSeedBuf[v1] = seed;
    }

    highlightGeom.setDrawRange(0, nCount * 2);
    highlightGeom.getAttribute('position').needsUpdate = true;
    highlightGeom.getAttribute('aProgress').needsUpdate = true;
    highlightGeom.getAttribute('aSeed').needsUpdate = true;

    if (highlightMat) {
      const focusNode = activeNodes[focusIdx];
      if (activeFilter === 'planned' || focusNode?.status === 'planned') {
        highlightMat.uniforms.uColor.value.setHex(0xcccccc);
      } else if (focusNode?.status === 'watching' || focusNode?.status === 'rewatching') {
        highlightMat.uniforms.uColor.value.setHex(0xffffff);
      } else {
        highlightMat.uniforms.uColor.value.setHex(0xe5e5e5);
      }
    }
    if (highlightLine) highlightLine.visible = nCount > 0;
  }

  function updateFilterAlphas() {
    if (!starGeom || !activeNodes.length) return;
    const alphaAttr = starGeom.getAttribute('aAlpha');
    if (!alphaAttr) return;
    const isPlannedMode = activeFilter === 'planned';
    let matchedCount = 0;
    let branchTotal = 0;
    for (let i = 0; i < activeNodes.length; i++) {
      const node = activeNodes[i];
      const inBranch = isPlannedMode ? node.status === 'planned' : node.status !== 'planned';
      if (inBranch) branchTotal++;
      const ok = nodeMatchesFilter(node);
      if (ok) matchedCount++;
      alphaAttr.array[i] = ok ? 1.0 : ((isPlannedMode || node.status === 'planned') ? 0.0 : 0.09);
    }
    alphaAttr.needsUpdate = true;

    if (countPill) {
      if (isPlannedMode) {
        countPill.textContent = matchedCount === branchTotal
          ? `${branchTotal} В ПЛАНАХ`
          : `${matchedCount} / ${branchTotal} В ПЛАНАХ`;
      } else {
        countPill.textContent = matchedCount === branchTotal
          ? `${branchTotal} ЗВЁЗД`
          : `${matchedCount} / ${branchTotal} ЗВЁЗД`;
      }
    }
    if (currentPos) buildConstellationLineIndices(currentPos);
  }

  function populateGalaxyScene() {
    if (!scene || !THREE_LIB) return;
    if (tmState.open) closeTimeMachine(false);

    activeNodes = appState.galaxyNodes.length ? appState.galaxyNodes : buildFallbackGalaxyNodes();
    const count = activeNodes.length;

    if (starPoints) {
      scene.remove(starPoints);
      starGeom?.dispose();
      starMat?.dispose();
    }

    const positions = computeLayoutPositions(activeNodes, activeLayout);
    currentPos = new Float32Array(positions);
    startPos = new Float32Array(positions);
    targetPos = new Float32Array(positions);

    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const alphas = new Float32Array(count);
    const spikes = new Float32Array(count);
    const indices = new Float32Array(count);
    const phases = new Float32Array(count);
    const tiers = new Float32Array(count);
    const reveals = new Float32Array(count);
    const flashes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const node = activeNodes[i];
      const [r, g, b, sz, sp, tier] = computeStarVisuals(node);
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
      sizes[i] = sz;
      alphas[i] = 1.0;
      spikes[i] = sp;
      indices[i] = i;
      phases[i] = hash01((node.id || (i + 1)) * 5.17 + i * 0.37) * 6.2831853;
      tiers[i] = tier;
      reveals[i] = 1.0;
      flashes[i] = 0.0;
    }

    starGeom = new THREE_LIB.BufferGeometry();
    starGeom.setAttribute('position', new THREE_LIB.BufferAttribute(currentPos, 3));
    starGeom.setAttribute('aColor', new THREE_LIB.BufferAttribute(colors, 3));
    starGeom.setAttribute('aSize', new THREE_LIB.BufferAttribute(sizes, 1));
    starGeom.setAttribute('aAlpha', new THREE_LIB.BufferAttribute(alphas, 1));
    starGeom.setAttribute('aSpike', new THREE_LIB.BufferAttribute(spikes, 1));
    starGeom.setAttribute('aIndex', new THREE_LIB.BufferAttribute(indices, 1));
    starGeom.setAttribute('aPhase', new THREE_LIB.BufferAttribute(phases, 1));
    starGeom.setAttribute('aTier', new THREE_LIB.BufferAttribute(tiers, 1));
    starGeom.setAttribute('aReveal', new THREE_LIB.BufferAttribute(reveals, 1));
    starGeom.setAttribute('aFlash', new THREE_LIB.BufferAttribute(flashes, 1));

    starMat = new THREE_LIB.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE_LIB.AdditiveBlending,
      uniforms: {
        uPixelRatio: { value: apState.currentDpr || getStartDprCeiling() },
        uTime: { value: 0 },
        uFocusIdx: { value: -1 },
        uBass: { value: 0 },
        uMid: { value: 0 },
        uHigh: { value: 0 }
      },
      vertexShader: `
        attribute vec3 aColor;
        attribute float aSize;
        attribute float aAlpha;
        attribute float aSpike;
        attribute float aIndex;
        attribute float aPhase;
        attribute float aTier;
        attribute float aReveal;
        attribute float aFlash;
        uniform float uPixelRatio;
        uniform float uTime;
        uniform float uFocusIdx;
        uniform float uBass;
        uniform float uMid;
        uniform float uHigh;
        varying vec3 vColor;
        varying float vEffAlpha;
        varying float vSpike;
        varying float vTier;
        varying float vFocus;
        varying float vFlash;
        varying float vZoomFade;

        void main() {
          vColor = aColor;
          vSpike = aSpike;
          vTier = aTier;
          vFlash = aFlash;
          vFocus = (abs(aIndex - uFocusIdx) < 0.5) ? 1.0 : 0.0;
          float effAlpha = aAlpha * aReveal;
          vEffAlpha = effAlpha;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float dist = max(18.0, -mvPosition.z);
          vZoomFade = clamp(120.0 / dist, 0.42, 1.15);

          float freq = 1.25 + fract(aPhase * 0.3183099) * 1.15;
          float twWave = 0.5 + 0.5 * (0.65 * sin(uTime * freq + aPhase) + 0.35 * sin(uTime * freq * 2.13 + aPhase * 1.67));
          float twinkle = 0.90 + twWave * (0.14 + uHigh * 0.22 + uMid * 0.08);
          float bassScale = 1.0 + uBass * (0.10 + aTier * 0.36 + aSpike * 0.14);
          float flashScale = 1.0 + aFlash * (0.85 + aTier * 0.30);
          float revealScale = 0.42 + 0.58 * smoothstep(0.0, 1.0, aReveal);
          float focusScale = 1.0 + vFocus * 0.64;
          float maxPt = (aFlash > 0.05 || vFocus > 0.5) ? 66.0 : 54.0;

          gl_PointSize = (effAlpha <= 0.01 || aAlpha <= 0.01 || aReveal <= 0.005)
            ? 0.0
            : clamp((aSize * twinkle * bassScale * flashScale * revealScale * focusScale * uPixelRatio * 124.0) / dist, 2.3, maxPt);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uBass;
        uniform float uHigh;
        varying vec3 vColor;
        varying float vEffAlpha;
        varying float vSpike;
        varying float vTier;
        varying float vFocus;
        varying float vFlash;
        varying float vZoomFade;

        void main() {
          if (vEffAlpha <= 0.01) discard;
          vec2 uv = gl_PointCoord - vec2(0.5);
          float d = length(uv);
          if (d > 0.5) discard;

          float core = exp(-d * d * 88.0) * 1.15 + exp(-d * 13.5) * 0.38;
          float corona = exp(-d * d * 24.0) * (0.24 + uBass * vTier * 0.26 + vFlash * 0.46) * vZoomFade;
          float outerGlow = pow(max(0.0, 1.0 - d * 2.0), 3.4) * (0.10 + vTier * 0.12 + vFlash * 0.34) * vZoomFade;

          float ax = abs(uv.x);
          float ay = abs(uv.y);
          float rayH = exp(-ay * 64.0) * exp(-ax * 5.6) * (1.0 - smoothstep(0.28, 0.50, ax));
          float rayV = exp(-ax * 64.0) * exp(-ay * 5.6) * (1.0 - smoothstep(0.28, 0.50, ay));
          float spikeAmt = vSpike * (0.48 + vTier * 0.24 + uBass * 0.26 + uHigh * 0.12) + vFocus * 0.52 + vFlash * 0.78;
          float spikes = (rayH + rayV) * spikeAmt * clamp(vZoomFade * 1.08, 0.62, 1.15);

          vec2 duv = vec2(uv.x + uv.y, uv.x - uv.y) * 0.70710678;
          float diag = (exp(-abs(duv.y) * 70.0) * exp(-abs(duv.x) * 12.0) + exp(-abs(duv.x) * 70.0) * exp(-abs(duv.y) * 12.0))
            * (vTier * 0.14 + vFocus * 0.18 + vFlash * 0.30);

          float intensity = core * (0.84 + vTier * 0.20 + vFocus * 0.24) + corona + outerGlow + spikes + diag;
          vec3 spikeTint = vec3(0.92, 0.92, 0.92);
          vec3 flashTint = vec3(1.0, 1.0, 1.0);
          vec3 col = mix(vColor, vec3(0.96, 0.96, 0.96), clamp(core * 0.44 + vFocus * 0.26, 0.0, 0.85));
          col = mix(col, spikeTint, clamp((spikes + diag) * 0.55, 0.0, 0.65));
          col = mix(col, flashTint, clamp(vFlash * 0.75, 0.0, 0.9));

          float alpha = clamp(intensity * vEffAlpha, 0.0, 0.96);
          gl_FragColor = vec4(col, alpha);
        }
      `
    });

    starPoints = new THREE_LIB.Points(starGeom, starMat);
    starPoints.frustumCulled = false;
    scene.add(starPoints);

    rebuildClusterLabelsDOM();
    updateFilterAlphas();
    if (selectedIdx >= activeNodes.length || (selectedIdx >= 0 && !nodeMatchesFilter(activeNodes[selectedIdx]))) {
      selectedIdx = -1;
      inspector?.classList.remove('is-open');
      updateHighlightStarLinks(-1);
    }
  }

  function startCameraFlyTo(tx, ty, tz, targetRadius, targetPhi, durationMs) {
    if (appState.prefersReducedMotion) {
      flyState.active = false;
      camState.look.x = tx;
      camState.look.y = ty;
      camState.look.z = tz;
      camState.targetLook.x = tx;
      camState.targetLook.y = ty;
      camState.targetLook.z = tz;
      camState.radius = targetRadius;
      camState.targetRadius = targetRadius;
      if (typeof targetPhi === 'number') {
        camState.phi = targetPhi;
        camState.targetPhi = targetPhi;
      }
      return;
    }

    flyState.fromLook.x = camState.look.x;
    flyState.fromLook.y = camState.look.y;
    flyState.fromLook.z = camState.look.z;
    flyState.toLook.x = tx;
    flyState.toLook.y = ty;
    flyState.toLook.z = tz;
    flyState.fromRadius = camState.radius;
    flyState.toRadius = targetRadius;
    flyState.fromPhi = camState.phi;
    flyState.toPhi = typeof targetPhi === 'number' ? targetPhi : camState.phi;
    flyState.fromTheta = camState.theta;
    flyState.toTheta = typeof targetPhi === 'number' ? camState.theta : (camState.theta + 0.14);
    flyState.duration = durationMs || 780;
    flyState.startTime = performance.now();
    flyState.active = true;

    camState.targetLook.x = tx;
    camState.targetLook.y = ty;
    camState.targetLook.z = tz;
    camState.targetRadius = targetRadius;
    camState.targetPhi = flyState.toPhi;
    camState.targetTheta = flyState.toTheta;
  }

  function switchGalaxyLayout(newMode) {
    if (!activeNodes.length || !currentPos) return;
    cancelStarHop(false);
    flyState.active = false;
    activeLayout = newMode;
    layoutBtns.forEach((b) => b.classList.toggle('active', b.dataset.glayout === newMode));

    startPos = new Float32Array(currentPos);
    targetPos = computeLayoutPositions(activeNodes, newMode);
    morphStart = performance.now();
    isMorphing = true;
    rebuildClusterLabelsDOM();

    // Reset look center smoothly
    camState.targetLook.x = 0;
    camState.targetLook.y = 0;
    camState.targetLook.z = 0;
    camState.targetRadius = newMode === 'eras' ? 215 : 178;
  }

  function cancelStarHop(keepTrailFade) {
    hopState.active = false;
    hopState.focusIdx = -1;
    reticle?.classList.remove('is-hopping');
    clearTimeout(hopState.hidePillTimer);
    if (!keepTrailFade) {
      hopState.fading = false;
      if (hopTrailLine) hopTrailLine.visible = false;
      hopPill?.classList.remove('is-visible', 'is-locked');
    }
  }

  function setHopHud(stepText, titleText, locked) {
    if (hopStepEl) hopStepEl.textContent = stepText;
    if (hopTitleEl) hopTitleEl.textContent = titleText;
    if (hopPill) {
      hopPill.classList.add('is-visible');
      hopPill.classList.toggle('is-locked', Boolean(locked));
    }
  }

  function startStarHopRoulette() {
    if (!currentPos || !activeNodes.length) return;
    if (tmState.open) closeTimeMachine(true);
    flyState.active = false;
    const pool = [];
    for (let i = 0; i < activeNodes.length; i++) {
      if (nodeMatchesFilter(activeNodes[i])) pool.push(i);
    }
    if (!pool.length) return;
    if (pool.length === 1) {
      cancelStarHop(false);
      flyToStar(pool[0], true);
      return;
    }

    cancelStarHop(false);
    inspector?.classList.remove('is-open');
    updateHoverTooltip(-1, 0, 0);
    hoveredIdx = -1;
    autoOrbit = false;
    orbitBtn?.classList.remove('active');

    // Build a dramatic chain of distinct stars (start from current selected star if valid)
    const totalHops = Math.min(8, Math.max(4, pool.length - 1));
    const used = new Set();
    const chain = [];

    if (selectedIdx >= 0 && selectedIdx < activeNodes.length && nodeMatchesFilter(activeNodes[selectedIdx])) {
      chain.push(selectedIdx);
      used.add(selectedIdx);
    } else {
      const first = pool[Math.floor(Math.random() * pool.length)];
      chain.push(first);
      used.add(first);
    }

    // Pick visually punchy hops (sample candidates and pick one with nice 3D travel distance)
    for (let h = 0; h < totalHops; h++) {
      const prevIdx = chain[chain.length - 1];
      const px = currentPos[prevIdx * 3];
      const py = currentPos[prevIdx * 3 + 1];
      const pz = currentPos[prevIdx * 3 + 2];

      let bestCand = -1;
      let bestScore = -1;
      const tries = Math.min(10, pool.length);
      for (let t = 0; t < tries; t++) {
        const c = pool[Math.floor(Math.random() * pool.length)];
        if (used.has(c)) continue;
        const dx = currentPos[c * 3] - px;
        const dy = currentPos[c * 3 + 1] - py;
        const dz = currentPos[c * 3 + 2] - pz;
        const dist = Math.hypot(dx, dy, dz);
        // Sweet spot 35..145 units so jumps feel wide & cinematic without throwing camera off-galaxy
        const distScore = 100 - Math.abs(dist - 82) + Math.random() * 28;
        if (distScore > bestScore) {
          bestScore = distScore;
          bestCand = c;
        }
      }
      if (bestCand === -1) {
        for (let k = 0; k < pool.length; k++) {
          if (!used.has(pool[k])) { bestCand = pool[k]; break; }
        }
      }
      if (bestCand === -1) break;
      chain.push(bestCand);
      used.add(bestCand);
    }

    if (chain.length < 2) {
      flyToStar(chain[0], true);
      return;
    }

    // Classic smooth roulette deceleration timings (ms per hop)
    const segCount = chain.length - 1;
    const durations = [];
    for (let s = 0; s < segCount; s++) {
      const prog = segCount > 1 ? s / (segCount - 1) : 1;
      durations.push(Math.round(115 + Math.pow(prog, 1.85) * 320));
    }

    // Warm winner HD cover in background while hopping
    const winnerNode = activeNodes[chain[chain.length - 1]];
    if (winnerNode && winnerNode.id && !appState.coverCache['anime_' + winnerNode.id]) {
      loadAnimeCoversBatch([winnerNode.id]);
    }

    hopState.active = true;
    hopState.chain = chain;
    hopState.durations = durations;
    hopState.segIdx = 0;
    hopState.segElapsedMs = 0;
    hopState.fadeElapsedMs = 0;
    hopState.fading = false;
    hopState.focusIdx = chain[1];

    reticle?.classList.add('is-hopping');
    if (hopTrailMat) hopTrailMat.opacity = 0.94;
    if (hopTrailLine) hopTrailLine.visible = true;
    if (highlightLine) highlightLine.visible = false;

    // Seed first hop target
    const targetIdx = chain[1];
    camState.targetLook.x = currentPos[targetIdx * 3];
    camState.targetLook.y = currentPos[targetIdx * 3 + 1];
    camState.targetLook.z = currentPos[targetIdx * 3 + 2];
    camState.targetRadius = 114;
    camState.targetTheta += 0.18;

    setHopHud(`ПРЫЖОК 1 / ${segCount}`, activeNodes[targetIdx].title, false);
  }

  function updateStarHopFrame(dtMs) {
    if (hopState.active && hopTrailGeom && hopTrailPosBuf && hopTrailColBuf && currentPos) {
      const chain = hopState.chain;
      const segCount = chain.length - 1;
      hopState.segElapsedMs += dtMs;

      // Advance segments using real elapsed ms with overshoot carry (identical duration on 60–144 Hz)
      while (hopState.active) {
        const s = hopState.segIdx;
        const dur = hopState.durations[s] || 220;
        if (hopState.segElapsedMs < dur) break;

        if (s + 1 < segCount) {
          hopState.segElapsedMs -= dur;
          hopState.segIdx = s + 1;
          const nextTarget = chain[s + 2];
          hopState.focusIdx = nextTarget;

          camState.targetLook.x = currentPos[nextTarget * 3];
          camState.targetLook.y = currentPos[nextTarget * 3 + 1];
          camState.targetLook.z = currentPos[nextTarget * 3 + 2];
          camState.targetRadius = s + 2 >= segCount ? 84 : 112;
          camState.targetTheta += 0.16;

          setHopHud(`ПРЫЖОК ${s + 2} / ${segCount}`, activeNodes[nextTarget].title, false);
        } else {
          // Final landing on winning star!
          const winnerIdx = chain[s + 1];
          hopState.active = false;
          hopState.focusIdx = -1;
          hopState.fading = true;
          hopState.fadeElapsedMs = 0;
          reticle?.classList.remove('is-hopping');

          // Render complete final chain on landing frame
          const vertCount = Math.min(HOP_MAX_VERTS, segCount + 1);
          for (let k = 0; k < vertCount; k++) {
            const ni = chain[k];
            hopTrailPosBuf[k * 3]     = currentPos[ni * 3];
            hopTrailPosBuf[k * 3 + 1] = currentPos[ni * 3 + 1];
            hopTrailPosBuf[k * 3 + 2] = currentPos[ni * 3 + 2];
            const ageFade = (k + 1) / vertCount;
            const lum = 0.32 + ageFade * 0.68;
            hopTrailColBuf[k * 3]     = lum;
            hopTrailColBuf[k * 3 + 1] = lum;
            hopTrailColBuf[k * 3 + 2] = lum;
          }
          hopTrailGeom.setDrawRange(0, vertCount);
          hopTrailGeom.getAttribute('position').needsUpdate = true;
          hopTrailGeom.getAttribute('color').needsUpdate = true;

          setHopHud('ВЫБРАНО', activeNodes[winnerIdx].title, true);
          clearTimeout(hopState.hidePillTimer);
          hopState.hidePillTimer = setTimeout(() => {
            hopPill?.classList.remove('is-visible', 'is-locked');
          }, 1650);

          flyToStar(winnerIdx, true, true);
          return;
        }
      }

      const s = hopState.segIdx;
      const dur = hopState.durations[s] || 220;
      const rawT = Math.min(1, Math.max(0, hopState.segElapsedMs / dur));
      // Smooth cubic ease-out for snappy launch & crisp landing on each star
      const eased = 1 - Math.pow(1 - rawT, 3);

      const fromIdx = chain[s];
      const toIdx = chain[s + 1];

      // Fill visited chain vertices (0..s) + animated leaping tip (s+1)
      const vertCount = Math.min(HOP_MAX_VERTS, s + 2);
      for (let k = 0; k <= s && k < HOP_MAX_VERTS - 1; k++) {
        const ni = chain[k];
        hopTrailPosBuf[k * 3]     = currentPos[ni * 3];
        hopTrailPosBuf[k * 3 + 1] = currentPos[ni * 3 + 1];
        hopTrailPosBuf[k * 3 + 2] = currentPos[ni * 3 + 2];

        const ageFade = (k + 1) / vertCount;
        const lum = 0.32 + ageFade * 0.52;
        hopTrailColBuf[k * 3]     = lum;
        hopTrailColBuf[k * 3 + 1] = lum;
        hopTrailColBuf[k * 3 + 2] = lum;
      }

      const tipSlot = vertCount - 1;
      const fx = currentPos[fromIdx * 3];
      const fy = currentPos[fromIdx * 3 + 1];
      const fz = currentPos[fromIdx * 3 + 2];
      const tx = currentPos[toIdx * 3];
      const ty = currentPos[toIdx * 3 + 1];
      const tz = currentPos[toIdx * 3 + 2];
      const arcLift = Math.sin(rawT * Math.PI) * 8.5;

      hopTrailPosBuf[tipSlot * 3]     = fx + (tx - fx) * eased;
      hopTrailPosBuf[tipSlot * 3 + 1] = fy + (ty - fy) * eased + arcLift;
      hopTrailPosBuf[tipSlot * 3 + 2] = fz + (tz - fz) * eased;

      // Crisp pure white head of the star-hop beam
      hopTrailColBuf[tipSlot * 3]     = 1.00;
      hopTrailColBuf[tipSlot * 3 + 1] = 1.00;
      hopTrailColBuf[tipSlot * 3 + 2] = 1.00;

      hopTrailGeom.setDrawRange(0, vertCount);
      hopTrailGeom.getAttribute('position').needsUpdate = true;
      hopTrailGeom.getAttribute('color').needsUpdate = true;
    } else if (hopState.fading && hopTrailMat && hopTrailLine) {
      hopState.fadeElapsedMs += dtMs;
      const ft = Math.min(1, hopState.fadeElapsedMs / 950);
      hopTrailMat.opacity = 0.94 * (1 - ft);
      if (ft >= 1) {
        hopState.fading = false;
        hopTrailLine.visible = false;
      }
    }
  }

  function flyToStar(idx, openDossier, keepHopTrail) {
    if (idx < 0 || idx >= activeNodes.length || !currentPos) return;
    if (!keepHopTrail) cancelStarHop(false);
    selectedIdx = idx;
    const sx = currentPos[idx * 3];
    const sy = currentPos[idx * 3 + 1];
    const sz = currentPos[idx * 3 + 2];

    autoOrbit = false;
    orbitBtn?.classList.remove('active');
    if (hopState.active) {
      flyState.active = false;
      camState.targetLook.x = sx;
      camState.targetLook.y = sy;
      camState.targetLook.z = sz;
      camState.targetRadius = 56;
    } else {
      startCameraFlyTo(sx, sy, sz, 56, null, 780);
    }

    updateHighlightStarLinks(idx);

    if (openDossier) {
      openStarInspector(idx);
    }
  }

  function openStarInspector(idx) {
    const node = activeNodes[idx];
    if (!node || !inspector) return;

    const isPlanned = node.status === 'planned';
    const delta = (!isPlanned && node.score > 0 && node.shikiScore > 0) ? (node.score - node.shikiScore) : 0;
    if (inspTag) {
      inspTag.textContent = node.isPeak
        ? `PEAK FICTION · #${formatRank(node.peakRank)}`
        : isPlanned
          ? 'В ПЛАНАХ · BACKLOG'
          : node.status === 'watching'
            ? 'СЕЙЧАС СМОТРЮ · LIVE'
            : node.score >= 9
              ? `ИЗБРАННАЯ ЗВЕЗДА · ${node.score}/10`
              : 'ЗВЕЗДА АРХИВА';
    }
    if (inspTitle) inspTitle.textContent = node.title;
    if (inspSub) inspSub.textContent = [node.kind, node.year, node.episodes ? `${node.episodes} эп.` : null].filter(Boolean).join(' · ');

    const pills = isPlanned
      ? [
          'В планах',
          node.shikiScore ? `Шики: ${node.shikiScore.toFixed(2)}` : null,
          node.episodes ? `${node.episodes} эп.` : null
        ].filter(Boolean)
      : [
          node.score ? `Я: ${node.score}/10` : 'Без оценки',
          node.shikiScore ? `Шики: ${node.shikiScore.toFixed(2)}` : null,
          Math.abs(delta) >= 0.8 ? `Δ ${delta > 0 ? '+' : ''}${delta.toFixed(2)}` : null
        ].filter(Boolean);
    if (inspPills) {
      inspPills.innerHTML = pills.map((p) => `<span class="modal-pill" style="font-size:10px;padding:3px 8px;">${escapeHtml(p)}</span>`).join('');
    }
    if (inspNote) {
      inspNote.textContent = node.comment
        ? `«${node.comment}»`
        : (isPlanned
          ? 'Кандидат на просмотр из твоего списка «Запланировано» на Shikimori.'
          : node.isPeak
            ? 'Одна из главных звёзд ядра архива Peak Fiction.'
            : 'Нажми «3D-карта», чтобы вытянуть коллекционную голографическую карту этого тайтла прямо из галактики.');
    }
    if (inspLink) inspLink.href = node.url || `${appState.activeShikiOrigin}/animes/${node.id}`;

    if (inspImg) {
      const src = appState.coverCache['anime_' + node.id] || node.img || '';
      inspImg.src = src;
      inspImg.alt = node.title;
      if (!appState.coverCache['anime_' + node.id]) {
        loadAnimeCoversBatch([node.id]).then(() => {
          const hd = appState.coverCache['anime_' + node.id];
          if (hd && selectedIdx === idx && inspImg) inspImg.src = hd;
        });
      }
    }

    inspector.classList.add('is-open');
    requestAnimationFrame(updateMobileHudClearance);
  }

  function initThreeScene() {
    const T = THREE_LIB;
    apState.stepIdx = 0;
    const dpr = getStartDprCeiling();
    apState.currentDpr = dpr;
    renderer = new T.WebGLRenderer({ antialias: dpr <= 1.25, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(dpr);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x080808, 1);
    canvasWrap.innerHTML = '';
    canvasWrap.appendChild(renderer.domElement);

    scene = new T.Scene();
    scene.fog = new T.FogExp2(0x080808, 0.0018);

    camera = new T.PerspectiveCamera(56, window.innerWidth / window.innerHeight, 1, 1400);

    // 1. Multi-layer cold monochrome cosmic dust cloud (custom GLSL)
    const dustCount = 1050;
    const dustPos = new Float32Array(dustCount * 3);
    const dustCol = new Float32Array(dustCount * 3);
    const dustSizes = new Float32Array(dustCount);
    const dustDepths = new Float32Array(dustCount);
    const dustPhases = new Float32Array(dustCount);
    for (let i = 0; i < dustCount; i++) {
      const layerRand = Math.random();
      const depth = layerRand < 0.34 ? 0.22 + Math.random() * 0.25 : (layerRand < 0.72 ? 0.52 + Math.random() * 0.25 : 0.80 + Math.random() * 0.20);
      const r = 36 + Math.pow(Math.random(), 0.70) * (360 + depth * 90);
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;
      dustPos[i * 3]     = Math.cos(theta) * Math.cos(phi) * r;
      dustPos[i * 3 + 1] = Math.sin(phi) * r * (depth < 0.45 ? 0.22 : (depth < 0.78 ? 0.52 : 0.88));
      dustPos[i * 3 + 2] = Math.sin(theta) * Math.cos(phi) * r;
      const shade = 0.42 + (1.0 - depth * 0.45) * 0.42 + Math.random() * 0.14;
      dustCol[i * 3]     = shade * 0.85;
      dustCol[i * 3 + 1] = shade * 0.85;
      dustCol[i * 3 + 2] = shade * 0.85;
      dustSizes[i] = 2.4 + (1.0 - depth * 0.45) * 3.4 + Math.random() * 1.4;
      dustDepths[i] = depth;
      dustPhases[i] = Math.random() * 6.2831853;
    }
    dustGeom = new T.BufferGeometry();
    dustGeom.setAttribute('position', new T.BufferAttribute(dustPos, 3));
    dustGeom.setAttribute('aColor', new T.BufferAttribute(dustCol, 3));
    dustGeom.setAttribute('aSize', new T.BufferAttribute(dustSizes, 1));
    dustGeom.setAttribute('aDepth', new T.BufferAttribute(dustDepths, 1));
    dustGeom.setAttribute('aPhase', new T.BufferAttribute(dustPhases, 1));
    dustMat = new T.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: T.AdditiveBlending,
      uniforms: {
        uPixelRatio: { value: dpr },
        uTime: { value: 0 },
        uBass: { value: 0 },
        uHigh: { value: 0 },
        uDustScale: { value: 1.0 },
        uDustAlpha: { value: 1.0 }
      },
      vertexShader: `
        attribute vec3 aColor;
        attribute float aSize;
        attribute float aDepth;
        attribute float aPhase;
        uniform float uPixelRatio;
        uniform float uTime;
        uniform float uBass;
        uniform float uHigh;
        uniform float uDustScale;
        uniform float uDustAlpha;
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          vColor = aColor;
          float breathe = 1.0 + uBass * (0.015 + aDepth * 0.032);
          vec3 pos = position * breathe;
          pos.y += sin(uTime * 0.28 + aPhase) * (0.45 + aDepth * 0.85);
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          float dist = max(24.0, -mvPosition.z);
          float shimmer = 0.86 + 0.14 * sin(uTime * 0.95 + aPhase * 1.7) + uHigh * 0.16;
          vAlpha = (0.14 + (1.0 - aDepth * 0.5) * 0.20 + uBass * 0.08) * shimmer * uDustAlpha;
          gl_PointSize = clamp((aSize * uDustScale * (1.0 + uBass * 0.22) * uPixelRatio * 108.0) / dist, 1.4, 9.2);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float d = length(uv);
          if (d > 0.5) discard;
          float radial = exp(-d * d * 14.0) * (1.0 - smoothstep(0.16, 0.5, d));
          gl_FragColor = vec4(vColor, clamp(radial * vAlpha, 0.0, 0.55));
        }
      `
    });
    dustPoints = new T.Points(dustGeom, dustMat);
    scene.add(dustPoints);

    // 2. Astrolabe equatorial coordinate rings
    astrolabeGroup = new T.Group();
    astrolabeMats.length = 0;
    [38, 76, 118].forEach((rad, idx) => {
      const segs = 128;
      const ringVerts = [];
      for (let s = 0; s <= segs; s++) {
        const a = (s / segs) * Math.PI * 2;
        ringVerts.push(Math.cos(a) * rad, 0, Math.sin(a) * rad);
      }
      const rg = new T.BufferGeometry();
      rg.setAttribute('position', new T.Float32BufferAttribute(ringVerts, 3));
      const rm = new T.LineBasicMaterial({
        color: 0xb0b0b0,
        transparent: true,
        opacity: ASTROLABE_BASE_OPACITY[idx] || 0.07,
        depthWrite: false
      });
      astrolabeMats.push(rm);
      astrolabeGroup.add(new T.Line(rg, rm));
    });
    scene.add(astrolabeGroup);

    // 3. Constellation filament lines (GLSL energy shimmer + Time Machine reveal mask)
    linkGeom = new T.BufferGeometry();
    linkMat = new T.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: T.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uMid: { value: 0 },
        uHigh: { value: 0 },
        uBaseOpacity: { value: 0.18 }
      },
      vertexShader: `
        attribute vec3 aColor;
        attribute float aSegProgress;
        attribute float aSegPhase;
        attribute float aSegAlpha;
        varying vec3 vColor;
        varying float vProg;
        varying float vPhase;
        varying float vSegAlpha;

        void main() {
          vColor = aColor;
          vProg = aSegProgress;
          vPhase = aSegPhase;
          vSegAlpha = aSegAlpha;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uMid;
        uniform float uHigh;
        uniform float uBaseOpacity;
        varying vec3 vColor;
        varying float vProg;
        varying float vPhase;
        varying float vSegAlpha;

        void main() {
          if (vSegAlpha <= 0.01) discard;
          float wave = 0.72 + 0.28 * sin(vProg * 6.2831853 - uTime * 1.45 + vPhase);
          float audioBoost = 1.0 + uMid * 0.85 + uHigh * 0.55;
          float alpha = clamp(uBaseOpacity * wave * audioBoost * vSegAlpha, 0.0, 0.72);
          vec3 col = mix(vColor, vec3(0.94, 0.94, 0.94), clamp(uHigh * 0.35 + (wave - 0.72) * 0.5, 0.0, 0.6));
          gl_FragColor = vec4(col, alpha);
        }
      `
    });
    linkLines = new T.LineSegments(linkGeom, linkMat);
    linkLines.frustumCulled = false;
    scene.add(linkLines);

    // 4. Focused star bright links (pre-allocated buffer + flowing energy pulse)
    highlightPosBuf = new Float32Array(HIGHLIGHT_MAX_SEGS * 2 * 3);
    highlightProgBuf = new Float32Array(HIGHLIGHT_MAX_SEGS * 2);
    highlightSeedBuf = new Float32Array(HIGHLIGHT_MAX_SEGS * 2);
    highlightGeom = new T.BufferGeometry();
    highlightGeom.setAttribute('position', new T.BufferAttribute(highlightPosBuf, 3));
    highlightGeom.setAttribute('aProgress', new T.BufferAttribute(highlightProgBuf, 1));
    highlightGeom.setAttribute('aSeed', new T.BufferAttribute(highlightSeedBuf, 1));
    highlightGeom.setDrawRange(0, 0);
    highlightMat = new T.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: T.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uBass: { value: 0 },
        uMid: { value: 0 },
        uColor: { value: new T.Color(0xe5e5e5) }
      },
      vertexShader: `
        attribute float aProgress;
        attribute float aSeed;
        varying float vProgress;
        varying float vSeed;

        void main() {
          vProgress = aProgress;
          vSeed = aSeed;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uBass;
        uniform float uMid;
        uniform vec3 uColor;
        varying float vProgress;
        varying float vSeed;

        void main() {
          float pulse = pow(max(0.0, 0.5 + 0.5 * sin(vProgress * 9.424778 - uTime * 4.4 + vSeed)), 2.2);
          float edgeTaper = (1.0 - smoothstep(0.68, 1.0, vProgress)) * 0.65 + 0.35;
          float intensity = (0.34 + pulse * (0.48 + uMid * 0.36 + uBass * 0.20)) * edgeTaper;
          vec3 col = mix(uColor, vec3(1.0), pulse * 0.45);
          gl_FragColor = vec4(col, clamp(intensity, 0.0, 0.95));
        }
      `
    });
    highlightLine = new T.LineSegments(highlightGeom, highlightMat);
    highlightLine.frustumCulled = false;
    highlightLine.visible = false;
    scene.add(highlightLine);

    // 5. Pre-allocated GPU Star-Hopping Warp Trail (zero allocation during hops)
    hopTrailPosBuf = new Float32Array(HOP_MAX_VERTS * 3);
    hopTrailColBuf = new Float32Array(HOP_MAX_VERTS * 3);
    hopTrailGeom = new T.BufferGeometry();
    hopTrailGeom.setAttribute('position', new T.BufferAttribute(hopTrailPosBuf, 3));
    hopTrailGeom.setAttribute('color', new T.BufferAttribute(hopTrailColBuf, 3));
    hopTrailGeom.setDrawRange(0, 0);
    hopTrailMat = new T.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      blending: T.AdditiveBlending
    });
    hopTrailLine = new T.Line(hopTrailGeom, hopTrailMat);
    hopTrailLine.frustumCulled = false;
    hopTrailLine.visible = false;
    scene.add(hopTrailLine);

    populateGalaxyScene();
  }

  let reusableProjVec = null;
  let lastHoverCheckAt = 0;

  // Hit-test nearest visible star in screen space (zero GC allocation)
  function findNearestStarAt(clientX, clientY, maxPx) {
    if (!camera || !currentPos || !activeNodes.length) return -1;
    const w = galaxyViewW;
    const h = galaxyViewH;
    if (!reusableProjVec) reusableProjVec = new THREE_LIB.Vector3();
    const v = reusableProjVec;
    const revealArr = tmState.open ? starGeom?.getAttribute('aReveal')?.array : null;
    let bestIdx = -1;
    let bestDistSq = maxPx * maxPx;

    for (let i = 0; i < activeNodes.length; i++) {
      if (!nodeMatchesFilter(activeNodes[i])) continue;
      if (revealArr && revealArr[i] < 0.5) continue;
      v.set(currentPos[i * 3], currentPos[i * 3 + 1], currentPos[i * 3 + 2]);
      v.project(camera);
      if (v.z < -1 || v.z > 1) continue;
      const sx = (v.x * 0.5 + 0.5) * w;
      const sy = (-v.y * 0.5 + 0.5) * h;
      const dx = sx - clientX;
      const dy = sy - clientY;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestDistSq) {
        bestDistSq = d2;
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  /* =========================================
     TIME MACHINE (CHRONOLOGICAL GALAXY PLAYBACK)
     ========================================= */
  function parseNodeUpdatedAt(node) {
    if (!node) return 0;
    const raw = node.updatedAt ?? node.updated_at;
    if (!raw) return 0;
    if (typeof raw === 'number') {
      if (!isFinite(raw) || raw <= 0) return 0;
      return raw < 1e11 ? raw * 1000 : raw;
    }
    const parsed = Date.parse(String(raw));
    return isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  function detectWatchedAxisAvailable(indices) {
    let validCount = 0;
    let minTs = Infinity;
    let maxTs = -Infinity;
    for (let i = 0; i < indices.length; i++) {
      const ts = parseNodeUpdatedAt(activeNodes[indices[i]]);
      if (ts > 0) {
        validCount++;
        if (ts < minTs) minTs = ts;
        if (ts > maxTs) maxTs = ts;
      }
    }
    return validCount >= 2 && maxTs > minTs;
  }

  function formatTmDateLabel(node, axis) {
    if (axis === 'watched') {
      const ts = parseNodeUpdatedAt(node);
      if (ts > 0) {
        const d = new Date(ts);
        return `${TM_MONTHS_RU[d.getMonth()]} ${d.getFullYear()}`;
      }
    }
    const y = Number(node?.year);
    return y > 1900 ? String(y) : '—';
  }

  function syncTimeMachineTelemetry(revealedCount, totalCount, epsSum, dateStr, progress) {
    if (tmDateEl && dateStr !== tmState.lastDateStr) {
      tmState.lastDateStr = dateStr;
      tmDateEl.textContent = dateStr;
    }
    const starsStr = `${revealedCount} / ${totalCount}`;
    if (tmStarsEl && starsStr !== tmState.lastStarsStr) {
      tmState.lastStarsStr = starsStr;
      tmStarsEl.textContent = starsStr;
    }
    const epsStr = `${epsSum.toLocaleString('ru-RU')} эп.`;
    if (tmEpsEl && epsStr !== tmState.lastEpsStr) {
      tmState.lastEpsStr = epsStr;
      tmEpsEl.textContent = epsStr;
    }
    const scrubVal = Math.max(0, Math.min(1000, Math.round(progress * 1000)));
    if (tmScrubber && scrubVal !== tmState.lastScrubVal) {
      tmState.lastScrubVal = scrubVal;
      tmScrubber.value = String(scrubVal);
      tmScrubber.style.setProperty('--tm-pct', `${(scrubVal * 0.1).toFixed(1)}%`);
    }
  }

  function updateLinkRevealMask(revealArr, revealedCount) {
    if (revealedCount === tmState.lastLinkRevealed || !linkGeom || !linkPairs) return;
    tmState.lastLinkRevealed = revealedCount;
    const segAlphaAttr = linkGeom.getAttribute('aSegAlpha');
    if (!segAlphaAttr) return;
    const segArr = segAlphaAttr.array;
    const segCount = linkPairs.length >> 1;
    for (let s = 0; s < segCount; s++) {
      const a = linkPairs[s * 2];
      const b = linkPairs[s * 2 + 1];
      const vis = (revealArr[a] > 0.5 && revealArr[b] > 0.5) ? 1.0 : 0.0;
      segArr[s * 2] = vis;
      segArr[s * 2 + 1] = vis;
    }
    segAlphaAttr.needsUpdate = true;
  }

  function buildTimeMachineSchedule(preferredAxis) {
    const filtered = [];
    for (let i = 0; i < activeNodes.length; i++) {
      if (nodeMatchesFilter(activeNodes[i])) filtered.push(i);
    }

    tmState.hasWatchedDates = detectWatchedAxisAvailable(filtered);
    if (tmAxisGroup) tmAxisGroup.hidden = !tmState.hasWatchedDates;

    let axis = preferredAxis;
    if (!tmState.hasWatchedDates) {
      axis = 'year';
    } else if (axis !== 'watched' && axis !== 'year') {
      axis = 'watched';
    }
    tmState.axis = axis;
    tmAxisBtns.forEach((btn) => {
      const isAct = btn.dataset.tmaxis === axis;
      btn.classList.toggle('active', isAct);
      btn.setAttribute('aria-selected', isAct ? 'true' : 'false');
    });

    filtered.sort((ia, ib) => {
      const na = activeNodes[ia];
      const nb = activeNodes[ib];
      if (axis === 'watched') {
        const ta = parseNodeUpdatedAt(na);
        const tb = parseNodeUpdatedAt(nb);
        if (ta > 0 && tb > 0 && ta !== tb) return ta - tb;
        if ((ta > 0) !== (tb > 0)) return ta > 0 ? -1 : 1;
      }
      const ya = Number(na.year) || 9999;
      const yb = Number(nb.year) || 9999;
      if (ya !== yb) return ya - yb;
      const sa = Number(na.score) || Number(na.shikiScore) || 0;
      const sb = Number(nb.score) || Number(nb.shikiScore) || 0;
      if (sa !== sb) return sb - sa;
      return (na.id || ia) - (nb.id || ib);
    });

    const m = filtered.length;
    const triggers = new Float32Array(m);
    const cumEps = new Int32Array(m);
    const dateLabels = new Array(m);

    let minChron = Infinity;
    let maxChron = -Infinity;
    for (let k = 0; k < m; k++) {
      const n = activeNodes[filtered[k]];
      const val = axis === 'watched' ? parseNodeUpdatedAt(n) : ((Number(n.year) > 1900) ? Number(n.year) : 0);
      if (val > 0) {
        if (val < minChron) minChron = val;
        if (val > maxChron) maxChron = val;
      }
    }
    const chronSpan = maxChron > minChron ? (maxChron - minChron) : 0;

    let accEps = 0;
    for (let k = 0; k < m; k++) {
      const n = activeNodes[filtered[k]];
      const rankFrac = m > 1 ? k / (m - 1) : 0;
      const val = axis === 'watched' ? parseNodeUpdatedAt(n) : ((Number(n.year) > 1900) ? Number(n.year) : 0);
      const chronFrac = (chronSpan > 0 && val > 0) ? Math.max(0, Math.min(1, (val - minChron) / chronSpan)) : rankFrac;
      let trig = 0.02 + (rankFrac * 0.68 + chronFrac * 0.30) * 0.96;
      if (k > 0 && trig < triggers[k - 1]) trig = triggers[k - 1];
      triggers[k] = Math.min(0.985, trig);

      accEps += Math.max(0, Number(n.episodes) || 0);
      cumEps[k] = accEps;

      const rawLbl = formatTmDateLabel(n, axis);
      dateLabels[k] = (rawLbl === '—' && k > 0) ? dateLabels[k - 1] : rawLbl;
    }

    tmState.order = filtered;
    tmState.triggers = triggers;
    tmState.cumEps = cumEps;
    tmState.dateLabels = dateLabels;
    tmState.ignitedAt = new Float32Array(activeNodes.length);
    tmState.ignitedAt.fill(-1);
    tmState.revealedCount = 0;
    tmState.lastLinkRevealed = -1;
    tmState.lastDateStr = '';
    tmState.lastStarsStr = '';
    tmState.lastEpsStr = '';
    tmState.lastScrubVal = -1;
  }

  function applyTimeMachineAt(progress, now, isManualScrub, prevProgress) {
    if (!starGeom || !activeNodes.length || !tmState.triggers || !tmState.ignitedAt) return;
    const revealAttr = starGeom.getAttribute('aReveal');
    const flashAttr = starGeom.getAttribute('aFlash');
    if (!revealAttr || !flashAttr) return;

    const revealArr = revealAttr.array;
    const flashArr = flashAttr.array;
    const order = tmState.order;
    const triggers = tmState.triggers;
    const ignitedAt = tmState.ignitedAt;
    const m = order.length;

    let revealedCount = 0;
    let lastIdx = -1;
    let anyFlash = false;
    let revealChanged = false;
    let flashChanged = false;

    for (let k = 0; k < m; k++) {
      const idx = order[k];
      const trig = triggers[k];
      if (trig <= progress) {
        revealedCount++;
        lastIdx = k;
        if (isManualScrub) {
          if (revealArr[idx] !== 1.0) {
            revealArr[idx] = 1.0;
            revealChanged = true;
          }
          if (progress > prevProgress && trig > prevProgress) {
            ignitedAt[idx] = now;
            if (flashArr[idx] !== 1.0) {
              flashArr[idx] = 1.0;
              flashChanged = true;
            }
            anyFlash = true;
          } else {
            ignitedAt[idx] = now - 500;
            if (flashArr[idx] !== 0.0) {
              flashArr[idx] = 0.0;
              flashChanged = true;
            }
          }
        } else {
          if (ignitedAt[idx] < 0) ignitedAt[idx] = now;
          const age = Math.max(0, now - ignitedAt[idx]);
          const nextRev = age >= 220 ? 1.0 : age / 220;
          const nextFlash = age < 450 ? Math.pow(1 - age / 450, 1.55) : 0.0;
          if (revealArr[idx] !== nextRev) {
            revealArr[idx] = nextRev;
            revealChanged = true;
          }
          if (flashArr[idx] !== nextFlash) {
            flashArr[idx] = nextFlash;
            flashChanged = true;
          }
          if (nextFlash > 0.001) anyFlash = true;
        }
      } else {
        if (revealArr[idx] !== 0.0) {
          revealArr[idx] = 0.0;
          revealChanged = true;
        }
        if (flashArr[idx] !== 0.0) {
          flashArr[idx] = 0.0;
          flashChanged = true;
        }
        ignitedAt[idx] = -1;
      }
    }

    tmState.hasActiveFlash = anyFlash;
    tmState.revealedCount = revealedCount;
    if (revealChanged) revealAttr.needsUpdate = true;
    if (flashChanged) flashAttr.needsUpdate = true;

    updateLinkRevealMask(revealArr, revealedCount);

    if (selectedIdx >= 0 && revealArr[selectedIdx] < 0.5) {
      selectedIdx = -1;
      inspector?.classList.remove('is-open');
      updateHighlightStarLinks(-1);
    }

    const epsSum = lastIdx >= 0 && tmState.cumEps ? tmState.cumEps[lastIdx] : 0;
    const dateStr = lastIdx >= 0 ? tmState.dateLabels[lastIdx] : (m ? tmState.dateLabels[0] : '—');
    syncTimeMachineTelemetry(revealedCount, m, epsSum, dateStr, progress);
  }

  function setTimeMachinePlaying(playing) {
    tmState.playing = Boolean(playing);
    tmPlayBtn?.classList.toggle('is-playing', tmState.playing);
    if (tmPlayBtn) {
      tmPlayBtn.innerHTML = tmState.playing
        ? '<svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><line x1="4" y1="2.5" x2="4" y2="9.5"/><line x1="8" y1="2.5" x2="8" y2="9.5"/></svg>'
        : '<svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><polygon points="3,2 10,6 3,10"/></svg>';
    }
  }

  function openTimeMachine(autoPlay = true) {
    if (!starGeom || !activeNodes.length) return;
    cancelStarHop(false);
    flyState.active = false;
    selectedIdx = -1;
    inspector?.classList.remove('is-open');
    updateHighlightStarLinks(-1);
    hoveredIdx = -1;
    updateHoverTooltip(-1, 0, 0);

    tmState.open = true;
    tmState.progress = 0;
    tmState.userDraggedCamera = false;
    overlay.classList.add('is-tm-open');
    tmPanel?.classList.add('is-open');
    tmPanel?.setAttribute('aria-hidden', 'false');
    tmToggleBtn?.classList.add('active');
    tmToggleBtn?.setAttribute('aria-pressed', 'true');

    const revealAttr = starGeom.getAttribute('aReveal');
    const flashAttr = starGeom.getAttribute('aFlash');
    if (revealAttr) {
      revealAttr.array.fill(0.0);
      revealAttr.needsUpdate = true;
    }
    if (flashAttr) {
      flashAttr.array.fill(0.0);
      flashAttr.needsUpdate = true;
    }

    buildTimeMachineSchedule();
    applyTimeMachineAt(0, performance.now(), true, 0);
    setTimeMachinePlaying(Boolean(autoPlay));

    const baseR = activeLayout === 'eras' ? 215 : 178;
    camState.targetLook.x = 0;
    camState.targetLook.y = 0;
    camState.targetLook.z = 0;
    camState.targetRadius = baseR * 0.88;
    camState.targetPhi = 1.06;
    requestAnimationFrame(updateMobileHudClearance);
  }

  function closeTimeMachine(restoreAll = true) {
    if (!tmState.open && !restoreAll) return;
    tmState.open = false;
    tmState.hasActiveFlash = false;
    setTimeMachinePlaying(false);
    overlay.classList.remove('is-tm-open');
    tmPanel?.classList.remove('is-open');
    tmPanel?.setAttribute('aria-hidden', 'true');
    tmToggleBtn?.classList.remove('active');
    tmToggleBtn?.setAttribute('aria-pressed', 'false');
    requestAnimationFrame(updateMobileHudClearance);

    if (restoreAll && starGeom) {
      const revealAttr = starGeom.getAttribute('aReveal');
      const flashAttr = starGeom.getAttribute('aFlash');
      if (revealAttr) {
        revealAttr.array.fill(1.0);
        revealAttr.needsUpdate = true;
      }
      if (flashAttr) {
        flashAttr.array.fill(0.0);
        flashAttr.needsUpdate = true;
      }
      const segAlphaAttr = linkGeom?.getAttribute('aSegAlpha');
      if (segAlphaAttr) {
        segAlphaAttr.array.fill(1.0);
        segAlphaAttr.needsUpdate = true;
      }
      tmState.lastLinkRevealed = -1;
      if (selectedIdx >= 0) updateHighlightStarLinks(selectedIdx);
    }
  }

  function toggleTimeMachinePlay() {
    if (!tmState.open) return;
    if (tmState.playing) {
      setTimeMachinePlaying(false);
      return;
    }
    if (tmState.progress >= 0.999) {
      tmState.progress = 0;
      tmState.userDraggedCamera = false;
      tmState.lastLinkRevealed = -1;
      if (tmState.ignitedAt) tmState.ignitedAt.fill(-1);
      const revealAttr = starGeom?.getAttribute('aReveal');
      const flashAttr = starGeom?.getAttribute('aFlash');
      if (revealAttr) {
        revealAttr.array.fill(0.0);
        revealAttr.needsUpdate = true;
      }
      if (flashAttr) {
        flashAttr.array.fill(0.0);
        flashAttr.needsUpdate = true;
      }
      applyTimeMachineAt(0, performance.now(), true, 0);
    }
    setTimeMachinePlaying(true);
  }

  function updateHoverTooltip(idx, clientX, clientY) {
    if (!hoverTip) return;
    if (idx < 0 || idx >= activeNodes.length) {
      hoverTip.classList.remove('is-visible');
      return;
    }
    const node = activeNodes[idx];
    if (tipTitle) tipTitle.textContent = node.title;
    if (tipMeta) {
      const parts = [
        node.isPeak ? `<b>Peak #${formatRank(node.peakRank)}</b>` : null,
        node.status === 'planned' ? '<b>В планах</b>' : null,
        node.score ? `Я: <b>${node.score}/10</b>` : null,
        node.shikiScore ? `Шики: ${node.shikiScore.toFixed(2)}` : null,
        node.year ? String(node.year) : null
      ].filter(Boolean);
      tipMeta.innerHTML = parts.join(' · ');
    }
    if (tipImg) {
      const imgSrc = appState.coverCache['anime_' + node.id] || node.img || '';
      if (tipImg.getAttribute('src') !== imgSrc) tipImg.src = imgSrc;
    }

    const pad = 18;
    const tw = 264;
    const th = 78;
    let tx = clientX + pad;
    let ty = clientY - th * 0.5;
    if (tx + tw > window.innerWidth - 14) tx = clientX - tw - pad;
    if (ty < 72) ty = 72;
    if (ty + th > window.innerHeight - 90) ty = window.innerHeight - 90 - th;

    hoverTip.style.transform = `translate3d(${tx.toFixed(0)}px, ${ty.toFixed(0)}px, 0)`;
    hoverTip.classList.add('is-visible');
  }

  function projectReticleAndLabels(now) {
    if (!camera || !THREE_LIB) return;
    const w = galaxyViewW;
    const h = galaxyViewH;
    if (!reusableProjVec) reusableProjVec = new THREE_LIB.Vector3();
    const proj = reusableProjVec;

    // Cluster labels: frustum-culled + dirty-checked (throttled to ~30Hz unless morphing)
    if (isMorphing || now - lastClusterProjAt >= 32) {
      lastClusterProjAt = now;
      const padX = 140;
      const padY = 60;
      for (let i = 0; i < clusterAnchors.length; i++) {
        const el = clusterLabelEls[i];
        const st = clusterLabelState[i];
        if (!el || !st) continue;
        const c = clusterAnchors[i];
        proj.set(c.x, c.y + 12, c.z).project(camera);
        const inZ = proj.z >= -1 && proj.z <= 1;
        const lx = (proj.x * 0.5 + 0.5) * w;
        const ly = (-proj.y * 0.5 + 0.5) * h;
        const inView = inZ && lx >= -padX && lx <= w + padX && ly >= -padY && ly <= h + padY;

        if (inView) {
          if (Math.abs(lx - st.x) >= 0.4 || Math.abs(ly - st.y) >= 0.4) {
            st.x = lx;
            st.y = ly;
            el.style.transform = `translate3d(${lx.toFixed(1)}px, ${ly.toFixed(1)}px, 0) translate(-50%, -50%)`;
          }
          if (!st.visible) {
            st.visible = true;
            el.classList.add('is-visible');
          }
        } else if (st.visible) {
          st.visible = false;
          el.classList.remove('is-visible');
        }
      }
    }

    // Reticle on hovered / selected / hopping star: full frame rate with frustum cull + dirty check
    const focusIdx = hopState.active ? hopState.focusIdx : (hoveredIdx >= 0 ? hoveredIdx : selectedIdx);
    if (reticle) {
      if (focusIdx >= 0 && currentPos && focusIdx < activeNodes.length) {
        proj.set(currentPos[focusIdx * 3], currentPos[focusIdx * 3 + 1], currentPos[focusIdx * 3 + 2]).project(camera);
        const rx = (proj.x * 0.5 + 0.5) * w;
        const ry = (-proj.y * 0.5 + 0.5) * h;
        const inView = proj.z >= -1 && proj.z <= 1 && rx >= -48 && rx <= w + 48 && ry >= -48 && ry <= h + 48;
        if (inView) {
          if (Math.abs(rx - reticleState.x) >= 0.3 || Math.abs(ry - reticleState.y) >= 0.3) {
            reticleState.x = rx;
            reticleState.y = ry;
            reticle.style.transform = `translate3d(${rx.toFixed(1)}px, ${ry.toFixed(1)}px, 0)`;
          }
          if (!reticleState.visible) {
            reticleState.visible = true;
            reticle.classList.add('is-visible');
          }
        } else if (reticleState.visible) {
          reticleState.visible = false;
          reticle.classList.remove('is-visible');
        }
      } else if (reticleState.visible) {
        reticleState.visible = false;
        reticle.classList.remove('is-visible');
      }
    }
  }

  function renderLoop(now) {
    if (!isOpen || document.hidden || isGalaxyOccluded() || !renderer || !scene || !camera) {
      rafId = null;
      lastFrameAt = 0;
      syncPerfGalaxyState();
      return;
    }

    const hasPrev = lastFrameAt > 0;
    const rawFrameMs = hasPrev ? Math.max(0, now - lastFrameAt) : 16.67;
    const rawDt = rawFrameMs * 0.001;
    const dt = Math.min(rawDt, MAX_DT_SEC);
    const dtMs = dt * 1000;
    lastFrameAt = now;

    if (hasPrev) {
      sampleAdaptiveFrame(rawFrameMs, now);
    }

    const spec = (player && typeof player.sampleSpectrum === 'function')
      ? player.sampleSpectrum(now)
      : ZERO_SPECTRUM;
    const bass = spec.bass || 0;
    const mid = spec.mid || 0;
    const high = spec.high || 0;

    // 1. Morph star positions smoothly when changing formations
    if (isMorphing && startPos && targetPos && currentPos && starGeom) {
      const t = Math.min(1, (now - morphStart) / morphDuration);
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      for (let i = 0; i < currentPos.length; i++) {
        currentPos[i] = startPos[i] + (targetPos[i] - startPos[i]) * eased;
      }
      starGeom.getAttribute('position').needsUpdate = true;
      if (t >= 1) {
        isMorphing = false;
        buildConstellationLineIndices(currentPos);
        if (selectedIdx >= 0) updateHighlightStarLinks(selectedIdx);
      }
    }

    // 1b. Star-Hopping Roulette frame step (real elapsed dtMs, Hz-independent)
    updateStarHopFrame(dtMs);

    // 1c. Chronological Time Machine playback & flash decay
    if (tmState.open) {
      if (tmState.playing) {
        const prevProg = tmState.progress;
        const nextProg = Math.min(1, prevProg + (dtMs * tmState.speed) / tmState.durationMs);
        tmState.progress = nextProg;
        applyTimeMachineAt(nextProg, now, false, prevProg);
        if (!tmState.userDraggedCamera && !hopState.active && !flyState.active) {
          const baseR = activeLayout === 'eras' ? 215 : 178;
          camState.targetTheta += (TM_ORBIT_BASE_RAD_SEC + bass * TM_ORBIT_BASS_RAD_SEC) * dt;
          camState.targetPhi = 1.06 + Math.sin(nextProg * Math.PI) * 0.14;
          camState.targetRadius = baseR * (0.86 + nextProg * 0.18);
        }
        if (nextProg >= 1) {
          setTimeMachinePlaying(false);
        }
      } else if (tmState.hasActiveFlash) {
        applyTimeMachineAt(tmState.progress, now, false, tmState.progress);
      }
    }

    // 2. Smooth cubic fly-to OR exponential frame-rate independent orbit + zoom
    if (flyState.active) {
      const rawT = Math.min(1, (now - flyState.startTime) / flyState.duration);
      const eased = rawT < 0.5 ? 4 * rawT * rawT * rawT : 1 - Math.pow(-2 * rawT + 2, 3) / 2;
      camState.look.x = flyState.fromLook.x + (flyState.toLook.x - flyState.fromLook.x) * eased;
      camState.look.y = flyState.fromLook.y + (flyState.toLook.y - flyState.fromLook.y) * eased;
      camState.look.z = flyState.fromLook.z + (flyState.toLook.z - flyState.fromLook.z) * eased;
      camState.radius = flyState.fromRadius + (flyState.toRadius - flyState.fromRadius) * eased;
      camState.phi = flyState.fromPhi + (flyState.toPhi - flyState.fromPhi) * eased;
      camState.theta = flyState.fromTheta + (flyState.toTheta - flyState.fromTheta) * eased;
      camState.targetLook.x = camState.look.x;
      camState.targetLook.y = camState.look.y;
      camState.targetLook.z = camState.look.z;
      camState.targetRadius = camState.radius;
      camState.targetPhi = camState.phi;
      camState.targetTheta = camState.theta;
      if (rawT >= 1) {
        flyState.active = false;
      }
    } else {
      if (autoOrbit && !hopState.active && !(tmState.open && tmState.playing)) {
        camState.targetTheta += (ORBIT_BASE_RAD_SEC + bass * ORBIT_BASS_RAD_SEC) * dt;
      }
      const camAlpha = 1 - Math.exp(-(hopState.active ? CAM_HOP_LAMBDA : CAM_LAMBDA) * dt);
      const lookAlpha = 1 - Math.exp(-(hopState.active ? LOOK_HOP_LAMBDA : LOOK_LAMBDA) * dt);
      camState.theta += (camState.targetTheta - camState.theta) * camAlpha;
      camState.phi += (camState.targetPhi - camState.phi) * camAlpha;
      camState.radius += (camState.targetRadius - camState.radius) * camAlpha;
      camState.look.x += (camState.targetLook.x - camState.look.x) * lookAlpha;
      camState.look.y += (camState.targetLook.y - camState.look.y) * lookAlpha;
      camState.look.z += (camState.targetLook.z - camState.look.z) * lookAlpha;
    }

    const sinPhi = Math.sin(camState.phi);
    camera.position.set(
      camState.look.x + camState.radius * sinPhi * Math.sin(camState.theta),
      camState.look.y + camState.radius * Math.cos(camState.phi),
      camState.look.z + camState.radius * sinPhi * Math.cos(camState.theta)
    );
    camera.lookAt(camState.look.x, camState.look.y, camState.look.z);

    // 3. Subtle cosmic motion (rad/sec * dt) & deep audio spectrum reactivity
    const timeSec = now * 0.001;
    if (dustPoints) {
      dustPoints.rotation.y += (DUST_BASE_RAD_SEC + bass * DUST_BASS_RAD_SEC) * dt;
    }
    if (dustMat) {
      dustMat.uniforms.uTime.value = timeSec;
      dustMat.uniforms.uBass.value = bass;
      dustMat.uniforms.uHigh.value = high;
    }
    if (astrolabeGroup) {
      astrolabeGroup.rotation.y -= (ASTRO_BASE_RAD_SEC + mid * ASTRO_MID_RAD_SEC) * dt;
      const ringScale = 1 + bass * 0.042;
      astrolabeGroup.scale.set(ringScale, 1, ringScale);
      for (let i = 0; i < astrolabeMats.length; i++) {
        astrolabeMats[i].opacity = (ASTROLABE_BASE_OPACITY[i] || 0.07) * (1 + bass * 0.65 + mid * 0.25);
      }
    }
    if (linkLines) {
      linkLines.visible = showLinks && !isMorphing;
    }
    if (linkMat) {
      linkMat.uniforms.uTime.value = timeSec;
      linkMat.uniforms.uMid.value = mid;
      linkMat.uniforms.uHigh.value = high;
    }
    if (highlightMat) {
      highlightMat.uniforms.uTime.value = timeSec;
      highlightMat.uniforms.uBass.value = bass;
      highlightMat.uniforms.uMid.value = mid;
    }
    if (starMat) {
      starMat.uniforms.uTime.value = timeSec;
      starMat.uniforms.uBass.value = bass;
      starMat.uniforms.uMid.value = mid;
      starMat.uniforms.uHigh.value = high;
      starMat.uniforms.uFocusIdx.value = hopState.active ? hopState.focusIdx : (hoveredIdx >= 0 ? hoveredIdx : selectedIdx);
    }

    renderer.render(scene, camera);
    projectReticleAndLabels(now);
    rafId = requestAnimationFrame(renderLoop);
  }

  // Pointer Orbit / Pinch Zoom / Click Interaction
  const pointers = new Map();
  let dragMoved = 0;
  let lastX = 0;
  let lastY = 0;
  let lastPinchDist = 0;

  canvasWrap.addEventListener('pointerdown', (e) => {
    flyState.active = false;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    lastX = e.clientX;
    lastY = e.clientY;
    dragMoved = 0;
    if (pointers.size === 2) {
      const pts = Array.from(pointers.values());
      lastPinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    }
  });

  canvasWrap.addEventListener('pointermove', (e) => {
    if (pointers.has(e.pointerId)) {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    if (pointers.size === 2) {
      const pts = Array.from(pointers.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (lastPinchDist > 0) {
        const delta = lastPinchDist - dist;
        camState.targetRadius = Math.max(26, Math.min(420, camState.targetRadius + delta * 0.55));
      }
      lastPinchDist = dist;
      dragMoved += 20;
      if (tmState.open) tmState.userDraggedCamera = true;
      return;
    }

    if (pointers.size === 1) {
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      dragMoved += Math.hypot(dx, dy);
      camState.targetTheta -= dx * 0.0056;
      camState.targetPhi = Math.max(0.18, Math.min(Math.PI - 0.18, camState.targetPhi - dy * 0.0052));
      if (dragMoved > 6) {
        if (autoOrbit) {
          autoOrbit = false;
          orbitBtn?.classList.remove('active');
        }
        if (tmState.open) tmState.userDraggedCamera = true;
      }
      updateHoverTooltip(-1, 0, 0);
      return;
    }

    // Desktop hover snap (throttled to ~30Hz, paused during star-hopping)
    if (e.pointerType !== 'touch') {
      if (hopState.active) return;
      const nowTs = performance.now();
      if (nowTs - lastHoverCheckAt < 32) return;
      lastHoverCheckAt = nowTs;
      const hit = findNearestStarAt(e.clientX, e.clientY, 20);
      if (hit !== hoveredIdx) {
        hoveredIdx = hit;
        updateHighlightStarLinks(hit >= 0 ? hit : selectedIdx);
      }
      updateHoverTooltip(hit, e.clientX, e.clientY);
    }
  });

  function handlePointerUp(e) {
    const wasSingleTap = pointers.size === 1 && dragMoved < 8;
    pointers.delete(e.pointerId);
    if (pointers.size < 2) lastPinchDist = 0;

    if (wasSingleTap) {
      const hitRadius = e.pointerType === 'touch' ? 32 : 22;
      const hit = findNearestStarAt(e.clientX, e.clientY, hitRadius);
      if (hit >= 0) {
        flyToStar(hit, true);
        updateHoverTooltip(-1, 0, 0);
      }
    }
  }

  canvasWrap.addEventListener('pointerup', handlePointerUp);
  canvasWrap.addEventListener('pointercancel', handlePointerUp);
  canvasWrap.addEventListener('pointerleave', () => {
    hoveredIdx = -1;
    updateHoverTooltip(-1, 0, 0);
  });

  canvasWrap.addEventListener('wheel', (e) => {
    e.preventDefault();
    flyState.active = false;
    if (tmState.open) tmState.userDraggedCamera = true;
    camState.targetRadius = Math.max(26, Math.min(420, camState.targetRadius + e.deltaY * 0.14));
  }, { passive: false });

  let galResizeTimer = null;
  window.addEventListener('resize', () => {
    galaxyViewW = window.innerWidth;
    galaxyViewH = window.innerHeight;
    if (isOpen) updateMobileHudClearance();
    if (!renderer || !camera) return;
    clearTimeout(galResizeTimer);
    galResizeTimer = setTimeout(() => {
      galaxyViewW = window.innerWidth;
      galaxyViewH = window.innerHeight;
      camera.aspect = galaxyViewW / galaxyViewH;
      camera.updateProjectionMatrix();
      applyAdaptiveStep(apState.stepIdx, 0);
      if (isOpen) updateMobileHudClearance();
    }, 90);
  }, { passive: true });

  function syncGalaxyLoop() {
    const shouldRun = isOpen && !document.hidden && !isGalaxyOccluded() && Boolean(renderer && scene && camera);
    if (!shouldRun) {
      lastFrameAt = 0;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    } else if (rafId === null) {
      lastFrameAt = 0;
      resetAdaptiveWindow(performance.now(), 1400);
      rafId = requestAnimationFrame(renderLoop);
    }
    syncPerfGalaxyState();
  }

  document.addEventListener('visibilitychange', syncGalaxyLoop);

  if (typeof MutationObserver !== 'undefined') {
    const occlusionObserver = new MutationObserver(() => {
      if (isOpen) syncGalaxyLoop();
    });
    if (holoModalEl) occlusionObserver.observe(holoModalEl, { attributes: true, attributeFilter: ['class'] });
    if (detailModalEl) occlusionObserver.observe(detailModalEl, { attributes: true, attributeFilter: ['class'] });
  }

  async function openGalaxy(opts) {
    const wantsTimeMachine = Boolean(opts && opts.startTimeMachine);
    if (isOpen) {
      if (wantsTimeMachine && renderer && !tmState.open) {
        openTimeMachine(true);
      }
      return;
    }
    isOpen = true;
    lastFrameAt = 0;
    galaxyViewW = window.innerWidth;
    galaxyViewH = window.innerHeight;
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('galaxy-active');
    player?.syncVisualizer?.();
    requestAnimationFrame(updateMobileHudClearance);

    if (!renderer && !isBooting) {
      isBooting = true;
      loader?.classList.remove('is-hidden');
      if (loaderText) loaderText.textContent = 'Загрузка WebGL-движка Three.js...';
      try {
        THREE_LIB = await ensureThreeJsLoaded();
        if (loaderText) loaderText.textContent = 'Построение звёздной карты архива...';
        initThreeScene();
        loader?.classList.add('is-hidden');
      } catch (err) {
        // Handled cleanly via WebGL loader message below
        if (loaderText) loaderText.textContent = 'WebGL / Three.js недоступен в этом браузере';
        isBooting = false;
        syncPerfGalaxyState();
        return;
      }
      isBooting = false;
    } else {
      loader?.classList.add('is-hidden');
    }

    // Start each open session from crisp DPR ceiling with downward-only adaptive stepping
    apState.lastStepAt = 0;
    applyAdaptiveStep(0, 0);
    resetAdaptiveWindow(performance.now(), AP_WARMUP_MS);
    syncGalaxyLoop();

    if (wantsTimeMachine && isOpen && renderer) {
      openTimeMachine(true);
    }

    // If visitor opened galaxy before live 415+ list finished downloading, or old cache lacks planned, pull it immediately
    if (appState.galaxyNodes.length < 30 || !appState.galaxyNodes.some((n) => n.status === 'planned')) {
      loadHostAnimeRates().then(() => {
        if (appState.galaxyNodes.length && appState.galaxyNodes !== activeNodes) {
          populateGalaxyScene();
        }
      });
    }
  }

  function closeGalaxy() {
    if (!isOpen) return;
    cancelStarHop(false);
    if (tmState.open) closeTimeMachine(true);
    flyState.active = false;
    lastFrameAt = 0;
    isOpen = false;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('galaxy-active');
    player?.syncVisualizer?.();
    updateHoverTooltip(-1, 0, 0);
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    syncPerfGalaxyState();
  }

  // Hook live refresh when Shikimori finishes loading in background
  appState.galaxyRefreshHook = () => {
    if (scene && THREE_LIB) {
      populateGalaxyScene();
    }
  };

  // HUD Controls Bindings
  document.getElementById('open-galaxy-topbar-btn')?.addEventListener('click', () => openGalaxy());
  document.getElementById('open-galaxy-dna-btn')?.addEventListener('click', () => openGalaxy());
  document.addEventListener('archive:galaxy-timemachine', () => openGalaxy({ startTimeMachine: true }));
  closeBtn?.addEventListener('click', closeGalaxy);

  tmToggleBtn?.addEventListener('click', () => {
    if (tmState.open) closeTimeMachine(true);
    else openTimeMachine(true);
  });

  tmCloseBtn?.addEventListener('click', () => closeTimeMachine(true));
  tmPlayBtn?.addEventListener('click', toggleTimeMachinePlay);

  tmScrubber?.addEventListener('input', () => {
    if (!tmState.open) return;
    const prevProg = tmState.progress;
    const nextProg = Math.max(0, Math.min(1, Number(tmScrubber.value) / 1000));
    setTimeMachinePlaying(false);
    tmState.progress = nextProg;
    applyTimeMachineAt(nextProg, performance.now(), true, prevProg);
  });

  tmSpeedBtn?.addEventListener('click', () => {
    tmState.speed = tmState.speed === 1 ? 2 : 1;
    tmSpeedBtn.textContent = `${tmState.speed}×`;
    tmSpeedBtn.classList.toggle('active', tmState.speed === 2);
  });

  tmAxisBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!tmState.open) return;
      const nextAxis = btn.dataset.tmaxis;
      if (!nextAxis || nextAxis === tmState.axis) return;
      const wasPlaying = tmState.playing;
      const prevProg = tmState.progress;
      const revealAttr = starGeom?.getAttribute('aReveal');
      const flashAttr = starGeom?.getAttribute('aFlash');
      if (revealAttr) {
        revealAttr.array.fill(0.0);
        revealAttr.needsUpdate = true;
      }
      if (flashAttr) {
        flashAttr.array.fill(0.0);
        flashAttr.needsUpdate = true;
      }
      buildTimeMachineSchedule(nextAxis);
      const nextProg = wasPlaying ? 0 : prevProg;
      tmState.progress = nextProg;
      applyTimeMachineAt(nextProg, performance.now(), true, 0);
      if (wasPlaying) setTimeMachinePlaying(true);
    });
  });

  inspClose?.addEventListener('click', () => {
    selectedIdx = -1;
    inspector?.classList.remove('is-open');
    updateHighlightStarLinks(-1);
  });

  inspHoloBtn?.addEventListener('click', () => {
    if (selectedIdx < 0 || selectedIdx >= activeNodes.length) return;
    const selectedNode = activeNodes[selectedIdx];
    const filtered = activeNodes.filter((n) => nodeMatchesFilter(n));
    const list = filtered.length ? filtered : [selectedNode];
    const targetIdx = list.indexOf(selectedNode);
    appState.holoGalaxyList = list;
    openHoloDeck('galaxy', targetIdx >= 0 ? targetIdx : 0);
  });

  layoutBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      switchGalaxyLayout(btn.dataset.glayout || 'spiral');
    });
  });

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const nextFilter = btn.dataset.gfilter || 'all';
      const prevPlanned = activeFilter === 'planned';
      const nextPlanned = nextFilter === 'planned';

      if (tmState.open) closeTimeMachine(true);
      activeFilter = nextFilter;
      filterBtns.forEach((b) => b.classList.toggle('active', b === btn));
      cancelStarHop(false);

      if (selectedIdx >= 0 && (!activeNodes[selectedIdx] || !nodeMatchesFilter(activeNodes[selectedIdx]))) {
        selectedIdx = -1;
        inspector?.classList.remove('is-open');
        updateHighlightStarLinks(-1);
      }
      if (hoveredIdx >= 0 && (!activeNodes[hoveredIdx] || !nodeMatchesFilter(activeNodes[hoveredIdx]))) {
        hoveredIdx = -1;
        updateHoverTooltip(-1, 0, 0);
      }

      if (prevPlanned !== nextPlanned && activeNodes.length && currentPos) {
        startPos = new Float32Array(currentPos);
        targetPos = computeLayoutPositions(activeNodes, activeLayout);
        morphStart = performance.now();
        isMorphing = true;
        rebuildClusterLabelsDOM();
        camState.targetLook.x = 0;
        camState.targetLook.y = 0;
        camState.targetLook.z = 0;
        camState.targetRadius = activeLayout === 'eras' ? 215 : 178;
      }

      updateFilterAlphas();
    });
  });

  searchInput?.addEventListener('input', () => {
    if (tmState.open) closeTimeMachine(true);
    activeSearch = searchInput.value || '';
    updateFilterAlphas();
  });

  searchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const firstMatch = activeNodes.findIndex((n) => nodeMatchesFilter(n));
      if (firstMatch >= 0) flyToStar(firstMatch, true);
    }
  });

  warpBtn?.addEventListener('click', () => {
    startStarHopRoulette();
  });

  linesBtn?.addEventListener('click', () => {
    showLinks = !showLinks;
    linesBtn.classList.toggle('active', showLinks);
  });

  orbitBtn?.classList.toggle('active', autoOrbit);
  orbitBtn?.addEventListener('click', () => {
    autoOrbit = !autoOrbit;
    orbitBtn.classList.toggle('active', autoOrbit);
  });

  resetBtn?.addEventListener('click', () => {
    cancelStarHop(false);
    tmState.userDraggedCamera = false;
    selectedIdx = -1;
    inspector?.classList.remove('is-open');
    updateHighlightStarLinks(-1);
    autoOrbit = true;
    orbitBtn?.classList.add('active');
    startCameraFlyTo(0, 0, 0, activeLayout === 'eras' ? 215 : 178, 1.12, 720);
  });

  musicBtn?.addEventListener('click', () => {
    if (!player) return;
    if (player.isPlaying()) player.pause();
    else player.play();
  });

  player?.onState?.(({ playing }) => {
    musicBtn?.classList.toggle('is-playing', Boolean(playing));
  });

  window.addEventListener('keydown', (e) => {
    if (!isOpen) return;
    // Capture phase ensures holo-modal / cmdk-modal checks see open state before bubble handlers close them
    const holoOpen = document.getElementById('holo-modal')?.classList.contains('is-open');
    const cmdkOpen = document.getElementById('cmdk-modal')?.classList.contains('is-open');
    if (holoOpen || cmdkOpen) return;

    if ((e.code === 'Space' || e.key === ' ') && tmState.open && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const target = e.target;
      const tag = target && target.tagName;
      const isTextTyping = tag === 'TEXTAREA' || tag === 'SELECT' || (target && target.isContentEditable) || (tag === 'INPUT' && target.type !== 'range');
      if (!isTextTyping) {
        e.preventDefault();
        toggleTimeMachinePlay();
        return;
      }
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      if (tmState.open) {
        closeTimeMachine(true);
        return;
      }
      if (inspector?.classList.contains('is-open')) {
        selectedIdx = -1;
        inspector.classList.remove('is-open');
        updateHighlightStarLinks(-1);
        return;
      }
      closeGalaxy();
    }
  }, true);
}

