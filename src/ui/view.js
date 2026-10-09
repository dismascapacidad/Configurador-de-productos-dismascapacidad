// @ts-check
/**
 * La pantalla de configuración con un dispositivo conectado: el bloque de flechas
 * (amarillo), la barra lateral de botones y el detalle del botón elegido.
 *
 * La pantalla se dibuja a partir de `S.cfg` (ver src/model.js). Cada cambio de la
 * persona actualiza `S.cfg` y programa el envío en la cola (`queue`), que decide
 * cuándo y qué se manda al dispositivo.
 */
import { S } from './state.js';
import { $, $$, esc } from './dom.js';
import { queue } from './connection.js';
import * as M from './../model.js';
import * as Protocol from '../protocol.js';
import { DEV_IMAGES } from '../products.js';

// ── Envío ────────────────────────────────────────────────────────────────────

/** Esperas (ms) antes de mandar: clic = casi inmediato; campos de texto/número = que termine de tipear. */
const DELAY_CLICK = 120;
const DELAY_TYPING = 600;

const applyBtn = (/** @type {string} */ code, delay = DELAY_CLICK) =>
  queue.schedule('btn:' + code, () => M.buttonCommands(code, S.cfg.btns[code], S.soportaTapHold), delay);
const applyArrows = (delay = DELAY_CLICK) => queue.schedule('arrows', () => M.arrowCommands(S.cfg.arrows), delay);

// ── Helpers de producto y estado ─────────────────────────────────────────────

const ctx = () => ({ target: S.target, th: S.soportaTapHold });
const arrowSet = () => M.arrowSetOf(S.prod);
const meta = (/** @type {string} */ code) => M.allButtons(S.prod).find((/** @type {any} */ b) => b.code === code);
const arrowsAreButtons = () => !!arrowSet() && S.cfg.arrows.fmode === 0;
const isArrowCode = (/** @type {string} */ code) => !!arrowSet()?.buttons.some((/** @type {any} */ b) => b.code === code);
const getPath = (/** @type {any} */ o, /** @type {string} */ p) => p.split('.').reduce((x, k) => x[k], o);
const setPath = (/** @type {any} */ o, /** @type {string} */ p, /** @type {any} */ v) => {
  const ks = p.split('.');
  const last = /** @type {string} */ (ks.pop());
  ks.reduce((x, k) => x[k], o)[last] = v;
};

// ── Bloque de flechas ────────────────────────────────────────────────────────

function arrowTitle() {
  const set = /** @type {any} */ (arrowSet());
  if (set.plural === 'flechas') return 'Modo de flechas:';
  return set.plural === 'conectores' ? 'Modo de los conectores centrales:' : 'Modo de las entradas externas:';
}

export function renderArrows() {
  const set = arrowSet();
  $('#secArrows').hidden = !set;
  if (!set) return;
  $('#arrowsTitle').textContent = arrowTitle();
  const modes = [
    [1, 'Mueven el cursor'],
    [2, 'Teclas de flecha ↑↓←→'],
    [0, 'Acción individual por ' + set.noun],
  ];
  $('#arrowPills').innerHTML = modes
    .map(
      ([v, label]) =>
        `<button type="button" class="pill" role="radio" aria-checked="${S.cfg.arrows.fmode === v}" data-act="arrow-mode" data-v="${v}" data-tip-key="arrow_${v}">${esc(label)}</button>`,
    )
    .join('');
  syncArrowControls();
}

function syncArrowControls() {
  const a = S.cfg.arrows;
  $$('#arrowPills .pill').forEach((b) => b.setAttribute('aria-checked', String(+b.dataset.v === a.fmode)));
  $('#orient').value = String(a.orient);
  $('#vel').value = a.vel;
  $('#velOut').textContent = a.vel;
  $('#acel').checked = a.acel;
  $('#acelTxt').textContent = a.acel ? 'Activada' : 'Desactivada';
  const open = a.fmode === 1 || a.fmode === 2;
  $('#arrowOpts').classList.toggle('open', open);
  $('#arrowOpts').inert = !open;
  $$('#arrowOpts .ctl').forEach((c) => {
    c.hidden = !c.dataset.modes.split(' ').includes(String(a.fmode));
  });
}

