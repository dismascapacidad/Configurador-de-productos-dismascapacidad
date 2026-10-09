// @ts-check
/**
 * Modelo de la configuración (`src/model.js`): estado ⇄ protocolo, frases y cola de envío.
 * Corre bajo Vitest (`test` y `expect` globales).
 */
import * as M from '../src/model.js';
import * as P from '../src/protocol.js';
import { PRODUCTS } from '../src/products.js';

const ctx = { target: /** @type {'win'} */ ('win'), th: true };
const sleep = (/** @type {number} */ ms) => new Promise((r) => setTimeout(r, ms));

// ── Teclas ──────────────────────────────────────────────────────────────────

test('tokenFromEventKey: especiales, letras y modificadores solos', () => {
  expect(M.tokenFromEventKey('Enter')).toBe('ENTER');
  expect(M.tokenFromEventKey(' ')).toBe('SPACE');
  expect(M.tokenFromEventKey('ArrowUp')).toBe('UP_ARROW');
  expect(M.tokenFromEventKey('F5')).toBe('F5');
  expect(M.tokenFromEventKey('A')).toBe('a');
  expect(M.tokenFromEventKey('Shift')).toBe('');
  expect(M.tokenFromEventKey('Dead')).toBe('');
});

test('keyLabel y keyFromWire: ida y vuelta con los códigos del firmware', () => {
  expect(M.keyLabel('ENTER')).toBe('Enter');
  expect(M.keyLabel('a')).toBe('A');
  expect(M.keyLabel('#123')).toBe('Tecla #123');
  expect(M.keyFromWire(215)).toBe('ENTER');
  expect(M.keyFromWire(32)).toBe('SPACE');
  expect(M.keyFromWire(97)).toBe('a');
  expect(M.keyFromWire(150)).toBe('#150');
  expect(M.keyFromWire(0)).toBe('');
});

// ── Estado → comandos ───────────────────────────────────────────────────────

test('specOf/buttonCommands: tecla con modificadores, una sola acción', () => {
  const b = M.newButton('K', '1', 'c');
  b.mods.c = true;
  b.modo = 'R';
  b.debounce = 50;
  expect(M.buttonCommands('BR', b, true)).toEqual(['CFG:BR:K:R:50:c:C:-']);
});

test('buttonCommands: mouse "mantener clic" (alterna) en pulsación única', () => {
  const b = M.newButton('M', '1M');
  expect(M.buttonCommands('BR', b, true)).toEqual(['CFG:BR:M:P:0:1:-:M']);
});

test('buttonCommands: corta y larga con teclado y umbral', () => {
  const b = M.newButton('K', '1', 'a');
  b.modo = 'T';
  b.umbral = '800';
  b.long.key = 'ENTER';
  b.long.mods.s = true;
  expect(M.buttonCommands('BN', b, true)).toEqual(['CFG:BN:K:T:0:a:-:-:215:S:0:800']);
});

test('buttonCommands: "Mantener clic izquierdo" en la pulsación larga del mouse', () => {
  const b = M.newButton('M', '2');
  b.modo = 'T';
  b.long.mouse = '1M';
  expect(M.buttonCommands('BR', b, true)).toEqual(['CFG:BR:M:T:0:2:-:-:1:0:M:0']);
});

test('buttonCommands: en corta y larga el clic corto nunca queda en "mantener"', () => {
  const b = M.newButton('M', '1M');
  b.modo = 'T';
  expect(M.buttonCommands('BR', b, true)[0].startsWith('CFG:BR:M:T:0:1:-:-:')).toBe(true);
});

test('buttonCommands: sin Tap-Hold, modo T cae en "al presionar"', () => {
  const b = M.newButton('K', '1', 'a');
  b.modo = 'T';
  expect(M.buttonCommands('BR', b, false)).toEqual(['CFG:BR:K:P:0:a:-:-']);
});

test('buttonCommands: teclas sin nombre (#código) viajan como número', () => {
  const b = M.newButton('K', '1', '#150');
  expect(M.buttonCommands('BR', b, true)).toEqual(['CFG:BR:K:P:0:150:-:-']);
});

test('arrowCommands: cursor y teclas', () => {
  expect(M.arrowCommands({ fmode: 1, orient: 2, vel: 30, acel: false })).toEqual(['FMODE:1', 'ORIENT:2', 'VEL:30', 'ACEL:0']);
  expect(M.arrowCommands({ fmode: 2, orient: 0, vel: 25, acel: true })).toEqual(['FMODE:2', 'ORIENT:0']);
});

// ── Dispositivo → estado ────────────────────────────────────────────────────

