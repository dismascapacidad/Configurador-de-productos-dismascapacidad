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

// ── SYNC PRESETS ─────────────────────────────────────────
// El almacenamiento (localStorage + upsert incremental a Supabase) vive en
// src/presets-store.js (window.PresetsStore). Acá solo el pegamento con la UI.
async function fetchSupaPresets() {
  const { rows, error } = await window.PresetsStore.fetchCloud(supa);
  if (error) addLog('Error al leer presets de la nube: ' + error, 'w');
  return rows;
}

async function syncPresetsToCloud(list) {
  if (!S.currentUser) return;
  const { error } = await window.PresetsStore.pushToCloud(supa, S.currentUser.id, list);
  if (error) addLog('Error al sincronizar con la nube: ' + error, 'w');
}

function showImportDialog(localPresets, supaPresets) {
  const body = document.getElementById('importModalBody');
  const localCount = localPresets.length;
  const supaCount  = supaPresets.length;
  body.innerHTML = `
    <p class="auth-info">
      Tenés <strong>${localCount} configuración${localCount !== 1 ? 'es' : ''}</strong>
      guardada${localCount !== 1 ? 's' : ''} en este navegador.<br>
      ${supaCount > 0
        ? `Tu cuenta ya tiene <strong>${supaCount} configuración${supaCount !== 1 ? 'es' : ''}</strong>.`
        : 'Tu cuenta todavía no tiene configuraciones guardadas.'}
    </p>
    <p class="auth-info">¿Qué querés hacer con las configuraciones locales?</p>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn pri sm" onclick="importChoice('merge')">
        Agregar las locales a mi cuenta
      </button>
      <button class="btn ghost sm" onclick="importChoice('cloud')">
        Descartar las locales, usar solo las de mi cuenta
      </button>
    </div>`;
  openModal('importModal');
}

async function importChoice(choice) {
  closeModal('importModal');
  if (choice === 'merge') {
    // Combinar nube + local (sin duplicar por nombre). reconcileIds hace que los
    // locales que ya existen en la nube adopten su id, así el upsert no duplica.
    const localPresets = loadCustom();
    const { rows: cloudRows } = await window.PresetsStore.fetchCloud(supa);
    window.PresetsStore.reconcileIds(localPresets, cloudRows);
    const cloudIds = new Set(cloudRows.map(p => p.id));
    const merged   = [...cloudRows, ...localPresets.filter(p => !cloudIds.has(p.id))];
    window.PresetsStore.saveLocal(merged);
    await syncPresetsToCloud(merged);
    renderCustom();
    toast('☁️', `${merged.length} configuración${merged.length !== 1 ? 'es' : ''} en tu cuenta`);
  } else {
    // Usar solo las de la nube
    const { rows: cloudRows } = await window.PresetsStore.fetchCloud(supa);
    window.PresetsStore.saveLocal(cloudRows);
    renderCustom();
    toast('☁️', cloudRows.length > 0
      ? `${cloudRows.length} configuración${cloudRows.length !== 1 ? 'es' : ''} cargadas desde tu cuenta`
      : 'No tenés configuraciones guardadas en tu cuenta todavía');
  }
}

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
  const devTab = _tabForProd(p.id);
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

// ── APLICAR BOTÓN ────────────────────────────────────────
// El armado del comando CFG: vive en src/protocol.js (window.Protocol), testeado
// en tests/protocol.test.js. Acá solo se leen los valores del DOM.
async function applyBtn(code) {
  const el = id => document.getElementById(id);
  const tipo = el('t_' + code).value;
  const cmd = window.Protocol.buildButtonCfg({
    code,
    tipo,
    modo:        el('m_' + code).value,
    debounce:    el('d_' + code).value,
    mouseAction: el('mact_' + code)?.value,
    key:         el('k_' + code)?.value,
    ctrl:        el('mc_' + code)?.checked,
    shift:       el('ms_' + code)?.checked,
    alt:         el('ma_' + code)?.checked,
    gui:         el('mg_' + code)?.checked,
  });
  const ok = await send(cmd);
  if (ok) { toast('✅', code + ' configurado'); updateSummary(code); }
}

// ── MODO DE FLECHAS ──────────────────────────────────────
function onArrowMode() {
  const m = parseInt(document.getElementById('arrowMode').value);
  const showCursorCfg = (m === 0 || m === 1);
  document.getElementById('velWrap').style.display  = showCursorCfg ? '' : 'none';
  document.getElementById('acelWrap').style.display = showCursorCfg ? '' : 'none';
  document.getElementById('arrowInd').style.display = m === 0 ? '' : 'none';
}

