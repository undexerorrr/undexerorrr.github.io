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
import { initTrophiesShowcase } from './modules/trophies.js';
import { initGuestbook } from './modules/guestbook.js';
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

initModalScrollLock();
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
renderAnimeDna(appState.animeDnaState || SNAPSHOT_DNA);
initHotTakesControls();
renderHotTakes(appState.hotTakesState, false);
initTrophiesShowcase();
renderHistory(SNAPSHOT.history, false);
renderActivityGraph(SNAPSHOT.activity);
renderWatchingShelf(appState.watchingList.length ? appState.watchingList : SNAPSHOT.watching);
initWatchingControls();
initGlassSpotlight();
renderWaifu();
initWaifuControls();
renderCollection();
initGuestbook();

syncShikimoriLive();
loadAnimeCoversBatch([
  ...PEAK_FICTION.map((a) => a.malId),
  ...SNAPSHOT.history.map((h) => h.id),
  ...(appState.watchingList.length ? appState.watchingList : SNAPSHOT.watching).map((w) => w.malId)
]);
loadCharacterCoversBatch([...WAIFU_LIST, ...LITERALLY_ME]);
