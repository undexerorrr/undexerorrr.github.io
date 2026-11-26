import { SFX_STORAGE_KEY } from './config.js';
import { appState } from './data.js';

/* =========================================
   ARCHIVE PACK STUDIO SFX (WEB AUDIO API)
   Zero external files · Procedural foil & sub-impact synthesis
   ========================================= */

const TENSION_DEBOUNCE_MS = 52;
const EVENT_DEBOUNCE_MS = 80;

let masterGain = null;
let limiterNode = null;
let noiseBuffer = null;
let wiredCtx = null;
let userInteracted = false;
let initialized = false;

const lastPlayedAt = Object.create(null);

function nowMs() {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

function createNoiseBuffer(ctx) {
  const length = Math.max(1, Math.floor(ctx.sampleRate * 0.5));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    // Slight dark tint to keep transients matte rather than harsh/hissy
    last = last * 0.22 + white * 0.78;
    data[i] = last;
  }
  return buffer;
}

function ensureMasterBus(ctx) {
  if (!ctx) return null;
  if (wiredCtx === ctx && masterGain && limiterNode) {
    return masterGain;
  }
  try {
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.82, ctx.currentTime);

    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.setValueAtTime(-14, ctx.currentTime);
    limiter.knee.setValueAtTime(6, ctx.currentTime);
    limiter.ratio.setValueAtTime(12, ctx.currentTime);
    limiter.attack.setValueAtTime(0.002, ctx.currentTime);
    limiter.release.setValueAtTime(0.06, ctx.currentTime);

    gain.connect(limiter);
    limiter.connect(ctx.destination);

    masterGain = gain;
    limiterNode = limiter;
    noiseBuffer = createNoiseBuffer(ctx);
    wiredCtx = ctx;
    return masterGain;
  } catch (e) {
    return null;
  }
}

export function getSharedAudioContext() {
  if (appState.sharedAudioContext) {
    return appState.sharedAudioContext;
  }
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    const ctx = new AudioCtx();
    appState.sharedAudioContext = ctx;
    return ctx;
  } catch (e) {
    return null;
  }
}

function prepareEngine(key, minGapMs) {
  if (!appState.sfxEnabled || !userInteracted) return null;

  const ts = nowMs();
  const prev = lastPlayedAt[key] || 0;
  if (ts - prev < minGapMs) return null;

  const ctx = getSharedAudioContext();
  if (!ctx) return null;

  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  const bus = ensureMasterBus(ctx);
  if (!bus) return null;

  lastPlayedAt[key] = ts;
  return { ctx, bus, t: ctx.currentTime };
}

function playNoiseBurst(ctx, bus, startTime, cfg) {
  if (!noiseBuffer) return;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const maxOffset = Math.max(0, noiseBuffer.duration - (cfg.duration || 0.05) - 0.01);
  const offset = maxOffset > 0 ? Math.random() * maxOffset : 0;

  const filter = ctx.createBiquadFilter();
  filter.type = cfg.filterType || 'bandpass';
  filter.frequency.setValueAtTime(cfg.freqStart || 1600, startTime);
  if (cfg.freqMid) {
    filter.frequency.exponentialRampToValueAtTime(
      Math.max(40, cfg.freqMid),
      startTime + (cfg.midAt || (cfg.duration || 0.05) * 0.45)
    );
  }
  if (cfg.freqEnd) {
    filter.frequency.exponentialRampToValueAtTime(
      Math.max(40, cfg.freqEnd),
      startTime + (cfg.duration || 0.05)
    );
  }
  filter.Q.setValueAtTime(cfg.q || 1.4, startTime);

  const env = ctx.createGain();
  const atk = Math.max(0.001, cfg.attack || 0.002);
  const dur = Math.max(atk + 0.004, cfg.duration || 0.04);
  const peak = Math.max(0.0002, cfg.gain || 0.05);

  env.gain.setValueAtTime(0.0001, startTime);
  env.gain.linearRampToValueAtTime(peak, startTime + atk);
  env.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);

  src.connect(filter);
  filter.connect(env);
  env.connect(bus);

  src.start(startTime, offset, dur + 0.015);
  src.stop(startTime + dur + 0.02);
}

function playTone(ctx, bus, startTime, cfg) {
  const osc = ctx.createOscillator();
  osc.type = cfg.type || 'sine';
  osc.frequency.setValueAtTime(cfg.freqStart || 180, startTime);
  if (cfg.freqEnd) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(24, cfg.freqEnd),
      startTime + (cfg.pitchDur || cfg.duration || 0.05)
    );
  }

  let tailNode = osc;
  if (cfg.lowpass) {
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(cfg.lowpass, startTime);
    if (cfg.lowpassEnd) {
      lp.frequency.exponentialRampToValueAtTime(
        Math.max(40, cfg.lowpassEnd),
        startTime + (cfg.duration || 0.08)
      );
    }
    lp.Q.setValueAtTime(cfg.q || 0.7, startTime);
    osc.connect(lp);
    tailNode = lp;
  }

  const env = ctx.createGain();
  const atk = Math.max(0.001, cfg.attack || 0.002);
  const dur = Math.max(atk + 0.005, cfg.duration || 0.06);
  const peak = Math.max(0.0002, cfg.gain || 0.06);

  env.gain.setValueAtTime(0.0001, startTime);
  env.gain.linearRampToValueAtTime(peak, startTime + atk);
  env.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);

  tailNode.connect(env);
  env.connect(bus);

  osc.start(startTime);
  osc.stop(startTime + dur + 0.02);
}

/* =========================================
   ARCHIVE PACK PROCEDURAL SFX
   ========================================= */

