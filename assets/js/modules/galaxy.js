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
  const warpBtn = document.getElementById('galaxy-warp-btn');
  const linesBtn = document.getElementById('galaxy-lines-btn');
  const orbitBtn = document.getElementById('galaxy-orbit-btn');
  const resetBtn = document.getElementById('galaxy-reset-btn');
  const musicBtn = document.getElementById('galaxy-music-btn');
  const closeBtn = document.getElementById('galaxy-close-btn');

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

  let isOpen = false;
  let isBooting = false;
  let rafId = null;

  let THREE_LIB = null;
  let renderer = null;
  let scene = null;
  let camera = null;
  let starPoints = null;
  let starGeom = null;
  let starMat = null;
  let dustPoints = null;
  let astrolabeGroup = null;
  let linkLines = null;
  let linkGeom = null;
  let highlightLine = null;
  let highlightGeom = null;
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
    segStart: 0,
    fadeStart: 0,
    fading: false,
    focusIdx: -1,
    hidePillTimer: null
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

    // Returns [r, g, b, size, spike]
    if (node.isPeak) {
      return [1.0, 0.99, 1.0, node.peakRank <= 3 ? 21.0 : 16.5, 1.0];
    }
    if (node.status === 'watching' || node.status === 'rewatching') {
      return [0.43, 0.91, 0.72, 13.5, 0.75];
    }
    if (s >= 10) {
      return [0.88, 0.95, 1.0, 14.5, 0.9];
    }
    if (s >= 9) {
      return [0.72, 0.85, 1.0, 11.8, 0.55];
    }
    if (delta <= -1.8 && sh >= 7.3) {
      // Harsh Hot Take outlier: muted crimson dwarf
      return [0.97, 0.48, 0.50, 10.5, 0.35];
    }
    if (s >= 7) {
      return [0.58, 0.69, 0.86, 8.6, 0.0];
    }
    if (s > 0) {
      return [0.44, 0.50, 0.62, 6.8, 0.0];
    }
    return [0.48, 0.54, 0.66, 6.4, 0.0];
  }

  function computeLayoutPositions(nodes, layoutMode) {
    const count = nodes.length;
    const arr = new Float32Array(count * 3);
    clusterAnchors = [];

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
      // 3D Score Stratification Cylinder/Sphere: Y = user score (10 top -> 1 bottom), R = crowd divergence
      clusterAnchors.push(
        { x: 0, y:  62, z: 0, label: '★ 10/10 · ЗЕНИТ БАЗЫ' },
        { x: 0, y:  24, z: 0, label: '8–9★ · ЗОЛОТОЙ СЛОЙ' },
        { x: 0, y: -26, z: 0, label: '≤ 6★ · НИЖНЯЯ ОРБИТА' }
      );
      nodes.forEach((n, idx) => {
        const s = Number(n.score) || 6.5;
        const sh = Number(n.shikiScore) || 7.2;
        const delta = Math.abs(s - sh);
        const h1 = hash01(n.id * 1.7 + 19);
        const h2 = hash01(n.id * 2.9 + 5);
        const yearNorm = Math.max(0, Math.min(1, ((Number(n.year) || 2016) - 1995) / 31));
        const angle = yearNorm * Math.PI * 2 + (h1 - 0.5) * 1.2;
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

    // Default: Logarithmic 4-Arm Spiral Galaxy (Peak 16 in luminous core -> outer rim)
    clusterAnchors.push(
      { x: 0, y: 16, z: 0, label: '◈ ЯДРО · PEAK 16' }
    );
    const arms = 4;
    nodes.forEach((n, idx) => {
      const h1 = hash01(n.id * 1.37 + 1);
      const h2 = hash01(n.id * 2.83 + 5);
      const h3 = hash01(n.id * 4.19 + 9);

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

    // 1. Peak 16 backbone ring in order
    const peakIndices = [];
    activeNodes.forEach((n, idx) => {
      if (n.isPeak) peakIndices.push({ idx, rank: n.peakRank || 99 });
    });
    peakIndices.sort((a, b) => a.rank - b.rank);
    for (let i = 0; i < peakIndices.length - 1; i++) {
      const a = peakIndices[i].idx;
      const b = peakIndices[i + 1].idx;
      lineVerts.push(
        positionsArr[a * 3], positionsArr[a * 3 + 1], positionsArr[a * 3 + 2],
        positionsArr[b * 3], positionsArr[b * 3 + 1], positionsArr[b * 3 + 2]
      );
      lineCols.push(0.86, 0.92, 1.0, 0.72, 0.82, 0.96);
    }

    // 2. Nearest neighbor filaments within same score/era tier (max 1 link per star to stay airy & clean)
    const maxDistSq = activeLayout === 'eras' ? 32 * 32 : 24 * 24;
    for (let i = 0; i < count; i++) {
      if (!nodeMatchesFilter(activeNodes[i])) continue;
      const ix = positionsArr[i * 3];
      const iy = positionsArr[i * 3 + 1];
      const iz = positionsArr[i * 3 + 2];
      let bestJ = -1;
      let bestD = maxDistSq;

      // Sample stride for fast O(N) performance
      const step = count > 260 ? 2 : 1;
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
        lineVerts.push(
          ix, iy, iz,
          positionsArr[bestJ * 3], positionsArr[bestJ * 3 + 1], positionsArr[bestJ * 3 + 2]
        );
        lineCols.push(0.54, 0.65, 0.82, 0.42, 0.52, 0.68);
      }
    }

    if (!linkGeom) return;
    linkGeom.setAttribute('position', new THREE_LIB.Float32BufferAttribute(lineVerts, 3));
    linkGeom.setAttribute('color', new THREE_LIB.Float32BufferAttribute(lineCols, 3));
    linkGeom.computeBoundingSphere();
  }

  function updateHighlightStarLinks(focusIdx) {
    if (!highlightGeom || !currentPos || focusIdx < 0 || focusIdx >= activeNodes.length) {
      if (highlightLine) highlightLine.visible = false;
      return;
    }
    const fx = currentPos[focusIdx * 3];
    const fy = currentPos[focusIdx * 3 + 1];
    const fz = currentPos[focusIdx * 3 + 2];

    const neighbors = [];
    for (let i = 0; i < activeNodes.length; i++) {
      if (i === focusIdx) continue;
      const dx = currentPos[i * 3] - fx;
      const dy = currentPos[i * 3 + 1] - fy;
      const dz = currentPos[i * 3 + 2] - fz;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < 44 * 44) neighbors.push({ i, d2 });
    }
    neighbors.sort((a, b) => a.d2 - b.d2);
    const verts = [];
    neighbors.slice(0, 6).forEach((nb) => {
      verts.push(
        fx, fy, fz,
        currentPos[nb.i * 3], currentPos[nb.i * 3 + 1], currentPos[nb.i * 3 + 2]
      );
    });
    highlightGeom.setAttribute('position', new THREE_LIB.Float32BufferAttribute(verts, 3));
    if (highlightLine) highlightLine.visible = verts.length > 0;
  }

  function updateFilterAlphas() {
    if (!starGeom || !activeNodes.length) return;
    const alphaAttr = starGeom.getAttribute('aAlpha');
    if (!alphaAttr) return;
    let matchedCount = 0;
    for (let i = 0; i < activeNodes.length; i++) {
      const ok = nodeMatchesFilter(activeNodes[i]);
      if (ok) matchedCount++;
      alphaAttr.array[i] = ok ? 1.0 : 0.09;
    }
    alphaAttr.needsUpdate = true;

    if (countPill) {
      const total = activeNodes.length;
      countPill.textContent = matchedCount === total
        ? `${total} ЗВЁЗД`
        : `${matchedCount} / ${total} ЗВЁЗД`;
    }
    if (currentPos) buildConstellationLineIndices(currentPos);
  }

  function populateGalaxyScene() {
    if (!scene || !THREE_LIB) return;
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

    for (let i = 0; i < count; i++) {
      const [r, g, b, sz, sp] = computeStarVisuals(activeNodes[i]);
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
      sizes[i] = sz;
      alphas[i] = 1.0;
      spikes[i] = sp;
      indices[i] = i;
    }

    starGeom = new THREE_LIB.BufferGeometry();
    starGeom.setAttribute('position', new THREE_LIB.BufferAttribute(currentPos, 3));
    starGeom.setAttribute('aColor', new THREE_LIB.BufferAttribute(colors, 3));
    starGeom.setAttribute('aSize', new THREE_LIB.BufferAttribute(sizes, 1));
    starGeom.setAttribute('aAlpha', new THREE_LIB.BufferAttribute(alphas, 1));
    starGeom.setAttribute('aSpike', new THREE_LIB.BufferAttribute(spikes, 1));
    starGeom.setAttribute('aIndex', new THREE_LIB.BufferAttribute(indices, 1));

    starMat = new THREE_LIB.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE_LIB.AdditiveBlending,
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 1.5) },
        uTime: { value: 0 },
        uBeat: { value: 0 },
        uFocusIdx: { value: -1 }
      },
      vertexShader: `
        attribute vec3 aColor;
        attribute float aSize;
        attribute float aAlpha;
        attribute float aSpike;
        attribute float aIndex;
        uniform float uPixelRatio;
        uniform float uTime;
        uniform float uBeat;
        uniform float uFocusIdx;
        varying vec3 vColor;
        varying float vAlpha;
        varying float vSpike;
        varying float vFocus;

        void main() {
          vColor = aColor;
          vAlpha = aAlpha;
          vSpike = aSpike;
          vFocus = (abs(aIndex - uFocusIdx) < 0.5) ? 1.0 : 0.0;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float twinkle = 0.90 + 0.14 * sin(uTime * 1.9 + aIndex * 2.13);
          float beatScale = 1.0 + uBeat * (0.28 + aSpike * 0.40);
          float focusScale = 1.0 + vFocus * 0.72;
          float dist = max(18.0, -mvPosition.z);
          gl_PointSize = clamp((aSize * twinkle * beatScale * focusScale * uPixelRatio * 126.0) / dist, 2.4, 52.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        varying float vSpike;
        varying float vFocus;

        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float d = length(uv);
          if (d > 0.5) discard;

          float core = exp(-d * 10.5);
          float halo = pow(max(0.0, 1.0 - d * 2.0), 2.4) * 0.78;
          float flareH = exp(-abs(uv.y) * 32.0) * exp(-abs(uv.x) * 6.5);
          float flareV = exp(-abs(uv.x) * 32.0) * exp(-abs(uv.y) * 6.5);
          float spikes = (flareH + flareV) * (vSpike * 0.72 + vFocus * 0.55);

          float intensity = core * 1.35 + halo + spikes;
          vec3 col = mix(vColor, vec3(1.0), clamp(core * 0.85 + vFocus * 0.35, 0.0, 1.0));
          float alpha = clamp(intensity * vAlpha, 0.0, 1.0);
          gl_FragColor = vec4(col, alpha);
        }
      `
    });

    starPoints = new THREE_LIB.Points(starGeom, starMat);
    starPoints.frustumCulled = false;
    scene.add(starPoints);

    rebuildClusterLabelsDOM();
    updateFilterAlphas();
    if (selectedIdx >= activeNodes.length) {
      selectedIdx = -1;
      inspector?.classList.remove('is-open');
    }
  }

  function switchGalaxyLayout(newMode) {
    if (!activeNodes.length || !currentPos) return;
    cancelStarHop(false);
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
    hopState.segStart = performance.now();
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

    setHopHud(`✦ ПРЫЖОК 1 / ${segCount}`, activeNodes[targetIdx].title, false);
  }

  function updateStarHopFrame(now) {
    if (hopState.active && hopTrailGeom && hopTrailPosBuf && hopTrailColBuf && currentPos) {
      const chain = hopState.chain;
      const segCount = chain.length - 1;
      const s = hopState.segIdx;
      const dur = hopState.durations[s] || 220;
      const rawT = Math.min(1, (now - hopState.segStart) / dur);
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
        hopTrailColBuf[k * 3]     = 0.24 + ageFade * 0.45;
        hopTrailColBuf[k * 3 + 1] = 0.42 + ageFade * 0.52;
        hopTrailColBuf[k * 3 + 2] = 0.62 + ageFade * 0.34;
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

      // Blazing mint-white head of the star-hop beam
      hopTrailColBuf[tipSlot * 3]     = 0.72;
      hopTrailColBuf[tipSlot * 3 + 1] = 1.00;
      hopTrailColBuf[tipSlot * 3 + 2] = 0.88;

      hopTrailGeom.setDrawRange(0, vertCount);
      hopTrailGeom.getAttribute('position').needsUpdate = true;
      hopTrailGeom.getAttribute('color').needsUpdate = true;

      if (rawT >= 1) {
        if (s + 1 < segCount) {
          // Advance to next star hop!
          hopState.segIdx = s + 1;
          hopState.segStart = now;
          const nextTarget = chain[s + 2];
          hopState.focusIdx = nextTarget;

          camState.targetLook.x = currentPos[nextTarget * 3];
          camState.targetLook.y = currentPos[nextTarget * 3 + 1];
          camState.targetLook.z = currentPos[nextTarget * 3 + 2];
          camState.targetRadius = s + 2 >= segCount ? 84 : 112;
          camState.targetTheta += 0.16;

          setHopHud(`✦ ПРЫЖОК ${s + 2} / ${segCount}`, activeNodes[nextTarget].title, false);
        } else {
          // Final landing on winning star!
          const winnerIdx = toIdx;
          hopState.active = false;
          hopState.focusIdx = -1;
          hopState.fading = true;
          hopState.fadeStart = now;
          reticle?.classList.remove('is-hopping');

          setHopHud('★ ВЫБРАНО', activeNodes[winnerIdx].title, true);
          clearTimeout(hopState.hidePillTimer);
          hopState.hidePillTimer = setTimeout(() => {
            hopPill?.classList.remove('is-visible', 'is-locked');
          }, 1650);

          flyToStar(winnerIdx, true, true);
        }
      }
    } else if (hopState.fading && hopTrailMat && hopTrailLine) {
      const ft = Math.min(1, (now - hopState.fadeStart) / 950);
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

    camState.targetLook.x = sx;
    camState.targetLook.y = sy;
    camState.targetLook.z = sz;
    camState.targetRadius = 56;
    autoOrbit = false;
    orbitBtn?.classList.remove('active');

    updateHighlightStarLinks(idx);

    if (openDossier) {
      openStarInspector(idx);
    }
  }

  function openStarInspector(idx) {
    const node = activeNodes[idx];
    if (!node || !inspector) return;

    const delta = (node.score > 0 && node.shikiScore > 0) ? (node.score - node.shikiScore) : 0;
    if (inspTag) {
      inspTag.textContent = node.isPeak
        ? `★ PEAK FICTION · #${formatRank(node.peakRank)}`
        : node.status === 'watching'
          ? '● СЕЙЧАС СМОТРЮ · LIVE'
          : node.score >= 9
            ? `◈ ИЗБРАННАЯ ЗВЕЗДА · ${node.score}/10`
            : '◇ ЗВЕЗДА АРХИВА';
    }
    if (inspTitle) inspTitle.textContent = node.title;
    if (inspSub) inspSub.textContent = [node.kind, node.year, node.episodes ? `${node.episodes} эп.` : null].filter(Boolean).join(' · ');

    const pills = [
      node.score ? `Я: ${node.score}★` : 'Без оценки',
      node.shikiScore ? `Шики: ${node.shikiScore.toFixed(2)}★` : null,
      Math.abs(delta) >= 0.8 ? `Δ ${delta > 0 ? '+' : ''}${delta.toFixed(2)}` : null
    ].filter(Boolean);
    if (inspPills) {
      inspPills.innerHTML = pills.map((p) => `<span class="modal-pill" style="font-size:10px;padding:3px 8px;">${escapeHtml(p)}</span>`).join('');
    }
    if (inspNote) {
      inspNote.textContent = node.comment
        ? `«${node.comment}»`
        : (node.isPeak
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
  }

  function initThreeScene() {
    const T = THREE_LIB;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    renderer = new T.WebGLRenderer({ antialias: dpr <= 1.25, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(dpr);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x04060c, 1);
    canvasWrap.innerHTML = '';
    canvasWrap.appendChild(renderer.domElement);

    scene = new T.Scene();
    scene.fog = new T.FogExp2(0x05070d, 0.0018);

    camera = new T.PerspectiveCamera(56, window.innerWidth / window.innerHeight, 1, 1400);

    // 1. Background cosmic dust cloud (1,700 subtle stars)
    const dustCount = 900;
    const dustPos = new Float32Array(dustCount * 3);
    const dustCol = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      const r = 40 + Math.pow(Math.random(), 0.72) * 380;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;
      dustPos[i * 3]     = Math.cos(theta) * Math.cos(phi) * r;
      dustPos[i * 3 + 1] = Math.sin(phi) * r * (Math.random() < 0.6 ? 0.25 : 0.85);
      dustPos[i * 3 + 2] = Math.sin(theta) * Math.cos(phi) * r;
      const shade = 0.45 + Math.random() * 0.45;
      dustCol[i * 3]     = shade * 0.78;
      dustCol[i * 3 + 1] = shade * 0.86;
      dustCol[i * 3 + 2] = shade;
    }
    const dustGeom = new T.BufferGeometry();
    dustGeom.setAttribute('position', new T.BufferAttribute(dustPos, 3));
    dustGeom.setAttribute('color', new T.BufferAttribute(dustCol, 3));
    const dustMat = new T.PointsMaterial({
      size: 1.35,
      vertexColors: true,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      blending: T.AdditiveBlending
    });
    dustPoints = new T.Points(dustGeom, dustMat);
    scene.add(dustPoints);

    // 2. Astrolabe equatorial coordinate rings
    astrolabeGroup = new T.Group();
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
        color: 0xadbfde,
        transparent: true,
        opacity: idx === 0 ? 0.14 : 0.075,
        depthWrite: false
      });
      astrolabeGroup.add(new T.Line(rg, rm));
    });
    scene.add(astrolabeGroup);

    // 3. Constellation filament lines
    linkGeom = new T.BufferGeometry();
    const linkMat = new T.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      blending: T.AdditiveBlending
    });
    linkLines = new T.LineSegments(linkGeom, linkMat);
    linkLines.frustumCulled = false;
    scene.add(linkLines);

    // 4. Focused star bright links
    highlightGeom = new T.BufferGeometry();
    const hlMat = new T.LineBasicMaterial({
      color: 0xdcecff,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
      blending: T.AdditiveBlending
    });
    highlightLine = new T.LineSegments(highlightGeom, hlMat);
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
    let bestIdx = -1;
    let bestDistSq = maxPx * maxPx;

    for (let i = 0; i < activeNodes.length; i++) {
      if (!nodeMatchesFilter(activeNodes[i])) continue;
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
        node.score ? `Я: <b>${node.score}★</b>` : null,
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
    if (!isOpen || document.hidden || !renderer || !scene || !camera) {
      rafId = null;
      return;
    }

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

    // 1b. Star-Hopping Roulette frame step (100% rAF synced)
    updateStarHopFrame(now);

    // 2. Smooth inertial camera orbit + zoom + fly-to
    if (autoOrbit && !hopState.active) {
      camState.targetTheta += 0.0014 + appState.liveBeatEnergy * 0.0018;
    }
    const camLerp = hopState.active ? 0.14 : 0.085;
    const lookLerp = hopState.active ? 0.16 : 0.08;
    camState.theta += (camState.targetTheta - camState.theta) * camLerp;
    camState.phi += (camState.targetPhi - camState.phi) * camLerp;
    camState.radius += (camState.targetRadius - camState.radius) * camLerp;
    camState.look.x += (camState.targetLook.x - camState.look.x) * lookLerp;
    camState.look.y += (camState.targetLook.y - camState.look.y) * lookLerp;
    camState.look.z += (camState.targetLook.z - camState.look.z) * lookLerp;

    const sinPhi = Math.sin(camState.phi);
    camera.position.set(
      camState.look.x + camState.radius * sinPhi * Math.sin(camState.theta),
      camState.look.y + camState.radius * Math.cos(camState.phi),
      camState.look.z + camState.radius * sinPhi * Math.cos(camState.theta)
    );
    camera.lookAt(camState.look.x, camState.look.y, camState.look.z);

    // 3. Subtle cosmic motion & audio beat-sync
    if (dustPoints) {
      dustPoints.rotation.y += 0.00028 + appState.liveBeatEnergy * 0.0005;
    }
    if (astrolabeGroup) {
      astrolabeGroup.rotation.y -= 0.00045;
      const ringScale = 1 + appState.liveBeatEnergy * 0.025;
      astrolabeGroup.scale.set(ringScale, 1, ringScale);
    }
    if (linkLines) {
      linkLines.visible = showLinks && !isMorphing;
    }
    if (starMat) {
      starMat.uniforms.uTime.value = now * 0.001;
      starMat.uniforms.uBeat.value = appState.liveBeatEnergy;
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
      if (dragMoved > 6 && autoOrbit) {
        autoOrbit = false;
        orbitBtn?.classList.remove('active');
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
    camState.targetRadius = Math.max(26, Math.min(420, camState.targetRadius + e.deltaY * 0.14));
  }, { passive: false });

  let galResizeTimer = null;
  window.addEventListener('resize', () => {
    galaxyViewW = window.innerWidth;
    galaxyViewH = window.innerHeight;
    if (!renderer || !camera) return;
    clearTimeout(galResizeTimer);
    galResizeTimer = setTimeout(() => {
      galaxyViewW = window.innerWidth;
      galaxyViewH = window.innerHeight;
      camera.aspect = galaxyViewW / galaxyViewH;
      camera.updateProjectionMatrix();
      renderer.setSize(galaxyViewW, galaxyViewH);
      if (starMat) starMat.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 1.5);
    }, 90);
  }, { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (!isOpen) return;
    if (document.hidden) {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    } else if (renderer && !rafId) {
      rafId = requestAnimationFrame(renderLoop);
    }
  });

  async function openGalaxy() {
    if (isOpen) return;
    isOpen = true;
    galaxyViewW = window.innerWidth;
    galaxyViewH = window.innerHeight;
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('galaxy-active');
    player?.syncVisualizer?.();

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
        return;
      }
      isBooting = false;
    } else {
      loader?.classList.add('is-hidden');
    }

    if (!rafId) {
      rafId = requestAnimationFrame(renderLoop);
    }

    // If visitor opened galaxy before live 415+ list finished downloading, pull it immediately
    if (appState.galaxyNodes.length < 30) {
      loadHostAnimeRates().then(() => {
        if (appState.galaxyNodes.length > activeNodes.length) {
          populateGalaxyScene();
        }
      });
    }
  }

  function closeGalaxy() {
    if (!isOpen) return;
    cancelStarHop(false);
    isOpen = false;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('galaxy-active');
    player?.syncVisualizer?.();
    updateHoverTooltip(-1, 0, 0);
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  // Hook live refresh when Shikimori finishes loading in background
  appState.galaxyRefreshHook = () => {
    if (scene && THREE_LIB) {
      populateGalaxyScene();
    }
  };

  // HUD Controls Bindings
  document.getElementById('open-galaxy-topbar-btn')?.addEventListener('click', openGalaxy);
  document.getElementById('open-galaxy-dna-btn')?.addEventListener('click', openGalaxy);
  closeBtn?.addEventListener('click', closeGalaxy);

  inspClose?.addEventListener('click', () => {
    selectedIdx = -1;
    inspector?.classList.remove('is-open');
    updateHighlightStarLinks(-1);
  });

  inspHoloBtn?.addEventListener('click', () => {
    if (selectedIdx < 0 || selectedIdx >= activeNodes.length) return;
    appState.holoGalaxyList = activeNodes;
    openHoloDeck('galaxy', selectedIdx);
  });

  layoutBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      switchGalaxyLayout(btn.dataset.glayout || 'spiral');
    });
  });

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      activeFilter = btn.dataset.gfilter || 'all';
      filterBtns.forEach((b) => b.classList.toggle('active', b === btn));
      updateFilterAlphas();
    });
  });

  searchInput?.addEventListener('input', () => {
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
    camState.targetLook.x = 0;
    camState.targetLook.y = 0;
    camState.targetLook.z = 0;
    camState.targetRadius = activeLayout === 'eras' ? 215 : 178;
    camState.targetPhi = 1.12;
    selectedIdx = -1;
    inspector?.classList.remove('is-open');
    updateHighlightStarLinks(-1);
    autoOrbit = true;
    orbitBtn?.classList.add('active');
  });

  musicBtn?.addEventListener('click', () => {
    if (!player) return;
    if (player.isPlaying()) player.pause();
    else player.play();
  });

  window.addEventListener('keydown', (e) => {
    if (!isOpen) return;
    // Do not intercept Escape if 3D Holo Card is currently open on top of Galaxy
    const holoOpen = document.getElementById('holo-modal')?.classList.contains('is-open');
    if (holoOpen) return;
    if (e.key === 'Escape') {
      closeGalaxy();
    }
  });
}

