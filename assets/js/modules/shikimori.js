import {
  SHIKI_NICKNAME,
  SHIKI_ORIGINS,
  ANILIST_ENDPOINT,
  MY_RATES_CACHE_KEY,
  GENRE_RU,
  SHIKI_KIND_LABELS,
  KIND_AVG_MINUTES,
  sleep,
  fetchJsonWithTimeout,
  formatRelativeTime,
  stripHtml
} from './config.js';
import {
  appState,
  SNAPSHOT,
  PEAK_FICTION,
  WAIFU_LIST,
  SNAPSHOT_DNA,
  saveWatchingCache,
  saveTrophiesCache,
  saveHostFullRatesCache,
  saveGalaxyCache,
  saveHotTakesCache,
  saveDnaCache,
  saveRatedPoolCache,
  updateRandomizerPoolCounts,
  saveCoverCache,
  normalizeShikiUrl,
  setActiveShikiOrigin
} from './data.js';
import { computeTrophiesFromRates, renderTrophiesShowcase } from './trophies.js';
import {
  renderStats,
  renderHistory,
  renderActivityGraph,
  renderAnimeDna,
  renderHotTakes,
  renderWatchingShelf,
  applyCoverToDOM
} from './ui.js';

/* =========================================
   HOT TAKES ENGINE (CONTROVERSIAL RATINGS + PNG CARD)
   ========================================= */
export function computeHotTakesFromRates(allRates) {
  if (!Array.isArray(allRates) || !allRates.length) return null;

  const allowedKinds = new Set(['tv', 'movie', 'ona', 'ova']);
  const seen = new Set();
  const candidates = [];

  allRates.forEach((r) => {
    const a = r && r.anime;
    if (!a || !a.id) return;
    if (r.status !== 'completed' && r.status !== 'rewatching') return;
    const userScore = Number(r.score) || 0;
    const shikiScore = Number(a.score) || 0;
    if (userScore < 1 || userScore > 10 || shikiScore < 5.0) return;

    const kindKey = String(a.kind || 'tv').toLowerCase();
    if (!allowedKinds.has(kindKey)) return;
    if (seen.has(a.id)) return;
    seen.add(a.id);

    const rawImg = a.image?.original || a.image?.preview || '';
    const delta = Number((userScore - shikiScore).toFixed(2));

    candidates.push({
      malId: Number(a.id),
      title: a.russian || a.name,
      kind: SHIKI_KIND_LABELS[kindKey] || 'Аниме',
      year: a.aired_on ? Number(String(a.aired_on).slice(0, 4)) || null : null,
      userScore,
      shikiScore: Number(shikiScore.toFixed(2)),
      delta,
      shikiImg: rawImg ? normalizeShikiUrl(rawImg, appState.activeShikiOrigin) : '',
      url: a.url ? normalizeShikiUrl(a.url, appState.activeShikiOrigin) : `${appState.activeShikiOrigin}/animes/${a.id}`,
      comment: stripHtml(r.text || '').trim()
    });
  });

  if (!candidates.length) return null;

  // Underrated gems: rated >= 8 and clearly above Shikimori crowd score
  let gems = candidates
    .filter((c) => c.userScore >= 8 && c.delta > 0.35)
    .sort((a, b) => b.delta - a.delta || b.userScore - a.userScore || b.shikiScore - a.shikiScore)
    .slice(0, 5);

  if (gems.length < 3) {
    gems = candidates
      .filter((c) => c.delta > 0)
      .sort((a, b) => b.delta - a.delta || b.userScore - a.userScore)
      .slice(0, 5);
  }

  // Overrated hits: prioritize well-rated popular titles (Shiki >= 7.4) that user rated lower
  const pickOverrated = (minShiki) => candidates
    .filter((c) => c.shikiScore >= minShiki && c.delta < -0.5)
    .sort((a, b) => a.delta - b.delta || b.shikiScore - a.shikiScore);

  let overrated = pickOverrated(7.4).slice(0, 5);
  if (overrated.length < 5) {
    const usedIds = new Set(overrated.map((x) => x.malId));
    const extra = pickOverrated(6.8).filter((x) => !usedIds.has(x.malId));
    overrated = overrated.concat(extra).slice(0, 5);
  }
  if (overrated.length < 3) {
    const usedIds = new Set(overrated.map((x) => x.malId));
    const extra = candidates
      .filter((c) => c.delta < 0 && !usedIds.has(c.malId))
      .sort((a, b) => a.delta - b.delta);
    overrated = overrated.concat(extra).slice(0, 5);
  }

  const avgDelta = Number(
    (candidates.reduce((acc, c) => acc + c.delta, 0) / candidates.length).toFixed(2)
  );

  return {
    isLive: true,
    scannedCount: candidates.length,
    avgDelta,
    gems,
    overrated,
    updatedAt: Date.now()
  };
}