async function applyArrows() {
  const el = id => document.getElementById(id);
  const cmds = window.Protocol.buildArrowCommands({
    fmode:  el('arrowMode').value,
    orient: el('orient').value,
    vel:    el('vel').value,
    acel:   el('acel').checked,
  });
  for (const c of cmds) await send(c);
  toast('✅', 'Flechas configuradas');
}

function onDishubCenterMode() {
  const m = parseInt(document.getElementById('dishubCenterMode').value);
  const showCursorCfg = (m === 0 || m === 1);
  const el = id => document.getElementById(id);
  if (el('dishubVelWrap'))  el('dishubVelWrap').style.display  = showCursorCfg ? '' : 'none';
  if (el('dishubAcelWrap')) el('dishubAcelWrap').style.display = showCursorCfg ? '' : 'none';
  const centerWrap = document.getElementById('dishubCenterCards');
  if (centerWrap) centerWrap.classList.toggle('open', m === 0);
}

async function applyDishubCenter() {
  const el = id => document.getElementById(id);
  const cmds = window.Protocol.buildArrowCommands({
    fmode:  el('dishubCenterMode').value,
    orient: el('dishubOrient').value,
    vel:    el('dishubVel').value,
    acel:   el('dishubAcel').checked,
  });
  for (const c of cmds) await send(c);
  toast('✅', 'Conectores centrales configurados');
}

// ── PRESETS DE FÁBRICA ───────────────────────────────────
// FACTORY_CMDS, FACTORY_CARDS, TIP_CONTENT → src/products.js (window.*)

// ── TABS DE DISPOSITIVO EN MODAL PRESETS ────────────────
function _tabForProd(prodId) {
  return PRESET_TABS.find(t => t.prodIds.includes(prodId)) || null;
}

function renderPresetTabs() {
  const container = document.getElementById('presetTabs');
  if (!container) return;
  const devTab = S.prod ? _tabForProd(S.prod.id) : null;
  // Fallback solo si no hay tab activa todavía
  if (!S.activePresetTab) {
    S.activePresetTab = devTab ? devTab.tabId : PRESET_TABS[0].tabId;
  }
  container.innerHTML = '';
  PRESET_TABS.forEach(tab => {
    const btn = document.createElement('button');
    btn.className = 'preset-tab' +
      (tab.tabId === S.activePresetTab ? ' active' : '') +
      (devTab && tab.tabId === devTab.tabId ? ' dev-match' : '');
    btn.textContent = tab.label;
    if (devTab && tab.tabId === devTab.tabId) btn.title = 'Dispositivo conectado';
    btn.onclick = () => switchPresetTab(tab.tabId);
    container.appendChild(btn);
  });
  if (devTab) {
    const hint = document.createElement('span');
    hint.className = 'preset-tab-hint';
    hint.textContent = '● Presets EpE visibles solo para ' + devTab.label + ' (dispositivo conectado)';
    container.appendChild(hint);
  }
  // Renderizar contenido para el tab activo
  _refreshPresetContent();
}

function switchPresetTab(tabId) {
  S.activePresetTab = tabId;
  renderPresetTabs();
}

function _refreshPresetContent() {
  const tab = PRESET_TABS.find(t => t.tabId === S.activePresetTab);
  if (!tab) return;
  // Factory presets: unir presets de todos los productos del grupo
  const factoryIds = [...new Set(tab.prodIds.flatMap(pid => PRODUCTS[pid]?.presets || []))];
  _buildFactoryPresetsRaw(factoryIds);
  renderCustom();
  if (S.currentUser) loadSharedPresets();
}

function _buildFactoryPresetsRaw(ids) {
  const grid    = document.getElementById('factoryGrid');
  const section = grid ? grid.closest('.presets-modal-section') : null;
  if (!grid) return;
  grid.innerHTML = '';
  // Filtrar solo IDs con FACTORY_CARDS definido
  const validIds = ids.filter(id => !!FACTORY_CARDS[id]);
  // Si hay dispositivo conectado y la tab activa no es la suya, ocultar Presets EpE
  const devTab2    = S.prod ? _tabForProd(S.prod.id) : null;
  const activeTab2 = PRESET_TABS.find(t => t.tabId === S.activePresetTab);
  if (S.connected && devTab2 && activeTab2 && devTab2.tabId !== activeTab2.tabId) {
    if (section) section.style.display = 'none';
    return;
  }
  if (!validIds.length) {
    if (section) section.style.display = 'none';
    return;
  }
  if (section) section.style.display = '';
  const devTab    = S.prod ? _tabForProd(S.prod.id) : null;
  const activeTab = PRESET_TABS.find(t => t.tabId === S.activePresetTab);
  const canApply  = !S.connected || (devTab && activeTab && devTab.tabId === activeTab.tabId);
  validIds.forEach(id => {
    const c = FACTORY_CARDS[id];
    const div = document.createElement('div');
    div.className = 'preset-card' + (canApply ? '' : ' preset-locked');
    div.setAttribute('data-tip-id', c.tipId);
    div.innerHTML = `<span class="preset-icon">${c.icon}</span><span class="preset-name">${c.name}</span><span class="preset-sub">${c.sub}</span>`;
    div.addEventListener('click', () => applyPreset(id));
    grid.appendChild(div);
  });
  initPresetTooltips();
}