/** Arma un devCfg como el que deja GETALL. */
function devFrom(/** @type {string[]} */ lines, th = true) {
  const cfg = P.emptyCfg();
  for (const l of lines) P.parseDeviceLine(l, cfg, { requireTapHold: th });
  return cfg;
}

test('fromDevice: mouse, teclado y desactivado', () => {
  const dev = devFrom([
    'FMODE:2', 'ORIENT:3', 'VEL:40', 'ACEL:0',
    'BTN:0:0:0:0:1:0:2:0:0:0:0', // BR: mouse, clic izq con toggle (flags=2), al presionar
    'BTN:1:1:1:30:215:3:0:0:0:0:0', // BA: teclado Enter + Ctrl+Shift, al soltar, debounce 30
    'BTN:2:2:0:0:0:0:0:0:0:0:0', // BN: desactivado
  ]);
  const r = M.fromDevice(PRODUCTS.dismouse, dev, true);
  expect(r.arrows).toEqual({ fmode: 2, orient: 3, vel: 40, acel: false });
  expect(r.btns.BR.tipo).toBe('M');
  expect(r.btns.BR.mouse).toBe('1M');
  expect(r.btns.BA.tipo).toBe('K');
  expect(r.btns.BA.key).toBe('ENTER');
  expect(r.btns.BA.mods).toEqual({ c: true, s: true, a: false, g: false });
  expect(r.btns.BA.modo).toBe('R');
  expect(r.btns.BA.debounce).toBe(30);
  expect(r.btns.BN.tipo).toBe('X');
});

test('fromDevice: corta y larga con umbral', () => {
  const dev = devFrom(['BTN:0:1:4:0:97:0:0:215:8:0:800']); // a / larga Enter+Win, 800 ms
  const r = M.fromDevice(PRODUCTS.dismouse, dev, true);
  const b = r.btns.BR;
  expect(b.modo).toBe('T');
  expect(b.key).toBe('a');
  expect(b.long.key).toBe('ENTER');
  expect(b.long.mods.g).toBe(true);
  expect(b.umbral).toBe('800');
});

test('fromDevice: larga de mouse con "mantener" → 1M', () => {
  const dev = devFrom(['BTN:0:0:4:0:2:0:0:1:0:2:0']);
  expect(M.fromDevice(PRODUCTS.dismouse, dev, true).btns.BR.long.mouse).toBe('1M');
});

test('fromDevice: lo que no informó el dispositivo queda en los valores de fábrica', () => {
  const r = M.fromDevice(PRODUCTS.dismouse, P.emptyCfg(), true);
  expect(r.btns.BR.tipo).toBe('M');
  expect(r.btns.BN.key).toBe('ENTER');
  expect(r.arrows.fmode).toBe(1);
});

test('fromDevice: lo leído y vuelto a armar da el mismo comando', () => {
  const b = M.newButton('K', '1', 'x');
  b.mods.a = true;
  b.modo = 'O';
  b.debounce = 100;
  const cmd = M.buttonCommands('BC', b, true)[0]; // CFG:BC:K:O:100:x:A:-
  const dev = devFrom(['BTN:3:1:3:100:' + 'x'.charCodeAt(0) + ':4:0:0:0:0:0']);
  const back = M.fromDevice(PRODUCTS.dismouse, dev, true).btns.BC;
  expect(M.buttonCommands('BC', back, true)[0]).toBe(cmd);
});

// ── Productos ───────────────────────────────────────────────────────────────

test('arrowSetOf: flechas, entradas externas, conectores centrales y sin bloque', () => {
  expect(M.arrowSetOf(PRODUCTS.dismouse)?.title).toBe('Flechas');
  expect(M.arrowSetOf(PRODUCTS.dishubmini)?.title).toBe('Entradas externas');
  expect(M.arrowSetOf(PRODUCTS.dishub)?.title).toBe('Conectores centrales');
  expect(M.arrowSetOf(PRODUCTS.dishub)?.buttons.length).toBe(4);
  expect(M.arrowSetOf(PRODUCTS.disbutton)).toBeNull();
  expect(M.arrowSetOf(PRODUCTS.dishubkeys)).toBeNull();
});

test('defaultConfig: hay estado para todos los botones de cada producto', () => {
  for (const p of Object.values(PRODUCTS)) {
    const c = M.defaultConfig(p);
    for (const b of M.allButtons(p)) expect(c.btns[b.code] !== undefined).toBe(true);
  }
});

// ── Frases ──────────────────────────────────────────────────────────────────