export function computeWatchedStats(allRates) {
  const seen = new Set();
  const entries = [];
  let totalEps = 0;
  let totalMins = 0;

  (Array.isArray(allRates) ? allRates : []).forEach((r) => {
    const a = r && r.anime;
    if (!a || !a.id) return;
    const id = Number(a.id);
    if (seen.has(id)) return;
    seen.add(id);

    const status = String(r.status || '').toLowerCase();
    const kind = String(a.kind || 'tv').toLowerCase();
    const curEps = Math.max(0, Number(r.episodes) || 0);
    const fullEps = Math.max(0, Number(a.episodes) || Number(a.episodes_aired) || (kind === 'movie' ? 1 : 0));
    const rewatches = Math.max(0, Number(r.rewatches) || 0);

    let watchedEps = 0;
    if (status === 'completed') {
      const baseEps = curEps > 0 ? curEps : fullEps;
      watchedEps = baseEps + rewatches * (fullEps || baseEps);
    } else if (status === 'rewatching') {
      watchedEps = fullEps + curEps + rewatches * fullEps;
    } else if (curEps > 0 || rewatches > 0) {
      // Includes watching, on_hold, dropped (and any planned entry with logged episodes)
      watchedEps = curEps + rewatches * (fullEps || curEps);
    }

    if (watchedEps <= 0 && status !== 'completed') return;

    const apiDur = Number(a.duration) || 0;
    const minPerEp = apiDur > 0 ? apiDur : (KIND_AVG_MINUTES[kind] || 24);
    const watchedMins = watchedEps * minPerEp;

    totalEps += watchedEps;
    totalMins += watchedMins;

    entries.push({
      id,
      title: a.russian || a.name || `#${id}`,
      kind,
      year: a.aired_on ? Number(String(a.aired_on).slice(0, 4)) || 0 : 0,
      status,
      score: Number(r.score) || 0,
      shikiScore: Number(a.score) || 0,
      curEps,
      fullEps,
      rewatches,
      watchedEps,
      watchedMins,
      url: a.url ? normalizeShikiUrl(a.url, appState.activeShikiOrigin) : `${appState.activeShikiOrigin}/animes/${id}`
    });
  });

  return {
    totalEps,
    totalMins,
    estDays: Math.round(totalMins / 1440),
    entries
  };
}

