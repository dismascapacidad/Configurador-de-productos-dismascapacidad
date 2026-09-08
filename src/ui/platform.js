// @ts-check
/**
 * Detección de plataforma para gates de UI: BLE en iOS, captura de teclas en
 * táctil, modificador principal ⌘/Ctrl por defecto.
 */

/** iOS / iPadOS: todos los navegadores usan WebKit → sin Web Serial/USB/BLE. */
export function isIOS() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPadOS en "modo escritorio" se hace pasar por Mac
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/** macOS (no iPadOS). Se usa para elegir ⌘ como modificador principal. */
export function isMacOS() {
  const nav = /** @type {any} */ (navigator);
  const plat = nav.userAgentData?.platform || navigator.platform || navigator.userAgent;
  return plat.includes('Mac') && !isIOS();
}

/** Táctil sin teclado físico confiable → la captura de teclas usa chips. */
export function isTouchDevice() {
  return (window.matchMedia && matchMedia('(pointer: coarse)').matches) || navigator.maxTouchPoints > 0;
}
