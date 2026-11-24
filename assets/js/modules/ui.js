import {
  SHIKI_NICKNAME,
  SHIKI_ORIGINS,
  VIEW_STORAGE_KEY,
  formatRank,
  escapeHtml,
  sleep,
  fetchWithTimeout
} from './config.js';
import {
  appState,
  SNAPSHOT,
  PEAK_FICTION,
  WAIFU_LIST,
  LITERALLY_ME,
  SNAPSHOT_DNA,
  buildFallbackGalaxyNodes,
  getCombinedRandomizerPool,
  updateRandomizerPoolCounts,
  normalizeShikiUrl,
  setActiveShikiOrigin
} from './data.js';
import {
  fetchShikiWithRetry,
  loadHostAnimeRates,
  loadAnimeCoversBatch
} from './shikimori.js';
import { buildFallbackTrophiesState, renderTrophiesShowcase } from './trophies.js';

/* =========================================
   RENDERING: STATS, HISTORY, GRAPH
   ========================================= */
export function renderStats(anime, manga, lifetimeText) {
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

  appState.liveStatsSnapshot = {
    animeCompleted: completed,
    animeWatching: watching,
    mangaCompleted: mDone,
    mangaReading: mRead
  };
  if (!appState.trophiesState || !appState.trophiesState.isLive) {
    appState.trophiesState = buildFallbackTrophiesState();
    renderTrophiesShowcase();
  }

  const badge = document.getElementById('rank-badge');
  if (badge && completed >= 400) {
    const milestone = Math.floor(completed / 50) * 50;
    badge.textContent = `★ ${milestone}+ ТАЙТЛОВ · АНИМЕ ПСИХ`;
  }
}

export function renderHistory(items, isLive) {
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
    const cachedImg = cacheKey && appState.coverCache[cacheKey] ? appState.coverCache[cacheKey] : '';
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

export function renderActivityGraph(points) {
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
   ANIME-DNA // TASTE X-RAY ENGINE
   ========================================= */
export function computeViewerArchetype(dna) {
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

export function renderAnimeDna(dnaInput) {
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
    if (appState.currentDnaTab === 'studios') {
      rows = dna.studios || [];
    } else if (appState.currentDnaTab === 'eras') {
      rows = dna.eras || [];
    } else {
      rows = dna.genres || [];
    }

    if (!rows.length) {
      barsWrap.innerHTML = `<div style="font-family:var(--font-mono);font-size:10.5px;color:rgba(var(--light),0.55);text-align:center;padding:18px 0;">Подгружаю срез из AniList...</div>`;
    } else {
      const maxVal = Math.max(1, ...rows.map((r) => Number(r.pct) || Number(r.count) || 1));
      barsWrap.innerHTML = rows.slice(0, 5).map((r) => {
        const barPct = appState.currentDnaTab === 'eras'
          ? Math.max(6, Math.min(100, Math.round((Number(r.count) / Math.max(1, ...rows.map((x) => x.count))) * 100)))
          : Math.max(8, Math.min(100, Math.round((Number(r.pct || r.count) / maxVal) * 100)));
        const statText = appState.currentDnaTab === 'eras'
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

export function initDnaControls() {
  const tabs = Array.from(document.querySelectorAll('.dna-tab-btn'));
  tabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      appState.currentDnaTab = btn.dataset.dnaTab || 'genres';
      tabs.forEach((b) => b.classList.toggle('active', b === btn));
      renderAnimeDna(appState.animeDnaState || SNAPSHOT_DNA);
    });
  });
}

export function renderHotTakes(stateInput, loadFailed) {
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

  const st = stateInput || appState.hotTakesState;

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
        if (!ok && !appState.hotTakesState) renderHotTakes(null, true);
      });
    });
    return;
  }

  const limit = appState.hotTakesShowFive ? 5 : 3;
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
    const imgSrc = appState.coverCache[coverKey] || item.shikiImg || '';
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
          img: img ? img.src : (appState.coverCache['anime_' + item.malId] || item.shikiImg || ''),
          url: item.url || `${appState.activeShikiOrigin}/animes/${item.malId}`
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
    toggleBtn.textContent = appState.hotTakesShowFive ? 'Свернуть до топ-3' : 'Показать топ-5';
  }
  if (dlBtn) dlBtn.disabled = false;

  const coverIds = [...gemsSlice, ...overSlice].map((x) => x.malId);
  if (coverIds.length) loadAnimeCoversBatch(coverIds);
}

