import { describe, it, expect } from 'vitest';
import { parseAyudas } from '../src/ui/ayudas.js';

describe('parseAyudas', () => {
  it('lee "clave = texto", ignora comentarios y líneas vacías', () => {
    const r = parseAyudas('# comentario\n\nkey = Texto con = adentro\r\nmods=Otro\n  sin igual\n');
    expect(r).toEqual({ key: 'Texto con = adentro', mods: 'Otro' });
  });
  it('el ayudas.txt real define las claves que usa la pantalla', async () => {
    // @ts-ignore: sin @types/node; vitest corre en Node
    const fs = await import('node:fs');
    const r = parseAyudas(fs.readFileSync(new URL('../assets/ayudas.txt', import.meta.url), 'utf8'));
    for (const k of ['tipo_K', 'tipo_M', 'tipo_X', 'key', 'mods', 'mouse', 'pulse_single', 'pulse_dual', 'modo_P', 'modo_R', 'modo_O', 'umbral', 'debounce', 'arrow_0', 'arrow_1', 'arrow_2', 'orient', 'vel', 'acel', 'destino']) {
      expect(r[k], k).toBeTruthy();
    }
  });
});
