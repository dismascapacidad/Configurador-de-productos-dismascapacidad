// @ts-check
/**
 * Configuraciones rápidas: presets de fábrica (EpE), presets propios del
 * usuario (solo en este navegador, localStorage) e import/export CSV. No hay
 * cuentas ni nube: pasar perfiles a otro equipo se hace con CSV.
 *
 * Almacenamiento → src/presets-store.js. Serialización CSV → src/csv.js.
 * Traducción cfg ↔ comandos → src/protocol.js. Acá va el render y el pegamento.
 */
import { S } from './state.js';
import { toast, esc, closeModal, openModal } from './dom.js';
import * as PresetsStore from '../presets-store.js';
import * as Csv from '../csv.js';
import * as Protocol from '../protocol.js';
import { send, mkCfg } from './connection.js';
import { PRODUCTS, PRESET_TABS, FACTORY_CMDS, FACTORY_CARDS, TIP_CONTENT } from '../products.js';

/** getElementById con tipo laxo (transicional). */
function el(/** @type {string} */ id) {
  return /** @type {any} */ (document.getElementById(id));
}

/** Abre el modal de configuraciones rápidas y arma su contenido. */
export function openPresetsModal() {
  openModal('presetsModal');
  renderPresetTabs();
}

// ── TABS DE DISPOSITIVO EN MODAL PRESETS ────────────────
export function tabForProd(prodId) {
  return PRESET_TABS.find((t) => t.prodIds.includes(prodId)) || null;
}

