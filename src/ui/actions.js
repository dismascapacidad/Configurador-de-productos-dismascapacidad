// @ts-check
/**
 * Acciones que escriben al dispositivo: aplicar la config de un botón, el modo
 * de flechas / conectores centrales, volcar la config leída (`S.devCfg`) a las
 * tarjetas y el modal de resumen de configuración.
 *
 * El armado de los comandos `CFG:` / `FMODE:` / `ORIENT:` … vive en
 * src/protocol.js (testeado). Acá solo se leen valores del DOM y se manda.
 */
import { S } from './state.js';
import { toast } from './dom.js';
import * as Protocol from '../protocol.js';
import { send } from './connection.js';
import { updateSummary, onType } from './cards.js';

/** getElementById con tipo laxo (transicional). */
function el(/** @type {string} */ id) {
  return /** @type {any} */ (document.getElementById(id));
}

// ── APLICAR BOTÓN ────────────────────────────────────────
export async function applyBtn(code) {
  const tipo = el('t_' + code).value;
  const cmd = Protocol.buildButtonCfg({
    code,
    tipo,
    modo: el('m_' + code).value,
    debounce: el('d_' + code).value,
    mouseAction: el('mact_' + code)?.value,
    key: el('k_' + code)?.value,
    ctrl: el('mc_' + code)?.checked,
    shift: el('ms_' + code)?.checked,
    alt: el('ma_' + code)?.checked,
    gui: el('mg_' + code)?.checked,
  });
  const ok = await send(cmd);
  if (ok) {
    toast('✅', code + ' configurado');
    updateSummary(code);
  }
}

// ── MODO DE FLECHAS ──────────────────────────────────────
export function onArrowMode() {
  const m = parseInt(el('arrowMode').value);
  const showCursorCfg = m === 0 || m === 1;
  el('velWrap').style.display = showCursorCfg ? '' : 'none';
  el('acelWrap').style.display = showCursorCfg ? '' : 'none';
  el('arrowInd').style.display = m === 0 ? '' : 'none';
}

export async function applyArrows() {
  const cmds = Protocol.buildArrowCommands({
    fmode: el('arrowMode').value,
    orient: el('orient').value,
    vel: el('vel').value,
    acel: el('acel').checked,
  });
  for (const c of cmds) await send(c);
  toast('✅', 'Flechas configuradas');
}

export function onDishubCenterMode() {
  const m = parseInt(el('dishubCenterMode').value);
  const showCursorCfg = m === 0 || m === 1;
  if (el('dishubVelWrap')) el('dishubVelWrap').style.display = showCursorCfg ? '' : 'none';
  if (el('dishubAcelWrap')) el('dishubAcelWrap').style.display = showCursorCfg ? '' : 'none';
  const centerWrap = el('dishubCenterCards');
  if (centerWrap) centerWrap.classList.toggle('open', m === 0);
}

export async function applyDishubCenter() {
  const cmds = Protocol.buildArrowCommands({
    fmode: el('dishubCenterMode').value,
    orient: el('dishubOrient').value,
    vel: el('dishubVel').value,
    acel: el('dishubAcel').checked,
  });
  for (const c of cmds) await send(c);
  toast('✅', 'Conectores centrales configurados');
}

// ── MODAL DE RESUMEN DE CONFIGURACIÓN ────────────────────
export function renderCfgModal() {
  const ORI = ['Normal (0°)', 'Girado derecha', 'Girado izquierda', 'Invertido (180°)'];
  const FM = { 0: 'acción individual', 1: 'mueven el cursor', 2: 'teclas ↑↓←→' };
  const TN = { 0: 'Mouse', 1: 'Teclado', 2: 'Desactivado' };
  const MN = { 0: 'al presionar', 1: 'al soltar', 2: 'pulsación larga' };
  const MOU = { 1: 'clic izq.', 2: 'clic der.', 4: 'clic central', 8: 'scroll ↑', 16: 'scroll ↓' };
  const hl = (t) => '<span class="hl">' + t + '</span>';
  let h = '';
  if (S.prod && S.prod.hasArrows) {
    h += '<div class="cfg-sec"><div class="cfg-sec-title">⬆️ Flechas</div>';
    h +=
      '<div class="cfg-row">Las flechas ' +
      hl(FM[S.devCfg.fmode] || '—') +
      '. Orientación: ' +
      hl(ORI[S.devCfg.orient] || '—') +
      '.</div>';
    if (S.devCfg.fmode === 0 || S.devCfg.fmode === 1)
      h +=
        '<div class="cfg-row">Velocidad ' +
        hl(S.devCfg.vel || '—') +
        ', ' +
        hl(S.devCfg.acel === 1 ? 'con aceleración' : 'velocidad constante') +
        '.</div>';
    h += '</div>';
  }
  if (S.prod) {
    const codeToIdx = { BR: 0, BA: 1, BN: 2, BC: 3, FU: 4, FD: 5, FL: 6, FR: 7 };
    const allBtns = [
      ...S.prod.mainBtns,
      ...(S.prod.hasArrows && S.devCfg.fmode === 0 ? S.prod.arrowBtns : []),
      ...(S.prod.hasCenterConnectors && S.devCfg.fmode === 0 ? S.prod.centerBtns : []),
    ];
    h += '<div class="cfg-sec"><div class="cfg-sec-title">🎯 Botones</div>';
    allBtns.forEach(({ code, label }) => {
      const c = S.devCfg.btns[String(codeToIdx[code])];
      if (!c) {
        h += '<div class="cfg-row"><b>' + label + '</b>: sin datos.</div>';
        return;
      }
      if (c.tipo === 2) {
        h += '<div class="cfg-row"><b>' + label + '</b>: ' + hl('desactivado') + '.</div>';
        return;
      }
      let row = '<b>' + label + '</b>: ' + hl(TN[c.tipo]) + ', ' + hl(MN[c.modo]);
      if (c.tipo === 0) {
        const dc = c.flags & 1 ? 'doble ' : '';
        const mc = c.flags & 2 ? ' (toggle)' : '';
        row += ' — ' + hl(dc + (MOU[c.accion] || '#' + c.accion) + mc);
      } else {
        const ch = c.accion > 31 && c.accion < 127 ? String.fromCharCode(c.accion) : '#' + c.accion;
        const mm = [];
        if (c.mods & 1) mm.push('Ctrl');
        if (c.mods & 2) mm.push('Shift');
        if (c.mods & 4) mm.push('Alt');
        if (c.mods & 8) mm.push(S.osMode === 'mac' ? '⌘' : 'Win');
        row += ' — tecla ' + hl(ch) + (mm.length ? ' + ' + hl(mm.join('+')) : '');
      }
      if (c.debounce > 0) row += ', debounce ' + hl(c.debounce + 'ms');
      h += '<div class="cfg-row">' + row + '.</div>';
    });
    h += '</div>';
  }
  el('cfgDisplay').innerHTML = h;
  /** @type {any} */ (window).openModal('cfgModal');
}

