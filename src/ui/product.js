// @ts-check
/**
 * Selección de producto, tipo de conexión (USB/BLE) y modo de modificadores
 * (Windows/Mac). Ata la elección del usuario al resto de la UI: reconstruye
 * las grillas, refresca presets y re-evalúa las secciones habilitadas.
 */
import { S } from './state.js';
import { addLog } from './dom.js';
import { isIOS } from './platform.js';
import { PRODUCTS } from '../products.js';
import { buildGrid, buildDishubGrid } from './cards.js';
import { setSections, enableConnModalSteps } from './connection.js';
import { tabForProd, renderPresetTabs, renderCustom, buildFactoryPresets } from './presets.js';
import { renderCfgModal } from './actions.js';

/** getElementById con tipo laxo (transicional). */
function el(/** @type {string} */ id) {
  return /** @type {any} */ (document.getElementById(id));
}

// ── SELECCIÓN DE PRODUCTO ────────────────────────────────
export function selectProd(id) {
  const p = PRODUCTS[id];
  if (!p) return;
  S.prod = p;
  document.querySelectorAll('.dev-opt:not(.disabled)').forEach((o) => o.classList.remove('active'));
  const opt = el('opt-' + id);
  if (opt) opt.classList.add('active');
  // También activar la copia en el modal de conexión
  const optM = el('opt-' + id + '-m');
  if (optM) optM.classList.add('active');

  // Habilitar paso 2 (drawer)
  const step2 = el('sbConnType');
  if (step2) {
    step2.style.opacity = '';
    step2.style.pointerEvents = '';
  }
  // Habilitar paso 3 (drawer)
  const step3 = el('sbConn');
  if (step3) {
    step3.style.opacity = '';
    step3.style.pointerEvents = '';
  }
  // Habilitar pasos en connModal
  enableConnModalSteps();

  el('mainTitle').textContent = p.cardTitle;

  // Layout centrado para disButton y disHub
  el('secBtns').classList.toggle('S.prod-centered', !!p.centeredLayout);

  // Título y ícono de la sección flechas/externos
  const arrowTitle = el('arrowSectionTitle');
  const arrowIcon = el('arrowSectionIcon');
  if (arrowTitle) arrowTitle.textContent = p.arrowSectionTitle || 'Modo de Flechas';
  if (arrowIcon) arrowIcon.textContent = p.arrowSectionIcon || '⬆️';
  const arrowModeLabel = el('arrowModeLabel');
  if (arrowModeLabel)
    arrowModeLabel.textContent = p.arrowSectionTitle
      ? 'Las ' + p.arrowSectionTitle.toLowerCase() + ' funcionan como:'
      : 'Las flechas funcionan como:';

  // Mostrar/ocultar sección flechas
  el('secArrows').style.display = p.hasArrows ? '' : 'none';

  if (p.dishubLayout) buildDishubGrid('mainGrid', p.mainBtns);
  else buildGrid('mainGrid', p.mainBtns);
  buildGrid('arrowGrid', p.hasArrows ? p.arrowBtns : []);

  // Auto-seleccionar tab del dispositivo
  const devTab = tabForProd(p.id);
  if (devTab) S.activePresetTab = devTab.tabId;
  // Si el modal está abierto, refrescar; si no, solo pre-popular la grid (para cuando abra)
  const presetsOpen = el('presetsModal')?.style.display !== 'none';
  if (presetsOpen) renderPresetTabs();
  else buildFactoryPresets(p.presets);
  renderCustom();

  // Re-evaluar botones ahora que S.prod está seteado (setConnected corrió antes que WHO)
  setSections(S.connected);
  addLog('Producto seleccionado: ' + p.name);
}

// ── SELECCIÓN TIPO DE CONEXIÓN ───────────────────────────
export function selectConnType(type) {
  if (type === 'ble' && isIOS()) return; // bloqueado en iOS
  S.connType = type;
  // Sincronizar en drawer
  const usbEl = el('ct-usb');
  const bleEl = el('ct-ble');
  if (usbEl) usbEl.classList.toggle('active', type === 'usb');
  if (bleEl) bleEl.classList.toggle('active', type === 'ble');
  const bh = el('bleHint');
  if (bh) bh.style.display = type === 'ble' ? '' : 'none';
  // Sincronizar en modal
  const usbM = el('ct-usb-m');
  const bleM = el('ct-ble-m');
  if (usbM) usbM.classList.toggle('active', type === 'usb');
  if (bleM) bleM.classList.toggle('active', type === 'ble');
  const bhM = el('bleHintM');
  if (bhM) bhM.style.display = type === 'ble' ? '' : 'none';
}

// ── MODO DE MODIFICADORES (Windows / Mac) ────────────────
// Se autodetecta al cargar (isMacOS) y se recuerda en este navegador. Solo afecta
// a presets con modificador "principal" (hoy: std_copy). El editor manual de
// botones ya expone Ctrl y GUI/⌘ por separado, así que el control de cambio vive
// en el panel Avanzado de cada botón, junto a esos checkboxes.
export function selectOsMode(mode) {
  S.osMode = mode;
  try {
    localStorage.setItem('displus_os_mode', mode);
  } catch (_) {
    /* localStorage no disponible */
  }
  // Re-etiquetar el checkbox "GUI" (mg_${code}) y la nota de modo en el panel
  // Avanzado de cada botón, y refrescar el modal de configuración si está abierto.
  document.querySelectorAll('.mod-gui-lbl').forEach((e) => {
    e.textContent = mode === 'mac' ? '⌘ Cmd' : 'Win';
  });
  document.querySelectorAll('.mod-os-name').forEach((e) => {
    e.textContent = mode === 'mac' ? '⌘ (Mac)' : 'Ctrl (Windows)';
  });
  const cfgModal = el('cfgModal');
  if (cfgModal && cfgModal.style.display !== 'none') renderCfgModal();
}

// Cambio manual desde el panel Avanzado de un botón — requiere confirmación porque
// solo corresponde si el dispositivo se va a usar en una computadora con OTRO SO
// distinto al que se está usando ahora para configurarlo.
export function confirmToggleOsMode(e) {
  if (e) e.preventDefault();
  const next = S.osMode === 'mac' ? 'win' : 'mac';
  const nextLbl = next === 'mac' ? 'Mac (⌘)' : 'Windows (Ctrl)';
  const ok = confirm(
    'Esto va a hacer que los atajos con modificador principal (Copiar/Pegar) usen ' +
      nextLbl +
      '.\n\n' +
      'Cambiá esto SOLO si vas a usar el dispositivo en una computadora con un sistema ' +
      'operativo distinto al que estás usando ahora para configurarlo. Si es la misma ' +
      'computadora, dejalo como está.',
  );
  if (ok) selectOsMode(next);
}
