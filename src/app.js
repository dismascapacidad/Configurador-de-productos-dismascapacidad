// @ts-nocheck
/* eslint-disable */
/**
 * Punto de entrada de la app (UI). TRANSICIONAL: es el <script> clásico que
 * vivía en index.html, movido tal cual a un módulo. Se irá partiendo en
 * src/ui/*.js (cada uno con @ts-check y lint). Por eso acá van desactivados.
 *
 * Requiere servir por http(s): con file:// fallan los import.
 */

import * as Protocol from './protocol.js';
import * as Transport from './transport.js';
import * as Csv from './csv.js';
import * as PresetsStore from './presets-store.js';
import * as ProductData from './products.js';
import { isIOS, isMacOS, isTouchDevice } from './ui/platform.js';
import { toast, addLog, clearLog, esc, closeModal, closeBd } from './ui/dom.js';
import { S } from './ui/state.js';
import { openDrawer, closeDrawer, toggleDrawer } from './ui/drawer.js';
import { showWelcome, startTour, skipTour, neverShowTour, restartTour, nextStep, prevStep } from './ui/tour.js';
import { supa } from './supabase-client.js';
import {
  updateAuthBtn, openAuthModal, renderAuthModal, signInWithPassword,
  signUpWithPassword, signInWithGoogle, sendResetLink, signOut,
} from './ui/auth.js';
import {
  buildGrid, buildDishubGrid, updateSummary, onType, toggleAdv,
  setCapturedKey, captureFromInput, startCap, stopCap,
} from './ui/cards.js';
import {
  connectionHooks, mkCfg, setSections, send, toggleConn, openConnModal,
  sendLogCmd, getAllConfig, enableConnModalSteps,
} from './ui/connection.js';
import {
  applyBtn, applyArrows, onArrowMode, onDishubCenterMode, applyDishubCenter,
  renderCfgModal, applyDevCfgToCards,
} from './ui/actions.js';
import {
  renderCustom, renderPresetTabs, buildFactoryPresets, handleLoginSync, loadSharedPresets,
  tabForProd, importChoice, downloadCSV, importCSV, shareWithUser, shareWithCommunity,
  confirmSave, confirmEditPreset, openSaveModal, openEditPreset, openShareModal,
  saveSharedAsOwn, applyCustom, delCustom, delShared, _PR,
} from './ui/presets.js';

// Módulos de lógica: se exponen en window.* para el código que todavía los usa así.
window.Protocol = Protocol;
window.Transport = Transport;
window.Csv = Csv;
window.PresetsStore = PresetsStore;
// PRODUCTS, PRESET_TABS, LATEST_FW, FACTORY_CMDS/CARDS, TIP_CONTENT, DEV_* como globales sueltos.
Object.assign(window, ProductData);

// ═══════════════════════════════════════════════════════
// SUPABASE
// ═══════════════════════════════════════════════════════
// Cliente Supabase → src/supabase-client.js (import `supa` arriba).
// UI de autenticación (botón de cuenta + modal login/registro/reset) →
// src/ui/auth.js. Acá queda solo el pegamento auth↔presets: el listener
// onAuthStateChange (en init) y handleLoginSync.

// ── SYNC PRESETS / CONFIGURACIONES RÁPIDAS → src/ui/presets.js ─────

// PRODUCTS y PRESET_TABS → src/products.js (window.* vía <script type="module">)

// ── ESTADO ──────────────────────────────────────────────
// Estado compartido → src/ui/state.js (objeto S)
// Grillas de tarjetas + captura de teclas → src/ui/cards.js
// (STORAGE_KEY y el acceso a localStorage viven en src/presets-store.js)

// PRODUCTS, PRESET_TABS, LATEST_FW, FACTORY_CMDS/CARDS, TIP_CONTENT y los mapas
// DEV_* viven en src/products.js — window.* vía el <script type="module"> de arriba.

// mkCfg / _whoResolve / parseLine / postConnect → src/ui/connection.js