function buildFactoryPresets(ids) {
  // Mantener compatibilidad: si el modal no está abierto, solo guardar para cuando abra
  _buildFactoryPresetsRaw(ids);
}

async function applyPreset(id) {
  const cmds = FACTORY_CMDS[id]; if (!cmds) return;
  if (!S.connected) { openModal('noDeviceModal'); return; }
  // Validar que el preset es compatible con el dispositivo conectado
  const devTab = S.prod ? _tabForProd(S.prod.id) : null;
  const activeTab = PRESET_TABS.find(t => t.tabId === S.activePresetTab);
  if (devTab && activeTab && devTab.tabId !== activeTab.tabId) {
    toast('⚠️', 'Este preset es para ' + activeTab.label + ', pero tenés conectado un ' + S.prod.name);
    return;
  }
  for (const c of window.Protocol.resolvePreset(cmds, S.osMode)) await send(c);
  toast('⚡', 'Configuración aplicada');
  closeModal('presetsModal');
}

// ── CUSTOM PRESETS ───────────────────────────────────────
function loadCustom() {
  return window.PresetsStore.loadLocal();
}
function saveCustomList(list) {
  window.PresetsStore.saveLocal(list);
  syncPresetsToCloud(list); // sync en background, sin bloquear UI (no-op si no hay sesión)
}

function renderCustom() {
  const all  = loadCustom();
  const tab  = PRESET_TABS.find(t => t.tabId === S.activePresetTab);
  const list = tab
    ? all.filter(p => !p.prodId || tab.prodIds.includes(p.prodId))
    : all;
  const grid = document.getElementById('customGrid');
  const none = document.getElementById('noCustom');
  if (!grid) return;
  grid.innerHTML = '';
  if (!list.length) {
    none.style.display = 'block';
    none.textContent   = tab
      ? 'No hay configuraciones guardadas para ' + tab.label + '.'
      : 'Conectá un dispositivo para ver tus configuraciones.';
    return;
  }
  none.style.display = 'none';
  list.forEach((p) => {
    const realIdx   = all.indexOf(p);
    const prodLabel = PRODUCTS[p.prodId] ? PRODUCTS[p.prodId].name : '';
    const k         = _reg(p);
    const card      = document.createElement('div');
    card.className  = 'custom-card';
    card.innerHTML  = `
      <button class="custom-del" title="Eliminar" onclick="delCustom(${realIdx},event)">✕</button>
      <div class="custom-name">⭐ ${esc(p.name)}</div>
      <div class="custom-date">${p.date}${prodLabel ? ' · ' + prodLabel : ''}</div>
      ${p.notes ? `<div class="custom-notes">${esc(p.notes)}</div>` : ''}
      <div class="custom-actions" onclick="event.stopPropagation()">
        <button class="btn pri sm"   onclick="applyCustom(_PR['${k}'])">Aplicar</button>
        <button class="btn ghost sm" onclick="openEditPreset(${realIdx})">✏️ Editar</button>
        <button class="btn ghost sm" onclick="openShareModal(_PR['${k}'])">↗ Compartir</button>
        <button class="btn ghost sm" onclick="downloadCSV(_PR['${k}'])">⬇ CSV</button>
      </div>`;
    grid.appendChild(card);
  });
}

// ── REGISTRO DE PRESETS (evita JSON inline en onclick) ───
const _PR = {}; // id → preset object
let   _prIdx = 0;
function _reg(p) { const k = 'p' + (_prIdx++); _PR[k] = p; return k; }

// ── COMPARTIR / CSV ──────────────────────────────────────

let _sharePreset = null;

function openShareModal(p) {
  _sharePreset = p;
  document.getElementById('sharePresetName').textContent = _sharePreset.name;
  document.getElementById('shareEmail').value = '';
  const msg = document.getElementById('shareMsg');
  msg.style.display = 'none'; msg.textContent = '';
  openModal('shareModal');
}

