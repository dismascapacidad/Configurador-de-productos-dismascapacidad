// @ts-check
/**
 * Almacenamiento de presets propios: solo localStorage (este navegador). Sin DOM.
 * No hay cuentas ni nube: pasar perfiles a otro equipo se hace con CSV (src/csv.js).
 * Cada preset tiene un `id` estable (uuid).
 */

const STORAGE_KEY = 'displus_presets_v1';

/** @returns {string} id nuevo para un preset. */
export function newId() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    /* ignore */
  }
  return 'p-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

/**
 * Asigna un id a los presets que no tengan (migración en el acto). Muta `list`.
 * @param {Array<any>} list
 * @returns {boolean} si asignó alguno
 */
function ensureIds(list) {
  let changed = false;
  for (const p of list) {
    if (p && !p.id) {
      p.id = newId();
      changed = true;
    }
  }
  return changed;
}

/**
 * Lee la lista local. Migra en el acto los presets sin `id` y persiste esa
 * migración.
 * @returns {Array<any>}
 */
export function loadLocal() {
  let list;
  try {
    list = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || [];
  } catch {
    return [];
  }
  if (!Array.isArray(list)) return [];
  if (ensureIds(list)) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
      /* ignore */
    }
  }
  return list;
}

/**
 * Escribe la lista local (asigna ids a los que falten primero). NO sincroniza
 * con la nube — eso lo hace el llamador con `pushToCloud()`.
 * @param {Array<any>} list
 */
export function saveLocal(list) {
  ensureIds(list);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export function clearLocal() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
