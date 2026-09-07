# Desarrollo

> Estado: **Fase 1 del plan de deuda técnica** (ver `../PLAN_deuda_tecnica.md`).
> La app sigue siendo `index.html` monolítico y se despliega igual que siempre
> (GitHub Pages, rama `main`). Lo de abajo es andamiaje nuevo que **todavía no
> está conectado** a `index.html`.

## Qué hay nuevo

| Ruta | Qué es |
|---|---|
| `src/protocol.js` | Capa de protocolo serie extraída 1:1 de `index.html` (construcción y parseo de comandos `CFG:`, `WHO`, `GETALL`…). Módulo **puro**, sin DOM. |
| `tests/protocol.test.js` | Spec que fija el comportamiento actual de esa capa. |
| `tests/harness.js` | Micro-runner sin dependencias. Expone `test` / `expect` con la misma forma que Vitest. |
| `tests/index.html` | Corre los tests en el navegador. |

`src/protocol.js` **todavía no lo importa `index.html`.** Es una copia paralela.
El paso siguiente (Fase 2) es hacer que `index.html` haga `import` de este módulo
y borrar la lógica duplicada.

## Correr los tests HOY (sin Node)

Los `import` de ES modules no funcionan desde `file://`. Hay que servir la carpeta:

```bash
python -m http.server 8899 --bind 127.0.0.1
```

y abrir <http://127.0.0.1:8899/tests/>. Verde = todo OK.

## Correr los tests con Node (cuando esté instalado)

Falta **Node.js** en la máquina. Con Node LTS instalado:

```bash
npm install -D vitest
npm test          # (actualizar el script "test" de package.json a "vitest run")
```

Los archivos `tests/*.test.js` están escritos para correr **sin cambios** bajo
Vitest (`test` / `expect` como globales → `vitest.config.js` con `test.globals: true`).

## Pendiente de Fase 1 (necesita Node)

- `npm install -D vitest eslint prettier typescript`
- `vitest.config.js`, `.eslintrc`, `tsconfig.json` (modo laxo: `allowJs` + `checkJs`)
- Workflow de GitHub Actions: lint + typecheck + `vitest run` en cada push
- Cambiar el deploy de Pages para que salga del pipeline (hoy es deploy directo de rama)
