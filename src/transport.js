// @ts-check
/**
 * Transportes de conexión al dispositivo.
 *
 * `connectSerial()` (USB: Web Serial nativo o polyfill WebUSB) y `connectBle()`
 * (Nordic UART) abren el enlace, arrancan el bucle de lectura (una línea de
 * texto por callback) y devuelven un handle `{ send, close }`.
 *
 * NO conocen la UI ni el estado global de la app: index.html pasa callbacks
 * (`onLine`, `onClosed`, `log`, y `toast` para BLE) y decide qué hacer con los
 * errores que se propagan.
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

// ─────────────────────────────────────────────────────────────────────────────
// BLE — Nordic UART Service (NUS)
// ─────────────────────────────────────────────────────────────────────────────

const BLE_SVC = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const BLE_TX = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; // escribir (hacia el dispositivo)
const BLE_RX = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // notificaciones (desde el dispositivo)

/**
 * Abre la conexión BLE al servicio UART (NUS). El diagnóstico de los problemas
 * de acceso frecuentes (dispositivo emparejado como HID en Windows, servicio
 * ausente) se emite por `log` + `toast` y se devuelve `null`.
 *
 * Lanza en cancelación del usuario (`NotFoundError` / `AbortError`) y en errores
 * no diagnosticados (`SecurityError`, etc.) — el llamador los maneja.
 *
 * @param {TransportCallbacks & { toast: (ico: string, msg: string) => void }} cb
 * @returns {Promise<TransportHandle | null>}
 */
export async function connectBle(cb) {
  const log = cb.log || (() => {});
  const nav = /** @type {any} */ (navigator);

  if (!('bluetooth' in navigator)) {
    cb.toast('❌', 'Web Bluetooth no disponible. Use Chrome en desktop o Android.');
    log('Web Bluetooth requiere Chrome. En Windows puede necesitar habilitar la flag: chrome://flags/#enable-web-bluetooth-new-permissions-backend', 'w');
    return null;
  }

  log('══ Selector BLE ══════════════════════════════');
  log('El dispositivo puede aparecer sin nombre.');
  log('Seleccione el que corresponda y pruebe.');
  log('Si falla, intente con el otro de la lista.');
  log('══════════════════════════════════════════════');

  const device = await nav.bluetooth.requestDevice({
    acceptAllDevices: true,
    // UART (comandos) + HID/DIS/Battery: el firmware anuncia HID pero el UART existe en el GATT
    optionalServices: [
      BLE_SVC,
      '00001812-0000-1000-8000-00805f9b34fb', // HID over GATT
      '0000180a-0000-1000-8000-00805f9b34fb', // Device Information
      '0000180f-0000-1000-8000-00805f9b34fb', // Battery
    ],
  });

  log('Dispositivo seleccionado: ' + (device.name || '(sin nombre — seleccione y pruebe)'));
  log('Conectando vía GATT...');

  device.addEventListener('gattserverdisconnected', () => { cb.onClosed?.(); });

  const server = await device.gatt.connect();
  log('GATT OK. Buscando servicio UART (Nordic NUS)...');

  let service;
  try {
    service = await server.getPrimaryService(BLE_SVC);
  } catch (svcErr) {
    log('⚠ Servicio UART no accesible.', 'w');
    log('  Error: ' + svcErr.name + ' — ' + svcErr.message, 'w');
    try {
      const svcs = await server.getPrimaryServices();
      if (svcs.length) {
        log('  Servicios GATT disponibles en este dispositivo:', 'w');
        svcs.forEach((s) => log('    · ' + s.uuid, 'w'));
        if (svcs.some((s) => s.uuid.startsWith('6e400001'))) {
          log('  ✓ El servicio UART SÍ existe — posible conflicto con driver HID del OS.', 'w');
          log('  → En Windows: desemparejá el dispositivo del sistema y volvé a intentar.', 'w');
          log('  → O usá conexión USB para configurar (más simple y confiable).', 'w');
          cb.toast('❌', 'Conflicto HID/BLE en Windows. Ver Registro.');
        } else {
          log('  → El servicio UART (6e400001-...) NO aparece en este dispositivo.', 'w');
          log('  → Probablemente seleccionaste el dispositivo incorrecto.', 'w');
          cb.toast('❌', 'Dispositivo sin UART. Ver Registro.');
        }
      } else {
        log('  → No se pudieron leer los servicios (emparejado como HID en el OS).', 'w');
        log('  → Desemparejá "disMouse V4" desde Configuración → Bluetooth del sistema.', 'w');
        log('  → Luego conectá desde acá sin emparejarlo al OS.', 'w');
        cb.toast('❌', 'Sin acceso GATT. Desemparejá del sistema. Ver Registro.');
      }
    } catch (listErr) {
      log('  → No se pudo leer el GATT: ' + listErr.message, 'w');
      log('  → Probable causa: emparejado como HID en Windows.', 'w');
      log('  → Solución: desemparejá el dispositivo del sistema operativo.', 'w');
      cb.toast('❌', 'Sin acceso GATT. Ver Registro.');
    }
    try { device.gatt.disconnect(); } catch (_) { /* ignore */ }
    return null;
  }

  log('Servicio UART encontrado ✓');
  log('Configurando características RX/TX...');

  const rxChar = await service.getCharacteristic(BLE_RX);
  await rxChar.startNotifications();
  rxChar.addEventListener('characteristicvaluechanged', (e) => {
    const line = new TextDecoder().decode(/** @type {any} */ (e.target).value).trim();
    if (line) cb.onLine(line);
  });

  const txChar = await service.getCharacteristic(BLE_TX);
  log('RX/TX OK. Listo para enviar comandos.');

  return {
    async send(cmd) {
      // BLE: chunks de 20 bytes (MTU mínimo garantizado)
      const enc = new TextEncoder().encode(cmd + '\n');
      for (let i = 0; i < enc.length; i += 20) {
        await txChar.writeValue(enc.slice(i, i + 20));
      }
    },
    async close() {
      try { if (device.gatt.connected) device.gatt.disconnect(); } catch (_) { /* ignore */ }
    },
  };
}