async function shareWithUser() {
  if (!S.currentUser) { toast('⚠️','Necesitás estar logueado para compartir'); return; }
  const email = document.getElementById('shareEmail').value.trim().toLowerCase();
  if (!email) { document.getElementById('shareEmail').focus(); return; }
  if (email === S.currentUser.email) { showShareMsg('No podés compartir contigo mismo.', 'warn'); return; }

  // Buscar recipient_id via función RPC (ver instrucciones en README)
  const { data, error: ue } = await supa.rpc('get_user_id_by_email', { p_email: email });
  if (ue || !data) {
    showShareMsg('❌ No encontramos ninguna cuenta con ese email. <button class="btn ghost sm" style="margin-top:6px" onclick="downloadCSV(JSON.stringify(_sharePreset))">⬇ Descargar CSV</button>', 'warn');
    return;
  }

  const { error } = await supa.from('shared_presets').insert({
    recipient_id: data,
    sender_email: S.currentUser.email,
    sender_name:  S.currentUser.user_metadata?.full_name || S.currentUser.email,
    name:         _sharePreset.name,
    date:         _sharePreset.date,
    prod_id:      _sharePreset.prodId || null,
    cfg:          _sharePreset.cfg,
    notes:        _sharePreset.notes || null,
    is_community: false
  });
  if (error) { showShareMsg('Error al enviar: ' + error.message, 'error'); return; }
  showShareMsg('✅ ¡Enviado! El usuario verá el preset la próxima vez que abra sus configuraciones.', 'ok');
  setTimeout(() => closeModal('shareModal'), 2000);
}

async function shareWithCommunity() {
  if (!S.currentUser) { toast('⚠️','Necesitás estar logueado para compartir'); return; }
  if (!confirm('¿Querés compartir "' + _sharePreset.name + '" con toda la comunidad? Será visible para todos los usuarios.')) return;
  const { error } = await supa.from('shared_presets').insert({
    recipient_id: null,
    sender_email: S.currentUser.email,
    sender_name:  S.currentUser.user_metadata?.full_name || S.currentUser.email,
    name:         _sharePreset.name,
    date:         _sharePreset.date,
    prod_id:      _sharePreset.prodId || null,
    cfg:          _sharePreset.cfg,
    notes:        _sharePreset.notes || null,
    is_community: true
  });
  if (error) { showShareMsg('Error: ' + error.message, 'error'); return; }
  showShareMsg('✅ ¡Compartido con la comunidad!', 'ok');
  setTimeout(() => closeModal('shareModal'), 1800);
}

function showShareMsg(html, type) {
  const el = document.getElementById('shareMsg');
  el.innerHTML = html;
  el.style.display = 'block';
  el.style.color = type === 'ok' ? 'var(--grn)' : type === 'warn' ? 'var(--acc)' : 'var(--red)';
}

// Serialización/parseo CSV: src/csv.js (window.Csv). Acá solo el <a download> y el <input file>.
function downloadCSV(p) {
  const csv = window.Csv.presetToCsv(p);
  const a   = document.createElement('a');
  a.href    = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = (p.name || 'preset').replace(/[^a-z0-9]/gi,'_') + '.csv';
  a.click();
}

function importCSV() {
  const inp = document.createElement('input');
  inp.type  = 'file'; inp.accept = '.csv';
  inp.onchange = async e => {
    const file = e.target.files[0]; if (!file) return;
    const { presets, error } = window.Csv.parsePresetsCsv(await file.text());
    if (error) { toast('⚠️', error); return; }
    const existing = loadCustom();
    const names = new Set(existing.map(p => p.name));
    let added = 0;
    for (const p of presets) {
      if (names.has(p.name)) continue;   // no duplicar por nombre
      existing.push(p); names.add(p.name); added++;
    }
    saveCustomList(existing);
    renderCustom();
    toast('⬆️', added + ' configuración' + (added !== 1 ? 'es' : '') + ' importada' + (added !== 1 ? 's' : ''));
  };
  inp.click();
}

// ── PRESETS COMPARTIDOS Y COMUNIDAD ─────────────────────

async function loadSharedPresets() {
  if (!S.currentUser) return;
  const { data, error } = await supa.from('shared_presets')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { addLog('Error al cargar compartidos: ' + error.message, 'w'); return; }

  const mine      = (data || []).filter(p => p.recipient_id === S.currentUser.id && !p.is_community);
  const community = (data || []).filter(p => p.is_community);

  renderSharedGrid('sharedGrid',    'sectionShared',    mine,      false);
  renderSharedGrid('communityGrid', 'sectionCommunity', community, true);
}

