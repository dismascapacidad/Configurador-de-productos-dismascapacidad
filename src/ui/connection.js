// @ts-check
/**
 * Capa de conexión de la UI: abrir/cerrar el enlace (USB Web Serial o BLE
 * Nordic UART), enviar comandos, y sincronizar el estado visible (dots, botones,
 * status bar, secciones habilitadas) con `S.connected`.
 *
 * La mecánica del transporte (bucle de lectura, framing, polyfill WebUSB,
 * diagnóstico BLE) vive en src/transport.js. El post-conexión (WHO → detectar
 * producto → GETALL) se orquesta acá.
 */
import { S } from './state.js';
import { toast, addLog, closeModal } from './dom.js';
import { closeDrawer } from './drawer.js';
import { isIOS } from './platform.js';
import * as Protocol from '../protocol.js';
import * as Transport from '../transport.js';
import { DEV_IMAGES, DEV_WELCOME, WHO_TO_PROD, PRODUCTS, LATEST_FW } from '../products.js';

/**
 * Enganches con funciones que todavía viven en otros módulos en transición.
 * `init()` (app.js) los rellena. A medida que esos módulos se importan directo,
 * cada entrada se reemplaza por un import y se borra de acá.
 */
export const connectionHooks = {
  /** @type {() => void} */
  renderPresetTabs: () => {},
  /** @type {() => void} */
  applyDevCfgToCards: () => {},
  /** @type {(id: string) => void} */
  selectProd: () => {},
  /** @type {() => void} */
  onArrowMode: () => {},
  /** @type {(id: string) => void} */
  openModal: () => {},
};

/** getElementById con tipo laxo (transicional). */
function el(/** @type {string} */ id) {
  return /** @type {any} */ (document.getElementById(id));
}

/** Config vacía leída del dispositivo (forma de `S.devCfg`). */
export function mkCfg() {
  return { orient: null, vel: null, acel: null, fmode: null, btns: {} };
}

// Resolver para la promesa de WHO (la respuesta llega asincrónica por onLine).
/** @type {((v: any) => void) | null} */
let _whoResolve = null;

// ── GETALL + PARSE ───────────────────────────────────────
export async function getAllConfig() {
  S.devCfg = mkCfg();
  await send('GETALL');
  setTimeout(connectionHooks.applyDevCfgToCards, 2400);
}

export function parseLine(line) {
  const who = Protocol.parseWho(line);
  if (who) {
    if (_whoResolve) {
      _whoResolve(who);
      _whoResolve = null;
    }
    return;
  }
  Protocol.parseDeviceLine(line, S.devCfg); // vuelca ORIENT/VEL/ACEL/FMODE/BTN en S.devCfg
}

// ── SECCIONES HABILITADAS / DESHABILITADAS ───────────────
export function setSections(on) {
  ['secBtns'].forEach((id) => el(id)?.classList.toggle('sec-off', !on));
  // secArrows solo se habilita si el producto tiene flechas
  if (S.prod && S.prod.hasArrows) el('secArrows')?.classList.toggle('sec-off', !on);
  const btnSave = el('btnSave');
  if (btnSave) btnSave.disabled = !on;
  const btnReset = el('btnReset');
  if (btnReset) btnReset.disabled = !on;
  const btnSaveCustom = el('btnSaveCustom');
  if (btnSaveCustom) btnSaveCustom.disabled = !on;
  const connSub = el('connSub');
  if (connSub) connSub.style.display = on ? 'flex' : 'none';
  const logInput = el('logCmdInput');
  const btnLogSend = el('btnLogSend');
  if (logInput) logInput.disabled = !on;
  if (btnLogSend) btnLogSend.disabled = !on;
  // Botones del menú lateral: solo si hay conexión Y producto reconocido
  const drwCfg = el('drwBtnCfg');
  const drwReset = el('drwBtnReset');
  if (drwCfg) drwCfg.disabled = !on || !S.prod;
  if (drwReset) drwReset.disabled = !on || !S.prod;
}