export async function hydrateDnaFromShikiRates(rates, userStats, allRates) {
  if (!Array.isArray(rates) || !rates.length) return;

  // Cache compact rates map for Taste Match ("Проверка на базу")
  try {
    const compactRates = rates
      .filter((r) => r.anime && r.anime.id)
      .map((r) => {
        const rawImg = r.anime.image?.original || r.anime.image?.preview || '';
        return {
          id: Number(r.anime.id),
          s: Number(r.score) || 0,
          g: Number(r.anime.score) || 0,
          t: r.anime.russian || r.anime.name || '',
          img: rawImg ? normalizeShikiUrl(rawImg, appState.activeShikiOrigin) : ''
        };
      });
    appState.myRatesIndex = new Map(compactRates.map((x) => [x.id, x]));
    localStorage.setItem(MY_RATES_CACHE_KEY, JSON.stringify({ ts: Date.now(), rates: compactRates }));
    const readyBadge = document.getElementById('base-host-ready-badge');
    if (readyBadge) readyBadge.textContent = `БАЗА ГОТОВА · ${compactRates.length} ТАЙТЛОВ`;
  } catch (e) {}

  const scoreCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 };
  let ratedCount = 0;
  let scoreSum = 0;
  let eliteCount = 0;
  let totalEpisodes = 0;
  let deltaSum = 0;
  let deltaCount = 0;

  const eraBuckets = {
    modern:  { name: '2020+ · Современность', count: 0 },
    wave:    { name: '2013–2019 · Новая волна', count: 0 },
    golden:  { name: '2005–2012 · Золотая эра', count: 0 },
    classic: { name: 'до 2005 · Классика', count: 0 }
  };
  const formatCounts = { TV: 0, 'Фильмы': 0, ONA: 0, OVA: 0, 'Спешлы': 0 };

  rates.forEach((r) => {
    const a = r.anime;
    if (!a) return;
    const uScore = Number(r.score) || 0;
    const gScore = Number(a.score) || 0;
    const eps = Number(r.episodes) || Number(a.episodes) || 0;
    totalEpisodes += eps;

    if (uScore >= 1 && uScore <= 10) {
      scoreCounts[uScore]++;
      ratedCount++;
      scoreSum += uScore;
      if (uScore >= 9) eliteCount++;
      if (gScore > 0) {
        deltaSum += (uScore - gScore);
        deltaCount++;
      }
    }

    const year = a.aired_on ? Number(String(a.aired_on).slice(0, 4)) : 0;
    if (year >= 2020) eraBuckets.modern.count++;
    else if (year >= 2013) eraBuckets.wave.count++;
    else if (year >= 2005) eraBuckets.golden.count++;
    else if (year > 1950) eraBuckets.classic.count++;

    const k = String(a.kind || 'tv').toLowerCase();
    if (k === 'tv') formatCounts.TV++;
    else if (k === 'movie') formatCounts['Фильмы']++;
    else if (k === 'ona') formatCounts.ONA++;
    else if (k === 'ova') formatCounts.OVA++;
    else formatCounts['Спешлы']++;
  });

  const totalWithEra = Math.max(1, Object.values(eraBuckets).reduce((s, b) => s + b.count, 0));
  const eras = Object.values(eraBuckets).map((b) => ({
    name: b.name,
    count: b.count,
    pct: Math.round((b.count / totalWithEra) * 100)
  }));

  const formats = Object.entries(formatCounts)
    .filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  const watchedTotals = computeWatchedStats(Array.isArray(allRates) && allRates.length ? allRates : rates);
  const totalWatchedEpisodes = watchedTotals.totalEps > 0 ? watchedTotals.totalEps : totalEpisodes;

  const prev = appState.animeDnaState || SNAPSHOT_DNA;
  const baseDna = {
    isLive: true,
    totalAnalyzed: rates.length,
    ratedCount,
    meanScore: ratedCount ? scoreSum / ratedCount : prev.meanScore,
    eliteCount,
    eliteShare: ratedCount ? (eliteCount / ratedCount) * 100 : prev.eliteShare,
    tensCount: scoreCounts[10] || 0,
    totalEpisodes: totalWatchedEpisodes,
    crowdDelta: deltaCount ? deltaSum / deltaCount : 0,
    scores: scoreCounts,
    eras,
    formats,
    genres: prev.genres || SNAPSHOT_DNA.genres,
    studios: prev.studios || SNAPSHOT_DNA.studios,
    updatedAt: Date.now()
  };

  appState.animeDnaState = baseDna;
  renderAnimeDna(appState.animeDnaState);
  saveDnaCache(appState.animeDnaState);

  // Hydrate real Top Genres & Top Studios from AniList (top 100 highest-rated completed titles)
  // Skip re-fetching AniList if cached live genres/studios are fresh (< 12h)
  const hasFreshMeta = prev && prev.isLive && prev.metaUpdatedAt && (Date.now() - prev.metaUpdatedAt < 12 * 3600 * 1000) && prev.genres?.length && prev.studios?.length;
  if (hasFreshMeta) {
    appState.animeDnaState.metaUpdatedAt = prev.metaUpdatedAt;
    saveDnaCache(appState.animeDnaState);
    return;
  }

  const rankedForMeta = [...rates]
    .filter((r) => r.anime && r.anime.id)
    .sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0) || (Number(b.anime.score) || 0) - (Number(a.anime.score) || 0))
    .slice(0, 100);

  const weightById = new Map();
  rankedForMeta.forEach((r) => {
    const s = Number(r.score) || 7;
    weightById.set(r.anime.id, s >= 9 ? 1.5 : (s >= 7 ? 1.0 : 0.6));
  });

  const idsAll = rankedForMeta.map((r) => r.anime.id);
  const chunks = [idsAll.slice(0, 50), idsAll.slice(50, 100)].filter((c) => c.length);

  const genreRawCount = {};
  const genreWeighted = {};
  const studioCount = {};

  try {
    const metaQuery = `
      query ($ids: [Int]) {
        Page(perPage: 50) {
          media(idMal_in: $ids, type: ANIME) {
            idMal
            genres
            studios(isMain: true) {
              nodes { name }
            }
          }
        }
      }
    `;

    const results = await Promise.all(
      chunks.map((ids) => anilistQuery(metaQuery, { ids }).catch(() => null))
    );

    results.forEach((data) => {
      const mediaList = data?.Page?.media || [];
      mediaList.forEach((m) => {
        const w = weightById.get(m.idMal) || 1;
        (m.genres || []).forEach((g) => {
          const ru = GENRE_RU[g] || g;
          genreRawCount[ru] = (genreRawCount[ru] || 0) + 1;
          genreWeighted[ru] = (genreWeighted[ru] || 0) + w;
        });
        const seenStudio = new Set();
        (m.studios?.nodes || []).forEach((st) => {
          if (!st || !st.name || seenStudio.has(st.name)) return;
          seenStudio.add(st.name);
          studioCount[st.name] = (studioCount[st.name] || 0) + 1;
        });
      });
    });

    const topGenres = Object.entries(genreWeighted)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    if (topGenres.length) {
      const maxG = topGenres[0][1];
      appState.animeDnaState.genres = topGenres.map(([name, wVal]) => ({
        name,
        count: genreRawCount[name] || Math.round(wVal),
        pct: Math.round((wVal / maxG) * 100)
      }));
    }

    const topStudios = Object.entries(studioCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    if (topStudios.length) {
      const maxS = topStudios[0][1];
      appState.animeDnaState.studios = topStudios.map(([name, count]) => ({
        name,
        count,
        pct: Math.round((count / maxS) * 100)
      }));
    }

    appState.animeDnaState.metaUpdatedAt = Date.now();
    saveDnaCache(appState.animeDnaState);
    renderAnimeDna(appState.animeDnaState);
  } catch (e) {
    // Graceful fallback to cached/snapshot DNA metadata
  }
}