function renderSharedGrid(gridId, sectionId, list, isCommunity) {
  const section = document.getElementById(sectionId);
  const grid    = document.getElementById(gridId);
  // Filtrar por tab activa
  const tab = PRESET_TABS.find(t => t.tabId === S.activePresetTab);
  const items = tab ? list.filter(p => !p.prod_id || tab.prodIds.includes(p.prod_id)) : list;
  if (!items.length) { section.style.display = 'none'; return; }
  section.style.display = 'block';
  grid.innerHTML = '';
  const myEmail = S.currentUser?.email || '';
  items.forEach(p => {
    const prodLabel = PRODUCTS[p.prod_id] ? PRODUCTS[p.prod_id].name : '';
    const mapped    = { name: p.name, date: p.date, prodId: p.prod_id, cfg: p.cfg, notes: p.notes };
    const k         = _reg(mapped);
    const canDel    = !isCommunity || p.sender_email === myEmail;
    const card      = document.createElement('div');
    card.className  = 'custom-card ' + (isCommunity ? 'community' : 'shared');
    card.innerHTML  = `
      ${canDel ? `<button class="custom-del" title="Eliminar" onclick="delShared('${p.id}',${isCommunity},event)">✕</button>` : ''}
      <div class="custom-name">${isCommunity ? '🌐' : '📨'} ${esc(p.name)}</div>
      <div class="custom-date">${p.date||''}${prodLabel ? ' · ' + prodLabel : ''}</div>
      <div class="custom-sender">Por: ${esc(p.sender_name || p.sender_email)}</div>
      ${p.notes ? `<div class="custom-notes">${esc(p.notes)}</div>` : ''}
      <div class="custom-actions" onclick="event.stopPropagation()">
        <button class="btn pri sm"   onclick="applyCustom(_PR['${k}'])">Aplicar</button>
        <button class="btn ghost sm" onclick="saveSharedAsOwn(_PR['${k}'])">💾 Guardar</button>
        <button class="btn ghost sm" onclick="openShareModal(_PR['${k}'])">↗ Reenviar</button>
        <button class="btn ghost sm" onclick="downloadCSV(_PR['${k}'])">⬇ CSV</button>
      </div>`;
    grid.appendChild(card);
  });
}

async function delShared(id, isCommunity, e) {
  e.stopPropagation();
  const msg = isCommunity
    ? '¿Eliminar este preset? La comunidad ya no podrá verlo.'
    : '¿Eliminar este preset compartido?';
  if (!confirm(msg)) return;
  const { error } = await supa.from('shared_presets').delete().eq('id', id);
  if (error) { addLog('Error al eliminar shared preset: ' + error.message, 'w'); toast('⚠️', 'No se pudo eliminar: ' + error.message); return; }
  toast('🗑️', 'Preset eliminado');
  loadSharedPresets();
}

function saveSharedAsOwn(p) {
  const list = loadCustom();
  if (list.find(x => x.name === p.name)) { toast('⚠️', 'Ya tenés una configuración con ese nombre'); return; }
  list.push({ name: p.name, date: p.date || new Date().toLocaleDateString('es-AR'), prodId: p.prodId||null, cfg: p.cfg, notes: p.notes||'' });
  saveCustomList(list);
  renderCustom();
  toast('⭐', '"' + p.name + '" guardada en tus configuraciones');
}

let _editIdx = null;

function openEditPreset(idx) {
  const list = loadCustom();
  const p    = list[idx]; if (!p) return;
  _editIdx   = idx;
  document.getElementById('editPresetName').value  = p.name  || '';
  document.getElementById('editPresetNotes').value = p.notes || '';
  document.getElementById('editNotesCount').textContent = (p.notes || '').length + ' / 300';
  document.getElementById('editPresetNotes').oninput = function() {
    document.getElementById('editNotesCount').textContent = this.value.length + ' / 300';
  };
  openModal('editPresetModal');
  setTimeout(() => document.getElementById('editPresetName').focus(), 100);
}

function confirmEditPreset() {
  const name  = document.getElementById('editPresetName').value.trim();
  const notes = document.getElementById('editPresetNotes').value.trim();
  if (!name) { document.getElementById('editPresetName').focus(); return; }
  const list  = loadCustom();
  if (!list[_editIdx]) return;
  list[_editIdx].name  = name;
  list[_editIdx].notes = notes;
  saveCustomList(list);
  renderCustom();
  closeModal('editPresetModal');
  toast('✏️', '"' + name + '" actualizada');
}