test('sentence: una sola acción, corta y larga y desactivado', () => {
  const b = M.newButton('K', '1', 'c');
  b.mods.c = true;
  expect(M.sentence({ label: 'Botón Rojo' }, b, ctx)).toBe('Al presionar el Botón Rojo: tecla Ctrl + C.');
  b.modo = 'T';
  b.long.key = 'v';
  b.long.mods.c = true;
  expect(M.sentence({ label: 'Botón Rojo' }, b, ctx)).toBe(
    'Botón Rojo: pulsación corta → tecla Ctrl + C. Pulsación larga (más de 1000 ms) → tecla Ctrl + V.',
  );
  b.tipo = 'X';
  expect(M.sentence({ label: 'Botón Rojo' }, b, ctx)).toBe('Botón Rojo: desactivado, no hace nada.');
});

test('sentence: artículo según el nombre y teclas de Mac', () => {
  const b = M.newButton('K', '1', 'c');
  b.mods.g = true;
  expect(M.sentence({ label: 'Flecha ↑' }, b, { target: 'mac', th: true })).toBe('Al presionar la Flecha ↑: tecla ⌘ + C.');
});

test('sentence: sin Tap-Hold, modo T se lee como pulsación única', () => {
  const b = M.newButton('K', '1', 'a');
  b.modo = 'T';
  expect(M.sentence({ label: 'Botón Rojo' }, b, { target: 'win', th: false })).toBe('Al presionar el Botón Rojo: tecla A.');
});

test('arrowsSentence y shortSummary', () => {
  const set = M.arrowSetOf(PRODUCTS.dishub);
  expect(M.arrowsSentence({ fmode: 0, orient: 0, vel: 25, acel: true }, /** @type {any} */ (set))).toBe('Cada conector hace una acción individual.');
  expect(M.arrowsSentence({ fmode: 1, orient: 1, vel: 10, acel: false }, /** @type {any} */ (set))).toBe(
    'Los conectores mueven el cursor. Velocidad 10, sin aceleración, dispositivo girado a la derecha.',
  );
  expect(M.shortSummary(M.newButton('M', '2'), ctx)).toBe('Clic derecho');
});

// ── Cola de envío ───────────────────────────────────────────────────────────

test('SendQueue: agrupa cambios rápidos y manda solo el último', async () => {
  /** @type {string[]} */
  const sent = [];
  const q = new M.SendQueue(async (c) => (sent.push(c), true));
  q.schedule('k', () => ['A'], 20);
  q.schedule('k', () => ['AB'], 20);
  q.schedule('k', () => ['ABC'], 20);
  await sleep(80);
  expect(sent).toEqual(['ABC']);
});

test('SendQueue: no manda lo que el dispositivo ya tiene', async () => {
  /** @type {string[]} */
  const sent = [];
  const q = new M.SendQueue(async (c) => (sent.push(c), true));
  q.prime('k', ['X']);
  q.schedule('k', () => ['X'], 5);
  await sleep(40);
  expect(sent).toEqual([]);
  q.schedule('k', () => ['Y'], 5);
  await sleep(40);
  expect(sent).toEqual(['Y']);
  q.schedule('k', () => ['Y'], 5);
  await sleep(40);
  expect(sent).toEqual(['Y']);
});

test('SendQueue: los envíos salen en orden y avisa cuando termina', async () => {
  /** @type {string[]} */
  const sent = [];
  /** @type {boolean[]} */
  const busy = [];
  const q = new M.SendQueue(async (c) => {
    await sleep(10);
    sent.push(c);
    return true;
  }, (b) => busy.push(b));
  q.schedule('a', () => ['1', '2'], 5);
  q.schedule('b', () => ['3'], 5);
  await sleep(120);
  expect(sent).toEqual(['1', '2', '3']);
  expect(busy[0]).toBe(true);
  expect(busy[busy.length - 1]).toBe(false);
});

test('SendQueue: si un comando falla no se da por enviado y se reintenta con el mismo valor', async () => {
  let ok = false;
  /** @type {string[]} */
  const sent = [];
  const q = new M.SendQueue(async (c) => (sent.push(c), ok));
  q.schedule('k', () => ['Z'], 5);
  await sleep(40);
  ok = true;
  q.schedule('k', () => ['Z'], 5);
  await sleep(40);
  expect(sent).toEqual(['Z', 'Z']);
});

test('SendQueue.flush: manda ya lo que estaba esperando', async () => {
  /** @type {string[]} */
  const sent = [];
  const q = new M.SendQueue(async (c) => (sent.push(c), true));
  q.schedule('k', () => ['P'], 5000);
  await q.flush();
  expect(sent).toEqual(['P']);
});
