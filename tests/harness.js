// @ts-check
/**
 * Micro-harness de tests, sin dependencias. Implementa un subconjunto compatible
 * de la API de Vitest (`test`, `expect().toBe/.toEqual/.toBeNull`) para que los
 * archivos `tests/*.test.js` corran HOY en el navegador (ver `tests/index.html`)
 * y MÁS ADELANTE bajo Vitest sin cambios, una vez que haya Node instalado.
 */

/** @type {{ name: string, fn: () => void | Promise<void> }[]} */
const registry = [];

/**
 * @param {string} name
 * @param {() => void | Promise<void>} fn
 */
export function test(name, fn) {
  registry.push({ name, fn });
}

function fmt(v) {
  try { return JSON.stringify(v); } catch { return String(v); }
}
function deepEq(a, b) {
  return fmt(a) === fmt(b);
}

/** @param {unknown} actual */
export function expect(actual) {
  return {
    /** @param {unknown} exp */
    toBe(exp) {
      if (!Object.is(actual, exp)) throw new Error(`toBe: esperaba ${fmt(exp)}, obtuve ${fmt(actual)}`);
    },
    /** @param {unknown} exp */
    toEqual(exp) {
      if (!deepEq(actual, exp)) throw new Error(`toEqual:\n  esperaba ${fmt(exp)}\n  obtuve   ${fmt(actual)}`);
    },
    toBeNull() {
      if (actual !== null) throw new Error(`toBeNull: obtuve ${fmt(actual)}`);
    },
  };
}

/**
 * Corre todos los tests registrados.
 * @returns {Promise<{ name: string, ok: boolean, err?: string }[]>}
 */
export async function run() {
  /** @type {{ name: string, ok: boolean, err?: string }[]} */
  const results = [];
  for (const { name, fn } of registry) {
    try {
      await fn();
      results.push({ name, ok: true });
    } catch (e) {
      results.push({ name, ok: false, err: e instanceof Error ? e.message : String(e) });
    }
  }
  return results;
}