function openSaveModal() {
  document.getElementById('customName').value = '';
  document.getElementById('customNotes').value = '';
  document.getElementById('notesCount').textContent = '0 / 300';
  openModal('saveModal');
  setTimeout(() => document.getElementById('customName').focus(), 100);
  document.getElementById('customNotes').oninput = function() {
    document.getElementById('notesCount').textContent = this.value.length + ' / 300';
  };
}

async function confirmSave() {
  const name  = document.getElementById('customName').value.trim();
  const notes = document.getElementById('customNotes').value.trim();
  if (!name) { document.getElementById('customName').focus(); return; }
  S.devCfg = mkCfg();
  await send('GETALL');
  await new Promise(r => setTimeout(r, 2400));
  const list = loadCustom();
  list.push({ name, date: new Date().toLocaleDateString('es-AR'), prodId: S.prod ? S.prod.id : null, cfg: JSON.parse(JSON.stringify(S.devCfg)), notes });
  saveCustomList(list);
  renderCustom();
  closeModal('saveModal');
  toast('💾', '"' + name + '" guardada');
}

async function applyCustom(p) {
  if (!S.connected) { openModal('noDeviceModal'); return; }
  // Validar compatibilidad con dispositivo conectado
  if (p.prodId && S.prod) {
    const presetTab = _tabForProd(p.prodId);
    const devTab    = _tabForProd(S.prod.id);
    if (presetTab && devTab && presetTab.tabId !== devTab.tabId) {
      toast('⚠️', 'Este preset es para ' + (PRODUCTS[p.prodId]?.name || p.prodId) + ', pero tenés conectado un ' + S.prod.name);
      return;
    }
  }
  const cfg = p.cfg; if (!cfg) return;
  // Traducción cfg → comandos: src/protocol.js (window.Protocol.cfgToCommands), testeado.
  for (const c of window.Protocol.cfgToCommands(cfg)) await send(c);
  toast('⭐', '"' + p.name + '" aplicada');
  closeModal('presetsModal');
}

function delCustom(idx, e) {
  e.stopPropagation();
  const list = loadCustom();
  if (!confirm('¿Eliminar "' + (list[idx]?.name||'') + '"?')) return;
  list.splice(idx,1); saveCustomList(list); renderCustom();
}


// ── GUARDAR / RESET / PING ───────────────────────────────
async function saveConfig()  { if (await send('SAVE')) toast('💾','Guardado en dispositivo'); }
async function resetDevice() {
  if (!confirm('¿Restaurar todos los valores por defecto?')) return;
  if (await send('RESET')) toast('🔄','Valores restaurados');
}
async function pingDevice() { if (await send('PING')) toast('✅','El dispositivo responde'); }

// ── GETALL / PARSE / STATUS BAR / POST-CONEXIÓN → src/ui/connection.js ──

function renderCfgModal() {
  const ORI = ['Normal (0°)','Girado derecha','Girado izquierda','Invertido (180°)'];
  const FM  = {0:'acción individual', 1:'mueven el cursor', 2:'teclas ↑↓←→'};
  const TN  = {0:'Mouse',1:'Teclado',2:'Desactivado'};
  const MN  = {0:'al presionar',1:'al soltar',2:'pulsación larga'};
  const MOU = {1:'clic izq.',2:'clic der.',4:'clic central',8:'scroll ↑',16:'scroll ↓'};
  const hl  = t => '<span class="hl">' + t + '</span>';
  let h = '';
  if (S.prod && S.prod.hasArrows) {
    h += '<div class="cfg-sec"><div class="cfg-sec-title">⬆️ Flechas</div>';
    h += '<div class="cfg-row">Las flechas ' + hl(FM[S.devCfg.fmode]||'—') + '. Orientación: ' + hl(ORI[S.devCfg.orient]||'—') + '.</div>';
    if (S.devCfg.fmode===0||S.devCfg.fmode===1) h += '<div class="cfg-row">Velocidad ' + hl(S.devCfg.vel||'—') + ', ' + hl(S.devCfg.acel===1?'con aceleración':'velocidad constante') + '.</div>';
    h += '</div>';
  }
  if (S.prod) {
    const codeToIdx = {BR:0,BA:1,BN:2,BC:3,FU:4,FD:5,FL:6,FR:7};
    const allBtns = [
      ...S.prod.mainBtns,
      ...(S.prod.hasArrows && S.devCfg.fmode===0 ? S.prod.arrowBtns : []),
      ...(S.prod.hasCenterConnectors && S.devCfg.fmode===0 ? S.prod.centerBtns : []),
    ];
    h += '<div class="cfg-sec"><div class="cfg-sec-title">🎯 Botones</div>';
    allBtns.forEach(({code,label}) => {
      const c = S.devCfg.btns[String(codeToIdx[code])];
      if (!c) { h += '<div class="cfg-row"><b>' + label + '</b>: sin datos.</div>'; return; }
      if (c.tipo===2) { h += '<div class="cfg-row"><b>' + label + '</b>: ' + hl('desactivado') + '.</div>'; return; }
      let row = '<b>' + label + '</b>: ' + hl(TN[c.tipo]) + ', ' + hl(MN[c.modo]);
      if (c.tipo===0) {
        const dc=(c.flags&1)?'doble ':''; const mc=(c.flags&2)?' (toggle)':'';
        row += ' — ' + hl(dc + (MOU[c.accion]||'#'+c.accion) + mc);
      } else {
        const ch = c.accion>31&&c.accion<127 ? String.fromCharCode(c.accion) : '#'+c.accion;
        const mm=[]; if(c.mods&1)mm.push('Ctrl'); if(c.mods&2)mm.push('Shift'); if(c.mods&4)mm.push('Alt'); if(c.mods&8)mm.push(S.osMode==='mac'?'⌘':'Win');
        row += ' — tecla ' + hl(ch) + (mm.length?' + '+hl(mm.join('+')):'');
      }
      if (c.debounce>0) row += ', debounce ' + hl(c.debounce+'ms');
      h += '<div class="cfg-row">' + row + '.</div>';
    });
    h += '</div>';
  }
  document.getElementById('cfgDisplay').innerHTML = h;
  openModal('cfgModal');
}