// ── SELECCIÓN DE PRODUCTO ────────────────────────────────
function selectProd(id) {
  const p = PRODUCTS[id];
  if (!p) return;
  S.prod = p;
  document.querySelectorAll('.dev-opt:not(.disabled)').forEach(el => el.classList.remove('active'));
  const opt = document.getElementById('opt-' + id);
  if (opt) opt.classList.add('active');
  // También activar la copia en el modal de conexión
  const optM = document.getElementById('opt-' + id + '-m');
  if (optM) optM.classList.add('active');

  // Habilitar paso 2 (drawer)
  const step2 = document.getElementById('sbConnType');
  if (step2) { step2.style.opacity = ''; step2.style.pointerEvents = ''; }
  // Habilitar paso 3 (drawer)
  const step3 = document.getElementById('sbConn');
  if (step3) { step3.style.opacity = ''; step3.style.pointerEvents = ''; }
  // Habilitar pasos en connModal
  enableConnModalSteps();

  document.getElementById('mainTitle').textContent = p.cardTitle;

  // Layout centrado para disButton y disHub
  document.getElementById('secBtns').classList.toggle('S.prod-centered', !!p.centeredLayout);

  // Título y ícono de la sección flechas/externos
  const arrowTitle = document.getElementById('arrowSectionTitle');
  const arrowIcon  = document.getElementById('arrowSectionIcon');
  if (arrowTitle) arrowTitle.textContent = p.arrowSectionTitle || 'Modo de Flechas';
  if (arrowIcon)  arrowIcon.textContent  = p.arrowSectionIcon  || '⬆️';
  const arrowModeLabel = document.getElementById('arrowModeLabel');
  if (arrowModeLabel) arrowModeLabel.textContent = p.arrowSectionTitle
    ? 'Las ' + p.arrowSectionTitle.toLowerCase() + ' funcionan como:'
    : 'Las flechas funcionan como:';

  // Mostrar/ocultar sección flechas
  document.getElementById('secArrows').style.display = p.hasArrows ? '' : 'none';

  if (p.dishubLayout) buildDishubGrid('mainGrid', p.mainBtns);
  else buildGrid('mainGrid', p.mainBtns);
  buildGrid('arrowGrid', p.hasArrows ? p.arrowBtns : []);
  // Auto-seleccionar tab del dispositivo
  const devTab = tabForProd(p.id);
  if (devTab) S.activePresetTab = devTab.tabId;
  // Si el modal está abierto, refrescar; si no, solo pre-popular la grid (para cuando abra)
  const presetsOpen = document.getElementById('presetsModal')?.style.display !== 'none';
  if (presetsOpen) renderPresetTabs();
  else buildFactoryPresets(p.presets);
  renderCustom();
  // Re-evaluar botones ahora que S.prod está seteado (setConnected se llamó antes que WHO)
  setSections(S.connected);
  addLog('Producto seleccionado: ' + p.name);
}

// ── SELECCIÓN TIPO CONEXIÓN ──────────────────────────────
function selectConnType(type) {
  if (type === 'ble' && isIOS()) return; // bloqueado en iOS
  S.connType = type;
  // Sincronizar en drawer
  const usbEl = document.getElementById('ct-usb');
  const bleEl = document.getElementById('ct-ble');
  if (usbEl) usbEl.classList.toggle('active', type === 'usb');
  if (bleEl) bleEl.classList.toggle('active', type === 'ble');
  const bh = document.getElementById('bleHint');
  if (bh) bh.style.display = type === 'ble' ? '' : 'none';
  // Sincronizar en modal
  const usbM = document.getElementById('ct-usb-m');
  const bleM = document.getElementById('ct-ble-m');
  if (usbM) usbM.classList.toggle('active', type === 'usb');
  if (bleM) bleM.classList.toggle('active', type === 'ble');
  const bhM = document.getElementById('bleHintM');
  if (bhM) bhM.style.display = type === 'ble' ? '' : 'none';
}

