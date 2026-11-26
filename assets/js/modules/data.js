import {
  SHIKI_ORIGINS,
  SHIKI_ORIGIN_STORAGE_KEY,
  SHIKI_KIND_LABELS,
  COVER_CACHE_KEY,
  RATED_POOL_CACHE_KEY,
  WATCHING_CACHE_KEY,
  DNA_CACHE_KEY,
  MY_RATES_CACHE_KEY,
  HOT_TAKES_CACHE_KEY,
  GALAXY_CACHE_KEY,
  COOP_HOST_CACHE_KEY,
  TROPHIES_CACHE_KEY,
  VIEW_STORAGE_KEY,
  NAV_MODE_STORAGE_KEY
} from './config.js';

export const SNAPSHOT = {
  nickname: 'undereror nyashka',
  avatar: '',
  anime: { planned: 172, watching: 16, completed: 415, on_hold: 10, dropped: 12 },
  manga: { reading: 5, completed: 13 },
  lifetimeText: '5 месяцев и 3 недели',
  history: [
    { id: 10800, title: 'Яркая Тихая', action: 'Оценено на 8', dateText: '8 дней назад', url: 'https://shikimori.one/animes/10800', image: '' },
    { id: 52215, title: 'Во всеоружии: Сила артефактов', action: 'Добавлено в список', dateText: '11 дней назад', url: 'https://shikimori.one/animes/52215', image: '' },
    { id: 10800, title: 'Яркая Тихая', action: 'Просмотрены 4 эпизода, Смотрю', dateText: '11 дней назад', url: 'https://shikimori.one/animes/10800', image: '' }
  ],
  watching: [
    {
      malId: 10800,
      title: 'Яркая Тихая',
      kind: 'TV Сериал',
      year: 2011,
      episodes: 4,
      totalEpisodes: 25,
      score: 8.19,
      userScore: 8,
      status: 'watching',
      url: 'https://shikimori.one/animes/10800',
      shikiImg: '',
      comment: ''
    }
  ],
  activity: [
    { label: '2023', full: 'Май 2023', value: 68 },
    { label: 'Авг', full: 'Август 2023', value: 14 },
    { label: 'Нояб', full: 'Ноябрь 2023', value: 26 },
    { label: '2024', full: 'Февраль 2024', value: 19 },
    { label: 'Май', full: 'Май 2024', value: 28 },
    { label: 'Авг', full: 'Август 2024', value: 22 },
    { label: 'Нояб', full: 'Ноябрь 2024', value: 36 },
    { label: '2025', full: 'Февраль 2025', value: 52 },
    { label: 'Апр', full: 'Апрель 2025', value: 24 },
    { label: 'Июнь', full: 'Июнь 2025', value: 48 },
    { label: 'Авг', full: 'Август 2025', value: 45 },
    { label: 'Окт', full: 'Октябрь 2025', value: 56 },
    { label: 'Дек', full: 'Декабрь 2025', value: 27 },
    { label: '2026', full: 'Февраль 2026', value: 44 },
    { label: 'Май', full: 'Май 2026', value: 58 },
    { label: 'Авг', full: 'Август 2026', value: 82 },
    { label: 'Окт', full: 'Октябрь 2026', value: 26 }
  ]
};

