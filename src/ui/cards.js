// @ts-check
/**
 * Tarjetas de configuración por botón: construcción de la grilla (normal y
 * disHub), panel "Avanzado", resumen por tarjeta y captura de teclas.
 *
 * El armado del comando `CFG:` y el "Aplicar" viven en src/ui/actions.js; acá
 * solo se construye el DOM y se leen/escriben sus valores.
 */
import { S } from './state.js';
import { isTouchDevice } from './platform.js';
import { TH_DEFAULT_MS, TH_MIN_MS, TH_MAX_MS } from '../protocol.js';

/** getElementById con tipo laxo (transicional, evita castear cada `.value`). */
function el(/** @type {string} */ id) {
  return /** @type {any} */ (document.getElementById(id));
}

// ── GRILLAS ───────────────────────────────────────────────
export function buildDishubGrid(containerId, buttons) {
  const c = document.getElementById(containerId);
  if (!c) return;
  c.innerHTML = '';
  c.classList.add('dishub-grid');

  // Row A: BR y BA
  const rowA = document.createElement('div');
  rowA.className = 'dishub-row dishub-row-a';
  buttons
    .filter((b) => b.group === 'A')
    .forEach((b) => rowA.appendChild(mkCard(b.code, b.label, b.color, b.note)));
  c.appendChild(rowA);

  // Sección conectores centrales
  if (S.prod && S.prod.hasCenterConnectors) c.appendChild(buildDishubCenterSection());

  // Row B: BN + conectores centrales (ocultos por defecto) + BC
  const rowB = document.createElement('div');
  rowB.id = 'dishubRowB';
  rowB.className = 'dishub-row dishub-row-b';
  const bBtns = buttons.filter((b) => b.group === 'B');
  const bn = bBtns.find((b) => b.code === 'BN');
  const bc = bBtns.find((b) => b.code === 'BC');
  if (bn) rowB.appendChild(mkCard(bn.code, bn.label, bn.color, bn.note));
  if (S.prod && S.prod.centerBtns) {
    const centerWrap = document.createElement('div');
    centerWrap.id = 'dishubCenterCards';
    centerWrap.className = 'dishub-center-cards';
    S.prod.centerBtns.forEach((b) =>
      centerWrap.appendChild(mkCard(b.code, b.label, b.color, b.note)),
    );
    rowB.appendChild(centerWrap);
  }
  if (bc) rowB.appendChild(mkCard(bc.code, bc.label, bc.color, bc.note));
  c.appendChild(rowB);
}

function buildDishubCenterSection() {
  const sec = document.createElement('div');
  sec.id = 'dishubCenterSec';
  sec.className = 'dishub-center-sec';
  sec.innerHTML = `
    <div class="arrow-row">
      <div class="arrow-sel">
        <div class="field" style="margin:0">
          <label class="lbl">Los conectores centrales funcionan como:</label>
          <select id="dishubCenterMode" onchange="onDishubCenterMode()">
            <option value="1">Mover el cursor del mouse</option>
            <option value="2">Teclas de flecha del teclado (↑↓←→)</option>
            <option value="0">Acción individual por cada conector</option>
          </select>
        </div>
      </div>
      <div class="arrow-panel">
        <div class="arrow-div"></div>
        <div class="arrow-body">
          <div class="two-col" style="margin-bottom:9px">
            <div class="field" style="margin:0">
              <label class="lbl">Orientación</label>
              <select id="dishubOrient">
                <option value="0">Normal (0°)</option>
                <option value="1">Girado derecha (90°)</option>
                <option value="2">Girado izquierda (-90°)</option>
                <option value="3">Invertido (180°)</option>
              </select>
            </div>
            <div class="field" style="margin:0" id="dishubVelWrap">
              <label class="lbl">Velocidad del cursor</label>
              <input type="number" id="dishubVel" min="1" max="50" value="25">
            </div>
          </div>
          <div class="field" style="margin:0 0 9px" id="dishubAcelWrap">
            <label class="tog-row">
              <span class="tog">
                <input type="checkbox" id="dishubAcel">
                <span class="tog-track"></span>
                <span class="tog-thumb"></span>
              </span>
              <span class="tog-lbl">Aceleración gradual</span>
            </label>
            <div class="hint">El cursor acelera al mantener el conector presionado.</div>
          </div>
          <button class="btn suc sm" onclick="applyDishubCenter()">Aplicar</button>
        </div>
      </div>
    </div>`;
  return sec;
}