// ── MODO DE MODIFICADORES (Windows / Mac) ────────────────
// Se autodetecta al cargar (isMacOS) y se recuerda en este navegador.
// Solo afecta a presets con modificador "principal" (hoy: std_copy).
// El editor manual de botones ya expone Ctrl y GUI/⌘ por separado, sin ambigüedad —
// por eso el control de cambio vive en el panel Avanzado de cada botón, junto a esos checkboxes.
function selectOsMode(mode) {
  S.osMode = mode;
  try { localStorage.setItem('displus_os_mode', mode); } catch(_) {}
  // Re-etiquetar el checkbox "GUI" (mg_${code}) y la nota de modo en el panel Avanzado
  // de cada botón, y refrescar el modal de configuración si está abierto.
  document.querySelectorAll('.mod-gui-lbl').forEach(el => { el.textContent = mode === 'mac' ? '⌘ Cmd' : 'Win'; });
  document.querySelectorAll('.mod-os-name').forEach(el => { el.textContent = mode === 'mac' ? '⌘ (Mac)' : 'Ctrl (Windows)'; });
  const cfgModal = document.getElementById('cfgModal');
  if (cfgModal && cfgModal.style.display !== 'none') renderCfgModal();
}

// (primaryMod / sustitución de %P% en presets: ahora en src/protocol.js — window.Protocol.resolvePreset)

// Cambio manual desde el panel Avanzado de un botón — requiere confirmación porque
// solo corresponde si el dispositivo se va a usar en una computadora con otro SO
// distinto al que se está usando ahora mismo para configurarlo.
function confirmToggleOsMode(e) {
  if (e) e.preventDefault();
  const next = S.osMode === 'mac' ? 'win' : 'mac';
  const nextLbl = next === 'mac' ? 'Mac (⌘)' : 'Windows (Ctrl)';
  const ok = confirm(
    'Esto va a hacer que los atajos con modificador principal (Copiar/Pegar) usen ' + nextLbl + '.\n\n' +
    'Cambiá esto SOLO si vas a usar el dispositivo en una computadora con un sistema operativo ' +
    'distinto al que estás usando ahora para configurarlo. Si es la misma computadora, dejalo como está.'
  );
  if (ok) selectOsMode(next);
}

// ── SECCIONES / BANNER → src/ui/connection.js (setSections) ──────────

// ── GRILLAS + CAPTURA DE TECLAS → src/ui/cards.js ──────────

// ── APLICAR BOTÓN / MODO DE FLECHAS → src/ui/actions.js ─────────────

// ── PRESETS (tabs, fábrica, propios, compartidos, CSV) → src/ui/presets.js ──

// ── GUARDAR / RESET / PING ───────────────────────────────
async function saveConfig()  { if (await send('SAVE')) toast('💾','Guardado en dispositivo'); }
async function resetDevice() {
  if (!confirm('¿Restaurar todos los valores por defecto?')) return;
  if (await send('RESET')) toast('🔄','Valores restaurados');
}
async function pingDevice() { if (await send('PING')) toast('✅','El dispositivo responde'); }

// ── GETALL / PARSE / STATUS BAR / POST-CONEXIÓN → src/ui/connection.js ──

// renderCfgModal → src/ui/actions.js

// ── CONEXIÓN (transporte, send, setConnected) → src/ui/connection.js ──

// ── MODALS ────────────────────────────────────────────────
function openModal(id)  {
  document.getElementById(id).style.display='flex';
  if (id === 'presetsModal') {
    renderPresetTabs();   // builds tabs, factory presets, and triggers loadSharedPresets via _refreshPresetContent
  }
}


// sendLogCmd → src/ui/connection.js

// ── TOOLTIP GLOBAL DE PRESETS → src/ui/presets.js ─────────────────

// ── CONN MODAL (openConnModal) → src/ui/connection.js ──────────────

// ── LEER CONFIGURACIÓN → TARJETAS → src/ui/actions.js ──────────────

