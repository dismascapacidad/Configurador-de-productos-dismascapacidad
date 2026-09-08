// @ts-check
/**
 * Consistencia del catálogo de productos y presets (`src/products.js`).
 * No prueba comportamiento — verifica que los datos no tengan referencias rotas
 * (ids de preset que no existen, tipIds sin tooltip, códigos de botón inválidos).
 */

import {
  PRODUCTS,
  PRESET_TABS,
  FACTORY_CMDS,
  FACTORY_CARDS,
  TIP_CONTENT,
  DEV_IMAGES,
  DEV_WELCOME,
  WHO_TO_PROD,
} from '../src/products.js';

const BTN_CODES = ['BR', 'BA', 'BN', 'BC', 'FU', 'FD', 'FL', 'FR'];

test('PRODUCTS: cada entrada tiene id (== clave), name y arrays mainBtns/arrowBtns/presets', () => {
  for (const [key, p] of Object.entries(PRODUCTS)) {
    expect(p.id).toBe(key);
    expect(typeof p.name).toBe('string');
    expect(Array.isArray(p.mainBtns)).toBe(true);
    expect(Array.isArray(p.arrowBtns)).toBe(true);
    expect(Array.isArray(p.presets)).toBe(true);
  }
});

test('PRODUCTS: todos los códigos de botón son válidos (BR/BA/BN/BC/FU/FD/FL/FR)', () => {
  for (const p of Object.values(PRODUCTS)) {
    const codes = [
      ...p.mainBtns,
      ...p.arrowBtns,
      ...(p.centerBtns || []),
    ].map((b) => b.code);
    for (const c of codes) expect(BTN_CODES.includes(c)).toBe(true);
  }
});

test('PRODUCTS[*].presets: cada id existe en FACTORY_CMDS y en FACTORY_CARDS', () => {
  for (const p of Object.values(PRODUCTS)) {
    for (const id of p.presets) {
      expect(Object.prototype.hasOwnProperty.call(FACTORY_CMDS, id)).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(FACTORY_CARDS, id)).toBe(true);
    }
  }
});

test('FACTORY_CMDS y FACTORY_CARDS cubren exactamente los mismos ids', () => {
  expect(Object.keys(FACTORY_CMDS).sort()).toEqual(Object.keys(FACTORY_CARDS).sort());
});

test('FACTORY_CARDS[*].tipId: cada uno existe en TIP_CONTENT', () => {
  for (const card of Object.values(FACTORY_CARDS)) {
    expect(Object.prototype.hasOwnProperty.call(TIP_CONTENT, card.tipId)).toBe(true);
  }
});

test('FACTORY_CMDS: cada comando empieza por CFG:/FMODE:/ORIENT:/VEL:/ACEL:', () => {
  const ok = /^(CFG|FMODE|ORIENT|VEL|ACEL):/;
  for (const [id, cmds] of Object.entries(FACTORY_CMDS)) {
    expect(Array.isArray(cmds)).toBe(true);
    for (const c of cmds) {
      if (!ok.test(c)) throw new Error(`preset ${id}: comando inesperado "${c}"`);
    }
  }
});

test('PRESET_TABS: al menos un prodId de cada tab existe en PRODUCTS', () => {
  // (algunos prodIds son variantes BT futuras que todavía no están en PRODUCTS)
  for (const tab of PRESET_TABS) {
    const known = tab.prodIds.some((id) => Object.prototype.hasOwnProperty.call(PRODUCTS, id));
    if (!known) throw new Error(`tab ${tab.tabId}: ningún prodId existe en PRODUCTS`);
  }
});

test('WHO_TO_PROD: todos los valores son ids válidos de PRODUCTS', () => {
  for (const prodId of Object.values(WHO_TO_PROD)) {
    expect(Object.prototype.hasOwnProperty.call(PRODUCTS, prodId)).toBe(true);
  }
});

test('DEV_IMAGES / DEV_WELCOME: las claves de DEV_WELCOME también están en DEV_IMAGES', () => {
  for (const k of Object.keys(DEV_WELCOME)) {
    expect(Object.prototype.hasOwnProperty.call(DEV_IMAGES, k)).toBe(true);
  }
});