/* =========================================
   COVER LOADING ENGINE (ANILIST BATCH + SEQUENTIAL JIKAN FALLBACK)
   ========================================= */
export async function anilistQuery(query, variables) {
  const { ok, status, data: json } = await fetchJsonWithTimeout(ANILIST_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ query, variables })
  });
  if (!ok) throw new Error('AniList HTTP ' + status);
  return json?.data || {};
}

export async function loadAnimeCoversBatch(malIds) {
  const missing = [...new Set(malIds)].filter((id) => id && !appState.coverCache['anime_' + id]);
  if (!missing.length) return;

  try {
    const query = `
      query ($ids: [Int]) {
        Page(perPage: 50) {
          media(idMal_in: $ids, type: ANIME) {
            idMal
            coverImage { extraLarge large }
          }
        }
      }
    `;
    const data = await anilistQuery(query, { ids: missing });
    const list = data?.Page?.media || [];
    list.forEach((m) => {
      const url = m?.coverImage?.extraLarge || m?.coverImage?.large;
      if (m.idMal && url) {
        appState.coverCache['anime_' + m.idMal] = url;
        applyCoverToDOM('anime_' + m.idMal, url);
      }
    });
    saveCoverCache();
  } catch (err) {
    // Graceful fallback to Shikimori cover endpoint
  }

  const stillMissing = missing.filter((id) => !appState.coverCache['anime_' + id]);
  if (stillMissing.length) {
    try {
      const { ok, data: items } = await fetchJsonWithTimeout(`${appState.activeShikiOrigin}/api/animes?ids=${stillMissing.join(',')}&limit=50`, {}, 8500);
      if (ok && Array.isArray(items)) {
        items.forEach((a) => {
          const raw = a?.image?.original || a?.image?.preview;
          if (a.id && raw) {
            const full = normalizeShikiUrl(raw, appState.activeShikiOrigin);
            appState.coverCache['anime_' + a.id] = full;
            applyCoverToDOM('anime_' + a.id, full);
          }
        });
        saveCoverCache();
      }
    } catch (e) {}
  }
}

export async function loadCharacterCoversBatch(charList) {
  const missing = charList.filter((c) => !appState.coverCache['char_' + c.key]);
  if (!missing.length) return;

  for (let offset = 0; offset < missing.length; offset += 16) {
    const chunk = missing.slice(offset, offset + 16);
    const fields = chunk.map((c, idx) => {
      const escaped = c.search.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      return `c${idx}: Page(perPage: 1) { characters(search: "${escaped}", sort: FAVOURITES_DESC) { image { large } } }`;
    }).join('\n');

    try {
      const data = await anilistQuery(`query {\n${fields}\n}`, {});
      chunk.forEach((c, idx) => {
        const url = data?.[`c${idx}`]?.characters?.[0]?.image?.large;
        if (url) {
          appState.coverCache['char_' + c.key] = url;
          applyCoverToDOM('char_' + c.key, url);
        }
      });
      saveCoverCache();
    } catch (err) {
      // Graceful fallback to Jikan sequential lookup
    }

    if (offset + 16 < missing.length) await sleep(250);
  }

  const unresolved = missing.filter((c) => !appState.coverCache['char_' + c.key]);
  for (const c of unresolved) {
    let attempts = 0;
    while (attempts < 2) {
      attempts++;
      try {
        const { ok, status, data: json } = await fetchJsonWithTimeout(`https://api.jikan.moe/v4/characters?q=${encodeURIComponent(c.search)}&limit=1&order_by=favorites&sort=desc`, {}, 8000);
        if (status === 429) {
          await sleep(1600);
          continue;
        }
        if (ok) {
          const url = json?.data?.[0]?.images?.jpg?.image_url || json?.data?.[0]?.images?.webp?.image_url;
          if (url) {
            appState.coverCache['char_' + c.key] = url;
            applyCoverToDOM('char_' + c.key, url);
            saveCoverCache();
          }
        }
        break;
      } catch (e) {
        break;
      }
    }
    await sleep(550);
  }
}

/* =========================================
   SHIKIMORI LIVE API SYNC
   ========================================= */

