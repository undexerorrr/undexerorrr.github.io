import { formatRank, escapeHtml } from './config.js';
import { appState, SNAPSHOT, PEAK_FICTION, SNAPSHOT_DNA, normalizeShikiUrl } from './data.js';
import { computeWatchedStats } from './shikimori.js';

/* =========================================
   ARCHIVE TROPHIES («ТРОФЕИ АРХИВА» — 3D METALLIC TOKENS)
   ========================================= */
export function buildFallbackTrophiesState() {
  const dna = appState.animeDnaState || SNAPSHOT_DNA;
  const completed = Number(appState.liveStatsSnapshot.animeCompleted) || SNAPSHOT.anime.completed;
  const watching = Number(appState.liveStatsSnapshot.animeWatching) || SNAPSHOT.anime.watching;
  const mangaDone = Number(appState.liveStatsSnapshot.mangaCompleted) || SNAPSHOT.manga.completed;
  const mangaRead = Number(appState.liveStatsSnapshot.mangaReading) || SNAPSHOT.manga.reading;
  const totalEps = Number(dna.totalEpisodes) || 7158;
  const estDays = Math.round((totalEps * 28) / 1440);
  const ratedCount = Number(dna.ratedCount) || 360;
  const meanScore = Number(dna.meanScore) || 7.94;
  const tensCount = Number(dna.tensCount) || 31;
  const goldenCount = (dna.eras || []).find((e) => e.name.includes('2005–2012'))?.count || 84;
  const classicCount = (dna.eras || []).find((e) => e.name.includes('до 2005'))?.count || 27;
  const moviesCount = (dna.formats || []).find((f) => f.name === 'Фильмы')?.count || 48;

  const peakEv = PEAK_FICTION.slice(0, 4).map((p) => ({
    title: p.title,
    meta: `Peak #${formatRank(p.rank)} · ${p.year}`,
    url: `${appState.activeShikiOrigin}/animes/${p.malId}`
  }));
  const goldenEv = PEAK_FICTION.filter((p) => p.year >= 2005 && p.year <= 2012).slice(0, 4).map((p) => ({
    title: p.title,
    meta: `${p.year} · ★ ${p.score.toFixed(2)}`,
    url: `${appState.activeShikiOrigin}/animes/${p.malId}`
  }));
  const classicEv = PEAK_FICTION.filter((p) => p.year < 2005).slice(0, 4).map((p) => ({
    title: p.title,
    meta: `${p.year} · ★ ${p.score.toFixed(2)}`,
    url: `${appState.activeShikiOrigin}/animes/${p.malId}`
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
        { title: 'Ван-Пис', meta: '1000+ эп. · Сага', url: `${appState.activeShikiOrigin}/animes/21` },
        { title: 'Блич', meta: '366 эп. · TV', url: `${appState.activeShikiOrigin}/animes/269` },
        { title: 'Охотник х Охотник (2011)', meta: '148 эп. · TV', url: `${appState.activeShikiOrigin}/animes/11061` }
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
        { title: 'Ван-Пис', meta: '1000+ эп.', url: `${appState.activeShikiOrigin}/animes/21` },
        { title: 'Блич', meta: '366 эп.', url: `${appState.activeShikiOrigin}/animes/269` },
        { title: 'Охотник х Охотник (2011)', meta: '148 эп.', url: `${appState.activeShikiOrigin}/animes/11061` },
        { title: 'Стальной алхимик: Братство', meta: '64 эп.', url: `${appState.activeShikiOrigin}/animes/5114` }
      ]
    },
    {
      id: 'hottaker', code: 'TR-07', tier: 'gold', glyph: '⚡',
      name: 'HOT TAKE REBEL', sub: 'Против мнения толпы',
      desc: 'Не менее 10 тайтлов, где личная оценка разошлась с рейтингом Шикимори минимум на 1.8 балла.',
      current: 14, target: 10, metric: '14+ споров (|Δ| ≥ 1.8)',
      evidence: (appState.hotTakesState?.gems || []).slice(0, 2).concat((appState.hotTakesState?.overrated || []).slice(0, 2)).map((x) => ({
        title: x.title,
        meta: `Я ${x.userScore}★ vs Шики ${x.shikiScore.toFixed(2)}`,
        url: x.url || `${appState.activeShikiOrigin}/animes/${x.malId}`
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
        url: `${appState.activeShikiOrigin}/animes/${p.malId}`
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
      evidence: (appState.watchingList.length ? appState.watchingList : SNAPSHOT.watching).slice(0, 4).map((w) => ({
        title: w.title,
        meta: `${w.episodes} / ${w.totalEpisodes || '?'} эп.`,
        url: w.url || `${appState.activeShikiOrigin}/animes/${w.malId}`
      }))
    },
    {
      id: 'manga', code: 'TR-11', tier: 'silver', glyph: '▤',
      name: 'MANGA READER', sub: 'Чёрно-белые тома',
      desc: 'Прочитано полностью не менее 10 тайтлов манги помимо аниме-архива.',
      current: mangaDone, target: 10, metric: `${mangaDone} заверш. · ${mangaRead} читаю`,
      evidence: [
        { title: 'Список манги на Shikimori', meta: `${mangaDone} прочит. · ${mangaRead} в процессе`, url: `${appState.activeShikiOrigin}/undereror+nyashka/list/manga` }
      ]
    },
    {
      id: 'legend500', code: 'TR-12', tier: 'platinum', glyph: '♛',
      name: '500 LEGEND', sub: 'Следующий рубеж архива',
      desc: 'Финальный легендарный жетон за 500 завершённых аниме в архиве Shikimori.',
      current: completed, target: 500, metric: `${completed} / 500 (${Math.min(100, Math.round((completed / 500) * 100))}%)`,
      evidence: [
        { title: `Осталось до рубежа: ${Math.max(0, 500 - completed)} тайтлов`, meta: 'В процессе', url: `${appState.activeShikiOrigin}/undereror+nyashka/list/anime` }
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

export function computeTrophiesFromRates(allRates, userStats) {
  if (!Array.isArray(allRates) || !allRates.length) return buildFallbackTrophiesState();

  const completedRates = allRates.filter((r) => r && r.anime && r.anime.id && r.status === 'completed');
  const watchingRates = allRates.filter((r) => r && r.anime && r.anime.id && (r.status === 'watching' || r.status === 'rewatching'));

  const completedCount = Math.max(completedRates.length, Number(appState.liveStatsSnapshot.animeCompleted) || 0);
  const watchingCount = Math.max(watchingRates.length, Number(appState.liveStatsSnapshot.animeWatching) || 0);
  const mangaDone = Number(appState.liveStatsSnapshot.mangaCompleted) || SNAPSHOT.manga.completed;
  const mangaRead = Number(appState.liveStatsSnapshot.mangaReading) || SNAPSHOT.manga.reading;

  const watchedStats = computeWatchedStats(allRates);
  const totalEps = watchedStats.totalEps;
  const estDays = watchedStats.estDays;

  let ratedCount = 0;
  let scoreSum = 0;
  const tensList = [];
  const goldenList = [];
  const classicList = [];
  const moviesList = [];
  const marathonList = [];
  const clashesList = [];
  const criticalLowList = [];

  const makeUrl = (a) => (a.url ? normalizeShikiUrl(a.url, appState.activeShikiOrigin) : `${appState.activeShikiOrigin}/animes/${a.id}`);
  const getName = (a) => a.russian || a.name || `#${a.id}`;

  watchedStats.entries.forEach((e) => {
    const isFinished = e.status === 'completed' || e.status === 'rewatching';
    const isActiveSubstantial = e.status === 'watching' && e.watchedEps >= 12;

    if (e.score >= 1 && e.score <= 10) {
      ratedCount++;
      scoreSum += e.score;
      if (e.score === 10 && (isFinished || e.status === 'watching')) {
        tensList.push({ title: e.title, score: e.score, shiki: e.shikiScore, year: e.year, url: e.url });
      }
      if (e.shikiScore >= 5) {
        const delta = e.score - e.shikiScore;
        if (Math.abs(delta) >= 1.8) {
          clashesList.push({ title: e.title, score: e.score, shiki: e.shikiScore, delta, absDelta: Math.abs(delta), url: e.url });
        }
        if (delta <= -1.2 && e.shikiScore >= 7.2) {
          criticalLowList.push({ title: e.title, score: e.score, shiki: e.shikiScore, delta, url: e.url });
        }
      }
    }

    if (isFinished || isActiveSubstantial) {
      if (e.year >= 2005 && e.year <= 2012) {
        goldenList.push({ title: e.title, score: e.score, shiki: e.shikiScore, year: e.year, url: e.url });
      } else if (e.year > 1950 && e.year < 2005) {
        classicList.push({ title: e.title, score: e.score, shiki: e.shikiScore, year: e.year, url: e.url });
      }
    }

    if (e.kind === 'movie' && (isFinished || (e.status === 'watching' && e.watchedEps >= 1))) {
      moviesList.push({ title: e.title, score: e.score, shiki: e.shikiScore, year: e.year, url: e.url });
    }

    if ((e.kind === 'tv' || e.kind === 'ona') && e.watchedEps >= 50) {
      marathonList.push({
        title: e.title,
        eps: e.watchedEps,
        score: e.score,
        status: e.status,
        rewatches: e.rewatches,
        url: e.url
      });
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

  const topWatchedByEps = [...watchedStats.entries]
    .sort((a, b) => b.watchedEps - a.watchedEps || b.score - a.score);

  const formatEpsMeta = (x) => {
    const epsNum = x.watchedEps !== undefined ? x.watchedEps : x.eps;
    const parts = [`${Number(epsNum || 0).toLocaleString('ru-RU')} эп.`];
    if (x.status === 'watching') parts.push('Смотрю');
    else if (x.status === 'rewatching') parts.push('Пересмотр');
    else if (x.rewatches > 0) parts.push(`×${x.rewatches + 1}`);
    if (x.score) parts.push(`${x.score}★`);
    return parts.join(' · ');
  };

  const meanScore = ratedCount ? scoreSum / ratedCount : 7.94;

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
      desc: 'Более 7 500 просмотренных эпизодов по всему списку (включая «Смотрю», онгоинги и пересмотры).',
      current: totalEps, target: 7500, metric: `${totalEps.toLocaleString('ru-RU')} эп. · ~${estDays} дн.`,
      evidence: topWatchedByEps.slice(0, 4).map((x) => ({
        title: x.title,
        meta: formatEpsMeta(x),
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
      desc: 'Пройдено от 50 эпизодов как минимум в 8 масштабных сериалах (включая длинные онгоинги).',
      current: marathonList.length, target: 8, metric: `${marathonList.length} саг по 50+ эп.`,
      evidence: marathonList.slice(0, 4).map((x) => ({
        title: x.title,
        meta: formatEpsMeta(x),
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
        { title: 'Открыть список манги на Shikimori', meta: `${mangaDone} прочит. · ${mangaRead} читаю`, url: `${appState.activeShikiOrigin}/undereror+nyashka/list/manga` }
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
          url: `${appState.activeShikiOrigin}/undereror+nyashka/list/anime`
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

export function renderTrophiesShowcase() {
  const grid = document.getElementById('trophies-grid');
  if (!grid) return;

  const st = appState.trophiesState || buildFallbackTrophiesState();
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
  if (appState.trophyFilter === 'unlocked') visible = unlockedItems;
  else if (appState.trophyFilter === 'platinum') visible = platItems;
  else if (appState.trophyFilter === 'locked') visible = lockedItems;

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
  const isFine = !window.matchMedia || window.matchMedia('(any-hover: hover)').matches;
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

export function initTrophiesShowcase() {
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
    return (appState.trophiesState || buildFallbackTrophiesState()).items || [];
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
            <a class="trophy-ev-row" href="${escapeHtml(ev.url || `${appState.activeShikiOrigin}/undereror+nyashka`)}" target="_blank" rel="noopener noreferrer">
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
      appState.trophyFilter = btn.dataset.tfilter || 'all';
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