export function playPackTension(progress) {
  const eng = prepareEngine('packTension', TENSION_DEBOUNCE_MS);
  if (!eng) return;
  const { ctx, bus, t } = eng;
  const p = Math.max(0, Math.min(1, Number(progress) || 0));

  // Crisp foil micro-crinkle scaling with pull tension
  playNoiseBurst(ctx, bus, t, {
    filterType: 'bandpass',
    freqStart: 2200 + p * 1650,
    freqEnd: 1500 + p * 900,
    q: 3.1,
    attack: 0.002,
    duration: 0.036,
    gain: 0.024 + p * 0.028
  });

  playTone(ctx, bus, t, {
    type: 'triangle',
    freqStart: 860 + p * 420,
    freqEnd: 620 + p * 260,
    lowpass: 1900,
    attack: 0.002,
    duration: 0.024,
    gain: 0.012 + p * 0.012
  });
}

export function playPackTear() {
  const eng = prepareEngine('packTear', EVENT_DEBOUNCE_MS);
  if (!eng) return;
  const { ctx, bus, t } = eng;

  // Metallic foil rip + shear snap
  playNoiseBurst(ctx, bus, t, {
    filterType: 'bandpass',
    freqStart: 1450,
    freqMid: 4100,
    midAt: 0.05,
    freqEnd: 1750,
    q: 1.7,
    attack: 0.004,
    duration: 0.13,
    gain: 0.068
  });

  playNoiseBurst(ctx, bus, t + 0.016, {
    filterType: 'highpass',
    freqStart: 2700,
    q: 1.1,
    attack: 0.001,
    duration: 0.022,
    gain: 0.05
  });

  playTone(ctx, bus, t, {
    type: 'sine',
    freqStart: 152,
    freqEnd: 64,
    lowpass: 320,
    attack: 0.002,
    duration: 0.052,
    gain: 0.058
  });
}

export function playPackReveal(rarityKey) {
  const eng = prepareEngine('packReveal', EVENT_DEBOUNCE_MS);
  if (!eng) return;
  const { ctx, bus, t } = eng;

  const key = String(rarityKey || 'sr').toLowerCase();
  const isMythic = key === 'mythic';
  const isSsr = key === 'ssr';

  // Dull cold sub-impact scaled by rarity
  const subStart = isMythic ? 82 : (isSsr ? 88 : 94);
  const subEnd = isMythic ? 32 : (isSsr ? 38 : 44);
  const subDur = isMythic ? 0.42 : (isSsr ? 0.28 : 0.19);
  const subGain = isMythic ? 0.155 : (isSsr ? 0.13 : 0.105);

  playTone(ctx, bus, t, {
    type: 'sine',
    freqStart: subStart,
    freqEnd: subEnd,
    lowpass: 210,
    attack: 0.003,
    duration: subDur,
    gain: subGain
  });

  // Short matte punch transient
  playNoiseBurst(ctx, bus, t, {
    filterType: 'lowpass',
    freqStart: isMythic ? 760 : 540,
    freqEnd: 160,
    q: 0.9,
    attack: 0.002,
    duration: isMythic ? 0.075 : 0.048,
    gain: isMythic ? 0.058 : 0.042
  });

  // Thin cold metallic overtone chord (restrained, monochrome, non-arcade)
  const overtones = isMythic
    ? [
        { freq: 392.0, gain: 0.026, dur: 0.56, delay: 0.006 },
        { freq: 587.33, gain: 0.022, dur: 0.52, delay: 0.016 },
        { freq: 783.99, gain: 0.017, dur: 0.46, delay: 0.028 },
        { freq: 1174.66, gain: 0.01, dur: 0.36, delay: 0.042 }
      ]
    : isSsr
      ? [
          { freq: 440.0, gain: 0.022, dur: 0.36, delay: 0.008 },
          { freq: 659.25, gain: 0.017, dur: 0.32, delay: 0.02 }
        ]
      : [
          { freq: 392.0, gain: 0.017, dur: 0.22, delay: 0.008 },
          { freq: 587.33, gain: 0.012, dur: 0.18, delay: 0.018 }
        ];

  overtones.forEach((ov) => {
    playTone(ctx, bus, t + ov.delay, {
      type: 'sine',
      freqStart: ov.freq,
      lowpass: isMythic ? 2400 : 1650,
      lowpassEnd: 680,
      attack: 0.006,
      duration: ov.dur,
      gain: ov.gain
    });
  });
}

/* =========================================
   STATE & GESTURE UNLOCK
   ========================================= */

export function isSfxEnabled() {
  return Boolean(appState.sfxEnabled);
}

export function setSfxEnabled(enabled, opts) {
  const next = Boolean(enabled);
  const persist = !opts || opts.persist !== false;
  appState.sfxEnabled = next;

  if (persist) {
    try {
      localStorage.setItem(SFX_STORAGE_KEY, next ? '1' : '0');
    } catch (e) {}
  }

  document.dispatchEvent(new CustomEvent('archive:sfxchange', { detail: { enabled: next } }));
  return next;
}

export function toggleSfx() {
  userInteracted = true;
  return setSfxEnabled(!appState.sfxEnabled, { persist: true });
}

export function initSfx() {
  if (initialized) return;
  initialized = true;

  const markInteracted = () => {
    userInteracted = true;
  };

  window.addEventListener('pointerdown', markInteracted, { capture: true, passive: true });
  window.addEventListener('keydown', markInteracted, { capture: true, passive: true });
  window.addEventListener('click', markInteracted, { capture: true, passive: true });
}