export function parseShikiActivity(rawActivity) {
  if (!Array.isArray(rawActivity) || !rawActivity.length) return null;
  const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июнь', 'Июль', 'Авг', 'Сен', 'Окт', 'Нояб', 'Дек'];
  const slice = rawActivity.slice(-18);
  return slice.map((entry) => {
    const val = Number(entry.value) || 0;
    let label = '';
    let full = '';
    if (Array.isArray(entry.name) && entry.name.length) {
      const d = new Date(entry.name[0] * 1000);
      if (!isNaN(d.getTime())) {
        const m = months[d.getMonth()];
        label = d.getMonth() === 0 ? String(d.getFullYear()) : m;
        full = `${m} ${d.getFullYear()}`;
      }
    } else if (typeof entry.name === 'string') {
      label = entry.name.slice(0, 6);
      full = entry.name;
    }
    return { label: label || '·', full: full || label || 'Период', value: val };
  });
}

let hostUserCache = null;
let hostRatesPromise = null;

export async function fetchShikiWithRetry(url, opts) {
  const retries = opts && typeof opts.retries === 'number' ? opts.retries : 3;
  const baseDelay = opts && typeof opts.baseDelay === 'number' ? opts.baseDelay : 750;
  let lastStatus = 0;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { res, ok, status, data } = await fetchJsonWithTimeout(url, { headers: { 'Accept': 'application/json' } }, 9500);
      lastStatus = status;
      if (ok) {
        return { ok: true, status, data };
      }
      if ((status === 429 || status >= 500) && attempt < retries) {
        const retryAfter = Number(res.headers.get('Retry-After'));
        const waitMs = (isFinite(retryAfter) && retryAfter > 0)
          ? Math.min(6000, Math.max(450, retryAfter * 1000))
          : baseDelay * (attempt + 1) + Math.floor(Math.random() * 250);
        await sleep(waitMs);
        continue;
      }
      return { ok: false, status, data: null };
    } catch (e) {
      if (attempt < retries) {
        await sleep(baseDelay * (attempt + 1));
        continue;
      }
      return { ok: false, status: lastStatus, data: null };
    }
  }
  return { ok: false, status: lastStatus, data: null };
}

export async function resolveHostUser() {
  if (hostUserCache && hostUserCache.id) return hostUserCache;
  const origins = [appState.activeShikiOrigin, ...SHIKI_ORIGINS.filter((o) => o !== appState.activeShikiOrigin)];
  for (const origin of origins) {
    const res = await fetchShikiWithRetry(
      `${origin}/api/users/${encodeURIComponent(SHIKI_NICKNAME)}?is_nickname=1`,
      { retries: 2, baseDelay: 700 }
    );
    if (res.ok && res.data && res.data.id) {
      setActiveShikiOrigin(origin);
      hostUserCache = res.data;
      return hostUserCache;
    }
  }
  return null;
}

