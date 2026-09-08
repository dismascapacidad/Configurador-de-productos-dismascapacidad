// @ts-check
/**
 * Helpers de UI de bajo nivel: toasts, Registro de actividad, cierre de modales,
 * escape de HTML. Sin dependencias del resto de la app.
 */

/**
 * Toast efímero (arriba a la derecha, se va solo a los ~3.2 s).
 * @param {string} ico  emoji / símbolo
 * @param {string} msg
 */
export function toast(ico, msg) {
  const c = document.getElementById('toasts');
  if (!c) return;
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = '<span class="t-ico">' + ico + '</span><span class="t-msg">' + msg + '</span>';
  c.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transition = 'opacity .3s';
    setTimeout(() => t.remove(), 320);
  }, 3200);
}

/**
 * Agrega una línea al Registro de actividad (#logPanel).
 * @param {string} msg
 * @param {'out'|'in'|'w'|''} [dir]  enviado / recibido / warning / info
 */
export function addLog(msg, dir = '') {
  const p = document.getElementById('logPanel');
  if (!p) return;
  const n = new Date();
  const ts = [n.getHours(), n.getMinutes(), n.getSeconds()].map((v) => String(v).padStart(2, '0')).join(':');
  const sym = dir === 'out' ? '↗' : dir === 'in' ? '↙' : dir === 'w' ? '⚠' : '·';
  const cls = dir === 'out' ? 'lo' : dir === 'in' ? 'li' : dir === 'w' ? 'lw' : '';
  const e = document.createElement('div');
  e.className = 'le';
  e.innerHTML =
    '<span class="lt">' + ts + '</span>' +
    '<span class="' + cls + '">' + sym + '</span>' +
    '<span class="lm">' + msg + '</span>';
  p.appendChild(e);
  p.scrollTop = p.scrollHeight;
}

export function clearLog() {
  const p = document.getElementById('logPanel');
  if (p) p.innerHTML = '';
}

/** Escapa `& < >` para interpolar texto de usuario dentro de innerHTML. */
export function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Cierra un modal por id. */
export function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

/** onclick del backdrop de un modal: cierra solo si el click cayó en el fondo. */
export function closeBd(e, id) {
  if (e.target === document.getElementById(id)) closeModal(id);
}