// ── CONEXIÓN (transporte, send, setConnected) → src/ui/connection.js ──

// ── MODALS ────────────────────────────────────────────────
function openModal(id)  {
  document.getElementById(id).style.display='flex';
  if (id === 'presetsModal') {
    renderPresetTabs();   // builds tabs, factory presets, and triggers loadSharedPresets via _refreshPresetContent
  }
}


// sendLogCmd → src/ui/connection.js

// ── TOOLTIP GLOBAL DE PRESETS ────────────────────────────
// Llamado desde buildFactoryPresets tras crear las cards.
// Las cards ya tienen listener de click para applyPreset;
// aquí solo agregamos hover para el tooltip global.
function initPresetTooltips() {
  const gt = document.getElementById('globalTip');
  let hideTimer = null;

  document.querySelectorAll('.preset-card[data-tip-id]').forEach(card => {
    card.addEventListener('mouseenter', () => {
      clearTimeout(hideTimer);
      const id = card.getAttribute('data-tip-id');
      const html = TIP_CONTENT[id];
      if (!html) return;
      gt.innerHTML = html.includes('%PLBL%') ? html.replaceAll('%PLBL%', S.osMode === 'mac' ? '⌘' : 'Ctrl') : html;
      gt.style.display = 'block';
      positionTip(card);
    });
    card.addEventListener('mousemove', () => positionTip(card));
    card.addEventListener('mouseleave', () => {
      hideTimer = setTimeout(() => { gt.style.display = 'none'; }, 80);
    });
  });

  function positionTip(card) {
    const r=card.getBoundingClientRect(), tw=gt.offsetWidth;
    const vw=window.innerWidth, margin=10;
    let left=r.left+r.width/2-tw/2, top=r.top-gt.offsetHeight-10;
    if (top < margin) top = r.bottom + 10;
    left = Math.max(margin, Math.min(left, vw-tw-margin));
    gt.style.left=left+'px'; gt.style.top=top+'px';
    const al=r.left+r.width/2-left;
    gt.style.setProperty('--arrow-left', Math.max(16,Math.min(al,tw-16))+'px');
  }
}

// ── CONN MODAL (openConnModal) → src/ui/connection.js ──────────────

// ── LEER CONFIGURACIÓN → TARJETAS ────────────────────────
// Mapa inverso código numérico → nombre de tecla (incluye tabla legacy):
// src/protocol.js → window.Protocol.REV_KEY