export function processHostAnimeRates(allRates, userStats) {
  if (!Array.isArray(allRates) || !allRates.length) return false;

  // 1. Live "Watching Now" shelf (watching + rewatching)
  const watchingRaw = allRates.filter(
    (r) => r && r.anime && r.anime.id && (r.status === 'watching' || r.status === 'rewatching')
  );
  if (watchingRaw.length) {
    watchingRaw.sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());
    const seenW = new Set();
    const parsedWatching = [];
    watchingRaw.forEach((r) => {
      const a = r.anime;
      if (!a || !a.id || seenW.has(a.id)) return;
      seenW.add(a.id);
      const kindKey = String(a.kind || 'tv').toLowerCase();
      const rawImg = a.image?.original || a.image?.preview || '';
      const totalEp = Number(a.episodes) || Number(a.episodes_aired) || 0;
      parsedWatching.push({
        malId: a.id,
        title: a.russian || a.name,
        kind: SHIKI_KIND_LABELS[kindKey] || 'Аниме',
        year: a.aired_on ? Number(String(a.aired_on).slice(0, 4)) || null : null,
        episodes: Number(r.episodes) || 0,
        totalEpisodes: totalEp,
        ongoing: a.status === 'ongoing',
        score: Number(a.score) || 0,
        userScore: Number(r.score) || 0,
        status: r.status || 'watching',
        url: a.url ? normalizeShikiUrl(a.url, appState.activeShikiOrigin) : `${appState.activeShikiOrigin}/animes/${a.id}`,
        shikiImg: rawImg ? normalizeShikiUrl(rawImg, appState.activeShikiOrigin) : '',
        comment: stripHtml(r.text || '').trim()
      });
    });

    if (parsedWatching.length) {
      appState.watchingList = parsedWatching;
      saveWatchingCache();
      renderWatchingShelf(appState.watchingList);
      loadAnimeCoversBatch(parsedWatching.map((x) => x.malId));
    }
  }

  // 2. Completed list -> Anime-DNA & Taste Match base
  const completedRates = allRates.filter(
    (r) => r && r.anime && r.anime.id && r.status === 'completed'
  );
  if (completedRates.length) {
    hydrateDnaFromShikiRates(completedRates, userStats, allRates);
  }

  // Also index any non-completed rated entries into appState.myRatesIndex for Taste Match
  allRates.forEach((r) => {
    const a = r && r.anime;
    if (!a || !a.id) return;
    const id = Number(a.id);
    if (!appState.myRatesIndex.has(id) && Number(r.score) > 0) {
      const rawImg = a.image?.original || a.image?.preview || '';
      appState.myRatesIndex.set(id, {
        id,
        s: Number(r.score) || 0,
        g: Number(a.score) || 0,
        t: a.russian || a.name || '',
        img: rawImg ? normalizeShikiUrl(rawImg, appState.activeShikiOrigin) : ''
      });
    }
  });

  // 3. Expanded Randomizer pool (all 9-10★ completed/rewatching titles)
  const allowedKinds = new Set(['tv', 'movie', 'ona', 'ova']);
  const peakById = new Map(PEAK_FICTION.map((p) => [p.malId, p]));
  const seenPoolIds = new Set();
  const extracted = [];

  allRates.forEach((r) => {
    const a = r && r.anime;
    if (!a || !a.id) return;
    if (r.status !== 'completed' && r.status !== 'rewatching') return;
    const userScore = Number(r.score) || 0;
    if (userScore < 9) return;

    if (peakById.has(a.id)) {
      peakById.get(a.id).userScore = userScore;
      return;
    }

    if (seenPoolIds.has(a.id)) return;
    const kindKey = String(a.kind || 'tv').toLowerCase();
    if (!allowedKinds.has(kindKey)) return;
    seenPoolIds.add(a.id);

    const rawImg = a.image?.original || a.image?.preview || '';
    const shikiImg = rawImg ? normalizeShikiUrl(rawImg, appState.activeShikiOrigin) : '';
    const year = a.aired_on ? Number(String(a.aired_on).slice(0, 4)) || null : null;
    const shikiScore = Number(a.score) || 0;
    const comment = stripHtml(r.text || '').trim();
    const vibes = [
      userScore === 10 ? '#10/10' : '#9/10',
      kindKey === 'movie' ? '#фильм' : (kindKey === 'ona' ? '#ona' : '#просмотрено'),
      shikiScore >= 8.5 ? '#хит' : '#личный выбор'
    ];

    extracted.push({
      malId: a.id,
      title: a.russian || a.name,
      kind: SHIKI_KIND_LABELS[kindKey] || 'Аниме',
      year,
      score: shikiScore,
      userScore,
      shikiImg,
      url: a.url ? normalizeShikiUrl(a.url, appState.activeShikiOrigin) : `${appState.activeShikiOrigin}/animes/${a.id}`,
      vibes,
      note: comment || (
        userScore === 10
          ? 'Тайтл из моего списка просмотренного с высшей оценкой 10/10 на Shikimori — смело рекомендую.'
          : 'Сильный тайтл из моего списка просмотренного на Shikimori с личной оценкой 9/10.'
      ),
      source: 'shikimori'
    });
  });

  if (extracted.length) {
    appState.ratedAnimePool = extracted;
    saveRatedPoolCache();
    updateRandomizerPoolCounts();
  }

  // 4. Live Hot Takes (Underrated Gems & Overrated Hits vs Shikimori crowd)
  const computedTakes = computeHotTakesFromRates(allRates);
  if (computedTakes) {
    appState.hotTakesState = computedTakes;
    saveHotTakesCache(appState.hotTakesState);
    renderHotTakes(appState.hotTakesState, false);
  }

  // 5. Full 3D Archive Galaxy Dataset (415+ completed + watching + rewatching + planned)
  const galaxySeen = new Set();
  const peakMap = new Map(PEAK_FICTION.map((p) => [p.malId, p]));
  const builtGalaxy = [];

  allRates.forEach((r) => {
    const a = r && r.anime;
    if (!a || !a.id) return;
    if (r.status !== 'completed' && r.status !== 'watching' && r.status !== 'rewatching' && r.status !== 'planned') return;
    const id = Number(a.id);
    if (galaxySeen.has(id)) return;
    galaxySeen.add(id);

    const isPlanned = r.status === 'planned';
    const peak = isPlanned ? null : peakMap.get(id);
    const kindKey = String(a.kind || 'tv').toLowerCase();
    const rawImg = a.image?.original || a.image?.preview || '';
    const year = a.aired_on ? Number(String(a.aired_on).slice(0, 4)) || null : (peak ? peak.year : null);
    const uScore = isPlanned ? 0 : (Number(r.score) || 0);
    const sScore = Number(a.score) || (peak ? peak.score : 0);
    const epsCount = isPlanned
      ? (Number(a.episodes) || Number(a.episodes_aired) || 0)
      : (Number(r.episodes) || Number(a.episodes) || 0);

    builtGalaxy.push({
      id,
      title: (peak && peak.title) || a.russian || a.name,
      kind: SHIKI_KIND_LABELS[kindKey] || (peak ? peak.kind : 'Аниме'),
      year,
      score: uScore,
      shikiScore: Number(sScore.toFixed(2)),
      episodes: epsCount,
      status: r.status || 'completed',
      isPeak: Boolean(peak),
      peakRank: peak ? peak.rank : null,
      img: rawImg ? normalizeShikiUrl(rawImg, appState.activeShikiOrigin) : '',
      url: a.url ? normalizeShikiUrl(a.url, appState.activeShikiOrigin) : `${appState.activeShikiOrigin}/animes/${id}`,
      comment: stripHtml(r.text || '').trim() || (peak ? peak.note : ''),
      vibes: peak ? peak.vibes : []
    });
  });

  // Ensure all Peak 16 stars exist even if status differed
  PEAK_FICTION.forEach((p) => {
    if (galaxySeen.has(p.malId)) return;
    builtGalaxy.push({
      id: p.malId,
      title: p.title,
      kind: p.kind,
      year: p.year,
      score: p.userScore || 10,
      shikiScore: p.score,
      episodes: 0,
      status: 'completed',
      isPeak: true,
      peakRank: p.rank,
      img: appState.coverCache['anime_' + p.malId] || '',
      url: `${appState.activeShikiOrigin}/animes/${p.malId}`,
      comment: p.note,
      vibes: p.vibes
    });
  });

  if (builtGalaxy.length) {
    appState.galaxyNodes = builtGalaxy;
    saveGalaxyCache(appState.galaxyNodes);
    if (typeof appState.galaxyRefreshHook === 'function') appState.galaxyRefreshHook();
  }

  // 6. Full host rates (including all 'planned' / 'on_hold' / 'dropped') for Co-op Evening Picker
  try {
    const compactAll = [];
    const seenAll = new Set();
    allRates.forEach((r) => {
      const a = r && r.anime;
      if (!a || !a.id) return;
      const id = Number(a.id);
      if (seenAll.has(id)) return;
      seenAll.add(id);
      const rawImg = a.image?.original || a.image?.preview || '';
      compactAll.push({
        id,
        st: r.status || 'completed',
        s: Number(r.score) || 0,
        g: Number(a.score) || 0,
        t: a.russian || a.name || `#${id}`,
        k: String(a.kind || 'tv').toLowerCase(),
        y: a.aired_on ? Number(String(a.aired_on).slice(0, 4)) || null : null,
        ep: Number(a.episodes) || Number(a.episodes_aired) || 0,
        img: rawImg ? normalizeShikiUrl(rawImg, appState.activeShikiOrigin) : '',
        url: a.url ? normalizeShikiUrl(a.url, appState.activeShikiOrigin) : `${appState.activeShikiOrigin}/animes/${id}`
      });
    });
    if (compactAll.length) {
      appState.hostFullRates = compactAll;
      saveHostFullRatesCache(appState.hostFullRates);
    }
  } catch (e) {}

  // 7. Live Archive Trophies auto-computation from full Shikimori list
  try {
    const computedTrophies = computeTrophiesFromRates(allRates, userStats);
    if (computedTrophies && computedTrophies.items.length) {
      appState.trophiesState = computedTrophies;
      saveTrophiesCache(appState.trophiesState);
      renderTrophiesShowcase();
    }
  } catch (e) {}
  return true;
}

