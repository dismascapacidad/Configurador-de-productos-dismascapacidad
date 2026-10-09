// @ts-check
/**
 * Lo que rodea a la pantalla de configuración: tema claro/oscuro, sistema de destino
 * (Windows/Mac), modales (conectar, elegir modelo, resumen al desconectar, Registro),
 * barra de estado, saludo y cambio entre "sin dispositivo" y "con dispositivo".
 *
 * Todo texto que viene de afuera se escribe con `textContent` o pasando por `esc()`.
 */
import { S } from './state.js';
import { $, $$, esc, clearLog, setModal } from './dom.js';
import { isIOS, isMacOS } from './platform.js';
import { connect, disconnect, send, events } from './connection.js';
import { renderAll, connText } from './view.js';
import * as M from '../model.js';
import { PRODUCTS, DEV_IMAGES } from '../products.js';

const THEME_KEY = 'epe-tema';
const TARGET_KEY = 'epe-destino';
const OLD_TARGET_KEY = 'displus_os_mode'; // la versión anterior guardaba acá "win" | "mac"
const SEEN_KEY = 'epe-visto';

// ── Tema ─────────────────────────────────────────────────────────────────────

function initTheme() {
  $('#themeBtn').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch (_) {
      /* sin almacenamiento: vale solo para esta sesión */
    }
  });
}

// ── Sistema donde se USA el dispositivo ──────────────────────────────────────

function syncTarget() {
  $$('#destSeg .chip').forEach((/** @type {HTMLElement} */ c) => c.setAttribute('aria-checked', String(c.dataset.v === S.target)));
}

function initTarget() {
  /** @type {'win'|'mac'} */
  let t = isMacOS() ? 'mac' : 'win';
  try {
    const v = localStorage.getItem(TARGET_KEY) || localStorage.getItem(OLD_TARGET_KEY);
    if (v === 'win' || v === 'mac') t = v;
  } catch (_) {
    /* sin almacenamiento */
  }
  S.target = t;
  syncTarget();
}

function setTarget(/** @type {'win'|'mac'} */ v) {
  S.target = v;
  try {
    localStorage.setItem(TARGET_KEY, v);
  } catch (_) {
    /* sin almacenamiento */
  }
  syncTarget();
  if (S.connected && S.prod) renderAll();
}

// ── Conectar ─────────────────────────────────────────────────────────────────

let connecting = false;

function openConnect() {
  $('#cmChoose').hidden = false;
  $('#cmWait').hidden = true;
  // iPhone/iPad: ningún navegador permite Web Bluetooth.
  const ble = $('#optBle');
  const off = isIOS();
  ble.disabled = off;
  $('#optBleSub').textContent = off ? 'No disponible en iPhone/iPad' : 'Con el dispositivo encendido y cerca.';
  setModal('connectModal', true);
}

function closeConnect() {
  setModal('connectModal', false);
}

async function pickConn(/** @type {'usb'|'ble'} */ type) {
  if (connecting) return;
  connecting = true;
  $('#cmChoose').hidden = true;
  $('#cmWait').hidden = false;
  $('#cmWaitTitle').textContent = 'Esperando permiso…';
  $('#cmWaitTxt').textContent =
    type === 'ble'
      ? 'Mirá la ventana del navegador: elegí tu dispositivo en la lista de Bluetooth y tocá “Conectar”. Si no aparece, quitalo antes de Configuración → Bluetooth del sistema.'
      : 'Mirá la ventana del navegador: elegí tu dispositivo en la lista y tocá “Conectar”.';
  try {
    const r = await connect(type);
    if (r !== 'ok' && !S.connected) {
      // Canceló el selector o falló (el motivo ya se avisó): vuelve a elegir.
      $('#cmChoose').hidden = false;
      $('#cmWait').hidden = true;
    }
  } finally {
    connecting = false;
  }
}

// ── Elegir modelo (firmware sin WHO) ─────────────────────────────────────────

/** @type {((id: string|null) => void) | null} */
let prodResolve = null;

function chooseProduct() {
  const list = $('#prodList');
  list.textContent = '';
  for (const p of /** @type {any[]} */ (Object.values(PRODUCTS))) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn';
    b.dataset.act = 'prod-pick';
    b.dataset.id = p.id;
    b.textContent = p.name;
    list.appendChild(b);
  }
  closeConnect();
  setModal('prodModal', true);
  return new Promise((resolve) => {
    prodResolve = resolve;
  });
}

function resolveProduct(/** @type {string|null} */ id) {
  setModal('prodModal', false);
  const r = prodResolve;
  prodResolve = null;
  if (r) r(id);
}

// ── Resumen al desconectar ───────────────────────────────────────────────────