// ── MODAL / STATUS BAR DE BIENVENIDA AL DISPOSITIVO ──────
function updateStatusBar(model, version) {
  const key = model ? model.toLowerCase().replace(/[\s]/g, '') : '';
  const imgSrc = DEV_IMAGES[key] || '';
  const sbImg = el('sbDevImg');
  const sbName = el('sbDevName');
  const sbVer = el('sbFwVersion');
  const sbBadge = el('sbConnType2');
  if (sbImg) {
    sbImg.src = imgSrc;
    sbImg.style.display = imgSrc ? '' : 'none';
  }
  if (sbName) sbName.textContent = model ? '¡Hola, ' + model + '!' : '';
  if (sbVer) sbVer.textContent = version || '';
  if (sbBadge) sbBadge.textContent = S.connType.toUpperCase();
}

function showWelcomeDev(model, version) {
  const key = model.toLowerCase().replace(/[\s]/g, '');
  const img = el('welcomeDevImg');
  const ttl = el('welcomeDevTitle');
  const ver = el('welcomeDevVersion');
  if (img) {
    img.style.animation = 'none';
    img.src = DEV_IMAGES[key] || '';
    requestAnimationFrame(() => {
      img.style.animation = '';
    });
  }
  if (ttl) ttl.textContent = DEV_WELCOME[key] || '¡Hola, ' + model + '!';
  if (ver) ver.textContent = version ? 'Firmware ' + version : '';
  updateStatusBar(model, version);
  connectionHooks.openModal('welcomeDevModal');
  setTimeout(() => closeModal('welcomeDevModal'), 2500);
}

// ── POST-CONEXIÓN: WHO → selección automática → GETALL ──
async function postConnect() {
  // Enviar WHO y esperar respuesta hasta 800ms
  const whoPromise = new Promise((resolve) => {
    _whoResolve = resolve;
    setTimeout(() => {
      if (_whoResolve) {
        _whoResolve(null);
        _whoResolve = null;
      }
    }, 800);
  });
  await send('WHO');
  const who = await whoPromise;

  if (who && who.model) {
    // Autodetección exitosa
    const prodKey = WHO_TO_PROD[who.model.toLowerCase().replace(/[\s]/g, '')];
    if (prodKey && PRODUCTS[prodKey]) connectionHooks.selectProd(prodKey);
    showWelcomeDev(who.model, who.version);

    const vEl = el('sbFwVersion');
    if (vEl) vEl.textContent = who.version || '';

    // Comparar con la versión más reciente conocida
    const latest = LATEST_FW[who.model];
    if (latest && who.version) {
      const cur = parseInt((who.version || '').replace(/\D/g, ''));
      const latNum = parseInt(latest.replace(/\D/g, ''));
      if (cur < latNum) {
        toast(
          '⬆️',
          `Para tener las últimas funcionalidades, actualizá tu ${who.model}. Visitá la sección Actualizaciones para saber más.`,
        );
        addLog(`Firmware desactualizado: ${who.version} → última versión conocida: ${latest}`, 'w');
      }
    }
  } else {
    // Firmware viejo — sin WHO: pedir selección manual de producto
    const vEl = el('sbFwVersion');
    if (vEl) vEl.textContent = '';
    connectionHooks.openModal('selectProdModal');
    addLog('El dispositivo no respondió WHO — firmware sin soporte de autodetección.', 'w');
  }

  // GETALL solo si el dispositivo fue reconocido
  if (S.prod) {
    S.devCfg = mkCfg();
    await send('GETALL');
    setTimeout(connectionHooks.applyDevCfgToCards, 2400);
  }
}

// ── CONEXIÓN ─────────────────────────────────────────────
export async function toggleConn() {
  S.connected ? await disconnect() : await connectDevice();
}

async function connectDevice() {
  if (S.connType === 'ble') {
    await connectBLE();
  } else {
    await connectUSB();
  }
}