export function initHotTakesControls() {
  const toggleBtn = document.getElementById('ht-toggle-count-btn');
  const dlBtn = document.getElementById('ht-download-png-btn');

  toggleBtn?.addEventListener('click', () => {
    appState.hotTakesShowFive = !appState.hotTakesShowFive;
    renderHotTakes(appState.hotTakesState, false);
  });

  dlBtn?.addEventListener('click', () => {
    if (!appState.hotTakesState) return;
    const st = appState.hotTakesState;
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

/* =========================================
   WATCHING NOW SHELF RENDER & CONTROLS
   ========================================= */
let updateWatchingNavRef = null;

export function renderWatchingShelf(items) {
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
    const imgSrc = appState.coverCache[coverKey] || item.shikiImg || '';
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
        img: img ? img.src : (appState.coverCache['anime_' + item.malId] || item.shikiImg || ''),
        url: item.url || `${appState.activeShikiOrigin}/animes/${item.malId}`
      });
    });
  });

  if (typeof updateWatchingNavRef === 'function') {
    requestAnimationFrame(updateWatchingNavRef);
  }
}

export function initWatchingControls() {
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
   GLASS SPOTLIGHT (EDGE + SURFACE REVEAL)
   ========================================= */
export function initGlassSpotlight() {
  const isFine = !appState.prefersReducedMotion && window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
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
    if (document.body.classList.contains('galaxy-active') || document.body.classList.contains('is-modal-open')) {
      return;
    }
    const now = performance.now();
    if (!cachedSurfaces.length || now - lastCacheAt > 2500) {
      cachedSurfaces = Array.from(document.querySelectorAll(SELECTOR));
      lastCacheAt = now;
    }

    // Phase 1: Pure READ pass (zero synchronous reflows between writes)
    const vh = window.innerHeight;
    const writes = [];
    for (let i = 0; i < cachedSurfaces.length; i++) {
      const el = cachedSurfaces[i];
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0 || rect.bottom < -PROXIMITY || rect.top > vh + PROXIMITY) {
        if (el.dataset.spotOn === '1') {
          writes.push({ el, active: false, x: 0, y: 0 });
        }
        continue;
      }
      const withinX = lastX >= rect.left - PROXIMITY && lastX <= rect.right + PROXIMITY;
      const withinY = lastY >= rect.top - PROXIMITY && lastY <= rect.bottom + PROXIMITY;
      if (withinX && withinY) {
        writes.push({ el, active: true, x: lastX - rect.left, y: lastY - rect.top });
      } else if (el.dataset.spotOn === '1') {
        writes.push({ el, active: false, x: 0, y: 0 });
      }
    }

    // Phase 2: Pure WRITE pass
    for (let i = 0; i < writes.length; i++) {
      const w = writes[i];
      if (w.active) {
        w.el.style.setProperty('--spot-x', w.x.toFixed(1) + 'px');
        w.el.style.setProperty('--spot-y', w.y.toFixed(1) + 'px');
        if (w.el.dataset.spotOn !== '1') {
          w.el.dataset.spotOn = '1';
          w.el.style.setProperty('--spot-o', '1');
        }
      } else {
        w.el.dataset.spotOn = '0';
        w.el.style.setProperty('--spot-o', '0');
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
    for (let i = 0; i < cachedSurfaces.length; i++) {
      const el = cachedSurfaces[i];
      if (el.dataset.spotOn === '1') {
        el.dataset.spotOn = '0';
        el.style.setProperty('--spot-o', '0');
      }
    }
  }, { passive: true });
}

/* =========================================
   RENDERING: WAIFU CAROUSEL + ARROWS + COUNTER
   ========================================= */
