# Desarrollo

Configurador de dispositivos dis+capacidad. Sitio estático (HTML + CSS + JS con módulos
ES, sin build), publicado con GitHub Pages desde la rama `main` en
`app.equiparparaequipar.com.ar`. No tiene backend ni cuentas. Lo único que guarda en el navegador (`localStorage`) es el
tema (claro/oscuro) y el sistema donde se usa el dispositivo (Windows/Mac). La
configuración vive en el dispositivo: cada cambio se guarda ahí al instante.

## Requisitos

- **Node.js LTS** (solo para los controles de calidad).
- **Python 3** (solo para servir el sitio en local).
- Clonar en disco local con ruta corta y sin espacios (no en carpetas sincronizadas).

## Puesta en marcha

```bash
git clone https://github.com/dismascapacidad/Configurador-de-productos-dismascapacidad.git
cd Configurador-de-productos-dismascapacidad
npm install
npm run check
npm run serve      # http://127.0.0.1:8899/ (WebUSB y Web Serial andan en 127.0.0.1)
```

## Scripts

| Comando | Qué hace |
|---|---|
| `npm test` | Tests una vez (Vitest). |
| `npm run lint` | ESLint sobre `src/` y `tests/`. |
| `npm run typecheck` | `tsc --noEmit` con `checkJs`. |
| `npm run check` | lint + typecheck + test. Correr antes de cada commit; el CI lo corre en cada push y PR. |
| `npm run serve` | Servidor local en el puerto 8899. |

## Estructura

| Ruta | Qué es |
|---|---|
| `index.html` | Estructura de la página (cabecera, vacío / dispositivo, modales). |
| `src/app.js` | Punto de entrada: arma las piezas. |
| `src/model.js` | Lógica pura y testeada: qué se muestra, qué comandos salen, cola de envío (`SendQueue`). |
| `src/ui/connection.js` | Abrir/cerrar USB y BLE, WHO, GETALL, envío. |
| `src/ui/view.js` | Pantalla de configuración (flechas, botones, detalle). |
| `src/ui/chrome.js` | Tema, sistema de destino, modales, barra de estado, Registro. |
| `src/ui/ayudas.js` + `assets/ayudas.txt` | Textos de ayuda al pasar el mouse (se editan en el `.txt`). |
| `src/protocol.js`, `src/transport.js` | Protocolo con el dispositivo y transporte USB/BLE. |
| `src/products.js` | Catálogo de productos. |
| `src/app.css` | Estilos propios del sitio. |
| `src/diseno/` | Copia fija del repo `dismascapacidad-design` (colores y fuente). **No editar a mano**: ver `src/diseno/ORIGEN.md`. |
| `tests/` | Tests (Vitest) y un runner para navegador (`tests/index.html`). |

## Flujo de trabajo

Nada se sube directo a `main`: se trabaja en una rama, se abre un Pull Request, el CI
tiene que dar verde, se prueba con un dispositivo real y recién ahí se hace el Merge
(el sitio se publica en minutos).