// USB: la mecánica (Web Serial nativo + polyfill WebUSB, bucle de lectura,
// framing por '\n') vive en src/transport.js. Acá solo se enganchan callbacks.
async function connectUSB() {
  try {
    S.conn = await Transport.connectSerial({
      log: addLog,
      onLine: (line) => {
        addLog(line, 'in');
        parseLine(line);
      },
      onClosed: (err) => {
        if (S.connected) {
          addLog('Conexión USB interrumpida: ' + (err?.message || ''), 'w');
          disconnect(true);
          toast('⚠️', 'El dispositivo USB se desconectó');
        }
      },
    });
    setConnected(true);
    await postConnect();
  } catch (e) {
    if (e.name === 'NotFoundError') return; // el usuario cerró el selector sin elegir
    if (e.code === 'NO_SERIAL') {
      if (isIOS())
        toast('❌', 'USB no disponible en iOS/iPadOS. Configurá desde una PC/Mac por cable.');
      else
        toast(
          '❌',
          'USB no disponible. Usá Chrome o Edge en PC, o Chrome en Android con cable OTG.',
        );
      return;
    }
    addLog('Error USB: ' + e.message, 'w');
    toast('❌', e.message);
  }
}

// BLE: la conexión (Nordic UART, diagnóstico de conflicto HID en Windows) vive
// en src/transport.js → Transport.connectBle.
async function connectBLE() {
  if (isIOS()) {
    toast('❌', 'BLE no disponible en iOS/iPadOS. Usá USB desde una PC o Mac.');
    addLog('iOS/iPadOS: Web Bluetooth no está soportado por Apple en ningún navegador.', 'w');
    addLog('→ Conectá el dispositivo por USB a una computadora para configurarlo.', 'w');
    return;
  }
  try {
    S.conn = await Transport.connectBle({
      log: addLog,
      toast: toast,
      onLine: (line) => {
        addLog(line, 'in');
        parseLine(line);
      },
      onClosed: () => {
        if (S.connected) {
          addLog('Dispositivo BLE desconectado', 'w');
          disconnect(true);
          toast('⚠️', 'El dispositivo Bluetooth se desconectó');
        }
      },
    });
    if (!S.conn) return; // problema de acceso ya diagnosticado en el Registro
    setConnected(true);
    await postConnect();
  } catch (e) {
    if (e.name === 'NotFoundError' || e.name === 'AbortError') return; // usuario canceló
    addLog('Error BLE [' + e.name + ']: ' + e.message, 'w');
    if (e.name === 'SecurityError') {
      addLog('→ Causa probable: el dispositivo está emparejado al OS como HID.', 'w');
      addLog('  Chrome no puede acceder a dispositivos HID vía GATT en Windows.', 'w');
      addLog('  Solución: desemparejar el dispositivo del OS y volver a intentar.', 'w');
    }
    toast('❌', e.message || e.name);
  }
}

async function disconnect(physical = false) {
  const was = S.connected;
  S.connected = false;
  // El handle de src/transport.js (USB o BLE) hace toda la limpieza del enlace.
  try {
    if (S.conn) await S.conn.close();
  } catch (_) {
    /* ignore */
  }
  S.conn = null;
  if (was) setConnected(false, physical);
}

export async function send(cmd) {
  if (!S.connected || !S.conn) {
    toast('❌', 'Sin conexión activa');
    return false;
  }
  try {
    await S.conn.send(cmd); // USB o BLE — el handle sabe cómo (chunking BLE incluido)
    addLog(cmd, 'out');
    await new Promise((r) => setTimeout(r, 90));
    return true;
  } catch (e) {
    addLog('Error al enviar: ' + e.message, 'w');
    await disconnect(true);
    toast('⚠️', 'El dispositivo se desconectó');
    return false;
  }
}