// ── LEER CONFIGURACIÓN → TARJETAS ────────────────────────
// Mapa inverso código numérico → nombre de tecla (incluye tabla legacy):
// src/protocol.js → Protocol.REV_KEY
export function applyDevCfgToCards() {
  if (!S.prod) return;
  const codeToIdx = { BR: 0, BA: 1, BN: 2, BC: 3, FU: 4, FD: 5, FL: 6, FR: 7 };
  const allBtns = [
    ...S.prod.mainBtns,
    ...(S.prod.hasArrows ? S.prod.arrowBtns : []),
    ...(S.prod.hasCenterConnectors && S.devCfg.fmode === 0 ? S.prod.centerBtns : []),
  ];

  const MODO_MAP = { 0: 'P', 1: 'R', 2: 'H', 3: 'O' };
  const MODS_BITS = [
    { bit: 1, id: 'mc' },
    { bit: 2, id: 'ms' },
    { bit: 4, id: 'ma' },
    { bit: 8, id: 'mg' },
  ];

  allBtns.forEach(({ code }) => {
    const idx = String(codeToIdx[code]);
    const c = S.devCfg.btns[idx];
    if (!c) return;

    const tSel = el('t_' + code);
    const mSel = el('m_' + code);
    const dInp = el('d_' + code);
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
      const mActSel = el('mact_' + code);
      if (mActSel) {
        const hasDouble = c.flags & 1;
        const hasToggle = c.flags & 2;
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
      const kInp = el('k_' + code);
      if (kInp) {
        const accion = String(c.accion);
        const revKey = Protocol.REV_KEY;
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
      MODS_BITS.forEach(({ bit, id }) => {
        const cb = el(id + '_' + code);
        if (cb) cb.checked = !!(c.mods & bit);
      });
    }

    updateSummary(code);
  });

  // Flechas: aplicar si el producto las tiene
  if (S.prod.hasArrows) {
    const amSel = el('arrowMode');
    const oriSel = el('orient');
    const velInp = el('vel');
    const acelCb = el('acel');
    if (amSel && S.devCfg.fmode != null) amSel.value = String(S.devCfg.fmode);
    if (oriSel && S.devCfg.orient != null) oriSel.value = String(S.devCfg.orient);
    if (velInp && S.devCfg.vel != null) velInp.value = S.devCfg.vel;
    if (acelCb && S.devCfg.acel != null) acelCb.checked = S.devCfg.acel === 1;
    onArrowMode();
  }

  // Conectores centrales: aplicar si el producto los tiene
  if (S.prod.hasCenterConnectors) {
    const cmSel = el('dishubCenterMode');
    const oriSel = el('dishubOrient');
    const velInp = el('dishubVel');
    const acelCb = el('dishubAcel');
    if (cmSel && S.devCfg.fmode != null) cmSel.value = String(S.devCfg.fmode);
    if (oriSel && S.devCfg.orient != null) oriSel.value = String(S.devCfg.orient);
    if (velInp && S.devCfg.vel != null) velInp.value = S.devCfg.vel;
    if (acelCb && S.devCfg.acel != null) acelCb.checked = S.devCfg.acel === 1;
    onDishubCenterMode();
  }

  toast('✅', 'Configuración cargada en las tarjetas');
}
