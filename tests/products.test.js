// @ts-check
/**
 * Consistencia del catálogo de productos (`src/products.js`).
 * No prueba comportamiento — verifica que los datos no tengan referencias rotas
 * (códigos de botón inválidos, ids de WHO que no existen).
 */

import {
  PRODUCTS,
  DEV_IMAGES,
  DEV_WELCOME,
  WHO_TO_PROD,
} from '../src/products.js';

const BTN_CODES = ['BR', 'BA', 'BN', 'BC', 'FU', 'FD', 'FL', 'FR'];

test('PRODUCTS: cada entrada tiene id (== clave), name y arrays mainBtns/arrowBtns', () => {
  for (const [key, p] of Object.entries(PRODUCTS)) {
    expect(p.id).toBe(key);
    expect(typeof p.name).toBe('string');
    expect(Array.isArray(p.mainBtns)).toBe(true);
    expect(Array.isArray(p.arrowBtns)).toBe(true);
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
