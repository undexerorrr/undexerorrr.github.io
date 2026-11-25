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
import { bootstrapShikimoriSync } from './modules/shikimori.js';
import { initArchiveGalaxy } from './modules/galaxy.js';
import { initCoopPicker } from './modules/coop.js';
import { initCinemaMode } from './modules/cinema.js';
import { initTrophiesShowcase } from './modules/trophies.js';
import { initGuestbook } from './modules/guestbook.js';
import { initVinylShelf } from './modules/vinyl.js';
import { initCommandPalette } from './modules/palette.js';
import { initSectors } from './modules/sectors.js';
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
safeInit('initSectors', () => initSectors());
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

safeInit('renderStats', () => renderStats(SNAPSHOT.anime, SNAPSHOT.manga, SNAPSHOT.lifetimeText));
safeInit('initDnaControls', () => initDnaControls());
safeInit('renderAnimeDna', () => renderAnimeDna(appState.animeDnaState || SNAPSHOT_DNA));
safeInit('initHotTakesControls', () => initHotTakesControls());
safeInit('renderHotTakes', () => renderHotTakes(appState.hotTakesState, false));
safeInit('initTrophiesShowcase', () => initTrophiesShowcase());
safeInit('renderHistory', () => renderHistory(SNAPSHOT.history, false));
safeInit('renderActivityGraph', () => renderActivityGraph(SNAPSHOT.activity));
safeInit('renderWatchingShelf', () => renderWatchingShelf(appState.watchingList.length ? appState.watchingList : SNAPSHOT.watching));
safeInit('initWatchingControls', () => initWatchingControls());
safeInit('initGlassSpotlight', () => initGlassSpotlight());
safeInit('renderWaifu', () => renderWaifu());
safeInit('initWaifuControls', () => initWaifuControls());
safeInit('renderCollection', () => renderCollection());
safeInit('vinyl', () => initVinylShelf(playerControls));
safeInit('initGuestbook', () => initGuestbook());

bootstrapShikimoriSync(
  PEAK_FICTION.map((a) => a.malId),
  [...WAIFU_LIST, ...LITERALLY_ME]
).catch((err) => {
  appState.initErrors.push({
    name: 'bootstrapShikimoriSync',
    message: String(err?.message || err)
  });
});