function setArrowMode(/** @type {number} */ v) {
  const was = arrowsAreButtons();
  S.cfg.arrows.fmode = v;
  syncArrowControls();
  if (was && v !== 0 && isArrowCode(S.selected)) S.selected = S.prod.mainBtns[0].code;
  renderSide(!was && v === 0);
  renderDetail();
  applyArrows();
}

// ── Barra lateral ────────────────────────────────────────────────────────────

const lastWord = (/** @type {string} */ t) => t.split(' ').pop() || t;

export function renderSide(animateArrows = false) {
  const p = S.prod;
  const set = arrowSet();
  const item = (/** @type {any} */ b) => `
    <button type="button" class="side-item" data-act="select" data-code="${b.code}" aria-current="${S.selected === b.code}">
      <span class="dot" style="background:${esc(b.color)}"></span>
      <span class="side-txt"><span class="side-name">${esc(b.label)}</span><span class="side-sum" data-sum="${b.code}">${esc(M.shortSummary(S.cfg.btns[b.code], ctx()))}</span></span>
    </button>`;
  const sq = (/** @type {any} */ b) =>
    `<button type="button" class="side-item sq arrow${animateArrows ? ' enter' : ''}" data-act="select" data-code="${b.code}" aria-current="${S.selected === b.code}" aria-label="${esc(b.label)}" title="${esc(b.label)}">${esc(lastWord(b.label))}</button>`;
  let h = `<div class="devcard"><img src="${esc(DEV_IMAGES[/** @type {keyof typeof DEV_IMAGES} */ (p.id)] || '')}" alt=""><div><div class="dn">${esc(p.name)}</div><div class="dm">${esc(connText())}${S.fw ? ' · ' + esc(S.fw) : ''}</div></div></div>`;
  h += `<div class="side-group">${p.mainBtns.length > 1 || set ? 'Botones' : 'Botón'}</div>` + p.mainBtns.map(item).join('');
  if (set && arrowsAreButtons()) {
    h += `<div class="side-group arrow">${esc(set.group)}</div><div class="arrow-grid">${set.buttons.map(sq).join('')}</div>`;
  }
  $('#side').innerHTML = h;
}

export const connText = () => (S.connType === 'ble' ? 'Bluetooth' : 'USB');

// ── Detalle del botón ────────────────────────────────────────────────────────

const seg = (/** @type {any[][]} */ items, /** @type {string} */ f, /** @type {string} */ cur) =>
  items
    .map(
      ([v, label, tipKey]) =>
        `<button type="button" class="chip" role="radio" aria-checked="${cur === v}" data-f="${f}" data-v="${v}" ${tipKey ? `data-tip-key="${tipKey}"` : ''}>${esc(label)}</button>`,
    )
    .join('');

const modChips = (/** @type {string} */ prefix) =>
  M.MODS.map((k) => {
    const l = M.MOD_NAMES[S.target][k].l;
    const [sym, ...w] = S.target === 'mac' ? l.split(' ') : [l];
    const inner = S.target === 'mac' ? `<span>${esc(sym)}</span><span class="mword"> ${esc(w.join(' '))}</span>` : esc(l);
    return `<button type="button" class="chip" aria-pressed="false" aria-label="${esc(l)}" title="${esc(l)}" data-f="${prefix}mods.${k}" data-toggle="1">${inner}</button>`;
  }).join('');

const keyBox = (/** @type {string} */ prefix) =>
  `<button type="button" class="keybox empty" data-act="cap" data-f="${prefix}key" data-tip-key="key">Hacé clic y apretá una tecla</button><button type="button" class="chip" data-act="clear-key" data-f="${prefix}key" aria-label="Quitar tecla" style="padding:0 10px" hidden>✕</button>`;