function askDisconnect() {
  const p = S.prod;
  if (!p) return;
  const set = M.arrowSetOf(p);
  const ctx = { target: S.target, th: S.soportaTapHold };
  const arrowsAreButtons = !!set && S.cfg.arrows.fmode === 0;
  let h = '';
  if (set) h += `<div class="sum-sec arrow">${esc(set.group)}</div><div class="sum-row">${esc(M.arrowsSentence(S.cfg.arrows, set))}</div>`;
  h += '<div class="sum-sec">Botones</div>';
  const list = [...p.mainBtns, ...(arrowsAreButtons && set ? set.buttons : [])];
  h += list
    .map((/** @type {any} */ b) => `<div class="sum-row"><span class="dot" style="background:${esc(b.color)}"></span><span>${esc(M.sentence(b, S.cfg.btns[b.code], ctx))}</span></div>`)
    .join('');
  if (S.connType === 'ble') {
    h += '<div class="sum-note">Para usarlo: después de desconectar, conectalo desde <b>Windows → Configuración → Bluetooth</b> (o el Bluetooth de tu sistema).</div>';
  }
  $('#discBody').innerHTML = h; // solo texto escapado con esc() y literales propios
  setModal('discModal', true);
}

async function confirmDisconnect() {
  setModal('discModal', false);
  await disconnect(false);
}

// ── Barra de estado, vistas y saludo ─────────────────────────────────────────

function setSaving(/** @type {boolean} */ on) {
  $('#saveState').classList.toggle('busy', on);
  $('#saveText').textContent = on ? 'Guardando en el dispositivo…' : 'Todo guardado en el dispositivo';
}

function showDevice() {
  const p = S.prod;
  $('#viewEmpty').hidden = true;
  $('#viewDevice').hidden = false;
  $('#connWrap').hidden = false;
  $('#connLabel').textContent = `${p.name} · ${connText()}`;
  $('#bleNotice').hidden = S.connType !== 'ble';
  $('#sbDot').classList.add('on');
  $('#sbText').textContent = `${p.name} · ${connText()}${S.fw ? ' · ' + S.fw : ''}`;
  $('#saveState').hidden = false;
  setSaving(false);
}

function showEmpty() {
  $('#viewDevice').hidden = true;
  $('#viewEmpty').hidden = false;
  $('#connWrap').hidden = true;
  $('#sbDot').classList.remove('on');
  $('#sbText').textContent = 'Sin dispositivo';
  $('#saveState').hidden = true;
  const how = $('#howTo');
  if (how) how.open = false; // quien ya la usó no necesita la guía abierta
}

function greet() {
  const p = S.prod;
  const g = $('#greet');
  $('#greetImg').src = /** @type {any} */ (DEV_IMAGES)[p.id] || '';
  $('#greetTxt').textContent = '¡Hola, ' + p.name + '!';
  g.classList.remove('show');
  void g.offsetWidth;
  g.classList.add('show');
}

// ── Registro ─────────────────────────────────────────────────────────────────

async function sendManual(/** @type {Event} */ e) {
  e.preventDefault();
  const inp = $('#logCmd');
  const cmd = inp.value.trim();
  if (!cmd) return;
  if (await send(cmd)) inp.value = '';
}

// ── Arranque ─────────────────────────────────────────────────────────────────

const MODALS = ['connectModal', 'discModal', 'logModal'];

export function initChrome() {
  initTheme();
  initTarget();
  try {
    if (localStorage.getItem(SEEN_KEY)) $('#howTo').open = false;
  } catch (_) {
    /* primera vez */
  }

  events.connected = () => {
    $('#cmWaitTitle').textContent = 'Leyendo el dispositivo…';
    $('#cmWaitTxt').textContent = 'Un momento: se está leyendo cómo está configurado.';
  };
  events.chooseProduct = chooseProduct;
  events.loaded = () => {
    closeConnect();
    showDevice();
    renderAll();
    try {
      localStorage.setItem(SEEN_KEY, '1');
    } catch (_) {
      /* opcional */
    }
    greet();
  };
  events.disconnected = () => {
    for (const id of MODALS) setModal(id, false);
    resolveProduct(null);
    showEmpty();
  };
  events.busy = setSaving;

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!$('#prodModal').hidden) return resolveProduct(null);
    for (const id of MODALS) setModal(id, false);
  });
  // Clic en el fondo oscuro cierra el Registro y el resumen (no el de conectar: puede estar esperando permiso).
  document.addEventListener('mousedown', (e) => {
    const t = /** @type {HTMLElement} */ (e.target);
    if (t.id === 'logModal' || t.id === 'discModal') setModal(t.id, false);
  });

  document.addEventListener('click', (e) => {
    const t = /** @type {any} */ (e.target).closest?.('[data-act]');
    if (!t) return;
    switch (t.dataset.act) {
      case 'target':
        return setTarget(t.dataset.v);
      case 'open-connect':
        return openConnect();
      case 'close-connect':
      case 'cancel-connect':
        return closeConnect();
      case 'pick-conn':
        return void pickConn(t.dataset.type);
      case 'prod-pick':
        return resolveProduct(t.dataset.id);
      case 'prod-cancel':
        return resolveProduct(null);
      case 'ask-disconnect':
        return askDisconnect();
      case 'close-disc':
        return setModal('discModal', false);
      case 'confirm-disc':
        return void confirmDisconnect();
      case 'open-log':
        return setModal('logModal', true);
      case 'close-log':
        return setModal('logModal', false);
      case 'clear-log':
        return clearLog();
    }
  });
  $('#logForm').addEventListener('submit', sendManual);
}
