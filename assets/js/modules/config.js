/* =========================================
   CONFIGURATION, TRACKS & SNAPSHOT DATA
   ========================================= */
export const SHIKI_NICKNAME = 'undereror nyashka';
export const SHIKI_ORIGINS = ['https://shikimori.io', 'https://shikimori.one'];
export const SHIKI_ORIGIN_STORAGE_KEY = 'undexeror_shiki_origin_v1';
export const STATIC_SNAPSHOT_URL = './assets/data/snapshot.json';
export const ANILIST_ENDPOINT = 'https://graphql.anilist.co';
export const COVER_CACHE_KEY = 'undexeror_archive_covers_v4';
export const RATED_POOL_CACHE_KEY = 'undexeror_archive_rated910_v1';
export const WATCHING_CACHE_KEY = 'undexeror_archive_watching_v1';
export const DNA_CACHE_KEY = 'undexeror_archive_dna_v2';
export const MY_RATES_CACHE_KEY = 'undexeror_archive_my_rates_v1';
export const VOLUME_STORAGE_KEY = 'undexeror_archive_volume_v1';
export const DEFAULT_VOLUME = 0.18;
export const HOT_TAKES_CACHE_KEY = 'undexeror_archive_hottakes_v1';
export const GALAXY_CACHE_KEY = 'undexeror_archive_galaxy_v3';
export const COOP_HOST_CACHE_KEY = 'undexeror_archive_coop_host_v1';
export const TROPHIES_CACHE_KEY = 'undexeror_archive_trophies_v2';
export const VINYL_CACHE_KEY = 'undexeror_archive_vinyl_v1';
export const GENRE_RU = {
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
export const SHIKI_KIND_LABELS = {
  tv: 'TV Сериал',
  movie: 'Фильм',
  ova: 'OVA',
  ona: 'ONA',
  special: 'Спешл',
  tv_special: 'TV Спешл'
};
export const DISCORD_USER_ID = '372112023087087617';
export const SPOTIFY_PLAYLISTS = [
  { id: '2gmA2vop3KA3QGCGsUkTpC', label: '01 · Playlist', url: 'https://open.spotify.com/playlist/2gmA2vop3KA3QGCGsUkTpC' },
  { id: '39JoeKOM4F0CCuNFMKXJAX', label: '02 · Playlist', url: 'https://open.spotify.com/playlist/39JoeKOM4F0CCuNFMKXJAX' },
  { id: '4shEUeSI22KVOQGYXAVZjP', label: '03 · Playlist', url: 'https://open.spotify.com/playlist/4shEUeSI22KVOQGYXAVZjP' }
];

// Твои 4 трека: плеер сам найдёт их и в корне папки, и в папке ./music/
export const PLAYLIST = [
  {
    title: 'Тени',
    artist: 'Валентин Стрыкало',
    files: [
      'Валентин Стрыкало - Тени (musify.club).mp3',
      'track1.mp3'
    ]
  },
  {
    title: 'скорая помощь',
    artist: 'вышел покурить',
    files: [
      'вышел покурить — скорая помощь (audset.ru).m4a',
      'track2.m4a',
      'track2.mp3'
    ]
  },
  {
    title: 'I Really Want to Stay at Your House',
    artist: 'Cyberpunk: Edgerunners (Rock Edit)',
    files: [
      'CYBERPUNK 2077 SOUNDTRACK - I REALLY WANT TO STAY AT YOUR HOUSE by Rosa Walton & Hallie Coggins.mp3',
      'track3.mp3'
    ]
  },
  {
    title: 'In Love With Myself',
    artist: 'Petite Meller',
    files: [
      'Kalman Chodakiewitz, Eli Shiffman & Petite Meller - In Love With Myself.mp3',
      'track4.mp3'
    ]
  }
];

export const VIEW_STORAGE_KEY = 'undexeror_archive_view_v1';
export const NAV_MODE_STORAGE_KEY = 'undexeror_archive_nav_mode_v1';

export const VINYL_SHELF = [
  {
    id: 'lp-01',
    catalogNo: 'LP-01',
    title: 'Be Quiet and Drive (Far Away)',
    artist: 'Deftones',
    album: 'Around the Fur',
    year: 1997,
    query: 'Deftones Be Quiet and Drive Far Away',
    fallbackQuery: '',
    tag: 'ALT METAL'
  },
  {
    id: 'lp-02',
    catalogNo: 'LP-02',
    title: 'Beware',
    artist: 'Deftones',
    album: 'Saturday Night Wrist',
    year: 2006,
    query: 'Deftones Beware',
    fallbackQuery: '',
    tag: 'SHOEGAZE'
  },
  {
    id: 'lp-03',
    catalogNo: 'LP-03',
    title: 'Tarantula Girl',
    artist: 'VIOLENT VIRA',
    album: 'Tarantula Girl',
    year: 2023,
    query: 'VIOLENT VIRA Tarantula Girl',
    fallbackQuery: '',
    tag: 'ALT ROCK'
  },
  {
    id: 'lp-04',
    catalogNo: 'LP-04',
    title: 'In My Room',
    artist: 'Julia Wolf',
    album: 'PRESSURE',
    year: 2025,
    query: 'Julia Wolf In My Room',
    fallbackQuery: '',
    tag: 'ALT ROCK'
  },
  {
    id: 'lp-05',
    catalogNo: 'LP-05',
    title: 'Black Fingernails',
    artist: 'sowhatimdead',
    album: 'Black Fingernails',
    year: 2023,
    query: 'sowhatimdead Black Fingernails',
    fallbackQuery: 'lookup:6805986923',
    tag: 'DARK ALT'
  },
  {
    id: 'lp-06',
    catalogNo: 'LP-06',
    title: 'God Complex',
    artist: 'VIOLENT VIRA',
    album: 'God Complex',
    year: 2022,
    query: 'VIOLENT VIRA God Complex',
    fallbackQuery: '',
    tag: 'POST-GRUNGE'
  },
  {
    id: 'lp-07',
    catalogNo: 'LP-07',
    title: 'Broken Smile (My All)',
    artist: 'Lil Peep',
    album: "Come Over When You're Sober, Pt. 2",
    year: 2018,
    query: 'Lil Peep Broken Smile My All',
    fallbackQuery: '',
    tag: 'EMO RAP'
  },
  {
    id: 'lp-08',
    catalogNo: 'LP-08',
    title: 'D>E>A>T>H>M>E>T>A>L',
    artist: 'Panchiko',
    album: 'D>E>A>T>H>M>E>T>A>L',
    year: 2000,
    query: 'Panchiko DEATHMETAL',
    fallbackQuery: '',
    tag: 'INDIE LO-FI'
  },
  {
    id: 'lp-09',
    catalogNo: 'LP-09',
    title: 'One Weak',
    artist: 'Deftones',
    album: 'Adrenaline',
    year: 1995,
    query: 'Deftones One Weak',
    fallbackQuery: 'lookup:1099840922',
    tag: 'NU METAL'
  },
  {
    id: 'lp-10',
    catalogNo: 'LP-10',
    title: "You're Not Gone, You're Just Dead!",
    artist: 'VIOLENT VIRA',
    album: "Till' Death Was Never Enough",
    year: 2024,
    query: "VIOLENT VIRA You're Not Gone You're Just Dead",
    fallbackQuery: '',
    tag: 'ALT ROCK'
  },
  {
    id: 'lp-11',
    catalogNo: 'LP-11',
    title: 'My Own Summer (Shove It)',
    artist: 'Deftones',
    album: 'Around the Fur',
    year: 1997,
    query: 'Deftones My Own Summer Shove It',
    fallbackQuery: '',
    tag: 'ALT METAL'
  },
  {
    id: 'lp-12',
    catalogNo: 'LP-12',
    title: '4 Morant (Better Luck Next Time)',
    artist: 'Com Truise',
    album: 'Brokendate',
    year: 2011,
    query: 'Com Truise 4 Morant',
    fallbackQuery: 'Com Truise Brokendate',
    tag: 'SYNTHWAVE'
  }
];

export function formatRank(n) {
  return String(n).padStart(2, '0');
}

export function formatClock(sec) {
  if (!isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createTimeoutSignal(externalSignal, timeoutMs) {
  if (typeof AbortController === 'undefined') {
    return { signal: externalSignal, cleanup: () => {} };
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let onExternalAbort = null;

  if (externalSignal) {
    if (externalSignal.aborted) {
      clearTimeout(timer);
      ctrl.abort(externalSignal.reason);
    } else {
      onExternalAbort = () => {
        clearTimeout(timer);
        ctrl.abort(externalSignal.reason);
      };
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  const cleanup = () => {
    clearTimeout(timer);
    if (externalSignal && onExternalAbort) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  };

  return { signal: ctrl.signal, cleanup };
}

export async function fetchWithTimeout(url, options, timeoutMs) {
  const limit = typeof timeoutMs === 'number' && timeoutMs > 0 ? timeoutMs : 9000;
  const opts = Object.assign({}, options || {});
  const { signal, cleanup } = createTimeoutSignal(opts.signal, limit);
  if (signal) opts.signal = signal;
  try {
    return await fetch(url, opts);
  } finally {
    cleanup();
  }
}

export async function fetchJsonWithTimeout(url, options, timeoutMs) {
  const limit = typeof timeoutMs === 'number' && timeoutMs > 0 ? timeoutMs : 9000;
  const opts = Object.assign({}, options || {});
  const { signal, cleanup } = createTimeoutSignal(opts.signal, limit);
  if (signal) opts.signal = signal;
  try {
    const res = await fetch(url, opts);
    if (!res.ok) {
      return { res, ok: false, status: res.status, data: null };
    }
    const data = await res.json();
    return { res, ok: true, status: res.status, data };
  } finally {
    cleanup();
  }
}

export const KIND_AVG_MINUTES = {
  movie: 98,
  tv_special: 45,
  ova: 34,
  special: 28,
  tv: 24,
  ona: 22,
  music: 4,
  cm: 1,
  pv: 2
};

export function formatRelativeTime(iso) {
  if (!iso) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diffSec < 3600) return `${Math.max(1, Math.floor(diffSec / 60))} мин. назад`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} ч. назад`;
  const days = Math.floor(diffSec / 86400);
  if (days < 30) return `${days} дн. назад`;
  const months = Math.floor(days / 30);
  return `${months} мес. назад`;
}

export function formatSnapshotDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  try {
    return d.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return d.toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
  }
}

export function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';
  return (tmp.textContent || tmp.innerText || '').trim();
}
