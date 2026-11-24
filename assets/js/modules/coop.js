import { SHIKI_NICKNAME, SHIKI_ORIGINS, SHIKI_KIND_LABELS, escapeHtml, sleep } from './config.js';
import { appState, normalizeShikiUrl } from './data.js';
import {
  fetchShikiWithRetry,
  resolveHostUser,
  loadHostAnimeRates,
  loadAnimeCoversBatch
} from './shikimori.js';
import { attachImageHandlers } from './ui.js';

/* =========================================
   CO-OP EVENING PICKER + SWIPE ARENA + TICKET PNG
   ========================================= */
export function initCoopPicker() {
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
      if (appState.hostFullRates.length < 20) {
        await loadHostAnimeRates(u);
      }
      if (appState.hostFullRates.length > 0) {
        const av = (u && (u.image?.x160 || u.image?.x148 || u.avatar))
          ? normalizeShikiUrl(u.image?.x160 || u.image?.x148 || u.avatar, appState.activeShikiOrigin)
          : 'https://shikimori.one/system/users/x160/1308586.png';
        return {
          nick: (u && u.nickname) || SHIKI_NICKNAME,
          avatar: av,
          rates: appState.hostFullRates
        };
      }
    }

    // Generic Shikimori user fetch with retry
    const origins = [appState.activeShikiOrigin, ...SHIKI_ORIGINS.filter((o) => o !== appState.activeShikiOrigin)];
    let user = null;
    let originUsed = appState.activeShikiOrigin;
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
        appState.activeShikiOrigin = origin;
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
        url: meta.url || `${appState.activeShikiOrigin}/animes/${id}`
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
      const imgSrc = appState.coverCache[coverKey] || item.img || '';
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
      const src = appState.coverCache['anime_' + item.id] || item.img || '';
      swipeImg.src = src;
      swipeImg.alt = item.title;
      if (!appState.coverCache['anime_' + item.id]) {
        loadAnimeCoversBatch([item.id]).then(() => {
          const hd = appState.coverCache['anime_' + item.id];
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
    if (ticketLink) ticketLink.href = item.url || `${appState.activeShikiOrigin}/animes/${item.id}`;

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
      const src = appState.coverCache['anime_' + item.id] || item.img || '';
      ticketImg.src = src;
      ticketImg.alt = item.title;
      if (!appState.coverCache['anime_' + item.id]) {
        loadAnimeCoversBatch([item.id]).then(() => {
          const hd = appState.coverCache['anime_' + item.id];
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
  appState.coopOpenWithGuestHook = (guestNick) => {
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
