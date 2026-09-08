// @ts-check
/**
 * Estado mutable compartido de la UI.
 *
 * Un único objeto `S` que los módulos leen y escriben (`S.prod = ...`), en vez
 * de `let` sueltos repartidos por app.js. Transicional mientras se parte la UI:
 * a medida que los módulos queden bien delimitados, varios de estos campos
 * pasarán a ser privados del módulo que los posee.
 */

export const S = {
  /** Producto activo (objeto de `PRODUCTS`) o `null`. */
  prod: /** @type {any} */ (null),
  /** Transporte elegido en la UI: `'usb'` | `'ble'`. */
  connType: 'usb',
  /** ¿Hay un dispositivo conectado? */
  connected: false,
  /** Modificador principal por SO: `'win'` (Ctrl) | `'mac'` (⌘). */
  osMode: 'win',
  /** Handle del transporte activo `{ send, close }` o `null` (src/transport.js). */
  conn: /** @type {any} */ (null),
  /** Config leída del dispositivo (forma de `Protocol.emptyCfg()`). */
  devCfg: /** @type {any} */ ({ orient: null, vel: null, acel: null, fmode: null, btns: {} }),
  /** `tabId` activo en el modal de configuraciones rápidas. */
  activePresetTab: /** @type {string|null} */ (null),
  /** Sesión de Supabase o `null`. */
  currentUser: /** @type {any} */ (null),
};
