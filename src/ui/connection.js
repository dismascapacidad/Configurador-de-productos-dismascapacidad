// @ts-check
/**
 * Conexión con el dispositivo: abrir y cerrar USB/BLE, leer sus líneas, detectar el
 * modelo (WHO), leer su configuración (GETALL) y mandar comandos.
 *
 * La mecánica del transporte (bucle de lectura, framing, polyfill WebUSB, diagnóstico
 * BLE) vive en src/transport.js. Este módulo no dibuja nada: avisa lo que pasa por
 * `events` y la UI (app.js) se engancha ahí.
 */
import { S } from './state.js';
import { toast, addLog, sleep } from './dom.js';
import { isIOS } from './platform.js';
import * as Protocol from '../protocol.js';
import * as Transport from '../transport.js';
import * as M from '../model.js';
import { PRODUCTS, WHO_TO_PROD } from '../products.js';

/**
 * Enganches que rellena app.js. Se llaman en este orden: `connected` (enlace abierto) →
 * `chooseProduct` (solo si el modelo no se detectó solo) → `loaded` (producto y
 * configuración listos para mostrar). `disconnected` cuando se cierra.
 */
export const events = {
  connected: () => {},
  /** @type {() => Promise<string|null>} */
  chooseProduct: async () => null,
  loaded: () => {},
  disconnected: (/** @type {boolean} */ _physical) => {},
  busy: (/** @type {boolean} */ _busy) => {},
};

/** Cola de envío compartida: ver `SendQueue` en src/model.js. */
export const queue = new M.SendQueue(
  (cmd) => send(cmd),
  (b) => events.busy(b),
);

// ── Líneas recibidas ─────────────────────────────────────────────────────────

/** @type {((v: { model: string, version: string } | null) => void) | null} */
let whoResolve = null;
let lastLineAt = 0;

/** Último error ERR:* ligado a Tap-Hold / modo de disparo. */
let lastDeviceError = '';

function onLine(/** @type {string} */ line) {
  addLog(line, 'in');
  lastLineAt = Date.now();
  const who = Protocol.parseWho(line);
  if (who) {
    if (whoResolve) {
      whoResolve(who);
      whoResolve = null;
    }
    return;
  }
  const err = Protocol.describeDeviceError(line);
  if (err) {
    lastDeviceError = err;
    toast('⚠️', err);
    return;
  }
  // Red de seguridad: BTN de 11 campos ⇒ firmware compatible aunque el WHO no lo dijera.
  if (!S.soportaTapHold && Protocol.isExtendedBtnLine(line)) {
    addLog('BTN con 11 campos: se trata el dispositivo como compatible con Tap-Hold.', 'w');
    S.soportaTapHold = true;
  }
  if (S.soportaTapHold && line.startsWith('BTN:') && !Protocol.isExtendedBtnLine(line)) {
    addLog('Línea BTN de 7 campos con firmware -TH (se esperan 11): ignorada.', 'w');
    return;
  }
  Protocol.parseDeviceLine(line, S.devCfg, { requireTapHold: S.soportaTapHold });
}

/** Devuelve (y borra) el último error de Tap-Hold que informó el dispositivo. */
export function takeDeviceError() {
  const e = lastDeviceError;
  lastDeviceError = '';
  return e;
}

// ── Envío ────────────────────────────────────────────────────────────────────

/** Manda un comando crudo. `true` si salió. */
export async function send(/** @type {string} */ cmd) {
  if (!S.connected || !S.conn) {
    toast('❌', 'Sin conexión activa');
    return false;
  }
  try {
    await S.conn.send(cmd);
    addLog(cmd, 'out');
    await sleep(90); // el firmware necesita un respiro entre comandos
    return true;
  } catch (e) {
    addLog('Error al enviar: ' + /** @type {Error} */ (e).message, 'w');
    await disconnect(true);
    toast('⚠️', 'El dispositivo se desconectó');
    return false;
  }
}

// ── Lectura de configuración ─────────────────────────────────────────────────

/** Pide GETALL y espera a que dejen de llegar líneas (con tope). */
async function readDeviceConfig() {
  S.devCfg = Protocol.emptyCfg();
  lastLineAt = 0;
  await send('GETALL');
  const t0 = Date.now();
  while (Date.now() - t0 < 3500) {
    await sleep(100);
    if (lastLineAt && Date.now() - lastLineAt > 350) break;
  }
}

/** Lo leído → `S.cfg`, y anota en la cola qué comandos equivalen a lo que ya tiene el dispositivo. */
function adoptDeviceConfig() {
  S.cfg = M.fromDevice(S.prod, S.devCfg, S.soportaTapHold);
  queue.reset();
  for (const b of M.allButtons(S.prod)) {
    if (S.devCfg.btns[String(Protocol.CODE_TO_IDX[b.code])]) {
      queue.prime('btn:' + b.code, M.buttonCommands(b.code, S.cfg.btns[b.code], S.soportaTapHold));
    }
  }
  if (M.arrowSetOf(S.prod) && S.devCfg.fmode != null) queue.prime('arrows', M.arrowCommands(S.cfg.arrows));
  S.selected = S.prod.mainBtns[0].code;
}

