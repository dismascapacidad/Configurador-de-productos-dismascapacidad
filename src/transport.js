// @ts-check
/**
 * Transportes de conexión al dispositivo.
 *
 * `connectSerial()` abre el enlace (USB nativo Web Serial, o el polyfill sobre
 * WebUSB en Android), arranca el bucle de lectura (una línea de texto por
 * callback) y devuelve un handle `{ send, close }`.
 *
 * NO conoce la UI ni el estado global de la app: index.html le pasa callbacks
 * (`onLine`, `onClosed`, `log`) y decide qué hacer con los errores.
 *
 * `connectBle()` se agrega en un commit posterior (Fase 2).
 */

import { makePolyfillSerial } from './webusb-serial-polyfill.js';

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} TransportCallbacks
 * @property {(line: string) => void} onLine   Se llama con cada línea recibida (ya .trim(), sin vacías).
 * @property {(err?: Error) => void} [onClosed] Se llama si el enlace se corta solo (no en close() explícito).
 * @property {(msg: string, dir?: string) => void} [log] Sink de mensajes de diagnóstico.
 */

/**
 * @typedef {Object} TransportHandle
 * @property {(cmd: string) => Promise<void>} send  Envía `cmd` + '\n'.
 * @property {() => Promise<void>} close             Cierra el enlace (no dispara onClosed).
 */

/**
 * Abre la conexión USB (Web Serial nativo o polyfill WebUSB) a 9600 baud.
 * Lanza:
 *  - Error con `.code === 'NO_SERIAL'` si el navegador no tiene ni Web Serial ni WebUSB.
 *  - DOMException 'NotFoundError' si el usuario cierra el selector de puertos.
 *  - otros errores de apertura (el llamador decide el mensaje al usuario).
 *
 * @param {TransportCallbacks} cb
 * @returns {Promise<TransportHandle>}
 */
export async function connectSerial(cb) {
  const log = cb.log || (() => {});
  // Web Serial / WebUSB no están en los tipos DOM por defecto.
  const nav = /** @type {any} */ (navigator);
  const nativeSerial = 'serial' in navigator;
  const serialApi = nativeSerial
    ? nav.serial
    : ('usb' in navigator ? makePolyfillSerial() : null);

  if (!serialApi) {
    const e = /** @type {any} */ (new Error('Web Serial no disponible'));
    e.code = 'NO_SERIAL';
    throw e;
  }

  const viaPolyfill = !nativeSerial;
  if (viaPolyfill) log('USB vía WebUSB (compatibilidad Web Serial) — modo tablet Android.', 'w');

  let port;
  try {
    port = await serialApi.requestPort();
    await port.open({ baudRate: 9600 });
  } catch (e) {
    if (e.name !== 'NotFoundError' && viaPolyfill) {
      log('→ Si el equipo figura en la lista pero no abre: otra app tomó el puerto, o esta', 'w');
      log('  tablet/ROM no permite acceso WebUSB a puertos CDC. Reconectá el cable OTG y reintentá.', 'w');
    }
    throw e;
  }

  const reader = port.readable.getReader();
  const writer = port.writable.getWriter();

  // Bucle de lectura: acumula bytes, parte por '\n', entrega líneas .trim().
  (async () => {
    const dec = new TextDecoder();
    let buf = '';
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          const t = line.trim();
          if (t) cb.onLine(t);
        }
      }
    } catch (e) {
      if (e.name === 'AbortError') return; // cierre esperado
      cb.onClosed?.(e);
    }
  })();

  return {
    async send(cmd) {
      await writer.write(new TextEncoder().encode(cmd + '\n'));
    },
    async close() {
      try { await reader.cancel(); reader.releaseLock(); } catch (_) { /* ignore */ }
      try { await writer.close(); writer.releaseLock(); } catch (_) { /* ignore */ }
      try { await port.close(); } catch (_) { /* ignore */ }
    },
  };
}
