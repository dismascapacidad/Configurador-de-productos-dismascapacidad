// @ts-check
/**
 * Tests de src/presets-store.js. Solo Vitest (usa un mock de localStorage) —
 * no corren en el runner de navegador.
 */
import {
  newId,
  loadLocal,
  saveLocal,
  clearLocal,
} from '../src/presets-store.js';

// ── localStorage en memoria ────────────────────────────────────────────────
function installMemoryLocalStorage() {
  let store = {};
  globalThis.localStorage = /** @type {any} */ ({
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { store = {}; },
  });
}

// ──────────────────────────────────────────────────────────────────────────

test('newId: devuelve strings distintos', () => {
  const a = newId();
  const b = newId();
  expect(typeof a).toBe('string');
  expect(a === b).toBe(false);
});

test('loadLocal/saveLocal: asignan id a los presets sin id y persisten', () => {
  installMemoryLocalStorage();
  const list = [{ name: 'A', cfg: {} }, { name: 'B', cfg: {} }];
  saveLocal(list);
  expect(typeof list[0].id).toBe('string');
  expect(list[0].id === list[1].id).toBe(false);
  const back = loadLocal();
  expect(back.map((p) => p.name)).toEqual(['A', 'B']);
  expect(back.every((p) => p.id)).toBe(true);
});

test('loadLocal: sin datos o basura → lista vacía', () => {
  installMemoryLocalStorage();
  expect(loadLocal()).toEqual([]);
  localStorage.setItem('displus_presets_v1', 'no-json');
  expect(loadLocal()).toEqual([]);
});

test('clearLocal: borra la lista', () => {
  installMemoryLocalStorage();
  saveLocal([{ name: 'A', cfg: {} }]);
  clearLocal();
  expect(loadLocal()).toEqual([]);
});