// ── INIT ─────────────────────────────────────────────────
function init() {
  // Enganches que src/ui/connection.js necesita de código aún en app.js.
  // Transicional: desaparecen a medida que esos bloques se mueven a sus módulos.
  Object.assign(connectionHooks, {
    renderPresetTabs, applyDevCfgToCards, selectProd, onArrowMode, openModal,
  });

  // Mover topbar y status-bar al inicio del app-shell (están antes en el DOM por limitaciones del HTML estático)
  const shell = document.getElementById('appShell');
  const topbar = document.getElementById('topbar');
  const statusBar = document.getElementById('statusBar');
  if (shell && topbar) shell.insertBefore(topbar, shell.firstChild);
  if (shell && statusBar) shell.insertBefore(statusBar, shell.children[1] || null);

  const def = PRODUCTS['dismouse'];
  buildGrid('mainGrid',  def.mainBtns);
  buildGrid('arrowGrid', def.arrowBtns);
  buildFactoryPresets(def.presets);
  setSections(false);
  onArrowMode();
  renderCustom();
  let savedOsMode = null;
  try { savedOsMode = localStorage.getItem('displus_os_mode'); } catch(_) {}
  selectOsMode(savedOsMode || (isMacOS() ? 'mac' : 'win'));
  addLog('Configurador dis+ R014. Firmware R009 compatible.');
  // Bloquear BLE en iOS — Web Bluetooth no disponible en ningún browser iOS
  if (isIOS()) {
    const ctBle = document.getElementById('ct-ble');
    ctBle.classList.add('ct-disabled');
    ctBle.title = 'No disponible en iOS/iPadOS';
    ctBle.querySelector('.ct-sub').textContent = 'No disponible';
    document.getElementById('iosBlock').style.display = '';
    addLog('iOS/iPadOS detectado — opción BLE deshabilitada.', 'w');
  }
  setTimeout(showWelcome, 800);

  // Escape cierra drawer
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });

  // Supabase: recuperar sesión activa y escuchar cambios
  // Usamos solo onAuthStateChange — incluye INITIAL_SESSION en v2, evita doble llamada
  supa.auth.onAuthStateChange((event, session) => {
    const prevUser = S.currentUser;
    S.currentUser = session?.user ?? null;
    updateAuthBtn();

    if (event === 'SIGNED_OUT') {
      // Limpiar presets locales para no dejar datos del usuario en el navegador
      window.PresetsStore.clearLocal();
      renderCustom();
      // Ocultar secciones compartidas
      document.getElementById('sectionShared').style.display    = 'none';
      document.getElementById('sectionCommunity').style.display = 'none';
    } else if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && S.currentUser && !prevUser) {
      // Login nuevo (no recarga con sesión ya activa desde antes)
      handleLoginSync();
      loadSharedPresets();
    }
  });
}

// handleLoginSync → src/ui/presets.js

// init() usa PRODUCTS (de src/products.js, cargado por el <script type="module">
// diferido). Por eso se espera a DOMContentLoaded, que corre después de los módulos.

// ── Puente para los handlers inline del HTML (onclick="...") ─────────────────
// Transicional: al partir este archivo en src/ui/*.js, cada módulo hará
// addEventListener o re-exportará lo que su HTML necesite y esta lista se achica.
Object.assign(window, {
  applyArrows, applyBtn, applyCustom, applyDishubCenter, captureFromInput, clearLog,
  closeBd, closeDrawer, closeModal, confirmEditPreset, confirmSave, confirmToggleOsMode,
  delCustom, delShared, downloadCSV, getAllConfig, importCSV, importChoice,
  neverShowTour, nextStep, onArrowMode, onDishubCenterMode, onType, openAuthModal,
  openConnModal, openEditPreset, openModal, openSaveModal, openShareModal, pingDevice, prevStep,
  renderAuthModal, resetDevice, restartTour, saveConfig, saveSharedAsOwn, selectConnType,
  selectProd, sendLogCmd, sendResetLink, setCapturedKey, shareWithCommunity, shareWithUser,
  signInWithGoogle, signInWithPassword, signOut, signUpWithPassword, skipTour, startCap,
  startTour, stopCap, toggleAdv, toggleConn, toggleDrawer,
  _PR,
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