export function buildGrid(containerId, buttons) {
  const c = document.getElementById(containerId);
  if (!c) return;
  c.innerHTML = '';
  c.classList.remove('dishub-grid');
  buttons.forEach((b) => c.appendChild(mkCard(b.code, b.label, b.color, b.note)));
}

function mkCard(code, label, color, note) {
  const d = document.createElement('div');
  d.className = 'btn-card';
  d.id = 'card-' + code;
  d.innerHTML = `
    <div class="btn-main">
      <div class="btn-card-head">
        <div class="btn-dot" style="background:${color}"></div>
        <div class="btn-card-title">${label}${note ? `<span class="btn-card-note">${note}</span>` : ''}</div>
        <div class="btn-summary" id="sum_${code}">—</div>
      </div>
      <div class="btn-fields">
        <div class="field" style="margin:0">
          <label class="lbl">Funciona como</label>
          <select id="t_${code}" onchange="onType('${code}')">
            <option value="K">Teclado</option>
            <option value="M">Mouse</option>
            <option value="X">Desactivado</option>
          </select>
        </div>
        <div id="act_${code}">
          <div id="kb_${code}">${keyFieldHtml(code)}</div>
          <div id="mo_${code}" style="display:none">
            <div class="field" style="margin:0">
              <label class="lbl">Acción del mouse</label>
              <select id="mact_${code}" onchange="onMode('${code}')">
                <option value="1">Clic izquierdo</option>
                <option value="1D">Doble clic izquierdo</option>
                <option value="1M">Mantener clic izquierdo (toggle)</option>
                <option value="2">Clic derecho</option>
                <option value="4">Clic central</option>
                <option value="SU">Scroll ↑</option>
                <option value="SD">Scroll ↓</option>
              </select>
            </div>
          </div>
        </div>
        <button class="btn-adv-toggle" id="advtog_${code}" onclick="toggleAdv('${code}')">Avanzado</button>
      </div>
      <div class="btn-apply-wrap"><button class="btn suc sm" onclick="applyBtn('${code}')">Aplicar</button></div>
    </div>
    <div class="btn-adv" id="adv_${code}">
      <div class="field" style="margin:0">
        <label class="lbl">Se activa</label>
        <select id="m_${code}" onchange="onMode('${code}')">
          <option value="P">Al presionar</option>
          <option value="R">Al soltar</option>
          <option value="O">Una vez por pulsación</option>
          ${S.soportaTapHold ? TAP_HOLD_OPTION : ''}
        </select>
      </div>
      <div class="field" style="margin:0">
        <label class="lbl">Debounce (ms)</label>
        <input type="number" id="d_${code}" min="0" max="5000" value="0" step="50">
      </div>
      <div id="kb_mods_${code}">
        <div class="field" style="margin:0">
          <label class="lbl">Modificadores</label>
          <div class="mods-grid">
            <label class="mod-cb"><input type="checkbox" id="mc_${code}"><span>Ctrl</span></label>
            <label class="mod-cb"><input type="checkbox" id="ms_${code}"><span>Shift</span></label>
            <label class="mod-cb"><input type="checkbox" id="ma_${code}"><span>Alt</span></label>
            <label class="mod-cb"><input type="checkbox" id="mg_${code}"><span class="mod-gui-lbl">${S.osMode === 'mac' ? '⌘ Cmd' : 'Win'}</span></label>
          </div>
          <div class="hint mod-os-row">
            <span class="mod-os-txt">Los atajos con modificador principal (Copiar/Pegar) usan <b class="mod-os-name">${S.osMode === 'mac' ? '⌘ (Mac)' : 'Ctrl (Windows)'}</b>, detectado automáticamente.</span>
            <a href="#" class="mod-os-link" onclick="confirmToggleOsMode(event)">Cambiar</a>
          </div>
        </div>
      </div>
      ${S.soportaTapHold ? tapHoldBlockHtml(code) : ''}
    </div>`;
  return d;
}