export const PEAK_FICTION = [
  { rank: 1,  malId: 21,    title: 'Ван-Пис', kind: 'TV Сериал', year: 1999, score: 8.84, note: 'Абсолютная эпопея о свободе и масштабе мира, к которой хочется возвращаться снова и снова.', vibes: ['#эпопея', '#свобода', '#масштаб'] },
  { rank: 2,  malId: 9253,  title: 'Врата Штейна', kind: 'TV Сериал', year: 2011, score: 8.84, note: '10/10. Безупречная драматургия мировых линий, саспенс и эмоциональный пик.', vibes: ['#таймлуп', '#саспенс', '#10/10'] },
  { rank: 3,  malId: 16498, title: 'Атака титанов', kind: 'TV Сериал', year: 2013, score: 8.59, note: 'Жёсткая трагедия о выборе, свободе и цене идеалов без единой проходной арки.', vibes: ['#трагедия', '#выбор', '#эпик'] },
  { rank: 4,  malId: 26055, title: 'Невероятное приключение ДжоДжо: Рыцари звёздной пыли 2', kind: 'TV Сериал', year: 2015, score: 8.75, note: 'Чистый стиль, культовые бои и финал в Каире, который вошёл в историю.', vibes: ['#стиль', '#культ', '#каир'] },
  { rank: 5,  malId: 42310, title: 'Киберпанк: Бегущие по краю', kind: 'ONA', year: 2022, score: 8.22, note: '10/10. Неоновый удар прямо в сердце под идеальный саундтрек.', vibes: ['#неон', '#киберпанк', '#разрыв сердца'] },
  { rank: 6,  malId: 5114,  title: 'Стальной алхимик: Братство', kind: 'TV Сериал', year: 2009, score: 8.99, note: 'Эталонный сёнен, где каждая сюжетная линия сходится с ювелирной точностью.', vibes: ['#эталон', '#драма', '#сюжет'] },
  { rank: 7,  malId: 57555, title: 'Человек-бензопила: Резе', kind: 'Фильм', year: 2025, score: 8.56, note: 'Безумная динамика, контраст нежности и хаоса, одна из сильнейших арок Фудзимото.', vibes: ['#хаос', '#нежность', '#безумие'] },
  { rank: 8,  malId: 1575,  title: 'Код Гиас: Восставший Лелуш', kind: 'TV Сериал', year: 2006, score: 8.79, note: 'Интеллектуальная партия на грани фола и один из лучших финалов в индустрии.', vibes: ['#майндгейм', '#гений', '#финал'] },
  { rank: 9,  malId: 40748, title: 'Магическая битва', kind: 'TV Сериал', year: 2020, score: 8.26, note: 'Холодная эстетика, топовая хореография боёв и харизматичные антагонисты.', vibes: ['#холод', '#бои', '#стиль'] },
  { rank: 10, malId: 2001,  title: 'Гуррен-Лаганн, пронзающий небеса', kind: 'TV Сериал', year: 2007, score: 8.88, note: 'Концентрированный драйв и вера в невозможное в космическом масштабе.', vibes: ['#драйв', '#космос', '#вера'] },
  { rank: 11, malId: 11061, title: 'Охотник х Охотник (2011)', kind: 'TV Сериал', year: 2011, score: 8.99, note: 'Лучшая боевая система и деконструкция жанра в арке Муравьёв-химер.', vibes: ['#тактика', '#деконструкция', '#химеры'] },
  { rank: 12, malId: 22535, title: 'Паразит: Учение о жизни', kind: 'TV Сериал', year: 2014, score: 8.48, note: 'Мрачный триллер о человечности, трансформации и холодном расчёте.', vibes: ['#мрак', '#психология', '#триллер'] },
  { rank: 13, malId: 14813, title: 'Как и ожидалось, моя школьная романтическая жизнь не удалась', kind: 'TV Сериал', year: 2013, score: 8.03, note: 'Тонкая психология, циничные монологи и поиск чего-то настоящего.', vibes: ['#цинизм', '#монологи', '#реальность'] },
  { rank: 14, malId: 269,   title: 'Блич', kind: 'TV Сериал', year: 2004, score: 8.26, note: 'Неповторимый минималистичный стиль Кубо, банкаи и атмосфера.', vibes: ['#минимализм', '#банкай', '#вайб'] },
  { rank: 15, malId: 34599, title: 'Созданный в Бездне', kind: 'TV Сериал', year: 2017, score: 8.66, note: 'Гипнотический саундтрек и пугающе красивое погружение в неизвестность.', vibes: ['#бездна', '#саундтрек', '#тайна'] },
  { rank: 16, malId: 33,    title: 'Берсерк', kind: 'TV Сериал', year: 1997, score: 8.86, note: 'Мрачная классика тёмного фэнтези о воле, амбициях и неизбежном затмении.', vibes: ['#дарк-фэнтези', '#воля', '#затмение'] }
];

