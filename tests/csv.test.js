// @ts-check
import { parseCsvLine, presetToCsv, parsePresetsCsv } from '../src/csv.js';

test('parseCsvLine: campos simples', () => {
  expect(parseCsvLine('a,b,c')).toEqual(['a', 'b', 'c']);
});

test('parseCsvLine: campos entre comillas con coma interna', () => {
  expect(parseCsvLine('"a,1","b",""')).toEqual(['a,1', 'b', '']);
});

test('parseCsvLine: comillas escapadas ("")', () => {
  expect(parseCsvLine('"dijo ""hola""","x"')).toEqual(['dijo "hola"', 'x']);
});

const preset = {
  name: 'Juan · semana 3',
  date: '7/9/2026',
  prodId: 'dismouse',
  notes: 'usar con "barrido"',
  cfg: { orient: 0, vel: 35, acel: 1, fmode: 1, btns: { 0: { tipo: 1, modo: 0, debounce: 0, accion: 99, mods: 1, flags: 0 } } },
};

test('presetToCsv: encabezado + una fila, campos citados', () => {
  const csv = presetToCsv(preset);
  const [head, row] = csv.split('\r\n');
  expect(head).toBe('"name","date","prodId","notes","cfg_json"');
  expect(parseCsvLine(row)).toEqual([
    'Juan · semana 3', '7/9/2026', 'dismouse', 'usar con "barrido"', JSON.stringify(preset.cfg),
  ]);
});

test('round-trip: presetToCsv → parsePresetsCsv devuelve el mismo preset', () => {
  const { presets, error } = parsePresetsCsv(presetToCsv(preset));
  expect(error).toBeNull();
  expect(presets).toEqual([preset]);
});

test('parsePresetsCsv: CSV vacío o de una sola línea → error', () => {
  expect(parsePresetsCsv('').error).toBe('CSV vacío o inválido');
  expect(parsePresetsCsv('"name","cfg_json"').error).toBe('CSV vacío o inválido');
});

test('parsePresetsCsv: encabezado sin name/cfg_json → error', () => {
  expect(parsePresetsCsv('"foo","bar"\n"1","2"').error).toBe('El CSV no tiene el formato correcto');
});

test('parsePresetsCsv: salta filas sin nombre o con cfg_json inválido', () => {
  const csv = [
    '"name","date","prodId","notes","cfg_json"',
    '"ok","","dismouse","","{""a"":1}"',
    '"","","","","{}"', // sin nombre → se salta
    '"malo","","","","no-json"', // cfg inválido → se salta
  ].join('\r\n');
  const { presets } = parsePresetsCsv(csv);
  expect(presets).toEqual([{ name: 'ok', date: '', prodId: 'dismouse', notes: '', cfg: { a: 1 } }]);
});

test('parsePresetsCsv: prodId vacío → null', () => {
  const csv = '"name","date","prodId","notes","cfg_json"\r\n"x","","","","{}"';
  expect(parsePresetsCsv(csv).presets[0].prodId).toBeNull();
});