const mouseSel = (/** @type {string[][]} */ list, /** @type {string} */ f) =>
  `<select data-f="${f}" data-tip-key="mouse" aria-label="Acción del mouse">${list.map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join('')}</select>`;

/** Bloque que aparece o desaparece con animación según `syncDetail`. */
const R = (/** @type {string} */ cond, /** @type {string} */ inner) => `<div class="reveal" data-r="${cond}"><div>${inner}</div></div>`;
const step = (/** @type {string} */ lead, /** @type {string} */ fields) => `<div class="step"><div class="lead">${lead}</div><div class="fields">${fields}</div></div>`;

const debounceInput = (/** @type {string} */ unit) =>
  `<input type="number" data-f="debounce" min="0" max="5000" step="50" aria-label="Milisegundos de filtro de rebote"><span class="unit">${unit}</span>`;

/** Misma estructura para toda acción (única, corta o larga): qué tecla / qué hace el mouse. */
const actionFields = (/** @type {string} */ p) =>
  R('K', step('Va a escribir la tecla', keyBox(p))) +
  R('K', step('Junto con', `<div class="seg" data-tip-key="mods">${modChips(p)}</div>`)) +
  R('M', step('Va a hacer', mouseSel(p === 'long.' ? M.MOUSE_LONG : M.MOUSE_SHORT, p + 'mouse')));

export function renderDetail() {
  const code = S.selected;
  const m = meta(code);
  const b = S.cfg.btns[code];
  if (!m || !b) return;
  const set = arrowSet();
  const isArrow = isArrowCode(code);
  const modos = [
    ['P', 'Al presionar', 'modo_P'],
    ['R', 'Al soltar', 'modo_R'],
    ['O', 'Una vez por pulsación', 'modo_O'],
  ];
  const d = $('#detail');
  d.classList.toggle('arrow-mode', isArrow);
  d.innerHTML = `
    <div class="d-head">
      <span class="dot" style="background:${esc(m.color)}"></span><h2>${esc(m.label)}${m.note ? ` <small style="font-weight:500;color:var(--p-text2)">· ${esc(m.note)}</small>` : ''}</h2>
      <div class="push" id="pulseWrap">
        <span class="mini">Pulsación:</span>
        <div class="seg" role="radiogroup" aria-label="Tipo de pulsación">
          <button type="button" class="chip" role="radio" data-act="pulse" data-v="single" data-tip-key="pulse_single">Una sola acción</button>
          <button type="button" class="chip" role="radio" data-act="pulse" data-v="dual" data-tip-key="pulse_dual">Corta y larga</button>
        </div>
      </div>
    </div>
    <div class="d-body">
      ${R('always', step(`${isArrow && set ? (set.article === 'la' ? 'Esta ' : 'Este ') + set.noun : 'Este botón'} va a funcionar como`, `<div class="seg" role="radiogroup">${seg([['K', 'Teclado', 'tipo_K'], ['M', 'Mouse', 'tipo_M'], ['X', 'Desactivado', 'tipo_X']], 'tipo', b.tipo)}</div>`))}

      ${R('single', `<div class="acard single">
        <div class="acard-head"><span class="t">Acción</span><span class="sub">cada vez que lo uso</span></div>
        ${actionFields('')}
        ${R('always', step('Y lo va a hacer', `<div class="seg" role="radiogroup">${seg(modos, 'modo', b.modo)}</div>`))}
        <div data-tip-key="debounce">${step('Ignorar rebotes durante', debounceInput('ms'))}</div>
      </div>`)}

      ${R('dual', `<div class="duo">
        <div class="acard">
          <div class="acard-head"><span class="t">Pulsación corta</span><span class="sub">si lo toco y lo suelto rápido</span></div>
          ${actionFields('')}
        </div>
        <div class="acard">
          <div class="acard-head"><span class="t">Pulsación larga</span><span class="s"><span class="sub">si lo mantengo más de</span>
            <input type="number" data-f="umbral" min="${Protocol.TH_MIN_MS}" max="${Protocol.TH_MAX_MS}" step="50" placeholder="${Protocol.TH_DEFAULT_MS}" data-tip-key="umbral" aria-label="Milisegundos para pulsación larga"><span class="sub">ms</span></span></div>
          ${actionFields('long.')}
        </div>
        <div class="acard wide" data-tip-key="debounce">${step('Ignorar rebotes durante', debounceInput('ms · vale para las dos pulsaciones'))}</div>
      </div>`)}
    </div>
    <div class="d-foot"><div class="result" id="result"></div></div>`;
  syncDetail(true);
}