export function renderWaifu() {
  const wrap = document.getElementById('waifu-carousel');
  if (!wrap) return;

  wrap.innerHTML = WAIFU_LIST.map((ch) => {
    const coverKey = 'char_' + ch.key;
    const imgSrc = appState.coverCache[coverKey] || ch.shikiImg || '';
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

export function initWaifuControls() {
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
export function renderCollection() {
  const grid = document.getElementById('collection-grid');
  const sortGroup = document.getElementById('sort-controls');
  if (!grid) return;

  const q = appState.searchQuery.trim().toLowerCase();
  grid.classList.toggle('is-showcase', appState.currentView === 'showcase');

  if (sortGroup) {
    sortGroup.style.display = appState.currentTab === 'peak' ? 'flex' : 'none';
  }

  if (appState.currentTab === 'peak') {
    let items = PEAK_FICTION.filter((a) => !q || a.title.toLowerCase().includes(q));
    if (appState.currentSort === 'score') {
      items = [...items].sort((a, b) => b.score - a.score || a.rank - b.rank);
    } else if (appState.currentSort === 'year') {
      items = [...items].sort((a, b) => b.year - a.year || a.rank - b.rank);
    } else {
      items = [...items].sort((a, b) => a.rank - b.rank);
    }

    grid.innerHTML = items.map((a, idx) => {
      const coverKey = 'anime_' + a.malId;
      const imgSrc = appState.coverCache[coverKey] || '';
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
      const imgSrc = appState.coverCache[coverKey] || '';
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

export function attachImageHandlers(root) {
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

export function applyCoverToDOM(coverKey, url) {
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

export function attachCardInteractions(grid) {
  const canHoverTilt = !window.matchMedia || window.matchMedia('(any-hover: hover)').matches;

  grid.querySelectorAll('.catalog-card').forEach((card) => {
    if (canHoverTilt) {
      let raf = null;
      let lx = 0, ly = 0;

      card.addEventListener('pointerenter', (e) => {
        if (e.pointerType === 'touch') return;
        card.classList.add('is-tilting');
      });

      card.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'touch') return;
        if (!card.classList.contains('is-tilting')) card.classList.add('is-tilting');
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
          const maxTilt = appState.currentView === 'showcase' ? 6 : 12;
          card.style.setProperty('--lift', '-7px');
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
export function openModal(data) {
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
  linkEl.href = data.url || `${appState.activeShikiOrigin}/undereror+nyashka`;

  modalBackdrop.classList.add('is-open');
  modalBackdrop.setAttribute('aria-hidden', 'false');
}

export function closeModal() {
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
   3D HOLOGRAPHIC COLLECTIBLE CARDS ENGINE
   ========================================= */
let holoDeckType = 'peak';
let holoDeckIdx = 0;
let holoIsFlipped = false;

export function getHoloRarity(rank) {
  if (rank <= 3) return { key: 'mythic', label: '★ MYTHIC', short: 'MYTHIC' };
  if (rank <= 10) return { key: 'ssr', label: '◈ SSR', short: 'SSR' };
  return { key: 'sr', label: '◇ SR', short: 'SR' };
}

export function buildHoloDeckItems(type) {
  if (type === 'galaxy') {
    const src = appState.holoGalaxyList.length ? appState.holoGalaxyList : (appState.galaxyNodes.length ? appState.galaxyNodes : buildFallbackGalaxyNodes());
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
        img: appState.coverCache['anime_' + g.id] || g.img || '',
        url: g.url || `${appState.activeShikiOrigin}/animes/${g.id}`
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
      img: appState.coverCache['char_' + w.key] || w.shikiImg || '',
      url: w.url || `${appState.activeShikiOrigin}/undereror+nyashka/favorites`
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
      img: appState.coverCache['char_' + c.key] || '',
      url: `${appState.activeShikiOrigin}/characters?search=${encodeURIComponent(c.search)}`
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
    img: appState.coverCache['anime_' + a.malId] || '',
    url: `${appState.activeShikiOrigin}/animes/${a.malId}`
  }));
}

export function renderCurrentHoloCard() {
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
    if (item.malId && !appState.coverCache['anime_' + item.malId]) {
      loadAnimeCoversBatch([item.malId]).then(() => {
        const hd = appState.coverCache['anime_' + item.malId];
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

export function openHoloDeck(type, idx) {
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

export function initHoloCardViewer() {
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
    if (e.target && e.target.closest('a, button')) return;
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

  linkEl?.addEventListener('pointerdown', (e) => e.stopPropagation());
  linkEl?.addEventListener('pointerup', (e) => e.stopPropagation());
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
   MOBILE BOTTOM DOCK CONTROLLER
   ========================================= */
export function initMobileTikTokDock() {
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
   EVENT BINDINGS & BOOTSTRAP
   ========================================= */
export function initCollectionControls() {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      appState.currentTab = btn.dataset.tab;
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
      appState.currentSort = btn.dataset.sort;
      document.querySelectorAll('.sort-btn').forEach((b) => b.classList.toggle('active', b === btn));
      renderCollection();
    });
  });

  const viewBtns = Array.from(document.querySelectorAll('.view-toggle-btn'));
  function syncViewButtons() {
    viewBtns.forEach((b) => {
      const on = b.dataset.cview === appState.currentView;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', String(on));
    });
  }
  viewBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = btn.dataset.cview === 'showcase' ? 'showcase' : 'grid';
      if (next === appState.currentView) return;
      appState.currentView = next;
      try { localStorage.setItem(VIEW_STORAGE_KEY, appState.currentView); } catch (e) {}
      syncViewButtons();
      renderCollection();
    });
  });
  syncViewButtons();

  const searchInput = document.getElementById('collection-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      appState.searchQuery = e.target.value || '';
      renderCollection();
    });
  }
}

/* =========================================
   INTRO OVERLAY ([ CLICK TO ENTER ])
   ========================================= */
export function initIntroOverlay(player) {
  const overlay = document.getElementById('intro-overlay');
  const enterBtn = document.getElementById('intro-enter-btn');
  const muteBtn = document.getElementById('intro-mute-btn');
  if (!overlay) return;

  let entered = false;
  function onIntroKeydown(e) {
    if (entered) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      dismiss(true);
    } else if (e.key === 'Escape') {
      dismiss(false);
    }
  }

  function dismiss(withSound) {
    if (entered) return;
    entered = true;
    window.removeEventListener('keydown', onIntroKeydown);
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

  window.addEventListener('keydown', onIntroKeydown);
}

/* =========================================
   TASTE MATCH («ПРОВЕРКА НА БАЗУ» + PNG VERDICT CARD)
   ========================================= */
export function initTasteMatcher() {
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

  if (readyBadge && appState.myRatesIndex.size > 0) {
    readyBadge.textContent = `БАЗА ГОТОВА · ${appState.myRatesIndex.size} ТАЙТЛОВ`;
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
    const origins = [appState.activeShikiOrigin, ...SHIKI_ORIGINS.filter((o) => o !== appState.activeShikiOrigin)];
    let lastStatus = 0;
    for (const origin of origins) {
      try {
        const res = await fetchWithTimeout(`${origin}/api/users/${encodeURIComponent(nickname)}?is_nickname=1`, {
          headers: { 'Accept': 'application/json' }
        }, 9000);
        lastStatus = res.status;
        if (res.ok) {
          const data = await res.json();
          if (data && data.id) {
            setActiveShikiOrigin(origin);
            return { user: data, origin };
          }
        }
        if (res.status === 404) return { user: null, status: 404 };
      } catch (e) {}
    }
    return { user: null, status: lastStatus };
  }

  async function fetchShikiUserRates(userId, origin) {
    const base = origin || appState.activeShikiOrigin;
    const res = await fetchShikiWithRetry(`${base}/api/users/${userId}/anime_rates?limit=1000`, {
      retries: 3,
      baseDelay: 750
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return Array.isArray(res.data) ? res.data : [];
  }

  async function ensureHostRatesReady() {
    if (appState.myRatesIndex.size >= 30) return appState.myRatesIndex;
    setStatus('Подгружаю базу undereror nyashka...', 'loading');
    await loadHostAnimeRates();
    return appState.myRatesIndex;
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
    const imgSrc = appState.coverCache['anime_' + item.id] || item.img || '';
    const diffBadge = isConflict
      ? `<span class="score-tag is-diff">Δ ${item.diff}</span>`
      : '';
    return `
      <a class="base-anime-row" href="${appState.activeShikiOrigin}/animes/${item.id}" target="_blank" rel="noopener noreferrer">
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
    appState.lastMatchVerdict = v;
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
    if (!appState.lastMatchVerdict) return;
    const v = appState.lastMatchVerdict;
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
      if (appState.myRatesIndex.size === 0) {
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

      setStatus(`Загружаю список «${guestNick}» и сверяю с ${appState.myRatesIndex.size} тайтлами...`, 'loading');
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

        const mine = appState.myRatesIndex.get(id);
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
      // Handled cleanly via status banner below
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
    if (!appState.lastMatchVerdict) return;
    const v = appState.lastMatchVerdict;
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
    const guestNick = appState.lastMatchVerdict?.guestNick || input.value || '';
    if (typeof appState.coopOpenWithGuestHook === 'function') {
      appState.coopOpenWithGuestHook(guestNick);
    }
  });

  resetBtn?.addEventListener('click', () => {
    input.value = '';
    input.focus();
    setStatus('', '');
  });
}

/* =========================================
   1v1 TOURNAMENT ARENA («КТО ЛУЧШИЙ ИЗ МОЕГО ТОПА?»)
   ========================================= */
export function initTournamentArena() {
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
        img: appState.coverCache['char_' + w.key] || w.shikiImg || '',
        url: w.url || `${appState.activeShikiOrigin}/undereror+nyashka/favorites`
      }));
    }
    if (cat === 'literally') {
      return LITERALLY_ME.map((c) => ({
        id: c.key,
        rank: c.rank,
        name: c.name,
        sub: c.anime,
        img: appState.coverCache['char_' + c.key] || '',
        url: `${appState.activeShikiOrigin}/characters?search=${encodeURIComponent(c.search)}`
      }));
    }
    return PEAK_FICTION.map((a) => ({
      id: String(a.malId),
      rank: a.rank,
      name: a.title,
      sub: `${a.kind} · ${a.year} · ★ ${a.score.toFixed(2)}`,
      img: appState.coverCache['anime_' + a.malId] || '',
      url: `${appState.activeShikiOrigin}/animes/${a.malId}`
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
    if (champLink) champLink.href = winner.url || `${appState.activeShikiOrigin}/undereror+nyashka`;

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
  collLaunchBtn?.addEventListener('click', () => openArena(appState.currentTab === 'literally' ? 'literally' : 'peak'));
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
export function initRandomizer() {
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
    if (appState.randomizerMode === 'peak') {
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
    modeBtns.forEach((b) => b.classList.toggle('active', b.dataset.pmode === appState.randomizerMode));
    if (brandSub) {
      brandSub.textContent = appState.randomizerMode === 'peak'
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
    const cached = appState.coverCache['anime_' + a.malId] || a.shikiImg || '';
    if (cached) {
      const img = new Image();
      img.src = cached;
    }
    if (a.malId && !appState.coverCache['anime_' + a.malId]) {
      loadAnimeCoversBatch([a.malId]).then(() => {
        const hd = appState.coverCache['anime_' + a.malId];
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

    if (appState.randomizerMode === 'all' && appState.ratedAnimePool.length === 0) {
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
    const imgUrl = appState.coverCache['anime_' + a.malId] || a.shikiImg || '';
    const serialStr = isPeak ? `NO.${formatRank(a.rank)} / 16` : `DROP #${formatRank(dropEntry.num)}`;
    const shikiHref = a.url || `${appState.activeShikiOrigin}/animes/${a.malId}`;

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
      const img = appState.coverCache['anime_' + entry.anime.malId] || entry.anime.shikiImg || '';
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
    if (appState.randomizerMode === 'all' && appState.ratedAnimePool.length === 0) {
      if (syncBadge) syncBadge.textContent = 'SYNC...';
      await Promise.race([loadHostAnimeRates(), sleep(2600)]);
      if (myToken !== ripSeqToken || !backdrop.classList.contains('is-open')) return;
      updateRandomizerPoolCounts();
      if (appState.ratedAnimePool.length > 0) {
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
    if (e.target && e.target.closest('a, button')) return;
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

  cardLink?.addEventListener('pointerdown', (e) => e.stopPropagation());
  cardLink?.addEventListener('pointerup', (e) => e.stopPropagation());
  cardLink?.addEventListener('click', (e) => e.stopPropagation());

  // Pool mode switcher
  modeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (packState === 'ripping') return;
      const nextMode = btn.dataset.pmode || 'all';
      if (nextMode === appState.randomizerMode && packState === 'sealed') return;
      appState.randomizerMode = nextMode;
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
   UNIFIED MODAL SCROLL LOCK (ZERO LAYOUT SHIFT)
   ========================================= */
export function initModalScrollLock() {
  const modalIds = [
    'detail-modal',
    'arena-modal',
    'coop-modal',
    'trophy-modal',
    'holo-modal',
    'pack-modal',
    'spotify-drawer'
  ];
  const modalEls = modalIds.map((id) => document.getElementById(id)).filter(Boolean);
  let isLocked = false;

  function syncModalScrollLock() {
    let anyOpen = document.body.classList.contains('galaxy-active');
    if (!anyOpen) {
      for (let i = 0; i < modalEls.length; i++) {
        if (modalEls[i].classList.contains('is-open')) {
          anyOpen = true;
          break;
        }
      }
    }

    if (anyOpen === isLocked) return;
    isLocked = anyOpen;

    if (anyOpen) {
      const sbWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
      document.documentElement.style.setProperty('--scrollbar-comp', sbWidth + 'px');
      document.body.classList.add('is-modal-open');
    } else {
      document.body.classList.remove('is-modal-open');
      document.documentElement.style.setProperty('--scrollbar-comp', '0px');
    }
  }

  if (typeof MutationObserver !== 'undefined') {
    const mo = new MutationObserver(syncModalScrollLock);
    mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    modalEls.forEach((el) => mo.observe(el, { attributes: true, attributeFilter: ['class'] }));
  }
  syncModalScrollLock();
}
