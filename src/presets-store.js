// @ts-check
/**
 * Almacenamiento de presets propios: localStorage (fuente local) + Supabase
 * (respaldo por cuenta). Sin DOM.
 *
 * Fase 3 del plan de deuda técnica: el sync dejó de ser "DELETE todo + INSERT
 * todo" (que perdía datos si el INSERT fallaba a mitad). Ahora cada preset tiene
 * un `id` estable (uuid) y `pushToCloud()` hace:
 *   1. upsert por id de toda la lista
 *   2. SOLO si (1) salió OK: borra de la nube los id que ya no están en la lista
 * Un fallo en (1) no toca la nube. Un fallo en (2) deja a lo sumo un preset
 * viejo de más, que se limpia en el próximo sync. Nunca se pierden datos.
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

/**
 * Trae los presets de la nube del usuario logueado.
 * @param {any} supa  cliente Supabase
 * @returns {Promise<{ rows: Array<any>, error: string | null }>}
 */
export async function fetchCloud(supa) {
  const { data, error } = await supa
    .from('presets')
    .select('id, name, date, cfg, prod_id, notes, updated_at')
    .order('created_at', { ascending: true });
  if (error) return { rows: [], error: error.message };
  return {
    rows: (data || []).map((p) => ({
      id: p.id,
      name: p.name,
      date: p.date,
      cfg: p.cfg,
      prodId: p.prod_id,
      notes: p.notes,
      updatedAt: p.updated_at,
    })),
    error: null,
  };
}

/**
 * Sincroniza la lista local con la nube de forma incremental y segura.
 * Ver la nota de cabecera del módulo para el porqué del orden.
 * @param {any} supa
 * @param {string} userId
 * @param {Array<any>} list
 * @returns {Promise<{ error: string | null }>}
 */
export async function pushToCloud(supa, userId, list) {
  ensureIds(list);

  if (list.length) {
    const rows = list.map((p) => ({
      id: p.id,
      user_id: userId,
      name: p.name,
      date: p.date,
      cfg: p.cfg,
      prod_id: p.prodId || null,
      notes: p.notes || null,
    }));
    const { error: upErr } = await supa.from('presets').upsert(rows, { onConflict: 'id' });
    if (upErr) return { error: upErr.message };
  }

  // Borrado selectivo — SIEMPRE después de que los upserts salieron OK.
  const ids = list.map((p) => p.id);
  let del = supa.from('presets').delete().eq('user_id', userId);
  if (ids.length) del = del.not('id', 'in', '(' + ids.join(',') + ')');
  const { error: delErr } = await del;
  if (delErr) return { error: delErr.message };

  return { error: null };
}

/**
 * Ajusta los ids de `local` para que coincidan con los de la nube cuando hay
 * match por nombre. Se usa al combinar local + nube (importChoice 'merge' / primer
 * login post-migración), para no duplicar en la nube los presets que ya estaban.
 * Muta `local` y lo devuelve.
 * @param {Array<any>} local
 * @param {Array<any>} cloudRows
 * @returns {Array<any>}
 */
export function reconcileIds(local, cloudRows) {
  const cloudIdByName = new Map(cloudRows.map((r) => [r.name, r.id]));
  for (const p of local) {
    const cloudId = cloudIdByName.get(p.name);
    if (cloudId) p.id = cloudId;
  }
  return local;
}