export const WAIFU_LIST = [
  { rank: 1,  key: 'w1',  name: 'C.C.', search: 'C.C.', anime: 'Code Geass' },
  { rank: 2,  key: 'w2',  name: 'Крул Цепеш', search: 'Krul Tepes', anime: 'Owari no Seraph' },
  { rank: 3,  key: 'w3',  name: 'Резе', search: 'Reze', anime: 'Chainsaw Man' },
  { rank: 4,  key: 'w4',  name: 'Микаса Аккерман', search: 'Mikasa Ackerman', anime: 'Attack on Titan' },
  { rank: 5,  key: 'w5',  name: 'Шиноа Хираги', search: 'Shinoa Hiiragi', anime: 'Owari no Seraph' },
  { rank: 6,  key: 'w6',  name: 'Курису Макисэ', search: 'Kurisu Makise', anime: 'Steins;Gate' },
  { rank: 7,  key: 'w7',  name: 'Макима', search: 'Makima', anime: 'Chainsaw Man' },
  { rank: 8,  key: 'w8',  name: 'Марин Китагава', search: 'Marin Kitagawa', anime: 'My Dress-Up Darling' },
  { rank: 9,  key: 'w9',  name: 'Ризэ Камиширо', search: 'Rize Kamishiro', anime: 'Tokyo Ghoul' },
  { rank: 10, key: 'w10', name: 'Миса Аманэ', search: 'Misa Amane', anime: 'Death Note' },
  { rank: 11, key: 'w11', name: 'Юно Гасай', search: 'Yuno Gasai', anime: 'Mirai Nikki' },
  { rank: 12, key: 'w12', name: 'Люсина Кусинада', search: 'Lucyna Kushinada', anime: 'Cyberpunk: Edgerunners' },
  { rank: 13, key: 'w13', name: 'Рей Аянами', search: 'Rei Ayanami', anime: 'Neon Genesis Evangelion' },
  { rank: 14, key: 'w14', name: 'Кагуя Синомия', search: 'Kaguya Shinomiya', anime: 'Kaguya-sama: Love is War' },
  { rank: 15, key: 'w15', name: 'Тока Киришима', search: 'Touka Kirishima', anime: 'Tokyo Ghoul' }
];

export const LITERALLY_ME = [
  { rank: 1,  key: 'l1',  name: 'Эрен Йегер', search: 'Eren Yeager', anime: 'Attack on Titan' },
  { rank: 2,  key: 'l2',  name: 'Лелуш Ламперуж', search: 'Lelouch Lamperouge', anime: 'Code Geass' },
  { rank: 3,  key: 'l3',  name: 'Кэн Канэки', search: 'Ken Kaneki', anime: 'Tokyo Ghoul' },
  { rank: 4,  key: 'l4',  name: 'Сугуру Гэто', search: 'Suguru Geto', anime: 'Jujutsu Kaisen' },
  { rank: 5,  key: 'l5',  name: 'Сатору Годзё', search: 'Satoru Gojo', anime: 'Jujutsu Kaisen' },
  { rank: 6,  key: 'l6',  name: 'Киллуа Золдик', search: 'Killua Zoldyck', anime: 'Hunter x Hunter' },
  { rank: 7,  key: 'l7',  name: 'Леви', search: 'Levi', anime: 'Attack on Titan' },
  { rank: 8,  key: 'l8',  name: 'Аки Хаякава', search: 'Aki Hayakawa', anime: 'Chainsaw Man' },
  { rank: 9,  key: 'l9',  name: 'Саскэ Учиха', search: 'Sasuke Uchiha', anime: 'Naruto' },
  { rank: 10, key: 'l10', name: 'Юичиро Хякуя', search: 'Yuuichirou Hyakuya', anime: 'Owari no Seraph' },
  { rank: 11, key: 'l11', name: 'Гинтоки Саката', search: 'Gintoki Sakata', anime: 'Gintama' },
  { rank: 12, key: 'l12', name: 'Л Лоулайт', search: 'L Lawliet', anime: 'Death Note' },
  { rank: 13, key: 'l13', name: 'Муитиро Токито', search: 'Muichirou Tokitou', anime: 'Demon Slayer' },
  { rank: 14, key: 'l14', name: 'Лайт Ягами', search: 'Light Yagami', anime: 'Death Note' },
  { rank: 15, key: 'l15', name: 'Габимару', search: 'Gabimaru', anime: "Hell's Paradise" },
  { rank: 16, key: 'l16', name: 'Сэйсиро Наги', search: 'Seishirou Nagi', anime: 'Blue Lock' }
];

