/* =========================================
   CONFIGURATION, TRACKS & SNAPSHOT DATA
   ========================================= */
export const SHIKI_NICKNAME = 'undereror nyashka';
export const SHIKI_ORIGINS = ['https://shikimori.one', 'https://shikimori.io'];
export const ANILIST_ENDPOINT = 'https://graphql.anilist.co';
export const COVER_CACHE_KEY = 'undexeror_archive_covers_v4';
export const RATED_POOL_CACHE_KEY = 'undexeror_archive_rated910_v1';
export const WATCHING_CACHE_KEY = 'undexeror_archive_watching_v1';
export const DNA_CACHE_KEY = 'undexeror_archive_dna_v2';
export const MY_RATES_CACHE_KEY = 'undexeror_archive_my_rates_v1';
export const VOLUME_STORAGE_KEY = 'undexeror_archive_volume_v1';
export const DEFAULT_VOLUME = 0.18;
export const HOT_TAKES_CACHE_KEY = 'undexeror_archive_hottakes_v1';
export const GALAXY_CACHE_KEY = 'undexeror_archive_galaxy_v1';
export const COOP_HOST_CACHE_KEY = 'undexeror_archive_coop_host_v1';
export const TROPHIES_CACHE_KEY = 'undexeror_archive_trophies_v2';
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

export async function fetchWithTimeout(url, options, timeoutMs) {
  const limit = typeof timeoutMs === 'number' && timeoutMs > 0 ? timeoutMs : 9000;
  const opts = Object.assign({}, options || {});
  if (typeof AbortController === 'undefined') {
    return fetch(url, opts);
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), limit);
  opts.signal = ctrl.signal;
  try {
    return await fetch(url, opts);
  } finally {
    clearTimeout(timer);
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

export function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';
  return (tmp.textContent || tmp.innerText || '').trim();
}
