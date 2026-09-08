// @ts-check
/**
 * Cliente Supabase compartido (auth + datos). Singleton.
 *
 * La librería `supabase-js` se carga como UMD desde el CDN en index.html y deja
 * el global `window.supabase`. Acá se crea el cliente una sola vez y se reparte
 * por import a los módulos que lo necesitan (auth, sync de presets, compartidos).
 */

const _lib = /** @type {any} */ (/** @type {any} */ (window).supabase);

const SUPA_URL = 'https://lhpewyblvjijpmcxzcod.supabase.co';
const SUPA_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxocGV3eWJsdmppanBtY3h6Y29kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMzYzNDMsImV4cCI6MjA5MzYxMjM0M30.K5LKmwNOj0gI9UbzxAmozTu3X2eyvP6H2wcFt-s68lE';

/** Cliente Supabase (auth + PostgREST). */
export const supa = _lib.createClient(SUPA_URL, SUPA_ANON);

/** URL de retorno para OAuth / magic links (sin query ni hash). */
export const AUTH_REDIRECT = window.location.href.split('?')[0].split('#')[0];