/** Tecla (captura) — la usan la acción corta y la larga (`code` = 'BR' / 'BRL'). */
function keyFieldHtml(code) {
  return `
            <div class="field" style="margin:0">
              <label class="lbl">Tecla</label>
              ${
                isTouchDevice()
                  ? `<input type="text" id="k_${code}" placeholder="Tocá y escribí la tecla" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
                    oninput="captureFromInput('${code}', event)">`
                  : `<input type="text" id="k_${code}" placeholder="Clic aquí y presione la tecla" readonly style="cursor:pointer"
                    onfocus="startCap('${code}')" onblur="stopCap('${code}')">`
              }
              <div class="hint" id="kh_${code}">Dejar vacío = solo modificadores.</div>
              ${
                isTouchDevice()
                  ? `<div class="key-chips">${SPECIAL_KEY_CHIPS.map(
                      (k) =>
                        `<button type="button" class="key-chip" onclick="setCapturedKey('${code}','${k.name}')">${k.label}</button>`,
                    ).join('')}</div>`
                  : ''
              }
            </div>`;
}

// ── TAP-HOLD (solo firmware -TH) ─────────────────────────
// Sufijo del pseudo-código de la acción larga: reusa ids `k_BRL`, `mact_BRL`, `mc_BRL`…
// para que la captura de teclas (startCap, setCapturedKey…) funcione sin cambios.
const LONG = 'L';

const TAP_HOLD_OPTION = '<option value="T">Corta / Larga (Tap-Hold)</option>';

/** Bloque "Acción larga" + umbral de una tarjeta. Oculto hasta elegir modo T. */
function tapHoldBlockHtml(code) {
  const L = code + LONG;
  return `
      <div class="th-block" id="th_${code}" style="display:none">
        <div class="lbl">Acción larga (mantener apretado)</div>
        <div class="hint">La acción corta y la larga comparten tipo (mouse/teclado).</div>
        <div id="kb_${L}">${keyFieldHtml(L)}</div>
        <div id="mo_${L}" style="display:none">
          <div class="field" style="margin:0">
            <label class="lbl">Acción del mouse</label>
            <select id="mact_${L}" onchange="onMode('${code}')">
              <option value="1">Clic izquierdo</option>
              <option value="2">Clic derecho</option>
              <option value="4">Clic central</option>
              <option value="SU">Scroll ↑</option>
              <option value="SD">Scroll ↓</option>
            </select>
          </div>
          <label class="mod-cb" id="mantwrap_${L}" style="margin-top:6px"><input type="checkbox" id="mant_${L}"><span>Mantener clic</span></label>
        </div>
        <div id="kb_mods_${L}">
          <div class="field" style="margin:0">
            <label class="lbl">Modificadores</label>
            <div class="mods-grid">
              <label class="mod-cb"><input type="checkbox" id="mc_${L}"><span>Ctrl</span></label>
              <label class="mod-cb"><input type="checkbox" id="ms_${L}"><span>Shift</span></label>
              <label class="mod-cb"><input type="checkbox" id="ma_${L}"><span>Alt</span></label>
              <label class="mod-cb"><input type="checkbox" id="mg_${L}"><span class="mod-gui-lbl">${S.osMode === 'mac' ? '⌘ Cmd' : 'Win'}</span></label>
            </div>
          </div>
        </div>
        <div class="field" style="margin:0">
          <label class="lbl">Umbral de pulsación larga (ms)</label>
          <input type="number" id="th_ms_${code}" min="${TH_MIN_MS}" max="${TH_MAX_MS}" step="20" placeholder="${TH_DEFAULT_MS} (default)">
        </div>
        <div class="hint">La acción corta se ejecuta si soltás el botón antes del umbral. La acción larga se activa apenas mantenés apretado el umbral configurado y se libera al soltar.</div>
      </div>`;
}

/**
 * Agrega o quita, en todas las tarjetas ya construidas, la opción "Tap-Hold" y el
 * bloque de acción larga según `S.soportaTapHold`. Sin soporte no queda ningún rastro.
 */
