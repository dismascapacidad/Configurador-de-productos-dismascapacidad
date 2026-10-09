// @ts-check
/**
 * Helpers de DOM de bajo nivel: selectores, toasts y Registro de actividad.
 *
 * Todo texto que llega de afuera (líneas del dispositivo, mensajes de error) se
 * escribe con `textContent`: nunca se interpreta como HTML.
 */

/** @param {string} sel @param {ParentNode} [root] */
export const $ = (sel, root = document) => /** @type {any} */ (root.querySelector(sel));

/** @param {string} sel @param {ParentNode} [root] */
export const $$ = (sel, root = document) => /** @type {any[]} */ (Array.from(root.querySelectorAll(sel)));

/** Escapa `& < > " '` para interpolar texto dentro de un template de HTML. */
export function esc(/** @type {any} */ s) {
  return String(s).replace(/[&<>"']/g, (c) => /** @type {any} */ ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

export const sleep = (/** @type {number} */ ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Aviso efímero (se va solo a los ~3,2 s).
 * @param {string} ico emoji o símbolo
 * @param {string} msg
 */
export function toast(ico, msg) {
  const c = document.getElementById('toasts');
  if (!c) return;
  const t = document.createElement('div');
  t.className = 'toast';
  t.setAttribute('role', 'status');
  const i = document.createElement('span');
  i.className = 't-ico';
  i.textContent = ico;
  const m = document.createElement('span');
  m.className = 't-msg';
  m.textContent = msg;
  t.append(i, m);
  c.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    setTimeout(() => t.remove(), 320);
  }, 3200);
}

/**
 * Línea del Registro de actividad.
 * @param {string} msg
 * @param {'out'|'in'|'w'|''} [dir] enviado / recibido / aviso / info
 */
export function addLog(msg, dir = '') {
  const p = document.getElementById('logPanel');
  if (!p) return;
  const n = new Date();
  const ts = [n.getHours(), n.getMinutes(), n.getSeconds()].map((v) => String(v).padStart(2, '0')).join(':');
  const row = document.createElement('div');
  row.className = 'le';
  const t = document.createElement('span');
  t.className = 'lt';
  t.textContent = ts;
  const s = document.createElement('span');
  s.className = dir === 'out' ? 'lo' : dir === 'in' ? 'li' : dir === 'w' ? 'lw' : '';
  s.textContent = dir === 'out' ? '↗' : dir === 'in' ? '↙' : dir === 'w' ? '⚠' : '·';
  const m = document.createElement('span');
  m.className = 'lm';
  m.textContent = msg;
  row.append(t, s, m);
  p.appendChild(row);
  while (p.childElementCount > 500) p.firstElementChild?.remove();
  p.scrollTop = p.scrollHeight;
}

export function clearLog() {
  const p = document.getElementById('logPanel');
  if (p) p.textContent = '';
}

/** Muestra u oculta un modal (atributo `hidden`). */
export function setModal(/** @type {string} */ id, /** @type {boolean} */ open) {
  const el = document.getElementById(id);
  if (el) el.hidden = !open;
}