export async function loadHostAnimeRates(userObj) {
  if (hostRatesPromise) return hostRatesPromise;
  hostRatesPromise = (async () => {
    let ok = false;
    try {
      const u = userObj || await resolveHostUser();
      if (!u || !u.id) return false;
      const first = await fetchShikiWithRetry(
        `${appState.activeShikiOrigin}/api/users/${u.id}/anime_rates?limit=1000`,
        { retries: 3, baseDelay: 800 }
      );
      if (!first.ok || !Array.isArray(first.data)) return false;

      let allRates = first.data;
      if (allRates.length >= 1000) {
        await sleep(320);
        const page2 = await fetchShikiWithRetry(
          `${appState.activeShikiOrigin}/api/users/${u.id}/anime_rates?limit=1000&page=2`,
          { retries: 2, baseDelay: 800 }
        );
        if (page2.ok && Array.isArray(page2.data) && page2.data.length) {
          allRates = allRates.concat(page2.data);
        }
      }
      ok = processHostAnimeRates(allRates, u.stats);
      return ok;
    } catch (e) {
      return false;
    } finally {
      if (!ok || !appState.ratedAnimePool.length) {
        hostRatesPromise = null;
      }
    }
  })();
  return hostRatesPromise;
}

export async function syncShikimoriLive() {
  const pill = document.getElementById('api-status-pill');
  const pillText = document.getElementById('api-status-text');

  const user = await resolveHostUser();
  if (!user || !user.id) {
    if (pillText) pillText.textContent = 'SNAPSHOT';
    if (!appState.hotTakesState) renderHotTakes(null, true);
    return;
  }

  if (pill) pill.classList.add('is-live');
  if (pillText) pillText.textContent = 'API · LIVE';

  const avatarEl = document.getElementById('profile-avatar');
  const liveAvatar = user.image?.x160 || user.image?.x148 || user.avatar;
  if (avatarEl && liveAvatar) {
    avatarEl.src = normalizeShikiUrl(liveAvatar, appState.activeShikiOrigin);
  }
  const shikiLink = document.getElementById('shiki-profile-link');
  if (shikiLink && user.url) {
    shikiLink.href = normalizeShikiUrl(user.url, appState.activeShikiOrigin);
  }

  const animeStatuses = user.stats?.full_statuses?.anime || user.stats?.statuses?.anime || [];
  const mangaStatuses = user.stats?.full_statuses?.manga || user.stats?.statuses?.manga || [];

  const mapStatus = (arr) => {
    const out = {};
    arr.forEach((s) => { out[s.name] = Number(s.size) || 0; });
    return out;
  };

  const aMap = mapStatus(animeStatuses);
  const mMap = mapStatus(mangaStatuses);
  if (Object.keys(aMap).length) {
    const mangaReading = (mMap.watching || 0) + (mMap.reading || 0) + (mMap.rewatching || 0);
    renderStats(
      {
        planned: aMap.planned ?? SNAPSHOT.anime.planned,
        watching: (aMap.watching || 0) + (aMap.rewatching || 0),
        completed: aMap.completed ?? SNAPSHOT.anime.completed,
        on_hold: aMap.on_hold ?? SNAPSHOT.anime.on_hold,
        dropped: aMap.dropped ?? SNAPSHOT.anime.dropped
      },
      {
        reading: mangaReading || SNAPSHOT.manga.reading,
        completed: mMap.completed ?? SNAPSHOT.manga.completed
      },
      SNAPSHOT.lifetimeText
    );
  }

  const liveGraph = parseShikiActivity(user.stats?.activity);
  if (liveGraph && liveGraph.length >= 4) {
    renderActivityGraph(liveGraph);
  }

  // Priority 1: ONE merged anime_rates request (Watching + DNA + Taste Match + 9-10★ Randomizer + Hot Takes)
  await sleep(160);
  const ratesLoaded = await loadHostAnimeRates(user);
  if (!ratesLoaded && !appState.hotTakesState) {
    renderHotTakes(null, true);
  }

  // Priority 2: History (limit=30 so after deduplicating same anime we get 5 unique titles)
  await sleep(240);
  try {
    const hRes = await fetchShikiWithRetry(
      `${appState.activeShikiOrigin}/api/users/${user.id}/history?limit=30`,
      { retries: 2, baseDelay: 700 }
    );
    if (hRes.ok && Array.isArray(hRes.data)) {
      const seenTargets = new Set();
      const parsedHistory = [];
      for (const h of hRes.data) {
        const t = h && h.target;
        if (!t || (!t.russian && !t.name)) continue;
        const targetKey = t.id
          ? 'id_' + String(t.id)
          : 't_' + String(t.russian || t.name).trim().toLowerCase();
        if (seenTargets.has(targetKey)) continue;
        seenTargets.add(targetKey);
        const rawImg = t.image?.original || t.image?.preview || t.image?.x96 || '';
        parsedHistory.push({
          id: t.id,
          title: t.russian || t.name,
          action: stripHtml(h.description) || 'Обновление списка',
          dateText: formatRelativeTime(h.created_at),
          url: normalizeShikiUrl(t.url, appState.activeShikiOrigin),
          image: rawImg ? normalizeShikiUrl(rawImg, appState.activeShikiOrigin) : ''
        });
        if (parsedHistory.length >= 5) break;
      }

      if (parsedHistory.length) {
        renderHistory(parsedHistory, true);
        loadAnimeCoversBatch(parsedHistory.map((h) => h.id));
      }
    }
  } catch (e) {}

  // Priority 3: Favourites (WAIFU links & fallback images)
  await sleep(240);
  try {
    const fRes = await fetchShikiWithRetry(
      `${appState.activeShikiOrigin}/api/users/${user.id}/favourites`,
      { retries: 2, baseDelay: 700 }
    );
    if (fRes.ok && fRes.data) {
      const favs = fRes.data;
      if (Array.isArray(favs.characters) && favs.characters.length) {
        favs.characters.forEach((fc) => {
          const ru = (fc.russian || '').toLowerCase();
          const en = (fc.name || '').toLowerCase();
          const match = WAIFU_LIST.find((w) =>
            w.name.toLowerCase() === ru ||
            w.search.toLowerCase() === en ||
            en.includes(w.search.toLowerCase())
          );
          if (match) {
            if (fc.url) match.url = normalizeShikiUrl(fc.url, appState.activeShikiOrigin);
            if (fc.image && !appState.coverCache['char_' + match.key]) {
              const shikiCharImg = normalizeShikiUrl(fc.image, appState.activeShikiOrigin);
              match.shikiImg = shikiCharImg;
              applyCoverToDOM('char_' + match.key, shikiCharImg);
            }
          }
        });
      }
    }
  } catch (e) {}
}
