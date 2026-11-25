#!/usr/bin/env node
/**
 * Daily Shikimori + AniList snapshot generator for undexeror // archive.
 * Pure Node.js 20+ (0 external dependencies).
 *
 * Output: assets/data/snapshot.json
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_PATH = path.join(ROOT_DIR, 'assets', 'data', 'snapshot.json');

const SHIKI_USER_ID = 1308586;
const SHIKI_NICKNAME = 'undereror nyashka';
const SHIKI_ORIGINS = ['https://shikimori.one', 'https://shikimori.io'];
const ANILIST_ENDPOINT = 'https://graphql.anilist.co';
const USER_AGENT = 'undexeror-archive-snapshot/1.0 (+https://undexerorrr.github.io/)';
const SNAPSHOT_VERSION = 1;
const MIN_RATES_REQUIRED = 50;

const PEAK_FICTION_IDS = [
  21, 9253, 16498, 26055, 42310, 5114, 57555, 1575,
  40748, 2001, 11061, 22535, 14813, 269, 34599, 33
];

const SHIKI_KIND_LABELS = {
  tv: 'TV Сериал',
  movie: 'Фильм',
  ova: 'OVA',
  ona: 'ONA',
  special: 'Спешл',
  tv_special: 'TV Спешл'
};

const GENRE_RU = {
  Action: 'Экшен',
  Adventure: 'Приключения',
  Comedy: 'Комедия',
  Drama: 'Драма',
  Ecchi: 'Этти',
  Fantasy: 'Фэнтези',
  Horror: 'Хоррор',
  'Mahou Shoujo': 'Махо-сёдзё',
  Mecha: 'Меха',
  Music: 'Музыка',
  Mystery: 'Мистика / Детектив',
  Psychological: 'Психология',
  Romance: 'Романтика',
  'Sci-Fi': 'Сай-фай',
  'Slice of Life': 'Повседневность',
  Sports: 'Спорт',
  Supernatural: 'Сверхъестественное',
  Thriller: 'Триллер'
};

const MONTHS_RU = [
  'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июнь',
  'Июль', 'Авг', 'Сен', 'Окт', 'Нояб', 'Дек'
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function decodeHtmlEntities(text) {
  return String(text || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : '';
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = parseInt(dec, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : '';
    });
}

function stripHtml(html) {
  if (!html) return '';
  const withoutTags = String(html).replace(/<[^>]*>/g, ' ');
  return decodeHtmlEntities(withoutTags).replace(/\s+/g, ' ').trim();
}

function compactShikiPath(rawUrl) {
  if (!rawUrl) return '';
  const str = String(rawUrl).trim();
  for (const origin of SHIKI_ORIGINS) {
    if (str.toLowerCase().startsWith(origin.toLowerCase())) {
      return str.slice(origin.length) || '/';
    }
  }
  return str.replace(/^https?:\/\/(www\.)?shikimori\.(one|io|me|org)/i, '') || str;
}

async function fetchJsonWithRetry(url, fetchOptions = {}, retryOptions = {}) {
  const retries = retryOptions.retries ?? 4;
  const baseDelayMs = retryOptions.baseDelayMs ?? 900;
  const timeoutMs = retryOptions.timeoutMs ?? 15000;
  let lastStatus = 0;
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        ...fetchOptions,
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'application/json',
          ...(fetchOptions.headers || {})
        },
        signal: controller.signal
      });
      clearTimeout(timer);
      lastStatus = res.status;

      if (res.ok) {
        const data = await res.json();
        return { ok: true, status: res.status, data };
      }

      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        const retryAfterRaw = res.headers.get('retry-after');
        const retryAfterSec = retryAfterRaw ? Number(retryAfterRaw) : NaN;
        const waitMs = Number.isFinite(retryAfterSec) && retryAfterSec > 0
          ? Math.min(15000, Math.max(1000, retryAfterSec * 1000))
          : Math.min(12000, baseDelayMs * (attempt + 1) * 1.5 + Math.floor(Math.random() * 400));
        console.log(`[retry] HTTP ${res.status} for ${url} — waiting ${Math.round(waitMs)}ms (attempt ${attempt + 1}/${retries})`);
        await sleep(waitMs);
        continue;
      }

      return { ok: false, status: res.status, data: null };
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
      if (attempt < retries) {
        const waitMs = Math.min(10000, baseDelayMs * (attempt + 1) + Math.floor(Math.random() * 350));
        console.log(`[retry] Network error for ${url} (${err?.message || err}) — waiting ${Math.round(waitMs)}ms (attempt ${attempt + 1}/${retries})`);
        await sleep(waitMs);
        continue;
      }
      return { ok: false, status: lastStatus, data: null, error: lastError };
    }
  }

  return { ok: false, status: lastStatus, data: null, error: lastError };
}

async function fetchShikiEndpoint(pathWithQuery, preferredOrigin) {
  const orderedOrigins = preferredOrigin
    ? [preferredOrigin, ...SHIKI_ORIGINS.filter((o) => o !== preferredOrigin)]
    : [...SHIKI_ORIGINS];

  let lastResult = { ok: false, status: 0, data: null, origin: orderedOrigins[0] };
  for (const origin of orderedOrigins) {
    const res = await fetchJsonWithRetry(`${origin}${pathWithQuery}`, {}, {
      retries: 3,
      baseDelayMs: 950,
      timeoutMs: 16000
    });
    if (res.ok) {
      return { ...res, origin };
    }
    lastResult = { ...res, origin };
    await sleep(450);
  }
  return lastResult;
}

function parseShikiActivity(rawActivity) {
  if (!Array.isArray(rawActivity) || !rawActivity.length) return [];
  const slice = rawActivity.slice(-18);
  return slice.map((entry) => {
    const val = Number(entry?.value) || 0;
    let label = '';
    let full = '';
    if (Array.isArray(entry?.name) && entry.name.length) {
      const d = new Date(entry.name[0] * 1000);
      if (!Number.isNaN(d.getTime())) {
        const m = MONTHS_RU[d.getUTCMonth()];
        label = d.getUTCMonth() === 0 ? String(d.getUTCFullYear()) : m;
        full = `${m} ${d.getUTCFullYear()}`;
      }
    } else if (typeof entry?.name === 'string') {
      label = entry.name.slice(0, 6);
      full = entry.name;
    }
    return { label: label || '·', full: full || label || 'Период', value: val };
  });
}

function mapStatuses(list) {
  const out = {};
  (Array.isArray(list) ? list : []).forEach((s) => {
    if (s && s.name) out[s.name] = Number(s.size) || 0;
  });
  return out;
}

function selectHotTakeIds(rates) {
  const allowedKinds = new Set(['tv', 'movie', 'ona', 'ova']);
  const candidates = [];

  for (const r of rates) {
    if (r.status !== 'completed' && r.status !== 'rewatching') continue;
    if (r.score < 1 || r.score > 10 || r.shikiScore < 5.0) continue;
    if (!allowedKinds.has(r.kind)) continue;
    candidates.push({
      id: r.id,
      userScore: r.score,
      shikiScore: r.shikiScore,
      delta: Number((r.score - r.shikiScore).toFixed(2))
    });
  }

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

  const pickOverrated = (minShiki) => candidates
    .filter((c) => c.shikiScore >= minShiki && c.delta < -0.5)
    .sort((a, b) => a.delta - b.delta || b.shikiScore - a.shikiScore);

  let overrated = pickOverrated(7.4).slice(0, 5);
  if (overrated.length < 5) {
    const used = new Set(overrated.map((x) => x.id));
    overrated = overrated.concat(pickOverrated(6.8).filter((x) => !used.has(x.id))).slice(0, 5);
  }
  if (overrated.length < 3) {
    const used = new Set(overrated.map((x) => x.id));
    overrated = overrated.concat(
      candidates.filter((c) => c.delta < 0 && !used.has(c.id)).sort((a, b) => a.delta - b.delta)
    ).slice(0, 5);
  }

  return [...new Set([...gems, ...overrated].map((x) => x.id))];
}

async function fetchAniListDnaAndCovers(rates, watching, history, previousDnaMeta) {
  const completed = rates.filter((r) => r.status === 'completed');
  const rankedForMeta = [...completed]
    .sort((a, b) => (b.score - a.score) || (b.shikiScore - a.shikiScore) || (a.id - b.id))
    .slice(0, 100);

  const weightById = new Map();
  rankedForMeta.forEach((r) => {
    const s = r.score || 7;
    weightById.set(r.id, s >= 9 ? 1.5 : (s >= 7 ? 1.0 : 0.6));
  });

  const hotTakeIds = selectHotTakeIds(rates);
  const topRatedCoverIds = completed
    .filter((r) => r.score >= 9)
    .sort((a, b) => b.score - a.score || b.shikiScore - a.shikiScore || a.id - b.id)
    .slice(0, 40)
    .map((r) => r.id);

  const priorityCoverIds = new Set([
    ...PEAK_FICTION_IDS,
    ...watching.map((w) => w.malId),
    ...history.map((h) => h.id).filter(Boolean),
    ...hotTakeIds,
    ...topRatedCoverIds
  ].map(Number).filter((n) => Number.isFinite(n) && n > 0));

  const allAniListIds = [...new Set([
    ...rankedForMeta.map((r) => r.id),
    ...priorityCoverIds
  ])].sort((a, b) => a - b);

  const chunks = [];
  for (let i = 0; i < allAniListIds.length; i += 50) {
    chunks.push(allAniListIds.slice(i, i + 50));
  }

  const query = `
    query ($ids: [Int]) {
      Page(perPage: 50) {
        media(idMal_in: $ids, type: ANIME) {
          idMal
          genres
          duration
          coverImage { extraLarge large }
          studios(isMain: true) {
            nodes { name }
          }
        }
      }
    }
  `;

  const mediaById = new Map();
  let fetchedBatches = 0;

  for (let i = 0; i < chunks.length; i++) {
    const ids = chunks[i];
    const res = await fetchJsonWithRetry(ANILIST_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { ids } })
    }, {
      retries: 3,
      baseDelayMs: 1400,
      timeoutMs: 16000
    });

    if (res.ok && Array.isArray(res.data?.data?.Page?.media)) {
      fetchedBatches++;
      for (const m of res.data.data.Page.media) {
        if (m && m.idMal) mediaById.set(Number(m.idMal), m);
      }
    } else {
      console.log(`[anilist] Batch ${i + 1}/${chunks.length} failed (HTTP ${res.status || 'ERR'})`);
    }

    if (i + 1 < chunks.length) {
      await sleep(1100);
    }
  }

  const genreRawCount = {};
  const genreWeighted = {};
  const studioCount = {};

  for (const r of rankedForMeta) {
    const m = mediaById.get(r.id);
    if (!m) continue;
    const w = weightById.get(r.id) || 1;
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
  }

  const topGenresEntries = Object.entries(genreWeighted)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5);
  let genres = [];
  if (topGenresEntries.length) {
    const maxG = topGenresEntries[0][1];
    genres = topGenresEntries.map(([name, wVal]) => ({
      name,
      count: genreRawCount[name] || Math.round(wVal),
      pct: Math.round((wVal / maxG) * 100)
    }));
  } else if (Array.isArray(previousDnaMeta?.genres)) {
    genres = previousDnaMeta.genres;
  }

  const topStudioEntries = Object.entries(studioCount)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5);
  let studios = [];
  if (topStudioEntries.length) {
    const maxS = topStudioEntries[0][1];
    studios = topStudioEntries.map(([name, count]) => ({
      name,
      count,
      pct: Math.round((count / maxS) * 100)
    }));
  } else if (Array.isArray(previousDnaMeta?.studios)) {
    studios = previousDnaMeta.studios;
  }

  // Merge durations & covers cleanly (preserving previous valid entries on transient AniList failure)
  const durationsMap = new Map();
  if (previousDnaMeta?.durations && typeof previousDnaMeta.durations === 'object') {
    for (const [k, v] of Object.entries(previousDnaMeta.durations)) {
      const id = Number(k);
      const mins = Number(v);
      if (Number.isFinite(id) && mins > 0) durationsMap.set(id, mins);
    }
  }
  const coversMap = new Map();
  if (previousDnaMeta?.covers && typeof previousDnaMeta.covers === 'object') {
    for (const [k, v] of Object.entries(previousDnaMeta.covers)) {
      const id = Number(k);
      if (Number.isFinite(id) && typeof v === 'string' && v.startsWith('http')) {
        coversMap.set(id, v);
      }
    }
  }

  for (const [id, m] of mediaById.entries()) {
    const dur = Number(m.duration) || 0;
    if (dur > 0) durationsMap.set(id, dur);
    const coverUrl = m.coverImage?.extraLarge || m.coverImage?.large || '';
    if (coverUrl && (priorityCoverIds.has(id) || weightById.has(id))) {
      coversMap.set(id, coverUrl);
    }
  }

  // Keep only covers that belong to priority set + DNA top 100 so JSON stays compact
  const keepCoverIds = new Set([...priorityCoverIds, ...rankedForMeta.map((r) => r.id)]);
  const covers = {};
  [...coversMap.keys()]
    .filter((id) => keepCoverIds.has(id))
    .sort((a, b) => a - b)
    .forEach((id) => {
      covers[String(id)] = coversMap.get(id);
    });

  const durations = {};
  [...durationsMap.keys()]
    .sort((a, b) => a - b)
    .forEach((id) => {
      durations[String(id)] = durationsMap.get(id);
    });

  console.log(
    `[anilist] Fetched ${fetchedBatches}/${chunks.length} batches (${mediaById.size} titles) -> ` +
    `${genres.length} genres, ${studios.length} studios, ${Object.keys(durations).length} durations, ${Object.keys(covers).length} HD covers`
  );

  return { genres, studios, durations, covers };
}

function stripGeneratedAt(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return null;
  const clone = structuredClone(snapshot);
  if (clone.meta && typeof clone.meta === 'object') {
    delete clone.meta.generatedAt;
  }
  return clone;
}

async function readExistingSnapshot() {
  try {
    const raw = await fs.readFile(OUTPUT_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function main() {
  const existingSnapshot = await readExistingSnapshot();

  // 1. Fetch Shikimori user profile (resolve by nickname first, fallback to numeric id)
  console.log(`[shiki] Fetching profile "${SHIKI_NICKNAME}"...`);
  let profileRes = await fetchShikiEndpoint(`/api/users/${encodeURIComponent(SHIKI_NICKNAME)}?is_nickname=1`);
  if (!profileRes.ok || !profileRes.data?.id) {
    profileRes = await fetchShikiEndpoint(`/api/users/${SHIKI_USER_ID}`);
  }

  if (!profileRes.ok || !profileRes.data || !profileRes.data.id) {
    throw new Error(`Failed to fetch Shikimori profile (status=${profileRes.status}). Keeping existing snapshot.`);
  }

  const origin = profileRes.origin;
  const user = profileRes.data;
  console.log(`[shiki] Profile resolved via ${origin}: ${user.nickname} (id=${user.id})`);

  const animeMap = mapStatuses(user.stats?.full_statuses?.anime || user.stats?.statuses?.anime);
  const mangaMap = mapStatuses(user.stats?.full_statuses?.manga || user.stats?.statuses?.manga);

  const animeStats = {
    planned: animeMap.planned ?? 0,
    watching: (animeMap.watching || 0) + (animeMap.rewatching || 0),
    completed: animeMap.completed ?? 0,
    on_hold: animeMap.on_hold ?? 0,
    dropped: animeMap.dropped ?? 0
  };
  const mangaStats = {
    reading: (mangaMap.watching || 0) + (mangaMap.reading || 0) + (mangaMap.rewatching || 0),
    completed: mangaMap.completed ?? 0
  };

  if (animeStats.completed < 10) {
    throw new Error(`Suspiciously low completed anime count (${animeStats.completed}). Aborting to protect snapshot.`);
  }

  const profile = {
    id: Number(user.id),
    nickname: String(user.nickname || SHIKI_NICKNAME),
    url: compactShikiPath(user.url || `/${encodeURIComponent(SHIKI_NICKNAME).replace(/%20/g, '+')}`),
    avatar: compactShikiPath(user.image?.x160 || user.image?.x148 || user.avatar || ''),
    animeStats,
    mangaStats,
    activityGraph: parseShikiActivity(user.stats?.activity)
  };

  // 2. Fetch ALL anime_rates with pagination
  await sleep(550);
  const rawRates = [];
  for (let page = 1; page <= 10; page++) {
    console.log(`[shiki] Fetching anime_rates page ${page}...`);
    const ratesRes = await fetchShikiEndpoint(`/api/users/${profile.id}/anime_rates?limit=1000&page=${page}`, origin);
    if (!ratesRes.ok || !Array.isArray(ratesRes.data)) {
      if (page === 1) {
        throw new Error(`Failed to fetch anime_rates page 1 (status=${ratesRes.status}). Keeping existing snapshot.`);
      }
      console.log(`[shiki] Stopping pagination at page ${page} (status=${ratesRes.status})`);
      break;
    }
    rawRates.push(...ratesRes.data);
    if (ratesRes.data.length < 1000) break;
    await sleep(600);
  }

  const seenRateIds = new Set();
  const rates = [];
  for (const r of rawRates) {
    const a = r && r.anime;
    if (!a || !a.id) continue;
    const id = Number(a.id);
    if (!Number.isFinite(id) || seenRateIds.has(id)) continue;
    seenRateIds.add(id);

    const status = String(r.status || 'completed').toLowerCase();
    const kind = String(a.kind || 'tv').toLowerCase();
    const item = {
      id,
      title: String(a.russian || a.name || `#${id}`).trim(),
      kind,
      year: a.aired_on ? Number(String(a.aired_on).slice(0, 4)) || null : null,
      score: Number(r.score) || 0,
      shikiScore: Number((Number(a.score) || 0).toFixed(2)),
      episodes: Number(r.episodes) || 0,
      totalEpisodes: Number(a.episodes) || Number(a.episodes_aired) || 0,
      status,
      updatedAt: r.updated_at || null,
      img: compactShikiPath(a.image?.original || a.image?.preview || ''),
      url: compactShikiPath(a.url || `/animes/${id}`),
      comment: stripHtml(r.text || '')
    };
    const rewatches = Number(r.rewatches) || 0;
    if (rewatches > 0) item.rewatches = rewatches;
    if (a.status === 'ongoing') item.ongoing = true;
    rates.push(item);
  }

  if (rates.length < MIN_RATES_REQUIRED) {
    throw new Error(`Too few anime rates returned (${rates.length} < ${MIN_RATES_REQUIRED}). Keeping existing snapshot.`);
  }

  // Deterministic ordering by anime id to avoid noisy diffs
  rates.sort((a, b) => a.id - b.id);
  console.log(`[shiki] Collected ${rates.length} deduplicated anime rates`);

  // Build watching shelf (watching + rewatching, sorted by updatedAt desc)
  const watching = rates
    .filter((r) => r.status === 'watching' || r.status === 'rewatching')
    .sort((a, b) => {
      const diff = new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
      return diff !== 0 ? diff : a.id - b.id;
    })
    .map((r) => ({
      malId: r.id,
      title: r.title,
      kind: SHIKI_KIND_LABELS[r.kind] || 'Аниме',
      year: r.year,
      episodes: r.episodes,
      totalEpisodes: r.totalEpisodes,
      ongoing: Boolean(r.ongoing),
      score: r.shikiScore,
      userScore: r.score,
      status: r.status,
      updatedAt: r.updatedAt,
      url: r.url,
      img: r.img,
      comment: r.comment
    }));

  // 3. Fetch history (deduplicated)
  await sleep(550);
  let history = Array.isArray(existingSnapshot?.history) ? existingSnapshot.history : [];
  console.log('[shiki] Fetching history...');
  const historyRes = await fetchShikiEndpoint(`/api/users/${profile.id}/history?limit=30`, origin);
  if (historyRes.ok && Array.isArray(historyRes.data)) {
    const seenTargets = new Set();
    const parsedHistory = [];
    for (const h of historyRes.data) {
      const t = h && h.target;
      if (!t || (!t.russian && !t.name)) continue;
      const targetKey = t.id
        ? 'id_' + String(t.id)
        : 't_' + String(t.russian || t.name).trim().toLowerCase();
      if (seenTargets.has(targetKey)) continue;
      seenTargets.add(targetKey);
      parsedHistory.push({
        id: Number(t.id) || null,
        title: String(t.russian || t.name).trim(),
        action: stripHtml(h.description) || 'Обновление списка',
        createdAt: h.created_at || null,
        url: compactShikiPath(t.url || (t.id ? `/animes/${t.id}` : '')),
        img: compactShikiPath(t.image?.original || t.image?.preview || t.image?.x96 || '')
      });
      if (parsedHistory.length >= 5) break;
    }
    if (parsedHistory.length) {
      history = parsedHistory;
    }
  } else {
    console.log(`[shiki] History fetch skipped/failed (status=${historyRes.status}), preserving previous history`);
  }

  // 4. Fetch favourites (characters for WAIFU matching)
  await sleep(550);
  let favourites = Array.isArray(existingSnapshot?.favourites) ? existingSnapshot.favourites : [];
  console.log('[shiki] Fetching favourites...');
  const favRes = await fetchShikiEndpoint(`/api/users/${profile.id}/favourites`, origin);
  if (favRes.ok && favRes.data && Array.isArray(favRes.data.characters)) {
    favourites = favRes.data.characters
      .filter((fc) => fc && (fc.russian || fc.name))
      .map((fc) => ({
        id: Number(fc.id) || null,
        name: String(fc.name || '').trim(),
        russian: String(fc.russian || '').trim(),
        url: compactShikiPath(fc.url || ''),
        img: compactShikiPath(fc.image || '')
      }));
  } else {
    console.log(`[shiki] Favourites fetch skipped/failed (status=${favRes.status}), preserving previous favourites`);
  }

  // 5. Fetch AniList DNA metadata + HD covers
  await sleep(450);
  const dnaMeta = await fetchAniListDnaAndCovers(rates, watching, history, existingSnapshot?.dnaMeta);

  const nextSnapshot = {
    meta: {
      generatedAt: new Date().toISOString(),
      origin,
      version: SNAPSHOT_VERSION
    },
    profile,
    history,
    watching,
    favourites,
    rates,
    dnaMeta
  };

  // Compare ignoring meta.generatedAt to avoid redundant commits
  if (existingSnapshot) {
    const prevStable = JSON.stringify(stripGeneratedAt(existingSnapshot));
    const nextStable = JSON.stringify(stripGeneratedAt(nextSnapshot));
    if (prevStable === nextStable) {
      console.log('[snapshot] No data changes detected (excluding generatedAt); keeping existing assets/data/snapshot.json');
      return;
    }
  }

  const serialized = JSON.stringify(nextSnapshot);
  // Sanity-check serialized JSON before writing
  JSON.parse(serialized);

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  const tmpPath = `${OUTPUT_PATH}.tmp`;
  await fs.writeFile(tmpPath, serialized + '\n', 'utf8');
  await fs.rename(tmpPath, OUTPUT_PATH);

  const kb = (Buffer.byteLength(serialized, 'utf8') / 1024).toFixed(1);
  console.log(`[snapshot] Saved ${OUTPUT_PATH} (${kb} KB, ${rates.length} rates, ${watching.length} watching, ${history.length} history)`);
}

main().catch((err) => {
  console.error(`[snapshot] ERROR: ${err?.message || err}`);
  process.exit(1);
});
