// @ts-check
/**
 * Textos de ayuda (tooltips). Se leen de assets/ayudas.txt, formato `clave = texto`
 * (las líneas con # son comentarios). Cada elemento con `data-tip-key="clave"` muestra
 * su texto tras 0,5 s de hover, o al enfocarlo con el teclado; Esc lo cierra.
 *
 * El texto se escribe siempre con `textContent`: nunca se interpreta como HTML.
 */
import { $ } from './dom.js';

/** @type {Record<string, string>} */
const TIPS = {};
const TIP_DELAY = 500;

/** Interpreta el contenido de ayudas.txt. Exportado para poder testearlo. */
export function parseAyudas(/** @type {string} */ txt) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i > 0) out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return out;
}

export async function loadAyudas() {
  try {
    const res = await fetch('./assets/ayudas.txt', { cache: 'no-cache' });
    if (res.ok) Object.assign(TIPS, parseAyudas(await res.text()));
  } catch (_) {
    /* sin ayudas: la app funciona igual */
  }
}

let tipEl = /** @type {any} */ (null);
let timer = /** @type {any} */ (null);
let current = /** @type {any} */ (null);
let usingKeyboard = false;

function showTip(/** @type {HTMLElement} */ el) {
  const txt = TIPS[el.dataset.tipKey || ''];
  if (!txt || !tipEl) return;
  tipEl.textContent = txt;
  tipEl.hidden = false;
  const r = el.getBoundingClientRect();
  const t = tipEl.getBoundingClientRect();
  const x = Math.min(Math.max(8, r.left + r.width / 2 - t.width / 2), innerWidth - t.width - 8);
  let y = r.top - t.height - 8;
  if (y < 8) y = r.bottom + 8;
  tipEl.style.left = x + 'px';
  tipEl.style.top = y + 'px';
}

export function hideTip() {
  clearTimeout(timer);
  if (tipEl) tipEl.hidden = true;
  current = null;
}

export function initAyudas() {
  tipEl = $('#tip');
  document.addEventListener('mouseover', (e) => {
    const el = /** @type {any} */ (e.target).closest?.('[data-tip-key]');
    if (!el) return hideTip();
    if (el === current) return;
    clearTimeout(timer);
    current = el;
    // Con una ayuda ya abierta, pasar a otra elemento la muestra al instante; si no, espera 0,5 s.
    timer = setTimeout(() => showTip(el), tipEl.hidden ? TIP_DELAY : 0);
  });
  document.addEventListener('focusin', (e) => {
    if (!usingKeyboard) return;
    const el = /** @type {any} */ (e.target).closest?.('[data-tip-key]');
    if (el) {
      current = el;
      showTip(el);
    } else hideTip();
  });
  document.addEventListener('keydown', () => { usingKeyboard = true; }, true);
  document.addEventListener('pointerdown', () => { usingKeyboard = false; hideTip(); }, true);
}