function setConnected(val, physical = false) {
  S.connected = val;
  ['sdot', 'sdot2'].forEach((id) => {
    const d = el(id);
    if (d) d.className = 'sdot' + (val ? ' on' : '');
  });
  ['stxt', 'stxt2'].forEach((id) => {
    const t = el(id);
    if (t) t.textContent = val ? 'Conectado' : 'Desconectado';
  });
  const btn = el('btnConn');
  if (btn) {
    btn.textContent = val ? 'Desconectar' : 'Conectar';
    btn.className = 'btn sm' + (val ? ' ghost' : ' pri');
  }
  setSections(val);
  // Status bar
  const sb = el('statusBar');
  if (sb) sb.style.display = val ? '' : 'none';
  if (!val) {
    updateStatusBar('', '');
    // Resetear tab activa para que al reconectar se auto-seleccione correctamente
    S.activePresetTab = null;
    const pm = el('presetsModal');
    if (pm && pm.style.display !== 'none') connectionHooks.renderPresetTabs();
  }
  // Drawer: ocultar setup cuando hay conexión
  const setup = el('drwSetup');
  if (setup) setup.style.display = val ? 'none' : '';
  if (val) {
    closeDrawer();
    closeModal('connModal');
  }
  // Botón "Conectar" rápido en la topbar
  const cq = el('btnConnQuick');
  if (cq) {
    cq.textContent = val ? 'Desconectar' : 'Conectar →';
    cq.className = 'btn-conn-quick' + (val ? ' S.connected' : '');
    cq.onclick = val ? toggleConn : openConnModal;
  }
  // Botón dentro del connModal si está abierto
  const btnM = el('btnConnM');
  if (btnM) {
    btnM.textContent = val ? 'Desconectar' : 'Conectar';
    btnM.className = 'btn sm' + (val ? ' ghost' : ' pri');
    btnM.style.width = '100%';
  }
  const subM = el('connSubM');
  if (subM) subM.style.display = val ? 'flex' : 'none';
  if (val) {
    addLog('Conectado (' + S.connType.toUpperCase() + '): ' + (S.prod ? S.prod.name : '—'));
    connectionHooks.onArrowMode();
  } else {
    addLog(physical ? 'Desconexión física detectada' : 'Desconectado', physical ? 'w' : '');
  }
}

// Canal de comandos crudos: reusa send() (misma escritura RX que la UI estructurada).
export async function sendLogCmd() {
  const inp = el('logCmdInput');
  const cmd = inp.value.trim();
  if (!cmd || !S.connected) return;
  const ok = await send(cmd);
  if (ok) inp.value = '';
}

// ── CONN MODAL ───────────────────────────────────────────
/** Con WHO el producto se detecta solo → pasos 2 y 3 del connModal siempre activos. */
export function enableConnModalSteps() {
  _connStepEnable(2);
  _connStepEnable(3);
}

export function openConnModal() {
  enableConnModalSteps();

  // Sincronizar producto si ya hay uno seleccionado
  document
    .querySelectorAll('#devListModal .dev-opt:not(.disabled)')
    .forEach((o) => o.classList.remove('active'));
  if (S.prod) {
    const opt = el('opt-' + S.prod.id + '-m');
    if (opt) opt.classList.add('active');
  }
  // Sincronizar tipo de conexión
  ['usb', 'ble'].forEach((t) => {
    const o = el('ct-' + t + '-m');
    if (o) o.classList.toggle('active', S.connType === t);
  });
  // iOS: BLE no disponible
  if (isIOS()) {
    const ib = el('iosBlockM');
    if (ib) ib.style.display = '';
    const ctb = el('ct-ble-m');
    if (ctb) {
      ctb.classList.add('ct-disabled');
      ctb.querySelector('.ct-sub').textContent = 'No disponible';
    }
  }
  const btnM = el('btnConnM');
  if (btnM) {
    btnM.textContent = S.connected ? 'Desconectar' : 'Conectar';
    btnM.className = 'btn sm' + (S.connected ? ' ghost' : ' pri');
    btnM.style.width = '100%';
  }
  const sub = el('connSubM');
  if (sub) sub.style.display = S.connected ? 'flex' : 'none';
  connectionHooks.openModal('connModal');
}

function _connStepEnable(n) {
  const step = el('cstep' + n);
  if (!step) return;
  step.style.opacity = '';
  step.style.pointerEvents = '';
  step.classList.add('active');
}
