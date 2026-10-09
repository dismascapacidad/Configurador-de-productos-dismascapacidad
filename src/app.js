// @ts-check
/**
 * Punto de entrada del configurador. Solo arma las piezas:
 *   src/model.js        lógica pura (qué se muestra, qué se manda, cola de envío)
 *   src/ui/connection.js  USB/BLE, WHO, GETALL, envío
 *   src/ui/view.js      pantalla de configuración (flechas, botones, detalle)
 *   src/ui/chrome.js    tema, sistema de destino, modales, barra de estado
 *   src/ui/ayudas.js    textos de ayuda al pasar el mouse
 *
 * Requiere servir por http(s): con file:// fallan los import.
 */
import { initChrome } from './ui/chrome.js';
import { initView } from './ui/view.js';
import { initAyudas, loadAyudas } from './ui/ayudas.js';
import { addLog } from './ui/dom.js';

function init() {
  initAyudas();
  loadAyudas();
  initView();
  initChrome();
  addLog('Configurador EpE listo.');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
