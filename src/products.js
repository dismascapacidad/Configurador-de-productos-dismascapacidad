// @ts-check
/**
 * Catálogo de productos y mapeo de nombres WHO.
 *
 * DATOS PUROS extraídos 1:1 de `index.html` (Fase 2 del plan de deuda técnica).
 * Sin lógica: solo describe qué productos existen y qué botones muestran.
 *
 * Consistencia verificada en `tests/products.test.js`.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Perfiles de producto
//   mainBtns:   botones visibles en la UI
//   arrowBtns:  flechas (vacío = producto sin flechas)
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
  },
};

// ── Últimas versiones de firmware conocidas (actualizar al lanzar firmware) ───
export const LATEST_FW = {
  disMouse: 'R019',
  disButton: 'R019',
  disHub: 'R013',
  disMouth: 'R001',
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