function applyDevCfgToCards() {
  if (!S.prod) return;
  const codeToIdx = {BR:0,BA:1,BN:2,BC:3,FU:4,FD:5,FL:6,FR:7};
  const allBtns = [
    ...S.prod.mainBtns,
    ...(S.prod.hasArrows ? S.prod.arrowBtns : []),
    ...(S.prod.hasCenterConnectors && S.devCfg.fmode === 0 ? S.prod.centerBtns : []),
  ];

  // Mapa modo numérico → selector value
  const MODO_MAP = {0:'P', 1:'R', 2:'H', 3:'O'};
  // Mapa mods bitmask → checkboxes
  const MODS_BITS = [{bit:1,id:'mc'},{bit:2,id:'ms'},{bit:4,id:'ma'},{bit:8,id:'mg'}];

  allBtns.forEach(({code}) => {
    const idx = String(codeToIdx[code]);
    const c = S.devCfg.btns[idx];
    if (!c) return;

    const tSel = document.getElementById('t_' + code);
    const mSel = document.getElementById('m_' + code);
    const dInp = document.getElementById('d_' + code);
    if (!tSel) return;

    // Tipo
    if (c.tipo === 2) {
      tSel.value = 'X';
    } else if (c.tipo === 0) {
      tSel.value = 'M';
    } else {
      tSel.value = 'K';
    }
    onType(code);

    // Modo de activación
    if (mSel) mSel.value = MODO_MAP[c.modo] ?? 'P';

    // Debounce
    if (dInp) dInp.value = c.debounce ?? 0;

    if (c.tipo === 0) {
      // Mouse
      const mActSel = document.getElementById('mact_' + code);
      if (mActSel) {
        const hasDouble = (c.flags & 1);
        const hasToggle = (c.flags & 2);
        if (c.accion === 8 || c.accion === 16) {
          mActSel.value = c.accion === 8 ? 'SU' : 'SD';
        } else if (hasDouble && c.accion === 1) {
          mActSel.value = '1D';
        } else if (hasToggle && c.accion === 1) {
          mActSel.value = '1M';
        } else {
          mActSel.value = String(c.accion);
          if (!mActSel.value) mActSel.value = '1'; // accion=0 u otro valor sin opción → default clic izquierdo
        }
      }
    } else if (c.tipo === 1) {
      // Teclado
      const kInp = document.getElementById('k_' + code);
      if (kInp) {
        const accion = String(c.accion);
        const revKey = window.Protocol.REV_KEY;
        if (revKey[accion]) {
          kInp.value = revKey[accion];
        } else if (c.accion > 31 && c.accion < 127) {
          kInp.value = String.fromCharCode(c.accion);
        } else if (c.accion > 0) {
          kInp.value = '#' + c.accion;
        } else {
          kInp.value = '';
        }
      }
      // Modificadores
      MODS_BITS.forEach(({bit, id}) => {
        const cb = document.getElementById(id + '_' + code);
        if (cb) cb.checked = !!(c.mods & bit);
      });
    }

    updateSummary(code);
  });

  // Flechas: aplicar si el producto las tiene
  if (S.prod.hasArrows) {
    const amSel = document.getElementById('arrowMode');
    const oriSel = document.getElementById('orient');
    const velInp = document.getElementById('vel');
    const acelCb = document.getElementById('acel');
    if (amSel && S.devCfg.fmode != null)  amSel.value = String(S.devCfg.fmode);
    if (oriSel && S.devCfg.orient != null) oriSel.value = String(S.devCfg.orient);
    if (velInp && S.devCfg.vel != null)    velInp.value = S.devCfg.vel;
    if (acelCb && S.devCfg.acel != null)   acelCb.checked = S.devCfg.acel === 1;
    onArrowMode();
  }

  // Conectores centrales: aplicar si el producto los tiene
  if (S.prod.hasCenterConnectors) {
    const cmSel = document.getElementById('dishubCenterMode');
    const oriSel = document.getElementById('dishubOrient');
    const velInp = document.getElementById('dishubVel');
    const acelCb = document.getElementById('dishubAcel');
    if (cmSel && S.devCfg.fmode != null)   cmSel.value   = String(S.devCfg.fmode);
    if (oriSel && S.devCfg.orient != null) oriSel.value  = String(S.devCfg.orient);
    if (velInp && S.devCfg.vel != null)    velInp.value  = S.devCfg.vel;
    if (acelCb && S.devCfg.acel != null)   acelCb.checked = S.devCfg.acel === 1;
    onDishubCenterMode();
  }

  toast('✅', 'Configuración cargada en las tarjetas');
}

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

async function handleLoginSync() {
  const localPresets = loadCustom();
  const { rows: cloudRows } = await window.PresetsStore.fetchCloud(supa);
  if (localPresets.length > 0) {
    // Hay presets locales: preguntar qué hacer (merge / usar solo la nube)
    showImportDialog(localPresets, cloudRows);
  } else {
    // Sin presets locales: cargar los de la nube directamente
    window.PresetsStore.saveLocal(cloudRows);
    renderCustom();
    if (cloudRows.length > 0)
      toast('☁️', `${cloudRows.length} configuración${cloudRows.length !== 1 ? 'es' : ''} cargadas desde tu cuenta`);
  }
}

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
  openConnModal, openEditPreset, openModal, openShareModal, pingDevice, prevStep,
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
