// @ts-check
/**
 * Catálogo de productos, presets de fábrica, tooltips y mapeo de nombres WHO.
 *
 * DATOS PUROS extraídos 1:1 de `index.html` (Fase 2 del plan de deuda técnica).
 * Sin lógica: solo describe qué productos existen, qué botones muestran, qué
 * presets ofrecen y cómo se ve cada uno.
 *
 * Consistencia verificada en `tests/products.test.js`.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Perfiles de producto
//   mainBtns:   botones visibles en la UI
//   arrowBtns:  flechas (vacío = producto sin flechas)
//   presets:    ids de FACTORY_CMDS que se ofrecen para este producto
//   cardTitle:  título de la sección de botones
// ─────────────────────────────────────────────────────────────────────────────

export const PRODUCTS = {
  dismouse: {
    id: 'dismouse', name: 'disMouse',
    cardTitle: 'Botones — disMouse',
    hasArrows: true,
    mainBtns: [
      { code: 'BR', label: 'Botón Rojo', color: '#EF4444' },
      { code: 'BA', label: 'Botón Azul', color: '#3B82F6' },
      { code: 'BN', label: 'Botón Naranja', color: '#F97316' },
      { code: 'BC', label: 'Botón Celeste', color: '#06B6D4' },
    ],
    arrowBtns: [
      { code: 'FU', label: 'Flecha ↑', color: '#EAB308' },
      { code: 'FD', label: 'Flecha ↓', color: '#EAB308' },
      { code: 'FL', label: 'Flecha ←', color: '#EAB308' },
      { code: 'FR', label: 'Flecha →', color: '#EAB308' },
    ],
    presets: ['asterics_barrido', 'asterics_dir', 'asterics_huffman', 'asterics_sec', 'cboard_barrido', 'juego_flechas', 'juego_wasd', 'std_enter', 'std_drag', 'std_scroll', 'std_copy'],
  },
  disbutton: {
    id: 'disbutton', name: 'disButton',
    cardTitle: 'Configura tu disButton',
    hasArrows: false,
    centeredLayout: true,
    mainBtns: [
      { code: 'BR', label: 'disButton', color: '#EF4444' },
    ],
    arrowBtns: [],
    presets: ['db_clic_press', 'db_clic_release', 'db_youtube', 'db_cboard'],
  },
  dishub: {
    id: 'dishub', name: 'disHub',
    cardTitle: 'Conectores — disHub',
    hasArrows: false,
    dishubLayout: true,
    hasCenterConnectors: true,
    mainBtns: [
      { code: 'BR', label: 'Botón Rojo', note: 'también Conector 1', color: '#EF4444', group: 'A' },
      { code: 'BA', label: 'Botón Azul', note: 'también Conector 8', color: '#3B82F6', group: 'A' },
      { code: 'BN', label: 'Conector 2', color: '#F97316', group: 'B' },
      { code: 'BC', label: 'Conector 7', color: '#06B6D4', group: 'B' },
    ],
    centerBtns: [
      { code: 'FU', label: 'Conector 3', color: '#EAB308' },
      { code: 'FD', label: 'Conector 4', color: '#EAB308' },
      { code: 'FL', label: 'Conector 5', color: '#EAB308' },
      { code: 'FR', label: 'Conector 6', color: '#EAB308' },
    ],
    arrowBtns: [],
    presets: ['dh_asterics_barrido', 'dh_asterics_dir', 'dh_asterics_huffman', 'dh_asterics_sec', 'dh_cboard_barrido', 'dh_juego_flechas', 'dh_juego_wasd', 'dh_std_enter'],
  },
  disjoystick: {
    id: 'disjoystick', name: 'disJoystick',
    cardTitle: 'Botones — disJoystick',
    hasArrows: true,
    mainBtns: [
      { code: 'BR', label: 'Botón Rojo', color: '#EF4444' },
      { code: 'BA', label: 'Botón Azul', color: '#3B82F6' },
      { code: 'BN', label: 'Botón Naranja', color: '#F97316' },
      { code: 'BC', label: 'Botón Celeste', color: '#06B6D4' },
    ],
    arrowBtns: [
      { code: 'FU', label: 'Flecha ↑', color: '#EAB308' },
      { code: 'FD', label: 'Flecha ↓', color: '#EAB308' },
      { code: 'FL', label: 'Flecha ←', color: '#EAB308' },
      { code: 'FR', label: 'Flecha →', color: '#EAB308' },
    ],
    presets: ['asterics_barrido', 'asterics_dir', 'asterics_huffman', 'asterics_sec', 'cboard_barrido', 'juego_flechas', 'juego_wasd', 'std_enter', 'std_drag', 'std_scroll', 'std_copy'],
  },
  dishubmini: {
    id: 'dishubmini', name: 'disHub mini',
    cardTitle: 'Botones — disHub mini',
    hasArrows: true,
    centeredLayout: true,
    arrowSectionTitle: 'Entradas externas',
    arrowSectionIcon: '🔌',
    mainBtns: [
      { code: 'BR', label: 'Botón Rojo', color: '#EF4444' },
      { code: 'BA', label: 'Botón Azul', color: '#3B82F6' },
    ],
    arrowBtns: [
      { code: 'FU', label: 'Externo 1', color: '#EAB308' },
      { code: 'FD', label: 'Externo 2', color: '#EAB308' },
      { code: 'FL', label: 'Externo 3', color: '#EAB308' },
      { code: 'FR', label: 'Externo 4', color: '#EAB308' },
    ],
    presets: ['dh_asterics_barrido', 'dh_asterics_dir', 'dh_asterics_huffman', 'dh_asterics_sec', 'dh_cboard_barrido', 'dh_juego_flechas', 'dh_juego_wasd', 'dh_std_enter'],
  },
  dishubkeys: {
    id: 'dishubkeys', name: 'disHub keys',
    cardTitle: 'Botones — disHub keys',
    hasArrows: false,
    mainBtns: [
      { code: 'BR', label: 'Botón Rojo', color: '#EF4444' },
      { code: 'BN', label: 'Botón Naranja', color: '#F97316' },
      { code: 'BC', label: 'Botón Celeste', color: '#06B6D4' },
      { code: 'BA', label: 'Botón Azul', color: '#3B82F6' },
    ],
    arrowBtns: [],
    presets: ['asterics_barrido', 'asterics_dir', 'asterics_sec', 'cboard_barrido'],
  },
};

// ── Grupos de tabs de presets (prodIds: qué ids de PRODUCTS agrupa la tab) ────
export const PRESET_TABS = [
  { tabId: 'dismouse', label: 'disMouse', prodIds: ['dismouse'] },
  { tabId: 'disjoystick', label: 'disJoystick', prodIds: ['disjoystick'] },
  { tabId: 'disbutton', label: 'disButton', prodIds: ['disbutton', 'disbuttonbt'] },
  { tabId: 'dishub', label: 'disHub', prodIds: ['dishub', 'dishubbt'] },
  { tabId: 'dishubmini', label: 'disHub mini', prodIds: ['dishubmini'] },
  { tabId: 'dishubkeys', label: 'disHub keys', prodIds: ['dishubkeys'] },
];

// ── Últimas versiones de firmware conocidas (actualizar al lanzar firmware) ───
export const LATEST_FW = {
  disMouse: 'R019',
  disButton: 'R019',
  disHub: 'R013',
  disMouth: 'R001',
};

// ─────────────────────────────────────────────────────────────────────────────
// Presets de fábrica — secuencias de comandos ya listas para enviar.
// `%P%` se resuelve en tiempo de aplicación (window.Protocol.resolvePreset).
// ─────────────────────────────────────────────────────────────────────────────

const _SP = ' ';
const _ENT = '215'; // ENTER
const _DIS = 'X:P:0:0:-:-'; // botón desactivado

export const FACTORY_CMDS = {
  asterics_barrido: [
    'CFG:BR:K:P:0:s:-:-', 'CFG:BN:K:P:0:s:-:-',
    'CFG:BA:K:P:0:c:-:-', 'CFG:BC:K:P:0:c:-:-',
    'CFG:FU:' + _DIS, 'CFG:FD:' + _DIS, 'CFG:FL:' + _DIS, 'CFG:FR:' + _DIS, 'FMODE:0',
  ],
  asterics_dir: [
    'CFG:BR:K:P:0:' + _SP + ':-:-', 'CFG:BN:K:P:0:' + _SP + ':-:-',
    'CFG:BA:K:P:0:' + _SP + ':-:-', 'CFG:BC:K:P:0:' + _SP + ':-:-',
    'FMODE:2',
  ],
  asterics_huffman: [
    'CFG:BN:K:P:0:1:-:-', 'CFG:BR:K:P:0:2:-:-',
    'CFG:BC:K:P:0:7:-:-', 'CFG:BA:K:P:0:8:-:-',
    'CFG:FU:K:P:0:3:-:-', 'CFG:FD:K:P:0:4:-:-',
    'CFG:FL:K:P:0:5:-:-', 'CFG:FR:K:P:0:6:-:-',
    'FMODE:0',
  ],
  asterics_sec: [
    'CFG:BR:K:P:0:c:-:-', 'CFG:BA:K:P:0:c:-:-',
    'CFG:BN:K:P:0:c:-:-', 'CFG:BC:K:P:0:c:-:-',
    'CFG:FL:K:P:0:a:-:-', 'CFG:FR:K:P:0:s:-:-',
    'CFG:FU:' + _DIS, 'CFG:FD:' + _DIS, 'FMODE:0',
  ],
  cboard_barrido: [
    'CFG:BR:K:P:0:' + _ENT + ':-:-', 'CFG:BN:K:P:0:' + _ENT + ':-:-',
    'CFG:BA:K:P:0:' + _SP + ':-:-', 'CFG:BC:K:P:0:' + _SP + ':-:-',
    'CFG:FU:' + _DIS, 'CFG:FD:' + _DIS, 'CFG:FL:' + _DIS, 'CFG:FR:' + _DIS, 'FMODE:0',
  ],
  juego_flechas: [
    'CFG:BR:K:P:0:' + _ENT + ':-:-', 'CFG:BN:K:P:0:' + _ENT + ':-:-',
    'CFG:BA:K:P:0:' + _SP + ':-:-', 'CFG:BC:K:P:0:' + _SP + ':-:-',
    'FMODE:2',
  ],
  juego_wasd: [
    'CFG:BR:K:P:0:' + _ENT + ':-:-', 'CFG:BN:K:P:0:' + _ENT + ':-:-',
    'CFG:BA:K:P:0:' + _SP + ':-:-', 'CFG:BC:K:P:0:' + _SP + ':-:-',
    'CFG:FU:K:P:0:w:-:-', 'CFG:FL:K:P:0:a:-:-',
    'CFG:FD:K:P:0:s:-:-', 'CFG:FR:K:P:0:d:-:-',
    'FMODE:0',
  ],
  std_enter: [
    'CFG:BR:M:P:0:1:-:-', 'CFG:BN:M:P:0:1:-:D',
    'CFG:BC:K:P:0:' + _ENT + ':-:-', 'CFG:BA:M:P:0:2:-:-',
    'FMODE:1', 'ORIENT:0', 'VEL:35', 'ACEL:1',
  ],
  std_drag: [
    'CFG:BR:M:P:0:1:-:-', 'CFG:BN:M:P:0:1:-:D',
    'CFG:BC:M:P:0:1:-:M', 'CFG:BA:M:P:0:2:-:-',
    'FMODE:1', 'ORIENT:0', 'VEL:35', 'ACEL:1',
  ],
  std_scroll: [
    'CFG:BR:M:P:0:1:-:-', 'CFG:BN:M:P:0:SU:-:-',
    'CFG:BC:M:P:0:SD:-:-', 'CFG:BA:M:P:0:2:-:-',
    'FMODE:1', 'ORIENT:0', 'VEL:35', 'ACEL:1',
  ],
  // '%P%' se resuelve en applyPreset(): 'C' (Ctrl, Windows) o 'G' (GUI/⌘, Mac)
  std_copy: [
    'CFG:BR:M:P:0:1:-:-', 'CFG:BN:K:P:0:c:%P%:-',
    'CFG:BC:K:P:0:v:%P%:-', 'CFG:BA:M:P:0:2:-:-',
    'FMODE:1', 'ORIENT:0', 'VEL:35', 'ACEL:1',
  ],
  // ── disButton (1 botón)
  db_clic_press: ['CFG:BR:M:P:0:1:-:-'],
  db_clic_release: ['CFG:BR:M:R:0:1:-:-'],
  db_youtube: ['CFG:BR:K:P:0:' + _SP + ':-:-'],
  db_cboard: ['CFG:BR:K:P:0:' + _ENT + ':-:-'],
  // ── disHub (rojo BR, azul BA, externos FU/FD/FL/FR)
  dh_asterics_barrido: [
    'CFG:BR:K:P:0:s:-:-', 'CFG:BA:K:P:0:c:-:-',
    'CFG:FU:' + _DIS, 'CFG:FD:' + _DIS, 'CFG:FL:' + _DIS, 'CFG:FR:' + _DIS, 'FMODE:0',
  ],
  dh_asterics_dir: [
    'CFG:BR:K:P:0:' + _SP + ':-:-', 'CFG:BA:K:P:0:' + _SP + ':-:-',
    'FMODE:2',
  ],
  dh_asterics_huffman: [
    'CFG:BR:K:P:0:1:-:-', 'CFG:FU:K:P:0:2:-:-', 'CFG:FD:K:P:0:3:-:-',
    'CFG:FL:K:P:0:4:-:-', 'CFG:FR:K:P:0:5:-:-', 'CFG:BA:K:P:0:6:-:-',
    'FMODE:0',
  ],
  dh_asterics_sec: [
    'CFG:BR:K:P:0:c:-:-', 'CFG:BA:K:P:0:c:-:-',
    'CFG:FL:K:P:0:a:-:-', 'CFG:FR:K:P:0:s:-:-',
    'CFG:FU:' + _DIS, 'CFG:FD:' + _DIS, 'FMODE:0',
  ],
  dh_cboard_barrido: [
    'CFG:BR:K:P:0:' + _ENT + ':-:-', 'CFG:BA:K:P:0:' + _SP + ':-:-',
    'CFG:FU:' + _DIS, 'CFG:FD:' + _DIS, 'CFG:FL:' + _DIS, 'CFG:FR:' + _DIS, 'FMODE:0',
  ],
  dh_juego_flechas: [
    'CFG:BR:K:P:0:' + _ENT + ':-:-', 'CFG:BA:K:P:0:' + _SP + ':-:-',
    'FMODE:2',
  ],
  dh_juego_wasd: [
    'CFG:BR:K:P:0:' + _ENT + ':-:-', 'CFG:BA:K:P:0:' + _SP + ':-:-',
    'CFG:FU:K:P:0:w:-:-', 'CFG:FL:K:P:0:a:-:-',
    'CFG:FD:K:P:0:s:-:-', 'CFG:FR:K:P:0:d:-:-',
    'FMODE:0',
  ],
  dh_std_enter: [
    'CFG:BR:M:P:0:1:-:-', 'CFG:BA:M:P:0:2:-:-',
    'FMODE:1', 'ORIENT:0', 'VEL:35', 'ACEL:1',
  ],
};

// ── Metadata visual de cada preset (tarjeta del modal de configuraciones) ─────
export const FACTORY_CARDS = {
  asterics_barrido: { icon: '💬', name: 'Asterics - Barrido', sub: 'S / C · sin debounce', tipId: 'tip-asterics-barrido' },
  asterics_dir: { icon: '🧭', name: 'Asterics - Dirección', sub: 'Flechas + Espacio', tipId: 'tip-asterics-dir' },
  asterics_huffman: { icon: '🔢', name: 'Asterics - Huffman', sub: 'Botones 1-8', tipId: 'tip-asterics-huffman' },
  asterics_sec: { icon: '↔️', name: 'Asterics - Secuencial', sub: 'A / S / C · sin debounce', tipId: 'tip-asterics-sec' },
  cboard_barrido: { icon: '📋', name: 'Cboard - Barrido', sub: 'Enter / Espacio · sin debounce', tipId: 'tip-cboard-barrido' },
  juego_flechas: { icon: '🕹️', name: 'Juego - Flechas', sub: 'Enter / Espacio + ↑↓←→', tipId: 'tip-juego-flechas' },
  juego_wasd: { icon: '⌨️', name: 'Juego - WASD', sub: 'Enter / Espacio + WASD', tipId: 'tip-juego-wasd' },
  std_enter: { icon: '🖱️', name: 'Estándar + Enter', sub: 'Clic · doble · enter · der.', tipId: 'tip-std-enter' },
  std_drag: { icon: '🤏', name: 'Estándar + Arrastrar', sub: 'Clic · doble · mantener · der.', tipId: 'tip-std-drag' },
  std_scroll: { icon: '📜', name: 'Estándar + Scroll', sub: 'Clic · scroll ↑↓ · der.', tipId: 'tip-std-scroll' },
  std_copy: { icon: '📄', name: 'Clics + Copiar/Pegar', sub: 'Clic · Copiar · Pegar · der.', tipId: 'tip-std-copy' },
  db_clic_press: { icon: '🖱️', name: 'Clic al presionar', sub: 'Clic izq · Press', tipId: 'tip-db-clic-press' },
  db_clic_release: { icon: '🖱️', name: 'Clic al soltar', sub: 'Clic izq · Release', tipId: 'tip-db-clic-release' },
  db_youtube: { icon: '▶️', name: 'Causa-Efecto YouTube', sub: 'Espacio · Press', tipId: 'tip-db-youtube' },
  db_cboard: { icon: '📋', name: 'Cboard - Escaneo auto', sub: 'Enter · Press', tipId: 'tip-db-cboard' },
  // ── disHub
  dh_asterics_barrido: { icon: '💬', name: 'Asterics - Barrido', sub: 'Rojo S · Azul C · ext. desact.', tipId: 'tip-dh-asterics-barrido' },
  dh_asterics_dir: { icon: '🧭', name: 'Asterics - Dirección', sub: 'Flechas + Espacio', tipId: 'tip-dh-asterics-dir' },
  dh_asterics_huffman: { icon: '🔢', name: 'Asterics - Huffman', sub: 'Botones 1-6', tipId: 'tip-dh-asterics-huffman' },
  dh_asterics_sec: { icon: '↔️', name: 'Asterics - Secuencial', sub: 'A / S / C · ext. desact.', tipId: 'tip-dh-asterics-sec' },
  dh_cboard_barrido: { icon: '📋', name: 'Cboard - Barrido', sub: 'Enter / Espacio · ext. desact.', tipId: 'tip-dh-cboard-barrido' },
  dh_juego_flechas: { icon: '🕹️', name: 'Juego - Flechas', sub: 'Enter / Espacio + ↑↓←→', tipId: 'tip-dh-juego-flechas' },
  dh_juego_wasd: { icon: '⌨️', name: 'Juego - WASD', sub: 'Enter / Espacio + WASD', tipId: 'tip-dh-juego-wasd' },
  dh_std_enter: { icon: '🖱️', name: 'Estándar + Enter', sub: 'Clic izq · Clic der · cursor', tipId: 'tip-dh-std-enter' },
};

// ── HTML del tooltip de cada preset. `%PLBL%` → ⌘ / Ctrl en tiempo de render. ──
export const TIP_CONTENT = {
  'tip-asterics-barrido': `
    <div class="tip-row"><span class="tip-btn">🔴🟠</span><span class="tip-val">Tecla S · Press</span></div>
    <div class="tip-row"><span class="tip-btn">🔵🩵</span><span class="tip-val">Tecla C · Press</span></div>
    <div class="tip-row"><span class="tip-btn">⬆️</span><span class="tip-val">Flechas desactivadas</span></div>`,
  'tip-asterics-dir': `
    <div class="tip-row"><span class="tip-btn">🔴🟠🔵🩵</span><span class="tip-val">Espacio · Press</span></div>
    <div class="tip-row"><span class="tip-btn">⬆️</span><span class="tip-val">Flechas → teclas de dirección</span></div>`,
  'tip-asterics-huffman': `
    <div class="tip-row"><span class="tip-btn">🟠</span><span class="tip-val">Tecla 1 · Press</span></div>
    <div class="tip-row"><span class="tip-btn">🔴</span><span class="tip-val">Tecla 2 · Press</span></div>
    <div class="tip-row"><span class="tip-btn">↑</span><span class="tip-val">Tecla 3 · Press</span></div>
    <div class="tip-row"><span class="tip-btn">↓</span><span class="tip-val">Tecla 4 · Press</span></div>
    <div class="tip-row"><span class="tip-btn">←</span><span class="tip-val">Tecla 5 · Press</span></div>
    <div class="tip-row"><span class="tip-btn">→</span><span class="tip-val">Tecla 6 · Press</span></div>
    <div class="tip-row"><span class="tip-btn">🩵</span><span class="tip-val">Tecla 7 · Press</span></div>
    <div class="tip-row"><span class="tip-btn">🔵</span><span class="tip-val">Tecla 8 · Press</span></div>`,
  'tip-asterics-sec': `
    <div class="tip-row"><span class="tip-btn">🔴🔵🟠🩵</span><span class="tip-val">Tecla C · Press</span></div>
    <div class="tip-row"><span class="tip-btn">←</span><span class="tip-val">Tecla A · Press</span></div>
    <div class="tip-row"><span class="tip-btn">→</span><span class="tip-val">Tecla S · Press</span></div>
    <div class="tip-row"><span class="tip-btn">↑↓</span><span class="tip-val">Desactivadas</span></div>`,
  'tip-cboard-barrido': `
    <div class="tip-row"><span class="tip-btn">🔴🟠</span><span class="tip-val">Enter · Press</span></div>
    <div class="tip-row"><span class="tip-btn">🔵🩵</span><span class="tip-val">Espacio · Press</span></div>
    <div class="tip-row"><span class="tip-btn">⬆️</span><span class="tip-val">Flechas desactivadas</span></div>`,
  'tip-juego-flechas': `
    <div class="tip-row"><span class="tip-btn">🔴🟠</span><span class="tip-val">Enter · Press</span></div>
    <div class="tip-row"><span class="tip-btn">🔵🩵</span><span class="tip-val">Espacio · Press</span></div>
    <div class="tip-row"><span class="tip-btn">⬆️</span><span class="tip-val">Flechas → teclas de dirección</span></div>`,
  'tip-juego-wasd': `
    <div class="tip-row"><span class="tip-btn">🔴🟠</span><span class="tip-val">Enter · Press</span></div>
    <div class="tip-row"><span class="tip-btn">🔵🩵</span><span class="tip-val">Espacio · Press</span></div>
    <div class="tip-row"><span class="tip-btn">↑←↓→</span><span class="tip-val">W A S D</span></div>`,
  'tip-std-enter': `
    <div class="tip-row"><span class="tip-btn">🔴</span><span class="tip-val">Clic izq · Press</span></div>
    <div class="tip-row"><span class="tip-btn">🟠</span><span class="tip-val">Doble clic · Press</span></div>
    <div class="tip-row"><span class="tip-btn">🩵</span><span class="tip-val">Enter · Press</span></div>
    <div class="tip-row"><span class="tip-btn">🔵</span><span class="tip-val">Clic der · Press</span></div>
    <div class="tip-row"><span class="tip-btn">⬆️</span><span class="tip-val">Cursor · vel 35 · aceleración ON</span></div>`,
  'tip-std-drag': `
    <div class="tip-row"><span class="tip-btn">🔴</span><span class="tip-val">Clic izq · Press</span></div>
    <div class="tip-row"><span class="tip-btn">🟠</span><span class="tip-val">Doble clic · Press</span></div>
    <div class="tip-row"><span class="tip-btn">🩵</span><span class="tip-val">Mantener clic izq · Press</span></div>
    <div class="tip-row"><span class="tip-btn">🔵</span><span class="tip-val">Clic der · Press</span></div>
    <div class="tip-row"><span class="tip-btn">⬆️</span><span class="tip-val">Cursor · vel 35 · aceleración ON</span></div>`,
  'tip-std-scroll': `
    <div class="tip-row"><span class="tip-btn">🔴</span><span class="tip-val">Clic izq · Press</span></div>
    <div class="tip-row"><span class="tip-btn">🟠</span><span class="tip-val">Scroll ↑ · Press</span></div>
    <div class="tip-row"><span class="tip-btn">🩵</span><span class="tip-val">Scroll ↓ · Press</span></div>
    <div class="tip-row"><span class="tip-btn">🔵</span><span class="tip-val">Clic der · Press</span></div>
    <div class="tip-row"><span class="tip-btn">⬆️</span><span class="tip-val">Cursor · vel 35 · aceleración ON</span></div>`,
  'tip-std-copy': `
    <div class="tip-row"><span class="tip-btn">🔴</span><span class="tip-val">Clic izq · Press</span></div>
    <div class="tip-row"><span class="tip-btn">🟠</span><span class="tip-val">Copiar (%PLBL%+C) · Press</span></div>
    <div class="tip-row"><span class="tip-btn">🩵</span><span class="tip-val">Pegar (%PLBL%+V) · Press</span></div>
    <div class="tip-row"><span class="tip-btn">🔵</span><span class="tip-val">Clic der · Press</span></div>
    <div class="tip-row"><span class="tip-btn">⬆️</span><span class="tip-val">Cursor · vel 35 · aceleración ON</span></div>`,
  'tip-db-clic-press': `
    <div class="tip-row"><span class="tip-btn">🔴</span><span class="tip-val">Clic izquierdo · Press</span></div>`,
  'tip-db-clic-release': `
    <div class="tip-row"><span class="tip-btn">🔴</span><span class="tip-val">Clic izquierdo · Release</span></div>`,
  'tip-db-youtube': `
    <div class="tip-row"><span class="tip-btn">🔴</span><span class="tip-val">Espacio · Press</span></div>`,
  'tip-db-cboard': `
    <div class="tip-row"><span class="tip-btn">🔴</span><span class="tip-val">Enter · Press</span></div>`,
  // ── disHub
  'tip-dh-asterics-barrido': `
    <div class="tip-row"><span class="tip-btn">🔴</span><span class="tip-val">Tecla S · Press</span></div>
    <div class="tip-row"><span class="tip-btn">🔵</span><span class="tip-val">Tecla C · Press</span></div>
    <div class="tip-row"><span class="tip-btn">🔌1234</span><span class="tip-val">Externos desactivados</span></div>`,
  'tip-dh-asterics-dir': `
    <div class="tip-row"><span class="tip-btn">🔴🔵</span><span class="tip-val">Espacio · Press</span></div>
    <div class="tip-row"><span class="tip-btn">🔌</span><span class="tip-val">Externos → teclas de dirección</span></div>`,
  'tip-dh-asterics-huffman': `
    <div class="tip-row"><span class="tip-btn">🔴</span><span class="tip-val">Tecla 1 · Press</span></div>
    <div class="tip-row"><span class="tip-btn">🔌1</span><span class="tip-val">Tecla 2 · Press</span></div>
    <div class="tip-row"><span class="tip-btn">🔌2</span><span class="tip-val">Tecla 3 · Press</span></div>
    <div class="tip-row"><span class="tip-btn">🔌3</span><span class="tip-val">Tecla 4 · Press</span></div>
    <div class="tip-row"><span class="tip-btn">🔌4</span><span class="tip-val">Tecla 5 · Press</span></div>
    <div class="tip-row"><span class="tip-btn">🔵</span><span class="tip-val">Tecla 6 · Press</span></div>`,
  'tip-dh-asterics-sec': `
    <div class="tip-row"><span class="tip-btn">🔴🔵</span><span class="tip-val">Tecla C · Press</span></div>
    <div class="tip-row"><span class="tip-btn">🔌3</span><span class="tip-val">Tecla A · Press</span></div>
    <div class="tip-row"><span class="tip-btn">🔌4</span><span class="tip-val">Tecla S · Press</span></div>
    <div class="tip-row"><span class="tip-btn">🔌1🔌2</span><span class="tip-val">Desactivados</span></div>`,
  'tip-dh-cboard-barrido': `
    <div class="tip-row"><span class="tip-btn">🔴</span><span class="tip-val">Enter · Press</span></div>
    <div class="tip-row"><span class="tip-btn">🔵</span><span class="tip-val">Espacio · Press</span></div>
    <div class="tip-row"><span class="tip-btn">🔌1234</span><span class="tip-val">Externos desactivados</span></div>`,
  'tip-dh-juego-flechas': `
    <div class="tip-row"><span class="tip-btn">🔴</span><span class="tip-val">Enter · Press</span></div>
    <div class="tip-row"><span class="tip-btn">🔵</span><span class="tip-val">Espacio · Press</span></div>
    <div class="tip-row"><span class="tip-btn">🔌</span><span class="tip-val">Externos → teclas de dirección</span></div>`,
  'tip-dh-juego-wasd': `
    <div class="tip-row"><span class="tip-btn">🔴</span><span class="tip-val">Enter · Press</span></div>
    <div class="tip-row"><span class="tip-btn">🔵</span><span class="tip-val">Espacio · Press</span></div>
    <div class="tip-row"><span class="tip-btn">🔌1</span><span class="tip-val">W</span></div>
    <div class="tip-row"><span class="tip-btn">🔌3</span><span class="tip-val">A</span></div>
    <div class="tip-row"><span class="tip-btn">🔌2</span><span class="tip-val">S</span></div>
    <div class="tip-row"><span class="tip-btn">🔌4</span><span class="tip-val">D</span></div>`,
  'tip-dh-std-enter': `
    <div class="tip-row"><span class="tip-btn">🔴</span><span class="tip-val">Clic izq · Press</span></div>
    <div class="tip-row"><span class="tip-btn">🔵</span><span class="tip-val">Clic der · Press</span></div>
    <div class="tip-row"><span class="tip-btn">🔌</span><span class="tip-val">Cursor · vel 35 · aceleración ON</span></div>`,
};

// ─────────────────────────────────────────────────────────────────────────────
// Mapeo de nombres de WHO (lowercase, sin espacios) → recurso
// ─────────────────────────────────────────────────────────────────────────────

/** nombre WHO → imagen del producto (modal de bienvenida / status bar). */
export const DEV_IMAGES = {
  dismouse: 'assets/img/dismouse.png',
  disbutton: 'assets/img/disbutton.png',
  disbuttonbt: 'assets/img/disbutton.png',
  disjoystick: 'assets/img/disjoystick.png',
  dishub: 'assets/img/dishubs.png',
  dishubb: 'assets/img/dishubs.png', // "disHub BT" → dishubs
  dishubbt: 'assets/img/dishubs.png',
  dishubble: 'assets/img/dishubs.png',
  dishubmini: 'assets/img/dishubmini.png',
  dishubkeys: 'assets/img/dishubkeys.png',
  admouse: 'assets/img/Logo_EpE.png',
};

/** nombre WHO → texto de bienvenida especial (default se arma con el modelo). */
export const DEV_WELCOME = {
  admouse: '¡Bienvenido a EpE, AdMouse!',
};

/** nombre WHO → id de PRODUCTS. */
export const WHO_TO_PROD = {
  dismouse: 'dismouse',
  admouse: 'dismouse',
  disbutton: 'disbutton',
  disbuttonbt: 'disbutton',
  disjoystick: 'disjoystick',
  dishub: 'dishub',
  dishubbt: 'dishub',
  dishubble: 'dishub',
  dishubmini: 'dishubmini',
  dishubkeys: 'dishubkeys',
};
