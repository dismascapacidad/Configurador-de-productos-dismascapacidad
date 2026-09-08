// @ts-check
/**
 * Tests de src/presets-store.js. Solo Vitest (usa mocks de localStorage y del
 * cliente Supabase) — no corren en el runner de navegador.
 */
import {
  newId,
  loadLocal,
  saveLocal,
  clearLocal,
  reconcileIds,
  pushToCloud,
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

// ── cliente Supabase falso ────────────────────────────────────────────────
function fakeSupa({ failUpsert = false, failDelete = false, selectData = [] } = {}) {
  const calls = [];
  return {
    calls,
    from() {
      return {
        select() {
          return { order: async () => ({ data: selectData, error: null }) };
        },
        upsert(rows, opts) {
          calls.push({ op: 'upsert', rows, opts });
          return Promise.resolve({ error: failUpsert ? { message: 'upsert boom' } : null });
        },
        delete() {
          const chain = {
            _eq: null,
            _not: null,
            eq(col, val) { this._eq = [col, val]; return this; },
            not(col, op, val) { this._not = [col, op, val]; return this; },
            then(resolve, reject) {
              calls.push({ op: 'delete', eq: this._eq, not: this._not });
              return Promise.resolve({
                error: failDelete ? { message: 'delete boom' } : null,
              }).then(resolve, reject);
            },
          };
          return chain;
        },
      };
    },
  };
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

test('reconcileIds: adopta el id de la nube cuando coincide el nombre', () => {
  const local = [
    { id: 'local-1', name: 'Juan', cfg: {} },
    { id: 'local-2', name: 'Nuevo', cfg: {} },
  ];
  reconcileIds(local, [{ id: 'cloud-1', name: 'Juan' }, { id: 'cloud-x', name: 'Otro' }]);
  expect(local[0].id).toBe('cloud-1'); // match por nombre
  expect(local[1].id).toBe('local-2'); // sin match → conserva el suyo
});

test('pushToCloud: upsert de toda la lista y DESPUÉS delete selectivo', async () => {
  const supa = fakeSupa();
  const list = [{ id: 'a', name: 'A', cfg: {} }, { id: 'b', name: 'B', cfg: {} }];
  const { error } = await pushToCloud(supa, 'u1', list);
  expect(error).toBeNull();
  expect(supa.calls.map((c) => c.op)).toEqual(['upsert', 'delete']); // orden
  expect(supa.calls[0].rows.length).toBe(2);
  expect(supa.calls[0].opts).toEqual({ onConflict: 'id' });
  expect(supa.calls[1].eq).toEqual(['user_id', 'u1']);
  expect(supa.calls[1].not).toEqual(['id', 'in', '(a,b)']);
});

test('pushToCloud: si el upsert falla, NO se ejecuta el delete (no se pierde nada)', async () => {
  const supa = fakeSupa({ failUpsert: true });
  const { error } = await pushToCloud(supa, 'u1', [{ id: 'a', name: 'A', cfg: {} }]);
  expect(error).toBe('upsert boom');
  expect(supa.calls.map((c) => c.op)).toEqual(['upsert']); // el delete no corrió
});

test('pushToCloud: si el delete falla, devuelve el error (los upserts ya están)', async () => {
  const supa = fakeSupa({ failDelete: true });
  const { error } = await pushToCloud(supa, 'u1', [{ id: 'a', name: 'A', cfg: {} }]);
  expect(error).toBe('delete boom');
  expect(supa.calls.map((c) => c.op)).toEqual(['upsert', 'delete']);
});

test('pushToCloud: lista vacía → sin upsert, delete de todo lo del usuario', async () => {
  const supa = fakeSupa();
  const { error } = await pushToCloud(supa, 'u1', []);
  expect(error).toBeNull();
  expect(supa.calls.map((c) => c.op)).toEqual(['delete']);
  expect(supa.calls[0].not).toBeNull(); // sin filtro `not in` → borra todo
});
