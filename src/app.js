// @ts-check
/**
 * Punto de entrada de la app (UI). Orquestador: importa los módulos de
 * src/ui/*.js, expone en `window.*` lo que los `onclick=""` del HTML todavía
 * necesitan, y arranca todo en `init()` (tras DOMContentLoaded).
 *
 * Selección de producto / tipo de conexión / modo de modificadores →
 * src/ui/product.js. Todo lo demás vive en su módulo (cards, connection,
 * actions, presets, auth, tour, drawer, dom, state).
 *
 * Requiere servir por http(s): con file:// fallan los import.
 */

import * as Protocol from './protocol.js';
import * as Transport from './transport.js';
import * as Csv from './csv.js';
import * as PresetsStore from './presets-store.js';
import * as ProductData from './products.js';
import { isIOS, isMacOS } from './ui/platform.js';
import { addLog, clearLog, closeModal, closeBd, openModal } from './ui/dom.js';
import { S } from './ui/state.js';
import { openDrawer, closeDrawer, toggleDrawer } from './ui/drawer.js';
import {
  showWelcome,
  startTour,
  skipTour,
  neverShowTour,
  restartTour,
  nextStep,
  prevStep,
} from './ui/tour.js';
import { supa } from './supabase-client.js';
import {
  updateAuthBtn,
  openAuthModal,
  renderAuthModal,
  signInWithPassword,
  signUpWithPassword,
  signInWithGoogle,
  sendResetLink,
  signOut,
} from './ui/auth.js';
import {
  buildGrid,
  onType,
  toggleAdv,
  setCapturedKey,
  captureFromInput,
  startCap,
  stopCap,
} from './ui/cards.js';
import {
  connectionHooks,
  setSections,
  toggleConn,
  openConnModal,
  sendLogCmd,
  getAllConfig,
  saveConfig,
  resetDevice,
  pingDevice,
} from './ui/connection.js';
import {
  applyBtn,
  applyArrows,
  onArrowMode,
  onDishubCenterMode,
  applyDishubCenter,
  applyDevCfgToCards,
} from './ui/actions.js';
import {
  renderCustom,
  renderPresetTabs,
  buildFactoryPresets,
  handleLoginSync,
  loadSharedPresets,
  openPresetsModal,
  importChoice,
  downloadCSV,
  importCSV,
  shareWithUser,
  shareWithCommunity,
  confirmSave,
  confirmEditPreset,
  openSaveModal,
  openEditPreset,
  openShareModal,
  saveSharedAsOwn,
  applyCustom,
  delCustom,
  delShared,
  _PR,
} from './ui/presets.js';
import { selectProd, selectConnType, selectOsMode, confirmToggleOsMode } from './ui/product.js';

// Módulos de lógica: se exponen en window.* para el código que todavía los usa así.
const w = /** @type {any} */ (window);
w.Protocol = Protocol;
w.Transport = Transport;
w.Csv = Csv;
w.PresetsStore = PresetsStore;
// PRODUCTS, PRESET_TABS, LATEST_FW, FACTORY_CMDS/CARDS, TIP_CONTENT, DEV_* como globales sueltos.
Object.assign(window, ProductData);

// connection.js llama a estos módulos vía `connectionHooks` (evita ciclos de import).
connectionHooks.renderPresetTabs = renderPresetTabs;
connectionHooks.applyDevCfgToCards = applyDevCfgToCards;
connectionHooks.selectProd = selectProd;
connectionHooks.onArrowMode = onArrowMode;

// ── INIT ─────────────────────────────────────────────────
function init() {
  // Mover topbar y status-bar al inicio del app-shell (están antes en el DOM por
  // limitaciones del HTML estático).
  const shell = document.getElementById('appShell');
  const topbar = document.getElementById('topbar');
  const statusBar = document.getElementById('statusBar');
  if (shell && topbar) shell.insertBefore(topbar, shell.firstChild);
  if (shell && statusBar) shell.insertBefore(statusBar, shell.children[1] || null);

  const def = ProductData.PRODUCTS['dismouse'];
  buildGrid('mainGrid', def.mainBtns);
  buildGrid('arrowGrid', def.arrowBtns);
  buildFactoryPresets(def.presets);
  setSections(false);
  onArrowMode();
  renderCustom();

  let savedOsMode = null;
  try {
    savedOsMode = localStorage.getItem('displus_os_mode');
  } catch (_) {
    /* localStorage no disponible */
  }
  selectOsMode(savedOsMode || (isMacOS() ? 'mac' : 'win'));
  addLog('Configurador dis+ R014. Firmware R009 compatible.');

  // Bloquear BLE en iOS — Web Bluetooth no disponible en ningún browser iOS.
  if (isIOS()) {
    const ctBle = document.getElementById('ct-ble');
    if (ctBle) {
      ctBle.classList.add('ct-disabled');
      ctBle.title = 'No disponible en iOS/iPadOS';
      const sub = ctBle.querySelector('.ct-sub');
      if (sub) sub.textContent = 'No disponible';
    }
    const iosBlock = document.getElementById('iosBlock');
    if (iosBlock) iosBlock.style.display = '';
    addLog('iOS/iPadOS detectado — opción BLE deshabilitada.', 'w');
  }
  setTimeout(showWelcome, 800);

  // Escape cierra el drawer.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDrawer();
  });

  // Supabase: una sola suscripción (onAuthStateChange incluye INITIAL_SESSION en v2).
  supa.auth.onAuthStateChange((event, session) => {
    const prevUser = S.currentUser;
    S.currentUser = session?.user ?? null;
    updateAuthBtn();

    if (event === 'SIGNED_OUT') {
      PresetsStore.clearLocal();
      renderCustom();
      const shared = document.getElementById('sectionShared');
      const community = document.getElementById('sectionCommunity');
      if (shared) shared.style.display = 'none';
      if (community) community.style.display = 'none';
    } else if (
      (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') &&
      S.currentUser &&
      !prevUser
    ) {
      handleLoginSync();
      loadSharedPresets();
    }
  });
}

// ── Puente para los `onclick=""` del HTML ────────────────────────────────────
// Transicional: cada módulo irá pasando a addEventListener y esta lista se achica.
Object.assign(window, {
  applyArrows,
  applyBtn,
  applyCustom,
  applyDishubCenter,
  captureFromInput,
  clearLog,
  closeBd,
  closeDrawer,
  closeModal,
  confirmEditPreset,
  confirmSave,
  confirmToggleOsMode,
  delCustom,
  delShared,
  downloadCSV,
  getAllConfig,
  importCSV,
  importChoice,
  neverShowTour,
  nextStep,
  onArrowMode,
  onDishubCenterMode,
  onType,
  openAuthModal,
  openConnModal,
  openDrawer,
  openEditPreset,
  openModal,
  openPresetsModal,
  openSaveModal,
  openShareModal,
  pingDevice,
  prevStep,
  renderAuthModal,
  resetDevice,
  restartTour,
  saveConfig,
  saveSharedAsOwn,
  selectConnType,
  selectProd,
  sendLogCmd,
  sendResetLink,
  setCapturedKey,
  shareWithCommunity,
  shareWithUser,
  signInWithGoogle,
  signInWithPassword,
  signOut,
  signUpWithPassword,
  skipTour,
  startCap,
  startTour,
  stopCap,
  toggleAdv,
  toggleConn,
  toggleDrawer,
  _PR,
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
