import {
  appState,
  SNAPSHOT,
  PEAK_FICTION,
  WAIFU_LIST,
  LITERALLY_ME,
  SNAPSHOT_DNA
} from './modules/data.js';
import { initMusicPlayer, initSpotifyDrawer, initLanyardPresence } from './modules/music.js';
import { initAtmosphereCanvas, initLiveWeather } from './modules/weather.js';
import { syncShikimoriLive, loadAnimeCoversBatch, loadCharacterCoversBatch } from './modules/shikimori.js';
import { initArchiveGalaxy } from './modules/galaxy.js';
import { initCoopPicker } from './modules/coop.js';
import { initCinemaMode } from './modules/cinema.js';
import { initTrophiesShowcase } from './modules/trophies.js';
import { initGuestbook } from './modules/guestbook.js';
import { initCommandPalette } from './modules/palette.js';
import {
  initModalScrollLock,
  initIntroOverlay,
  initTasteMatcher,
  initRandomizer,
  initTournamentArena,
  initHoloCardViewer,
  initMobileTikTokDock,
  initCollectionControls,
  renderStats,
  initDnaControls,
  renderAnimeDna,
  initHotTakesControls,
  renderHotTakes,
  renderHistory,
  renderActivityGraph,
  renderWatchingShelf,
  initWatchingControls,
  initGlassSpotlight,
  renderWaifu,
  initWaifuControls,
  renderCollection
} from './modules/ui.js';

function safeInit(name, fn) {
  try {
    return fn();
  } catch (err) {
    appState.initErrors.push({
      name,
      message: err && typeof err.message === 'string' ? err.message : String(err)
    });
    return undefined;
  }
}

safeInit('initModalScrollLock', () => initModalScrollLock());
const playerControls = safeInit('initMusicPlayer', () => initMusicPlayer());
safeInit('initIntroOverlay', () => initIntroOverlay(playerControls));
safeInit('initSpotifyDrawer', () => initSpotifyDrawer(playerControls));
safeInit('initLanyardPresence', () => initLanyardPresence());
safeInit('initTasteMatcher', () => initTasteMatcher());
safeInit('initCoopPicker', () => initCoopPicker());
safeInit('initRandomizer', () => initRandomizer());
safeInit('initTournamentArena', () => initTournamentArena());
safeInit('initHoloCardViewer', () => initHoloCardViewer());
safeInit('initMobileTikTokDock', () => initMobileTikTokDock());
safeInit('initArchiveGalaxy', () => initArchiveGalaxy(playerControls));
safeInit('initAtmosphereCanvas', () => initAtmosphereCanvas());
safeInit('initLiveWeather', () => initLiveWeather());
safeInit('initCinemaMode', () => initCinemaMode(playerControls));
safeInit('initCommandPalette', () => initCommandPalette(playerControls));
safeInit('initCollectionControls', () => initCollectionControls());

renderStats(SNAPSHOT.anime, SNAPSHOT.manga, SNAPSHOT.lifetimeText);
safeInit('initDnaControls', () => initDnaControls());
renderAnimeDna(appState.animeDnaState || SNAPSHOT_DNA);
safeInit('initHotTakesControls', () => initHotTakesControls());
renderHotTakes(appState.hotTakesState, false);
safeInit('initTrophiesShowcase', () => initTrophiesShowcase());
renderHistory(SNAPSHOT.history, false);
renderActivityGraph(SNAPSHOT.activity);
renderWatchingShelf(appState.watchingList.length ? appState.watchingList : SNAPSHOT.watching);
safeInit('initWatchingControls', () => initWatchingControls());
safeInit('initGlassSpotlight', () => initGlassSpotlight());
renderWaifu();
safeInit('initWaifuControls', () => initWaifuControls());
renderCollection();
safeInit('initGuestbook', () => initGuestbook());

syncShikimoriLive();
loadAnimeCoversBatch([
  ...PEAK_FICTION.map((a) => a.malId),
  ...SNAPSHOT.history.map((h) => h.id),
  ...(appState.watchingList.length ? appState.watchingList : SNAPSHOT.watching).map((w) => w.malId)
]);
loadCharacterCoversBatch([...WAIFU_LIST, ...LITERALLY_ME]);