// ── Después de abrir el enlace: WHO → producto → GETALL ──────────────────────

async function postConnect() {
  const whoPromise = new Promise((resolve) => {
    whoResolve = resolve;
    setTimeout(() => {
      if (whoResolve) {
        whoResolve(null);
        whoResolve = null;
      }
    }, 800);
  });
  await send('WHO');
  const who = /** @type {{ model: string, version: string } | null} */ (await whoPromise);

  S.soportaTapHold = Protocol.supportsTapHold(who?.version);
  S.fw = who?.version || '';
  if (S.soportaTapHold) addLog('Firmware con Tap-Hold detectado: ' + who?.version);

  /** @type {any} */
  const whoToProd = WHO_TO_PROD;
  /** @type {any} */
  const products = PRODUCTS;
  let prodId = who?.model ? whoToProd[who.model.toLowerCase().replace(/\s/g, '')] : null;
  if (!prodId || !products[prodId]) {
    // Firmware viejo (sin WHO) o modelo desconocido: se le pregunta a la persona.
    addLog('El dispositivo no respondió WHO — firmware sin soporte de autodetección.', 'w');
    prodId = await events.chooseProduct();
  }
  if (!prodId || !S.connected) {
    await disconnect(false);
    return;
  }
  S.prod = products[prodId];
  addLog('Producto: ' + S.prod.name);

  await readDeviceConfig();
  if (!S.connected) return;
  adoptDeviceConfig();
  events.loaded();
}

// ── Abrir y cerrar ───────────────────────────────────────────────────────────

/**
 * Abre la conexión. Resultado: `'ok'`, `'cancelled'` (la persona cerró el selector del
 * navegador) o `'error'` (el motivo ya se avisó con un toast y en el Registro).
 * @param {'usb'|'ble'} type
 */
export async function connect(type) {
  S.connType = type;
  try {
    if (type === 'ble') {
      if (isIOS()) {
        toast('❌', 'Bluetooth no está disponible en iPhone/iPad. Usá USB desde una PC o Mac.');
        return 'error';
      }
      S.conn = await Transport.connectBle({
        log: addLog,
        toast,
        onLine,
        onClosed: () => {
          if (S.connected) {
            addLog('Dispositivo BLE desconectado', 'w');
            disconnect(true);
            toast('⚠️', 'El dispositivo Bluetooth se desconectó');
          }
        },
      });
      if (!S.conn) return 'error'; // el problema de acceso ya quedó en el Registro
    } else {
      S.conn = await Transport.connectSerial({
        log: addLog,
        onLine,
        onClosed: (err) => {
          if (S.connected) {
            addLog('Conexión USB interrumpida: ' + (err?.message || ''), 'w');
            disconnect(true);
            toast('⚠️', 'El dispositivo USB se desconectó');
          }
        },
      });
    }
  } catch (e) {
    const err = /** @type {any} */ (e);
    if (err.name === 'NotFoundError' || err.name === 'AbortError') return 'cancelled';
    if (err.code === 'NO_SERIAL') {
      toast(
        '❌',
        isIOS()
          ? 'USB no está disponible en iPhone/iPad. Configurá desde una PC o Mac por cable.'
          : 'USB no disponible. Usá Chrome o Edge en una PC, o Chrome en Android con cable OTG.',
      );
      return 'error';
    }
    addLog(`Error ${type === 'ble' ? 'BLE' : 'USB'} [${err.name}]: ${err.message}`, 'w');
    if (err.name === 'SecurityError') {
      addLog('→ Causa probable: el dispositivo está emparejado al sistema como mouse (HID).', 'w');
      addLog('  Solución: quitarlo de Configuración → Bluetooth y volver a intentar.', 'w');
    }
    toast('❌', err.message || err.name);
    return 'error';
  }
  S.connected = true;
  addLog('Conectado (' + type.toUpperCase() + ')');
  events.connected();
  await postConnect();
  return 'ok';
}

/**
 * Cierra la conexión. Con `physical` el enlace ya se cortó solo (cable, apagado): no se
 * intenta mandar nada. Si no, primero sale lo que estuviera esperando en la cola.
 */
export async function disconnect(physical = false) {
  const was = S.connected;
  if (was && !physical) await queue.flush();
  S.connected = false;
  try {
    if (S.conn) await S.conn.close();
  } catch (_) {
    /* ya estaba cerrado */
  }
  S.conn = null;
  queue.reset();
  S.soportaTapHold = false;
  S.fw = '';
  S.prod = null;
  if (was) {
    addLog(physical ? 'Desconexión física detectada' : 'Desconectado', physical ? 'w' : '');
    events.disconnected(physical);
  }
}