export function syncTapHoldUI() {
  document.querySelectorAll('.btn-card').forEach((card) => {
    const code = card.id.replace(/^card-/, '');
    const sel = el('m_' + code);
    const th = el('th_' + code);
    if (S.soportaTapHold) {
      if (sel && !sel.querySelector('option[value="T"]')) sel.insertAdjacentHTML('beforeend', TAP_HOLD_OPTION);
      if (!th) el('adv_' + code)?.insertAdjacentHTML('beforeend', tapHoldBlockHtml(code));
    } else {
      if (sel && sel.value === 'T') sel.value = 'P';
      sel?.querySelector('option[value="T"]')?.remove();
      th?.remove();
    }
    onMode(code);
  });
}

/**
 * Cambio de modo de disparo (o del tipo / acción): muestra el bloque largo solo en
 * modo T y ajusta lo que Tap-Hold no admite (en la acción corta no aplica
 * "mantener clic"; en la larga no aplica con scroll).
 */
export function onMode(code) {
  const t = el('t_' + code)?.value;
  const modoT = el('m_' + code)?.value === 'T';
  // Acción corta: "mantener clic (toggle)" no tiene efecto en un tap instantáneo.
  const shortAct = el('mact_' + code);
  const opt1M = shortAct?.querySelector('option[value="1M"]');
  if (opt1M) {
    opt1M.disabled = modoT;
    opt1M.hidden = modoT;
    if (modoT && shortAct.value === '1M') shortAct.value = '1';
  }
  const th = el('th_' + code);
  if (!th) return;
  const L = code + LONG;
  th.style.display = modoT && t !== 'X' ? '' : 'none';
  el('kb_' + L).style.display = t === 'K' ? '' : 'none';
  el('kb_mods_' + L).style.display = t === 'K' ? '' : 'none';
  el('mo_' + L).style.display = t === 'M' ? '' : 'none';
  // "Mantener clic" solo si el tipo es mouse y la acción no es scroll.
  const scroll = ['SU', 'SD'].includes(el('mact_' + L).value);
  el('mantwrap_' + L).style.display = scroll ? 'none' : '';
  if (scroll) el('mant_' + L).checked = false;
}

export function toggleAdv(code) {
  const adv = document.getElementById('adv_' + code);
  const tog = document.getElementById('advtog_' + code);
  if (!adv || !tog) return;
  const open = adv.classList.toggle('open');
  tog.classList.toggle('open', open);
}

/** Texto resumen de una acción (`id` = 'BR' para la corta, 'BRL' para la larga). */
function actionSummary(id, t) {
  if (t === 'M') return el('mact_' + id)?.selectedOptions[0]?.text || '';
  const k = el('k_' + id)?.value || '';
  const mods = ['mc', 'ms', 'ma', 'mg']
    .filter((p) => el(p + '_' + id)?.checked)
    .map((p) => ({ mc: 'Ctrl', ms: 'Shift', ma: 'Alt', mg: S.osMode === 'mac' ? '⌘' : 'Win' })[p]);
  const parts = [...mods, k].filter(Boolean);
  return parts.length ? parts.join('+') : 'sin tecla';
}

export function updateSummary(code) {
  const box = el('sum_' + code);
  if (!box) return;
  const t = el('t_' + code)?.value;
  if (t === 'X') {
    box.textContent = 'Desactivado';
    return;
  }
  let txt = actionSummary(code, t);
  if (el('m_' + code)?.value === 'T' && el('th_' + code)) {
    txt += ' / ' + actionSummary(code + LONG, t) + (t === 'M' && el('mant_' + code + LONG)?.checked ? ' (mantener)' : '');
  }
  box.textContent = txt;
}

export function onType(code) {
  const t = el('t_' + code).value;
  el('act_' + code).style.display = t === 'X' ? 'none' : '';
  if (t !== 'X') {
    el('kb_' + code).style.display = t === 'K' ? '' : 'none';
    el('mo_' + code).style.display = t === 'M' ? '' : 'none';
    const mods = document.getElementById('kb_mods_' + code);
    if (mods) mods.style.display = t === 'K' ? '' : 'none';
  }
  onMode(code);
}

// ── CAPTURA DE TECLAS ────────────────────────────────────
/** @type {string|null} */
let capActive = null;
/** @type {Record<string, (e: KeyboardEvent) => void>} */
const capHandlers = {};