export function renderPresetTabs() {
  const container = el('presetTabs');
  if (!container) return;
  const devTab = S.prod ? tabForProd(S.prod.id) : null;
  // Fallback solo si no hay tab activa todavía
  if (!S.activePresetTab) {
    S.activePresetTab = devTab ? devTab.tabId : PRESET_TABS[0].tabId;
  }
  container.innerHTML = '';
  PRESET_TABS.forEach((tab) => {
    const btn = document.createElement('button');
    btn.className =
      'preset-tab' +
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
    hint.textContent =
      '● Presets EpE visibles solo para ' + devTab.label + ' (dispositivo conectado)';
    container.appendChild(hint);
  }
  _refreshPresetContent();
}

function switchPresetTab(tabId) {
  S.activePresetTab = tabId;
  renderPresetTabs();
}

function _refreshPresetContent() {
  const tab = PRESET_TABS.find((t) => t.tabId === S.activePresetTab);
  if (!tab) return;
  // Factory presets: unir presets de todos los productos del grupo
  const factoryIds = [...new Set(tab.prodIds.flatMap((pid) => PRODUCTS[pid]?.presets || []))];
  _buildFactoryPresetsRaw(factoryIds);
  renderCustom();
}

function _buildFactoryPresetsRaw(ids) {
  const grid = el('factoryGrid');
  const section = grid ? grid.closest('.presets-modal-section') : null;
  if (!grid) return;
  grid.innerHTML = '';
  // Filtrar solo IDs con FACTORY_CARDS definido
  const validIds = ids.filter((id) => !!FACTORY_CARDS[id]);
  // Si hay dispositivo conectado y la tab activa no es la suya, ocultar Presets EpE
  const devTab2 = S.prod ? tabForProd(S.prod.id) : null;
  const activeTab2 = PRESET_TABS.find((t) => t.tabId === S.activePresetTab);
  if (S.connected && devTab2 && activeTab2 && devTab2.tabId !== activeTab2.tabId) {
    if (section) section.style.display = 'none';
    return;
  }
  if (!validIds.length) {
    if (section) section.style.display = 'none';
    return;
  }
  if (section) section.style.display = '';
  const devTab = S.prod ? tabForProd(S.prod.id) : null;
  const activeTab = PRESET_TABS.find((t) => t.tabId === S.activePresetTab);
  const canApply = !S.connected || (devTab && activeTab && devTab.tabId === activeTab.tabId);
  validIds.forEach((id) => {
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

export function buildFactoryPresets(ids) {
  // Si el modal no está abierto, igual se prepara la grid para cuando abra.
  _buildFactoryPresetsRaw(ids);
}

async function applyPreset(id) {
  const cmds = FACTORY_CMDS[id];
  if (!cmds) return;
  if (!S.connected) {
    openModal('noDeviceModal');
    return;
  }
  // Validar que el preset es compatible con el dispositivo conectado
  const devTab = S.prod ? tabForProd(S.prod.id) : null;
  const activeTab = PRESET_TABS.find((t) => t.tabId === S.activePresetTab);
  if (devTab && activeTab && devTab.tabId !== activeTab.tabId) {
    toast(
      '⚠️',
      'Este preset es para ' + activeTab.label + ', pero tenés conectado un ' + S.prod.name,
    );
    return;
  }
  for (const c of Protocol.resolvePreset(cmds, S.osMode)) await send(c);
  toast('⚡', 'Configuración aplicada');
  closeModal('presetsModal');
}

// ── CUSTOM PRESETS ───────────────────────────────────────
function loadCustom() {
  return PresetsStore.loadLocal();
}
function saveCustomList(list) {
  PresetsStore.saveLocal(list);
}

export function renderCustom() {
  const all = loadCustom();
  const tab = PRESET_TABS.find((t) => t.tabId === S.activePresetTab);
  const list = tab ? all.filter((p) => !p.prodId || tab.prodIds.includes(p.prodId)) : all;
  const grid = el('customGrid');
  const none = el('noCustom');
  if (!grid) return;
  grid.innerHTML = '';
  if (!list.length) {
    none.style.display = 'block';
    none.textContent = tab
      ? 'No hay configuraciones guardadas para ' + tab.label + '.'
      : 'Conectá un dispositivo para ver tus configuraciones.';
    return;
  }
  none.style.display = 'none';
  list.forEach((p) => {
    const realIdx = all.indexOf(p);
    const prodLabel = PRODUCTS[p.prodId] ? PRODUCTS[p.prodId].name : '';
    const k = _reg(p);
    const card = document.createElement('div');
    card.className = 'custom-card';
    card.innerHTML = `
      <button class="custom-del" title="Eliminar" onclick="delCustom(${realIdx},event)">✕</button>
      <div class="custom-name">⭐ ${esc(p.name)}</div>
      <div class="custom-date">${p.date}${prodLabel ? ' · ' + prodLabel : ''}</div>
      ${p.notes ? `<div class="custom-notes">${esc(p.notes)}</div>` : ''}
      <div class="custom-actions" onclick="event.stopPropagation()">
        <button class="btn pri sm"   onclick="applyCustom(_PR['${k}'])">Aplicar</button>
        <button class="btn ghost sm" onclick="openEditPreset(${realIdx})">✏️ Editar</button>
        <button class="btn ghost sm" onclick="downloadCSV(_PR['${k}'])">⬇ CSV</button>
      </div>`;
    grid.appendChild(card);
  });
}

// ── REGISTRO DE PRESETS (evita JSON inline en onclick) ───
/** id → preset object; leído desde los onclick generados como `_PR['pN']`. */
export const _PR = {};
let _prIdx = 0;
function _reg(p) {
  const k = 'p' + _prIdx++;
  _PR[k] = p;
  return k;
}

// Serialización/parseo CSV: src/csv.js. Acá solo el <a download> y el <input file>.
export function downloadCSV(p) {
  const csv = Csv.presetToCsv(p);
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = (p.name || 'preset').replace(/[^a-z0-9]/gi, '_') + '.csv';
  a.click();
}

export function importCSV() {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = '.csv';
  inp.onchange = async (e) => {
    const file = /** @type {any} */ (e.target).files[0];
    if (!file) return;
    const { presets, error } = Csv.parsePresetsCsv(await file.text());
    if (error) {
      toast('⚠️', error);
      return;
    }
    const existing = loadCustom();
    const names = new Set(existing.map((p) => p.name));
    let added = 0;
    for (const p of presets) {
      if (names.has(p.name)) continue; // no duplicar por nombre
      existing.push(p);
      names.add(p.name);
      added++;
    }
    saveCustomList(existing);
    renderCustom();
    toast(
      '⬆️',
      added +
        ' configuración' +
        (added !== 1 ? 'es' : '') +
        ' importada' +
        (added !== 1 ? 's' : ''),
    );
  };
  inp.click();
}

// ── EDITAR / GUARDAR CONFIGURACIÓN PROPIA ────────────────
let _editIdx = null;

export function openEditPreset(idx) {
  const list = loadCustom();
  const p = list[idx];
  if (!p) return;
  _editIdx = idx;
  el('editPresetName').value = p.name || '';
  const notesEl = el('editPresetNotes');
  notesEl.value = p.notes || '';
  el('editNotesCount').textContent = (p.notes || '').length + ' / 300';
  notesEl.oninput = () => {
    el('editNotesCount').textContent = notesEl.value.length + ' / 300';
  };
  openModal('editPresetModal');
  setTimeout(() => el('editPresetName').focus(), 100);
}

export function confirmEditPreset() {
  const name = el('editPresetName').value.trim();
  const notes = el('editPresetNotes').value.trim();
  if (!name) {
    el('editPresetName').focus();
    return;
  }
  const list = loadCustom();
  if (!list[_editIdx]) return;
  list[_editIdx].name = name;
  list[_editIdx].notes = notes;
  saveCustomList(list);
  renderCustom();
  closeModal('editPresetModal');
  toast('✏️', '"' + name + '" actualizada');
}

export function openSaveModal() {
  el('customName').value = '';
  const notesEl = el('customNotes');
  notesEl.value = '';
  el('notesCount').textContent = '0 / 300';
  openModal('saveModal');
  setTimeout(() => el('customName').focus(), 100);
  notesEl.oninput = () => {
    el('notesCount').textContent = notesEl.value.length + ' / 300';
  };
}

export async function confirmSave() {
  const name = el('customName').value.trim();
  const notes = el('customNotes').value.trim();
  if (!name) {
    el('customName').focus();
    return;
  }
  S.devCfg = mkCfg();
  await send('GETALL');
  await new Promise((r) => setTimeout(r, 2400));
  const list = loadCustom();
  list.push({
    name,
    date: new Date().toLocaleDateString('es-AR'),
    prodId: S.prod ? S.prod.id : null,
    cfg: JSON.parse(JSON.stringify(S.devCfg)),
    notes,
  });
  saveCustomList(list);
  renderCustom();
  closeModal('saveModal');
  toast('💾', '"' + name + '" guardada');
}

export async function applyCustom(p) {
  if (!S.connected) {
    openModal('noDeviceModal');
    return;
  }
  // Validar compatibilidad con dispositivo conectado
  if (p.prodId && S.prod) {
    const presetTab = tabForProd(p.prodId);
    const devTab = tabForProd(S.prod.id);
    if (presetTab && devTab && presetTab.tabId !== devTab.tabId) {
      toast(
        '⚠️',
        'Este preset es para ' +
          (PRODUCTS[p.prodId]?.name || p.prodId) +
          ', pero tenés conectado un ' +
          S.prod.name,
      );
      return;
    }
  }
  const cfg = p.cfg;
  if (!cfg) return;
  // Traducción cfg → comandos: src/protocol.js (testeado).
  for (const c of Protocol.cfgToCommands(cfg, { tapHold: S.soportaTapHold })) await send(c);
  toast('⭐', '"' + p.name + '" aplicada');
  closeModal('presetsModal');
}

export function delCustom(idx, e) {
  e.stopPropagation();
  const list = loadCustom();
  if (!confirm('¿Eliminar "' + (list[idx]?.name || '') + '"?')) return;
  list.splice(idx, 1);
  saveCustomList(list);
  renderCustom();
}

// ── TOOLTIP GLOBAL DE PRESETS ────────────────────────────
// Llamado desde _buildFactoryPresetsRaw tras crear las cards. Las cards ya
// tienen listener de click para applyPreset; acá solo el hover del tooltip.
function initPresetTooltips() {
  const gt = el('globalTip');
  /** @type {any} */
  let hideTimer = null;

  document.querySelectorAll('.preset-card[data-tip-id]').forEach((card) => {
    card.addEventListener('mouseenter', () => {
      clearTimeout(hideTimer);
      const id = card.getAttribute('data-tip-id');
      const html = TIP_CONTENT[id];
      if (!html) return;
      gt.innerHTML = html.includes('%PLBL%')
        ? html.replaceAll('%PLBL%', S.osMode === 'mac' ? '⌘' : 'Ctrl')
        : html;
      gt.style.display = 'block';
      positionTip(card);
    });
    card.addEventListener('mousemove', () => positionTip(card));
    card.addEventListener('mouseleave', () => {
      hideTimer = setTimeout(() => {
        gt.style.display = 'none';
      }, 80);
    });
  });

  function positionTip(card) {
    const r = card.getBoundingClientRect();
    const tw = gt.offsetWidth;
    const vw = window.innerWidth;
    const margin = 10;
    let left = r.left + r.width / 2 - tw / 2;
    let top = r.top - gt.offsetHeight - 10;
    if (top < margin) top = r.bottom + 10;
    left = Math.max(margin, Math.min(left, vw - tw - margin));
    gt.style.left = left + 'px';
    gt.style.top = top + 'px';
    const al = r.left + r.width / 2 - left;
    gt.style.setProperty('--arrow-left', Math.max(16, Math.min(al, tw - 16)) + 'px');
  }
}