/** Refleja `S.cfg` en los controles del detalle y decide qué bloques se ven. */
function syncDetail(first = false) {
  const code = S.selected;
  const b = S.cfg.btns[code];
  if (!b) return;
  const dual = M.isDual(b, S.soportaTapHold);
  // En la acción corta de "corta y larga" no existe "mantener clic": el clic corto es instantáneo.
  let changed = false;
  if (dual && b.mouse === '1M') {
    b.mouse = '1';
    changed = true;
  }
  const vis = /** @type {Record<string, boolean>} */ ({ always: true, K: b.tipo === 'K', M: b.tipo === 'M' });
  vis.single = b.tipo !== 'X' && !dual;
  vis.dual = b.tipo !== 'X' && dual;
  $$('#detail .reveal').forEach((r) => {
    const on = !!vis[r.dataset.r];
    if (first) r.style.transition = 'none';
    r.classList.toggle('open', on);
    r.inert = !on;
    if (first) {
      void r.offsetWidth;
      r.style.transition = '';
    }
  });
  // El interruptor de pulsación solo existe con firmware compatible y botón activo.
  const pw = $('#pulseWrap');
  pw.hidden = !(S.soportaTapHold && b.tipo !== 'X');
  $$('[data-act="pulse"]', pw).forEach((c) => c.setAttribute('aria-checked', String((c.dataset.v === 'dual') === dual)));
  $$('#detail select[data-f="mouse"] option[value="1M"]').forEach((o) => {
    o.disabled = dual;
    o.hidden = dual;
  });
  $$('#detail [data-f]').forEach((c) => {
    const f = c.dataset.f;
    if (c.dataset.act === 'clear-key' || c.dataset.act === 'pulse') return;
    const val = getPath(b, f);
    if (c.classList.contains('keybox')) {
      c.textContent = val ? M.keyLabel(val) : 'Hacé clic y apretá una tecla';
      c.classList.toggle('empty', !val);
      const clr = c.nextElementSibling;
      if (clr) clr.hidden = !val;
    } else if (c.dataset.toggle) c.setAttribute('aria-pressed', String(!!val));
    else if (c.dataset.v !== undefined) c.setAttribute('aria-checked', String(val === c.dataset.v));
    else if (c.tagName === 'SELECT') c.value = val;
    else if (c.type === 'number' && document.activeElement !== c) c.value = val === 0 && f === 'umbral' ? '' : val;
  });
  $('#result').textContent = M.sentence(/** @type {any} */ (meta(code)), b, ctx());
  const sum = $(`[data-sum="${code}"]`);
  if (sum) sum.textContent = M.shortSummary(b, ctx());
  if (changed && !first) applyBtn(code);
}

/** Una sola acción ⇄ corta y larga. Al pasar a "corta y larga" la larga arranca copiando la corta. */
function setPulse(/** @type {string} */ v) {
  const b = S.cfg.btns[S.selected];
  if (v === 'dual') {
    b.modo = 'T';
    const L = b.long;
    if (b.tipo === 'K' && !L.key && !M.modsText(L.mods, 'win').length) {
      L.key = b.key;
      L.mods = { ...b.mods };
    }
    if (b.tipo === 'M' && L.mouse === '1') L.mouse = b.mouse === '1D' ? '1' : b.mouse;
  } else b.modo = 'P';
  syncDetail();
  applyBtn(S.selected);
}

/** Redibuja todo lo que depende de producto / configuración / sistema de destino. */
export function renderAll() {
  renderArrows();
  renderSide();
  renderDetail();
}