const SKEYS = {
  ' ': 'SPACE',
  Enter: 'ENTER',
  Tab: 'TAB',
  Escape: 'ESC',
  Backspace: 'BACKSPACE',
  Delete: 'DELETE',
  Insert: 'INSERT',
  Home: 'HOME',
  End: 'END',
  PageUp: 'PAGE_UP',
  PageDown: 'PAGE_DOWN',
  ArrowUp: 'UP_ARROW',
  ArrowDown: 'DOWN_ARROW',
  ArrowLeft: 'LEFT_ARROW',
  ArrowRight: 'RIGHT_ARROW',
  F1: 'F1',
  F2: 'F2',
  F3: 'F3',
  F4: 'F4',
  F5: 'F5',
  F6: 'F6',
  F7: 'F7',
  F8: 'F8',
  F9: 'F9',
  F10: 'F10',
  F11: 'F11',
  F12: 'F12',
};

// Chips de teclas especiales para mobile/touch: el teclado en pantalla no tiene
// flechas, F1-F12, Esc, etc. — y tampoco dispara keydown de forma confiable.
const SPECIAL_KEY_CHIPS = [
  { name: 'SPACE', label: 'Espacio' },
  { name: 'ENTER', label: 'Enter' },
  { name: 'TAB', label: 'Tab' },
  { name: 'ESC', label: 'Esc' },
  { name: 'BACKSPACE', label: '⌫' },
  { name: 'DELETE', label: 'Del' },
  { name: 'UP_ARROW', label: '↑' },
  { name: 'DOWN_ARROW', label: '↓' },
  { name: 'LEFT_ARROW', label: '←' },
  { name: 'RIGHT_ARROW', label: '→' },
  { name: 'HOME', label: 'Home' },
  { name: 'END', label: 'End' },
  { name: 'F1', label: 'F1' },
  { name: 'F2', label: 'F2' },
  { name: 'F3', label: 'F3' },
  { name: 'F4', label: 'F4' },
];

// Fija el valor capturado en el input y muestra la confirmación — usado tanto por
// captura de teclado físico (desktop) como por los chips y el input táctil (mobile).
export function setCapturedKey(code, name) {
  const inp = el('k_' + code);
  const hint = el('kh_' + code);
  if (!inp || !hint) return;
  inp.value = name;
  inp.classList.remove('cap-on');
  hint.textContent = '✓ "' + name + '" capturada';
  hint.className = 'hint ok';
  setTimeout(() => {
    hint.textContent = 'Dejar vacío = solo modificadores.';
    hint.className = 'hint';
  }, 2200);
}

// Captura en mobile: el teclado en pantalla dispara "input", no "keydown" de forma
// confiable. Nos quedamos con el último carácter tipeado (así solo queda 1).
export function captureFromInput(code, /** @type {any} */ e) {
  const raw = e.target.value;
  if (!raw) return; // el usuario borró el campo — queda vacío = solo modificadores
  setCapturedKey(code, raw.slice(-1).toLowerCase());
}

export function startCap(code) {
  // Cancelar cualquier captura activa anterior
  if (capActive && capActive !== code) stopCap(capActive);
  capActive = code;
  const inp = el('k_' + code);
  const hint = el('kh_' + code);
  inp.classList.add('cap-on');
  hint.textContent = '⌨️ Presione la tecla…';
  hint.className = 'hint cap';
  // Remover handler anterior si existía, para evitar duplicados
  if (capHandlers[code]) {
    document.removeEventListener('keydown', capHandlers[code], true);
  }
  capHandlers[code] = (e) => {
    if (capActive !== code) return;
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;
    e.preventDefault();
    e.stopPropagation();
    const name = SKEYS[e.key] ?? (e.key.length === 1 ? e.key.toLowerCase() : e.key);
    setCapturedKey(code, name);
    capActive = null;
  };
  document.addEventListener('keydown', capHandlers[code], true);
}

export function stopCap(code) {
  if (capActive !== code) return;
  capActive = null;
  const inp = el('k_' + code);
  const hint = el('kh_' + code);
  inp.classList.remove('cap-on');
  if (hint.classList.contains('cap')) {
    hint.textContent = 'Dejar vacío = solo modificadores.';
    hint.className = 'hint';
  }
}
