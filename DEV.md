# Desarrollo

> Estado: **Fase 1 del plan de deuda técnica** (ver `PLAN_deuda_tecnica.md`).
> La app sigue siendo `index.html` monolítico y se despliega igual que siempre
> (GitHub Pages, rama `main`). Lo de `src/` es andamiaje nuevo que **todavía no
> está conectado** a `index.html`.

## Requisitos

- **Node.js LTS** (probado con v24). El repo **no puede vivir en Google Drive** —
  `node_modules` es inusable ahí. Clonar en disco local (path corto, sin espacios).
- **Python 3** (opcional): solo para el runner de tests en navegador.

## Puesta en marcha

```bash
git clone https://github.com/dismascapacidad/Configurador-de-productos-dismascapacidad.git
cd Configurador-de-productos-dismascapacidad   # o el nombre que le pongas al clon
npm install
npm run check
```

## Scripts

| Comando | Qué hace |
|---|---|
| `npm test` | Corre los tests una vez (Vitest). |
| `npm run test:watch` | Vitest en modo watch. |
| `npm run lint` | ESLint sobre `src/` y `tests/` (no toca `index.html`). |
| `npm run typecheck` | `tsc --noEmit` con `checkJs` sobre `src/` y `tests/`. |
| `npm run format` | Prettier `--write` sobre `src/` y `tests/`. |
| `npm run check` | lint + typecheck + test. Correr antes de cada commit. |
| `npm run serve` | `python -m http.server 8899` para el runner de navegador. |

## Qué hay nuevo

| Ruta | Qué es |
|---|---|
| `src/protocol.js` | Capa de protocolo serie extraída 1:1 de `index.html` (construcción y parseo de comandos `CFG:`, `WHO`, `GETALL`…). Módulo **puro**, sin DOM. |
| `tests/protocol.test.js` | Spec que fija el comportamiento actual de esa capa (20 casos). |
| `tests/harness.js` | Micro-runner sin dependencias. Expone `test` / `expect` con la forma de Vitest, para el runner de navegador. |
| `tests/index.html` | Corre los mismos `*.test.js` en el navegador (no necesita Node). Servir con `npm run serve` y abrir <http://127.0.0.1:8899/tests/>. |

`src/protocol.js` **todavía no lo importa `index.html`.** Es una copia paralela.
El paso siguiente (Fase 2) es que `index.html` haga `import` de este módulo y se
borre la lógica duplicada.

## Pendiente de Fase 1

- Workflow de GitHub Actions: `npm run check` en cada push / PR.
- Más adelante: mover el deploy de Pages al pipeline (hoy es deploy directo de rama).