// ── Captura de tecla ─────────────────────────────────────────────────────────

let capEl = /** @type {any} */ (null);

function stopCap() {
  if (!capEl) return;
  capEl.classList.remove('cap');
  capEl = null;
  syncDetail();
}

// ── Eventos ──────────────────────────────────────────────────────────────────

const ACTS = new Set(['select', 'arrow-mode', 'pulse', 'cap', 'clear-key']);

export function initView() {
  document.addEventListener(
    'keydown',
    (e) => {
      if (!capEl) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        return stopCap();
      }
      const token = M.tokenFromEventKey(e.key);
      if (!token) return; // un modificador solo no es una tecla: se sigue esperando
      e.preventDefault();
      e.stopPropagation();
      setPath(S.cfg.btns[S.selected], capEl.dataset.f, token);
      const el = capEl;
      capEl = null;
      el.classList.remove('cap');
      syncDetail();
      applyBtn(S.selected);
    },
    true,
  );

  document.addEventListener('click', (e) => {
    const t = /** @type {any} */ (e.target).closest?.('[data-act],[data-f]');
    if (capEl && !(t && t === capEl)) stopCap();
    if (!t || !S.connected || !S.prod) return;
    const act = t.dataset.act;
    if (act) {
      if (!ACTS.has(act)) return;
      if (act === 'select') {
        S.selected = t.dataset.code;
        $$('.side-item').forEach((i) => i.setAttribute('aria-current', String(i.dataset.code === S.selected)));
        renderDetail();
      } else if (act === 'arrow-mode') setArrowMode(+t.dataset.v);
      else if (act === 'pulse') setPulse(t.dataset.v);
      else if (act === 'cap') {
        stopCap();
        capEl = t;
        t.classList.add('cap');
        t.textContent = 'Apretá la tecla…';
      } else if (act === 'clear-key') {
        setPath(S.cfg.btns[S.selected], t.dataset.f, '');
        syncDetail();
        applyBtn(S.selected);
      }
      return;
    }
    if (t.dataset.f && t.closest('#detail')) {
      const b = S.cfg.btns[S.selected];
      if (t.dataset.toggle) setPath(b, t.dataset.f, !getPath(b, t.dataset.f));
      else if (t.dataset.v !== undefined) setPath(b, t.dataset.f, t.dataset.v);
      else return;
      syncDetail();
      applyBtn(S.selected);
    }
  });

  document.addEventListener('input', (e) => {
    const t = /** @type {any} */ (e.target);
    if (!S.connected || !S.prod) return;
    if (t.id === 'vel') {
      S.cfg.arrows.vel = +t.value;
      $('#velOut').textContent = t.value; // se envía recién al soltar el deslizador (evento change)
      return;
    }
    if (t.dataset?.f && t.type === 'number' && t.closest('#detail')) {
      const b = S.cfg.btns[S.selected];
      const raw = t.value.trim();
      setPath(b, t.dataset.f, t.dataset.f === 'umbral' ? raw : Math.min(5000, Math.max(0, parseInt(raw, 10) || 0)));
      applyBtn(S.selected, DELAY_TYPING);
      $('#result').textContent = M.sentence(/** @type {any} */ (meta(S.selected)), b, ctx());
    }
  });

  document.addEventListener('change', (e) => {
    const t = /** @type {any} */ (e.target);
    if (!S.connected || !S.prod) return;
    if (t.id === 'vel') {
      S.cfg.arrows.vel = +t.value;
      applyArrows();
    } else if (t.id === 'orient') {
      S.cfg.arrows.orient = +t.value;
      applyArrows();
    } else if (t.id === 'acel') {
      S.cfg.arrows.acel = t.checked;
      $('#acelTxt').textContent = t.checked ? 'Activada' : 'Desactivada';
      applyArrows();
    } else if (t.tagName === 'SELECT' && t.dataset.f && t.closest('#detail')) {
      setPath(S.cfg.btns[S.selected], t.dataset.f, t.value);
      syncDetail();
      applyBtn(S.selected);
    }
  });
}
