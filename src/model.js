// @ts-check
/**
 * Modelo de la configuración (sin DOM).
 *
 * Qué hay acá:
 *  - El estado de cada botón y del bloque de flechas, con valores por defecto.
 *  - La conversión entre ese estado y el protocolo: `specOf` (estado → `ButtonSpec`
 *    de protocol.js) y `fromDevice` (respuesta de GETALL → estado).
 *  - Las frases en lenguaje natural que se leen en la pantalla.
 *  - `SendQueue`: la cola que decide cuándo y qué se manda al dispositivo.
 *
 * Todo es testeable sin navegador (ver tests/model.test.js).
 */
import * as Protocol from './protocol.js';

// ── Nombres de teclas ────────────────────────────────────────────────────────

/** Letra de cada modificador, en el orden en que se muestran. */
export const MODS = /** @type {const} */ (['c', 's', 'a', 'g']);

/**
 * Nombres de los modificadores según el sistema donde se USA el dispositivo.
 * `l` = nombre largo (chips), `s` = nombre corto (frases y resúmenes).
 */
export const MOD_NAMES = {
  win: {
    c: { l: 'Ctrl', s: 'Ctrl' },
    s: { l: 'Shift', s: 'Shift' },
    a: { l: 'Alt', s: 'Alt' },
    g: { l: 'Win', s: 'Win' },
  },
  mac: {
    c: { l: '⌃ Control', s: '⌃' },
    s: { l: '⇧ Shift', s: '⇧' },
    a: { l: '⌥ Option', s: '⌥' },
    g: { l: '⌘ Command', s: '⌘' },
  },
};

/** Cómo se muestran las teclas especiales. */
const KEY_LABEL = {
  SPACE: 'Espacio', ENTER: 'Enter', TAB: 'Tab', ESC: 'Esc', BACKSPACE: '⌫ Borrar', DELETE: 'Supr',
  INSERT: 'Insert', HOME: 'Inicio', END: 'Fin', PAGE_UP: 'Re Pág', PAGE_DOWN: 'Av Pág',
  UP_ARROW: '↑', DOWN_ARROW: '↓', LEFT_ARROW: '←', RIGHT_ARROW: '→',
};

/** `KeyboardEvent.key` → token del protocolo (para capturar una tecla apretada). */
export const KEY_FROM_EVENT = (() => {
  /** @type {Record<string, string>} */
  const m = {
    ' ': 'SPACE', Enter: 'ENTER', Tab: 'TAB', Escape: 'ESC', Backspace: 'BACKSPACE', Delete: 'DELETE',
    Insert: 'INSERT', Home: 'HOME', End: 'END', PageUp: 'PAGE_UP', PageDown: 'PAGE_DOWN',
    ArrowUp: 'UP_ARROW', ArrowDown: 'DOWN_ARROW', ArrowLeft: 'LEFT_ARROW', ArrowRight: 'RIGHT_ARROW',
  };
  for (let i = 1; i <= 12; i++) m['F' + i] = 'F' + i;
  return m;
})();

/**
 * Token que guarda el estado para la tecla que se apretó. Devuelve `''` si no se
 * puede usar (modificadores solos, teclas muertas, etc.).
 * @param {string} eventKey `KeyboardEvent.key`
 */
export function tokenFromEventKey(eventKey) {
  if (['Control', 'Shift', 'Alt', 'Meta', 'AltGraph', 'CapsLock', 'Dead', 'Unidentified'].includes(eventKey)) return '';
  if (KEY_FROM_EVENT[eventKey]) return KEY_FROM_EVENT[eventKey];
  if (eventKey.length === 1) return eventKey.toLowerCase();
  return '';
}

