// @ts-check
/**
 * Estado compartido de la UI. Un único objeto `S`.
 *
 * `cfg` es la configuración que se muestra y edita (ver src/model.js); `devCfg` es lo
 * crudo que devolvió GETALL, solo mientras se lee.
 */
import * as Protocol from '../protocol.js';

export const S = {
  /** Producto activo (objeto de `PRODUCTS`) o `null`. */
  prod: /** @type {any} */ (null),
  /** Transporte elegido: `'usb'` | `'ble'`. */
  connType: /** @type {'usb'|'ble'} */ ('usb'),
  /** ¿Hay un dispositivo conectado? */
  connected: false,
  /** Handle del transporte activo `{ send, close }` o `null`. */
  conn: /** @type {any} */ (null),
  /** Versión de firmware informada por WHO (texto) o `''`. */
  fw: '',
  /** ¿El firmware soporta Tap-Hold (pulsación corta y larga)? Se recalcula en cada conexión. */
  soportaTapHold: false,
  /** Sistema de la computadora donde se USA el dispositivo (solo cambia los nombres de teclas). */
  target: /** @type {'win'|'mac'} */ ('win'),
  /** Configuración mostrada y editada. */
  cfg: /** @type {{ btns: Record<string, any>, arrows: any }} */ ({ btns: {}, arrows: { fmode: 1, orient: 0, vel: 25, acel: true } }),
  /** Código del botón elegido en la barra lateral. */
  selected: '',
  /** Lectura cruda de GETALL. */
  devCfg: Protocol.emptyCfg(),
};