/* =========================================
   STATE & CACHE HELPERS
   ========================================= */
const reducedMotionMQ = window.matchMedia
  ? window.matchMedia('(prefers-reduced-motion: reduce)')
  : null;

export function loadSavedShikiOrigin() {
  try {
    const saved = localStorage.getItem(SHIKI_ORIGIN_STORAGE_KEY);
    if (saved && SHIKI_ORIGINS.includes(saved)) return saved;
  } catch (e) {}
  return SHIKI_ORIGINS[0];
}

export function setActiveShikiOrigin(origin) {
  if (!origin) return;
  appState.activeShikiOrigin = origin;
  try {
    localStorage.setItem(SHIKI_ORIGIN_STORAGE_KEY, origin);
  } catch (e) {}
}

export const appState = {
  activeShikiOrigin: loadSavedShikiOrigin(),
  liveBeatEnergy: 0,
  currentTab: 'peak',
  currentSort: 'rank',
  activeSector: 'dossier',
  navMode: (() => {
    try { return localStorage.getItem(NAV_MODE_STORAGE_KEY) === 'all' ? 'all' : 'os'; }
    catch (e) { return 'os'; }
  })(),
  currentView: (() => {
    try { return localStorage.getItem(VIEW_STORAGE_KEY) === 'showcase' ? 'showcase' : 'grid'; }
    catch (e) { return 'grid'; }
  })(),
  searchQuery: '',
  coverCache: loadCoverCache(),
  ratedAnimePool: loadRatedPoolCache(),
  watchingList: loadWatchingCache(),
  randomizerMode: 'all',
  currentDnaTab: 'genres',
  animeDnaState: loadDnaCache(),
  myRatesIndex: loadMyRatesIndex(),
  lastMatchVerdict: null,
  hotTakesShowFive: false,
  hotTakesState: loadHotTakesCache(),
  galaxyNodes: loadGalaxyCache(),
  galaxyRefreshHook: null,
  hostFullRates: loadHostFullRatesCache(),
  coopOpenWithGuestHook: null,
  trophiesState: loadTrophiesCache(),
  trophyFilter: 'all',
  liveStatsSnapshot: {
    animeCompleted: SNAPSHOT.anime.completed,
    animeWatching: SNAPSHOT.anime.watching,
    mangaCompleted: SNAPSHOT.manga.completed,
    mangaReading: SNAPSHOT.manga.reading
  },
  prefersReducedMotion: Boolean(reducedMotionMQ && reducedMotionMQ.matches),
  holoGalaxyList: [],
  snapshotMeta: null,
  initErrors: [],
  perfState: {
    webglRunning: false,
    atmosphereRunning: false,
    audioRunning: false,
    galaxyOpen: false,
    galaxyDpr: 0,
    galaxyStep: 0,
    galaxyStepsTotal: 1
  }
};

if (reducedMotionMQ) {
  const onMotionPrefChange = (e) => {
    appState.prefersReducedMotion = Boolean(e.matches);
    document.dispatchEvent(new CustomEvent('archive:motionchange', { detail: appState.prefersReducedMotion }));
  };
  if (typeof reducedMotionMQ.addEventListener === 'function') {
    reducedMotionMQ.addEventListener('change', onMotionPrefChange);
  } else if (typeof reducedMotionMQ.addListener === 'function') {
    reducedMotionMQ.addListener(onMotionPrefChange);
  }
}