/** Texto legible de un token de tecla (`'ENTER'` → `'Enter'`, `'a'` → `'A'`, `'#123'` → `'Tecla #123'`). */
export function keyLabel(/** @type {string} */ k) {
  if (!k) return '';
  if (/^#\d+$/.test(k)) return 'Tecla ' + k;
  return /** @type {any} */ (KEY_LABEL)[k] || (k.length === 1 ? k.toUpperCase() : k);
}

/** Código numérico de tecla (de BTN:) → token de tecla del estado. */
export function keyFromWire(/** @type {number} */ accion) {
  const rev = Protocol.REV_KEY[String(accion)];
  if (rev) return rev;
  if (accion > 32 && accion < 127) return String.fromCharCode(accion).toLowerCase();
  if (accion > 0) return '#' + accion;
  return '';
}

/** Token del estado → el que espera `buildButtonCfg` (`'#123'` viaja como `'123'`). */
function keyToSpec(/** @type {string} */ k) {
  return /^#\d+$/.test(k) ? k.slice(1) : k;
}

// ── Mouse ────────────────────────────────────────────────────────────────────

/** Acciones del mouse para la pulsación única / corta. */
export const MOUSE_SHORT = [
  ['1', 'Clic izquierdo'],
  ['1D', 'Doble clic izquierdo'],
  ['1M', 'Mantener clic izquierdo (alterna)'],
  ['2', 'Clic derecho'],
  ['4', 'Clic central'],
  ['SU', 'Scroll hacia arriba'],
  ['SD', 'Scroll hacia abajo'],
];

/** Acciones del mouse para la pulsación larga ("1M" = mantener apretado mientras dure). */
export const MOUSE_LONG = [
  ['1', 'Clic izquierdo'],
  ['1M', 'Mantener clic izquierdo'],
  ['2', 'Clic derecho'],
  ['4', 'Clic central'],
  ['SU', 'Scroll hacia arriba'],
  ['SD', 'Scroll hacia abajo'],
];

/** @param {string} v @param {boolean} [long] */
export function mouseLabel(v, long = false) {
  const hit = (long ? MOUSE_LONG : MOUSE_SHORT).find(([x]) => x === v);
  return hit ? hit[1] : v;
}

/** Modos de disparo de la pulsación única. */
export const MODO_TEXT = { P: 'Al presionar', R: 'Al soltar', O: 'Una vez por pulsación' };

// ── Estado ───────────────────────────────────────────────────────────────────

/**
 * @typedef {{ c: boolean, s: boolean, a: boolean, g: boolean }} Mods
 * @typedef {{ key: string, mods: Mods, mouse: string }} LongAction
 * @typedef {Object} Btn
 * @property {'K'|'M'|'X'} tipo
 * @property {'P'|'R'|'O'|'T'} modo  'T' = corta y larga (solo firmware -TH)
 * @property {number} debounce
 * @property {string} key
 * @property {Mods} mods
 * @property {string} mouse
 * @property {string} umbral  ms como texto; '' = el del firmware
 * @property {LongAction} long
 * @typedef {{ fmode: number, orient: number, vel: number, acel: boolean }} Arrows
 */

export const newMods = () => ({ c: false, s: false, a: false, g: false });

/** @returns {Btn} */
export function newButton(/** @type {'K'|'M'|'X'} */ tipo = 'M', mouse = '1', key = '') {
  return {
    tipo, modo: 'P', debounce: 0, key, mods: newMods(), mouse, umbral: '',
    long: { key: '', mods: newMods(), mouse: '1' },
  };
}

/** @returns {Arrows} */
export const newArrows = () => ({ fmode: 1, orient: 0, vel: 25, acel: true });

/**
 * El bloque amarillo ("Flechas", "Entradas externas" o "Conectores centrales"):
 * qué botones comanda y cómo se llaman. `null` si el producto no lo tiene.
 * @param {any} prod
 */
export function arrowSetOf(prod) {
  if (!prod) return null;
  if (prod.hasCenterConnectors) {
    return { buttons: prod.centerBtns, title: 'Conectores centrales', noun: 'conector', plural: 'conectores', article: 'el', group: 'Conectores centrales' };
  }
  if (prod.hasArrows) {
    const ext = !!prod.arrowSectionTitle;
    return {
      buttons: prod.arrowBtns,
      title: ext ? 'Entradas externas' : 'Flechas',
      noun: ext ? 'entrada' : 'flecha',
      plural: ext ? 'entradas' : 'flechas',
      article: 'la',
      group: ext ? 'Entradas externas' : 'Flechas',
    };
  }
  return null;
}

/** Todos los botones que el producto puede tener (principales + flechas/conectores). */
export function allButtons(/** @type {any} */ prod) {
  const set = arrowSetOf(prod);
  return [...prod.mainBtns, ...(set ? set.buttons : [])];
}

/** Valores de fábrica razonables para un botón, mientras no se haya leído el dispositivo. */
const FACTORY = {
  BR: () => newButton('M', '1'),
  BA: () => newButton('M', '2'),
  BN: () => newButton('K', '1', 'ENTER'),
  BC: () => newButton('K', '1', 'SPACE'),
  FU: () => newButton('K', '1', 'UP_ARROW'),
  FD: () => newButton('K', '1', 'DOWN_ARROW'),
  FL: () => newButton('K', '1', 'LEFT_ARROW'),
  FR: () => newButton('K', '1', 'RIGHT_ARROW'),
};

/** @returns {{ btns: Record<string, Btn>, arrows: Arrows }} */
export function defaultConfig(/** @type {any} */ prod) {
  /** @type {Record<string, Btn>} */
  const btns = {};
  for (const b of allButtons(prod)) btns[b.code] = /** @type {any} */ (FACTORY)[b.code]();
  return { btns, arrows: newArrows() };
}

// ── Estado ⇄ protocolo ───────────────────────────────────────────────────────

/** ¿Este botón está en modo "corta y larga"? */
export function isDual(/** @type {Btn} */ b, /** @type {boolean} */ th) {
  return b.modo === 'T' && th && b.tipo !== 'X';
}

/**
 * Estado de un botón → `ButtonSpec` de protocol.js.
 * @param {string} code
 * @param {Btn} b
 * @param {boolean} th el firmware soporta Tap-Hold
 */
export function specOf(code, b, th) {
  const dual = isDual(b, th);
  const L = b.long;
  return {
    code,
    tipo: b.tipo,
    modo: dual ? 'T' : b.modo === 'T' ? 'P' : b.modo,
    debounce: b.debounce,
    // En "corta y larga" no existe "mantener clic": el clic corto es instantáneo.
    mouseAction: dual && b.mouse === '1M' ? '1' : b.mouse,
    key: keyToSpec(b.key),
    ctrl: b.mods.c, shift: b.mods.s, alt: b.mods.a, gui: b.mods.g,
    largo: dual
      ? {
          mouseAction: L.mouse === '1M' ? '1' : L.mouse,
          mantener: L.mouse === '1M',
          key: keyToSpec(L.key),
          ctrl: L.mods.c, shift: L.mods.s, alt: L.mods.a, gui: L.mods.g,
        }
      : undefined,
    umbral: dual ? b.umbral : undefined,
  };
}

/** Comandos que llevan un botón a su estado. */
export function buttonCommands(/** @type {string} */ code, /** @type {Btn} */ b, /** @type {boolean} */ th) {
  return [Protocol.buildButtonCfg(/** @type {any} */ (specOf(code, b, th)))];
}

/** Comandos del bloque de flechas. */
export function arrowCommands(/** @type {Arrows} */ a) {
  return Protocol.buildArrowCommands({ fmode: a.fmode, orient: a.orient, vel: a.vel, acel: a.acel });
}

/** @param {number} bits */
function modsFromBits(bits) {
  return { c: !!(bits & 1), s: !!(bits & 2), a: !!(bits & 4), g: !!(bits & 8) };
}

/** Acción del mouse que informa el dispositivo → valor del desplegable. */
function mouseFromWire(/** @type {number} */ accion, /** @type {number} */ flags) {
  if (accion === 8) return 'SU';
  if (accion === 16) return 'SD';
  if (accion === 1 && flags & 1) return '1D';
  if (accion === 1 && flags & 2) return '1M';
  return ['1', '2', '4'].includes(String(accion)) ? String(accion) : '1';
}

/**
 * Lo que leyó GETALL (`Protocol.parseDeviceLine`) → estado. Parte de los valores de
 * fábrica y pisa solo lo que el dispositivo informó.
 * @param {any} prod
 * @param {any} devCfg forma de `Protocol.emptyCfg()`
 * @param {boolean} th
 * @returns {{ btns: Record<string, Btn>, arrows: Arrows }}
 */
export function fromDevice(prod, devCfg, th) {
  const out = defaultConfig(prod);
  const MODO = /** @type {Record<number, 'P'|'R'|'O'|'T'>} */ ({ 0: 'P', 1: 'R', 3: 'O', 4: 'T' });
  for (const b of allButtons(prod)) {
    const c = devCfg.btns[String(Protocol.CODE_TO_IDX[b.code])];
    if (!c) continue;
    const st = newButton(c.tipo === 2 ? 'X' : c.tipo === 0 ? 'M' : 'K');
    st.debounce = c.debounce > 0 ? c.debounce : 0;
    const modo = MODO[c.modo] ?? 'P';
    st.modo = modo === 'T' && !th ? 'P' : modo;
    if (st.tipo === 'M') {
      st.mouse = mouseFromWire(c.accion, c.flags);
    } else if (st.tipo === 'K') {
      st.key = keyFromWire(c.accion);
      st.mods = modsFromBits(c.mods);
    } else {
      // Desactivado: se conserva la acción de fábrica por si se vuelve a activar.
      const f = /** @type {any} */ (FACTORY)[b.code]();
      st.mouse = f.mouse; st.key = f.key;
    }
    if (st.modo === 'T') {
      if (st.tipo === 'M') {
        const m = mouseFromWire(c.accionLarga, 0);
        st.long.mouse = c.flagsLarga & 2 && m === '1' ? '1M' : m;
        if (st.mouse === '1M') st.mouse = '1';
      } else if (st.tipo === 'K') {
        st.long.key = keyFromWire(c.accionLarga);
        st.long.mods = modsFromBits(c.modsLarga);
      }
      st.umbral = c.umbral > 0 ? String(c.umbral) : '';
    }
    out.btns[b.code] = st;
  }
  const a = out.arrows;
  if (devCfg.fmode != null && [0, 1, 2].includes(devCfg.fmode)) a.fmode = devCfg.fmode;
  if (devCfg.orient != null && devCfg.orient >= 0 && devCfg.orient <= 3) a.orient = devCfg.orient;
  if (devCfg.vel != null && devCfg.vel >= 1 && devCfg.vel <= 50) a.vel = devCfg.vel;
  if (devCfg.acel != null) a.acel = devCfg.acel === 1;
  return out;
}

// ── Frases ───────────────────────────────────────────────────────────────────

/** @param {Mods} m @param {'win'|'mac'} target */
export function modsText(m, target) {
  return MODS.filter((k) => m[k]).map((k) => MOD_NAMES[target][k].s);
}

/**
 * "tecla Ctrl + C", "clic derecho", "sin tecla asignada".
 * @param {'K'|'M'|'X'} tipo
 * @param {{ key: string, mods: Mods, mouse: string }} a
 * @param {boolean} long
 * @param {'win'|'mac'} target
 */
export function actionText(tipo, a, long, target) {
  if (tipo === 'M') return mouseLabel(a.mouse, long).toLowerCase();
  const parts = [...modsText(a.mods, target), keyLabel(a.key)].filter(Boolean);
  return parts.length ? 'tecla ' + parts.join(' + ') : 'sin tecla asignada';
}

/**
 * Frase completa de un botón: la que se lee abajo del detalle y en el resumen al desconectar.
 * @param {{ label: string }} meta
 * @param {Btn} b
 * @param {{ target: 'win'|'mac', th: boolean }} ctx
 */
export function sentence(meta, b, ctx) {
  const name = meta.label;
  if (b.tipo === 'X') return `${name}: desactivado, no hace nada.`;
  const short = actionText(b.tipo, b, false, ctx.target);
  if (isDual(b, ctx.th)) {
    const ms = b.umbral || Protocol.TH_DEFAULT_MS;
    return `${name}: pulsación corta → ${short}. Pulsación larga (más de ${ms} ms) → ${actionText(b.tipo, b.long, true, ctx.target)}.`;
  }
  const modo = /** @type {any} */ (MODO_TEXT)[b.modo] || MODO_TEXT.P;
  const art = /^(Flecha|Entrada)/.test(name) ? 'la' : 'el';
  return `${modo} ${art} ${name}: ${short}.`;
}

/** Resumen de una línea para la barra lateral. */
export function shortSummary(/** @type {Btn} */ b, /** @type {{ target: 'win'|'mac', th: boolean }} */ ctx) {
  if (b.tipo === 'X') return 'Desactivado';
  const s = actionText(b.tipo, b, false, ctx.target).replace(/^tecla /, '');
  const cap = s.charAt(0).toUpperCase() + s.slice(1);
  return isDual(b, ctx.th) ? cap + ' / ' + actionText(b.tipo, b.long, true, ctx.target).replace(/^tecla /, '') : cap;
}

const ORIENT_TEXT = ['normal', 'girado a la derecha', 'girado a la izquierda', 'invertido'];

/** Frase del bloque de flechas / conectores. */
export function arrowsSentence(/** @type {Arrows} */ a, /** @type {{ noun: string, plural: string }} */ set) {
  const art = set.plural === 'conectores' ? 'Los' : 'Las';
  if (a.fmode === 1) {
    return `${art} ${set.plural} mueven el cursor. Velocidad ${a.vel}, ${a.acel ? 'con' : 'sin'} aceleración, dispositivo ${ORIENT_TEXT[a.orient]}.`;
  }
  if (a.fmode === 2) return `${art} ${set.plural} escriben las teclas ↑ ↓ ← →. Dispositivo ${ORIENT_TEXT[a.orient]}.`;
  return `Cada ${set.noun} hace una acción individual.`;
}

// ── Cola de envío ────────────────────────────────────────────────────────────

/**
 * Cuándo y qué se manda al dispositivo.
 *
 * El dispositivo guarda en su memoria cada comando CFG/FMODE/… apenas lo recibe, así
 * que mandar de más desgasta la memoria. Por eso:
 *  - los cambios rápidos sobre un mismo control (`key`) se agrupan: sale solo el último;
 *  - si lo que saldría es idéntico a lo último que el dispositivo ya tiene, no se manda;
 *  - los envíos salen de a uno, en orden.
 *
 * `send` recibe un comando y devuelve `true` si salió bien.
 */
export class SendQueue {
  /**
   * @param {(cmd: string) => Promise<boolean>} send
   * @param {(busy: boolean) => void} [onBusy]
   */
  constructor(send, onBusy) {
    this.send = send;
    this.onBusy = onBusy || (() => {});
    /** @type {Map<string, any>} */
    this.timers = new Map();
    /** @type {Map<string, { build: () => string[], run: () => void }>} */
    this.pending = new Map();
    /** @type {Map<string, string>} */
    this.known = new Map();
    this.chain = Promise.resolve();
    this.inflight = 0;
  }

  /** Marca qué comandos ya tiene el dispositivo para `key` (p. ej. después de leerlo). */
  prime(/** @type {string} */ key, /** @type {string[]} */ cmds) {
    this.known.set(key, cmds.join('\n'));
  }

  /** Olvida todo (al desconectar). */
  reset() {
    for (const t of this.timers.values()) clearTimeout(t);
    this.timers.clear();
    this.pending.clear();
    this.known.clear();
    this.inflight = 0;
    this.chain = Promise.resolve();
    this.onBusy(false);
  }

  /**
   * Programa el envío de lo que arme `build()`. `delay` en ms de quietud antes de mandar.
   * @param {string} key
   * @param {() => string[]} build
   * @param {number} [delay]
   */
  schedule(key, build, delay = 120) {
    clearTimeout(this.timers.get(key));
    if (!this.pending.has(key)) {
      this.inflight++;
      this.onBusy(true);
    }
    const run = () => {
      this.timers.delete(key);
      this.pending.delete(key);
      const cmds = build();
      const sig = cmds.join('\n');
      this.chain = this.chain.then(async () => {
        if (this.known.get(key) !== sig) {
          let ok = true;
          for (const c of cmds) {
            ok = await this.send(c);
            if (!ok) break;
          }
          if (ok) this.known.set(key, sig);
        }
        this.inflight--;
        if (this.inflight <= 0) {
          this.inflight = 0;
          this.onBusy(false);
        }
      });
    };
    this.pending.set(key, { build, run });
    this.timers.set(key, setTimeout(run, delay));
  }

  /** Manda ya lo que esté esperando y resuelve cuando todo salió (para antes de desconectar). */
  async flush() {
    for (const [key, p] of [...this.pending]) {
      clearTimeout(this.timers.get(key));
      p.run();
    }
    await this.chain;
  }
}
