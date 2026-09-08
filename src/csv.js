// @ts-check
/**
 * Import/export de presets en CSV. Funciones PURAS (sin DOM): index.html se
 * encarga del `<input type=file>` y del `<a download>`.
 *
 * Formato: encabezado `name,date,prodId,notes,cfg_json` — cada campo entre
 * comillas dobles, comillas internas duplicadas (`""`).
 */

/**
 * Parte una línea CSV en campos. Soporta comillas y comillas escapadas (`""`).
 * @param {string} line
 * @returns {string[]}
 */
export function parseCsvLine(line) {
  const result = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (c === ',' && !inQ) {
      result.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur);
  return result;
}

/**
 * @typedef {Object} PresetRow
 * @property {string} name
 * @property {string} [date]
 * @property {string|null} [prodId]
 * @property {string} [notes]
 * @property {any} cfg
 */

/**
 * Serializa un preset a un CSV de una fila (con encabezado). Terminadores `\r\n`.
 * @param {PresetRow} p
 * @returns {string}
 */
export function presetToCsv(p) {
  const rows = [
    ['name', 'date', 'prodId', 'notes', 'cfg_json'],
    [p.name, p.date || '', p.prodId || '', p.notes || '', JSON.stringify(p.cfg)],
  ];
  return rows.map((r) => r.map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\r\n');
}

/**
 * Parsea un CSV de presets. Devuelve solo las filas válidas (nombre no vacío y
 * `cfg_json` que parsea). NO deduplica — eso lo decide el llamador.
 * @param {string} text
 * @returns {{ presets: PresetRow[], error: string | null }}
 */
export function parsePresetsCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { presets: [], error: 'CSV vacío o inválido' };

  const header = parseCsvLine(lines[0]);
  const iName = header.indexOf('name');
  const iDate = header.indexOf('date');
  const iProd = header.indexOf('prodId');
  const iNotes = header.indexOf('notes');
  const iCfg = header.indexOf('cfg_json');
  if (iName < 0 || iCfg < 0) return { presets: [], error: 'El CSV no tiene el formato correcto' };

  /** @type {PresetRow[]} */
  const presets = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const name = cols[iName]?.trim();
    if (!name) continue;
    try {
      const cfg = JSON.parse(cols[iCfg]);
      presets.push({
        name,
        date: cols[iDate] || '',
        prodId: cols[iProd] || null,
        notes: cols[iNotes] || '',
        cfg,
      });
    } catch {
      /* cfg inválido → se ignora la fila */
    }
  }
  return { presets, error: null };
}
