// @ts-check
/**
 * Punto de entrada de la app (UI). Orquestador: importa los módulos de
 * src/ui/*.js, expone en `window.*` lo que los `onclick=""` del HTML todavía
 * necesitan, y arranca todo en `init()` (tras DOMContentLoaded).
 *
 * Selección de producto / tipo de conexión / modo de modificadores →
 * src/ui/product.js. Todo lo demás vive en su módulo (cards, connection,
 * actions, drawer, dom, state).
 *
 * Requiere servir por http(s): con file:// fallan los import.
 */

import * as Protocol from './protocol.js';
import * as Transport from './transport.js';
import * as ProductData from './products.js';
import { isIOS, isMacOS } from './ui/platform.js';
import { addLog, clearLog, closeModal, closeBd, openModal } from './ui/dom.js';
import { openDrawer, closeDrawer, toggleDrawer } from './ui/drawer.js';
import {
  buildGrid,
  onType,
  onMode,
  syncTapHoldUI,
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
  saveConfig,
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
import { selectProd, selectConnType, selectOsMode, confirmToggleOsMode } from './ui/product.js';

// Módulos de lógica: se exponen en window.* para el código que todavía los usa así.
const w = /** @type {any} */ (window);
w.Protocol = Protocol;
w.Transport = Transport;
// PRODUCTS, LATEST_FW, TIP_CONTENT, DEV_* como globales sueltos.
Object.assign(window, ProductData);

// connection.js llama a estos módulos vía `connectionHooks` (evita ciclos de import).
connectionHooks.applyDevCfgToCards = applyDevCfgToCards;
connectionHooks.selectProd = selectProd;
connectionHooks.onArrowMode = onArrowMode;
connectionHooks.syncTapHoldUI = syncTapHoldUI;

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
  setSections(false);
  onArrowMode();

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

  // Limpieza única: las cuentas se quitaron (08/10/2026). Borra del navegador la sesión
  // vieja de Supabase (tokens), que ya no sirve para nada.
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('sb-lhpewyblvjijpmcxzcod-'))
      .forEach((k) => localStorage.removeItem(k));
  } catch (_) {
    /* localStorage no disponible */
  }

  // Escape cierra el drawer.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDrawer();
  });

}

// ── Puente para los `onclick=""` del HTML ────────────────────────────────────
// Transicional: cada módulo irá pasando a addEventListener y esta lista se achica.
Object.assign(window, {
  applyArrows,
  applyBtn,
  applyDishubCenter,
  captureFromInput,
  clearLog,
  closeBd,
  closeDrawer,
  closeModal,
  confirmToggleOsMode,
  onArrowMode,
  onDishubCenterMode,
  onMode,
  onType,
  openConnModal,
  openDrawer,
  openModal,
  pingDevice,
  saveConfig,
  selectConnType,
  selectProd,
  sendLogCmd,
  setCapturedKey,
  startCap,
  stopCap,
  toggleAdv,
  toggleConn,
  toggleDrawer,
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