export function loadWatchingCache() {
  try {
    const raw = localStorage.getItem(WATCHING_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export function saveWatchingCache() {
  try {
    localStorage.setItem(WATCHING_CACHE_KEY, JSON.stringify(appState.watchingList));
  } catch (e) {}
}

export function loadTrophiesCache() {
  try {
    const raw = localStorage.getItem(TROPHIES_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && Array.isArray(parsed.items) ? parsed : null;
  } catch (e) {
    return null;
  }
}

export function saveTrophiesCache(st) {
  try {
    localStorage.setItem(TROPHIES_CACHE_KEY, JSON.stringify(st));
  } catch (e) {}
}

export function loadHostFullRatesCache() {
  try {
    const raw = localStorage.getItem(COOP_HOST_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export function saveHostFullRatesCache(arr) {
  try {
    localStorage.setItem(COOP_HOST_CACHE_KEY, JSON.stringify(arr));
  } catch (e) {}
}

export function loadGalaxyCache() {
  try {
    const raw = localStorage.getItem(GALAXY_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export function saveGalaxyCache(nodes) {
  try {
    localStorage.setItem(GALAXY_CACHE_KEY, JSON.stringify(nodes));
  } catch (e) {}
}

export function buildFallbackGalaxyNodes() {
  const seen = new Set();
  const list = [];
  PEAK_FICTION.forEach((a) => {
    seen.add(a.malId);
    list.push({
      id: a.malId,
      title: a.title,
      kind: a.kind,
      year: a.year,
      score: a.userScore || 10,
      shikiScore: a.score,
      episodes: 0,
      status: 'completed',
      updatedAt: null,
      isPeak: true,
      peakRank: a.rank,
      img: appState.coverCache['anime_' + a.malId] || '',
      url: `${appState.activeShikiOrigin}/animes/${a.malId}`,
      comment: a.note || '',
      vibes: a.vibes || ['#peak-fiction']
    });
  });
  appState.ratedAnimePool.forEach((r) => {
    if (!r || !r.malId || seen.has(r.malId)) return;
    seen.add(r.malId);
    list.push({
      id: r.malId,
      title: r.title,
      kind: r.kind || 'Аниме',
      year: r.year || 2018,
      score: r.userScore || 9,
      shikiScore: r.score || 8.0,
      episodes: 0,
      status: 'completed',
      updatedAt: r.updatedAt || null,
      isPeak: false,
      peakRank: null,
      img: appState.coverCache['anime_' + r.malId] || r.shikiImg || '',
      url: r.url || `${appState.activeShikiOrigin}/animes/${r.malId}`,
      comment: r.note || '',
      vibes: r.vibes || ['#9-10★']
    });
  });
  (Array.isArray(appState.hostFullRates) ? appState.hostFullRates : []).forEach((r) => {
    if (!r || r.st !== 'planned' || !r.id) return;
    const id = Number(r.id);
    if (!id || seen.has(id)) return;
    seen.add(id);
    list.push({
      id,
      title: r.t || `#${id}`,
      kind: SHIKI_KIND_LABELS[String(r.k || 'tv').toLowerCase()] || 'Аниме',
      year: r.y || null,
      score: 0,
      shikiScore: Number((Number(r.g) || 0).toFixed(2)),
      episodes: Number(r.ep) || 0,
      status: 'planned',
      updatedAt: r.ua || null,
      isPeak: false,
      peakRank: null,
      img: appState.coverCache['anime_' + id] || r.img || '',
      url: r.url || `${appState.activeShikiOrigin}/animes/${id}`,
      comment: '',
      vibes: []
    });
  });
  return list;
}

export function loadHotTakesCache() {
  try {
    const raw = localStorage.getItem(HOT_TAKES_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.gems) && Array.isArray(parsed.overrated)) {
      return parsed;
    }
  } catch (e) {}
  return null;
}

export function saveHotTakesCache(state) {
  try {
    localStorage.setItem(HOT_TAKES_CACHE_KEY, JSON.stringify(state));
  } catch (e) {}
}

export function loadMyRatesIndex() {
  const map = new Map();
  try {
    const raw = localStorage.getItem(MY_RATES_CACHE_KEY);
    if (!raw) return map;
    const parsed = JSON.parse(raw);
    const arr = Array.isArray(parsed?.rates) ? parsed.rates : [];
    arr.forEach((item) => {
      if (item && item.id) map.set(Number(item.id), item);
    });
  } catch (e) {}
  return map;
}

export const SNAPSHOT_DNA = {
  isLive: false,
  totalAnalyzed: 415,
  ratedCount: 360,
  meanScore: 7.94,
  eliteCount: 84,
  eliteShare: 23,
  tensCount: 31,
  totalEpisodes: 7158,
  crowdDelta: 0.16,
  scores: { 1: 2, 2: 3, 3: 6, 4: 11, 5: 22, 6: 44, 7: 88, 8: 100, 9: 53, 10: 31 },
  eras: [
    { name: '2020+ · Современность', count: 148, pct: 36 },
    { name: '2013–2019 · Новая волна', count: 156, pct: 38 },
    { name: '2005–2012 · Золотая эра', count: 84, pct: 20 },
    { name: 'до 2005 · Классика', count: 27, pct: 6 }
  ],
  formats: [
    { name: 'TV', count: 312 },
    { name: 'Фильмы', count: 48 },
    { name: 'ONA', count: 34 },
    { name: 'OVA', count: 21 }
  ],
  genres: [
    { name: 'Экшен', count: 68, pct: 100 },
    { name: 'Драма', count: 56, pct: 82 },
    { name: 'Психология', count: 44, pct: 65 },
    { name: 'Фэнтези', count: 41, pct: 60 },
    { name: 'Сай-фай', count: 33, pct: 49 }
  ],
  studios: [
    { name: 'MAPPA', count: 14, pct: 100 },
    { name: 'Wit Studio', count: 11, pct: 79 },
    { name: 'Madhouse', count: 10, pct: 71 },
    { name: 'Bones', count: 9, pct: 64 },
    { name: 'White Fox', count: 7, pct: 50 }
  ],
  updatedAt: 0
};

export function loadDnaCache() {
  try {
    const raw = localStorage.getItem(DNA_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (e) {
    return null;
  }
}

export function saveDnaCache(dna) {
  try {
    localStorage.setItem(DNA_CACHE_KEY, JSON.stringify(dna));
  } catch (e) {}
}

export function loadRatedPoolCache() {
  try {
    const raw = localStorage.getItem(RATED_POOL_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export function saveRatedPoolCache() {
  try {
    localStorage.setItem(RATED_POOL_CACHE_KEY, JSON.stringify(appState.ratedAnimePool));
  } catch (e) {}
}

export function getCombinedRandomizerPool() {
  const seen = new Set();
  const combined = [];
  PEAK_FICTION.forEach((a) => {
    seen.add(a.malId);
    combined.push({ ...a, source: 'peak' });
  });
  appState.ratedAnimePool.forEach((r) => {
    if (!r || !r.malId || seen.has(r.malId)) return;
    seen.add(r.malId);
    combined.push(r);
  });
  return combined;
}

export function updateRandomizerPoolCounts() {
  const totalAll = getCombinedRandomizerPool().length;
  const badge = document.getElementById('randomizer-count-badge');
  if (badge) badge.textContent = String(totalAll);
  const allCountEl = document.getElementById('rmode-all-count');
  if (allCountEl) allCountEl.textContent = String(totalAll);
  const packCountEl = document.getElementById('pack-all-count');
  if (packCountEl) packCountEl.textContent = String(totalAll);
  document.querySelectorAll('[data-pack-pool-count]').forEach((el) => {
    el.textContent = String(totalAll);
  });
}

export function loadCoverCache() {
  try {
    const raw = localStorage.getItem(COVER_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    return {};
  }
}

export function saveCoverCache() {
  try {
    localStorage.setItem(COVER_CACHE_KEY, JSON.stringify(appState.coverCache));
  } catch (e) {}
}

export function normalizeShikiUrl(path, origin) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  const base = origin || appState.activeShikiOrigin;
  return base + (path.startsWith('/') ? path : '/' + path);
}
