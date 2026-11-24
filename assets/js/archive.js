    (function () {
      'use strict';

      /* =========================================
         CONFIGURATION, TRACKS & SNAPSHOT DATA
         ========================================= */
      const SHIKI_NICKNAME = 'undereror nyashka';
      const SHIKI_ORIGINS = ['https://shikimori.one', 'https://shikimori.io'];
      const ANILIST_ENDPOINT = 'https://graphql.anilist.co';
      const COVER_CACHE_KEY = 'undexeror_archive_covers_v4';
      const RATED_POOL_CACHE_KEY = 'undexeror_archive_rated910_v1';
      const WATCHING_CACHE_KEY = 'undexeror_archive_watching_v1';
      const DNA_CACHE_KEY = 'undexeror_archive_dna_v1';
      const MY_RATES_CACHE_KEY = 'undexeror_archive_my_rates_v1';
      const VOLUME_STORAGE_KEY = 'undexeror_archive_volume_v1';
      const DEFAULT_VOLUME = 0.18;
      const HOT_TAKES_CACHE_KEY = 'undexeror_archive_hottakes_v1';
      const GALAXY_CACHE_KEY = 'undexeror_archive_galaxy_v1';
      const COOP_HOST_CACHE_KEY = 'undexeror_archive_coop_host_v1';
      const TROPHIES_CACHE_KEY = 'undexeror_archive_trophies_v1';
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
      const SHIKI_KIND_LABELS = {
        tv: 'TV Сериал',
        movie: 'Фильм',
        ova: 'OVA',
        ona: 'ONA',
        special: 'Спешл',
        tv_special: 'TV Спешл'
      };
      const DISCORD_USER_ID = '372112023087087617';
      const SPOTIFY_PLAYLISTS = [
        { id: '2gmA2vop3KA3QGCGsUkTpC', label: '01 · Playlist', url: 'https://open.spotify.com/playlist/2gmA2vop3KA3QGCGsUkTpC' },
        { id: '39JoeKOM4F0CCuNFMKXJAX', label: '02 · Playlist', url: 'https://open.spotify.com/playlist/39JoeKOM4F0CCuNFMKXJAX' },
        { id: '4shEUeSI22KVOQGYXAVZjP', label: '03 · Playlist', url: 'https://open.spotify.com/playlist/4shEUeSI22KVOQGYXAVZjP' }
      ];

      // Твои 4 трека: плеер сам найдёт их и в корне папки, и в папке ./music/
      const PLAYLIST = [
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

      let activeShikiOrigin = SHIKI_ORIGINS[0];
      let liveBeatEnergy = 0;

      const SNAPSHOT = {
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

      const PEAK_FICTION = [
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

      const WAIFU_LIST = [
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

      const LITERALLY_ME = [
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
      const VIEW_STORAGE_KEY = 'undexeror_archive_view_v1';
      let currentTab = 'peak';
      let currentSort = 'rank';
      let currentView = (() => {
        try { return localStorage.getItem(VIEW_STORAGE_KEY) === 'showcase' ? 'showcase' : 'grid'; }
        catch (e) { return 'grid'; }
      })();
      let searchQuery = '';
      let coverCache = loadCoverCache();
      let ratedAnimePool = loadRatedPoolCache();
      let watchingList = loadWatchingCache();

      function loadWatchingCache() {
        try {
          const raw = localStorage.getItem(WATCHING_CACHE_KEY);
          if (!raw) return [];
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          return [];
        }
      }

      function saveWatchingCache() {
        try {
          localStorage.setItem(WATCHING_CACHE_KEY, JSON.stringify(watchingList));
        } catch (e) {}
      }
      let randomizerMode = 'all';
      let currentDnaTab = 'genres';
      let animeDnaState = loadDnaCache();
      let myRatesIndex = loadMyRatesIndex();
      let lastMatchVerdict = null;
      let hotTakesShowFive = false;
      let hotTakesState = loadHotTakesCache();
      let galaxyNodes = loadGalaxyCache();
      let galaxyRefreshHook = null;
      let hostFullRates = loadHostFullRatesCache();
      let coopOpenWithGuestHook = null;
      let trophiesState = loadTrophiesCache();
      let trophyFilter = 'all';
      let liveStatsSnapshot = {
        animeCompleted: SNAPSHOT.anime.completed,
        animeWatching: SNAPSHOT.anime.watching,
        mangaCompleted: SNAPSHOT.manga.completed,
        mangaReading: SNAPSHOT.manga.reading
      };

      function loadTrophiesCache() {
        try {
          const raw = localStorage.getItem(TROPHIES_CACHE_KEY);
          if (!raw) return null;
          const parsed = JSON.parse(raw);
          return parsed && Array.isArray(parsed.items) ? parsed : null;
        } catch (e) {
          return null;
        }
      }

      function saveTrophiesCache(st) {
        try {
          localStorage.setItem(TROPHIES_CACHE_KEY, JSON.stringify(st));
        } catch (e) {}
      }

      function loadHostFullRatesCache() {
        try {
          const raw = localStorage.getItem(COOP_HOST_CACHE_KEY);
          if (!raw) return [];
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          return [];
        }
      }

      function saveHostFullRatesCache(arr) {
        try {
          localStorage.setItem(COOP_HOST_CACHE_KEY, JSON.stringify(arr));
        } catch (e) {}
      }

      function loadGalaxyCache() {
        try {
          const raw = localStorage.getItem(GALAXY_CACHE_KEY);
          if (!raw) return [];
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          return [];
        }
      }

      function saveGalaxyCache(nodes) {
        try {
          localStorage.setItem(GALAXY_CACHE_KEY, JSON.stringify(nodes));
        } catch (e) {}
      }

      function buildFallbackGalaxyNodes() {
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
            isPeak: true,
            peakRank: a.rank,
            img: coverCache['anime_' + a.malId] || '',
            url: `${activeShikiOrigin}/animes/${a.malId}`,
            comment: a.note || '',
            vibes: a.vibes || ['#peak-fiction']
          });
        });
        ratedAnimePool.forEach((r) => {
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
            isPeak: false,
            peakRank: null,
            img: coverCache['anime_' + r.malId] || r.shikiImg || '',
            url: r.url || `${activeShikiOrigin}/animes/${r.malId}`,
            comment: r.note || '',
            vibes: r.vibes || ['#9-10★']
          });
        });
        return list;
      }

      function loadHotTakesCache() {
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

      function saveHotTakesCache(state) {
        try {
          localStorage.setItem(HOT_TAKES_CACHE_KEY, JSON.stringify(state));
        } catch (e) {}
      }

      function loadMyRatesIndex() {
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

      const SNAPSHOT_DNA = {
        isLive: false,
        totalAnalyzed: 415,
        ratedCount: 360,
        meanScore: 7.94,
        eliteCount: 84,
        eliteShare: 23,
        tensCount: 31,
        totalEpisodes: 9420,
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

      function loadDnaCache() {
        try {
          const raw = localStorage.getItem(DNA_CACHE_KEY);
          if (!raw) return null;
          const parsed = JSON.parse(raw);
          return parsed && typeof parsed === 'object' ? parsed : null;
        } catch (e) {
          return null;
        }
      }

      function saveDnaCache(dna) {
        try {
          localStorage.setItem(DNA_CACHE_KEY, JSON.stringify(dna));
        } catch (e) {}
      }

      function loadRatedPoolCache() {
        try {
          const raw = localStorage.getItem(RATED_POOL_CACHE_KEY);
          if (!raw) return [];
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          return [];
        }
      }

      function saveRatedPoolCache() {
        try {
          localStorage.setItem(RATED_POOL_CACHE_KEY, JSON.stringify(ratedAnimePool));
        } catch (e) {}
      }

      function getCombinedRandomizerPool() {
        const seen = new Set();
        const combined = [];
        PEAK_FICTION.forEach((a) => {
          seen.add(a.malId);
          combined.push({ ...a, source: 'peak' });
        });
        ratedAnimePool.forEach((r) => {
          if (!r || !r.malId || seen.has(r.malId)) return;
          seen.add(r.malId);
          combined.push(r);
        });
        return combined;
      }

      function updateRandomizerPoolCounts() {
        const totalAll = getCombinedRandomizerPool().length;
        const badge = document.getElementById('randomizer-count-badge');
        if (badge) badge.textContent = String(totalAll);
        const allCountEl = document.getElementById('rmode-all-count');
        if (allCountEl) allCountEl.textContent = String(totalAll);
        const packCountEl = document.getElementById('pack-all-count');
        if (packCountEl) packCountEl.textContent = String(totalAll);
      }

      function loadCoverCache() {
        try {
          const raw = localStorage.getItem(COVER_CACHE_KEY);
          if (!raw) return {};
          const parsed = JSON.parse(raw);
          return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (e) {
          return {};
        }
      }

      function saveCoverCache() {
        try {
          localStorage.setItem(COVER_CACHE_KEY, JSON.stringify(coverCache));
        } catch (e) {}
      }

      function normalizeShikiUrl(path, origin) {
        if (!path) return '';
        if (/^https?:\/\//i.test(path)) return path;
        const base = origin || activeShikiOrigin;
        return base + (path.startsWith('/') ? path : '/' + path);
      }

      function formatRank(n) {
        return String(n).padStart(2, '0');
      }

      function formatClock(sec) {
        if (!isFinite(sec) || sec < 0) return '0:00';
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${String(s).padStart(2, '0')}`;
      }

      function escapeHtml(str) {
        return String(str || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      }

      function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
      }

      /* =========================================
         BEAT-REACTIVE PLAYLIST PLAYER (REAL TRACKS + ANALYSER)
         ========================================= */
      function initMusicPlayer() {
        const audio = new Audio();
        audio.preload = 'metadata';

        function loadSavedVolume() {
          try {
            const raw = localStorage.getItem(VOLUME_STORAGE_KEY);
            if (raw !== null && raw !== '') {
              const num = Number(raw);
              if (isFinite(num) && num >= 0 && num <= 1) return num;
            }
          } catch (e) {}
          return DEFAULT_VOLUME;
        }

        function saveVolume(val) {
          try {
            localStorage.setItem(VOLUME_STORAGE_KEY, String(Math.round(val * 100) / 100));
          } catch (e) {}
        }

        let targetVolume = loadSavedVolume();
        let fadeRafId = null;
        let hasStartedOnce = false;
        audio.volume = targetVolume;

        const isHttp = location.protocol === 'http:' || location.protocol === 'https:';
        if (isHttp) audio.crossOrigin = 'anonymous';

        const dock = document.getElementById('music-dock');
        const dockPlayBtn = document.getElementById('dock-play-btn');
        const dockPrevBtn = document.getElementById('dock-prev-btn');
        const dockNextBtn = document.getElementById('dock-next-btn');
        const dockListBtn = document.getElementById('dock-list-btn');
        const dockMinBtn = document.getElementById('dock-min-btn');
        const dockTitle = document.getElementById('dock-title');
        const dockArtist = document.getElementById('dock-artist');
        const dockCurTime = document.getElementById('dock-cur-time');
        const dockDurTime = document.getElementById('dock-dur-time');
        const dockSeek = document.getElementById('dock-seek');
        const dockVolume = document.getElementById('dock-volume');
        const dockStatusNote = document.getElementById('dock-status-note');
        const dockPlaylist = document.getElementById('dock-playlist');

        const topBtn = document.getElementById('audio-toggle-btn');
        const topIcon = document.getElementById('audio-icon');
        const topLabel = document.getElementById('topbar-track-label');

        const visCanvas = document.getElementById('visualizer-canvas');
        const visCtx = visCanvas ? visCanvas.getContext('2d') : null;

        let trackIdx = 0;
        let isPlaying = false;
        let isSeeking = false;
        let candidateUrls = [];
        let candidateCursor = 0;

        let audioCtx = null;
        let analyser = null;
        let freqData = null;
        let analyserConnected = false;

        function buildCandidates(track) {
          const urls = [];
          (track.files || []).forEach((fname) => {
            const enc = encodeURIComponent(fname);
            urls.push('./' + enc);
            urls.push('./music/' + enc);
          });
          return urls;
        }

        function renderPlaylistUI() {
          if (!dockPlaylist) return;
          dockPlaylist.innerHTML = PLAYLIST.map((t, i) => `
            <button type="button" class="track-row ${i === trackIdx ? 'is-current' : ''}" data-idx="${i}">
              <span class="track-num">${formatRank(i + 1)}</span>
              <div class="track-row-info">
                <div class="track-row-title">${escapeHtml(t.title)}</div>
                <div class="track-row-artist">${escapeHtml(t.artist)}</div>
              </div>
            </button>
          `).join('');

          dockPlaylist.querySelectorAll('.track-row').forEach((row) => {
            row.addEventListener('click', () => {
              const idx = Number(row.dataset.idx);
              loadTrack(idx, true);
            });
          });
        }

        function updatePlayUI() {
          const symbol = isPlaying ? '❚❚' : '▶';
          if (dockPlayBtn) dockPlayBtn.textContent = symbol;
          if (topIcon) topIcon.textContent = symbol;
          if (topBtn) topBtn.classList.toggle('is-playing', isPlaying);
          document.body.classList.toggle('is-audio-playing', isPlaying);
          if (typeof syncVisualizer === 'function') syncVisualizer();
        }

        function setupAnalyser() {
          if (analyserConnected || !isHttp) return;
          try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            audioCtx = new AudioCtx();
            const source = audioCtx.createMediaElementSource(audio);
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 128;
            analyser.smoothingTimeConstant = 0.76;
            source.connect(analyser);
            analyser.connect(audioCtx.destination);
            freqData = new Uint8Array(analyser.frequencyBinCount);
            analyserConnected = true;
          } catch (e) {
            analyser = null;
          }
        }

        function loadTrack(idx, autoplay) {
          trackIdx = (idx + PLAYLIST.length) % PLAYLIST.length;
          const track = PLAYLIST[trackIdx];
          if (dockTitle) dockTitle.textContent = track.title;
          if (dockArtist) dockArtist.textContent = track.artist;
          if (topLabel) topLabel.textContent = track.title;
          if (dockStatusNote) dockStatusNote.textContent = `TRACK ${formatRank(trackIdx + 1)} / ${formatRank(PLAYLIST.length)} · BEAT-SYNC`;
          if (dockCurTime) dockCurTime.textContent = '0:00';
          if (dockDurTime) dockDurTime.textContent = '0:00';
          if (dockSeek) dockSeek.value = '0';

          candidateUrls = buildCandidates(track);
          candidateCursor = 0;
          audio.src = candidateUrls[0] || '';
          audio.load();
          renderPlaylistUI();

          if (autoplay) {
            playCurrent();
          }
        }

        if (dockVolume) {
          dockVolume.value = String(targetVolume);
        }

        function cancelVolumeFade(restoreTarget) {
          if (fadeRafId !== null) {
            cancelAnimationFrame(fadeRafId);
            fadeRafId = null;
          }
          if (restoreTarget) {
            audio.volume = targetVolume;
          }
        }

        function startVolumeFadeIn(durationMs) {
          cancelVolumeFade(false);
          const goal = targetVolume;
          if (goal <= 0.001) {
            audio.volume = 0;
            return;
          }
          audio.volume = 0;
          const startAt = performance.now();
          function stepFade(now) {
            const progress = Math.min(1, (now - startAt) / durationMs);
            // Smooth ease-out curve for gentle onset
            const eased = 1 - Math.pow(1 - progress, 2);
            audio.volume = Math.max(0, Math.min(1, goal * eased));
            if (progress < 1 && !audio.paused) {
              fadeRafId = requestAnimationFrame(stepFade);
            } else {
              fadeRafId = null;
              audio.volume = targetVolume;
            }
          }
          fadeRafId = requestAnimationFrame(stepFade);
        }

        function playCurrent(opts) {
          setupAnalyser();
          if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => {});
          }
          const shouldFade = Boolean((opts && opts.fadeIn) || !hasStartedOnce);
          if (shouldFade) {
            cancelVolumeFade(false);
            audio.volume = 0;
          } else {
            cancelVolumeFade(true);
          }

          const p = audio.play();
          if (p && typeof p.then === 'function') {
            p.then(() => {
              isPlaying = true;
              hasStartedOnce = true;
              updatePlayUI();
              if (shouldFade) startVolumeFadeIn(1200);
            }).catch(() => {
              isPlaying = false;
              cancelVolumeFade(true);
              updatePlayUI();
            });
          } else {
            isPlaying = true;
            hasStartedOnce = true;
            updatePlayUI();
            if (shouldFade) startVolumeFadeIn(1200);
          }
        }

        function pauseCurrent() {
          cancelVolumeFade(true);
          audio.pause();
          isPlaying = false;
          updatePlayUI();
        }

        function togglePlay() {
          if (isPlaying) pauseCurrent();
          else playCurrent();
        }

        audio.addEventListener('error', () => {
          candidateCursor++;
          if (candidateCursor < candidateUrls.length) {
            audio.src = candidateUrls[candidateCursor];
            audio.load();
            if (isPlaying) playCurrent();
          } else {
            isPlaying = false;
            updatePlayUI();
            if (dockStatusNote) {
              dockStatusNote.textContent = 'Закинь аудиофайлы в папку сайта';
            }
          }
        });

        audio.addEventListener('loadedmetadata', () => {
          if (dockDurTime) dockDurTime.textContent = formatClock(audio.duration);
        });

        audio.addEventListener('timeupdate', () => {
          if (dockCurTime) dockCurTime.textContent = formatClock(audio.currentTime);
          if (!isSeeking && dockSeek && audio.duration) {
            dockSeek.value = String((audio.currentTime / audio.duration) * 100);
          }
        });

        audio.addEventListener('ended', () => {
          loadTrack(trackIdx + 1, true);
        });

        dockPlayBtn?.addEventListener('click', togglePlay);
        topBtn?.addEventListener('click', togglePlay);
        dockPrevBtn?.addEventListener('click', () => loadTrack(trackIdx - 1, true));
        dockNextBtn?.addEventListener('click', () => loadTrack(trackIdx + 1, true));

        dockListBtn?.addEventListener('click', () => {
          const open = dockPlaylist.classList.toggle('is-open');
          dockListBtn.classList.toggle('active', open);
        });

        dockMinBtn?.addEventListener('click', () => {
          const min = dock.classList.toggle('is-minimized');
          dockMinBtn.textContent = min ? '+' : '–';
        });

        dockSeek?.addEventListener('input', () => {
          isSeeking = true;
          if (audio.duration && dockCurTime) {
            dockCurTime.textContent = formatClock((Number(dockSeek.value) / 100) * audio.duration);
          }
        });

        dockSeek?.addEventListener('change', () => {
          if (audio.duration) {
            audio.currentTime = (Number(dockSeek.value) / 100) * audio.duration;
          }
          isSeeking = false;
        });

        dockVolume?.addEventListener('input', () => {
          const v = Math.max(0, Math.min(1, Number(dockVolume.value)));
          targetVolume = isFinite(v) ? v : DEFAULT_VOLUME;
          cancelVolumeFade(false);
          audio.volume = targetVolume;
          saveVolume(targetVolume);
        });

        // Visualizer + Beat-Reactive Avatar Ring Loop (on-demand RAF — zero idle overhead)
        let smoothBeat = 0;
        let lastWrittenBeat = -1;
        let fallbackPhase = 0;
        let visRafId = null;
        const avatarBeatHost = document.querySelector('.avatar-wrap');

        function drawIdleBaseline() {
          if (!visCtx || !visCanvas) return;
          const vw = visCanvas.width;
          const vh = visCanvas.height;
          const barCount = 24;
          const gap = 3;
          const barW = (vw - gap * (barCount - 1)) / barCount;
          visCtx.clearRect(0, 0, vw, vh);
          visCtx.fillStyle = 'rgba(173, 191, 222, 0.22)';
          for (let i = 0; i < barCount; i++) {
            visCtx.fillRect(i * (barW + gap), vh - 2, barW, 2);
          }
        }

        function writeBeatEnergy(val) {
          if (Math.abs(val - lastWrittenBeat) <= 0.004) return;
          lastWrittenBeat = val;
          const bStr = val.toFixed(3);
          if (avatarBeatHost) avatarBeatHost.style.setProperty('--beat-energy', bStr);
          if (dock) dock.style.setProperty('--beat-energy', bStr);
        }

        function shouldRunVisualizer() {
          if (document.hidden) return false;
          if (document.body.classList.contains('galaxy-active')) return false;
          return isPlaying || smoothBeat > 0.004;
        }

        function stopVisualizerLoop() {
          if (visRafId !== null) {
            cancelAnimationFrame(visRafId);
            visRafId = null;
          }
        }

        function syncVisualizer() {
          if (shouldRunVisualizer()) {
            if (visRafId === null) {
              visRafId = requestAnimationFrame(visualizerFrame);
            }
          } else {
            stopVisualizerLoop();
            if (!isPlaying) {
              smoothBeat = 0;
              liveBeatEnergy = 0;
              writeBeatEnergy(0);
              drawIdleBaseline();
            }
          }
        }

        function visualizerFrame() {
          visRafId = null;
          if (!shouldRunVisualizer()) {
            if (!isPlaying) {
              smoothBeat = 0;
              liveBeatEnergy = 0;
              writeBeatEnergy(0);
              drawIdleBaseline();
            }
            return;
          }

          let targetEnergy = 0;
          const barCount = 24;

          if (visCtx && visCanvas) {
            const vw = visCanvas.width;
            const vh = visCanvas.height;
            visCtx.clearRect(0, 0, vw, vh);

            if (isPlaying && analyser && freqData) {
              analyser.getByteFrequencyData(freqData);
              let bassSum = 0;
              for (let b = 0; b < 6; b++) bassSum += freqData[b];
              const bassNorm = bassSum / (6 * 255);
              targetEnergy = Math.pow(Math.max(0, (bassNorm - 0.12) / 0.88), 1.35);

              const gap = 3;
              const barW = (vw - gap * (barCount - 1)) / barCount;
              for (let i = 0; i < barCount; i++) {
                const bin = Math.min(freqData.length - 1, Math.floor(i * 1.4));
                const v = freqData[bin] / 255;
                const bh = Math.max(2, v * (vh - 2));
                const x = i * (barW + gap);
                const y = vh - bh;
                const grad = visCtx.createLinearGradient(0, vh, 0, y);
                grad.addColorStop(0, 'rgba(173, 191, 222, 0.45)');
                grad.addColorStop(1, 'rgba(245, 248, 255, 0.95)');
                visCtx.fillStyle = grad;
                visCtx.fillRect(x, y, barW, bh);
              }
            } else if (isPlaying) {
              fallbackPhase += 0.14;
              targetEnergy = 0.25 + 0.35 * Math.pow((Math.sin(fallbackPhase * 1.7) + 1) * 0.5, 2);
              const gap = 3;
              const barW = (vw - gap * (barCount - 1)) / barCount;
              for (let i = 0; i < barCount; i++) {
                const v = 0.18 + 0.65 * Math.abs(Math.sin(fallbackPhase + i * 0.45));
                const bh = Math.max(2, v * (vh - 4));
                visCtx.fillStyle = 'rgba(195, 210, 235, 0.72)';
                visCtx.fillRect(i * (barW + gap), vh - bh, barW, bh);
              }
            } else {
              drawIdleBaseline();
            }
          }

          smoothBeat += (targetEnergy - smoothBeat) * (targetEnergy > smoothBeat ? 0.38 : 0.16);
          if (!isPlaying && smoothBeat < 0.004) smoothBeat = 0;
          liveBeatEnergy = smoothBeat;
          writeBeatEnergy(smoothBeat);

          if (shouldRunVisualizer()) {
            visRafId = requestAnimationFrame(visualizerFrame);
          } else if (!isPlaying) {
            drawIdleBaseline();
          }
        }

        document.addEventListener('visibilitychange', syncVisualizer);
        loadTrack(0, false);
        drawIdleBaseline();

        return {
          play: playCurrent,
          pause: pauseCurrent,
          isPlaying: () => isPlaying,
          syncVisualizer
        };
      }

      /* =========================================
         STAGE 4: LIVE WEATHER ENGINE (53.9° N · OPEN-METEO) + DYNAMIC CANVAS PHYSICS
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
        clear:  { icon: '✦', short: 'CLEAR', ru: 'Ясно / звёздное небо', wind: 6 },
        clouds: { icon: '☁', short: 'CLOUDS', ru: 'Облачно', wind: 10 },
        fog:    { icon: '≋', short: 'FOG', ru: 'Туман / дымка', wind: 4 },
        rain:   { icon: '☂', short: 'RAIN', ru: 'Дождь', wind: 16 },
        storm:  { icon: '⚡', short: 'STORM', ru: 'Гроза', wind: 26 },
        snow:   { icon: '❄', short: 'SNOW', ru: 'Снег', wind: 11 }
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

      function initAtmosphereCanvas() {
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

        window.addEventListener('resize', resize);
        window.addEventListener('mousemove', (e) => {
          mouse.x = e.clientX;
          mouse.y = e.clientY;
        }, { passive: true });
        window.addEventListener('mouseleave', () => {
          mouse.x = -9999;
          mouse.y = -9999;
        });

        resize();

        function isHeavyOverlayOpen() {
          return (
            document.hidden ||
            document.body.classList.contains('galaxy-active') ||
            document.getElementById('holo-modal')?.classList.contains('is-open') ||
            document.getElementById('detail-modal')?.classList.contains('is-open') ||
            document.getElementById('arena-modal')?.classList.contains('is-open') ||
            document.getElementById('coop-modal')?.classList.contains('is-open') ||
            document.getElementById('pack-modal')?.classList.contains('is-open') ||
            document.getElementById('trophy-modal')?.classList.contains('is-open')
          );
        }

        function frame(now) {
          if (isHeavyOverlayOpen()) {
            requestAnimationFrame(frame);
            return;
          }
          ctx.clearRect(0, 0, w, h);
          const mode = weatherEngineState.activeMode || 'clear';
          const beatBoost = 1 + liveBeatEnergy * 1.15;
          const isNight = weatherEngineState.isDay === 0;

          // 1. Stars (always softly present in clear/clouds, dim in snow/fog/rain)
          const starMul = mode === 'clear' ? (isNight ? 1.1 : 0.72)
            : mode === 'clouds' ? 0.48
            : mode === 'snow' ? 0.36
            : 0.18;

          for (let i = 0; i < stars.length; i++) {
            const s = stars[i];
            s.phase += s.speed;
            const alpha = Math.min(1, (0.14 + ((Math.sin(s.phase) + 1) * 0.5) * 0.68 + liveBeatEnergy * 0.15) * starMul);
            if (alpha < 0.03) continue;
            const px = mouse.x > -1000 ? (mouse.x / w - 0.5) * 10 * s.depth : 0;
            const py = mouse.y > -1000 ? (mouse.y / h - 0.5) * 10 * s.depth : 0;
            ctx.beginPath();
            ctx.arc(s.x - px, s.y - py, s.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(220, 230, 245, ${alpha.toFixed(3)})`;
            ctx.fill();
          }

          // 2. Fog / Clouds Mist Layer
          if (mode === 'fog' || mode === 'clouds') {
            const fogScale = mode === 'fog' ? 1.35 : 0.55;
            for (let i = 0; i < fogBanks.length; i++) {
              const fb = fogBanks[i];
              fb.x += fb.vx * (1 + liveBeatEnergy * 0.4);
              if (fb.x - fb.r > w + 80) fb.x = -fb.r - 60;
              if (fb.x + fb.r < -80) fb.x = w + fb.r + 60;

              const g = ctx.createRadialGradient(fb.x, fb.y, 10, fb.x, fb.y, fb.r);
              g.addColorStop(0, `rgba(195, 210, 234, ${(fb.alpha * fogScale).toFixed(3)})`);
              g.addColorStop(0.55, `rgba(145, 162, 188, ${(fb.alpha * fogScale * 0.45).toFixed(3)})`);
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
            const speedMul = (isStorm ? 1.35 : 1.0) * (1 + liveBeatEnergy * 0.35);
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
              ctx.strokeStyle = `rgba(198, 214, 240, ${(d.alpha * (isStorm ? 1.22 : 1)).toFixed(3)})`;
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
              ctx.strokeStyle = `rgba(210, 224, 246, ${sp.alpha.toFixed(3)})`;
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
                ctx.fillStyle = `rgba(215, 228, 250, ${lightningAlpha.toFixed(3)})`;
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
              ctx.fillStyle = `rgba(232, 240, 255, ${sf.alpha.toFixed(3)})`;
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
              ctx.fillStyle = `rgba(218, 228, 244, ${(p.alpha * petalAlphaMul).toFixed(3)})`;
              ctx.fill();
              ctx.restore();
            }
          }

          requestAnimationFrame(frame);
        }

        requestAnimationFrame(frame);
      }

      function initLiveWeather() {
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

          if (hudIcon) hudIcon.textContent = preset.icon;
          if (hudClock) hudClock.textContent = clock;
          if (hudTemp) hudTemp.textContent = tempStr;
          if (hudCond) hudCond.textContent = weatherEngineState.override ? `${preset.short}*` : preset.short;

          if (popMode) popMode.textContent = weatherEngineState.override ? `PREVIEW · ${preset.short}` : 'LIVE · OPEN-METEO';
          if (popDesc) popDesc.textContent = `${preset.icon} ${preset.ru} · ${tempStr}`;
          if (popWind) popWind.textContent = `Ветер ${windStr}`;

          if (pilotChip) {
            pilotChip.textContent = `53.9° N · ${clock} · ${tempStr} ${preset.icon}`;
          }

          document.body.classList.toggle('weather-night', weatherEngineState.isDay === 0);
          document.body.classList.toggle('weather-fog', mode === 'fog');

          const activeKey = weatherEngineState.override || 'live';
          chips.forEach((c) => c.classList.toggle('active', c.dataset.wmode === activeKey));
        }

        async function fetchOpenMeteo() {
          try {
            const url = 'https://api.open-meteo.com/v1/forecast?latitude=53.9006&longitude=27.5590&current=temperature_2m,weather_code,is_day,wind_speed_10m&timezone=Europe%2FMinsk';
            const res = await fetch(url);
            if (!res.ok) return;
            const json = await res.json();
            const cur = json?.current;
            if (!cur) return;
            weatherEngineState.temp = Number(cur.temperature_2m);
            weatherEngineState.code = Number(cur.weather_code) || 0;
            weatherEngineState.isDay = Number(cur.is_day) === 1 ? 1 : 0;
            weatherEngineState.windSpeed = Number(cur.wind_speed_10m) || 8;
            weatherEngineState.liveMode = mapWmoToWeather(weatherEngineState.code);
            updateWeatherUI();
          } catch (e) {}
        }

        hudBtn?.addEventListener('click', (e) => {
          e.stopPropagation();
          hud?.classList.toggle('is-open');
        });

        document.addEventListener('click', (e) => {
          if (hud && hud.classList.contains('is-open') && !hud.contains(e.target)) {
            hud.classList.remove('is-open');
          }
        });

        chips.forEach((chip) => {
          chip.addEventListener('click', () => {
            const m = chip.dataset.wmode;
            weatherEngineState.override = (m === 'live') ? null : m;
            updateWeatherUI();
          });
        });

        // Clicking pilot top-bar weather chip cycles live -> rain -> snow -> fog -> storm -> live
        const cycleOrder = [null, 'rain', 'snow', 'fog', 'storm', 'clear'];
        pilotChip?.addEventListener('click', () => {
          const curIdx = cycleOrder.indexOf(weatherEngineState.override);
          weatherEngineState.override = cycleOrder[(curIdx + 1) % cycleOrder.length];
          updateWeatherUI();
        });

        updateWeatherUI();
        fetchOpenMeteo();
        setInterval(updateWeatherUI, 30000);
        setInterval(fetchOpenMeteo, 15 * 60 * 1000);
      }

      /* =========================================
         RENDERING: STATS, HISTORY, GRAPH
         ========================================= */
      function renderStats(anime, manga, lifetimeText) {
        const planned = Number(anime.planned) || 0;
        const watching = Number(anime.watching) || 0;
        const completed = Number(anime.completed) || 0;
        const onHold = Number(anime.on_hold) || 0;
        const dropped = Number(anime.dropped) || 0;
        const total = Math.max(1, planned + watching + completed + onHold + dropped);

        document.getElementById('anime-completed').textContent = completed;
        document.getElementById('anime-total').textContent = planned + watching + completed + onHold + dropped;
        document.getElementById('st-planned').textContent = planned;
        document.getElementById('st-watching').textContent = watching;
        document.getElementById('st-completed').textContent = completed;
        document.getElementById('st-onhold').textContent = onHold;
        document.getElementById('st-dropped').textContent = dropped;

        const track = document.getElementById('anime-progress');
        if (track) {
          const pct = (v) => ((v / total) * 100).toFixed(2) + '%';
          track.innerHTML =
            `<div class="prog-seg prog-completed" style="width:${pct(completed)}"></div>` +
            `<div class="prog-seg prog-watching" style="width:${pct(watching)}"></div>` +
            `<div class="prog-seg prog-planned" style="width:${pct(planned)}"></div>` +
            `<div class="prog-seg prog-other" style="width:${pct(onHold + dropped)}"></div>`;
        }

        const mRead = Number(manga.reading) || 0;
        const mDone = Number(manga.completed) || 0;
        document.getElementById('manga-completed').textContent = mDone;
        document.getElementById('manga-reading').textContent = mRead;
        document.getElementById('manga-done-pill').textContent = mDone;

        if (lifetimeText) {
          document.getElementById('lifetime-text').textContent = lifetimeText;
        }

        liveStatsSnapshot = {
          animeCompleted: completed,
          animeWatching: watching,
          mangaCompleted: mDone,
          mangaReading: mRead
        };
        if (!trophiesState || !trophiesState.isLive) {
          trophiesState = buildFallbackTrophiesState();
          renderTrophiesShowcase();
        }

        const badge = document.getElementById('rank-badge');
        if (badge && completed >= 400) {
          const milestone = Math.floor(completed / 50) * 50;
          badge.textContent = `★ ${milestone}+ ТАЙТЛОВ · АНИМЕ ПСИХ`;
        }
      }

      function renderHistory(items, isLive) {
        const list = document.getElementById('history-list');
        const badge = document.getElementById('history-source-badge');
        if (!list) return;
        if (badge) badge.textContent = isLive ? 'SHIKIMORI LIVE' : 'SNAPSHOT';

        const seenHistoryKeys = new Set();
        const uniqueItems = [];
        (items || []).forEach((item) => {
          if (!item) return;
          const dedupKey = item.id
            ? 'id_' + String(item.id)
            : 't_' + String(item.title || '').trim().toLowerCase();
          if (seenHistoryKeys.has(dedupKey)) return;
          seenHistoryKeys.add(dedupKey);
          uniqueItems.push(item);
        });

        list.innerHTML = uniqueItems.slice(0, 5).map((item) => {
          const cacheKey = item.id ? 'anime_' + item.id : '';
          const cachedImg = cacheKey && coverCache[cacheKey] ? coverCache[cacheKey] : '';
          const imgSrc = item.image || cachedImg;
          return `
            <a class="history-item" href="${escapeHtml(item.url || '#')}" target="_blank" rel="noopener noreferrer">
              <div class="history-thumb">
                <img
                  data-cover-key="${escapeHtml(cacheKey)}"
                  data-fallback-src="${escapeHtml(cachedImg)}"
                  src="${escapeHtml(imgSrc)}"
                  alt="${escapeHtml(item.title)}"
                  loading="lazy"
                />
              </div>
              <div class="history-info">
                <div class="history-name">${escapeHtml(item.title)}</div>
                <div class="history-action">${escapeHtml(item.action)}</div>
                <div class="history-time">${escapeHtml(item.dateText)}</div>
              </div>
            </a>
          `;
        }).join('');

        attachImageHandlers(list);
      }

      function renderActivityGraph(points) {
        const container = document.getElementById('activity-graph');
        const tooltip = document.getElementById('graph-tooltip');
        if (!container || !points || !points.length) return;

        const maxVal = Math.max(1, ...points.map((p) => Number(p.value) || 0));
        container.innerHTML = points.map((p, idx) => {
          const pct = Math.max(6, Math.round(((Number(p.value) || 0) / maxVal) * 100));
          const delay = -(idx % 6) * 0.25;
          return `
            <div class="graph-col" data-idx="${idx}" tabindex="0">
              <div class="graph-bar-track">
                <div class="graph-bar" style="height:${pct}%; animation-delay:${delay}s"></div>
              </div>
              <span class="graph-lbl">${escapeHtml(p.label)}</span>
            </div>
          `;
        }).join('');

        const cols = Array.from(container.querySelectorAll('.graph-col'));
        function selectCol(i) {
          cols.forEach((c, idx) => c.classList.toggle('is-active', idx === i));
          const p = points[i];
          if (tooltip && p) {
            tooltip.textContent = `${p.full}: ${p.value} обн.`;
          }
        }

        cols.forEach((col, i) => {
          col.addEventListener('mouseenter', () => selectCol(i));
          col.addEventListener('click', () => selectCol(i));
          col.addEventListener('focus', () => selectCol(i));
        });

        selectCol(points.length - 1);
      }

      /* =========================================
         STAGE 1 NEW: ANIME-DNA // TASTE X-RAY ENGINE
         ========================================= */
      function computeViewerArchetype(dna) {
        const topGenre = dna.genres?.[0]?.name || 'Драма';
        const secondGenre = dna.genres?.[1]?.name || 'Экшен';
        const mean = Number(dna.meanScore) || 7.5;
        const eliteShare = Number(dna.eliteShare) || 20;
        const delta = Number(dna.crowdDelta) || 0;
        const topEra = [...(dna.eras || [])].sort((a, b) => b.count - a.count)[0]?.name || '';

        if (mean <= 7.1 || delta <= -0.35) {
          return {
            title: 'Холодный критик · Высокая планка',
            desc: `Оценивает строже толпы (${delta >= 0 ? '+' : ''}${delta.toFixed(2)} к среднему Шики). Главный фокус: ${topGenre.toLowerCase()} и ${secondGenre.toLowerCase()}.`
          };
        }
        if (eliteShare >= 28 && dna.tensCount >= 20) {
          return {
            title: 'Коллекционер Peak Fiction',
            desc: `${dna.tensCount} тайтлов на 10/10 и сильная тяга к жанрам «${topGenre}» и «${secondGenre}».`
          };
        }
        if (topEra.includes('2005–2012') || topEra.includes('Классика')) {
          return {
            title: 'Архивариус золотой эпохи',
            desc: `Ценит проверенную базу (${topEra.split('·')[0].trim()}). Опора вкуса — ${topGenre.toLowerCase()} и ${secondGenre.toLowerCase()}.`
          };
        }
        return {
          title: 'Ночной марафонец · Архив 400+',
          desc: `Собранный вкус вокруг «${topGenre}» и «${secondGenre}» со средней оценкой ${mean.toFixed(2)} и ${dna.eliteCount} тайтлами на 9–10★.`
        };
      }

      function renderAnimeDna(dnaInput) {
        const dna = dnaInput || SNAPSHOT_DNA;
        const badge = document.getElementById('dna-source-badge');
        const subNote = document.getElementById('dna-sub-note');
        const ratedPill = document.getElementById('dna-rated-pill');
        const archName = document.getElementById('dna-archetype-name');
        const archDesc = document.getElementById('dna-archetype-desc');
        const meanEl = document.getElementById('dna-mean-score');
        const eliteEl = document.getElementById('dna-elite-share');
        const eliteSub = document.getElementById('dna-elite-sub');
        const epsEl = document.getElementById('dna-total-eps');
        const deltaEl = document.getElementById('dna-crowd-delta');
        const deltaSub = document.getElementById('dna-crowd-sub');
        const scoresWrap = document.getElementById('dna-scores-chart');
        const scoreTooltip = document.getElementById('dna-score-tooltip');
        const peakScoreEl = document.getElementById('dna-peak-score');
        const tensCountEl = document.getElementById('dna-tens-count');
        const barsWrap = document.getElementById('dna-bars-list');
        const formatRow = document.getElementById('dna-format-row');

        if (badge) {
          badge.textContent = dna.isLive ? `LIVE · ${dna.totalAnalyzed} ТАЙТЛОВ` : 'SNAPSHOT';
        }
        if (subNote) {
          subNote.textContent = dna.isLive
            ? `Просканировано ${dna.totalAnalyzed} завершённых тайтлов с Shikimori`
            : 'Синхронизация вкуса с Shikimori...';
        }
        if (ratedPill) ratedPill.textContent = `ОЦЕНЕНО: ${dna.ratedCount || 0}`;

        const arch = computeViewerArchetype(dna);
        if (archName) archName.textContent = arch.title;
        if (archDesc) archDesc.textContent = arch.desc;

        if (meanEl) meanEl.textContent = Number(dna.meanScore || 0).toFixed(2);
        if (eliteEl) eliteEl.textContent = `${Math.round(dna.eliteShare || 0)}%`;
        if (eliteSub) eliteSub.textContent = `${dna.eliteCount || 0} тайтлов на 9–10★`;
        if (epsEl) epsEl.textContent = Number(dna.totalEpisodes || 0).toLocaleString('ru-RU');

        const dVal = Number(dna.crowdDelta || 0);
        if (deltaEl) deltaEl.textContent = `${dVal >= 0 ? '+' : ''}${dVal.toFixed(2)}`;
        if (deltaSub) {
          deltaSub.textContent = dVal >= 0.15
            ? 'щедрее среднего Шики'
            : dVal <= -0.15
              ? 'строже среднего Шики'
              : 'в балансе с комьюнити';
        }

        // Render Score Histogram 1..10
        if (scoresWrap) {
          const scoreMap = dna.scores || {};
          const counts = [];
          for (let s = 1; s <= 10; s++) counts.push({ score: s, count: Number(scoreMap[s]) || 0 });
          const maxC = Math.max(1, ...counts.map((x) => x.count));
          const totalRated = Math.max(1, counts.reduce((acc, x) => acc + x.count, 0));
          const peakObj = [...counts].sort((a, b) => b.count - a.count || b.score - a.score)[0];

          if (peakScoreEl && peakObj) peakScoreEl.textContent = `${peakObj.score}★ (${peakObj.count})`;
          if (tensCountEl) tensCountEl.textContent = `${scoreMap[10] || 0} шт.`;

          scoresWrap.innerHTML = counts.map((item) => {
            const pctH = item.count > 0 ? Math.max(8, Math.round((item.count / maxC) * 100)) : 4;
            const share = Math.round((item.count / totalRated) * 100);
            const cls = ['dna-score-col'];
            if (item.score >= 9) cls.push('is-elite');
            if (peakObj && item.score === peakObj.score) cls.push('is-active');
            return `
              <div class="${cls.join(' ')}" data-score="${item.score}" data-count="${item.count}" data-share="${share}" tabindex="0">
                <span class="dna-score-val">${item.count || ''}</span>
                <div class="dna-score-track">
                  <div class="dna-score-bar" style="height:${pctH}%"></div>
                </div>
                <span class="dna-score-num">${item.score}</span>
              </div>
            `;
          }).join('');

          const cols = Array.from(scoresWrap.querySelectorAll('.dna-score-col'));
          function selectScoreCol(col) {
            cols.forEach((c) => c.classList.toggle('is-active', c === col));
            if (scoreTooltip && col) {
              scoreTooltip.textContent = `${col.dataset.score}★ · ${col.dataset.count} шт. (${col.dataset.share}%)`;
            }
          }
          cols.forEach((col) => {
            col.addEventListener('mouseenter', () => selectScoreCol(col));
            col.addEventListener('click', () => selectScoreCol(col));
            col.addEventListener('focus', () => selectScoreCol(col));
          });
          const initialActive = scoresWrap.querySelector('.dna-score-col.is-active') || cols[9];
          if (initialActive) selectScoreCol(initialActive);
        }

        // Render Switchable X-Ray Bars (Genres / Studios / Eras)
        if (barsWrap) {
          let rows = [];
          if (currentDnaTab === 'studios') {
            rows = dna.studios || [];
          } else if (currentDnaTab === 'eras') {
            rows = dna.eras || [];
          } else {
            rows = dna.genres || [];
          }

          if (!rows.length) {
            barsWrap.innerHTML = `<div style="font-family:var(--font-mono);font-size:10.5px;color:rgba(var(--light),0.55);text-align:center;padding:18px 0;">Подгружаю срез из AniList...</div>`;
          } else {
            const maxVal = Math.max(1, ...rows.map((r) => Number(r.pct) || Number(r.count) || 1));
            barsWrap.innerHTML = rows.slice(0, 5).map((r) => {
              const barPct = currentDnaTab === 'eras'
                ? Math.max(6, Math.min(100, Math.round((Number(r.count) / Math.max(1, ...rows.map((x) => x.count))) * 100)))
                : Math.max(8, Math.min(100, Math.round((Number(r.pct || r.count) / maxVal) * 100)));
              const statText = currentDnaTab === 'eras'
                ? `${r.count} · ${r.pct}%`
                : `${r.count} тайтл.`;
              return `
                <div class="dna-bar-row">
                  <div class="dna-bar-meta">
                    <span class="dna-bar-name">${escapeHtml(r.name)}</span>
                    <span class="dna-bar-stat">${escapeHtml(statText)}</span>
                  </div>
                  <div class="dna-bar-track">
                    <div class="dna-bar-fill" style="width:${barPct}%"></div>
                  </div>
                </div>
              `;
            }).join('');
          }
        }

        if (formatRow) {
          formatRow.innerHTML = (dna.formats || []).slice(0, 4).map((f) =>
            `<span class="dna-format-chip">${escapeHtml(f.name)}<b>${f.count}</b></span>`
          ).join('');
        }
      }

      function initDnaControls() {
        const tabs = Array.from(document.querySelectorAll('.dna-tab-btn'));
        tabs.forEach((btn) => {
          btn.addEventListener('click', () => {
            currentDnaTab = btn.dataset.dnaTab || 'genres';
            tabs.forEach((b) => b.classList.toggle('active', b === btn));
            renderAnimeDna(animeDnaState || SNAPSHOT_DNA);
          });
        });
      }

      /* =========================================
         V13 STAGE 1: HOT TAKES ENGINE (CONTROVERSIAL RATINGS + PNG CARD)
         ========================================= */
      function computeHotTakesFromRates(allRates) {
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
            shikiImg: rawImg ? normalizeShikiUrl(rawImg, activeShikiOrigin) : '',
            url: a.url ? normalizeShikiUrl(a.url, activeShikiOrigin) : `${activeShikiOrigin}/animes/${a.id}`,
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

      function renderHotTakes(stateInput, loadFailed) {
        const gemsWrap = document.getElementById('ht-gems-list');
        const overWrap = document.getElementById('ht-over-list');
        const srcBadge = document.getElementById('ht-source-badge');
        const idxBadge = document.getElementById('ht-delta-index-badge');
        const gemsBadge = document.getElementById('ht-gems-badge');
        const overBadge = document.getElementById('ht-over-badge');
        const summaryEl = document.getElementById('ht-summary-note');
        const toggleBtn = document.getElementById('ht-toggle-count-btn');
        const dlBtn = document.getElementById('ht-download-png-btn');

        if (!gemsWrap || !overWrap) return;

        const st = stateInput || hotTakesState;

        if (!st || (!st.gems?.length && !st.overrated?.length)) {
          const msg = loadFailed
            ? 'Не удалось получить оценки с Shikimori API.'
            : 'Сканирую все оценки с Shikimori API...';
          const retryHtml = loadFailed
            ? '<button type="button" class="base-action-btn ht-retry-btn">↻ Повторить загрузку</button>'
            : '<span class="base-spinner"></span>';

          const emptyMarkup = `<div class="ht-skeleton">${retryHtml}<span>${msg}</span></div>`;
          gemsWrap.innerHTML = emptyMarkup;
          overWrap.innerHTML = emptyMarkup;
          if (srcBadge) srcBadge.textContent = loadFailed ? 'OFFLINE' : 'SYNC...';
          if (idxBadge) idxBadge.textContent = 'Δ —';
          if (summaryEl) summaryEl.textContent = msg;
          if (toggleBtn) toggleBtn.style.display = 'none';
          if (dlBtn) dlBtn.disabled = true;

          document.querySelectorAll('.ht-retry-btn').forEach((btn) => {
            btn.addEventListener('click', async () => {
              renderHotTakes(null, false);
              const ok = await loadHostAnimeRates();
              if (!ok && !hotTakesState) renderHotTakes(null, true);
            });
          });
          return;
        }

        const limit = hotTakesShowFive ? 5 : 3;
        const gemsSlice = (st.gems || []).slice(0, limit);
        const overSlice = (st.overrated || []).slice(0, limit);

        const avg = Number(st.avgDelta || 0);
        if (idxBadge) {
          idxBadge.textContent = `ИНДЕКС ${avg >= 0 ? '+' : ''}${avg.toFixed(2)}`;
        }
        if (srcBadge) {
          srcBadge.textContent = `LIVE · ${st.scannedCount || 0} ОЦЕНОК`;
        }
        if (gemsBadge && gemsSlice.length) {
          gemsBadge.textContent = `МАКС +${gemsSlice[0].delta.toFixed(2)}`;
        }
        if (overBadge && overSlice.length) {
          overBadge.textContent = `МАКС ${overSlice[0].delta.toFixed(2)}`;
        }

        function renderHotTakeRow(item, isGem) {
          const coverKey = 'anime_' + item.malId;
          const imgSrc = coverCache[coverKey] || item.shikiImg || '';
          const deltaStr = `${item.delta > 0 ? '+' : ''}${item.delta.toFixed(2)}`;
          const userPct = Math.max(8, Math.min(100, Math.round((item.userScore / 10) * 100)));
          const shikiPct = Math.max(8, Math.min(98, Math.round((item.shikiScore / 10) * 100)));
          const caption = item.comment
            ? `«${item.comment}»`
            : (isGem
              ? `Оценил на ${item.userScore}★ при рейтинге Шики ${item.shikiScore.toFixed(2)}`
              : `Хит на ${item.shikiScore.toFixed(2)}★, но моя оценка — ${item.userScore}/10`);

          return `
            <button type="button" class="ht-card" data-ht-id="${item.malId}" data-ht-type="${isGem ? 'gem' : 'over'}">
              <div class="ht-thumb">
                <img
                  data-cover-key="${coverKey}"
                  data-fallback-src="${escapeHtml(item.shikiImg || '')}"
                  src="${escapeHtml(imgSrc)}"
                  alt="${escapeHtml(item.title)}"
                  loading="lazy"
                />
              </div>
              <div class="ht-body">
                <div class="ht-anime-title">${escapeHtml(item.title)}</div>
                <div class="ht-scores-row">
                  <span class="ht-chip-me">Я: ${item.userScore}★</span>
                  <span class="ht-chip-shiki">Шики: ${item.shikiScore.toFixed(2)}★</span>
                  <span class="ht-chip-meta">${escapeHtml(item.kind)}${item.year ? ' · ' + item.year : ''}</span>
                </div>
                <div class="ht-meter" title="Полоска: моя оценка (${item.userScore}) · белая риска: рейтинг Шикимори (${item.shikiScore.toFixed(2)})">
                  <div class="ht-meter-fill" style="width:${userPct}%"></div>
                  <span class="ht-meter-marker" style="left:${shikiPct}%"></span>
                </div>
                <div class="ht-take-line">${escapeHtml(caption)}</div>
              </div>
              <div class="ht-delta-badge">
                <span class="ht-delta-val">${deltaStr}</span>
                <span class="ht-delta-lbl">${isGem ? 'ГЕМ' : 'СПОР'}</span>
              </div>
            </button>
          `;
        }

        gemsWrap.innerHTML = gemsSlice.length
          ? gemsSlice.map((item) => renderHotTakeRow(item, true)).join('')
          : '<div class="base-empty-note">Нет оценок заметно выше рейтинга Шикимори</div>';

        overWrap.innerHTML = overSlice.length
          ? overSlice.map((item) => renderHotTakeRow(item, false)).join('')
          : '<div class="base-empty-note">Нет жёстко заниженных популярных хитов</div>';

        attachImageHandlers(gemsWrap);
        attachImageHandlers(overWrap);

        // Bind modal open on click
        [gemsWrap, overWrap].forEach((wrap) => {
          wrap.querySelectorAll('.ht-card').forEach((btn) => {
            btn.addEventListener('click', () => {
              const id = Number(btn.dataset.htId);
              const isGem = btn.dataset.htType === 'gem';
              const list = isGem ? (st.gems || []) : (st.overrated || []);
              const item = list.find((x) => x.malId === id);
              if (!item) return;
              const img = btn.querySelector('img');
              const deltaStr = `${item.delta > 0 ? '+' : ''}${item.delta.toFixed(2)}`;

              openModal({
                tag: isGem ? 'HOT TAKE · НЕДООЦЕНЁННЫЙ ГЕМ' : 'HOT TAKE · ПЕРЕОЦЕНЁННЫЙ ХИТ',
                title: item.title,
                sub: [item.kind, item.year].filter(Boolean).join(' · '),
                pills: [
                  `Моя оценка ${item.userScore}/10`,
                  `Шикимори ★ ${item.shikiScore.toFixed(2)}`,
                  `Разрыв ${deltaStr}`
                ],
                vibes: isGem
                  ? ['#недооценено', '#выше толпы', `#${item.userScore}/10`]
                  : ['#против хайпа', '#жёсткий вердикт', `#${item.userScore}/10`],
                note: item.comment
                  ? `«${item.comment}»`
                  : (isGem
                    ? `Один из главных гемов моего списка: поставил ${item.userScore}/10, хотя средний рейтинг на Shikimori — всего ${item.shikiScore.toFixed(2)} (разрыв ${deltaStr}).`
                    : `Один из главных моих споров с комьюнити: при рейтинге Shikimori ${item.shikiScore.toFixed(2)} этот тайтл получил от меня только ${item.userScore}/10 (${deltaStr}).`),
                img: img ? img.src : (coverCache['anime_' + item.malId] || item.shikiImg || ''),
                url: item.url || `${activeShikiOrigin}/animes/${item.malId}`
              });
            });
          });
        });

        const maxGem = gemsSlice[0] ? `+${gemsSlice[0].delta.toFixed(2)}` : '—';
        const maxOver = overSlice[0] ? `${overSlice[0].delta.toFixed(2)}` : '—';
        if (summaryEl) {
          summaryEl.innerHTML = `Проверено <strong>${st.scannedCount || 0}</strong> оценённых тайтлов · Средний сдвиг <strong>${avg >= 0 ? '+' : ''}${avg.toFixed(2)}</strong> · Пики <strong>${maxGem}</strong> / <strong>${maxOver}</strong>`;
        }

        const canExpand = (st.gems?.length || 0) > 3 || (st.overrated?.length || 0) > 3;
        if (toggleBtn) {
          toggleBtn.style.display = canExpand ? 'inline-flex' : 'none';
          toggleBtn.textContent = hotTakesShowFive ? 'Свернуть до топ-3' : 'Показать топ-5';
        }
        if (dlBtn) dlBtn.disabled = false;

        const coverIds = [...gemsSlice, ...overSlice].map((x) => x.malId);
        if (coverIds.length) loadAnimeCoversBatch(coverIds);
      }

      function initHotTakesControls() {
        const toggleBtn = document.getElementById('ht-toggle-count-btn');
        const dlBtn = document.getElementById('ht-download-png-btn');

        toggleBtn?.addEventListener('click', () => {
          hotTakesShowFive = !hotTakesShowFive;
          renderHotTakes(hotTakesState, false);
      initTrophiesShowcase();
        });

        dlBtn?.addEventListener('click', () => {
          if (!hotTakesState) return;
          const st = hotTakesState;
          const W = 1200;
          const H = 675;
          const c = document.createElement('canvas');
          c.width = W;
          c.height = H;
          const ctx = c.getContext('2d');

          function rRect(x, y, w, h, r) {
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.arcTo(x + w, y, x + w, y + h, r);
            ctx.arcTo(x + w, y + h, x, y + h, r);
            ctx.arcTo(x, y + h, x, y, r);
            ctx.arcTo(x, y, x + w, y, r);
            ctx.closePath();
          }
          function clipText(txt, maxW) {
            let s = String(txt || '');
            if (ctx.measureText(s).width <= maxW) return s;
            while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
            return s + '…';
          }

          // Noir cinema background
          const bg = ctx.createLinearGradient(0, 0, W, H);
          bg.addColorStop(0, '#07090f');
          bg.addColorStop(0.5, '#0b101b');
          bg.addColorStop(1, '#06080d');
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, W, H);

          const gLeft = ctx.createRadialGradient(250, 220, 20, 250, 220, 420);
          gLeft.addColorStop(0, 'rgba(110, 231, 183, 0.13)');
          gLeft.addColorStop(1, 'transparent');
          ctx.fillStyle = gLeft;
          ctx.fillRect(0, 0, W, H);

          const gRight = ctx.createRadialGradient(950, 450, 20, 950, 450, 420);
          gRight.addColorStop(0, 'rgba(248, 113, 113, 0.13)');
          gRight.addColorStop(1, 'transparent');
          ctx.fillStyle = gRight;
          ctx.fillRect(0, 0, W, H);

          ctx.strokeStyle = 'rgba(173, 191, 222, 0.045)';
          for (let x = 40; x < W; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
          for (let y = 40; y < H; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

          rRect(26, 26, W - 52, H - 52, 22);
          ctx.strokeStyle = 'rgba(173, 191, 222, 0.24)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Header
          ctx.fillStyle = '#adbfde';
          ctx.font = '600 14px "JetBrains Mono", monospace';
          ctx.fillText('◈  UNDEXEROR // ARCHIVE   ·   HOT TAKES ПРОТИВ ШИКИМОРИ', 62, 72);

          const avg = Number(st.avgDelta || 0);
          ctx.textAlign = 'right';
          ctx.fillStyle = 'rgba(205, 212, 224, 0.62)';
          ctx.fillText(`ИНДЕКС ${avg >= 0 ? '+' : ''}${avg.toFixed(2)}  ·  ${st.scannedCount || 0} ОЦЕНОК`, W - 62, 72);
          ctx.textAlign = 'left';

          ctx.fillStyle = '#ffffff';
          ctx.font = '600 28px "Unbounded", "Inter", sans-serif';
          ctx.fillText('Главные несогласия с толпой', 62, 122);

          ctx.strokeStyle = 'rgba(173, 191, 222, 0.16)';
          ctx.beginPath(); ctx.moveTo(62, 144); ctx.lineTo(W - 62, 144); ctx.stroke();

          // Two Columns
          const colY = 166;
          const colH = 420;
          const colW = (W - 124 - 24) / 2;

          function drawCol(x, title, accent, borderCol, fillTop, items, isGem) {
            rRect(x, colY, colW, colH, 16);
            ctx.fillStyle = fillTop;
            ctx.fill();
            ctx.strokeStyle = borderCol;
            ctx.lineWidth = 1.3;
            ctx.stroke();

            ctx.fillStyle = accent;
            ctx.font = '600 13px "JetBrains Mono", monospace';
            ctx.fillText(title, x + 24, colY + 36);

            const slice = (items || []).slice(0, 3);
            slice.forEach((item, idx) => {
              const ry = colY + 60 + idx * 112;
              rRect(x + 20, ry, colW - 40, 96, 12);
              ctx.fillStyle = 'rgba(9, 12, 20, 0.86)';
              ctx.fill();
              ctx.strokeStyle = 'rgba(173, 191, 222, 0.16)';
              ctx.stroke();

              ctx.fillStyle = '#ffffff';
              ctx.font = '600 17px "Inter", sans-serif';
              ctx.fillText(clipText(item.title, colW - 175), x + 38, ry + 36);

              ctx.fillStyle = 'rgba(205, 212, 224, 0.72)';
              ctx.font = '500 13px "JetBrains Mono", monospace';
              ctx.fillText(`Я: ${item.userScore}★   ·   Шики: ${item.shikiScore.toFixed(2)}★`, x + 38, ry + 66);

              // Delta pill
              const dx = x + colW - 118;
              rRect(dx, ry + 20, 82, 56, 10);
              ctx.fillStyle = isGem ? 'rgba(110, 231, 183, 0.14)' : 'rgba(248, 113, 113, 0.15)';
              ctx.fill();
              ctx.strokeStyle = borderCol;
              ctx.stroke();

              ctx.textAlign = 'center';
              ctx.fillStyle = accent;
              ctx.font = '600 17px "Unbounded", "JetBrains Mono", monospace';
              ctx.fillText(`${item.delta > 0 ? '+' : ''}${item.delta.toFixed(2)}`, dx + 41, ry + 54);
              ctx.textAlign = 'left';
            });
          }

          drawCol(
            62,
            '▲  НЕДООЦЕНЁННЫЕ ГЕМЫ  ·  ВЫШЕ ТОЛПЫ',
            '#a7f3d0',
            'rgba(110, 231, 183, 0.38)',
            'rgba(10, 24, 22, 0.65)',
            st.gems,
            true
          );

          drawCol(
            62 + colW + 24,
            '▼  ПЕРЕОЦЕНЁННЫЕ ХИТЫ  ·  НИЖЕ ТОЛПЫ',
            '#fecaca',
            'rgba(248, 113, 113, 0.38)',
            'rgba(28, 11, 17, 0.65)',
            st.overrated,
            false
          );

          // Footer
          ctx.fillStyle = 'rgba(205, 212, 224, 0.56)';
          ctx.font = '500 13px "JetBrains Mono", monospace';
          ctx.fillText('ПРОВЕРЬ СВОЮ БАЗУ  →  https://undexerorrr.github.io/', 62, H - 46);
          ctx.textAlign = 'right';
          ctx.fillStyle = 'rgba(173, 191, 222, 0.65)';
          ctx.fillText('undereror nyashka · undexeror // archive', W - 62, H - 46);

          const link = document.createElement('a');
          link.download = 'undexeror-hot-takes.png';
          link.href = c.toDataURL('image/png');
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        });
      }

      async function hydrateDnaFromShikiRates(rates, userStats) {
        if (!Array.isArray(rates) || !rates.length) return;

        // Cache compact rates map for Stage 2 ("Проверка на базу")
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
                img: rawImg ? normalizeShikiUrl(rawImg, activeShikiOrigin) : ''
              };
            });
          myRatesIndex = new Map(compactRates.map((x) => [x.id, x]));
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

        const prev = animeDnaState || SNAPSHOT_DNA;
        const baseDna = {
          isLive: true,
          totalAnalyzed: rates.length,
          ratedCount,
          meanScore: ratedCount ? scoreSum / ratedCount : prev.meanScore,
          eliteCount,
          eliteShare: ratedCount ? (eliteCount / ratedCount) * 100 : prev.eliteShare,
          tensCount: scoreCounts[10] || 0,
          totalEpisodes,
          crowdDelta: deltaCount ? deltaSum / deltaCount : 0,
          scores: scoreCounts,
          eras,
          formats,
          genres: prev.genres || SNAPSHOT_DNA.genres,
          studios: prev.studios || SNAPSHOT_DNA.studios,
          updatedAt: Date.now()
        };

        animeDnaState = baseDna;
        renderAnimeDna(animeDnaState);
        saveDnaCache(animeDnaState);

        // Hydrate real Top Genres & Top Studios from AniList (top 100 highest-rated completed titles)
        // Skip re-fetching AniList if cached live genres/studios are fresh (< 12h)
        const hasFreshMeta = prev && prev.isLive && prev.metaUpdatedAt && (Date.now() - prev.metaUpdatedAt < 12 * 3600 * 1000) && prev.genres?.length && prev.studios?.length;
        if (hasFreshMeta) {
          animeDnaState.metaUpdatedAt = prev.metaUpdatedAt;
          saveDnaCache(animeDnaState);
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
            animeDnaState.genres = topGenres.map(([name, wVal]) => ({
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
            animeDnaState.studios = topStudios.map(([name, count]) => ({
              name,
              count,
              pct: Math.round((count / maxS) * 100)
            }));
          }

          animeDnaState.metaUpdatedAt = Date.now();
          saveDnaCache(animeDnaState);
          renderAnimeDna(animeDnaState);
        } catch (e) {
          console.warn('AniList DNA meta sync failed:', e);
        }
      }

      /* =========================================
         STAGE 5: WATCHING NOW SHELF RENDER & CONTROLS
         ========================================= */
      let updateWatchingNavRef = null;

      function renderWatchingShelf(items) {
        const shelf = document.getElementById('watching-shelf');
        const section = document.getElementById('watching');
        if (!shelf) return;

        const list = (items && items.length) ? items : SNAPSHOT.watching;
        if (!list || !list.length) {
          if (section) section.style.display = 'none';
          return;
        }
        if (section) section.style.display = '';

        shelf.innerHTML = list.map((item) => {
          const coverKey = 'anime_' + item.malId;
          const imgSrc = coverCache[coverKey] || item.shikiImg || '';
          const ep = Number(item.episodes) || 0;
          const total = Number(item.totalEpisodes) || 0;
          const hasTotal = total > 0 && !item.ongoing;
          const pct = hasTotal
            ? Math.max(4, Math.min(100, Math.round((ep / total) * 100)))
            : (ep > 0 ? Math.min(88, 22 + Math.round(Math.log2(ep + 1) * 10)) : 12);
          const epText = total > 0 ? `${ep} / ${total} эп.` : `${ep} / ? эп.`;
          const statusTag = item.status === 'rewatching'
            ? 'Пересматриваю'
            : (item.ongoing ? 'Онгоинг' : (item.kind || 'Аниме'));

          return `
            <article class="watching-card" data-watch-id="${item.malId}">
              <div class="watching-poster">
                <img
                  data-cover-key="${coverKey}"
                  data-fallback-src="${escapeHtml(item.shikiImg || '')}"
                  src="${escapeHtml(imgSrc)}"
                  alt="${escapeHtml(item.title)}"
                  loading="lazy"
                />
              </div>
              <div class="watching-info">
                <div class="watching-title">${escapeHtml(item.title)}</div>
                <div class="watching-meta-row">
                  <span class="watching-kind-tag">${escapeHtml(statusTag)}${item.year ? ' · ' + item.year : ''}</span>
                  <span class="watching-ep-badge">${escapeHtml(epText)}</span>
                </div>
                <div class="watching-progress-track">
                  <div class="watching-progress-fill ${!hasTotal ? 'is-ongoing' : ''}" style="width:${pct}%"></div>
                </div>
              </div>
            </article>
          `;
        }).join('');

        attachImageHandlers(shelf);

        shelf.querySelectorAll('.watching-card').forEach((card) => {
          card.addEventListener('click', () => {
            if (shelf.dataset.wasDragged === '1') return;
            const item = list.find((x) => String(x.malId) === card.dataset.watchId);
            if (!item) return;
            const img = card.querySelector('img');
            const epText = item.totalEpisodes > 0
              ? `Просмотрено ${item.episodes} из ${item.totalEpisodes} эп.`
              : `Просмотрено ${item.episodes} эп.`;
            const pills = [
              epText,
              item.userScore ? `Моя оценка ${item.userScore}/10` : null,
              item.score ? `★ ${Number(item.score).toFixed(2)}` : null,
              item.year ? String(item.year) : null
            ].filter(Boolean);

            openModal({
              tag: item.status === 'rewatching' ? 'ПЕРЕСМАТРИВАЮ СЕЙЧАС' : 'СЕЙЧАС СМОТРЮ · SHIKIMORI LIVE',
              title: item.title,
              sub: [item.kind, item.ongoing ? 'Онгоинг' : null, item.year].filter(Boolean).join(' · '),
              pills,
              vibes: [
                item.status === 'rewatching' ? '#пересмотр' : '#в процессе',
                item.ongoing ? '#онгоинг' : '#список смотрю'
              ],
              note: item.comment || 'Тайтл прямо сейчас находится в списке «Смотрю» профиля undereror nyashka на Shikimori.',
              img: img ? img.src : (coverCache['anime_' + item.malId] || item.shikiImg || ''),
              url: item.url || `${activeShikiOrigin}/animes/${item.malId}`
            });
          });
        });

        if (typeof updateWatchingNavRef === 'function') {
          requestAnimationFrame(updateWatchingNavRef);
        }
      }

      function initWatchingControls() {
        const slider = document.getElementById('watching-shelf');
        const prevBtn = document.getElementById('watching-prev');
        const nextBtn = document.getElementById('watching-next');
        const counter = document.getElementById('watching-counter');
        if (!slider) return;

        const cardUnit = 292;
        const stepPx = cardUnit * 2;

        function updateNavState() {
          const totalCards = slider.querySelectorAll('.watching-card').length;
          const maxScroll = Math.max(0, slider.scrollWidth - slider.clientWidth);
          if (prevBtn) prevBtn.disabled = slider.scrollLeft <= 4;
          if (nextBtn) nextBtn.disabled = slider.scrollLeft >= maxScroll - 4;

          if (counter && totalCards > 0) {
            const firstIdx = Math.min(totalCards, Math.max(1, Math.round(slider.scrollLeft / cardUnit) + 1));
            const visibleCount = Math.max(1, Math.floor((slider.clientWidth + 14) / cardUnit));
            const lastIdx = Math.min(totalCards, firstIdx + visibleCount - 1);
            counter.textContent = `${formatRank(firstIdx)}–${formatRank(lastIdx)} / ${formatRank(totalCards)}`;
          }
        }

        updateWatchingNavRef = updateNavState;

        prevBtn?.addEventListener('click', () => {
          slider.scrollBy({ left: -stepPx, behavior: 'smooth' });
        });

        nextBtn?.addEventListener('click', () => {
          slider.scrollBy({ left: stepPx, behavior: 'smooth' });
        });

        slider.addEventListener('scroll', updateNavState, { passive: true });
        window.addEventListener('resize', updateNavState);

        let isDown = false;
        let startX = 0;
        let scrollLeft = 0;
        let moved = 0;

        slider.addEventListener('mousedown', (e) => {
          isDown = true;
          moved = 0;
          slider.dataset.wasDragged = '0';
          slider.classList.add('is-dragging');
          startX = e.pageX - slider.offsetLeft;
          scrollLeft = slider.scrollLeft;
        });

        window.addEventListener('mouseup', () => {
          if (!isDown) return;
          isDown = false;
          slider.classList.remove('is-dragging');
          if (moved > 8) {
            slider.dataset.wasDragged = '1';
            setTimeout(() => { slider.dataset.wasDragged = '0'; }, 80);
          }
        });

        slider.addEventListener('mousemove', (e) => {
          if (!isDown) return;
          e.preventDefault();
          const x = e.pageX - slider.offsetLeft;
          const walk = (x - startX) * 1.35;
          moved = Math.abs(x - startX);
          slider.scrollLeft = scrollLeft - walk;
        });

        requestAnimationFrame(updateNavState);
      }

      /* =========================================
         STAGE 5: GLASS SPOTLIGHT (EDGE + SURFACE REVEAL)
         ========================================= */
      function initGlassSpotlight() {
        const isFine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
        if (!isFine) return;

        const SELECTOR = '.glass-card, .discord-card, .watching-card, .music-dock, .modal-card, .arena-card';
        const PROXIMITY = 220;
        let rafPending = false;
        let lastX = -9999;
        let lastY = -9999;
        let cachedSurfaces = [];
        let lastCacheAt = 0;

        function updateSurfaces() {
          rafPending = false;
          if (document.body.classList.contains('galaxy-active') || document.getElementById('holo-modal')?.classList.contains('is-open') || document.getElementById('pack-modal')?.classList.contains('is-open') || document.getElementById('trophy-modal')?.classList.contains('is-open')) {
            return;
          }
          const now = performance.now();
          if (!cachedSurfaces.length || now - lastCacheAt > 1800) {
            cachedSurfaces = Array.from(document.querySelectorAll(SELECTOR));
            lastCacheAt = now;
          }
          const vh = window.innerHeight;
          for (let i = 0; i < cachedSurfaces.length; i++) {
            const el = cachedSurfaces[i];
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0 || rect.bottom < -PROXIMITY || rect.top > vh + PROXIMITY) continue;

            const withinX = lastX >= rect.left - PROXIMITY && lastX <= rect.right + PROXIMITY;
            const withinY = lastY >= rect.top - PROXIMITY && lastY <= rect.bottom + PROXIMITY;

            if (withinX && withinY) {
              el.style.setProperty('--spot-x', (lastX - rect.left).toFixed(1) + 'px');
              el.style.setProperty('--spot-y', (lastY - rect.top).toFixed(1) + 'px');
              if (el.dataset.spotOn !== '1') {
                el.dataset.spotOn = '1';
                el.style.setProperty('--spot-o', '1');
              }
            } else if (el.dataset.spotOn === '1') {
              el.dataset.spotOn = '0';
              el.style.setProperty('--spot-o', '0');
            }
          }
        }

        window.addEventListener('pointermove', (e) => {
          if (e.pointerType && e.pointerType !== 'mouse') return;
          lastX = e.clientX;
          lastY = e.clientY;
          if (!rafPending) {
            rafPending = true;
            requestAnimationFrame(updateSurfaces);
          }
        }, { passive: true });

        document.addEventListener('mouseleave', () => {
          lastX = -9999;
          lastY = -9999;
          document.querySelectorAll(SELECTOR).forEach((el) => {
            el.style.setProperty('--spot-o', '0');
          });
        });
      }

      /* =========================================
         RENDERING: WAIFU CAROUSEL + ARROWS + COUNTER
         ========================================= */
      function renderWaifu() {
        const wrap = document.getElementById('waifu-carousel');
        if (!wrap) return;

        wrap.innerHTML = WAIFU_LIST.map((ch) => {
          const coverKey = 'char_' + ch.key;
          const imgSrc = coverCache[coverKey] || ch.shikiImg || '';
          const rarity = getHoloRarity(ch.rank);
          const classes = ['waifu-card'];
          if (ch.rank <= 5) classes.push('is-top5');
          if (ch.rank === 1) classes.push('is-top1');
          return `
            <article class="${classes.join(' ')}" data-waifu-key="${ch.key}" data-rarity="${rarity.key}">
              <span class="waifu-rank">${formatRank(ch.rank)}<em>${rarity.short}</em></span>
              <img
                data-cover-key="${coverKey}"
                src="${escapeHtml(imgSrc)}"
                alt="${escapeHtml(ch.name)}"
                loading="lazy"
              />
              <div class="poster-fallback"><span>✦</span>${escapeHtml(ch.name)}</div>
              <div class="waifu-name">${escapeHtml(ch.name)}</div>
            </article>
          `;
        }).join('');

        wrap.scrollLeft = 0;
        attachImageHandlers(wrap);

        wrap.querySelectorAll('.waifu-card').forEach((card) => {
          card.addEventListener('click', () => {
            if (wrap.dataset.wasDragged === '1') return;
            const idx = WAIFU_LIST.findIndex((x) => x.key === card.dataset.waifuKey);
            if (idx === -1) return;
            openHoloDeck('waifu', idx);
          });
        });
      }

      function initWaifuControls() {
        const slider = document.getElementById('waifu-carousel');
        const prevBtn = document.getElementById('waifu-prev');
        const nextBtn = document.getElementById('waifu-next');
        const counter = document.getElementById('waifu-counter');
        if (!slider) return;

        const stepPx = 148 * 3;
        let cachedClientW = slider.clientWidth || 1;
        let cachedMaxScroll = Math.max(0, slider.scrollWidth - cachedClientW);
        let navRaf = false;
        let scrollEndTimer = null;

        function measureMetrics() {
          cachedClientW = slider.clientWidth || 1;
          cachedMaxScroll = Math.max(0, slider.scrollWidth - cachedClientW);
        }

        function updateNavState(remeasure) {
          navRaf = false;
          if (remeasure) measureMetrics();
          const sl = slider.scrollLeft;
          const total = Math.max(1, WAIFU_LIST.length);
          if (prevBtn) prevBtn.disabled = sl <= 4;
          if (nextBtn) nextBtn.disabled = sl >= cachedMaxScroll - 4;

          if (counter) {
            const firstIdx = Math.min(total, Math.max(1, Math.round(sl / 148) + 1));
            const visibleCount = Math.max(1, Math.floor((cachedClientW + 16) / 148));
            const lastIdx = Math.min(total, firstIdx + visibleCount - 1);
            counter.textContent = `${formatRank(firstIdx)}–${formatRank(lastIdx)} / ${formatRank(total)}`;
          }
        }

        prevBtn?.addEventListener('click', () => {
          slider.scrollBy({ left: -stepPx, behavior: 'smooth' });
        });

        nextBtn?.addEventListener('click', () => {
          slider.scrollBy({ left: stepPx, behavior: 'smooth' });
        });

        slider.addEventListener('scroll', () => {
          if (!slider.classList.contains('is-scrolling')) slider.classList.add('is-scrolling');
          clearTimeout(scrollEndTimer);
          scrollEndTimer = setTimeout(() => slider.classList.remove('is-scrolling'), 130);
          if (!navRaf) {
            navRaf = true;
            requestAnimationFrame(() => updateNavState(false));
          }
        }, { passive: true });
        window.addEventListener('resize', () => updateNavState(true));

        // Mouse drag support
        let isDown = false;
        let startX = 0;
        let scrollLeft = 0;
        let moved = 0;

        slider.addEventListener('mousedown', (e) => {
          isDown = true;
          moved = 0;
          slider.dataset.wasDragged = '0';
          slider.classList.add('is-dragging');
          startX = e.pageX - slider.offsetLeft;
          scrollLeft = slider.scrollLeft;
        });

        window.addEventListener('mouseup', () => {
          if (!isDown) return;
          isDown = false;
          slider.classList.remove('is-dragging');
          if (moved > 8) {
            slider.dataset.wasDragged = '1';
            setTimeout(() => { slider.dataset.wasDragged = '0'; }, 80);
          }
        });

        slider.addEventListener('mousemove', (e) => {
          if (!isDown) return;
          e.preventDefault();
          const x = e.pageX - slider.offsetLeft;
          const walk = (x - startX) * 1.35;
          moved = Math.abs(x - startX);
          slider.scrollLeft = scrollLeft - walk;
        });

        // Initial check after layout
        requestAnimationFrame(updateNavState);
      }

      /* =========================================
         COLLECTION (PEAK FICTION / LITERALLY ME)
         ========================================= */
      function renderCollection() {
        const grid = document.getElementById('collection-grid');
        const sortGroup = document.getElementById('sort-controls');
        if (!grid) return;

        const q = searchQuery.trim().toLowerCase();
        grid.classList.toggle('is-showcase', currentView === 'showcase');

        if (sortGroup) {
          sortGroup.style.display = currentTab === 'peak' ? 'flex' : 'none';
        }

        if (currentTab === 'peak') {
          let items = PEAK_FICTION.filter((a) => !q || a.title.toLowerCase().includes(q));
          if (currentSort === 'score') {
            items = [...items].sort((a, b) => b.score - a.score || a.rank - b.rank);
          } else if (currentSort === 'year') {
            items = [...items].sort((a, b) => b.year - a.year || a.rank - b.rank);
          } else {
            items = [...items].sort((a, b) => a.rank - b.rank);
          }

          grid.innerHTML = items.map((a, idx) => {
            const coverKey = 'anime_' + a.malId;
            const imgSrc = coverCache[coverKey] || '';
            const rarity = getHoloRarity(a.rank);
            const classes = ['catalog-card'];
            if (a.rank <= 5) classes.push('is-top5');
            if (a.rank <= 3) classes.push('rank-' + a.rank);
            const vibesHtml = (a.vibes || []).slice(0, 3).map((v) =>
              `<span class="sc-vibe-chip">${escapeHtml(v)}</span>`
            ).join('');
            const userScoreNote = a.userScore ? `Моя оценка ${a.userScore}/10 · ` : '';

            return `
              <article class="${classes.join(' ')}" data-type="peak" data-id="${a.malId}" data-rarity="${rarity.key}" style="animation-delay:${(idx * 0.03).toFixed(3)}s">
                <div class="card-serial-bar">
                  <span class="card-serial-num">NO.${formatRank(a.rank)}</span>
                  <span class="card-rarity-tag">// ${rarity.short}</span>
                </div>
                <div class="poster-box">
                  <span class="score-pill">★ ${a.score.toFixed(2)}</span>
                  <img data-cover-key="${coverKey}" src="${escapeHtml(imgSrc)}" alt="${escapeHtml(a.title)}" loading="lazy" />
                  <div class="poster-glare" aria-hidden="true"></div>
                  <div class="poster-fallback"><span>◈</span>${escapeHtml(a.title)}</div>
                </div>
                <div class="card-grid-footer">
                  <div class="card-title">${escapeHtml(a.title)}</div>
                  <div class="card-meta">
                    <span>${escapeHtml(a.kind)}</span>
                    <span>${a.year}</span>
                  </div>
                </div>
                <div class="card-showcase-body">
                  <div class="sc-head-row">
                    <span class="sc-serial">NO.${formatRank(a.rank)} <span class="card-rarity-tag">// ${rarity.short}</span></span>
                    <span>${escapeHtml(a.kind)} · ${a.year}</span>
                  </div>
                  <h3 class="sc-title">${escapeHtml(a.title)}</h3>
                  <p class="sc-note">«${escapeHtml(a.note)}»</p>
                  <div class="sc-vibes">${vibesHtml}</div>
                  <div class="sc-foot-row">
                    <span>${escapeHtml(userScoreNote)}Шики ★ ${a.score.toFixed(2)}</span>
                    <span class="sc-cta">◈ 3D-карта →</span>
                  </div>
                </div>
              </article>
            `;
          }).join('');
        } else {
          const items = LITERALLY_ME.filter((c) => !q || c.name.toLowerCase().includes(q) || c.anime.toLowerCase().includes(q));
          grid.innerHTML = items.map((c, idx) => {
            const coverKey = 'char_' + c.key;
            const imgSrc = coverCache[coverKey] || '';
            const rarity = getHoloRarity(c.rank);
            const classes = ['catalog-card'];
            if (c.rank <= 5) classes.push('is-top5');
            if (c.rank <= 3) classes.push('rank-' + c.rank);

            return `
              <article class="${classes.join(' ')}" data-type="literally" data-id="${c.key}" data-rarity="${rarity.key}" style="animation-delay:${(idx * 0.03).toFixed(3)}s">
                <div class="card-serial-bar">
                  <span class="card-serial-num">NO.${formatRank(c.rank)}</span>
                  <span class="card-rarity-tag">// ${rarity.short}</span>
                </div>
                <div class="poster-box">
                  <img data-cover-key="${coverKey}" src="${escapeHtml(imgSrc)}" alt="${escapeHtml(c.name)}" loading="lazy" />
                  <div class="poster-glare" aria-hidden="true"></div>
                  <div class="poster-fallback"><span>✦</span>${escapeHtml(c.name)}</div>
                </div>
                <div class="card-grid-footer">
                  <div class="card-title">${escapeHtml(c.name)}</div>
                  <div class="card-meta">
                    <span>${escapeHtml(c.anime)}</span>
                  </div>
                </div>
                <div class="card-showcase-body">
                  <div class="sc-head-row">
                    <span class="sc-serial">NO.${formatRank(c.rank)} <span class="card-rarity-tag">// ${rarity.short}</span></span>
                    <span>LITERALLY ME</span>
                  </div>
                  <h3 class="sc-title">${escapeHtml(c.name)}</h3>
                  <p class="sc-note">Персонаж из личного списка «literally me» — точное попадание в характер, мотивацию и внутренний вайб тайтла ${escapeHtml(c.anime)}.</p>
                  <div class="sc-vibes">
                    <span class="sc-vibe-chip">#literally-me</span>
                    <span class="sc-vibe-chip">#${rarity.key}</span>
                  </div>
                  <div class="sc-foot-row">
                    <span>${escapeHtml(c.anime)}</span>
                    <span class="sc-cta">◈ 3D-карта →</span>
                  </div>
                </div>
              </article>
            `;
          }).join('');
        }

        attachImageHandlers(grid);
        attachCardInteractions(grid);
      }

      function attachImageHandlers(root) {
        root.querySelectorAll('img').forEach((img) => {
          const markLoaded = () => {
            if (img.naturalWidth > 0) img.classList.add('loaded');
          };
          if (img.getAttribute('src')) {
            if (img.complete && img.naturalWidth > 0) {
              img.classList.add('loaded');
            } else {
              img.addEventListener('load', markLoaded, { once: true });
            }
          }
          img.addEventListener('error', () => {
            const fallback = img.dataset.fallbackSrc;
            if (fallback && img.src !== fallback) {
              img.dataset.fallbackSrc = '';
              img.src = fallback;
            } else {
              img.classList.remove('loaded');
            }
          });
        });
      }

      function applyCoverToDOM(coverKey, url) {
        if (!url) return;
        document.querySelectorAll(`img[data-cover-key="${coverKey}"]`).forEach((img) => {
          if (img.getAttribute('src') === url && img.classList.contains('loaded')) return;
          img.onload = () => {
            if (img.naturalWidth > 0) img.classList.add('loaded');
          };
          img.src = url;
          if (img.complete && img.naturalWidth > 0) {
            img.classList.add('loaded');
          }
        });
      }

      function attachCardInteractions(grid) {
        const isFine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

        grid.querySelectorAll('.catalog-card').forEach((card) => {
          if (isFine) {
            let raf = null;
            let lx = 0, ly = 0;
            let cachedRect = null;

            card.addEventListener('pointerenter', () => {
              cachedRect = card.getBoundingClientRect();
              card.classList.add('is-tilting');
            });

            card.addEventListener('pointermove', (e) => {
              if (e.pointerType && e.pointerType !== 'mouse') return;
              lx = e.clientX;
              ly = e.clientY;
              if (raf !== null) return;
              raf = requestAnimationFrame(() => {
                raf = null;
                const rect = cachedRect || card.getBoundingClientRect();
                if (!rect.width || !rect.height) return;
                const nx = Math.max(0, Math.min(1, (lx - rect.left) / rect.width));
                const ny = Math.max(0, Math.min(1, (ly - rect.top) / rect.height));
                const dx = nx - 0.5;
                const dy = ny - 0.5;
                const maxTilt = currentView === 'showcase' ? 6 : 11;
                card.style.setProperty('--lift', '-6px');
                card.style.setProperty('--rx', `${(-dy * maxTilt).toFixed(2)}deg`);
                card.style.setProperty('--ry', `${(dx * maxTilt).toFixed(2)}deg`);
                card.style.setProperty('--cx', (dx * 2).toFixed(3));
                card.style.setProperty('--cy', (dy * 2).toFixed(3));
                card.style.setProperty('--gx', `${(nx * 100).toFixed(1)}%`);
                card.style.setProperty('--gy', `${(ny * 100).toFixed(1)}%`);
              });
            });

            card.addEventListener('pointerleave', () => {
              if (raf !== null) { cancelAnimationFrame(raf); raf = null; }
              cachedRect = null;
              card.classList.remove('is-tilting');
              card.style.setProperty('--lift', '0px');
              card.style.setProperty('--rx', '0deg');
              card.style.setProperty('--ry', '0deg');
              card.style.setProperty('--cx', '0');
              card.style.setProperty('--cy', '0');
            });
          }

          card.addEventListener('click', () => {
            if (card.dataset.type === 'peak') {
              const idx = PEAK_FICTION.findIndex((x) => String(x.malId) === card.dataset.id);
              if (idx !== -1) openHoloDeck('peak', idx);
            } else {
              const idx = LITERALLY_ME.findIndex((x) => x.key === card.dataset.id);
              if (idx !== -1) openHoloDeck('literally', idx);
            }
          });
        });
      }

      /* =========================================
         MODAL CONTROLS
         ========================================= */
      const modalBackdrop = document.getElementById('detail-modal');
      function openModal(data) {
        if (!modalBackdrop) return;
        document.getElementById('modal-tag').textContent = data.tag || '';
        document.getElementById('modal-title').textContent = data.title || '';
        document.getElementById('modal-sub').textContent = data.sub || '';
        document.getElementById('modal-note').textContent = data.note || '';
        const imgEl = document.getElementById('modal-img');
        imgEl.src = data.img || '';
        imgEl.alt = data.title || '';
        const pillsEl = document.getElementById('modal-pills');
        pillsEl.innerHTML = (data.pills || []).map((p) => `<span class="modal-pill">${escapeHtml(p)}</span>`).join('');
        const vibesEl = document.getElementById('modal-vibes');
        if (vibesEl) {
          vibesEl.innerHTML = (data.vibes || []).map((v) => `<span class="vibe-tag">${escapeHtml(v)}</span>`).join('');
          vibesEl.style.display = (data.vibes && data.vibes.length) ? 'flex' : 'none';
        }
        const rerollBtn = document.getElementById('modal-reroll-btn');
        if (rerollBtn) {
          rerollBtn.style.display = data.showReroll ? 'inline-flex' : 'none';
        }
        const modeBar = document.getElementById('modal-mode-bar');
        if (modeBar) {
          modeBar.style.display = data.showModeBar ? 'flex' : 'none';
        }
        const linkEl = document.getElementById('modal-link');
        linkEl.href = data.url || `${activeShikiOrigin}/undereror+nyashka`;

        modalBackdrop.classList.add('is-open');
        modalBackdrop.setAttribute('aria-hidden', 'false');
      }

      function closeModal() {
        if (!modalBackdrop) return;
        modalBackdrop.classList.remove('is-open');
        modalBackdrop.setAttribute('aria-hidden', 'true');
      }

      document.getElementById('modal-close')?.addEventListener('click', closeModal);
      modalBackdrop?.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) closeModal();
      });
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
      });

      /* =========================================
         V14 STAGE 2: 3D HOLOGRAPHIC COLLECTIBLE CARDS ENGINE
         ========================================= */
      let holoDeckType = 'peak';
      let holoDeckIdx = 0;
      let holoIsFlipped = false;

      function getHoloRarity(rank) {
        if (rank <= 3) return { key: 'mythic', label: '★ MYTHIC', short: 'MYTHIC' };
        if (rank <= 10) return { key: 'ssr', label: '◈ SSR', short: 'SSR' };
        return { key: 'sr', label: '◇ SR', short: 'SR' };
      }

      let holoGalaxyList = [];

      function buildHoloDeckItems(type) {
        if (type === 'galaxy') {
          const src = holoGalaxyList.length ? holoGalaxyList : (galaxyNodes.length ? galaxyNodes : buildFallbackGalaxyNodes());
          return src.map((g, idx) => {
            const rankNum = g.peakRank ? g.peakRank : (g.score >= 10 ? 2 : (g.score >= 9 ? 6 : 12));
            const delta = (g.score > 0 && g.shikiScore > 0) ? (g.score - g.shikiScore) : 0;
            const vibes = (g.vibes && g.vibes.length) ? g.vibes : [
              g.isPeak ? '#peak-fiction' : (g.status === 'watching' ? '#смотрю' : '#архив'),
              g.score ? `#${g.score}/10` : '#просмотрено',
              Math.abs(delta) >= 1.5 ? '#hot-take' : (g.year ? `#${g.year}` : '#cosmos')
            ];
            return {
              cat: g.isPeak ? 'PEAK FICTION · GALAXY' : (g.status === 'watching' ? 'СЕЙЧАС СМОТРЮ · GALAXY' : 'ARCHIVE STAR · GALAXY'),
              rank: rankNum,
              displayIdx: idx + 1,
              total: src.length,
              malId: g.id,
              title: g.title,
              sub: [g.kind, g.year].filter(Boolean).join(' · '),
              frontScore: g.score ? `Я ${g.score}/10 · ★${(g.shikiScore || 0).toFixed(2)}` : (g.shikiScore ? `★ ${g.shikiScore.toFixed(2)}` : 'ARCHIVE'),
              pills: [
                g.peakRank ? `Peak #${formatRank(g.peakRank)}` : null,
                g.score ? `Моя оценка ${g.score}/10` : 'Без оценки',
                g.shikiScore ? `Шики ★ ${g.shikiScore.toFixed(2)}` : null,
                g.episodes ? `${g.episodes} эп.` : null,
                g.year ? String(g.year) : null
              ].filter(Boolean),
              vibes,
              note: g.comment || (
                g.isPeak
                  ? 'Избранный тайтл из Peak Fiction — одна из самых ярких звёзд ядра галактики.'
                  : g.score >= 9
                    ? `Высоко оценённый тайтл (${g.score}/10) из архива undereror nyashka на Shikimori.`
                    : 'Тайтл из полного архива просмотренных аниме undereror nyashka.'
              ),
              img: coverCache['anime_' + g.id] || g.img || '',
              url: g.url || `${activeShikiOrigin}/animes/${g.id}`
            };
          });
        }
        if (type === 'waifu') {
          return WAIFU_LIST.map((w) => ({
            cat: 'WAIFU',
            rank: w.rank,
            total: WAIFU_LIST.length,
            title: w.name,
            sub: w.anime,
            frontScore: `#${formatRank(w.rank)}`,
            pills: [`Топ #${formatRank(w.rank)}`, w.anime, 'Избранное'],
            vibes: ['#waifu', w.rank <= 3 ? '#mythic' : (w.rank <= 10 ? '#ssr' : '#sr'), '#избранное'],
            note: 'Избранный персонаж из личной коллекции WAIFU профиля undereror nyashka на Shikimori.',
            img: coverCache['char_' + w.key] || w.shikiImg || '',
            url: w.url || `${activeShikiOrigin}/undereror+nyashka/favorites`
          }));
        }
        if (type === 'literally') {
          return LITERALLY_ME.map((c) => ({
            cat: 'LITERALLY ME',
            rank: c.rank,
            total: LITERALLY_ME.length,
            title: c.name,
            sub: c.anime,
            frontScore: `#${formatRank(c.rank)}`,
            pills: [`#${formatRank(c.rank)}`, c.anime, 'Literally Me'],
            vibes: ['#literally-me', c.rank <= 3 ? '#mythic' : (c.rank <= 10 ? '#ssr' : '#sr'), '#персонаж'],
            note: 'Персонаж из личного списка «literally me» профиля undereror nyashka — максимальное попадание в характер и вайб.',
            img: coverCache['char_' + c.key] || '',
            url: `${activeShikiOrigin}/characters?search=${encodeURIComponent(c.search)}`
          }));
        }
        return PEAK_FICTION.map((a) => ({
          cat: 'PEAK FICTION',
          rank: a.rank,
          total: PEAK_FICTION.length,
          title: a.title,
          sub: `${a.kind} · ${a.year}`,
          frontScore: a.userScore ? `${a.userScore}/10 · ★${a.score.toFixed(2)}` : `★ ${a.score.toFixed(2)}`,
          pills: [
            `Топ #${formatRank(a.rank)}`,
            a.userScore ? `Моя оценка ${a.userScore}/10` : null,
            `Шики ★ ${a.score.toFixed(2)}`,
            String(a.year)
          ].filter(Boolean),
          vibes: a.vibes || ['#peak-fiction'],
          note: a.note,
          img: coverCache['anime_' + a.malId] || '',
          url: `${activeShikiOrigin}/animes/${a.malId}`
        }));
      }

      function renderCurrentHoloCard() {
        const items = buildHoloDeckItems(holoDeckType);
        if (!items.length) return;
        holoDeckIdx = (holoDeckIdx + items.length) % items.length;
        const item = items[holoDeckIdx];
        const rarity = getHoloRarity(item.rank);
        const serialNum = item.displayIdx || item.rank;
        const serialStr = `#${formatRank(serialNum)} / ${formatRank(item.total)}`;

        const tiltWrap = document.getElementById('holo-tilt-wrap');
        const flipper = document.getElementById('holo-flipper');
        if (tiltWrap) tiltWrap.dataset.rarity = rarity.key;
        if (flipper) flipper.classList.toggle('is-flipped', holoIsFlipped);

        const imgEl = document.getElementById('holo-img');
        if (imgEl) {
          imgEl.src = item.img || '';
          imgEl.alt = item.title;
          if (item.malId && !coverCache['anime_' + item.malId]) {
            loadAnimeCoversBatch([item.malId]).then(() => {
              const hd = coverCache['anime_' + item.malId];
              if (hd && imgEl.alt === item.title) imgEl.src = hd;
            });
          }
        }
        const rarityEl = document.getElementById('holo-rarity-chip');
        if (rarityEl) rarityEl.textContent = rarity.label;
        const serialEl = document.getElementById('holo-serial');
        if (serialEl) serialEl.textContent = serialStr;
        const catEl = document.getElementById('holo-cat-label');
        if (catEl) catEl.textContent = item.cat;
        const fTitleEl = document.getElementById('holo-front-title');
        if (fTitleEl) fTitleEl.textContent = item.title;
        const fSubEl = document.getElementById('holo-front-sub');
        if (fSubEl) fSubEl.textContent = item.sub;
        const fScoreEl = document.getElementById('holo-front-score');
        if (fScoreEl) fScoreEl.textContent = item.frontScore;

        const bDeckEl = document.getElementById('holo-back-deck');
        if (bDeckEl) bDeckEl.textContent = `${item.cat} // DOSSIER`;
        const bSerEl = document.getElementById('holo-back-serial');
        if (bSerEl) bSerEl.textContent = `${serialStr} · ${rarity.short}`;
        const bTitleEl = document.getElementById('holo-back-title');
        if (bTitleEl) bTitleEl.textContent = item.title;
        const bSubEl = document.getElementById('holo-back-sub');
        if (bSubEl) bSubEl.textContent = item.sub;
        const bPillsEl = document.getElementById('holo-back-pills');
        if (bPillsEl) {
          bPillsEl.innerHTML = item.pills.map((p) => `<span class="modal-pill">${escapeHtml(p)}</span>`).join('');
        }
        const bNoteEl = document.getElementById('holo-back-note-text');
        if (bNoteEl) bNoteEl.textContent = item.note;
        const bVibesEl = document.getElementById('holo-back-vibes');
        if (bVibesEl) {
          bVibesEl.innerHTML = (item.vibes || []).map((v) => `<span class="vibe-tag">${escapeHtml(v)}</span>`).join('');
        }
        const linkEl = document.getElementById('holo-link');
        if (linkEl) linkEl.href = item.url;

        const flipBtn = document.getElementById('holo-flip-btn');
        if (flipBtn) flipBtn.textContent = holoIsFlipped ? '↻ Показать арт' : '↻ Перевернуть';
      }

      function openHoloDeck(type, idx) {
        const backdrop = document.getElementById('holo-modal');
        const tiltWrap = document.getElementById('holo-tilt-wrap');
        if (!backdrop) return;
        holoDeckType = type || 'peak';
        holoDeckIdx = Number(idx) || 0;
        holoIsFlipped = false;

        if (tiltWrap) {
          tiltWrap.style.setProperty('--rx', '0deg');
          tiltWrap.style.setProperty('--ry', '0deg');
          tiltWrap.style.setProperty('--hx', '50%');
          tiltWrap.style.setProperty('--hy', '50%');
          tiltWrap.style.setProperty('--hbg-x', '50%');
          tiltWrap.style.setProperty('--hbg-y', '50%');
          tiltWrap.style.setProperty('--hop', '0.26');
        }

        renderCurrentHoloCard();
        backdrop.classList.add('is-open');
        backdrop.setAttribute('aria-hidden', 'false');
      }

      function initHoloCardViewer() {
        const backdrop = document.getElementById('holo-modal');
        const closeBtn = document.getElementById('holo-close');
        const tiltWrap = document.getElementById('holo-tilt-wrap');
        const flipper = document.getElementById('holo-flipper');
        const flipBtn = document.getElementById('holo-flip-btn');
        const prevBtn = document.getElementById('holo-prev-btn');
        const nextBtn = document.getElementById('holo-next-btn');
        const linkEl = document.getElementById('holo-link');
        if (!backdrop || !tiltWrap || !flipper) return;

        let pointerDragged = false;
        let downX = 0;
        let downY = 0;

        function closeHolo() {
          backdrop.classList.remove('is-open');
          backdrop.setAttribute('aria-hidden', 'true');
        }

        function toggleFlip() {
          holoIsFlipped = !holoIsFlipped;
          flipper.classList.toggle('is-flipped', holoIsFlipped);
          if (flipBtn) flipBtn.textContent = holoIsFlipped ? '↻ Показать арт' : '↻ Перевернуть';
        }

        function stepCard(dir) {
          holoIsFlipped = false;
          holoDeckIdx += dir;
          renderCurrentHoloCard();
        }

        function applyTiltFromPoint(clientX, clientY) {
          const rect = tiltWrap.getBoundingClientRect();
          if (!rect.width || !rect.height) return;
          const nx = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
          const ny = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
          const dx = nx - 0.5;
          const dy = ny - 0.5;
          const rx = (-dy * 26).toFixed(2);
          const ry = (dx * 28).toFixed(2);
          const intensity = Math.min(0.85, 0.24 + Math.hypot(dx, dy) * 0.95);

          tiltWrap.classList.remove('is-resetting');
          tiltWrap.style.setProperty('--rx', `${rx}deg`);
          tiltWrap.style.setProperty('--ry', `${ry}deg`);
          tiltWrap.style.setProperty('--hx', `${(nx * 100).toFixed(1)}%`);
          tiltWrap.style.setProperty('--hy', `${(ny * 100).toFixed(1)}%`);
          tiltWrap.style.setProperty('--hbg-x', `${(18 + nx * 64).toFixed(1)}%`);
          tiltWrap.style.setProperty('--hbg-y', `${(18 + ny * 64).toFixed(1)}%`);
          tiltWrap.style.setProperty('--hop', intensity.toFixed(3));
        }

        function resetTilt() {
          tiltWrap.classList.add('is-resetting');
          tiltWrap.style.setProperty('--rx', '0deg');
          tiltWrap.style.setProperty('--ry', '0deg');
          tiltWrap.style.setProperty('--hx', '50%');
          tiltWrap.style.setProperty('--hy', '50%');
          tiltWrap.style.setProperty('--hbg-x', '50%');
          tiltWrap.style.setProperty('--hbg-y', '50%');
          tiltWrap.style.setProperty('--hop', '0.24');
        }

        tiltWrap.addEventListener('pointerdown', (e) => {
          downX = e.clientX;
          downY = e.clientY;
          pointerDragged = false;
        });

        tiltWrap.addEventListener('pointermove', (e) => {
          if (e.pointerType === 'touch' && e.buttons === 0) return;
          if (Math.hypot(e.clientX - downX, e.clientY - downY) > 10) {
            pointerDragged = true;
          }
          applyTiltFromPoint(e.clientX, e.clientY);
        });

        tiltWrap.addEventListener('pointerleave', resetTilt);
        tiltWrap.addEventListener('pointerup', (e) => {
          if (e.pointerType === 'touch') resetTilt();
        });
        tiltWrap.addEventListener('pointercancel', resetTilt);

        tiltWrap.addEventListener('click', (e) => {
          if (e.target && e.target.closest('a, button')) return;
          if (pointerDragged) {
            pointerDragged = false;
            return;
          }
          toggleFlip();
        });

        linkEl?.addEventListener('click', (e) => e.stopPropagation());
        flipBtn?.addEventListener('click', toggleFlip);
        prevBtn?.addEventListener('click', () => stepCard(-1));
        nextBtn?.addEventListener('click', () => stepCard(1));
        closeBtn?.addEventListener('click', closeHolo);
        backdrop.addEventListener('click', (e) => {
          if (e.target === backdrop) closeHolo();
        });

        window.addEventListener('keydown', (e) => {
          if (!backdrop.classList.contains('is-open')) return;
          if (e.key === 'Escape') {
            closeHolo();
          } else if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            toggleFlip();
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            stepCard(-1);
          } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            stepCard(1);
          }
        });
      }

      /* =========================================
         V14 STAGE 2: MOBILE TIKTOK BOTTOM DOCK CONTROLLER
         ========================================= */
      function initMobileTikTokDock() {
        const dockNav = document.getElementById('mobile-dock');
        const musicDock = document.getElementById('music-dock');
        const musicBtn = document.getElementById('mdock-music-btn');
        const arenaBtn = document.getElementById('mdock-arena-btn');
        const randomBtn = document.getElementById('mdock-random-btn');
        const sectionLinks = Array.from(document.querySelectorAll('[data-mdock-sec]'));
        if (!dockNav) return;

        function setMobileMusicOpen(open) {
          if (!musicDock || !musicBtn) return;
          musicDock.classList.toggle('is-mobile-open', open);
          musicBtn.classList.toggle('is-open', open);
          musicBtn.setAttribute('aria-expanded', String(open));
        }

        musicBtn?.addEventListener('click', (e) => {
          e.stopPropagation();
          const next = !musicDock?.classList.contains('is-mobile-open');
          setMobileMusicOpen(next);
        });

        arenaBtn?.addEventListener('click', () => {
          setMobileMusicOpen(false);
          document.getElementById('collection-arena-btn')?.click();
        });

        randomBtn?.addEventListener('click', () => {
          setMobileMusicOpen(false);
          document.getElementById('randomizer-btn')?.click();
        });

        sectionLinks.forEach((link) => {
          link.addEventListener('click', (e) => {
            setMobileMusicOpen(false);
            sectionLinks.forEach((l) => l.classList.toggle('is-active', l === link));
            const targetId = link.dataset.mdockSec;
            const targetEl = targetId ? document.getElementById(targetId) : null;
            if (targetEl) {
              e.preventDefault();
              targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          });
        });

        // Close mobile music drawer when tapping outside
        document.addEventListener('click', (e) => {
          if (!musicDock || !musicDock.classList.contains('is-mobile-open')) return;
          if (!musicDock.contains(e.target) && !dockNav.contains(e.target)) {
            setMobileMusicOpen(false);
          }
        });

        // Highlight active section while scrolling on mobile
        if ('IntersectionObserver' in window) {
          const observedIds = ['profile', 'compatibility'];
          const io = new IntersectionObserver(
            (entries) => {
              entries.forEach((entry) => {
                if (entry.isIntersecting) {
                  const id = entry.target.id;
                  sectionLinks.forEach((l) => l.classList.toggle('is-active', l.dataset.mdockSec === id));
                }
              });
            },
            { rootMargin: '-35% 0px -50% 0px', threshold: 0.05 }
          );
          observedIds.forEach((id) => {
            const el = document.getElementById(id);
            if (el) io.observe(el);
          });
        }
      }

      /* =========================================
         COVER LOADING ENGINE (ANILIST BATCH + SEQUENTIAL JIKAN FALLBACK)
         ========================================= */
      async function anilistQuery(query, variables) {
        const res = await fetch(ANILIST_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ query, variables })
        });
        if (!res.ok) throw new Error('AniList HTTP ' + res.status);
        const json = await res.json();
        return json.data || {};
      }

      async function loadAnimeCoversBatch(malIds) {
        const missing = [...new Set(malIds)].filter((id) => id && !coverCache['anime_' + id]);
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
              coverCache['anime_' + m.idMal] = url;
              applyCoverToDOM('anime_' + m.idMal, url);
            }
          });
          saveCoverCache();
        } catch (err) {
          console.warn('AniList anime batch failed:', err);
        }

        const stillMissing = missing.filter((id) => !coverCache['anime_' + id]);
        if (stillMissing.length) {
          try {
            const res = await fetch(`${activeShikiOrigin}/api/animes?ids=${stillMissing.join(',')}&limit=50`);
            if (res.ok) {
              const items = await res.json();
              items.forEach((a) => {
                const raw = a?.image?.original || a?.image?.preview;
                if (a.id && raw) {
                  const full = normalizeShikiUrl(raw, activeShikiOrigin);
                  coverCache['anime_' + a.id] = full;
                  applyCoverToDOM('anime_' + a.id, full);
                }
              });
              saveCoverCache();
            }
          } catch (e) {}
        }
      }

      async function loadCharacterCoversBatch(charList) {
        const missing = charList.filter((c) => !coverCache['char_' + c.key]);
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
                coverCache['char_' + c.key] = url;
                applyCoverToDOM('char_' + c.key, url);
              }
            });
            saveCoverCache();
          } catch (err) {
            console.warn('AniList character batch failed:', err);
          }

          if (offset + 16 < missing.length) await sleep(250);
        }

        const unresolved = missing.filter((c) => !coverCache['char_' + c.key]);
        for (const c of unresolved) {
          let attempts = 0;
          while (attempts < 2) {
            attempts++;
            try {
              const res = await fetch(`https://api.jikan.moe/v4/characters?q=${encodeURIComponent(c.search)}&limit=1&order_by=favorites&sort=desc`);
              if (res.status === 429) {
                await sleep(1600);
                continue;
              }
              if (res.ok) {
                const json = await res.json();
                const url = json?.data?.[0]?.images?.jpg?.image_url || json?.data?.[0]?.images?.webp?.image_url;
                if (url) {
                  coverCache['char_' + c.key] = url;
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
      function formatRelativeTime(iso) {
        if (!iso) return '';
        const diffSec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
        if (diffSec < 3600) return `${Math.max(1, Math.floor(diffSec / 60))} мин. назад`;
        if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} ч. назад`;
        const days = Math.floor(diffSec / 86400);
        if (days < 30) return `${days} дн. назад`;
        const months = Math.floor(days / 30);
        return `${months} мес. назад`;
      }

      function stripHtml(html) {
        const tmp = document.createElement('div');
        tmp.innerHTML = html || '';
        return (tmp.textContent || tmp.innerText || '').trim();
      }

      function parseShikiActivity(rawActivity) {
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

      async function fetchShikiWithRetry(url, opts) {
        const retries = opts && typeof opts.retries === 'number' ? opts.retries : 3;
        const baseDelay = opts && typeof opts.baseDelay === 'number' ? opts.baseDelay : 750;
        let lastStatus = 0;

        for (let attempt = 0; attempt <= retries; attempt++) {
          try {
            const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
            lastStatus = res.status;
            if (res.ok) {
              const data = await res.json();
              return { ok: true, status: res.status, data };
            }
            if ((res.status === 429 || res.status >= 500) && attempt < retries) {
              const retryAfter = Number(res.headers.get('Retry-After'));
              const waitMs = (isFinite(retryAfter) && retryAfter > 0)
                ? Math.min(6000, Math.max(450, retryAfter * 1000))
                : baseDelay * (attempt + 1) + Math.floor(Math.random() * 250);
              await sleep(waitMs);
              continue;
            }
            return { ok: false, status: res.status, data: null };
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

      async function resolveHostUser() {
        if (hostUserCache && hostUserCache.id) return hostUserCache;
        const origins = [activeShikiOrigin, ...SHIKI_ORIGINS.filter((o) => o !== activeShikiOrigin)];
        for (const origin of origins) {
          const res = await fetchShikiWithRetry(
            `${origin}/api/users/${encodeURIComponent(SHIKI_NICKNAME)}?is_nickname=1`,
            { retries: 2, baseDelay: 700 }
          );
          if (res.ok && res.data && res.data.id) {
            activeShikiOrigin = origin;
            hostUserCache = res.data;
            return hostUserCache;
          }
        }
        return null;
      }

      function processHostAnimeRates(allRates, userStats) {
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
              url: a.url ? normalizeShikiUrl(a.url, activeShikiOrigin) : `${activeShikiOrigin}/animes/${a.id}`,
              shikiImg: rawImg ? normalizeShikiUrl(rawImg, activeShikiOrigin) : '',
              comment: stripHtml(r.text || '').trim()
            });
          });

          if (parsedWatching.length) {
            watchingList = parsedWatching;
            saveWatchingCache();
            renderWatchingShelf(watchingList);
            loadAnimeCoversBatch(parsedWatching.map((x) => x.malId));
          }
        }

        // 2. Completed list -> Anime-DNA & Taste Match base
        const completedRates = allRates.filter(
          (r) => r && r.anime && r.anime.id && r.status === 'completed'
        );
        if (completedRates.length) {
          hydrateDnaFromShikiRates(completedRates, userStats);
        }

        // Also index any non-completed rated entries into myRatesIndex for Taste Match
        allRates.forEach((r) => {
          const a = r && r.anime;
          if (!a || !a.id) return;
          const id = Number(a.id);
          if (!myRatesIndex.has(id) && Number(r.score) > 0) {
            const rawImg = a.image?.original || a.image?.preview || '';
            myRatesIndex.set(id, {
              id,
              s: Number(r.score) || 0,
              g: Number(a.score) || 0,
              t: a.russian || a.name || '',
              img: rawImg ? normalizeShikiUrl(rawImg, activeShikiOrigin) : ''
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
          const shikiImg = rawImg ? normalizeShikiUrl(rawImg, activeShikiOrigin) : '';
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
            url: a.url ? normalizeShikiUrl(a.url, activeShikiOrigin) : `${activeShikiOrigin}/animes/${a.id}`,
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
          ratedAnimePool = extracted;
          saveRatedPoolCache();
          updateRandomizerPoolCounts();
        }

        // 4. Live Hot Takes (Underrated Gems & Overrated Hits vs Shikimori crowd)
        const computedTakes = computeHotTakesFromRates(allRates);
        if (computedTakes) {
          hotTakesState = computedTakes;
          saveHotTakesCache(hotTakesState);
          renderHotTakes(hotTakesState, false);
        }

        // 5. Full 3D Archive Galaxy Dataset (415+ completed + watching + rewatching)
        const galaxySeen = new Set();
        const peakMap = new Map(PEAK_FICTION.map((p) => [p.malId, p]));
        const builtGalaxy = [];

        allRates.forEach((r) => {
          const a = r && r.anime;
          if (!a || !a.id) return;
          if (r.status !== 'completed' && r.status !== 'watching' && r.status !== 'rewatching') return;
          const id = Number(a.id);
          if (galaxySeen.has(id)) return;
          galaxySeen.add(id);

          const peak = peakMap.get(id);
          const kindKey = String(a.kind || 'tv').toLowerCase();
          const rawImg = a.image?.original || a.image?.preview || '';
          const year = a.aired_on ? Number(String(a.aired_on).slice(0, 4)) || null : (peak ? peak.year : null);
          const uScore = Number(r.score) || 0;
          const sScore = Number(a.score) || (peak ? peak.score : 0);

          builtGalaxy.push({
            id,
            title: (peak && peak.title) || a.russian || a.name,
            kind: SHIKI_KIND_LABELS[kindKey] || (peak ? peak.kind : 'Аниме'),
            year,
            score: uScore,
            shikiScore: Number(sScore.toFixed(2)),
            episodes: Number(r.episodes) || Number(a.episodes) || 0,
            status: r.status || 'completed',
            isPeak: Boolean(peak),
            peakRank: peak ? peak.rank : null,
            img: rawImg ? normalizeShikiUrl(rawImg, activeShikiOrigin) : '',
            url: a.url ? normalizeShikiUrl(a.url, activeShikiOrigin) : `${activeShikiOrigin}/animes/${id}`,
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
            img: coverCache['anime_' + p.malId] || '',
            url: `${activeShikiOrigin}/animes/${p.malId}`,
            comment: p.note,
            vibes: p.vibes
          });
        });

        if (builtGalaxy.length) {
          galaxyNodes = builtGalaxy;
          saveGalaxyCache(galaxyNodes);
          if (typeof galaxyRefreshHook === 'function') galaxyRefreshHook();
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
              img: rawImg ? normalizeShikiUrl(rawImg, activeShikiOrigin) : '',
              url: a.url ? normalizeShikiUrl(a.url, activeShikiOrigin) : `${activeShikiOrigin}/animes/${id}`
            });
          });
          if (compactAll.length) {
            hostFullRates = compactAll;
            saveHostFullRatesCache(hostFullRates);
          }
        } catch (e) {}

        // 7. V20: Live Archive Trophies auto-computation from full Shikimori list
        try {
          const computedTrophies = computeTrophiesFromRates(allRates, userStats);
          if (computedTrophies && computedTrophies.items.length) {
            trophiesState = computedTrophies;
            saveTrophiesCache(trophiesState);
            renderTrophiesShowcase();
          }
        } catch (e) {}
        return true;
      }

      async function loadHostAnimeRates(userObj) {
        if (hostRatesPromise) return hostRatesPromise;
        hostRatesPromise = (async () => {
          let ok = false;
          try {
            const u = userObj || await resolveHostUser();
            if (!u || !u.id) return false;
            const first = await fetchShikiWithRetry(
              `${activeShikiOrigin}/api/users/${u.id}/anime_rates?limit=1000`,
              { retries: 3, baseDelay: 800 }
            );
            if (!first.ok || !Array.isArray(first.data)) return false;

            let allRates = first.data;
            if (allRates.length >= 1000) {
              await sleep(320);
              const page2 = await fetchShikiWithRetry(
                `${activeShikiOrigin}/api/users/${u.id}/anime_rates?limit=1000&page=2`,
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
            if (!ok || !ratedAnimePool.length) {
              hostRatesPromise = null;
            }
          }
        })();
        return hostRatesPromise;
      }

      async function syncShikimoriLive() {
        const pill = document.getElementById('api-status-pill');
        const pillText = document.getElementById('api-status-text');

        const user = await resolveHostUser();
        if (!user || !user.id) {
          if (pillText) pillText.textContent = 'SNAPSHOT';
          if (!hotTakesState) renderHotTakes(null, true);
          return;
        }

        if (pill) pill.classList.add('is-live');
        if (pillText) pillText.textContent = 'API · LIVE';

        const avatarEl = document.getElementById('profile-avatar');
        const liveAvatar = user.image?.x160 || user.image?.x148 || user.avatar;
        if (avatarEl && liveAvatar) {
          avatarEl.src = normalizeShikiUrl(liveAvatar, activeShikiOrigin);
        }
        const shikiLink = document.getElementById('shiki-profile-link');
        if (shikiLink && user.url) {
          shikiLink.href = normalizeShikiUrl(user.url, activeShikiOrigin);
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
        if (!ratesLoaded && !hotTakesState) {
          renderHotTakes(null, true);
        }

        // Priority 2: History (limit=30 so after deduplicating same anime we get 5 unique titles)
        await sleep(240);
        try {
          const hRes = await fetchShikiWithRetry(
            `${activeShikiOrigin}/api/users/${user.id}/history?limit=30`,
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
                url: normalizeShikiUrl(t.url, activeShikiOrigin),
                image: rawImg ? normalizeShikiUrl(rawImg, activeShikiOrigin) : ''
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
            `${activeShikiOrigin}/api/users/${user.id}/favourites`,
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
                  if (fc.url) match.url = normalizeShikiUrl(fc.url, activeShikiOrigin);
                  if (fc.image && !coverCache['char_' + match.key]) {
                    const shikiCharImg = normalizeShikiUrl(fc.image, activeShikiOrigin);
                    match.shikiImg = shikiCharImg;
                    applyCoverToDOM('char_' + match.key, shikiCharImg);
                  }
                }
              });
            }
          }
        } catch (e) {}
      }

      /* =========================================
         EVENT BINDINGS & BOOTSTRAP
         ========================================= */
      function initCollectionControls() {
        document.querySelectorAll('.tab-btn').forEach((btn) => {
          btn.addEventListener('click', () => {
            currentTab = btn.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach((b) => {
              const active = b === btn;
              b.classList.toggle('active', active);
              b.setAttribute('aria-selected', String(active));
            });
            renderCollection();
          });
        });

        document.querySelectorAll('.sort-btn').forEach((btn) => {
          btn.addEventListener('click', () => {
            currentSort = btn.dataset.sort;
            document.querySelectorAll('.sort-btn').forEach((b) => b.classList.toggle('active', b === btn));
            renderCollection();
          });
        });

        const viewBtns = Array.from(document.querySelectorAll('.view-toggle-btn'));
        function syncViewButtons() {
          viewBtns.forEach((b) => {
            const on = b.dataset.cview === currentView;
            b.classList.toggle('active', on);
            b.setAttribute('aria-selected', String(on));
          });
        }
        viewBtns.forEach((btn) => {
          btn.addEventListener('click', () => {
            const next = btn.dataset.cview === 'showcase' ? 'showcase' : 'grid';
            if (next === currentView) return;
            currentView = next;
            try { localStorage.setItem(VIEW_STORAGE_KEY, currentView); } catch (e) {}
            syncViewButtons();
            renderCollection();
          });
        });
        syncViewButtons();

        const searchInput = document.getElementById('collection-search');
        if (searchInput) {
          searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value || '';
            renderCollection();
          });
        }
      }

      /* =========================================
         INTRO OVERLAY ([ CLICK TO ENTER ])
         ========================================= */
      function initIntroOverlay(player) {
        const overlay = document.getElementById('intro-overlay');
        const enterBtn = document.getElementById('intro-enter-btn');
        const muteBtn = document.getElementById('intro-mute-btn');
        if (!overlay) return;

        let entered = false;
        function dismiss(withSound) {
          if (entered) return;
          entered = true;
          overlay.classList.add('is-hidden');
          if (withSound && player && typeof player.play === 'function') {
            player.play({ fadeIn: true });
          }
          setTimeout(() => {
            overlay.style.display = 'none';
          }, 620);
        }

        overlay.addEventListener('click', (e) => {
          if (e.target === muteBtn) return;
          dismiss(true);
        });
        enterBtn?.addEventListener('click', (e) => {
          e.stopPropagation();
          dismiss(true);
        });
        muteBtn?.addEventListener('click', (e) => {
          e.stopPropagation();
          dismiss(false);
        });

        window.addEventListener('keydown', (e) => {
          if (entered) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            dismiss(true);
          } else if (e.key === 'Escape') {
            dismiss(false);
          }
        });
      }

      /* =========================================
         SPOTIFY PLAYLISTS DRAWER (3 PLAYLISTS)
         ========================================= */
      function initSpotifyDrawer(player) {
        const drawer = document.getElementById('spotify-drawer');
        const backdrop = document.getElementById('spotify-backdrop');
        const closeBtn = document.getElementById('spotify-close-btn');
        const tabsWrap = document.getElementById('spotify-tabs');
        const iframe = document.getElementById('spotify-iframe');
        const extLink = document.getElementById('spotify-ext-link');

        if (!drawer || !tabsWrap || !iframe) return;

        let activeIdx = 0;
        let hasLoadedEmbed = false;

        function renderTabs() {
          tabsWrap.innerHTML = SPOTIFY_PLAYLISTS.map((pl, idx) => `
            <button type="button" class="spotify-tab ${idx === activeIdx ? 'active' : ''}" data-sp-idx="${idx}" title="${escapeHtml(pl.label)}">
              ${escapeHtml(pl.label)}
            </button>
          `).join('');

          tabsWrap.querySelectorAll('.spotify-tab').forEach((btn) => {
            btn.addEventListener('click', () => {
              selectPlaylist(Number(btn.dataset.spIdx));
            });
          });
        }

        function selectPlaylist(idx) {
          activeIdx = idx;
          const pl = SPOTIFY_PLAYLISTS[idx];
          if (!pl) return;
          renderTabs();
          iframe.src = `https://open.spotify.com/embed/playlist/${pl.id}?utm_source=generator&theme=0`;
          if (extLink) extLink.href = pl.url;
          hasLoadedEmbed = true;
        }

        function openDrawer() {
          if (!hasLoadedEmbed) {
            selectPlaylist(activeIdx);
          }
          drawer.classList.add('is-open');
          backdrop?.classList.add('is-open');
          drawer.setAttribute('aria-hidden', 'false');
          backdrop?.setAttribute('aria-hidden', 'false');
        }

        function closeDrawer() {
          drawer.classList.remove('is-open');
          backdrop?.classList.remove('is-open');
          drawer.setAttribute('aria-hidden', 'true');
          backdrop?.setAttribute('aria-hidden', 'true');
        }

        document.getElementById('hero-spotify-btn')?.addEventListener('click', openDrawer);
        document.getElementById('discord-spotify-btn')?.addEventListener('click', openDrawer);
        document.getElementById('dock-spotify-btn')?.addEventListener('click', openDrawer);
        closeBtn?.addEventListener('click', closeDrawer);
        backdrop?.addEventListener('click', closeDrawer);
        window.addEventListener('keydown', (e) => {
          if (e.key === 'Escape' && drawer.classList.contains('is-open')) closeDrawer();
        });

        renderTabs();

        // Try fetching actual Spotify playlist titles via public oEmbed
        SPOTIFY_PLAYLISTS.forEach((pl, idx) => {
          fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(pl.url)}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
              if (data && data.title) {
                SPOTIFY_PLAYLISTS[idx].label = `${formatRank(idx + 1)} · ${data.title}`;
                renderTabs();
              }
            })
            .catch(() => {});
        });
      }

      /* =========================================
         LIVE DISCORD / SPOTIFY PRESENCE (LANYARD API)
         ========================================= */
      function initLanyardPresence() {
        const card = document.getElementById('discord-card');
        const artEl = document.getElementById('discord-art');
        const dotEl = document.getElementById('discord-status-dot');
        const stateLabelEl = document.getElementById('discord-state-label');
        const userEl = document.getElementById('discord-username');
        const titleEl = document.getElementById('discord-main-title');
        const subEl = document.getElementById('discord-sub');
        const spProgWrap = document.getElementById('spotify-progress');
        const spCurEl = document.getElementById('sp-time-cur');
        const spEndEl = document.getElementById('sp-time-end');
        const spFillEl = document.getElementById('sp-bar-fill');

        if (!card) return;

        let currentSpotify = null;
        let currentActivityStart = null;
        let ws = null;
        let hbTimer = null;
        let reconnectDelay = 2000;

        const STATUS_MAP = {
          online:  'ONLINE',
          idle:    'IDLE',
          dnd:     'DO NOT DISTURB',
          offline: 'OFFLINE'
        };

        function resolveActivityImage(act) {
          const large = act?.assets?.large_image;
          if (!large) return '';
          if (large.startsWith('mp:external/')) {
            return 'https://media.discordapp.net/' + large.slice(3);
          }
          if (large.startsWith('spotify:')) {
            return 'https://i.scdn.co/image/' + large.slice(8);
          }
          if (/^https?:\/\//i.test(large)) return large;
          if (act.application_id) {
            return `https://cdn.discordapp.com/app-assets/${act.application_id}/${large}.png`;
          }
          return '';
        }

        function setTitleContent(text, href) {
          if (!titleEl) return;
          if (href) {
            titleEl.innerHTML = `<a class="discord-main-title" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(text)}</a>`;
          } else {
            titleEl.textContent = text;
          }
        }

        function renderPresence(d) {
          if (!d) return;
          const status = d.discord_status || 'offline';
          const u = d.discord_user || {};
          const displayName = u.global_name || u.display_name || u.username || 'undexeror';
          const userAvatar = u.avatar
            ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.${u.avatar.startsWith('a_') ? 'gif' : 'webp'}?size=128`
            : 'https://shikimori.one/system/users/x160/1308586.png';

          if (dotEl) {
            dotEl.className = 'discord-status-badge ' + status;
          }
          if (userEl) {
            userEl.textContent = u.username ? `@${u.username}` : displayName;
          }

          // Priority 1: Spotify listening
          if (d.listening_to_spotify && d.spotify) {
            const sp = d.spotify;
            currentSpotify = sp;
            currentActivityStart = null;
            card.classList.add('is-spotify');
            if (artEl) {
              artEl.src = sp.album_art_url || userAvatar;
              artEl.classList.remove('is-round');
            }
            if (stateLabelEl) {
              stateLabelEl.innerHTML = '<span class="live-tag">● SPOTIFY</span> · СЛУШАЮ';
            }
            const trackUrl = sp.track_id ? `https://open.spotify.com/track/${sp.track_id}` : '';
            setTitleContent(sp.song || 'Spotify Track', trackUrl);
            if (subEl) {
              subEl.textContent = `${sp.artist || ''}${sp.album ? ' · ' + sp.album : ''}`;
            }
            spProgWrap?.classList.add('is-visible');
            updateTimers();
            return;
          }

          currentSpotify = null;
          card.classList.remove('is-spotify');
          spProgWrap?.classList.remove('is-visible');

          // Priority 2: Game / App activity (type !== 4)
          const activities = Array.isArray(d.activities) ? d.activities : [];
          const gameAct = activities.find((a) => a.type !== 4 && a.name !== 'Spotify');
          const customAct = activities.find((a) => a.type === 4);

          if (gameAct) {
            const actImg = resolveActivityImage(gameAct);
            if (artEl) {
              artEl.src = actImg || userAvatar;
              artEl.classList.toggle('is-round', !actImg);
            }
            const verb = gameAct.type === 2 ? 'СЛУШАЮ' : gameAct.type === 3 ? 'СМОТРЮ' : 'ИГРАЮ';
            if (stateLabelEl) {
              stateLabelEl.innerHTML = `<span class="live-tag">● ${verb}</span> · DISCORD`;
            }
            setTitleContent(gameAct.name || 'Активность', '');
            currentActivityStart = gameAct.timestamps?.start || null;
            const detailParts = [gameAct.details, gameAct.state].filter(Boolean);
            if (subEl) {
              subEl.dataset.baseText = detailParts.join(' · ') || STATUS_MAP[status];
              subEl.textContent = subEl.dataset.baseText;
            }
            updateTimers();
            return;
          }

          // Priority 3: Custom status or plain online/offline
          currentActivityStart = null;
          if (artEl) {
            artEl.src = userAvatar;
            artEl.classList.add('is-round');
          }
          if (stateLabelEl) {
            const livePrefix = status === 'online' ? '<span class="live-tag">● ONLINE</span>' : STATUS_MAP[status];
            stateLabelEl.innerHTML = `DISCORD · ${livePrefix}`;
          }
          setTitleContent(displayName, '');
          if (subEl) {
            if (customAct && (customAct.state || customAct.emoji?.name)) {
              subEl.textContent = `${customAct.emoji?.name ? customAct.emoji.name + ' ' : ''}${customAct.state || ''}`.trim();
            } else if (status === 'online') {
              subEl.textContent = 'В сети · тишина в эфире';
            } else if (status === 'idle') {
              subEl.textContent = 'Не активен';
            } else if (status === 'dnd') {
              subEl.textContent = 'Не беспокоить';
            } else {
              subEl.textContent = 'Оффлайн · сейчас не в сети';
            }
          }
        }

        function renderNotMonitored() {
          currentSpotify = null;
          currentActivityStart = null;
          card.classList.remove('is-spotify');
          spProgWrap?.classList.remove('is-visible');
          if (dotEl) dotEl.className = 'discord-status-badge offline';
          if (stateLabelEl) stateLabelEl.textContent = 'DISCORD · LANYARD';
          setTitleContent('Зайди на discord.gg/lanyard', 'https://discord.gg/lanyard');
          if (subEl) subEl.textContent = 'Один раз — чтобы API видел твой онлайн и Spotify';
        }

        function updateTimers() {
          const now = Date.now();
          if (currentSpotify && currentSpotify.timestamps) {
            const { start, end } = currentSpotify.timestamps;
            if (start && end && end > start) {
              const totalMs = end - start;
              const elapsedMs = Math.max(0, Math.min(totalMs, now - start));
              const pct = (elapsedMs / totalMs) * 100;
              if (spFillEl) spFillEl.style.width = pct.toFixed(2) + '%';
              if (spCurEl) spCurEl.textContent = formatClock(elapsedMs / 1000);
              if (spEndEl) spEndEl.textContent = formatClock(totalMs / 1000);
            }
          } else if (currentActivityStart && subEl) {
            const elapsedSec = Math.max(0, Math.floor((now - currentActivityStart) / 1000));
            const hrs = Math.floor(elapsedSec / 3600);
            const mins = Math.floor((elapsedSec % 3600) / 60);
            const secs = elapsedSec % 60;
            const clock = hrs > 0
              ? `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
              : `${mins}:${String(secs).padStart(2, '0')}`;
            const base = subEl.dataset.baseText || '';
            subEl.textContent = base ? `${base} · ${clock}` : `В игре ${clock}`;
          }
        }

        setInterval(updateTimers, 1000);

        async function fetchRest() {
          try {
            const res = await fetch(`https://api.lanyard.rest/v1/users/${DISCORD_USER_ID}`);
            if (res.status === 404) {
              renderNotMonitored();
              return false;
            }
            if (!res.ok) return false;
            const json = await res.json();
            if (json && json.success && json.data) {
              renderPresence(json.data);
              return true;
            }
          } catch (e) {}
          return false;
        }

        function connectWS() {
          try {
            ws = new WebSocket('wss://api.lanyard.rest/socket');
          } catch (e) {
            return;
          }

          ws.addEventListener('message', (event) => {
            let msg;
            try { msg = JSON.parse(event.data); } catch (e) { return; }
            if (msg.op === 1 && msg.d?.heartbeat_interval) {
              if (hbTimer) clearInterval(hbTimer);
              hbTimer = setInterval(() => {
                if (ws && ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({ op: 3 }));
                }
              }, msg.d.heartbeat_interval);
              ws.send(JSON.stringify({ op: 2, d: { subscribe_to_id: DISCORD_USER_ID } }));
            } else if (msg.op === 0 && (msg.t === 'INIT_STATE' || msg.t === 'PRESENCE_UPDATE')) {
              if (msg.d && msg.d.discord_user) {
                reconnectDelay = 2000;
                renderPresence(msg.d);
              }
            }
          });

          ws.addEventListener('close', () => {
            if (hbTimer) clearInterval(hbTimer);
            setTimeout(connectWS, reconnectDelay);
            reconnectDelay = Math.min(30000, reconnectDelay * 1.6);
          });

          ws.addEventListener('error', () => {
            try { ws.close(); } catch (e) {}
          });
        }

        fetchRest().then((ok) => {
          if (ok) connectWS();
        });
        setInterval(fetchRest, 45000);
      }

      /* =========================================
         STAGE 2 NEW: TASTE MATCH («ПРОВЕРКА НА БАЗУ» + PNG VERDICT CARD)
         ========================================= */
      function initTasteMatcher() {
        const form = document.getElementById('base-check-form');
        const input = document.getElementById('base-nick-input');
        const submitBtn = document.getElementById('base-submit-btn');
        const statusLine = document.getElementById('base-status-line');
        const spinner = document.getElementById('base-spinner');
        const statusText = document.getElementById('base-status-text');
        const resultBox = document.getElementById('base-result');
        const readyBadge = document.getElementById('base-host-ready-badge');

        const verdictHero = document.getElementById('base-verdict-hero');
        const scoreRing = document.getElementById('base-score-ring');
        const pctNumEl = document.getElementById('base-pct-num');
        const guestAvatarEl = document.getElementById('base-guest-avatar');
        const guestNameEl = document.getElementById('base-guest-name');
        const rankTitleEl = document.getElementById('base-rank-title');
        const rankDescEl = document.getElementById('base-rank-desc');
        const mSharedEl = document.getElementById('base-m-shared');
        const mPeakEl = document.getElementById('base-m-peak');
        const mMadEl = document.getElementById('base-m-mad');

        const sharedKickerEl = document.getElementById('base-shared-kicker');
        const sharedBadgeEl = document.getElementById('base-shared-badge');
        const sharedListEl = document.getElementById('base-shared-list');
        const conflictBadgeEl = document.getElementById('base-conflict-badge');
        const conflictListEl = document.getElementById('base-conflict-list');

        const dlPngBtn = document.getElementById('base-download-png-btn');
        const copyTextBtn = document.getElementById('base-copy-text-btn');
        const resetBtn = document.getElementById('base-reset-btn');

        if (!form || !input) return;

        if (readyBadge && myRatesIndex.size > 0) {
          readyBadge.textContent = `БАЗА ГОТОВА · ${myRatesIndex.size} ТАЙТЛОВ`;
        }

        function setStatus(msg, mode) {
          if (!statusLine || !statusText) return;
          if (!msg) {
            statusLine.classList.remove('is-visible', 'is-error');
            return;
          }
          statusLine.classList.add('is-visible');
          statusLine.classList.toggle('is-error', mode === 'error');
          if (spinner) spinner.style.display = mode === 'loading' ? 'inline-block' : 'none';
          statusText.textContent = msg;
        }

        function sanitizeNickname(raw) {
          let s = String(raw || '').trim();
          if (!s) return '';
          // Handle pasted Shikimori profile URLs
          s = s.replace(/^https?:\/\/(www\.)?shikimori\.(one|io|me|org)\//i, '');
          s = s.split(/[/?#]/)[0];
          s = s.replace(/^@+/, '');
          try {
            s = decodeURIComponent(s.replace(/\+/g, ' '));
          } catch (e) {
            s = s.replace(/\+/g, ' ');
          }
          return s.trim();
        }

        async function fetchShikiUserAnyOrigin(nickname) {
          const origins = [activeShikiOrigin, ...SHIKI_ORIGINS.filter((o) => o !== activeShikiOrigin)];
          let lastStatus = 0;
          for (const origin of origins) {
            try {
              const res = await fetch(`${origin}/api/users/${encodeURIComponent(nickname)}?is_nickname=1`, {
                headers: { 'Accept': 'application/json' }
              });
              lastStatus = res.status;
              if (res.ok) {
                const data = await res.json();
                if (data && data.id) {
                  activeShikiOrigin = origin;
                  return { user: data, origin };
                }
              }
              if (res.status === 404) return { user: null, status: 404 };
            } catch (e) {}
          }
          return { user: null, status: lastStatus };
        }

        async function fetchShikiUserRates(userId, origin) {
          const base = origin || activeShikiOrigin;
          const res = await fetchShikiWithRetry(`${base}/api/users/${userId}/anime_rates?limit=1000`, {
            retries: 3,
            baseDelay: 750
          });
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return Array.isArray(res.data) ? res.data : [];
        }

        async function ensureHostRatesReady() {
          if (myRatesIndex.size >= 30) return myRatesIndex;
          setStatus('Подгружаю базу undereror nyashka...', 'loading');
          await loadHostAnimeRates();
          return myRatesIndex;
        }

        function computeVerdictTier(pct, isSelf, sharedCount, ratedSharedCount) {
          if (isSelf) {
            return {
              tier: 'high',
              color: '#6ee7b7',
              title: '100% · ЗЕРКАЛО // ЭТО ТЫ САМ',
              desc: 'Сравнивать undereror с undereror — идеальная база без единого спора.'
            };
          }
          if (sharedCount === 0) {
            return {
              tier: 'low',
              color: '#f87171',
              title: 'ПАРАЛЛЕЛЬНЫЕ ВСЕЛЕННЫЕ',
              desc: 'У нас вообще ноль общих тайтлов. Крутани рандомайзер «Что посмотреть от меня» — пора это исправлять.'
            };
          }
          if (pct >= 88) {
            return {
              tier: 'high',
              color: '#6ee7b7',
              title: 'АБСОЛЮТНАЯ БАЗА · ПОЧТИ КЛОН',
              desc: ratedSharedCount >= 3
                ? 'Наши списки будто с одной мировой линии — почти полное совпадение по оценкам и топам.'
                : 'Мощное пересечение по просмотренной классике и моему Peak Fiction.'
            };
          }
          if (pct >= 74) {
            return {
              tier: 'high',
              color: '#a7f3d0',
              title: 'СЕРТИФИЦИРОВАННАЯ БАЗА',
              desc: 'Крепкий вкус — по большинству тайтлов мы бы сошлись с полуслова, респект.'
            };
          }
          if (pct >= 58) {
            return {
              tier: 'mid',
              color: '#dce8ff',
              title: 'БАЗА ЕСТЬ, НО ЕСТЬ ВОПРОСЫ',
              desc: 'Общий вайб точно имеется, но в паре споров из правого блока мы бы жёстко зарубились.'
            };
          }
          if (pct >= 42) {
            return {
              tier: 'mid',
              color: '#cbd5e1',
              title: 'ПОГРАНИЧНАЯ ЗОНА',
              desc: 'Смотрим разное или оцениваем слишком по-своему. Есть что пообсуждать.'
            };
          }
          return {
            tier: 'low',
            color: '#f87171',
            title: 'ВРАГИ ПО ВКУСУ',
            desc: 'Мы явно с разных мировых линий. Похоже, наши 10/10 и проходные тайтлы поменялись местами.'
          };
        }

        function buildAnimeRowHtml(item, isConflict) {
          const imgSrc = coverCache['anime_' + item.id] || item.img || '';
          const diffBadge = isConflict
            ? `<span class="score-tag is-diff">Δ ${item.diff}</span>`
            : '';
          return `
            <a class="base-anime-row" href="${activeShikiOrigin}/animes/${item.id}" target="_blank" rel="noopener noreferrer">
              <div class="base-row-thumb">
                <img
                  data-cover-key="anime_${item.id}"
                  data-fallback-src="${escapeHtml(item.img || '')}"
                  src="${escapeHtml(imgSrc)}"
                  alt="${escapeHtml(item.title)}"
                  loading="lazy"
                />
              </div>
              <div class="base-row-info">
                <div class="base-row-title">${escapeHtml(item.title)}</div>
                <div class="base-row-scores">
                  <span class="score-tag is-guest">Ты: ${item.guestScore || '✓'}${item.guestScore ? '★' : ''}</span>
                  <span class="score-tag">Я: ${item.myScore || '✓'}${item.myScore ? '★' : ''}</span>
                  ${diffBadge}
                </div>
              </div>
            </a>
          `;
        }

        function animatePercentCounter(targetPct) {
          const start = performance.now();
          const duration = 750;
          function step(now) {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            const cur = Math.round(targetPct * eased);
            if (pctNumEl) pctNumEl.textContent = `${cur}%`;
            if (scoreRing) scoreRing.style.setProperty('--match-pct', String(cur));
            if (t < 1) requestAnimationFrame(step);
          }
          requestAnimationFrame(step);
        }

        function renderVerdictUI(v) {
          lastMatchVerdict = v;
          if (!resultBox) return;
          resultBox.classList.add('is-visible');

          if (verdictHero) {
            verdictHero.classList.remove('tier-high', 'tier-low');
            if (v.tier === 'high') verdictHero.classList.add('tier-high');
            else if (v.tier === 'low') verdictHero.classList.add('tier-low');
          }
          if (scoreRing) {
            scoreRing.style.setProperty('--match-color', v.color);
          }
          animatePercentCounter(v.pct);

          if (guestAvatarEl) {
            guestAvatarEl.src = v.guestAvatar || 'https://shikimori.one/assets/globals/missing_avatar/x160.png';
            guestAvatarEl.alt = v.guestNick;
          }
          if (guestNameEl) guestNameEl.textContent = v.guestNick;
          if (rankTitleEl) rankTitleEl.textContent = v.title;
          if (rankDescEl) rankDescEl.textContent = v.desc;

          if (mSharedEl) mSharedEl.textContent = String(v.sharedCount);
          if (mPeakEl) mPeakEl.textContent = `${v.peakOverlap}/${PEAK_FICTION.length}`;
          if (mMadEl) mMadEl.textContent = v.mad !== null ? v.mad.toFixed(2) : '—';

          if (sharedKickerEl) {
            sharedKickerEl.textContent = v.hasEliteMatches
              ? 'Общие 9–10★ · Точка резонанса'
              : 'Общие любимые тайтлы';
          }
          if (sharedBadgeEl) sharedBadgeEl.textContent = `${v.sharedFavoritesCount} ШТ.`;

          if (sharedListEl) {
            sharedListEl.innerHTML = v.topShared.length
              ? v.topShared.map((item) => buildAnimeRowHtml(item, false)).join('')
              : '<div class="base-empty-note">Общих высоких оценок пока не нашлось</div>';
            attachImageHandlers(sharedListEl);
          }

          if (conflictBadgeEl) {
            conflictBadgeEl.textContent = v.conflicts.length
              ? `МАКС Δ ${v.conflicts[0].diff}`
              : 'МИР И СОГЛАСИЕ';
          }
          if (conflictListEl) {
            conflictListEl.innerHTML = v.conflicts.length
              ? v.conflicts.map((item) => buildAnimeRowHtml(item, true)).join('')
              : '<div class="base-empty-note">Серьёзных конфликтов по оценкам не обнаружено</div>';
            attachImageHandlers(conflictListEl);
          }

          const coverIds = [
            ...v.topShared.map((x) => x.id),
            ...v.conflicts.map((x) => x.id)
          ];
          if (coverIds.length) loadAnimeCoversBatch(coverIds);
        }

        function drawRoundRect(ctx, x, y, w, h, r) {
          ctx.beginPath();
          ctx.moveTo(x + r, y);
          ctx.arcTo(x + w, y, x + w, y + h, r);
          ctx.arcTo(x + w, y + h, x, y + h, r);
          ctx.arcTo(x, y + h, x, y, r);
          ctx.arcTo(x, y, x + w, y, r);
          ctx.closePath();
        }

        function fitText(ctx, text, maxW) {
          const str = String(text || '');
          if (ctx.measureText(str).width <= maxW) return str;
          let out = str;
          while (out.length > 1 && ctx.measureText(out + '…').width > maxW) {
            out = out.slice(0, -1);
          }
          return out + '…';
        }

        function wrapLines(ctx, text, maxW, maxLines) {
          const words = String(text || '').split(/\s+/);
          const lines = [];
          let cur = '';
          for (const w of words) {
            const test = cur ? cur + ' ' + w : w;
            if (ctx.measureText(test).width <= maxW) {
              cur = test;
            } else {
              if (cur) lines.push(cur);
              cur = w;
              if (lines.length === maxLines - 1) break;
            }
          }
          if (cur && lines.length < maxLines) lines.push(fitText(ctx, cur, maxW));
          return lines;
        }

        function downloadVerdictPng() {
          if (!lastMatchVerdict) return;
          const v = lastMatchVerdict;
          const W = 1200;
          const H = 675;
          const c = document.createElement('canvas');
          c.width = W;
          c.height = H;
          const ctx = c.getContext('2d');

          // 1. Dark noir backdrop + subtle glow + grid
          const bgGrad = ctx.createLinearGradient(0, 0, W, H);
          bgGrad.addColorStop(0, '#07090f');
          bgGrad.addColorStop(0.55, '#0b101b');
          bgGrad.addColorStop(1, '#06080d');
          ctx.fillStyle = bgGrad;
          ctx.fillRect(0, 0, W, H);

          const orb1 = ctx.createRadialGradient(200, 140, 10, 200, 140, 420);
          orb1.addColorStop(0, v.tier === 'high' ? 'rgba(110, 231, 183, 0.16)' : v.tier === 'low' ? 'rgba(248, 113, 113, 0.15)' : 'rgba(173, 191, 222, 0.18)');
          orb1.addColorStop(1, 'transparent');
          ctx.fillStyle = orb1;
          ctx.fillRect(0, 0, W, H);

          const orb2 = ctx.createRadialGradient(1020, 560, 10, 1020, 560, 380);
          orb2.addColorStop(0, 'rgba(173, 191, 222, 0.12)');
          orb2.addColorStop(1, 'transparent');
          ctx.fillStyle = orb2;
          ctx.fillRect(0, 0, W, H);

          // Subtle grid lines
          ctx.strokeStyle = 'rgba(173, 191, 222, 0.045)';
          ctx.lineWidth = 1;
          for (let x = 40; x < W; x += 48) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
          }
          for (let y = 40; y < H; y += 48) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
          }

          // Outer frame
          drawRoundRect(ctx, 26, 26, W - 52, H - 52, 22);
          ctx.strokeStyle = 'rgba(173, 191, 222, 0.24)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // 2. Top HUD header
          ctx.fillStyle = '#adbfde';
          ctx.font = '600 15px "JetBrains Mono", monospace';
          ctx.fillText('◈  UNDEXEROR // ARCHIVE   ·   ПРОВЕРКА НА БАЗУ', 62, 74);

          const dateStr = new Date().toLocaleDateString('ru-RU');
          ctx.fillStyle = 'rgba(205, 212, 224, 0.55)';
          ctx.textAlign = 'right';
          ctx.fillText(`SHIKIMORI TASTE MATCH  ·  ${dateStr}`, W - 62, 74);
          ctx.textAlign = 'left';

          ctx.strokeStyle = 'rgba(173, 191, 222, 0.16)';
          ctx.beginPath(); ctx.moveTo(62, 94); ctx.lineTo(W - 62, 94); ctx.stroke();

          // 3. Verdict Hero Box
          drawRoundRect(ctx, 62, 118, W - 124, 200, 18);
          ctx.fillStyle = 'rgba(10, 14, 24, 0.78)';
          ctx.fill();
          ctx.strokeStyle = v.tier === 'high' ? 'rgba(110, 231, 183, 0.42)' : v.tier === 'low' ? 'rgba(248, 113, 113, 0.42)' : 'rgba(173, 191, 222, 0.30)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Circular Match Gauge
          const cx = 166;
          const cy = 218;
          const rad = 64;
          ctx.beginPath();
          ctx.arc(cx, cy, rad, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
          ctx.lineWidth = 10;
          ctx.stroke();

          const startAng = -Math.PI / 2;
          const endAng = startAng + (Math.PI * 2 * Math.max(0, Math.min(100, v.pct))) / 100;
          ctx.beginPath();
          ctx.arc(cx, cy, rad, startAng, endAng);
          ctx.strokeStyle = v.color || '#dce8ff';
          ctx.lineCap = 'round';
          ctx.lineWidth = 10;
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.font = '700 38px "JetBrains Mono", monospace';
          ctx.fillText(`${v.pct}%`, cx, cy + 8);
          ctx.fillStyle = 'rgba(205, 212, 224, 0.60)';
          ctx.font = '600 11px "JetBrains Mono", monospace';
          ctx.fillText('MATCH', cx, cy + 29);
          ctx.textAlign = 'left';

          // Verdict Text
          ctx.fillStyle = 'rgba(205, 212, 224, 0.72)';
          ctx.font = '500 15px "JetBrains Mono", monospace';
          ctx.fillText(fitText(ctx, `${v.guestNick}  ×  undereror nyashka`, 540), 266, 162);

          ctx.fillStyle = '#ffffff';
          ctx.font = '700 30px "Inter", sans-serif';
          ctx.fillText(fitText(ctx, v.title, 540), 266, 206);

          ctx.fillStyle = 'rgba(205, 212, 224, 0.80)';
          ctx.font = '400 16px "Inter", sans-serif';
          const descLines = wrapLines(ctx, v.desc, 520, 2);
          descLines.forEach((line, i) => {
            ctx.fillText(line, 266, 240 + i * 24);
          });

          // Right KPI column inside hero
          const kpis = [
            { lbl: 'ОБЩИХ', val: String(v.sharedCount) },
            { lbl: 'PEAK 16', val: `${v.peakOverlap}/16` },
            { lbl: 'СРЕД. Δ', val: v.mad !== null ? v.mad.toFixed(2) : '—' }
          ];
          kpis.forEach((k, idx) => {
            const bx = 832 + idx * 98;
            drawRoundRect(ctx, bx, 168, 88, 98, 12);
            ctx.fillStyle = 'rgba(6, 9, 16, 0.85)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(173, 191, 222, 0.22)';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffffff';
            ctx.font = '700 22px "JetBrains Mono", monospace';
            ctx.fillText(k.val, bx + 44, 214);
            ctx.fillStyle = 'rgba(205, 212, 224, 0.56)';
            ctx.font = '600 10px "JetBrains Mono", monospace';
            ctx.fillText(k.lbl, bx + 44, 242);
          });
          ctx.textAlign = 'left';

          // 4. Bottom Two Panels (Shared 9-10 & Main Conflicts)
          const panelY = 340;
          const panelH = 248;
          const panelW = (W - 124 - 22) / 2;

          // Left Panel: Shared Favorites
          drawRoundRect(ctx, 62, panelY, panelW, panelH, 16);
          ctx.fillStyle = 'rgba(9, 12, 20, 0.78)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(173, 191, 222, 0.22)';
          ctx.lineWidth = 1.2;
          ctx.stroke();

          ctx.fillStyle = '#adbfde';
          ctx.font = '600 13px "JetBrains Mono", monospace';
          ctx.fillText(v.hasEliteMatches ? 'ОБЩАЯ БАЗА · 9–10★' : 'ОБЩИЕ ЛЮБИМЫЕ ТАЙТЛЫ', 86, panelY + 34);

          const sharedSlice = v.topShared.slice(0, 3);
          if (!sharedSlice.length) {
            ctx.fillStyle = 'rgba(205, 212, 224, 0.52)';
            ctx.font = '400 14px "JetBrains Mono", monospace';
            ctx.fillText('Общих высоких оценок пока нет', 86, panelY + 126);
          } else {
            sharedSlice.forEach((item, idx) => {
              const ry = panelY + 54 + idx * 58;
              drawRoundRect(ctx, 84, ry, panelW - 44, 48, 10);
              ctx.fillStyle = 'rgba(15, 20, 32, 0.85)';
              ctx.fill();
              ctx.strokeStyle = 'rgba(173, 191, 222, 0.16)';
              ctx.stroke();

              ctx.fillStyle = '#ffffff';
              ctx.font = '600 15px "Inter", sans-serif';
              ctx.fillText(fitText(ctx, item.title, panelW - 210), 100, ry + 30);

              ctx.textAlign = 'right';
              ctx.fillStyle = '#a7f3d0';
              ctx.font = '600 13px "JetBrains Mono", monospace';
              ctx.fillText(`Ты ${item.guestScore || '✓'}★ · Я ${item.myScore || '✓'}★`, 84 + panelW - 58, ry + 30);
              ctx.textAlign = 'left';
            });
          }

          // Right Panel: Main Conflict
          const rx = 62 + panelW + 22;
          drawRoundRect(ctx, rx, panelY, panelW, panelH, 16);
          ctx.fillStyle = 'rgba(24, 11, 16, 0.68)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(248, 113, 113, 0.34)';
          ctx.lineWidth = 1.2;
          ctx.stroke();

          ctx.fillStyle = '#fca5a5';
          ctx.font = '600 13px "JetBrains Mono", monospace';
          ctx.fillText('ГЛАВНЫЙ КОНФЛИКТ ПО ОЦЕНКАМ', rx + 24, panelY + 34);

          const confSlice = v.conflicts.slice(0, 3);
          if (!confSlice.length) {
            ctx.fillStyle = 'rgba(205, 212, 224, 0.56)';
            ctx.font = '400 14px "JetBrains Mono", monospace';
            ctx.fillText('Серьёзных споров не найдено — мир и согласие', rx + 24, panelY + 126);
          } else {
            confSlice.forEach((item, idx) => {
              const ry = panelY + 54 + idx * 58;
              drawRoundRect(ctx, rx + 22, ry, panelW - 44, 48, 10);
              ctx.fillStyle = 'rgba(18, 12, 20, 0.85)';
              ctx.fill();
              ctx.strokeStyle = 'rgba(248, 113, 113, 0.24)';
              ctx.stroke();

              ctx.fillStyle = '#ffffff';
              ctx.font = '600 15px "Inter", sans-serif';
              ctx.fillText(fitText(ctx, item.title, panelW - 225), rx + 38, ry + 30);

              ctx.textAlign = 'right';
              ctx.fillStyle = '#fecaca';
              ctx.font = '600 13px "JetBrains Mono", monospace';
              ctx.fillText(`Ты ${item.guestScore}★ vs Я ${item.myScore}★ (Δ${item.diff})`, rx + panelW - 36, ry + 30);
              ctx.textAlign = 'left';
            });
          }

          // 5. Footer
          ctx.fillStyle = 'rgba(205, 212, 224, 0.56)';
          ctx.font = '500 13px "JetBrains Mono", monospace';
          ctx.fillText('ПРОВЕРЬ СВОЙ НИК  →  https://undexerorrr.github.io/', 62, H - 46);

          ctx.textAlign = 'right';
          ctx.fillStyle = 'rgba(173, 191, 222, 0.65)';
          ctx.fillText('undexeror // archive', W - 62, H - 46);
          ctx.textAlign = 'left';

          const safeName = v.guestNick.replace(/[^a-zA-Z0-9а-яА-Я_-]+/g, '_').slice(0, 28) || 'guest';
          const link = document.createElement('a');
          link.download = `taste-match-${safeName}-${v.pct}pct.png`;
          link.href = c.toDataURL('image/png');
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }

        async function runTasteMatch(rawInput) {
          const nick = sanitizeNickname(rawInput);
          if (!nick) {
            setStatus('Введи свой ник на Shikimori (например: nickname)', 'error');
            input.focus();
            return;
          }

          submitBtn.disabled = true;
          resultBox?.classList.remove('is-visible');
          setStatus(`Ищу профиль «${nick}» на Shikimori...`, 'loading');

          try {
            await ensureHostRatesReady();
            if (myRatesIndex.size === 0) {
              setStatus('Не удалось загрузить базу undereror с Shikimori API. Попробуй через минуту.', 'error');
              return;
            }

            const { user: guest, origin, status } = await fetchShikiUserAnyOrigin(nick);
            if (!guest || !guest.id) {
              if (status === 404) {
                setStatus(`Профиль «${nick}» не найден на Shikimori — проверь написание ника.`, 'error');
              } else {
                setStatus('Shikimori API временно не отвечает — попробуй ещё раз через пару секунд.', 'error');
              }
              return;
            }

            const guestNick = guest.nickname || nick;
            const guestAvatarRaw = guest.image?.x160 || guest.image?.x148 || guest.avatar || '';
            const guestAvatar = guestAvatarRaw ? normalizeShikiUrl(guestAvatarRaw, origin) : '';
            const isSelf = guestNick.toLowerCase() === SHIKI_NICKNAME.toLowerCase();

            setStatus(`Загружаю список «${guestNick}» и сверяю с ${myRatesIndex.size} тайтлами...`, 'loading');
            const guestRatesRaw = await fetchShikiUserRates(guest.id, origin);
            const guestRates = guestRatesRaw.filter((r) => r.anime && r.anime.id && (r.status === 'completed' || Number(r.score) > 0));

            if (!guestRates.length) {
              setStatus(`У «${guestNick}» список аниме пуст или закрыт настройками приватности.`, 'error');
              return;
            }

            const peakIds = new Set(PEAK_FICTION.map((p) => p.malId));
            const sharedAll = [];
            const sharedRated = [];
            let peakOverlap = 0;

            const seenGuest = new Set();
            guestRates.forEach((gr) => {
              const id = Number(gr.anime.id);
              if (seenGuest.has(id)) return;
              seenGuest.add(id);

              if (peakIds.has(id)) peakOverlap++;

              const mine = myRatesIndex.get(id);
              if (!mine) return;

              const guestScore = Number(gr.score) || 0;
              const myScore = Number(mine.s) || 0;
              const rawImg = gr.anime.image?.original || gr.anime.image?.preview || '';
              const entry = {
                id,
                title: mine.t || gr.anime.russian || gr.anime.name || `#${id}`,
                myScore,
                guestScore,
                diff: (myScore > 0 && guestScore > 0) ? Math.abs(myScore - guestScore) : 0,
                img: mine.img || (rawImg ? normalizeShikiUrl(rawImg, origin) : '')
              };
              sharedAll.push(entry);
              if (myScore > 0 && guestScore > 0) sharedRated.push(entry);
            });

            // Compute compatibility percentage
            let pct = 0;
            let mad = null;

            if (isSelf) {
              pct = 100;
              mad = 0;
            } else if (sharedAll.length === 0) {
              pct = 0;
              mad = null;
            } else if (sharedRated.length >= 3) {
              const madVal = sharedRated.reduce((acc, x) => acc + x.diff, 0) / sharedRated.length;
              mad = madVal;
              const closeness = Math.max(0, 1 - madVal / 4.2);

              // Pearson correlation for nuance
              const meanA = sharedRated.reduce((s, x) => s + x.myScore, 0) / sharedRated.length;
              const meanB = sharedRated.reduce((s, x) => s + x.guestScore, 0) / sharedRated.length;
              let num = 0, denA = 0, denB = 0;
              sharedRated.forEach((x) => {
                const da = x.myScore - meanA;
                const db = x.guestScore - meanB;
                num += da * db;
                denA += da * da;
                denB += db * db;
              });
              let combined = closeness;
              if (denA > 0 && denB > 0) {
                const corr = num / Math.sqrt(denA * denB);
                const corrNorm = (corr + 1) / 2;
                combined = closeness * 0.72 + corrNorm * 0.28;
              }
              const peakBonus = (peakOverlap / PEAK_FICTION.length) * 0.06;
              pct = Math.max(5, Math.min(99, Math.round((combined + peakBonus) * 100)));
            } else {
              // Fallback if guest rarely puts numeric ratings
              const overlapRatio = Math.min(1, sharedAll.length / Math.min(80, Math.max(20, guestRates.length)));
              const peakRatio = peakOverlap / PEAK_FICTION.length;
              pct = Math.max(10, Math.min(88, Math.round((overlapRatio * 0.6 + peakRatio * 0.4) * 95)));
            }

            // Shared 9-10 favorites (or best high-rated shared fallback)
            const eliteMatches = sharedRated
              .filter((x) => x.myScore >= 9 && x.guestScore >= 9)
              .sort((a, b) => (b.myScore + b.guestScore) - (a.myScore + a.guestScore) || a.diff - b.diff);

            const hasEliteMatches = eliteMatches.length > 0;
            const fallbackShared = sharedRated.length
              ? [...sharedRated]
                  .filter((x) => x.myScore >= 8 && x.guestScore >= 8)
                  .sort((a, b) => (b.myScore + b.guestScore) - (a.myScore + a.guestScore) || a.diff - b.diff)
              : [...sharedAll].sort((a, b) => b.myScore - a.myScore);

            const topShared = (hasEliteMatches ? eliteMatches : fallbackShared).slice(0, 4);

            // Conflicts (largest disagreement >= 2 points)
            const conflicts = sharedRated
              .filter((x) => x.diff >= 2)
              .sort((a, b) => b.diff - a.diff || Math.max(b.myScore, b.guestScore) - Math.max(a.myScore, a.guestScore))
              .slice(0, 3);

            const tierInfo = computeVerdictTier(pct, isSelf, sharedAll.length, sharedRated.length);

            setStatus('', '');
            renderVerdictUI({
              guestNick,
              guestAvatar,
              pct,
              mad,
              sharedCount: sharedAll.length,
              ratedSharedCount: sharedRated.length,
              peakOverlap,
              hasEliteMatches,
              sharedFavoritesCount: hasEliteMatches ? eliteMatches.length : fallbackShared.length,
              topShared,
              conflicts,
              ...tierInfo
            });
          } catch (err) {
            console.warn('Taste match failed:', err);
            setStatus('Ошибка при обращении к Shikimori API — попробуй ещё раз чуть позже.', 'error');
          } finally {
            submitBtn.disabled = false;
          }
        }

        form.addEventListener('submit', (e) => {
          e.preventDefault();
          runTasteMatch(input.value);
        });

        dlPngBtn?.addEventListener('click', downloadVerdictPng);

        copyTextBtn?.addEventListener('click', async () => {
          if (!lastMatchVerdict) return;
          const v = lastMatchVerdict;
          const topConf = v.conflicts[0]
            ? ` · Главный конфликт: ${v.conflicts[0].title} (я ${v.conflicts[0].guestScore}★ vs он ${v.conflicts[0].myScore}★)`
            : '';
          const txt = `◈ undexeror // archive — Проверка на базу: ${v.pct}% (${v.title}) · Общих тайтлов: ${v.sharedCount}${topConf} → https://undexerorrr.github.io/`;
          try {
            await navigator.clipboard.writeText(txt);
            const orig = copyTextBtn.textContent;
            copyTextBtn.textContent = '✓ Скопировано!';
            setTimeout(() => { copyTextBtn.textContent = orig; }, 1800);
          } catch (e) {}
        });

        document.getElementById('base-to-coop-btn')?.addEventListener('click', () => {
          const guestNick = lastMatchVerdict?.guestNick || input.value || '';
          if (typeof coopOpenWithGuestHook === 'function') {
            coopOpenWithGuestHook(guestNick);
          }
        });

        resetBtn?.addEventListener('click', () => {
          input.value = '';
          input.focus();
          setStatus('', '');
        });
      }

      /* =========================================
         STAGE 3 NEW: 1v1 TOURNAMENT ARENA («КТО ЛУЧШИЙ ИЗ МОЕГО ТОПА?»)
         ========================================= */
      function initTournamentArena() {
        const backdrop = document.getElementById('arena-modal');
        const closeBtn = document.getElementById('arena-close');
        const waifuLaunchBtn = document.getElementById('waifu-arena-btn');
        const collLaunchBtn = document.getElementById('collection-arena-btn');

        const catBtns = Array.from(document.querySelectorAll('[data-arena-cat]'));
        const sizeBtns = Array.from(document.querySelectorAll('[data-arena-size]'));

        const playView = document.getElementById('arena-play-view');
        const champView = document.getElementById('arena-champion-view');
        const roundLabel = document.getElementById('arena-round-label');
        const stepCounter = document.getElementById('arena-step-counter');
        const progressFill = document.getElementById('arena-progress-fill');

        const leftBtn = document.getElementById('arena-left-btn');
        const rightBtn = document.getElementById('arena-right-btn');
        const leftImg = document.getElementById('arena-left-img');
        const rightImg = document.getElementById('arena-right-img');
        const leftName = document.getElementById('arena-left-name');
        const rightName = document.getElementById('arena-right-name');
        const leftSub = document.getElementById('arena-left-sub');
        const rightSub = document.getElementById('arena-right-sub');

        const champImg = document.getElementById('arena-champ-img');
        const champKicker = document.getElementById('arena-champ-kicker');
        const champName = document.getElementById('arena-champ-name');
        const champSub = document.getElementById('arena-champ-sub');
        const champCompare = document.getElementById('arena-champ-compare');
        const podiumRow = document.getElementById('arena-podium-row');
        const champLink = document.getElementById('arena-champ-link');
        const dlPngBtn = document.getElementById('arena-download-png-btn');
        const replayBtn = document.getElementById('arena-replay-btn');

        if (!backdrop) return;

        const CAT_LABELS = {
          peak: 'PEAK FICTION',
          waifu: 'WAIFU',
          literally: 'LITERALLY ME'
        };

        let activeCat = 'peak';
        let activeSize = 8;
        let roundQueue = [];
        let nextRound = [];
        let roundMatchIdx = 0;
        let roundTotalMatches = 0;
        let totalMatchesTarget = 7;
        let completedMatches = 0;
        let isAnimatingPick = false;
        let currentPair = null;
        let semifinalLosers = [];
        let finalRunnerUp = null;
        let lastArenaResult = null;

        function shuffleArr(arr) {
          const a = [...arr];
          for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
          }
          return a;
        }

        function getCategoryItems(cat) {
          if (cat === 'waifu') {
            return WAIFU_LIST.map((w) => ({
              id: w.key,
              rank: w.rank,
              name: w.name,
              sub: w.anime,
              img: coverCache['char_' + w.key] || w.shikiImg || '',
              url: w.url || `${activeShikiOrigin}/undereror+nyashka/favorites`
            }));
          }
          if (cat === 'literally') {
            return LITERALLY_ME.map((c) => ({
              id: c.key,
              rank: c.rank,
              name: c.name,
              sub: c.anime,
              img: coverCache['char_' + c.key] || '',
              url: `${activeShikiOrigin}/characters?search=${encodeURIComponent(c.search)}`
            }));
          }
          return PEAK_FICTION.map((a) => ({
            id: String(a.malId),
            rank: a.rank,
            name: a.title,
            sub: `${a.kind} · ${a.year} · ★ ${a.score.toFixed(2)}`,
            img: coverCache['anime_' + a.malId] || '',
            url: `${activeShikiOrigin}/animes/${a.malId}`
          }));
        }

        function getRoundTitle(pairsCount) {
          if (pairsCount <= 1) return 'ФИНАЛ';
          if (pairsCount === 2) return 'ПОЛУФИНАЛ';
          if (pairsCount <= 4) return 'ЧЕТВЕРТЬФИНАЛ';
          return '1/8 ФИНАЛА';
        }

        function updateModeTabs() {
          catBtns.forEach((b) => b.classList.toggle('active', b.dataset.arenaCat === activeCat));
          sizeBtns.forEach((b) => b.classList.toggle('active', Number(b.dataset.arenaSize) === activeSize));
        }

        function startTournament(cat, size) {
          if (cat) activeCat = cat;
          if (size) activeSize = size;
          updateModeTabs();

          const allItems = getCategoryItems(activeCat);
          let pool;
          if (activeSize === 8 && allItems.length > 8) {
            // Balanced draw: pick 2 from top-4 + 6 from the rest so every run is exciting
            const topBucket = shuffleArr(allItems.slice(0, 4)).slice(0, 2);
            const restBucket = shuffleArr(allItems.slice(4)).slice(0, 6);
            pool = shuffleArr([...topBucket, ...restBucket]);
          } else {
            pool = shuffleArr(allItems);
          }

          roundQueue = [];
          nextRound = [];
          semifinalLosers = [];
          finalRunnerUp = null;
          lastArenaResult = null;
          completedMatches = 0;
          totalMatchesTarget = Math.max(1, pool.length - 1);

          // If odd count (e.g., 15 waifu in full mode), give 1 contender a bye into next round
          if (pool.length % 2 === 1) {
            nextRound.push(pool.pop());
          }
          for (let i = 0; i < pool.length; i += 2) {
            roundQueue.push([pool[i], pool[i + 1]]);
          }
          roundMatchIdx = 0;
          roundTotalMatches = roundQueue.length;

          if (playView) playView.style.display = 'flex';
          champView?.classList.remove('is-visible');
          renderCurrentDuel();
        }

        function renderCurrentDuel() {
          if (!roundQueue.length) {
            if (nextRound.length === 1) {
              showChampion(nextRound[0]);
              return;
            }
            const nextPool = shuffleArr(nextRound);
            nextRound = [];
            if (nextPool.length % 2 === 1) {
              nextRound.push(nextPool.pop());
            }
            for (let i = 0; i < nextPool.length; i += 2) {
              roundQueue.push([nextPool[i], nextPool[i + 1]]);
            }
            roundMatchIdx = 0;
            roundTotalMatches = roundQueue.length;
          }

          currentPair = roundQueue.shift();
          roundMatchIdx++;

          const [a, b] = currentPair;
          const rTitle = getRoundTitle(roundTotalMatches);
          if (roundLabel) {
            roundLabel.textContent = roundTotalMatches > 1
              ? `${rTitle} · ${roundMatchIdx} / ${roundTotalMatches}`
              : '★ ФИНАЛ ТУРНИРА';
          }
          if (stepCounter) {
            stepCounter.textContent = `МАТЧ ${completedMatches + 1} ИЗ ${totalMatchesTarget}`;
          }
          if (progressFill) {
            progressFill.style.width = `${Math.round((completedMatches / totalMatchesTarget) * 100)}%`;
          }

          leftBtn?.classList.remove('is-picked', 'is-eliminated');
          rightBtn?.classList.remove('is-picked', 'is-eliminated');

          if (leftImg) { leftImg.src = a.img || ''; leftImg.alt = a.name; }
          if (leftName) leftName.textContent = a.name;
          if (leftSub) leftSub.textContent = a.sub;

          if (rightImg) { rightImg.src = b.img || ''; rightImg.alt = b.name; }
          if (rightName) rightName.textContent = b.name;
          if (rightSub) rightSub.textContent = b.sub;
        }

        function pickWinner(side) {
          if (isAnimatingPick || !currentPair) return;
          isAnimatingPick = true;
          const [a, b] = currentPair;
          const winner = side === 'left' ? a : b;
          const loser = side === 'left' ? b : a;

          const winBtn = side === 'left' ? leftBtn : rightBtn;
          const loseBtn = side === 'left' ? rightBtn : leftBtn;
          winBtn?.classList.add('is-picked');
          loseBtn?.classList.add('is-eliminated');

          if (roundTotalMatches === 2) {
            semifinalLosers.push(loser);
          } else if (roundTotalMatches === 1) {
            finalRunnerUp = loser;
          }

          nextRound.push(winner);
          completedMatches++;

          setTimeout(() => {
            isAnimatingPick = false;
            renderCurrentDuel();
          }, 240);
        }

        function buildRankReaction(winner, totalInCat) {
          const r = winner.rank;
          if (r === 1) {
            return `<strong>100% попадание в базу!</strong> У undereror <strong>${escapeHtml(winner.name)}</strong> — тоже абсолютный <strong>#01</strong> из ${totalInCat}.`;
          }
          if (r <= 3) {
            return `<strong>Почти в яблочко.</strong> У тебя это #01, а у undereror — в святой тройке на <strong>#${formatRank(r)}</strong> месте.`;
          }
          if (r <= 8) {
            return `<strong>Крепкий выбор.</strong> У undereror в личном рейтинге это стоит на <strong>#${formatRank(r)}</strong> месте из ${totalInCat}.`;
          }
          return `<strong>Андердог прорвался в финал!</strong> У тебя это #01, а у undereror — только <strong>#${formatRank(r)}</strong> место из ${totalInCat}.`;
        }

        function showChampion(winner) {
          if (progressFill) progressFill.style.width = '100%';
          if (playView) playView.style.display = 'none';
          champView?.classList.add('is-visible');

          const totalInCat = getCategoryItems(activeCat).length;
          const catTitle = CAT_LABELS[activeCat] || 'PEAK FICTION';

          if (champKicker) champKicker.textContent = `★ ТВОЙ #1 ЧЕМПИОН · ${catTitle}`;
          if (champImg) { champImg.src = winner.img || ''; champImg.alt = winner.name; }
          if (champName) champName.textContent = winner.name;
          if (champSub) champSub.textContent = winner.sub;
          if (champCompare) champCompare.innerHTML = buildRankReaction(winner, totalInCat);
          if (champLink) champLink.href = winner.url || `${activeShikiOrigin}/undereror+nyashka`;

          const podiumItems = [];
          if (finalRunnerUp) {
            podiumItems.push({ label: '2 место · Финалист', item: finalRunnerUp });
          }
          semifinalLosers.slice(0, 2).forEach((s, idx) => {
            podiumItems.push({ label: `3–4 место · Полуфинал`, item: s });
          });

          if (podiumRow) {
            podiumRow.innerHTML = podiumItems.map((p) => `
              <div class="arena-podium-slot">
                <div class="p-rank">${escapeHtml(p.label)}</div>
                <div class="p-name">${escapeHtml(p.item.name)}</div>
                <div class="p-sub">Топ undereror: #${formatRank(p.item.rank)}</div>
              </div>
            `).join('');
          }

          lastArenaResult = {
            cat: activeCat,
            catTitle,
            totalInCat,
            size: activeSize,
            winner,
            runnerUp: finalRunnerUp,
            semis: semifinalLosers.slice(0, 2)
          };
        }

        function downloadArenaPng() {
          if (!lastArenaResult) return;
          const res = lastArenaResult;
          const W = 1200;
          const H = 675;
          const c = document.createElement('canvas');
          c.width = W;
          c.height = H;
          const ctx = c.getContext('2d');

          function rRect(x, y, w, h, r) {
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.arcTo(x + w, y, x + w, y + h, r);
            ctx.arcTo(x + w, y + h, x, y + h, r);
            ctx.arcTo(x, y + h, x, y, r);
            ctx.arcTo(x, y, x + w, y, r);
            ctx.closePath();
          }
          function clipText(txt, maxW) {
            let s = String(txt || '');
            if (ctx.measureText(s).width <= maxW) return s;
            while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
            return s + '…';
          }

          // Background
          const g = ctx.createLinearGradient(0, 0, W, H);
          g.addColorStop(0, '#07090f');
          g.addColorStop(0.5, '#0c111e');
          g.addColorStop(1, '#06080d');
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, W, H);

          const halo = ctx.createRadialGradient(320, 250, 20, 320, 250, 440);
          halo.addColorStop(0, res.winner.rank <= 3 ? 'rgba(110, 231, 183, 0.16)' : 'rgba(173, 191, 222, 0.18)');
          halo.addColorStop(1, 'transparent');
          ctx.fillStyle = halo;
          ctx.fillRect(0, 0, W, H);

          ctx.strokeStyle = 'rgba(173, 191, 222, 0.045)';
          for (let x = 40; x < W; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
          for (let y = 40; y < H; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

          rRect(26, 26, W - 52, H - 52, 22);
          ctx.strokeStyle = 'rgba(173, 191, 222, 0.25)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Header
          ctx.fillStyle = '#adbfde';
          ctx.font = '600 15px "JetBrains Mono", monospace';
          ctx.fillText(`⚔  UNDEXEROR // ARCHIVE   ·   ТУРНИР 1v1 (${res.catTitle})`, 62, 74);

          ctx.textAlign = 'right';
          ctx.fillStyle = 'rgba(205, 212, 224, 0.56)';
          ctx.fillText(new Date().toLocaleDateString('ru-RU'), W - 62, 74);
          ctx.textAlign = 'left';

          ctx.strokeStyle = 'rgba(173, 191, 222, 0.16)';
          ctx.beginPath(); ctx.moveTo(62, 94); ctx.lineTo(W - 62, 94); ctx.stroke();

          // Champion Main Card
          rRect(62, 122, W - 124, 250, 18);
          ctx.fillStyle = 'rgba(10, 14, 24, 0.82)';
          ctx.fill();
          ctx.strokeStyle = res.winner.rank <= 3 ? 'rgba(110, 231, 183, 0.48)' : 'rgba(173, 191, 222, 0.36)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Left rank emblem
          rRect(96, 162, 170, 170, 20);
          ctx.fillStyle = 'rgba(7, 10, 17, 0.90)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(173, 191, 222, 0.35)';
          ctx.stroke();

          ctx.textAlign = 'center';
          ctx.fillStyle = '#6ee7b7';
          ctx.font = '600 13px "JetBrains Mono", monospace';
          ctx.fillText('ТВОЙ ВЫБОР', 181, 204);
          ctx.fillStyle = '#ffffff';
          ctx.font = '700 58px "JetBrains Mono", monospace';
          ctx.fillText('#01', 181, 270);
          ctx.fillStyle = 'rgba(205, 212, 224, 0.65)';
          ctx.font = '600 12px "JetBrains Mono", monospace';
          ctx.fillText(`У UNDEREROR: #${formatRank(res.winner.rank)}`, 181, 308);
          ctx.textAlign = 'left';

          ctx.fillStyle = '#6ee7b7';
          ctx.font = '600 14px "JetBrains Mono", monospace';
          ctx.fillText(`★ ЧЕМПИОН ТУРНИРА · ${res.catTitle}`, 300, 186);

          ctx.fillStyle = '#ffffff';
          ctx.font = '700 38px "Inter", sans-serif';
          ctx.fillText(clipText(res.winner.name, 790), 300, 238);

          ctx.fillStyle = 'rgba(205, 212, 224, 0.72)';
          ctx.font = '500 17px "JetBrains Mono", monospace';
          ctx.fillText(clipText(res.winner.sub, 790), 300, 274);

          const plainCompare = res.winner.rank === 1
            ? `100% попадание в базу! У undereror это тоже #01 из ${res.totalInCat}.`
            : res.winner.rank <= 3
              ? `Почти в яблочко — у undereror это в святой тройке (#${formatRank(res.winner.rank)}).`
              : `У undereror в личном топе это стоит на #${formatRank(res.winner.rank)} месте из ${res.totalInCat}.`;
          ctx.fillStyle = '#dce8ff';
          ctx.font = '500 18px "Inter", sans-serif';
          ctx.fillText(clipText(plainCompare, 790), 300, 326);

          // Podium Cards
          const slots = [];
          if (res.runnerUp) slots.push({ tag: '2 МЕСТО · ФИНАЛИСТ', item: res.runnerUp });
          res.semis.forEach((s) => slots.push({ tag: '3–4 МЕСТО · ПОЛУФИНАЛ', item: s }));

          const slotW = (W - 124 - 36) / 3;
          slots.slice(0, 3).forEach((s, idx) => {
            const sx = 62 + idx * (slotW + 18);
            const sy = 402;
            rRect(sx, sy, slotW, 174, 16);
            ctx.fillStyle = 'rgba(9, 12, 20, 0.80)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(173, 191, 222, 0.22)';
            ctx.stroke();

            ctx.fillStyle = '#adbfde';
            ctx.font = '600 12px "JetBrains Mono", monospace';
            ctx.fillText(s.tag, sx + 22, sy + 38);

            ctx.fillStyle = '#ffffff';
            ctx.font = '700 21px "Inter", sans-serif';
            ctx.fillText(clipText(s.item.name, slotW - 44), sx + 22, sy + 84);

            ctx.fillStyle = 'rgba(205, 212, 224, 0.65)';
            ctx.font = '500 13px "JetBrains Mono", monospace';
            ctx.fillText(clipText(s.item.sub, slotW - 44), sx + 22, sy + 114);

            ctx.fillStyle = '#cbd5e1';
            ctx.fillText(`У undereror: #${formatRank(s.item.rank)}`, sx + 22, sy + 148);
          });

          // Footer
          ctx.fillStyle = 'rgba(205, 212, 224, 0.56)';
          ctx.font = '500 13px "JetBrains Mono", monospace';
          ctx.fillText('СЫГРАЙ В ТУРНИР 1v1  →  https://undexerorrr.github.io/', 62, H - 46);
          ctx.textAlign = 'right';
          ctx.fillStyle = 'rgba(173, 191, 222, 0.65)';
          ctx.fillText('undexeror // archive', W - 62, H - 46);

          const link = document.createElement('a');
          link.download = `tournament-${res.cat}-champion.png`;
          link.href = c.toDataURL('image/png');
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }

        function openArena(cat) {
          backdrop.classList.add('is-open');
          backdrop.setAttribute('aria-hidden', 'false');
          startTournament(cat || activeCat, activeSize);
        }

        function closeArena() {
          backdrop.classList.remove('is-open');
          backdrop.setAttribute('aria-hidden', 'true');
        }

        waifuLaunchBtn?.addEventListener('click', () => openArena('waifu'));
        collLaunchBtn?.addEventListener('click', () => openArena(currentTab === 'literally' ? 'literally' : 'peak'));
        closeBtn?.addEventListener('click', closeArena);
        backdrop.addEventListener('click', (e) => {
          if (e.target === backdrop) closeArena();
        });

        catBtns.forEach((btn) => {
          btn.addEventListener('click', () => startTournament(btn.dataset.arenaCat, activeSize));
        });

        sizeBtns.forEach((btn) => {
          btn.addEventListener('click', () => startTournament(activeCat, Number(btn.dataset.arenaSize) || 8));
        });

        leftBtn?.addEventListener('click', () => pickWinner('left'));
        rightBtn?.addEventListener('click', () => pickWinner('right'));
        replayBtn?.addEventListener('click', () => startTournament(activeCat, activeSize));
        dlPngBtn?.addEventListener('click', downloadArenaPng);

        window.addEventListener('keydown', (e) => {
          if (!backdrop.classList.contains('is-open')) return;
          if (e.key === 'Escape') {
            closeArena();
          } else if (playView && playView.style.display !== 'none') {
            if (e.key === 'ArrowLeft' || e.key === '1') {
              e.preventDefault();
              pickWinner('left');
            } else if (e.key === 'ArrowRight' || e.key === '2') {
              e.preventDefault();
              pickWinner('right');
            }
          }
        });
      }

      /* =========================================
         RANDOMIZER («ЧТО ПОСМОТРЕТЬ ОТ МЕНЯ» — TOP 16 + 9–10★ SHIKIMORI)
         ========================================= */
      function initRandomizer() {
        const triggerBtn = document.getElementById('randomizer-btn');
        const backdrop = document.getElementById('pack-modal');
        const closeBtn = document.getElementById('pack-close');
        const stage = document.getElementById('pack-stage');
        const pouch = document.getElementById('pack-pouch');
        const topStrip = document.getElementById('pack-top-strip');
        const tearLabel = document.getElementById('pack-tear-label');
        const brandSub = document.getElementById('pack-brand-sub');
        const syncBadge = document.getElementById('pack-sync-badge');
        const dropCounterEl = document.getElementById('pack-drop-counter');
        const modeBtns = Array.from(document.querySelectorAll('.pack-mode-btn'));

        const sealedActions = document.getElementById('pack-sealed-actions');
        const revealedActions = document.getElementById('pack-revealed-actions');
        const quickRipBtn = document.getElementById('pack-quick-rip-btn');
        const flipBtn = document.getElementById('pack-flip-btn');
        const againBtn = document.getElementById('pack-again-btn');
        const shikiQuickBtn = document.getElementById('pack-shiki-quick-btn');
        const historyBar = document.getElementById('pack-history-bar');
        const kbdHint = document.getElementById('pack-kbd-hint');

        const holoTilt = document.getElementById('pack-holo-tilt');
        const holoFlipper = document.getElementById('pack-holo-flipper');
        const cardImg = document.getElementById('pack-card-img');
        const rarityChip = document.getElementById('pack-rarity-chip');
        const serialEl = document.getElementById('pack-serial');
        const catLabel = document.getElementById('pack-cat-label');
        const frontTitle = document.getElementById('pack-front-title');
        const frontSub = document.getElementById('pack-front-sub');
        const frontScore = document.getElementById('pack-front-score');
        const backDeck = document.getElementById('pack-back-deck');
        const backSerial = document.getElementById('pack-back-serial');
        const backTitle = document.getElementById('pack-back-title');
        const backSub = document.getElementById('pack-back-sub');
        const backPills = document.getElementById('pack-back-pills');
        const backNote = document.getElementById('pack-back-note-text');
        const backVibes = document.getElementById('pack-back-vibes');
        const cardLink = document.getElementById('pack-card-link');

        if (!triggerBtn || !backdrop || !stage || !pouch || !holoTilt || !holoFlipper) return;

        let packState = 'sealed'; // 'sealed' | 'ripping' | 'revealed'
        let dropNumber = 0;
        let lastMalId = null;
        let pendingWinner = null;
        let currentDrop = null;
        let cardFlipped = false;
        let sessionDrops = [];
        let ripSeqToken = 0;

        function getActivePool() {
          if (randomizerMode === 'peak') {
            return PEAK_FICTION.map((a) => ({ ...a, source: 'peak' }));
          }
          return getCombinedRandomizerPool();
        }

        function pickRandomAnime(pool, excludeId) {
          const filtered = pool.filter((a) => a.malId !== excludeId);
          const list = filtered.length ? filtered : pool;
          return list[Math.floor(Math.random() * list.length)] || PEAK_FICTION[0];
        }

        function computeDropRarity(a) {
          const isPeak = a.source === 'peak' || typeof a.rank === 'number';
          const uScore = Number(a.userScore) || 0;
          const sScore = Number(a.score) || 0;
          if ((isPeak && a.rank <= 3) || uScore >= 10) {
            return { key: 'mythic', label: '★ MYTHIC', short: 'MYTHIC' };
          }
          if ((isPeak && a.rank <= 10) || (uScore >= 9 && sScore >= 8.2)) {
            return { key: 'ssr', label: '◈ SSR', short: 'SSR' };
          }
          return { key: 'sr', label: '◇ SR', short: 'SR' };
        }

        function updateModeButtons() {
          modeBtns.forEach((b) => b.classList.toggle('active', b.dataset.pmode === randomizerMode));
          if (brandSub) {
            brandSub.textContent = randomizerMode === 'peak'
              ? 'TOP 16 PEAK EDITION'
              : 'CURATED 9–10★ EDITION';
          }
        }

        function setTearProgress(val) {
          const clamped = Math.max(0, Math.min(1, val));
          pouch.style.setProperty('--tear', clamped.toFixed(3));
        }

        function resetTiltOn(el) {
          if (!el) return;
          el.classList.add('is-resetting');
          el.style.setProperty('--rx', '0deg');
          el.style.setProperty('--ry', '0deg');
          el.style.setProperty('--hx', '50%');
          el.style.setProperty('--hy', '48%');
          el.style.setProperty('--hbg-x', '50%');
          el.style.setProperty('--hbg-y', '50%');
          el.style.setProperty('--hop', '0.28');
        }

        function applyTiltOn(el, clientX, clientY, maxX, maxY) {
          const rect = el.getBoundingClientRect();
          if (!rect.width || !rect.height) return;
          const nx = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
          const ny = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
          const dx = nx - 0.5;
          const dy = ny - 0.5;
          const rx = (-dy * maxX).toFixed(2);
          const ry = (dx * maxY).toFixed(2);
          const intensity = Math.min(0.88, 0.28 + Math.hypot(dx, dy) * 0.95);
          el.classList.remove('is-resetting');
          el.style.setProperty('--rx', `${rx}deg`);
          el.style.setProperty('--ry', `${ry}deg`);
          el.style.setProperty('--hx', `${(nx * 100).toFixed(1)}%`);
          el.style.setProperty('--hy', `${(ny * 100).toFixed(1)}%`);
          el.style.setProperty('--hbg-x', `${(16 + nx * 68).toFixed(1)}%`);
          el.style.setProperty('--hbg-y', `${(16 + ny * 68).toFixed(1)}%`);
          el.style.setProperty('--hop', intensity.toFixed(3));
        }

        function preloadWinnerArt(a) {
          if (!a) return;
          const cached = coverCache['anime_' + a.malId] || a.shikiImg || '';
          if (cached) {
            const img = new Image();
            img.src = cached;
          }
          if (a.malId && !coverCache['anime_' + a.malId]) {
            loadAnimeCoversBatch([a.malId]).then(() => {
              const hd = coverCache['anime_' + a.malId];
              if (hd && currentDrop && currentDrop.anime.malId === a.malId && cardImg) {
                cardImg.src = hd;
                renderSessionHistory();
              }
            });
          }
        }

        function prepareSealedPack() {
          ripSeqToken++;
          packState = 'sealed';
          cardFlipped = false;
          stage.dataset.state = 'sealed';
          stage.classList.remove('is-flashing', 'is-dropping');
          topStrip?.classList.remove('is-sheared');
          holoFlipper.classList.remove('is-flipped');
          setTearProgress(0);
          resetTiltOn(pouch);
          resetTiltOn(holoTilt);

          if (sealedActions) sealedActions.style.display = 'flex';
          if (revealedActions) revealedActions.style.display = 'none';
          if (tearLabel) tearLabel.textContent = '✂ ТЯНИ ВПРАВО ИЛИ КЛИКНИ ▸▸▸';
          if (dropCounterEl) {
            dropCounterEl.textContent = `ARCHIVE PACK · #${formatRank(dropNumber + 1)}`;
          }
          if (kbdHint) {
            kbdHint.textContent = 'Проведи по кромке пакета или кликни, чтобы вскрыть · Пробел — вскрыть · Esc — выход';
          }

          updateModeButtons();
          updateRandomizerPoolCounts();

          const pool = getActivePool();
          pendingWinner = pickRandomAnime(pool, lastMalId);
          preloadWinnerArt(pendingWinner);

          if (randomizerMode === 'all' && ratedAnimePool.length === 0) {
            if (syncBadge) syncBadge.textContent = 'SYNC 9–10★...';
            loadHostAnimeRates().then(() => {
              updateRandomizerPoolCounts();
              if (packState === 'sealed') {
                if (syncBadge) syncBadge.textContent = `POOL ${getActivePool().length}`;
                pendingWinner = pickRandomAnime(getActivePool(), lastMalId);
                preloadWinnerArt(pendingWinner);
              }
            });
          } else if (syncBadge) {
            syncBadge.textContent = `POOL ${pool.length}`;
          }
        }

        function renderDropCard(dropEntry) {
          if (!dropEntry) return;
          currentDrop = dropEntry;
          const a = dropEntry.anime;
          const rarity = dropEntry.rarity;
          const isPeak = a.source === 'peak' || typeof a.rank === 'number';
          const imgUrl = coverCache['anime_' + a.malId] || a.shikiImg || '';
          const serialStr = isPeak ? `NO.${formatRank(a.rank)} / 16` : `DROP #${formatRank(dropEntry.num)}`;
          const shikiHref = a.url || `${activeShikiOrigin}/animes/${a.malId}`;

          holoTilt.dataset.rarity = rarity.key;
          cardFlipped = false;
          holoFlipper.classList.remove('is-flipped');
          resetTiltOn(holoTilt);

          if (cardImg) {
            cardImg.src = imgUrl;
            cardImg.alt = a.title;
          }
          if (rarityChip) rarityChip.textContent = rarity.label;
          if (serialEl) serialEl.textContent = serialStr;
          if (catLabel) {
            catLabel.textContent = isPeak ? 'PEAK FICTION · PACK DROP' : '9–10★ ARCHIVE · PACK DROP';
          }
          if (frontTitle) frontTitle.textContent = a.title;
          if (frontSub) frontSub.textContent = [a.kind, a.year].filter(Boolean).join(' · ');
          if (frontScore) {
            if (a.userScore && a.score) {
              frontScore.textContent = `Я ${a.userScore}/10 · ★${Number(a.score).toFixed(2)}`;
            } else if (a.userScore) {
              frontScore.textContent = `Я ${a.userScore}/10`;
            } else if (a.score) {
              frontScore.textContent = `★ ${Number(a.score).toFixed(2)}`;
            } else {
              frontScore.textContent = 'ARCHIVE';
            }
          }

          if (backDeck) {
            backDeck.textContent = isPeak ? 'PEAK FICTION // DOSSIER' : 'ARCHIVE DROP // DOSSIER';
          }
          if (backSerial) backSerial.textContent = `${serialStr} · ${rarity.short}`;
          if (backTitle) backTitle.textContent = a.title;
          if (backSub) backSub.textContent = [a.kind, a.year].filter(Boolean).join(' · ');

          const pills = [];
          if (isPeak && a.rank) pills.push(`Топ #${formatRank(a.rank)}`);
          if (a.userScore) pills.push(`Моя оценка ${a.userScore}/10`);
          if (a.score) pills.push(`Шики ★ ${Number(a.score).toFixed(2)}`);
          if (a.year) pills.push(String(a.year));
          if (backPills) {
            backPills.innerHTML = pills.map((p) => `<span class="modal-pill">${escapeHtml(p)}</span>`).join('');
          }

          if (backNote) {
            backNote.textContent = a.note
              ? `«${a.note}»`
              : 'Рекомендация из личного архива undereror nyashka на Shikimori.';
          }

          const vibes = (a.vibes && a.vibes.length)
            ? a.vibes
            : [isPeak ? '#peak-fiction' : '#9-10★', a.userScore ? `#${a.userScore}/10` : '#archive'];
          if (backVibes) {
            backVibes.innerHTML = vibes.map((v) => `<span class="vibe-tag">${escapeHtml(v)}</span>`).join('');
          }

          if (cardLink) cardLink.href = shikiHref;
          if (shikiQuickBtn) shikiQuickBtn.href = shikiHref;
          if (flipBtn) flipBtn.textContent = '↻ Перевернуть';
          if (dropCounterEl) {
            dropCounterEl.textContent = `DROP #${formatRank(dropEntry.num)} · ${rarity.short}`;
          }

          preloadWinnerArt(a);
          renderSessionHistory();
        }

        function renderSessionHistory() {
          if (!historyBar) return;
          if (!sessionDrops.length) {
            historyBar.classList.remove('is-visible');
            historyBar.innerHTML = '';
            return;
          }
          historyBar.classList.add('is-visible');
          historyBar.innerHTML = sessionDrops.map((entry, idx) => {
            const img = coverCache['anime_' + entry.anime.malId] || entry.anime.shikiImg || '';
            const isActive = packState === 'revealed' && currentDrop && currentDrop.num === entry.num;
            const cls = ['pack-hist-chip'];
            if (isActive) cls.push('active');
            if (entry.rarity.key === 'mythic') cls.push('is-mythic');
            return `
              <button type="button" class="${cls.join(' ')}" data-hidx="${idx}" title="${escapeHtml(entry.anime.title)}">
                <img src="${escapeHtml(img)}" alt="" />
                <span>${escapeHtml(entry.anime.title)}</span>
              </button>
            `;
          }).join('');

          historyBar.querySelectorAll('.pack-hist-chip').forEach((btn) => {
            btn.addEventListener('click', () => {
              const entry = sessionDrops[Number(btn.dataset.hidx)];
              if (!entry || packState === 'ripping') return;
              packState = 'revealed';
              stage.dataset.state = 'revealed';
              stage.classList.remove('is-flashing', 'is-dropping');
              if (sealedActions) sealedActions.style.display = 'none';
              if (revealedActions) revealedActions.style.display = 'flex';
              renderDropCard(entry);
            });
          });
        }

        async function triggerRipOpen(fromDrag) {
          if (packState !== 'sealed') return;
          const myToken = ++ripSeqToken;
          packState = 'ripping';
          stage.dataset.state = 'ripping';
          if (tearLabel) tearLabel.textContent = '✦ ВСКРЫТИЕ...';

          // Wait briefly if first-time visitor is still pulling the 9-10 pool
          if (randomizerMode === 'all' && ratedAnimePool.length === 0) {
            if (syncBadge) syncBadge.textContent = 'SYNC...';
            await Promise.race([loadHostAnimeRates(), sleep(2600)]);
            if (myToken !== ripSeqToken || !backdrop.classList.contains('is-open')) return;
            updateRandomizerPoolCounts();
            if (ratedAnimePool.length > 0) {
              pendingWinner = pickRandomAnime(getActivePool(), lastMalId);
            }
          }

          const winner = pendingWinner || pickRandomAnime(getActivePool(), lastMalId);
          lastMalId = winner.malId;
          preloadWinnerArt(winner);

          // Animate the glowing tear line across if clicked rather than dragged
          if (!fromDrag) {
            const startAt = performance.now();
            const dur = 240;
            await new Promise((resolve) => {
              function step(now) {
                if (myToken !== ripSeqToken) { resolve(); return; }
                const t = Math.min(1, (now - startAt) / dur);
                const eased = 1 - Math.pow(1 - t, 2);
                setTearProgress(eased);
                if (t < 1) requestAnimationFrame(step);
                else resolve();
              }
              requestAnimationFrame(step);
            });
          } else {
            setTearProgress(1);
          }

          if (myToken !== ripSeqToken || !backdrop.classList.contains('is-open')) return;

          // Shear top foil strip + flash + silver micro-sparks
          topStrip?.classList.add('is-sheared');
          stage.classList.remove('is-flashing');
          void stage.offsetWidth;
          stage.classList.add('is-flashing');

          await sleep(165);
          if (myToken !== ripSeqToken || !backdrop.classList.contains('is-open')) return;

          // Drop the torn pouch away and eject the 3D Holo card
          stage.classList.add('is-dropping');
          await sleep(135);
          if (myToken !== ripSeqToken || !backdrop.classList.contains('is-open')) return;

          dropNumber++;
          const dropEntry = {
            num: dropNumber,
            anime: winner,
            rarity: computeDropRarity(winner)
          };
          sessionDrops = [dropEntry, ...sessionDrops.filter((d) => d.anime.malId !== winner.malId)].slice(0, 5);

          packState = 'revealed';
          stage.dataset.state = 'revealed';
          renderDropCard(dropEntry);

          if (sealedActions) sealedActions.style.display = 'none';
          if (revealedActions) revealedActions.style.display = 'flex';
          if (kbdHint) {
            kbdHint.textContent = 'Двигай мышкой для 3D-голограммы · Клик / Пробел — переворот · R — новый пак';
          }
        }

        function togglePackCardFlip() {
          if (packState !== 'revealed') return;
          cardFlipped = !cardFlipped;
          holoFlipper.classList.toggle('is-flipped', cardFlipped);
          if (flipBtn) flipBtn.textContent = cardFlipped ? '↻ Показать арт' : '↻ Перевернуть';
        }

        function openPackOverlay() {
          backdrop.classList.add('is-open');
          backdrop.setAttribute('aria-hidden', 'false');
          prepareSealedPack();
          renderSessionHistory();
        }

        function closePackOverlay() {
          ripSeqToken++;
          backdrop.classList.remove('is-open');
          backdrop.setAttribute('aria-hidden', 'true');
        }

        // Sealed Pack Pointer Interactions: rock-solid stationary-rect 3D tilt (zero flicker) + swipe-to-rip + tap-to-open
        let pouchDown = false;
        let pouchStartX = 0;
        let pouchStartY = 0;
        let pouchDragged = false;
        let pouchCurrentTear = 0;
        let pouchTiltRaf = null;
        let pendingTiltX = 0;
        let pendingTiltY = 0;

        function applyTiltUsingStaticRect(el, refEl, clientX, clientY, maxX, maxY) {
          const rect = refEl.getBoundingClientRect();
          if (!rect.width || !rect.height) return;
          const nx = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
          const ny = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
          const dx = nx - 0.5;
          const dy = ny - 0.5;
          const rx = (-dy * maxX).toFixed(2);
          const ry = (dx * maxY).toFixed(2);
          const intensity = Math.min(0.86, 0.28 + Math.hypot(dx, dy) * 0.90);
          el.classList.remove('is-resetting');
          el.style.setProperty('--rx', `${rx}deg`);
          el.style.setProperty('--ry', `${ry}deg`);
          el.style.setProperty('--hx', `${(nx * 100).toFixed(1)}%`);
          el.style.setProperty('--hy', `${(ny * 100).toFixed(1)}%`);
          el.style.setProperty('--hbg-x', `${(16 + nx * 68).toFixed(1)}%`);
          el.style.setProperty('--hbg-y', `${(16 + ny * 68).toFixed(1)}%`);
          el.style.setProperty('--hop', intensity.toFixed(3));
        }

        function schedulePouchTilt(x, y) {
          pendingTiltX = x;
          pendingTiltY = y;
          if (pouchTiltRaf !== null) return;
          pouchTiltRaf = requestAnimationFrame(() => {
            pouchTiltRaf = null;
            if (packState === 'sealed' && backdrop.classList.contains('is-open')) {
              applyTiltUsingStaticRect(pouch, stage, pendingTiltX, pendingTiltY, 16, 20);
            }
          });
        }

        stage.addEventListener('pointermove', (e) => {
          if (packState !== 'sealed' || !backdrop.classList.contains('is-open')) return;
          if (e.pointerType === 'touch' && !pouchDown) return;
          schedulePouchTilt(e.clientX, e.clientY);
        });

        stage.addEventListener('pointerleave', () => {
          if (!pouchDown && packState === 'sealed') {
            resetTiltOn(pouch);
          }
        });

        pouch.addEventListener('pointerdown', (e) => {
          if (packState !== 'sealed' || !backdrop.classList.contains('is-open')) return;
          pouchDown = true;
          pouchDragged = false;
          pouchCurrentTear = 0;
          pouchStartX = e.clientX;
          pouchStartY = e.clientY;
          try { pouch.setPointerCapture(e.pointerId); } catch (err) {}
        });

        pouch.addEventListener('pointermove', (e) => {
          if (!pouchDown || packState !== 'sealed') return;
          schedulePouchTilt(e.clientX, e.clientY);
          const dx = e.clientX - pouchStartX;
          const dy = e.clientY - pouchStartY;
          if (Math.hypot(dx, dy) > 10) pouchDragged = true;

          const rect = stage.getBoundingClientRect();
          const dragSpan = Math.max(115, rect.width * 0.54);
          if (dx > 6) {
            pouchCurrentTear = Math.min(1, dx / dragSpan);
            setTearProgress(pouchCurrentTear);
            if (pouchCurrentTear >= 0.55) {
              pouchDown = false;
              triggerRipOpen(true);
            }
          }
        });

        function finishPouchPointer(e) {
          if (!pouchDown) return;
          pouchDown = false;
          try { pouch.releasePointerCapture(e.pointerId); } catch (err) {}
          if (packState !== 'sealed') return;

          if (!pouchDragged) {
            triggerRipOpen(false);
          } else if (pouchCurrentTear >= 0.36) {
            triggerRipOpen(true);
          } else {
            pouchCurrentTear = 0;
            setTearProgress(0);
          }
        }

        pouch.addEventListener('pointerup', finishPouchPointer);
        pouch.addEventListener('pointercancel', () => {
          pouchDown = false;
          if (packState === 'sealed') {
            pouchCurrentTear = 0;
            setTearProgress(0);
            resetTiltOn(pouch);
          }
        });

        // Revealed 3D Holo Card Tilt + Flip Interactions
        let cardDownX = 0;
        let cardDownY = 0;
        let cardDragged = false;

        holoTilt.addEventListener('pointerdown', (e) => {
          cardDownX = e.clientX;
          cardDownY = e.clientY;
          cardDragged = false;
        });

        holoTilt.addEventListener('pointermove', (e) => {
          if (packState !== 'revealed') return;
          if (e.pointerType === 'touch' && e.buttons === 0) return;
          if (Math.hypot(e.clientX - cardDownX, e.clientY - cardDownY) > 10) {
            cardDragged = true;
          }
          applyTiltOn(holoTilt, e.clientX, e.clientY, 24, 26);
        });

        holoTilt.addEventListener('pointerleave', () => resetTiltOn(holoTilt));
        holoTilt.addEventListener('pointerup', (e) => {
          if (e.pointerType === 'touch') resetTiltOn(holoTilt);
        });
        holoTilt.addEventListener('pointercancel', () => resetTiltOn(holoTilt));

        holoTilt.addEventListener('click', (e) => {
          if (e.target && e.target.closest('a, button')) return;
          if (cardDragged) {
            cardDragged = false;
            return;
          }
          togglePackCardFlip();
        });

        cardLink?.addEventListener('click', (e) => e.stopPropagation());

        // Pool mode switcher
        modeBtns.forEach((btn) => {
          btn.addEventListener('click', () => {
            if (packState === 'ripping') return;
            const nextMode = btn.dataset.pmode || 'all';
            if (nextMode === randomizerMode && packState === 'sealed') return;
            randomizerMode = nextMode;
            prepareSealedPack();
          });
        });

        triggerBtn.addEventListener('click', openPackOverlay);
        closeBtn?.addEventListener('click', closePackOverlay);
        backdrop.addEventListener('click', (e) => {
          if (e.target === backdrop) closePackOverlay();
        });
        quickRipBtn?.addEventListener('click', () => triggerRipOpen(false));
        flipBtn?.addEventListener('click', togglePackCardFlip);
        againBtn?.addEventListener('click', prepareSealedPack);

        window.addEventListener('keydown', (e) => {
          if (!backdrop.classList.contains('is-open')) return;
          if (e.key === 'Escape') {
            closePackOverlay();
          } else if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            if (packState === 'sealed') triggerRipOpen(false);
            else if (packState === 'revealed') togglePackCardFlip();
          } else if ((e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К') && packState === 'revealed') {
            e.preventDefault();
            prepareSealedPack();
          }
        });

        updateRandomizerPoolCounts();
      }

      /* =========================================
         V15 STAGE 3: 3D ARCHIVE GALAXY ENGINE (WEBGL / THREE.JS)
         ========================================= */
      let threeLoadPromise = null;

      function ensureThreeJsLoaded() {
        if (window.THREE) return Promise.resolve(window.THREE);
        if (threeLoadPromise) return threeLoadPromise;

        const cdns = [
          'https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js',
          'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
        ];

        threeLoadPromise = new Promise((resolve, reject) => {
          let idx = 0;
          function tryNext() {
            if (window.THREE) return resolve(window.THREE);
            if (idx >= cdns.length) {
              threeLoadPromise = null;
              return reject(new Error('Three.js CDN load failed'));
            }
            const script = document.createElement('script');
            script.src = cdns[idx++];
            script.async = true;
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

      function initArchiveGalaxy(player) {
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

        // V18 Zero-Lag rAF Star-Hopping Roulette State
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
        let autoOrbit = true;

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
          activeNodes = galaxyNodes.length ? galaxyNodes : buildFallbackGalaxyNodes();
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
          if (winnerNode && winnerNode.id && !coverCache['anime_' + winnerNode.id]) {
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
          if (inspLink) inspLink.href = node.url || `${activeShikiOrigin}/animes/${node.id}`;

          if (inspImg) {
            const src = coverCache['anime_' + node.id] || node.img || '';
            inspImg.src = src;
            inspImg.alt = node.title;
            if (!coverCache['anime_' + node.id]) {
              loadAnimeCoversBatch([node.id]).then(() => {
                const hd = coverCache['anime_' + node.id];
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

          // 5. V18 Pre-allocated GPU Star-Hopping Warp Trail (zero allocation during hops)
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
          const w = window.innerWidth;
          const h = window.innerHeight;
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
            const imgSrc = coverCache['anime_' + node.id] || node.img || '';
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

        function projectReticleAndLabels() {
          if (!camera || !THREE_LIB) return;
          const w = window.innerWidth;
          const h = window.innerHeight;
          if (!reusableProjVec) reusableProjVec = new THREE_LIB.Vector3();
          const proj = reusableProjVec;

          // Cluster labels
          for (let i = 0; i < clusterAnchors.length; i++) {
            const el = clusterLabelEls[i];
            if (!el) continue;
            const c = clusterAnchors[i];
            proj.set(c.x, c.y + 12, c.z).project(camera);
            if (proj.z >= -1 && proj.z <= 1) {
              const lx = (proj.x * 0.5 + 0.5) * w;
              const ly = (-proj.y * 0.5 + 0.5) * h;
              el.style.transform = `translate3d(${lx.toFixed(1)}px, ${ly.toFixed(1)}px, 0) translate(-50%, -50%)`;
              el.classList.add('is-visible');
            } else {
              el.classList.remove('is-visible');
            }
          }

          // Reticle on hovered or selected star
          const focusIdx = hopState.active ? hopState.focusIdx : (hoveredIdx >= 0 ? hoveredIdx : selectedIdx);
          if (reticle) {
            if (focusIdx >= 0 && currentPos && focusIdx < activeNodes.length) {
              proj.set(currentPos[focusIdx * 3], currentPos[focusIdx * 3 + 1], currentPos[focusIdx * 3 + 2]).project(camera);
              if (proj.z >= -1 && proj.z <= 1) {
                const rx = (proj.x * 0.5 + 0.5) * w;
                const ry = (-proj.y * 0.5 + 0.5) * h;
                reticle.style.transform = `translate3d(${rx.toFixed(1)}px, ${ry.toFixed(1)}px, 0)`;
                reticle.classList.add('is-visible');
              } else {
                reticle.classList.remove('is-visible');
              }
            } else {
              reticle.classList.remove('is-visible');
            }
          }
        }

        function renderLoop(now) {
          if (!isOpen || !renderer || !scene || !camera) {
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

          // 1b. V18 Star-Hopping Roulette frame step (100% rAF synced)
          updateStarHopFrame(now);

          // 2. Smooth inertial camera orbit + zoom + fly-to
          if (autoOrbit && !hopState.active) {
            camState.targetTheta += 0.0014 + liveBeatEnergy * 0.0018;
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
            dustPoints.rotation.y += 0.00028 + liveBeatEnergy * 0.0005;
          }
          if (astrolabeGroup) {
            astrolabeGroup.rotation.y -= 0.00045;
            const ringScale = 1 + liveBeatEnergy * 0.025;
            astrolabeGroup.scale.set(ringScale, 1, ringScale);
          }
          if (linkLines) {
            linkLines.visible = showLinks && !isMorphing;
          }
          if (starMat) {
            starMat.uniforms.uTime.value = now * 0.001;
            starMat.uniforms.uBeat.value = liveBeatEnergy;
            starMat.uniforms.uFocusIdx.value = hopState.active ? hopState.focusIdx : (hoveredIdx >= 0 ? hoveredIdx : selectedIdx);
          }

          renderer.render(scene, camera);
          projectReticleAndLabels();
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

        window.addEventListener('resize', () => {
          if (!renderer || !camera) return;
          camera.aspect = window.innerWidth / window.innerHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(window.innerWidth, window.innerHeight);
          if (starMat) starMat.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 1.5);
        });

        async function openGalaxy() {
          if (isOpen) return;
          isOpen = true;
          overlay.classList.add('is-open');
          overlay.setAttribute('aria-hidden', 'false');
          document.body.classList.add('galaxy-active');
          document.body.style.overflow = 'hidden';
          playerControls?.syncVisualizer?.();

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
              console.warn('3D Galaxy init failed:', err);
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
          if (galaxyNodes.length < 30) {
            loadHostAnimeRates().then(() => {
              if (galaxyNodes.length > activeNodes.length) {
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
          document.body.style.overflow = '';
          playerControls?.syncVisualizer?.();
          updateHoverTooltip(-1, 0, 0);
          if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
          }
        }

        // Hook live refresh when Shikimori finishes loading in background
        galaxyRefreshHook = () => {
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
          holoGalaxyList = activeNodes;
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


      /* =========================================
         V16 STAGE 4: CO-OP EVENING PICKER + SWIPE ARENA + TICKET PNG
         ========================================= */
      function initCoopPicker() {
        const stationTabs = Array.from(document.querySelectorAll('[data-station-tab]'));
        const paneBase = document.getElementById('station-pane-base');
        const paneCoop = document.getElementById('station-pane-coop');

        const form = document.getElementById('coop-form');
        const input1 = document.getElementById('coop-nick-1');
        const input2 = document.getElementById('coop-nick-2');
        const swapBtn = document.getElementById('coop-swap-btn');
        const submitBtn = document.getElementById('coop-submit-btn');
        const statusLine = document.getElementById('coop-status-line');
        const spinner = document.getElementById('coop-spinner');
        const statusText = document.getElementById('coop-status-text');
        const resultBox = document.getElementById('coop-result');

        const av1El = document.getElementById('coop-av-1');
        const av2El = document.getElementById('coop-av-2');
        const name1El = document.getElementById('coop-name-1');
        const name2El = document.getElementById('coop-name-2');
        const pairStatsEl = document.getElementById('coop-pair-stats');
        const gridEl = document.getElementById('coop-grid');
        const showMoreBtn = document.getElementById('coop-show-more-btn');
        const launchSwipeBtn = document.getElementById('coop-launch-swipe-btn');
        const randomPickBtn = document.getElementById('coop-random-pick-btn');

        const catTabs = Array.from(document.querySelectorAll('[data-ccat]'));
        const fmtTabs = Array.from(document.querySelectorAll('[data-cfmt]'));

        // Modal elements
        const modal = document.getElementById('coop-modal');
        const modalClose = document.getElementById('coop-modal-close');
        const modalKicker = document.getElementById('coop-modal-kicker');
        const modeBar = document.getElementById('coop-swipe-modebar');
        const modeBtns = Array.from(document.querySelectorAll('[data-csmode]'));
        const progressPill = document.getElementById('coop-swipe-progress-pill');

        const swipeStage = document.getElementById('coop-swipe-stage');
        const turnLabel = document.getElementById('coop-turn-label');
        const likesCounter = document.getElementById('coop-likes-counter');
        const swipeBar = document.getElementById('coop-swipe-bar');
        const swipeCard = document.getElementById('coop-swipe-card');
        const swipeImg = document.getElementById('coop-swipe-img');
        const stampLike = document.getElementById('coop-stamp-like');
        const stampPass = document.getElementById('coop-stamp-pass');
        const swipeReason = document.getElementById('coop-swipe-reason');
        const swipeTitle = document.getElementById('coop-swipe-title');
        const swipeSub = document.getElementById('coop-swipe-sub');
        const btnPass = document.getElementById('coop-btn-pass');
        const btnLike = document.getElementById('coop-btn-like');
        const btnInstant = document.getElementById('coop-btn-instant');

        const handoffView = document.getElementById('coop-handoff-view');
        const handoffTitle = document.getElementById('coop-handoff-title');
        const handoffSub = document.getElementById('coop-handoff-sub');
        const handoffStartBtn = document.getElementById('coop-handoff-start-btn');

        const ticketView = document.getElementById('coop-ticket-view');
        const ticketImg = document.getElementById('coop-ticket-img');
        const ticketKicker = document.getElementById('coop-ticket-kicker');
        const ticketTitle = document.getElementById('coop-ticket-title');
        const ticketPair = document.getElementById('coop-ticket-pair');
        const ticketPills = document.getElementById('coop-ticket-pills');
        const ticketReason = document.getElementById('coop-ticket-reason');
        const altWrap = document.getElementById('coop-matches-alt-wrap');
        const altLbl = document.getElementById('coop-matches-alt-lbl');
        const altStrip = document.getElementById('coop-matches-strip');
        const dlTicketBtn = document.getElementById('coop-dl-ticket-btn');
        const copyInviteBtn = document.getElementById('coop-copy-invite-btn');
        const rerollTicketBtn = document.getElementById('coop-reroll-ticket-btn');
        const ticketLink = document.getElementById('coop-ticket-link');

        if (!form || !input1 || !input2) return;

        let coopData = null;
        let activeCat = 'both_planned';
        let activeFmt = 'all';
        let visibleLimit = 12;

        // Swipe state
        let swipeMode = 'turns'; // 'turns' | 'together'
        let swipeDeck = [];
        let swipeIdx = 0;
        let currentTurn = 1; // 1 or 2
        let p1Likes = new Set();
        let p2Likes = new Set();
        let isSwipingAnim = false;
        let activeTicketItem = null;
        let activeTicketAlts = [];

        function switchStationTab(tab) {
          stationTabs.forEach((b) => {
            const on = b.dataset.stationTab === tab;
            b.classList.toggle('active', on);
            b.setAttribute('aria-selected', String(on));
          });
          paneBase?.classList.toggle('is-hidden', tab !== 'base');
          paneCoop?.classList.toggle('is-hidden', tab !== 'coop');
        }

        stationTabs.forEach((btn) => {
          btn.addEventListener('click', () => switchStationTab(btn.dataset.stationTab || 'base'));
        });

        function setCoopStatus(msg, mode) {
          if (!statusLine || !statusText) return;
          if (!msg) {
            statusLine.classList.remove('is-visible', 'is-error');
            return;
          }
          statusLine.classList.add('is-visible');
          statusLine.classList.toggle('is-error', mode === 'error');
          if (spinner) spinner.style.display = mode === 'loading' ? 'inline-block' : 'none';
          statusText.textContent = msg;
        }

        function cleanNick(raw) {
          let s = String(raw || '').trim();
          if (!s) return '';
          s = s.replace(/^https?:\/\/(www\.)?shikimori\.(one|io|me|org)\//i, '');
          s = s.split(/[/?#]/)[0];
          s = s.replace(/^@+/, '');
          try { s = decodeURIComponent(s.replace(/\+/g, ' ')); }
          catch (e) { s = s.replace(/\+/g, ' '); }
          return s.trim();
        }

        async function fetchPlayerProfileAndRates(rawNick) {
          const nick = cleanNick(rawNick);
          if (!nick) throw new Error('EMPTY_NICK');

          // Fast path if player is host (undereror nyashka) and full rates are already cached
          const isHost = nick.toLowerCase() === SHIKI_NICKNAME.toLowerCase();
          if (isHost) {
            const u = await resolveHostUser();
            if (hostFullRates.length < 20) {
              await loadHostAnimeRates(u);
            }
            if (hostFullRates.length > 0) {
              const av = (u && (u.image?.x160 || u.image?.x148 || u.avatar))
                ? normalizeShikiUrl(u.image?.x160 || u.image?.x148 || u.avatar, activeShikiOrigin)
                : 'https://shikimori.one/system/users/x160/1308586.png';
              return {
                nick: (u && u.nickname) || SHIKI_NICKNAME,
                avatar: av,
                rates: hostFullRates
              };
            }
          }

          // Generic Shikimori user fetch with retry
          const origins = [activeShikiOrigin, ...SHIKI_ORIGINS.filter((o) => o !== activeShikiOrigin)];
          let user = null;
          let originUsed = activeShikiOrigin;
          let lastStatus = 0;
          for (const origin of origins) {
            const res = await fetchShikiWithRetry(
              `${origin}/api/users/${encodeURIComponent(nick)}?is_nickname=1`,
              { retries: 2, baseDelay: 650 }
            );
            lastStatus = res.status;
            if (res.ok && res.data && res.data.id) {
              user = res.data;
              originUsed = origin;
              activeShikiOrigin = origin;
              break;
            }
            if (res.status === 404) {
              const err = new Error('NOT_FOUND');
              err.nick = nick;
              throw err;
            }
          }
          if (!user || !user.id) {
            const err = new Error('API_FAIL_' + lastStatus);
            err.nick = nick;
            throw err;
          }

          await sleep(160);
          const rRes = await fetchShikiWithRetry(
            `${originUsed}/api/users/${user.id}/anime_rates?limit=1000`,
            { retries: 3, baseDelay: 750 }
          );
          if (!rRes.ok || !Array.isArray(rRes.data)) {
            const err = new Error('RATES_FAIL');
            err.nick = user.nickname || nick;
            throw err;
          }

          const avRaw = user.image?.x160 || user.image?.x148 || user.avatar || '';
          const parsed = [];
          const seen = new Set();
          rRes.data.forEach((r) => {
            const a = r && r.anime;
            if (!a || !a.id) return;
            const id = Number(a.id);
            if (seen.has(id)) return;
            seen.add(id);
            const rawImg = a.image?.original || a.image?.preview || '';
            parsed.push({
              id,
              st: r.status || 'completed',
              s: Number(r.score) || 0,
              g: Number(a.score) || 0,
              t: a.russian || a.name || `#${id}`,
              k: String(a.kind || 'tv').toLowerCase(),
              y: a.aired_on ? Number(String(a.aired_on).slice(0, 4)) || null : null,
              ep: Number(a.episodes) || Number(a.episodes_aired) || 0,
              img: rawImg ? normalizeShikiUrl(rawImg, originUsed) : '',
              url: a.url ? normalizeShikiUrl(a.url, originUsed) : `${originUsed}/animes/${id}`
            });
          });

          return {
            nick: user.nickname || nick,
            avatar: avRaw ? normalizeShikiUrl(avRaw, originUsed) : 'https://shikimori.one/assets/globals/missing_avatar/x160.png',
            rates: parsed
          };
        }

        function computeCoopBuckets(p1, p2) {
          const allowedKinds = new Set(['tv', 'movie', 'ova', 'ona']);
          const map1 = new Map(p1.rates.map((r) => [r.id, r]));
          const map2 = new Map(p2.rates.map((r) => [r.id, r]));
          const allIds = new Set([...map1.keys(), ...map2.keys()]);

          const isUnseen = (r) => !r || r.st === 'planned' || r.st === 'on_hold';
          const isWanting = (r) => Boolean(r && (r.st === 'planned' || r.st === 'on_hold'));
          const isSeenOrDropped = (r) => Boolean(r && (r.st === 'completed' || r.st === 'watching' || r.st === 'rewatching' || r.st === 'dropped'));

          const bothPlanned = [];
          const freshMix = [];
          const rec1To2 = [];
          const rec2To1 = [];

          allIds.forEach((id) => {
            const r1 = map1.get(id);
            const r2 = map2.get(id);
            const meta = r1 || r2;
            if (!meta || !allowedKinds.has(meta.k)) return;

            const baseObj = {
              id,
              title: meta.t,
              kind: meta.k,
              kindLabel: SHIKI_KIND_LABELS[meta.k] || 'Аниме',
              year: meta.y,
              episodes: meta.ep || 0,
              shikiScore: Number(meta.g || 0),
              img: meta.img || '',
              url: meta.url || `${activeShikiOrigin}/animes/${id}`
            };

            // 1. Both want to watch (neither finished/watching/dropped)
            if (isWanting(r1) && isWanting(r2)) {
              const item = {
                ...baseObj,
                isBothPlanned: true,
                priority: (baseObj.shikiScore || 7) * 10 + 40,
                reason: '🔥 Оба в планах',
                reasonGold: true
              };
              bothPlanned.push(item);
              freshMix.push(item);
              return;
            }

            // 2. Fresh for both: one wants to watch, the other hasn't seen/dropped it
            if ((isWanting(r1) && isUnseen(r2)) || (isWanting(r2) && isUnseen(r1))) {
              const ownerName = isWanting(r1) ? p1.nick : p2.nick;
              freshMix.push({
                ...baseObj,
                isBothPlanned: false,
                priority: (baseObj.shikiScore || 6.8) * 10 + (baseObj.shikiScore >= 8 ? 12 : 0),
                reason: `В планах у ${ownerName}`,
                reasonGold: baseObj.shikiScore >= 8.2
              });
            }

            // 3. Favorites of P1 that P2 hasn't seen
            if (r1 && (r1.st === 'completed' || r1.st === 'rewatching') && r1.s >= 8 && !isSeenOrDropped(r2)) {
              const inP2Plan = isWanting(r2);
              rec1To2.push({
                ...baseObj,
                isBothPlanned: inP2Plan,
                priority: r1.s * 12 + (inP2Plan ? 30 : 0) + (baseObj.shikiScore || 7),
                reason: inP2Plan
                  ? `★ ${r1.s}/10 у ${p1.nick} · в планах у ${p2.nick}`
                  : `★ ${r1.s}/10 от ${p1.nick}`,
                reasonGold: r1.s >= 9 || inP2Plan
              });
            }

            // 4. Favorites of P2 that P1 hasn't seen
            if (r2 && (r2.st === 'completed' || r2.st === 'rewatching') && r2.s >= 8 && !isSeenOrDropped(r1)) {
              const inP1Plan = isWanting(r1);
              rec2To1.push({
                ...baseObj,
                isBothPlanned: inP1Plan,
                priority: r2.s * 12 + (inP1Plan ? 30 : 0) + (baseObj.shikiScore || 7),
                reason: inP1Plan
                  ? `★ ${r2.s}/10 у ${p2.nick} · в планах у ${p1.nick}`
                  : `★ ${r2.s}/10 от ${p2.nick}`,
                reasonGold: r2.s >= 9 || inP1Plan
              });
            }
          });

          const byPriority = (a, b) => b.priority - a.priority || b.shikiScore - a.shikiScore || (b.year || 0) - (a.year || 0);
          bothPlanned.sort(byPriority);
          freshMix.sort(byPriority);
          rec1To2.sort(byPriority);
          rec2To1.sort(byPriority);

          return {
            p1,
            p2,
            buckets: {
              both_planned: bothPlanned,
              fresh_mix: freshMix,
              rec_1_to_2: rec1To2,
              rec_2_to_1: rec2To1
            }
          };
        }

        function filterByFormat(list) {
          if (activeFmt === 'movie') return list.filter((x) => x.kind === 'movie');
          if (activeFmt === 'short') return list.filter((x) => x.kind !== 'movie' && x.episodes > 0 && x.episodes <= 13);
          if (activeFmt === 'series') return list.filter((x) => x.kind !== 'movie' && (x.episodes >= 14 || x.episodes === 0));
          return list;
        }

        function getActiveFilteredPool() {
          if (!coopData) return [];
          return filterByFormat(coopData.buckets[activeCat] || []);
        }

        function renderCoopGrid() {
          if (!coopData || !gridEl) return;

          const b = coopData.buckets;
          document.getElementById('cc-cnt-both').textContent = String(b.both_planned.length);
          document.getElementById('cc-cnt-fresh').textContent = String(b.fresh_mix.length);
          document.getElementById('cc-cnt-r1').textContent = String(b.rec_1_to_2.length);
          document.getElementById('cc-cnt-r2').textContent = String(b.rec_2_to_1.length);

          catTabs.forEach((btn) => btn.classList.toggle('active', btn.dataset.ccat === activeCat));
          fmtTabs.forEach((btn) => btn.classList.toggle('active', btn.dataset.cfmt === activeFmt));

          const pool = getActiveFilteredPool();
          if (launchSwipeBtn) launchSwipeBtn.disabled = pool.length === 0;
          if (randomPickBtn) randomPickBtn.disabled = pool.length === 0;

          if (!pool.length) {
            gridEl.innerHTML = `<div class="base-empty-note" style="grid-column:1 / -1;padding:26px 12px;">В этой категории и формате пока пусто — переключи фильтр сверху (например, «✨ Новое для обоих» или «Все»).</div>`;
            if (showMoreBtn) showMoreBtn.style.display = 'none';
            return;
          }

          const slice = pool.slice(0, visibleLimit);
          gridEl.innerHTML = slice.map((item) => {
            const coverKey = 'anime_' + item.id;
            const imgSrc = coverCache[coverKey] || item.img || '';
            const epStr = item.kind === 'movie'
              ? 'Фильм'
              : (item.episodes ? `${item.episodes} эп.` : item.kindLabel);
            const metaLine = [
              item.shikiScore ? `★ ${item.shikiScore.toFixed(2)}` : null,
              epStr,
              item.year ? String(item.year) : null
            ].filter(Boolean).join(' · ');

            return `
              <article class="coop-card ${item.isBothPlanned ? 'is-both-planned' : ''}" data-coop-id="${item.id}">
                <div class="coop-card-top">
                  <div class="coop-thumb">
                    <img
                      data-cover-key="${coverKey}"
                      data-fallback-src="${escapeHtml(item.img || '')}"
                      src="${escapeHtml(imgSrc)}"
                      alt="${escapeHtml(item.title)}"
                      loading="lazy"
                    />
                  </div>
                  <div class="coop-card-info">
                    <div class="coop-card-title">${escapeHtml(item.title)}</div>
                    <div class="coop-card-meta">${escapeHtml(metaLine)}</div>
                    <span class="coop-reason-pill ${item.reasonGold ? 'is-gold' : ''}">${escapeHtml(item.reason)}</span>
                  </div>
                </div>
                <div class="coop-card-foot">
                  <button type="button" class="coop-pick-btn" data-pick-id="${item.id}">🎟 Смотрим это</button>
                  <a class="coop-ext-btn" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" title="Открыть на Shikimori">↗</a>
                </div>
              </article>
            `;
          }).join('');

          attachImageHandlers(gridEl);

          gridEl.querySelectorAll('.coop-pick-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
              const id = Number(btn.dataset.pickId);
              const found = pool.find((x) => x.id === id);
              if (found) openEveningTicket(found, pool.slice(0, 6), 'ВЫБОР НА ВЕЧЕР');
            });
          });

          if (showMoreBtn) {
            const hasMore = pool.length > visibleLimit;
            showMoreBtn.style.display = hasMore ? 'inline-flex' : 'none';
            showMoreBtn.textContent = `Показать ещё (${pool.length - visibleLimit})`;
          }

          loadAnimeCoversBatch(slice.map((x) => x.id));
        }

        async function runCoopMatch(raw1, raw2) {
          const n1 = cleanNick(raw1);
          const n2 = cleanNick(raw2);
          if (!n1 || !n2) {
            setCoopStatus('Укажи оба ника на Shikimori (Игрок 1 и Игрок 2).', 'error');
            (!n1 ? input1 : input2).focus();
            return;
          }
          if (n1.toLowerCase() === n2.toLowerCase()) {
            setCoopStatus('Нужны два разных ника — введи во второе поле ник друга.', 'error');
            input2.focus();
            return;
          }

          submitBtn.disabled = true;
          resultBox?.classList.remove('is-visible');
          setCoopStatus(`Загружаю списки «${n1}» и «${n2}» с Shikimori...`, 'loading');

          try {
            const p1 = await fetchPlayerProfileAndRates(n1);
            setCoopStatus(`Готов список «${p1.nick}» (${p1.rates.length}) · загружаю «${n2}»...`, 'loading');
            const p2 = await fetchPlayerProfileAndRates(n2);

            if (!p1.rates.length) {
              setCoopStatus(`У «${p1.nick}» список аниме пуст или закрыт приватностью.`, 'error');
              return;
            }
            if (!p2.rates.length) {
              setCoopStatus(`У «${p2.nick}» список аниме пуст или закрыт приватностью.`, 'error');
              return;
            }

            coopData = computeCoopBuckets(p1, p2);
            activeFmt = 'all';
            visibleLimit = 12;

            // Smart initial tab selection so user always sees rich candidates right away
            const b = coopData.buckets;
            if (b.both_planned.length >= 2) activeCat = 'both_planned';
            else if (b.fresh_mix.length > 0) activeCat = 'fresh_mix';
            else if (b.rec_1_to_2.length > 0) activeCat = 'rec_1_to_2';
            else activeCat = 'rec_2_to_1';

            if (av1El) { av1El.src = p1.avatar; av1El.alt = p1.nick; }
            if (av2El) { av2El.src = p2.avatar; av2El.alt = p2.nick; }
            if (name1El) name1El.textContent = p1.nick;
            if (name2El) name2El.textContent = p2.nick;
            if (pairStatsEl) {
              pairStatsEl.textContent = `Общих планов: ${b.both_planned.length} · Новых для обоих: ${b.fresh_mix.length} · Рекомендаций: ${b.rec_1_to_2.length + b.rec_2_to_1.length}`;
            }

            setCoopStatus('', '');
            resultBox?.classList.add('is-visible');
            renderCoopGrid();
          } catch (err) {
            if (err && err.message === 'NOT_FOUND') {
              setCoopStatus(`Профиль «${err.nick}» не найден на Shikimori — проверь написание ника.`, 'error');
            } else {
              setCoopStatus('Не удалось получить списки с Shikimori API — попробуй через пару секунд.', 'error');
            }
          } finally {
            submitBtn.disabled = false;
          }
        }

        /* -----------------------------------------
           CO-OP SWIPE ARENA (TINDER FOR 2) & EVENING TICKET
           ----------------------------------------- */
        function closeCoopModal() {
          modal?.classList.remove('is-open');
          modal?.setAttribute('aria-hidden', 'true');
        }

        function showCoopModalStage(which) {
          if (swipeStage) swipeStage.style.display = which === 'swipe' ? 'flex' : 'none';
          if (modeBar) modeBar.style.display = which === 'swipe' ? 'flex' : 'none';
          handoffView?.classList.toggle('is-visible', which === 'handoff');
          ticketView?.classList.toggle('is-visible', which === 'ticket');
        }

        function renderSwipeCard() {
          if (!swipeDeck.length || swipeIdx >= swipeDeck.length) {
            finishCurrentTurn();
            return;
          }
          const item = swipeDeck[swipeIdx];
          const p1Name = coopData?.p1?.nick || 'Игрок 1';
          const p2Name = coopData?.p2?.nick || 'Игрок 2';

          if (progressPill) progressPill.textContent = `${swipeIdx + 1} / ${swipeDeck.length}`;
          if (swipeBar) swipeBar.style.width = `${Math.round((swipeIdx / swipeDeck.length) * 100)}%`;

          if (swipeMode === 'together') {
            if (turnLabel) turnLabel.textContent = `СОВМЕСТНЫЙ ПРОСМОТР · ${p1Name} × ${p2Name}`;
            if (likesCounter) likesCounter.textContent = `ШОРТЛИСТ: ${p1Likes.size}`;
            if (btnInstant) btnInstant.style.display = 'inline-flex';
          } else {
            const activeName = currentTurn === 1 ? p1Name : p2Name;
            const curSet = currentTurn === 1 ? p1Likes : p2Likes;
            if (turnLabel) turnLabel.textContent = `РАУНД ${currentTurn}/2 · ХОД ${activeName}`;
            if (likesCounter) likesCounter.textContent = `ЛАЙКОВ: ${curSet.size}`;
            if (btnInstant) btnInstant.style.display = 'none';
          }

          if (swipeCard) {
            swipeCard.classList.remove('fly-left', 'fly-right', 'is-dragging');
            swipeCard.style.transform = '';
          }
          if (stampLike) stampLike.style.opacity = '0';
          if (stampPass) stampPass.style.opacity = '0';

          if (swipeTitle) swipeTitle.textContent = item.title;
          const epStr = item.kind === 'movie' ? 'Фильм' : (item.episodes ? `${item.episodes} эп.` : item.kindLabel);
          if (swipeSub) {
            swipeSub.textContent = [item.shikiScore ? `★ ${item.shikiScore.toFixed(2)}` : null, epStr, item.year].filter(Boolean).join(' · ');
          }
          if (swipeReason) swipeReason.textContent = item.reason || 'Кандидат на вечер';
          if (swipeImg) {
            const src = coverCache['anime_' + item.id] || item.img || '';
            swipeImg.src = src;
            swipeImg.alt = item.title;
            if (!coverCache['anime_' + item.id]) {
              loadAnimeCoversBatch([item.id]).then(() => {
                const hd = coverCache['anime_' + item.id];
                if (hd && swipeImg.alt === item.title) swipeImg.src = hd;
              });
            }
          }
        }

        function triggerSwipeChoice(liked) {
          if (isSwipingAnim || !swipeDeck[swipeIdx]) return;
          isSwipingAnim = true;
          const item = swipeDeck[swipeIdx];

          if (liked) {
            if (swipeMode === 'together' || currentTurn === 1) p1Likes.add(item.id);
            else p2Likes.add(item.id);
          }

          if (stampLike) stampLike.style.opacity = liked ? '1' : '0';
          if (stampPass) stampPass.style.opacity = liked ? '0' : '1';
          swipeCard?.classList.add(liked ? 'fly-right' : 'fly-left');

          setTimeout(() => {
            swipeIdx++;
            isSwipingAnim = false;
            renderSwipeCard();
          }, 260);
        }

        function finishCurrentTurn() {
          const p1Name = coopData?.p1?.nick || 'Игрок 1';
          const p2Name = coopData?.p2?.nick || 'Игрок 2';

          if (swipeMode === 'turns' && currentTurn === 1) {
            if (handoffTitle) handoffTitle.textContent = `Теперь ход ${p2Name}!`;
            if (handoffSub) {
              handoffSub.textContent = `${p1Name} отметил(а) ${p1Likes.size} из ${swipeDeck.length} тайтлов вслепую. Передай экран ${p2Name} — пройдём ту же колоду и найдём совпадения!`;
            }
            showCoopModalStage('handoff');
            return;
          }

          // Compute final match list
          let matched = [];
          let headerText = "🎟 IT'S A MATCH · ВЫБОР НА ВЕЧЕР";

          if (swipeMode === 'together') {
            matched = swipeDeck.filter((x) => p1Likes.has(x.id));
            headerText = matched.length
              ? `🎟 ВЫБРАНО ВМЕСТЕ (${matched.length} В ШОРТЛИСТЕ)`
              : '🎲 ШОРТЛИСТ ПУСТ — ЗАПАСНОЙ ВАРИАНТ';
          } else {
            const mutual = swipeDeck.filter((x) => p1Likes.has(x.id) && p2Likes.has(x.id));
            if (mutual.length) {
              matched = mutual;
              headerText = `🎟 IT'S A MATCH · ${mutual.length} ОБЩИХ ЛАЙКА!`;
            } else {
              const anyLiked = swipeDeck.filter((x) => p1Likes.has(x.id) || p2Likes.has(x.id));
              matched = anyLiked.length ? anyLiked : swipeDeck.slice(0, 4);
              headerText = anyLiked.length
                ? '✦ КОМПРОМИСС · ЛУЧШЕЕ ИЗ ВАШИХ ЛАЙКОВ'
                : '🎲 НИКТО НЕ ЛАЙКНУЛ — ВЫБОР СУДЬБЫ';
            }
          }

          const winner = matched[0] || swipeDeck[0];
          openEveningTicket(winner, matched, headerText);
        }

        function startCoopSwipe(modeOverride) {
          const pool = getActiveFilteredPool();
          if (!pool.length) return;
          if (modeOverride) swipeMode = modeOverride;
          modeBtns.forEach((b) => b.classList.toggle('active', b.dataset.csmode === swipeMode));

          // Take up to 10 best candidates (lightly shuffled among top 18 for freshness)
          const topSlice = pool.slice(0, Math.min(18, pool.length));
          for (let i = topSlice.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [topSlice[i], topSlice[j]] = [topSlice[j], topSlice[i]];
          }
          swipeDeck = topSlice.slice(0, Math.min(10, topSlice.length));
          swipeIdx = 0;
          currentTurn = 1;
          p1Likes = new Set();
          p2Likes = new Set();
          isSwipingAnim = false;

          if (modalKicker) modalKicker.textContent = '⚡ КООП-СВАЙП // ВЕЧЕРНИЙ ПОДБОР';
          showCoopModalStage('swipe');
          renderSwipeCard();
          modal?.classList.add('is-open');
          modal?.setAttribute('aria-hidden', 'false');
          loadAnimeCoversBatch(swipeDeck.map((x) => x.id));
        }

        function openEveningTicket(item, alts, kickerText) {
          if (!item) return;
          activeTicketItem = item;
          activeTicketAlts = (alts && alts.length) ? alts : [item];

          const p1Name = coopData?.p1?.nick || cleanNick(input1.value) || 'Игрок 1';
          const p2Name = coopData?.p2?.nick || cleanNick(input2.value) || 'Игрок 2';

          if (modalKicker) modalKicker.textContent = '🎟 БИЛЕТ НА ВЕЧЕР // SCREENING PASS';
          if (ticketKicker) ticketKicker.textContent = kickerText || "🎟 IT'S A MATCH · СЕАНС НА ВЕЧЕР";
          if (ticketTitle) ticketTitle.textContent = item.title;
          if (ticketPair) ticketPair.innerHTML = `<strong>${escapeHtml(p1Name)}</strong> × <strong>${escapeHtml(p2Name)}</strong>`;
          if (ticketReason) ticketReason.textContent = item.reason || 'Идеально на вечер';
          if (ticketLink) ticketLink.href = item.url || `${activeShikiOrigin}/animes/${item.id}`;

          const epStr = item.kind === 'movie' ? 'Полнометражный фильм' : (item.episodes ? `${item.episodes} эп.` : item.kindLabel);
          const pills = [
            item.shikiScore ? `★ ${item.shikiScore.toFixed(2)}` : null,
            epStr,
            item.year ? String(item.year) : null
          ].filter(Boolean);
          if (ticketPills) {
            ticketPills.innerHTML = pills.map((p) => `<span class="modal-pill" style="font-size:10px;padding:3px 9px;">${escapeHtml(p)}</span>`).join('');
          }

          if (ticketImg) {
            const src = coverCache['anime_' + item.id] || item.img || '';
            ticketImg.src = src;
            ticketImg.alt = item.title;
            if (!coverCache['anime_' + item.id]) {
              loadAnimeCoversBatch([item.id]).then(() => {
                const hd = coverCache['anime_' + item.id];
                if (hd && activeTicketItem && activeTicketItem.id === item.id) ticketImg.src = hd;
              });
            }
          }

          if (altWrap && altStrip) {
            if (activeTicketAlts.length > 1) {
              altWrap.style.display = 'flex';
              if (altLbl) altLbl.textContent = `Варианты вечера (${activeTicketAlts.length}):`;
              altStrip.innerHTML = activeTicketAlts.slice(0, 6).map((a) => `
                <button type="button" class="coop-match-alt-btn ${a.id === item.id ? 'active' : ''}" data-alt-id="${a.id}" title="${escapeHtml(a.title)}">
                  ${escapeHtml(a.title)}
                </button>
              `).join('');
              altStrip.querySelectorAll('.coop-match-alt-btn').forEach((btn) => {
                btn.addEventListener('click', () => {
                  const chosen = activeTicketAlts.find((x) => x.id === Number(btn.dataset.altId));
                  if (chosen) openEveningTicket(chosen, activeTicketAlts, kickerText);
                });
              });
            } else {
              altWrap.style.display = 'none';
            }
          }

          showCoopModalStage('ticket');
          modal?.classList.add('is-open');
          modal?.setAttribute('aria-hidden', 'false');
        }

        function downloadEveningTicketPng() {
          if (!activeTicketItem) return;
          const item = activeTicketItem;
          const p1Name = coopData?.p1?.nick || cleanNick(input1.value) || 'Игрок 1';
          const p2Name = coopData?.p2?.nick || cleanNick(input2.value) || 'Игрок 2';
          const W = 1200;
          const H = 675;
          const c = document.createElement('canvas');
          c.width = W;
          c.height = H;
          const ctx = c.getContext('2d');

          function rRect(x, y, w, h, r) {
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.arcTo(x + w, y, x + w, y + h, r);
            ctx.arcTo(x + w, y + h, x, y + h, r);
            ctx.arcTo(x, y + h, x, y, r);
            ctx.arcTo(x, y, x + w, y, r);
            ctx.closePath();
          }
          function clipText(txt, maxW) {
            let s = String(txt || '');
            if (ctx.measureText(s).width <= maxW) return s;
            while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
            return s + '…';
          }

          // Background
          const bg = ctx.createLinearGradient(0, 0, W, H);
          bg.addColorStop(0, '#060910');
          bg.addColorStop(0.55, '#0b1220');
          bg.addColorStop(1, '#06080e');
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, W, H);

          const halo = ctx.createRadialGradient(260, 220, 20, 260, 220, 480);
          halo.addColorStop(0, 'rgba(110, 231, 183, 0.16)');
          halo.addColorStop(1, 'transparent');
          ctx.fillStyle = halo;
          ctx.fillRect(0, 0, W, H);

          ctx.strokeStyle = 'rgba(173, 191, 222, 0.045)';
          for (let x = 40; x < W; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
          for (let y = 40; y < H; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

          // Cinema Ticket Outer Shell
          rRect(46, 54, W - 92, H - 108, 26);
          ctx.fillStyle = 'rgba(9, 13, 22, 0.88)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(110, 231, 183, 0.48)';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Perforated tear line on right stub
          const stubX = W - 320;
          ctx.save();
          ctx.setLineDash([8, 10]);
          ctx.strokeStyle = 'rgba(173, 191, 222, 0.34)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(stubX, 72);
          ctx.lineTo(stubX, H - 72);
          ctx.stroke();
          ctx.restore();

          // Semicircle ticket notches top & bottom
          ctx.fillStyle = '#070a11';
          [54, H - 54].forEach((ny) => {
            ctx.beginPath();
            ctx.arc(stubX, ny, 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(110, 231, 183, 0.45)';
            ctx.lineWidth = 2;
            ctx.stroke();
          });

          // Left Main Ticket Body
          ctx.fillStyle = '#6ee7b7';
          ctx.font = '600 15px "JetBrains Mono", monospace';
          ctx.fillText('🎟  ADMIT TWO  ·  CO-OP EVENING SCREENING PASS', 94, 120);

          ctx.fillStyle = 'rgba(205, 212, 224, 0.78)';
          ctx.font = '600 19px "JetBrains Mono", monospace';
          ctx.fillText(clipText(`${p1Name}  ×  ${p2Name}`, stubX - 140), 94, 166);

          ctx.strokeStyle = 'rgba(173, 191, 222, 0.16)';
          ctx.beginPath(); ctx.moveTo(94, 194); ctx.lineTo(stubX - 44, 194); ctx.stroke();

          ctx.fillStyle = 'rgba(173, 191, 222, 0.72)';
          ctx.font = '600 13px "JetBrains Mono", monospace';
          ctx.fillText('СЕГОДНЯ ВЕЧЕРОМ СМОТРИМ:', 94, 238);

          ctx.fillStyle = '#ffffff';
          ctx.font = '600 38px "Unbounded", "Inter", sans-serif';
          ctx.fillText(clipText(item.title, stubX - 138), 94, 298);

          const epStr = item.kind === 'movie' ? 'ФИЛЬМ' : (item.episodes ? `${item.episodes} ЭП.` : item.kindLabel.toUpperCase());
          const metaLine = [
            item.shikiScore ? `SHIKIMORI ★ ${item.shikiScore.toFixed(2)}` : null,
            epStr,
            item.year ? String(item.year) : null
          ].filter(Boolean).join('   ·   ');

          ctx.fillStyle = '#dce8ff';
          ctx.font = '600 17px "JetBrains Mono", monospace';
          ctx.fillText(clipText(metaLine, stubX - 140), 94, 354);

          // Match reason pill
          rRect(94, 394, Math.min(stubX - 144, 520), 54, 14);
          ctx.fillStyle = 'rgba(110, 231, 183, 0.12)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(110, 231, 183, 0.42)';
          ctx.lineWidth = 1.4;
          ctx.stroke();

          ctx.fillStyle = '#a7f3d0';
          ctx.font = '600 16px "JetBrains Mono", monospace';
          ctx.fillText(clipText(`◈  ${item.reason || 'Идеальное совпадение на вечер'}`, stubX - 180), 118, 427);

          ctx.fillStyle = 'rgba(205, 212, 224, 0.56)';
          ctx.font = '500 14px "JetBrains Mono", monospace';
          ctx.fillText('ПОДОБРАНО В КООПЕ  →  https://undexerorrr.github.io/', 94, H - 96);

          // Right Stub
          ctx.textAlign = 'center';
          const sx = stubX + 137;
          ctx.fillStyle = '#adbfde';
          ctx.font = '600 13px "JetBrains Mono", monospace';
          ctx.fillText('UNDEXEROR', sx, 134);
          ctx.fillText('// ARCHIVE', sx, 156);

          ctx.fillStyle = '#6ee7b7';
          ctx.font = '700 44px "Unbounded", "JetBrains Mono", monospace';
          ctx.fillText(item.shikiScore ? item.shikiScore.toFixed(1) : '★', sx, 268);
          ctx.fillStyle = 'rgba(205, 212, 224, 0.62)';
          ctx.font = '600 11px "JetBrains Mono", monospace';
          ctx.fillText('SHIKIMORI SCORE', sx, 296);

          ctx.fillStyle = '#ffffff';
          ctx.font = '600 16px "JetBrains Mono", monospace';
          ctx.fillText(new Date().toLocaleDateString('ru-RU'), sx, 382);
          ctx.fillStyle = 'rgba(205, 212, 224, 0.56)';
          ctx.font = '500 11px "JetBrains Mono", monospace';
          ctx.fillText('TONIGHT · 20:00+', sx, 406);

          // Decorative barcode at bottom of stub
          ctx.fillStyle = 'rgba(210, 224, 248, 0.72)';
          for (let bx = stubX + 46; bx < W - 92; bx += 7) {
            const bw = ((bx * 13 + item.id) % 4) + 1.5;
            ctx.fillRect(bx, H - 180, bw, 62);
          }
          ctx.fillStyle = 'rgba(205, 212, 224, 0.55)';
          ctx.font = '500 11px "JetBrains Mono", monospace';
          ctx.fillText(`MAL-${item.id}`, sx, H - 96);

          const link = document.createElement('a');
          link.download = `coop-ticket-${item.id}.png`;
          link.href = c.toDataURL('image/png');
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }

        // Swipe Card Drag Physics (Mouse + Touch)
        let sDown = false;
        let sStartX = 0;
        let sDx = 0;

        swipeCard?.addEventListener('pointerdown', (e) => {
          if (isSwipingAnim) return;
          sDown = true;
          sStartX = e.clientX;
          sDx = 0;
          swipeCard.classList.add('is-dragging');
          swipeCard.setPointerCapture?.(e.pointerId);
        });

        swipeCard?.addEventListener('pointermove', (e) => {
          if (!sDown) return;
          sDx = e.clientX - sStartX;
          const rot = (sDx / 18).toFixed(2);
          swipeCard.style.transform = `translate3d(${sDx}px, ${Math.abs(sDx) * 0.06}px, 0) rotate(${rot}deg)`;
          const ratio = Math.min(1, Math.abs(sDx) / 95);
          if (stampLike) stampLike.style.opacity = sDx > 16 ? ratio.toFixed(2) : '0';
          if (stampPass) stampPass.style.opacity = sDx < -16 ? ratio.toFixed(2) : '0';
        });

        function endSwipeDrag() {
          if (!sDown) return;
          sDown = false;
          swipeCard?.classList.remove('is-dragging');
          if (sDx > 85) {
            triggerSwipeChoice(true);
          } else if (sDx < -85) {
            triggerSwipeChoice(false);
          } else {
            if (swipeCard) swipeCard.style.transform = '';
            if (stampLike) stampLike.style.opacity = '0';
            if (stampPass) stampPass.style.opacity = '0';
          }
          sDx = 0;
        }

        swipeCard?.addEventListener('pointerup', endSwipeDrag);
        swipeCard?.addEventListener('pointercancel', endSwipeDrag);

        // Event bindings
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          runCoopMatch(input1.value, input2.value);
        });

        swapBtn?.addEventListener('click', () => {
          const tmp = input1.value;
          input1.value = input2.value;
          input2.value = tmp;
        });

        catTabs.forEach((btn) => {
          btn.addEventListener('click', () => {
            activeCat = btn.dataset.ccat || 'both_planned';
            visibleLimit = 12;
            renderCoopGrid();
          });
        });

        fmtTabs.forEach((btn) => {
          btn.addEventListener('click', () => {
            activeFmt = btn.dataset.cfmt || 'all';
            visibleLimit = 12;
            renderCoopGrid();
          });
        });

        showMoreBtn?.addEventListener('click', () => {
          visibleLimit += 12;
          renderCoopGrid();
        });

        launchSwipeBtn?.addEventListener('click', () => startCoopSwipe());

        randomPickBtn?.addEventListener('click', () => {
          const pool = getActiveFilteredPool();
          if (!pool.length) return;
          const topPool = pool.slice(0, Math.min(20, pool.length));
          const pick = topPool[Math.floor(Math.random() * topPool.length)];
          openEveningTicket(pick, topPool.slice(0, 6), '🎲 СЛУЧАЙНЫЙ ВЫБОР НА ВЕЧЕР');
        });

        modeBtns.forEach((btn) => {
          btn.addEventListener('click', () => startCoopSwipe(btn.dataset.csmode || 'turns'));
        });

        btnPass?.addEventListener('click', () => triggerSwipeChoice(false));
        btnLike?.addEventListener('click', () => triggerSwipeChoice(true));
        btnInstant?.addEventListener('click', () => {
          if (!swipeDeck[swipeIdx]) return;
          openEveningTicket(swipeDeck[swipeIdx], swipeDeck.slice(0, 6), '⚡ МГНОВЕННЫЙ ВЫБОР НА ВЕЧЕР');
        });

        handoffStartBtn?.addEventListener('click', () => {
          currentTurn = 2;
          swipeIdx = 0;
          showCoopModalStage('swipe');
          renderSwipeCard();
        });

        dlTicketBtn?.addEventListener('click', downloadEveningTicketPng);

        copyInviteBtn?.addEventListener('click', async () => {
          if (!activeTicketItem) return;
          const p1Name = coopData?.p1?.nick || cleanNick(input1.value) || 'Игрок 1';
          const p2Name = coopData?.p2?.nick || cleanNick(input2.value) || 'Игрок 2';
          const it = activeTicketItem;
          const epStr = it.kind === 'movie' ? 'Фильм' : (it.episodes ? `${it.episodes} эп.` : it.kindLabel);
          const txt = `🎟 Кооп на вечер (${p1Name} × ${p2Name}) → смотрим «${it.title}» (${epStr}${it.shikiScore ? ` · ★ ${it.shikiScore.toFixed(2)}` : ''}) · ${it.url} · Подобрано на https://undexerorrr.github.io/`;
          try {
            await navigator.clipboard.writeText(txt);
            const orig = copyInviteBtn.textContent;
            copyInviteBtn.textContent = '✓ Скопировано!';
            setTimeout(() => { copyInviteBtn.textContent = orig; }, 1800);
          } catch (e) {}
        });

        rerollTicketBtn?.addEventListener('click', () => {
          const pool = getActiveFilteredPool();
          const list = pool.length > 1 ? pool.slice(0, 20) : activeTicketAlts;
          const filtered = list.filter((x) => !activeTicketItem || x.id !== activeTicketItem.id);
          const pick = (filtered.length ? filtered : list)[Math.floor(Math.random() * (filtered.length || list.length))];
          if (pick) openEveningTicket(pick, list.slice(0, 6), '🎲 НОВЫЙ ВАРИАНТ НА ВЕЧЕР');
        });

        modalClose?.addEventListener('click', closeCoopModal);
        modal?.addEventListener('click', (e) => {
          if (e.target === modal) closeCoopModal();
        });

        window.addEventListener('keydown', (e) => {
          if (!modal || !modal.classList.contains('is-open')) return;
          if (e.key === 'Escape') {
            closeCoopModal();
          } else if (swipeStage && swipeStage.style.display !== 'none') {
            if (e.key === 'ArrowLeft') {
              e.preventDefault();
              triggerSwipeChoice(false);
            } else if (e.key === 'ArrowRight') {
              e.preventDefault();
              triggerSwipeChoice(true);
            }
          }
        });

        // External handoff from Taste Match result ("🎬 Подобрать аниме вдвоём")
        coopOpenWithGuestHook = (guestNick) => {
          switchStationTab('coop');
          input1.value = SHIKI_NICKNAME;
          if (guestNick) input2.value = guestNick;
          document.getElementById('compatibility')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          if (guestNick && guestNick.toLowerCase() !== SHIKI_NICKNAME.toLowerCase()) {
            runCoopMatch(input1.value, input2.value);
          } else {
            input2.focus();
          }
        };
      }

      /* =========================================
         V20: ARCHIVE TROPHIES («ТРОФЕИ АРХИВА» — 3D METALLIC TOKENS)
         ========================================= */
      function buildFallbackTrophiesState() {
        const dna = animeDnaState || SNAPSHOT_DNA;
        const completed = Number(liveStatsSnapshot.animeCompleted) || SNAPSHOT.anime.completed;
        const watching = Number(liveStatsSnapshot.animeWatching) || SNAPSHOT.anime.watching;
        const mangaDone = Number(liveStatsSnapshot.mangaCompleted) || SNAPSHOT.manga.completed;
        const mangaRead = Number(liveStatsSnapshot.mangaReading) || SNAPSHOT.manga.reading;
        const totalEps = Number(dna.totalEpisodes) || 9420;
        const estDays = Math.round((totalEps * 24) / 1440);
        const ratedCount = Number(dna.ratedCount) || 360;
        const meanScore = Number(dna.meanScore) || 7.94;
        const tensCount = Number(dna.tensCount) || 31;
        const goldenCount = (dna.eras || []).find((e) => e.name.includes('2005–2012'))?.count || 84;
        const classicCount = (dna.eras || []).find((e) => e.name.includes('до 2005'))?.count || 27;
        const moviesCount = (dna.formats || []).find((f) => f.name === 'Фильмы')?.count || 48;

        const peakEv = PEAK_FICTION.slice(0, 4).map((p) => ({
          title: p.title,
          meta: `Peak #${formatRank(p.rank)} · ${p.year}`,
          url: `${activeShikiOrigin}/animes/${p.malId}`
        }));
        const goldenEv = PEAK_FICTION.filter((p) => p.year >= 2005 && p.year <= 2012).slice(0, 4).map((p) => ({
          title: p.title,
          meta: `${p.year} · ★ ${p.score.toFixed(2)}`,
          url: `${activeShikiOrigin}/animes/${p.malId}`
        }));
        const classicEv = PEAK_FICTION.filter((p) => p.year < 2005).slice(0, 4).map((p) => ({
          title: p.title,
          meta: `${p.year} · ★ ${p.score.toFixed(2)}`,
          url: `${activeShikiOrigin}/animes/${p.malId}`
        }));

        const defs = [
          {
            id: 'club400', code: 'TR-01', tier: 'platinum', glyph: '★',
            name: '400+ CLUB', sub: 'Верифицированный ветеран',
            desc: 'Пройдена отметка в 400 завершённых аниме в профиле Shikimori — элитный клуб архивариусов.',
            current: completed, target: 400, metric: `${completed} / 400 тайтлов`,
            evidence: peakEv
          },
          {
            id: 'timelord', code: 'TR-02', tier: 'platinum', glyph: '⧗',
            name: 'TIME LORD', sub: 'Повелитель хронометража',
            desc: 'Более 7 500 просмотренных эпизодов — месяцы непрерывного погружения в аниме-миры.',
            current: totalEps, target: 7500, metric: `${totalEps.toLocaleString('ru-RU')} эп. · ~${estDays} дн.`,
            evidence: [
              { title: 'Ван-Пис', meta: '1000+ эп. · Сага', url: `${activeShikiOrigin}/animes/21` },
              { title: 'Блич', meta: '366 эп. · TV', url: `${activeShikiOrigin}/animes/269` },
              { title: 'Охотник х Охотник (2011)', meta: '148 эп. · TV', url: `${activeShikiOrigin}/animes/11061` }
            ]
          },
          {
            id: 'peakhunter', code: 'TR-03', tier: 'platinum', glyph: '◈',
            name: 'PEAK HUNTER', sub: 'Коллекционер десяток',
            desc: 'Найдено и отмечено не менее 20 абсолютных шедевров с высшей личной оценкой 10/10.',
            current: tensCount, target: 20, metric: `${tensCount} тайтлов на 10★`,
            evidence: peakEv
          },
          {
            id: 'ironcritic', code: 'TR-04', tier: 'gold', glyph: '⚖',
            name: 'IRON CRITIC', sub: 'Холодный вердикт',
            desc: 'Выставлено свыше 250 осознанных оценок — сформирован собственный критический стандарт.',
            current: ratedCount, target: 250, metric: `${ratedCount} оценок · ср. ${meanScore.toFixed(2)}★`,
            evidence: peakEv.slice(0, 3)
          },
          {
            id: 'goldenera', code: 'TR-05', tier: 'gold', glyph: '✦',
            name: 'GOLDEN ERA', sub: 'Эпоха легенд 2005–2012',
            desc: 'Пройдено не менее 60 тайтлов из золотой эпохи индустрии (2005–2012 годы).',
            current: goldenCount, target: 60, metric: `${goldenCount} / 60 тайтлов`,
            evidence: goldenEv
          },
          {
            id: 'marathon', code: 'TR-06', tier: 'gold', glyph: '∞',
            name: 'MARATHON RUNNER', sub: 'Покоритель длинных саг',
            desc: 'Завершены как минимум 8 масштабных сериалов длиной от 50 эпизодов и выше.',
            current: 10, target: 8, metric: '10+ длинных саг (50+ эп.)',
            evidence: [
              { title: 'Ван-Пис', meta: '1000+ эп.', url: `${activeShikiOrigin}/animes/21` },
              { title: 'Блич', meta: '366 эп.', url: `${activeShikiOrigin}/animes/269` },
              { title: 'Охотник х Охотник (2011)', meta: '148 эп.', url: `${activeShikiOrigin}/animes/11061` },
              { title: 'Стальной алхимик: Братство', meta: '64 эп.', url: `${activeShikiOrigin}/animes/5114` }
            ]
          },
          {
            id: 'hottaker', code: 'TR-07', tier: 'gold', glyph: '⚡',
            name: 'HOT TAKE REBEL', sub: 'Против мнения толпы',
            desc: 'Не менее 10 тайтлов, где личная оценка разошлась с рейтингом Шикимори минимум на 1.8 балла.',
            current: 14, target: 10, metric: '14+ споров (|Δ| ≥ 1.8)',
            evidence: (hotTakesState?.gems || []).slice(0, 2).concat((hotTakesState?.overrated || []).slice(0, 2)).map((x) => ({
              title: x.title,
              meta: `Я ${x.userScore}★ vs Шики ${x.shikiScore.toFixed(2)}`,
              url: x.url || `${activeShikiOrigin}/animes/${x.malId}`
            }))
          },
          {
            id: 'cinema', code: 'TR-08', tier: 'silver', glyph: '▣',
            name: 'CINEMA ARCHIVIST', sub: 'Кинозал полнометражек',
            desc: 'Просмотрено от 30 полнометражных аниме-фильмов в личной коллекции.',
            current: moviesCount, target: 30, metric: `${moviesCount} / 30 фильмов`,
            evidence: PEAK_FICTION.filter((p) => p.kind === 'Фильм').map((p) => ({
              title: p.title,
              meta: `Фильм · ${p.year}`,
              url: `${activeShikiOrigin}/animes/${p.malId}`
            }))
          },
          {
            id: 'oldschool', code: 'TR-09', tier: 'silver', glyph: '⏣',
            name: 'OLD SCHOOL', sub: 'Классика до 2005 года',
            desc: 'Пройдено не менее 15 культовых тайтлов старой школы, вышедших до 2005 года.',
            current: classicCount, target: 15, metric: `${classicCount} / 15 тайтлов`,
            evidence: classicEv
          },
          {
            id: 'multitask', code: 'TR-10', tier: 'silver', glyph: '◉',
            name: 'MULTITASKER', sub: 'Десять миров сразу',
            desc: 'Одновременно открыто 10 и более тайтлов в активном списке «Смотрю».',
            current: watching, target: 10, metric: `${watching} / 10 в «Смотрю»`,
            evidence: (watchingList.length ? watchingList : SNAPSHOT.watching).slice(0, 4).map((w) => ({
              title: w.title,
              meta: `${w.episodes} / ${w.totalEpisodes || '?'} эп.`,
              url: w.url || `${activeShikiOrigin}/animes/${w.malId}`
            }))
          },
          {
            id: 'manga', code: 'TR-11', tier: 'silver', glyph: '▤',
            name: 'MANGA READER', sub: 'Чёрно-белые тома',
            desc: 'Прочитано полностью не менее 10 тайтлов манги помимо аниме-архива.',
            current: mangaDone, target: 10, metric: `${mangaDone} заверш. · ${mangaRead} читаю`,
            evidence: [
              { title: 'Список манги на Shikimori', meta: `${mangaDone} прочит. · ${mangaRead} в процессе`, url: `${activeShikiOrigin}/undereror+nyashka/list/manga` }
            ]
          },
          {
            id: 'legend500', code: 'TR-12', tier: 'platinum', glyph: '♛',
            name: '500 LEGEND', sub: 'Следующий рубеж архива',
            desc: 'Финальный легендарный жетон за 500 завершённых аниме в архиве Shikimori.',
            current: completed, target: 500, metric: `${completed} / 500 (${Math.min(100, Math.round((completed / 500) * 100))}%)`,
            evidence: [
              { title: `Осталось до рубежа: ${Math.max(0, 500 - completed)} тайтлов`, meta: 'В процессе', url: `${activeShikiOrigin}/undereror+nyashka/list/anime` }
            ]
          }
        ];

        const items = defs.map((d) => {
          const unlocked = d.current >= d.target;
          const pct = Math.max(0, Math.min(100, Math.round((d.current / Math.max(1, d.target)) * 100)));
          return { ...d, unlocked, pct };
        });

        return { isLive: false, items, updatedAt: Date.now() };
      }

      function computeTrophiesFromRates(allRates, userStats) {
        if (!Array.isArray(allRates) || !allRates.length) return buildFallbackTrophiesState();

        const completedRates = allRates.filter((r) => r && r.anime && r.anime.id && r.status === 'completed');
        const watchingRates = allRates.filter((r) => r && r.anime && r.anime.id && (r.status === 'watching' || r.status === 'rewatching'));

        const completedCount = Math.max(completedRates.length, Number(liveStatsSnapshot.animeCompleted) || 0);
        const watchingCount = Math.max(watchingRates.length, Number(liveStatsSnapshot.animeWatching) || 0);
        const mangaDone = Number(liveStatsSnapshot.mangaCompleted) || SNAPSHOT.manga.completed;
        const mangaRead = Number(liveStatsSnapshot.mangaReading) || SNAPSHOT.manga.reading;

        let totalEps = 0;
        let ratedCount = 0;
        let scoreSum = 0;
        const tensList = [];
        const goldenList = [];
        const classicList = [];
        const moviesList = [];
        const marathonList = [];
        const clashesList = [];
        const criticalLowList = [];

        const makeUrl = (a) => (a.url ? normalizeShikiUrl(a.url, activeShikiOrigin) : `${activeShikiOrigin}/animes/${a.id}`);
        const getName = (a) => a.russian || a.name || `#${a.id}`;

        completedRates.forEach((r) => {
          const a = r.anime;
          const uScore = Number(r.score) || 0;
          const sScore = Number(a.score) || 0;
          const eps = Number(r.episodes) || Number(a.episodes) || 0;
          const year = a.aired_on ? Number(String(a.aired_on).slice(0, 4)) || 0 : 0;
          const kind = String(a.kind || 'tv').toLowerCase();

          totalEps += eps;

          if (uScore >= 1 && uScore <= 10) {
            ratedCount++;
            scoreSum += uScore;
            if (uScore === 10) {
              tensList.push({ title: getName(a), score: uScore, shiki: sScore, year, url: makeUrl(a) });
            }
            if (sScore >= 5) {
              const delta = uScore - sScore;
              if (Math.abs(delta) >= 1.8) {
                clashesList.push({ title: getName(a), score: uScore, shiki: sScore, delta, absDelta: Math.abs(delta), url: makeUrl(a) });
              }
              if (delta <= -1.2 && sScore >= 7.2) {
                criticalLowList.push({ title: getName(a), score: uScore, shiki: sScore, delta, url: makeUrl(a) });
              }
            }
          }

          if (year >= 2005 && year <= 2012) {
            goldenList.push({ title: getName(a), score: uScore, shiki: sScore, year, url: makeUrl(a) });
          } else if (year > 1950 && year < 2005) {
            classicList.push({ title: getName(a), score: uScore, shiki: sScore, year, url: makeUrl(a) });
          }

          if (kind === 'movie') {
            moviesList.push({ title: getName(a), score: uScore, shiki: sScore, year, url: makeUrl(a) });
          }

          if (kind === 'tv' && eps >= 50) {
            marathonList.push({ title: getName(a), eps, score: uScore, url: makeUrl(a) });
          }
        });

        const byBest = (a, b) => (b.score - a.score) || (b.shiki - a.shiki);
        tensList.sort(byBest);
        goldenList.sort(byBest);
        classicList.sort(byBest);
        moviesList.sort(byBest);
        marathonList.sort((a, b) => b.eps - a.eps || b.score - a.score);
        clashesList.sort((a, b) => b.absDelta - a.absDelta);
        criticalLowList.sort((a, b) => a.delta - b.delta);

        const meanScore = ratedCount ? scoreSum / ratedCount : 7.94;
        const estDays = Math.round((totalEps * 24) / 1440);

        const defs = [
          {
            id: 'club400', code: 'TR-01', tier: 'platinum', glyph: '★',
            name: '400+ CLUB', sub: 'Верифицированный ветеран',
            desc: 'Пройдена отметка в 400 завершённых аниме в профиле Shikimori — элитный клуб архивариусов.',
            current: completedCount, target: 400, metric: `${completedCount} / 400 тайтлов`,
            evidence: tensList.slice(0, 4).map((x) => ({
              title: x.title,
              meta: `10★${x.year ? ' · ' + x.year : ''}`,
              url: x.url
            }))
          },
          {
            id: 'timelord', code: 'TR-02', tier: 'platinum', glyph: '⧗',
            name: 'TIME LORD', sub: 'Повелитель хронометража',
            desc: 'Более 7 500 просмотренных эпизодов — месяцы непрерывного погружения в аниме-миры.',
            current: totalEps, target: 7500, metric: `${totalEps.toLocaleString('ru-RU')} эп. · ~${estDays} дн.`,
            evidence: marathonList.slice(0, 4).map((x) => ({
              title: x.title,
              meta: `${x.eps} эп.${x.score ? ' · ' + x.score + '★' : ''}`,
              url: x.url
            }))
          },
          {
            id: 'peakhunter', code: 'TR-03', tier: 'platinum', glyph: '◈',
            name: 'PEAK HUNTER', sub: 'Коллекционер десяток',
            desc: 'Найдено и отмечено не менее 20 абсолютных шедевров с высшей личной оценкой 10/10.',
            current: tensList.length, target: 20, metric: `${tensList.length} тайтлов на 10★`,
            evidence: tensList.slice(0, 4).map((x) => ({
              title: x.title,
              meta: `10★ · Шики ${x.shiki ? x.shiki.toFixed(2) : '—'}`,
              url: x.url
            }))
          },
          {
            id: 'ironcritic', code: 'TR-04', tier: 'gold', glyph: '⚖',
            name: 'IRON CRITIC', sub: 'Холодный вердикт',
            desc: 'Выставлено свыше 250 осознанных оценок — сформирован собственный критический стандарт.',
            current: ratedCount, target: 250, metric: `${ratedCount} оценок · ср. ${meanScore.toFixed(2)}★`,
            evidence: (criticalLowList.length ? criticalLowList : tensList).slice(0, 4).map((x) => ({
              title: x.title,
              meta: `Я ${x.score}★ · Шики ${x.shiki ? x.shiki.toFixed(2) : '—'}`,
              url: x.url
            }))
          },
          {
            id: 'goldenera', code: 'TR-05', tier: 'gold', glyph: '✦',
            name: 'GOLDEN ERA', sub: 'Эпоха легенд 2005–2012',
            desc: 'Пройдено не менее 60 тайтлов из золотой эпохи индустрии (2005–2012 годы).',
            current: goldenList.length, target: 60, metric: `${goldenList.length} / 60 тайтлов`,
            evidence: goldenList.slice(0, 4).map((x) => ({
              title: x.title,
              meta: `${x.year}${x.score ? ' · ' + x.score + '★' : ''}`,
              url: x.url
            }))
          },
          {
            id: 'marathon', code: 'TR-06', tier: 'gold', glyph: '∞',
            name: 'MARATHON RUNNER', sub: 'Покоритель длинных саг',
            desc: 'Завершены как минимум 8 масштабных сериалов длиной от 50 эпизодов и выше.',
            current: marathonList.length, target: 8, metric: `${marathonList.length} саг по 50+ эп.`,
            evidence: marathonList.slice(0, 4).map((x) => ({
              title: x.title,
              meta: `${x.eps} эп.${x.score ? ' · ' + x.score + '★' : ''}`,
              url: x.url
            }))
          },
          {
            id: 'hottaker', code: 'TR-07', tier: 'gold', glyph: '⚡',
            name: 'HOT TAKE REBEL', sub: 'Против мнения толпы',
            desc: 'Не менее 10 тайтлов, где личная оценка разошлась с рейтингом Шикимори минимум на 1.8 балла.',
            current: clashesList.length, target: 10, metric: `${clashesList.length} споров (|Δ| ≥ 1.8)`,
            evidence: clashesList.slice(0, 4).map((x) => ({
              title: x.title,
              meta: `Я ${x.score}★ vs ${x.shiki.toFixed(2)} (${x.delta > 0 ? '+' : ''}${x.delta.toFixed(1)})`,
              url: x.url
            }))
          },
          {
            id: 'cinema', code: 'TR-08', tier: 'silver', glyph: '▣',
            name: 'CINEMA ARCHIVIST', sub: 'Кинозал полнометражек',
            desc: 'Просмотрено от 30 полнометражных аниме-фильмов в личной коллекции.',
            current: moviesList.length, target: 30, metric: `${moviesList.length} / 30 фильмов`,
            evidence: moviesList.slice(0, 4).map((x) => ({
              title: x.title,
              meta: `${x.year || 'Фильм'}${x.score ? ' · ' + x.score + '★' : ''}`,
              url: x.url
            }))
          },
          {
            id: 'oldschool', code: 'TR-09', tier: 'silver', glyph: '⏣',
            name: 'OLD SCHOOL', sub: 'Классика до 2005 года',
            desc: 'Пройдено не менее 15 культовых тайтлов старой школы, вышедших до 2005 года.',
            current: classicList.length, target: 15, metric: `${classicList.length} / 15 тайтлов`,
            evidence: classicList.slice(0, 4).map((x) => ({
              title: x.title,
              meta: `${x.year}${x.score ? ' · ' + x.score + '★' : ''}`,
              url: x.url
            }))
          },
          {
            id: 'multitask', code: 'TR-10', tier: 'silver', glyph: '◉',
            name: 'MULTITASKER', sub: 'Десять миров сразу',
            desc: 'Одновременно открыто 10 и более тайтлов в активном списке «Смотрю».',
            current: watchingCount, target: 10, metric: `${watchingCount} / 10 в «Смотрю»`,
            evidence: watchingRates.slice(0, 4).map((r) => ({
              title: getName(r.anime),
              meta: `${Number(r.episodes) || 0} / ${Number(r.anime.episodes) || '?'} эп.`,
              url: makeUrl(r.anime)
            }))
          },
          {
            id: 'manga', code: 'TR-11', tier: 'silver', glyph: '▤',
            name: 'MANGA READER', sub: 'Чёрно-белые тома',
            desc: 'Прочитано полностью не менее 10 тайтлов манги помимо аниме-архива.',
            current: mangaDone, target: 10, metric: `${mangaDone} заверш. · ${mangaRead} читаю`,
            evidence: [
              { title: 'Открыть список манги на Shikimori', meta: `${mangaDone} прочит. · ${mangaRead} читаю`, url: `${activeShikiOrigin}/undereror+nyashka/list/manga` }
            ]
          },
          {
            id: 'legend500', code: 'TR-12', tier: 'platinum', glyph: '♛',
            name: '500 LEGEND', sub: 'Следующий рубеж архива',
            desc: 'Финальный легендарный жетон за 500 завершённых аниме в архиве Shikimori.',
            current: completedCount, target: 500, metric: `${completedCount} / 500 (${Math.min(100, Math.round((completedCount / 500) * 100))}%)`,
            evidence: [
              {
                title: completedCount >= 500 ? 'Рубеж 500+ официально взят!' : `Осталось до рубежа: ${500 - completedCount} тайтлов`,
                meta: `${completedCount} / 500`,
                url: `${activeShikiOrigin}/undereror+nyashka/list/anime`
              }
            ]
          }
        ];

        const items = defs.map((d) => {
          const unlocked = d.current >= d.target;
          const pct = Math.max(0, Math.min(100, Math.round((d.current / Math.max(1, d.target)) * 100)));
          return { ...d, unlocked, pct };
        });

        return { isLive: true, items, updatedAt: Date.now() };
      }

      let openTrophyInspectHook = null;

      function renderTrophiesShowcase() {
        const grid = document.getElementById('trophies-grid');
        if (!grid) return;

        const st = trophiesState || buildFallbackTrophiesState();
        const allItems = st.items || [];
        const unlockedItems = allItems.filter((x) => x.unlocked);
        const platItems = allItems.filter((x) => x.tier === 'platinum');
        const lockedItems = allItems.filter((x) => !x.unlocked);

        const pctTotal = allItems.length ? Math.round((unlockedItems.length / allItems.length) * 100) : 0;
        const rankLabel = pctTotal >= 100 ? 'MYTHIC SSS' : pctTotal >= 85 ? 'ARCHIVIST S' : pctTotal >= 65 ? 'CURATOR A' : 'COLLECTOR B';

        const rankEl = document.getElementById('trophies-rank-val');
        const progBadge = document.getElementById('trophies-progress-badge');
        const srcNote = document.getElementById('trophies-source-note');
        const pctEl = document.getElementById('trophies-pct-text');
        const xpFill = document.getElementById('trophies-xp-fill');

        if (rankEl) rankEl.textContent = rankLabel;
        if (progBadge) progBadge.textContent = `${unlockedItems.length} / ${allItems.length} ОТКРЫТО`;
        if (srcNote) srcNote.textContent = st.isLive ? 'SHIKIMORI LIVE · VERIFIED' : 'SNAPSHOT · SYNCING';
        if (pctEl) pctEl.textContent = `${pctTotal}%`;
        if (xpFill) xpFill.style.width = `${pctTotal}%`;

        const cAll = document.getElementById('tf-cnt-all');
        const cUnl = document.getElementById('tf-cnt-unlocked');
        const cPlat = document.getElementById('tf-cnt-plat');
        const cLock = document.getElementById('tf-cnt-locked');
        if (cAll) cAll.textContent = String(allItems.length);
        if (cUnl) cUnl.textContent = String(unlockedItems.length);
        if (cPlat) cPlat.textContent = String(platItems.length);
        if (cLock) cLock.textContent = String(lockedItems.length);

        let visible = allItems;
        if (trophyFilter === 'unlocked') visible = unlockedItems;
        else if (trophyFilter === 'platinum') visible = platItems;
        else if (trophyFilter === 'locked') visible = lockedItems;

        const tierTextMap = { platinum: 'PLATINUM', gold: 'GOLD', silver: 'SILVER', locked: 'LOCKED' };

        if (!visible.length) {
          grid.innerHTML = '<div class="base-empty-note" style="grid-column:1 / -1;padding:22px 0;">Все трофеи в этой категории уже собраны!</div>';
          return;
        }

        grid.innerHTML = visible.map((t) => {
          const effTier = t.unlocked ? t.tier : 'locked';
          const tierLabel = t.unlocked ? (tierTextMap[t.tier] || 'SILVER') : `${t.pct}%`;
          return `
            <button type="button" class="trophy-card ${t.unlocked ? '' : 'is-locked'}" data-trophy-id="${escapeHtml(t.id)}" data-tier="${effTier}">
              <div class="trophy-card-top">
                <span>${escapeHtml(t.code)}</span>
                <span class="trophy-tier-pill">${escapeHtml(tierLabel)}</span>
              </div>
              <div class="trophy-coin" data-tier="${effTier}">
                <div class="trophy-coin-notches" aria-hidden="true"></div>
                <div class="trophy-coin-ring" aria-hidden="true"></div>
                <div class="trophy-coin-core">
                  <span class="trophy-coin-code-top">${escapeHtml(t.code)}</span>
                  <span class="trophy-coin-glyph" aria-hidden="true">${t.unlocked ? t.glyph : '🔒'}</span>
                  <span class="trophy-coin-tier-lbl">${escapeHtml(t.unlocked ? tierTextMap[t.tier] : 'IN PROG')}</span>
                </div>
                <div class="trophy-coin-sheen" aria-hidden="true"></div>
                <div class="trophy-coin-glare" aria-hidden="true"></div>
              </div>
              <div class="trophy-name">${escapeHtml(t.name)}</div>
              <div class="trophy-sub">${escapeHtml(t.sub)}</div>
              <div class="trophy-metric-row">
                <span class="trophy-metric-val">${escapeHtml(t.metric)}</span>
                <div class="trophy-mini-bar">
                  <div class="trophy-mini-fill" style="width:${t.pct}%"></div>
                </div>
              </div>
            </button>
          `;
        }).join('');

        // Bind stationary-card 3D metallic coin tilt (zero flicker, GPU-only) + inspect click
        const isFine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
        grid.querySelectorAll('.trophy-card').forEach((card) => {
          const coin = card.querySelector('.trophy-coin');
          if (isFine && coin) {
            let raf = null;
            let lx = 0, ly = 0;

            card.addEventListener('pointerenter', () => {
              card.classList.add('is-tilting');
            });

            card.addEventListener('pointermove', (e) => {
              if (e.pointerType && e.pointerType !== 'mouse') return;
              lx = e.clientX;
              ly = e.clientY;
              if (raf !== null) return;
              raf = requestAnimationFrame(() => {
                raf = null;
                const rect = card.getBoundingClientRect();
                if (!rect.width || !rect.height) return;
                const nx = Math.max(0, Math.min(1, (lx - rect.left) / rect.width));
                const ny = Math.max(0, Math.min(1, (ly - rect.top) / rect.height));
                const dx = nx - 0.5;
                const dy = ny - 0.5;
                coin.style.setProperty('--trx', `${(-dy * 26).toFixed(2)}deg`);
                coin.style.setProperty('--try', `${(dx * 28).toFixed(2)}deg`);
                coin.style.setProperty('--gx', `${(nx * 100).toFixed(1)}%`);
                coin.style.setProperty('--gy', `${(ny * 100).toFixed(1)}%`);
                coin.style.setProperty('--tgx', `${(12 + nx * 76).toFixed(1)}%`);
                coin.style.setProperty('--tgy', `${(12 + ny * 76).toFixed(1)}%`);
                coin.style.setProperty('--top', (0.30 + Math.hypot(dx, dy) * 0.85).toFixed(3));
              });
            });

            card.addEventListener('pointerleave', () => {
              if (raf !== null) { cancelAnimationFrame(raf); raf = null; }
              card.classList.remove('is-tilting');
              coin.style.setProperty('--trx', '0deg');
              coin.style.setProperty('--try', '0deg');
              coin.style.setProperty('--gx', '32%');
              coin.style.setProperty('--gy', '26%');
              coin.style.setProperty('--tgx', '50%');
              coin.style.setProperty('--tgy', '50%');
              coin.style.setProperty('--top', '0.25');
            });
          }

          card.addEventListener('click', () => {
            const id = card.dataset.trophyId;
            if (typeof openTrophyInspectHook === 'function') openTrophyInspectHook(id);
          });
        });
      }

      function initTrophiesShowcase() {
        const filterBtns = Array.from(document.querySelectorAll('.trophy-filter-btn'));
        const dlBtn = document.getElementById('trophies-download-png-btn');

        const modal = document.getElementById('trophy-modal');
        const closeBtn = document.getElementById('trophy-modal-close');
        const inspectStage = document.getElementById('trophy-inspect-stage');
        const modalCoin = document.getElementById('trophy-modal-coin');
        const coinCode = document.getElementById('tm-coin-code');
        const coinGlyph = document.getElementById('tm-coin-glyph');
        const coinTier = document.getElementById('tm-coin-tier');

        const tierPill = document.getElementById('tm-tier-pill');
        const statusBadge = document.getElementById('tm-status-badge');
        const titleEl = document.getElementById('tm-title');
        const subEl = document.getElementById('tm-sub');
        const descEl = document.getElementById('tm-desc');
        const progVal = document.getElementById('tm-prog-val');
        const progFill = document.getElementById('tm-prog-fill');
        const evList = document.getElementById('tm-evidence-list');
        const prevBtn = document.getElementById('tm-prev-btn');
        const nextBtn = document.getElementById('tm-next-btn');
        const navCounter = document.getElementById('tm-nav-counter');

        let activeIdx = 0;

        function getItems() {
          return (trophiesState || buildFallbackTrophiesState()).items || [];
        }

        function renderInspectModal(idx) {
          const items = getItems();
          if (!items.length || !modal) return;
          activeIdx = (idx + items.length) % items.length;
          const t = items[activeIdx];
          const effTier = t.unlocked ? t.tier : 'locked';
          const tierNames = { platinum: '★ PLATINUM', gold: '◈ GOLD', silver: '◇ SILVER', locked: '🔒 IN PROGRESS' };
          const tierShort = { platinum: 'PLATINUM', gold: 'GOLD', silver: 'SILVER', locked: 'LOCKED' };

          if (modalCoin) {
            modalCoin.dataset.tier = effTier;
            modalCoin.style.setProperty('--trx', '0deg');
            modalCoin.style.setProperty('--try', '0deg');
            modalCoin.style.setProperty('--gx', '32%');
            modalCoin.style.setProperty('--gy', '26%');
            modalCoin.style.setProperty('--tgx', '50%');
            modalCoin.style.setProperty('--tgy', '50%');
            modalCoin.style.setProperty('--top', '0.32');
          }
          if (coinCode) coinCode.textContent = t.code;
          if (coinGlyph) coinGlyph.textContent = t.unlocked ? t.glyph : '🔒';
          if (coinTier) coinTier.textContent = tierShort[effTier] || 'MEDAL';

          if (tierPill) {
            tierPill.textContent = tierNames[effTier] || 'MEDAL';
            tierPill.className = `trophy-tier-pill tier-${effTier}`;
          }
          if (statusBadge) {
            statusBadge.textContent = t.unlocked ? '✓ ОТКРЫТ В АРХИВЕ' : `В ПРОЦЕССЕ · ${t.pct}%`;
            statusBadge.style.borderColor = t.unlocked ? 'rgba(110, 231, 183, 0.45)' : 'rgba(var(--bright), 0.24)';
            statusBadge.style.color = t.unlocked ? '#a7f3d0' : 'rgba(var(--light), 0.72)';
          }
          if (titleEl) titleEl.textContent = t.name;
          if (subEl) subEl.textContent = `${t.code} · ${t.sub}`;
          if (descEl) descEl.textContent = t.desc;
          if (progVal) progVal.textContent = t.metric;
          if (progFill) progFill.style.width = `${t.pct}%`;
          if (navCounter) navCounter.textContent = `${formatRank(activeIdx + 1)} / ${formatRank(items.length)}`;

          if (evList) {
            const evs = (t.evidence || []).slice(0, 4);
            evList.innerHTML = evs.length
              ? evs.map((ev) => `
                  <a class="trophy-ev-row" href="${escapeHtml(ev.url || `${activeShikiOrigin}/undereror+nyashka`)}" target="_blank" rel="noopener noreferrer">
                    <span class="trophy-ev-title">${escapeHtml(ev.title)}</span>
                    <span class="trophy-ev-meta">${escapeHtml(ev.meta)}</span>
                  </a>
                `).join('')
              : '<div class="base-empty-note" style="padding:10px 0;">Подтверждено статистикой профиля Shikimori</div>';
          }
        }

        function openInspectById(id) {
          const items = getItems();
          const idx = Math.max(0, items.findIndex((x) => x.id === id));
          renderInspectModal(idx);
          modal?.classList.add('is-open');
          modal?.setAttribute('aria-hidden', 'false');
        }

        function closeInspect() {
          modal?.classList.remove('is-open');
          modal?.setAttribute('aria-hidden', 'true');
        }

        openTrophyInspectHook = openInspectById;

        // Large 3D coin tilt inside inspect modal (stationary stage rect -> zero flicker)
        if (inspectStage && modalCoin) {
          let mRaf = null;
          let mx = 0, my = 0;

          inspectStage.addEventListener('pointerenter', () => inspectStage.classList.add('is-tilting'));
          inspectStage.addEventListener('pointermove', (e) => {
            mx = e.clientX;
            my = e.clientY;
            if (mRaf !== null) return;
            mRaf = requestAnimationFrame(() => {
              mRaf = null;
              const rect = inspectStage.getBoundingClientRect();
              if (!rect.width || !rect.height) return;
              const nx = Math.max(0, Math.min(1, (mx - rect.left) / rect.width));
              const ny = Math.max(0, Math.min(1, (my - rect.top) / rect.height));
              const dx = nx - 0.5;
              const dy = ny - 0.5;
              modalCoin.style.setProperty('--trx', `${(-dy * 30).toFixed(2)}deg`);
              modalCoin.style.setProperty('--try', `${(dx * 32).toFixed(2)}deg`);
              modalCoin.style.setProperty('--gx', `${(nx * 100).toFixed(1)}%`);
              modalCoin.style.setProperty('--gy', `${(ny * 100).toFixed(1)}%`);
              modalCoin.style.setProperty('--tgx', `${(10 + nx * 80).toFixed(1)}%`);
              modalCoin.style.setProperty('--tgy', `${(10 + ny * 80).toFixed(1)}%`);
              modalCoin.style.setProperty('--top', (0.34 + Math.hypot(dx, dy) * 0.90).toFixed(3));
            });
          });
          inspectStage.addEventListener('pointerleave', () => {
            if (mRaf !== null) { cancelAnimationFrame(mRaf); mRaf = null; }
            inspectStage.classList.remove('is-tilting');
            modalCoin.style.setProperty('--trx', '0deg');
            modalCoin.style.setProperty('--try', '0deg');
            modalCoin.style.setProperty('--gx', '32%');
            modalCoin.style.setProperty('--gy', '26%');
            modalCoin.style.setProperty('--tgx', '50%');
            modalCoin.style.setProperty('--tgy', '50%');
            modalCoin.style.setProperty('--top', '0.30');
          });
        }

        filterBtns.forEach((btn) => {
          btn.addEventListener('click', () => {
            trophyFilter = btn.dataset.tfilter || 'all';
            filterBtns.forEach((b) => b.classList.toggle('active', b === btn));
            renderTrophiesShowcase();
          });
        });

        prevBtn?.addEventListener('click', () => renderInspectModal(activeIdx - 1));
        nextBtn?.addEventListener('click', () => renderInspectModal(activeIdx + 1));
        closeBtn?.addEventListener('click', closeInspect);
        modal?.addEventListener('click', (e) => {
          if (e.target === modal) closeInspect();
        });

        window.addEventListener('keydown', (e) => {
          if (!modal || !modal.classList.contains('is-open')) return;
          if (e.key === 'Escape') closeInspect();
          else if (e.key === 'ArrowLeft') { e.preventDefault(); renderInspectModal(activeIdx - 1); }
          else if (e.key === 'ArrowRight') { e.preventDefault(); renderInspectModal(activeIdx + 1); }
        });

        // PNG Trophy Showcase Exporter (1200x675 Noir Edition)
        dlBtn?.addEventListener('click', () => {
          const items = getItems();
          const unlocked = items.filter((x) => x.unlocked);
          const pct = items.length ? Math.round((unlocked.length / items.length) * 100) : 0;
          const W = 1200;
          const H = 675;
          const c = document.createElement('canvas');
          c.width = W;
          c.height = H;
          const ctx = c.getContext('2d');

          function rRect(x, y, w, h, r) {
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.arcTo(x + w, y, x + w, y + h, r);
            ctx.arcTo(x + w, y + h, x, y + h, r);
            ctx.arcTo(x, y + h, x, y, r);
            ctx.arcTo(x, y, x + w, y, r);
            ctx.closePath();
          }

          const bg = ctx.createLinearGradient(0, 0, W, H);
          bg.addColorStop(0, '#06080e');
          bg.addColorStop(0.5, '#0b101c');
          bg.addColorStop(1, '#05070c');
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, W, H);

          const halo = ctx.createRadialGradient(600, 140, 20, 600, 140, 520);
          halo.addColorStop(0, 'rgba(173, 196, 232, 0.14)');
          halo.addColorStop(1, 'transparent');
          ctx.fillStyle = halo;
          ctx.fillRect(0, 0, W, H);

          ctx.strokeStyle = 'rgba(173, 191, 222, 0.04)';
          for (let x = 40; x < W; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
          for (let y = 40; y < H; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

          rRect(24, 24, W - 48, H - 48, 22);
          ctx.strokeStyle = 'rgba(173, 191, 222, 0.24)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.fillStyle = '#adbfde';
          ctx.font = '600 14px "JetBrains Mono", monospace';
          ctx.fillText('◈  UNDEXEROR // ARCHIVE   ·   ТРОФЕИ АРХИВА', 58, 68);

          ctx.textAlign = 'right';
          ctx.fillStyle = '#6ee7b7';
          ctx.fillText(`${unlocked.length} / ${items.length} ОТКРЫТО  ·  ${pct}%`, W - 58, 68);
          ctx.textAlign = 'left';

          ctx.fillStyle = '#ffffff';
          ctx.font = '600 26px "Unbounded", "Inter", sans-serif';
          ctx.fillText('Витрина металлических жетонов', 58, 112);

          // Draw 4x3 grid of 12 tokens
          const startX = 58;
          const startY = 136;
          const cols = 4;
          const gapX = 16;
          const gapY = 14;
          const cardW = (W - 116 - gapX * 3) / cols;
          const cardH = 148;

          const tierAccent = {
            platinum: '#eef5ff',
            gold: '#e8d5ad',
            silver: '#adbfde',
            locked: '#4d586c'
          };

          items.slice(0, 12).forEach((t, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = startX + col * (cardW + gapX);
            const y = startY + row * (cardH + gapY);
            const eff = t.unlocked ? t.tier : 'locked';
            const acc = tierAccent[eff] || '#adbfde';

            rRect(x, y, cardW, cardH, 14);
            ctx.fillStyle = t.unlocked ? 'rgba(11, 15, 24, 0.90)' : 'rgba(8, 10, 16, 0.65)';
            ctx.fill();
            ctx.strokeStyle = t.unlocked ? (eff === 'platinum' ? 'rgba(232, 242, 255, 0.45)' : eff === 'gold' ? 'rgba(226, 202, 152, 0.38)' : 'rgba(173, 191, 222, 0.28)') : 'rgba(145, 155, 170, 0.16)';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // Mini engraved coin
            const cx = x + 46;
            const cy = y + cardH / 2;
            ctx.beginPath();
            ctx.arc(cx, cy, 28, 0, Math.PI * 2);
            ctx.fillStyle = '#090d16';
            ctx.fill();
            ctx.strokeStyle = acc;
            ctx.lineWidth = 3;
            ctx.stroke();

            ctx.textAlign = 'center';
            ctx.fillStyle = acc;
            ctx.font = '600 22px "Inter", sans-serif';
            ctx.fillText(t.unlocked ? t.glyph : '○', cx, cy + 8);

            // Text right of coin
            ctx.textAlign = 'left';
            ctx.fillStyle = acc;
            ctx.font = '600 10px "JetBrains Mono", monospace';
            ctx.fillText(`${t.code} · ${t.unlocked ? t.tier.toUpperCase() : 'LOCKED'}`, x + 88, y + 46);

            ctx.fillStyle = t.unlocked ? '#ffffff' : 'rgba(205, 212, 224, 0.60)';
            ctx.font = '600 14px "Unbounded", "Inter", sans-serif';
            ctx.fillText(t.name, x + 88, y + 74);

            ctx.fillStyle = 'rgba(205, 212, 224, 0.72)';
            ctx.font = '500 11.5px "JetBrains Mono", monospace';
            ctx.fillText(t.metric, x + 88, y + 102);

            // Progress bar
            rRect(x + 88, y + 116, cardW - 106, 5, 3);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.09)';
            ctx.fill();
            rRect(x + 88, y + 116, Math.max(6, ((cardW - 106) * t.pct) / 100), 5, 3);
            ctx.fillStyle = t.unlocked ? acc : '#6ee7b7';
            ctx.fill();
          });

          ctx.fillStyle = 'rgba(205, 212, 224, 0.56)';
          ctx.font = '500 13px "JetBrains Mono", monospace';
          ctx.fillText('https://undexerorrr.github.io/  ·  undereror nyashka', 58, H - 38);
          ctx.textAlign = 'right';
          ctx.fillStyle = 'rgba(173, 191, 222, 0.65)';
          ctx.fillText('undexeror // archive', W - 58, H - 38);

          const link = document.createElement('a');
          link.download = 'undexeror-trophies-showcase.png';
          link.href = c.toDataURL('image/png');
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        });

        renderTrophiesShowcase();
      }

      const playerControls = initMusicPlayer();
      initIntroOverlay(playerControls);
      initSpotifyDrawer(playerControls);
      initLanyardPresence();
      initTasteMatcher();
      initCoopPicker();
      initRandomizer();
      initTournamentArena();
      initHoloCardViewer();
      initMobileTikTokDock();
      initArchiveGalaxy(playerControls);
      initAtmosphereCanvas();
      initLiveWeather();
      initCollectionControls();

      renderStats(SNAPSHOT.anime, SNAPSHOT.manga, SNAPSHOT.lifetimeText);
      initDnaControls();
      renderAnimeDna(animeDnaState || SNAPSHOT_DNA);
      initHotTakesControls();
      renderHotTakes(hotTakesState, false);
      renderHistory(SNAPSHOT.history, false);
      renderActivityGraph(SNAPSHOT.activity);
      renderWatchingShelf(watchingList.length ? watchingList : SNAPSHOT.watching);
      initWatchingControls();
      initGlassSpotlight();
      renderWaifu();
      initWaifuControls();
      renderCollection();

      syncShikimoriLive();
      loadAnimeCoversBatch([
        ...PEAK_FICTION.map((a) => a.malId),
        ...SNAPSHOT.history.map((h) => h.id),
        ...(watchingList.length ? watchingList : SNAPSHOT.watching).map((w) => w.malId)
      ]);
      loadCharacterCoversBatch([...WAIFU_LIST, ...LITERALLY_ME]);
    })();
