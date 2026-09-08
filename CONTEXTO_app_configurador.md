# Contexto — App web "Configurador dis+ / EpE"

> Documento de contexto para el proyecto mayor ("Equipar para Equipar" como
> plataforma) que va a envolver esta app. Vive **dentro del repo** de la app.
> Estado al **2026-09-08**, rama `main`, commit `675fe6a`.
>
> **Cambio grande respecto de la versión del 2026-09-07 de este documento:** la
> app dejó de ser un monolito de ~3.750 líneas en `index.html`. Se completaron
> las Fases 1–3 del plan de deuda técnica **y** la separación completa de la UI
> en módulos. Hoy `index.html` es una cáscara de 626 líneas y toda la lógica
> vive en 20 archivos bajo `src/`, cada uno con chequeo de tipos y lint en CI.
> Ver `PLAN_deuda_tecnica.md` para el detalle de qué se hizo y qué falta.

---

## 1. Resumen ejecutivo

Aplicación web de **una sola página** que permite configurar dispositivos de tecnología
asistiva de la marca **dis+capacidad / Equipar para Equipar (EpE)** desde el navegador,
sin instalar nada.

- **Usuarios objetivo:** terapistas ocupacionales, fonoaudiólogos, docentes de educación
  especial y familias.
- **Qué hace:** se conecta a un dispositivo físico (por **cable USB** o **Bluetooth LE**),
  detecta el modelo, lee su configuración actual y permite reasignar qué hace cada botón
  / conector (emular una tecla, un clic de mouse, scroll, desactivarlo), ajustar el modo
  de las flechas, velocidad de cursor, orientación, etc. Los cambios se envían **al
  instante** al dispositivo y se pueden **guardar en su memoria**.
- **Extras:** biblioteca de "configuraciones rápidas" (presets) por dispositivo,
  presets propios guardados en el navegador y sincronizados a la nube con cuenta,
  compartir presets por email o con toda la comunidad, importar/exportar CSV,
  materiales de formación descargables, tour guiado.
- **Publicada en:** <https://app.equiparparaequipar.com.ar> (GitHub Pages).

La app es **solo el front-end de configuración**. El **firmware** de los dispositivos
(Arduino Pro Micro y nRF52840) vive en otro proyecto/repositorio. El **protocolo serie
de texto** descrito en la sección 7 es el contrato entre ambos.

---

## 2. Ubicación del código y estructura del repo

**El repo vive en un disco local, NO en Google Drive.** Un proyecto con toolchain de
Node (`node_modules`, ~10k archivos) es inusable en Drive: `npm install` tarda >7 min y
Drive no puede excluir `node_modules` del sync. GitHub (`origin/main`) es el respaldo y
el punto de acceso desde otras máquinas.

- **Remoto:** `github.com/dismascapacidad/Configurador-de-productos-dismascapacidad` (rama `main`).
- **Local:** clonado en un path corto sin espacios (`C:\dev\configurador-dis-epe`).
- La carpeta vieja en Google Drive (`…/Desarrollos web/configurador de dispositivos/`)
  queda **obsoleta** — se puede borrar una vez confirmado que todo está en GitHub.

### Estructura del repo

| Ruta | Qué es |
|---|---|
| `index.html` | **Cáscara de 626 líneas.** DOM estático (topbar, drawer, status bar, `<main>`, todos los modales ocultos), `<link>` al CSS, `<script>` de Supabase (CDN) y `<script type="module" src="./src/app.js">`. ~53 handlers `onclick=""` inline que apuntan a `window.*` (ver §4). Es lo que publica GitHub Pages. |
| `src/app.css` | Todo el CSS (variables de tema en `:root`, ~410 reglas, responsive con breakpoint `600px`). Extraído de `index.html`. |
| `src/*.js` | **Módulos de lógica pura**, sin DOM salvo lo indicado. `@ts-check` + ESLint. Ver tabla abajo. |
| `src/ui/*.js` | **Módulos de UI** (tocan el DOM). `@ts-check` + ESLint. Ver tabla abajo. |
| `src/webusb-serial-polyfill.js` | Polyfill Web Serial sobre WebUSB (CDC-ACM), vendorizado de `google/web-serial-polyfill` (Apache-2.0). `@ts-nocheck` y **excluido del lint** (código de terceros). |
| `tests/` | Tests Vitest (`*.test.js`), harness sin dependencias y runner de navegador (`tests/index.html`). 47 tests, todos sobre los módulos puros. |
| `db/migrations/001_*.sql` · `db/README.md` | Migración SQL versionada (Fase 3) + esquema y RLS de Supabase documentados. |
| `assets/img/` · `assets/docs/` | PNGs de productos + favicon · 3 PDFs de formación. |
| `CNAME` · `.nojekyll` | Dominio de Pages · desactiva Jekyll. |
| `package.json` · `vitest.config.js` · `eslint.config.js` · `tsconfig.json` · `.prettierrc.json` · `.github/workflows/ci.yml` | Toolchain de dev + CI (no afecta el sitio publicado). |
| `CONTEXTO_app_configurador.md` · `PLAN_deuda_tecnica.md` · `DEV.md` | Este documento, el plan de deuda técnica y la guía de desarrollo. |

### Módulos de lógica (`src/*.js`) — sin DOM, testeables sin hardware

| Módulo | Responsabilidad | Tests |
|---|---|---|
| `protocol.js` | **Capa de protocolo pura.** Arma comandos `CFG:`/`FMODE:`/`ORIENT:`… , parsea líneas del dispositivo, tablas de keycodes (actual + legacy en `REV_KEY`), resolución de presets (`resolvePreset`, `%P%`), `cfg ↔ comandos` (`cfgToCommands`), `parseWho`. | 20 |
| `products.js` | **Catálogo, solo datos.** `PRODUCTS`, `PRESET_TABS`, `LATEST_FW`, `FACTORY_CMDS`, `FACTORY_CARDS`, `TIP_CONTENT`, `DEV_IMAGES`, `DEV_WELCOME`, `WHO_TO_PROD`. | 9 |
| `transport.js` | **Capa de transporte.** `connectSerial()` (Web Serial nativo o polyfill) y `connectBle()` (Nordic UART + diagnóstico de conflicto HID en Windows). Reciben callbacks (`onLine`/`onClosed`/`log`) y devuelven un handle `{ send, close }`. | — |
| `csv.js` | Serialización/parseo CSV de presets (`parseCsvLine`, `presetToCsv`, `parsePresetsCsv`). | 9 |
| `presets-store.js` | **Almacenamiento de presets propios.** `localStorage` + sync incremental a Supabase: `loadLocal`/`saveLocal`, `fetchCloud`, `pushToCloud` (upsert por `id` + delete selectivo **después**), `reconcileIds`. Cada preset lleva un `id` uuid estable. | 9 |
| `supabase-client.js` | Cliente Supabase singleton (`supa`) + `AUTH_REDIRECT`. Lo comparten `auth.js` y `presets.js` por import. | — |

### Módulos de UI (`src/ui/*.js`) — tocan el DOM

| Módulo | Responsabilidad |
|---|---|
| `state.js` | Objeto mutable **`S`**: estado compartido de la UI (`prod`, `connType`, `connected`, `osMode`, `conn`, `devCfg`, `activePresetTab`, `currentUser`). |
| `platform.js` | `isIOS()`, `isMacOS()`, `isTouchDevice()`. |
| `dom.js` | Helpers de bajo nivel: `toast`, `addLog`/`clearLog`, `esc`, `openModal`/`closeModal`/`closeBd`. |
| `drawer.js` | Menú lateral: abrir / cerrar / alternar. |
| `tour.js` | Recorrido guiado (6 pasos) + modal de bienvenida. |
| `auth.js` | UI de autenticación Supabase: botón de cuenta, modal login/registro/reset, `signIn*`/`signOut`. |
| `connection.js` | **Ciclo de vida de la conexión.** `connectUSB`/`connectBLE`/`disconnect`, `send()`, `setConnected()`, `setSections()`, post-conexión (`WHO` → detectar producto → `GETALL`), `parseLine`, `saveConfig`/`resetDevice`/`pingDevice`, connModal. |
| `cards.js` | Grilla de tarjetas por botón (normal + disHub), panel "Avanzado", resumen por tarjeta, captura de teclas (física + chips táctiles). |
| `actions.js` | Acciones que escriben al dispositivo: `applyBtn`, modo flechas / conectores centrales, `applyDevCfgToCards` (volcar config leída a las tarjetas), `renderCfgModal`. |
| `presets.js` | **Configuraciones rápidas completas:** tabs por dispositivo, presets de fábrica (EpE), presets propios (con sync), compartidos y comunidad, import/export CSV, modal de compartir, pegamento auth↔presets (`handleLoginSync`, `importChoice`). |
| `product.js` | `selectProd`, `selectConnType`, `selectOsMode`, `confirmToggleOsMode`. |

> **Proyecto mayor:** también va en disco local, con GitHub como punto común. Puede
> contener esta app como subcarpeta/submódulo, o vivir al lado. No en Google Drive.
> Los módulos `src/protocol.js`, `src/transport.js`, `src/products.js`,
> `src/presets-store.js` y `src/csv.js` son **puros y reutilizables** — no dependen
> del DOM ni de la UI de esta app.

---

## 3. Stack técnico

- **Front-end:** HTML + CSS + **JavaScript (módulos ES nativos)**. Sin framework, sin
  bundler, sin build: los módulos se cargan directo con `<script type="module">`.
  El navegador resuelve los `import` por ruta relativa.
- **Chequeo de calidad (solo en dev/CI, no afecta el sitio):**
  - **ESLint 9** (flat config) — `src/**` y `tests/**`.
  - **TypeScript en modo `checkJs`** (`allowJs` + `checkJs`, `strict: false`) — chequea el
    JavaScript sin escribir tipos. **El 100% de `src/` pasa por tsc.** Los módulos usan
    un helper `el(id)` con tipo laxo para los accesos al DOM (transicional).
  - **Prettier** — formato.
  - **Vitest** — 47 tests unitarios sobre los módulos puros (`protocol`, `products`,
    `csv`, `presets-store`).
  - `npm run check` = lint + typecheck + tests. Corre en CI en cada push.
- **Única dependencia externa (CDN):** `@supabase/supabase-js@2` (UMD) — en `index.html`.
  Deja `window.supabase`; `src/supabase-client.js` crea el cliente una vez.
- **Fuente:** DM Sans vía `@import` de Google Fonts. ⚠️ Bug conocido: el `@import` quedó
  **después** de reglas CSS en `src/app.css`, el navegador lo ignora → cae a `system-ui`.
  Fix pendiente (cambio visual, no urgente).
- **APIs del navegador que usa:**
  - **Web Serial API** (`navigator.serial`) — conexión USB. Chrome/Edge desktop, Chrome 148+ Android.
  - **Polyfill Web Serial sobre WebUSB** (CDC-ACM) — `src/webusb-serial-polyfill.js`,
    fallback para **Chrome en Android** vía cable OTG. Se activa solo si falta
    `navigator.serial` y hay `navigator.usb`. **Sin verificar contra hardware real.**
  - **Web Bluetooth API** (`navigator.bluetooth`) — conexión BLE (Nordic UART).
  - `localStorage` — presets propios y preferencias.
- **Backend:** **Supabase** (Postgres + Auth + RPC). Ver sección 8.
- **Hosting:** **GitHub Pages** desde la rama `main` (sin build: sirve los archivos tal
  cual). `push` a `main` = deploy en ~1 min.
- **CI:** GitHub Actions corre `npm run check` en cada push (`.github/workflows/ci.yml`).
  El deploy de Pages sigue saliendo de la rama, no de un artefacto.

---

## 4. Arquitectura de la app

### 4.1 Carga

1. `index.html` `<head>` — meta, favicon, `<script>` de Supabase (CDN),
   `<link rel="stylesheet" href="./src/app.css">`.
2. `<body>` — **DOM estático completo**: topbar, drawer, status bar, `<main>` con las
   secciones de flechas y botones, y **todos los modales** ya presentes (ocultos con
   `style="display:none"`).
3. `<script type="module" src="./src/app.js">` al final. El navegador descarga y evalúa
   todo el grafo de módulos; `app.js` corre `init()` en `DOMContentLoaded`.

### 4.2 `src/app.js` — orquestador (~150 líneas)

No contiene lógica de negocio. Hace tres cosas:

1. **Importa** todos los módulos.
2. **Puente `window.*`:** `Object.assign(window, { … })` expone en `window` las ~53
   funciones que los `onclick=""` inline del HTML todavía necesitan. También
   `window.Protocol` / `window.Transport` / `window.Csv` / `window.PresetsStore` y el
   catálogo de `products.js` como globales sueltos. **Es deuda transicional:** el HTML
   inline es lo que obliga a este puente. Reemplazarlo (por `addEventListener` o una
   capa de vista) es trabajo futuro.
3. **`init()`** — arranca la UI: construye la grilla por defecto, setea el modo SO,
   engancha `Escape`→cerrar drawer, y suscribe `supa.auth.onAuthStateChange` (login →
   `handleLoginSync()` + `loadSharedPresets()`; logout → limpia `localStorage`).

### 4.3 Estado — objeto `S` (`src/ui/state.js`)

En vez de `let` sueltos, un único objeto mutable que los módulos leen y escriben:

```js
export const S = {
  prod: null,            // producto activo (objeto de PRODUCTS)
  connType: 'usb',       // 'usb' | 'ble'
  connected: false,
  osMode: 'win',         // 'win' | 'mac' → modificador principal Ctrl/⌘
  conn: null,            // handle { send, close } de transport.js (USB o BLE, unificado)
  devCfg: { orient:null, vel:null, acel:null, fmode:null, btns:{} },  // config leída (§8)
  activePresetTab: null, // tab activa en el modal de configuraciones rápidas
  currentUser: null,     // sesión Supabase
};
```

No hay routing ni framework de estado: sigue siendo manipulación directa del DOM por `id`.
`S` es transicional; a medida que los módulos se afiancen, varios campos pasarán a ser
privados del módulo dueño.

### 4.4 Ciclos de import — `connectionHooks`

`connection.js` necesita llamar a funciones de `presets.js` / `actions.js` / `product.js`
(p. ej. tras `WHO`, llama a `selectProd`). Esos módulos a su vez importan `send` de
`connection.js`. Para no armar un ciclo feo, `connection.js` expone un objeto
`connectionHooks = { renderPresetTabs, applyDevCfgToCards, selectProd, onArrowMode }`
que `app.js` rellena en el arranque. Es un seam explícito y acotado; desaparece si la UI
se reorganiza más.

### 4.5 Transporte unificado

`connectUSB` y `connectBLE` (en `connection.js`) son finos: llaman a
`Transport.connectSerial()` / `Transport.connectBle()` y guardan el handle
`{ send, close }` en `S.conn`. El resto del código llama `send(cmd)` sin ramificar
USB/BLE — el handle sabe cómo escribir (chunking de 20 bytes en BLE incluido).

---

## 5. Productos soportados (`PRODUCTS`, `src/products.js`)

Cada producto define qué botones muestra la UI, si tiene "flechas", y qué presets ofrece.

| id | Nombre | Botones principales | Flechas / conectores | Layout |
|---|---|---|---|---|
| `dismouse` | disMouse | BR, BA, BN, BC | FU/FD/FL/FR (flechas) | estándar, `hasArrows` |
| `disjoystick` | disJoystick | BR, BA, BN, BC | FU/FD/FL/FR (flechas) | igual que disMouse |
| `disbutton` | disButton | BR (1 solo) | — | `centeredLayout` (clase `.prod-centered`) |
| `dishub` | disHub | BR, BA (=conectores 1/8), BN, BC (=2/7) | FU–FR = conectores centrales 3–6 | dos filas + `centeredLayout` |
| `dishubmini` | disHub mini | BR, BA | FU–FR = entradas externas 1–4 | centrado |
| `dishubkeys` | disHub keys | BR, BN, BC, BA | — | estándar |

Mencionados pero **no implementados como producto completo**: **disMouth** (`LATEST_FW`
lo lista como R001), **AdMouse** (en `WHO` mapea a `dismouse`).

Los códigos de botón internos son siempre `BR BA BN BC FU FD FL FR` (índices 0–7).

### Versiones de firmware conocidas (`LATEST_FW`, `src/products.js`)

```
disMouse R019 · disButton R019 · disHub R013 · disMouth R001
```

Si el dispositivo reporta (por `WHO`) una versión menor a la conocida, la app muestra un
toast "actualizá tu dispositivo" (que apunta a una "sección Actualizaciones" que **todavía
no existe** en la UI).

Nota firmware: **Pro Micro (R019) y nRF52840 (R013) comparten la tabla de keycodes**
(ver `cvKey` / `REV_KEY` en `src/protocol.js`).

---

## 6. Conexión a los dispositivos

Dos transportes, misma capa de comandos de texto por encima. Toda la mecánica vive en
`src/transport.js`; `src/ui/connection.js` solo engancha callbacks a la UI.

### 6.1 USB — Web Serial (`connectSerial` en `src/transport.js`)

- `navigator.serial.requestPort()` → `port.open({ baudRate: 9600 })`.
- Lectura: `port.readable.getReader()` en bucle, se parte por `\n`.
- Escritura: `port.writable.getWriter()`, `TextEncoder`.
- **Fallback Android:** si no hay `navigator.serial` pero sí `navigator.usb`, se usa
  `makePolyfillSerial()` de `src/webusb-serial-polyfill.js` (mismo API, sobre
  transferencias WebUSB a la interfaz CDC-ACM). Pensado para tablets **Xiaomi Redmi Pad
  Pro / Pad SE** con cable OTG. **No verificado todavía contra hardware real**; si la ROM
  engancha el driver `cdc_acm` del kernel, `claimInterface` falla y se muestra un aviso.
  `connectSerial` tira `Error` con `.code === 'NO_SERIAL'` si no hay ninguna de las dos.

### 6.2 BLE — Web Bluetooth + Nordic UART Service (`connectBle` en `src/transport.js`)

- Servicio NUS: `6e400001-b5a3-f393-e0a9-e50e24dcca9e`
  - TX (escritura hacia el dispositivo): `…0002…`
  - RX (notificaciones desde el dispositivo): `…0003…`
- Se escribe en **chunks de 20 bytes** (MTU mínimo).
- Problema conocido en **Windows**: si el dispositivo ya está emparejado en el SO como
  **HID** (mouse), Chrome no puede acceder al GATT → hay que "Quitar dispositivo" desde
  Configuración → Bluetooth. `connectBle` detecta el caso (`SecurityError`) y lo explica
  en el Registro de actividad.

### 6.3 Compatibilidad de plataformas

| | USB (Web Serial) | USB (polyfill WebUSB) | BLE (Web Bluetooth) |
|---|---|---|---|
| Chrome/Edge **desktop** (Win/Mac/Linux) | ✅ | no se activa | ✅ |
| Chrome **Android** | ✅ desde Chrome 148 | ✅ (fallback, sin verificar en HW) | ✅ |
| **iOS / iPadOS** (cualquier navegador) | ❌ | ❌ | ❌ (Apple no lo implementa) |
| Firefox / Safari | ❌ | ❌ | ❌ |

`isIOS()` (`src/ui/platform.js`) bloquea BLE y lo avisa; en iOS la única vía es USB desde
una PC/Mac.

**Probado con hardware el 2026-09-08:** funciona con Pro Micro (USB) y nRF52840 (BLE),
además de Chrome en Mac. La separación en módulos posterior a esa prueba (`connection.js`,
`presets.js`, etc.) **todavía no se probó contra hardware.**

---

## 7. Protocolo serie de comandos (contrato con el firmware)

Texto plano, un comando por línea, terminado en `\n`, a 9600 baud (USB) o por NUS (BLE).
La app **envía** comandos y **parsea** las líneas que el dispositivo devuelve. Todo el
armado y parseo vive en `src/protocol.js` (funciones puras, 20 tests). `parseLine` (en
`src/ui/connection.js`) vuelca el resultado en `S.devCfg`.

### 7.1 Identificación y lectura

| Enviar | Respuesta esperada | Uso |
|---|---|---|
| `WHO` | `OK:WHO:<modelo>:<version>` (ej. `OK:WHO:disMouse:R019`) | Autodetección de producto tras conectar (`postConnect`, timeout 800 ms). `parseWho` normaliza mayúsculas/espacios. |
| `GETALL` | Varias líneas: `ORIENT:n`, `VEL:n`, `ACEL:n`, `FMODE:n`, y `BTN:<idx>:<tipo>:<modo>:<debounce>:<accion>:<mods>:<flags>` para idx 0–7 | Leer config actual → se vuelca a las tarjetas (`applyDevCfgToCards`, ~2,4 s después). |
| `PING` | (cualquier cosa; solo se comprueba que responde) | "Probar conexión". |
| `SAVE` | — | Persistir la config en la memoria del dispositivo. |
| `RESET` | — | Restaurar valores de fábrica del firmware. |

### 7.2 Configurar un botón — `CFG`

```
CFG:<code>:<tipo>:<modo>:<debounce>:<accion>:<mods>:<flags>
```

| Campo | Valores | Significado |
|---|---|---|
| `code` | `BR BA BN BC FU FD FL FR` | Botón / conector. |
| `tipo` | `K` teclado · `M` mouse · `X` desactivado | |
| `modo` | `P` al presionar · `R` al soltar · `H` pulsación larga (~1 s) · `O` una vez por pulsación | (en `GETALL` vuelve como `0/1/2/3`) |
| `debounce` | ms (0–5000) | |
| `accion` | ver abajo | |
| `mods` | combinación de `C` Ctrl, `S` Shift, `A` Alt, `G` GUI/⌘/Win — o `-` | Solo tipo `K`. |
| `flags` | `D` doble clic · `M` mantener/toggle — o `-` | Solo tipo `M`. |

**`accion` según tipo:**

- **Teclado (`K`):** un carácter literal (`a`, `c`, `w`…), el **espacio** (`' '` literal,
  o `32`), o un **keycode** de tecla especial. Tabla en `cvKey()` (`src/protocol.js`),
  firmware R009+:
  `ENTER 215 · TAB 214 · ESC 216 · BACKSPACE 213 · DELETE 218 · INSERT 217 ·
   HOME 221 · END 222 · PAGE_UP 219 · PAGE_DOWN 220 ·
   UP 209 · DOWN 210 · LEFT 211 · RIGHT 212 · F1–F12 193–204`.
  `REV_KEY` además conoce una tabla **legacy** (176–205) para leer configuraciones de
  firmware viejo.
- **Mouse (`M`):** `1` clic izquierdo · `2` clic derecho · `4` clic central ·
  `SU` scroll ↑ (=8) · `SD` scroll ↓ (=16). Con `flags`: `D` = doble clic, `M` = mantener
  presionado (toggle).
- **Desactivado (`X`):** `accion` = `0`. Forma canónica en presets: `X:P:0:0:-:-`.

### 7.3 Flechas / conectores centrales

| Comando | Valores | |
|---|---|---|
| `FMODE:<n>` | `0` acción individual por flecha · `1` mueven el cursor del mouse · `2` emulan teclas ↑↓←→ | |
| `ORIENT:<n>` | `0` normal · `1` +90° · `2` −90° · `3` 180° | |
| `VEL:<n>` | 1–50 | velocidad de cursor (solo FMODE 0/1) |
| `ACEL:<0\|1>` | aceleración gradual | |

### 7.4 Sustitución de modificador principal

En los presets de fábrica, el token `%P%` se reemplaza en `resolvePreset()` por
`primaryMod()` → `C` (Windows, Ctrl) o `G` (Mac, ⌘), según `S.osMode`. Ej.: `std_copy`
manda `CFG:BN:K:P:0:c:%P%:-` → Copiar.

### 7.5 Sin versión de protocolo explícita

El único "versionado" es la versión de firmware que reporta `WHO`. No hay un campo de
versión de **protocolo**. Un cambio de comandos hay que coordinarlo en los dos repos
(app y firmware) a mano. Esto es la Fase 4 del plan de deuda (pendiente, necesita firmware).

---

## 8. Backend Supabase

- **Proyecto:** `https://lhpewyblvjijpmcxzcod.supabase.co` — URL y **anon key** están en
  `src/supabase-client.js`. (Es la anon key pública; la seguridad real depende de las
  **RLS policies**, ahora documentadas en `db/README.md`.)
- **Auth** (`src/ui/auth.js`): email + contraseña, **Google OAuth**, magic link y reset
  de contraseña. `supa.auth.onAuthStateChange` (en `src/app.js`) maneja sesión;
  `SIGNED_OUT` limpia `localStorage`. Redirect de OAuth = URL actual sin query/hash.

### Tablas usadas por el código

**`presets`** — presets propios del usuario (espejo de `localStorage`):

| columna | notas |
|---|---|
| `id` | **uuid, PK** — id estable por preset (también en `localStorage`) |
| `user_id` | dueño |
| `name`, `date`, `notes` | |
| `prod_id` | id de `PRODUCTS` o `null` |
| `cfg` | jsonb — objeto `devCfg` (ver abajo) |
| `created_at` | orden |
| `updated_at` | timestamptz, actualizado por trigger `presets_set_updated_at` |

Sincronización (`src/presets-store.js` → `pushToCloud`): **upsert por `id`** (`onConflict
'id'`) y **después** un delete selectivo de las filas del usuario que ya no están en la
lista. **Nunca** delete-all + insert-all. Si el upsert falla, el delete no corre (hay un
test que lo cubre). Se acabó la pérdida de datos del guardado anterior.

**Falta (Fase 3 restante, menor):** el cliente todavía pushea la **lista completa** en
cada guardado (upsert de todo, no solo el diff), y no usa `updated_at` para hacer merge
field-level entre dos dispositivos abiertos a la vez. Suficiente para uso personal.

**`shared_presets`** — compartidos y comunidad:

| columna | notas |
|---|---|
| `id` | uuid |
| `recipient_id` | destinatario (o `null` si es de comunidad) |
| `sender_email`, `sender_name` | |
| `name`, `date`, `notes`, `prod_id`, `cfg` | |
| `is_community` | `true` = visible para todos |
| `created_at` | |

**RPC `get_user_id_by_email(p_email)`** — resuelve un email a `user_id` para compartir
por email.

### Migraciones y esquema versionados

- `db/migrations/001_presets_id_updated_at.sql` — migración idempotente aplicada en
  Supabase el 2026-09-08: agrega `id` uuid PK + `updated_at` + trigger + índice
  `presets_user_id_idx`.
- `db/README.md` — esquema de ambas tablas + las RLS policies **verbatim** de
  `pg_policies` (la de `presets` es `cmd=ALL` scoped `auth.uid() = user_id`).

### Forma de `cfg` / `S.devCfg` (`mkCfg` en `src/ui/connection.js`)

```js
{
  orient: 0..3 | null,
  vel:    1..50 | null,
  acel:   0 | 1 | null,
  fmode:  0 | 1 | 2 | null,
  btns: {              // clave = índice de botón "0".."7" (BR..FR)
    "0": { tipo:0|1|2, modo:0..3, debounce:ms, accion:int, mods:bitmask, flags:bitmask },
    ...
  }
}
```

`tipo` numérico: `0` mouse, `1` teclado, `2` desactivado. `mods` bitmask:
`1` Ctrl · `2` Shift · `4` Alt · `8` GUI. `flags` bitmask: `1` doble · `2` toggle.

### Presets locales (sin cuenta)

- `localStorage['displus_presets_v1']` → array de
  `{ id, name, date, prodId, cfg, notes }` (`src/presets-store.js`). Los presets sin `id`
  (de versiones viejas) reciben uno al cargar.
- Import/export **CSV**: columnas `name,date,prodId,notes,cfg_json` (`src/csv.js`).
- Preferencias sueltas en `localStorage`: `displus_os_mode`, `displus_tour_skip`.

### Presets de fábrica (en el código, no en la nube)

- `FACTORY_CMDS` (`src/products.js`): id → array de comandos crudos listos para enviar.
- `FACTORY_CARDS`: metadata visual (icono, nombre, subtítulo).
- `TIP_CONTENT`: HTML del tooltip explicativo de cada preset.
- `PRESET_TABS`: agrupa productos en pestañas dentro del modal de configuraciones rápidas.
- Familias de id: `asterics_*`, `cboard_barrido`, `juego_*`, `std_*` (disMouse/Joystick),
  `db_*` (disButton), `dh_*` (disHub / mini). Orientados a software CAA:
  **AsTeRICS Grid**, **Cboard**, y modos de juego.

---

## 9. Funcionalidades de la interfaz

- **Topbar + drawer** (`src/ui/drawer.js`): menú lateral con conexión, configuraciones
  rápidas, leer config, cargar fábrica, formación, tienda, comunidad WhatsApp, registro,
  tour. En mobile el drawer es pantalla completa.
- **Wizard de conexión** (`connModal`, `openConnModal` en `src/ui/connection.js`): paso 1
  (producto) oculto porque se autodetecta con `WHO`; pasos 2 (tipo USB/BLE) y 3 (conectar
  + probar + leer config).
- **Tarjetas por botón** (`mkCard` en `src/ui/cards.js`): por cada botón, un selector
  "funciona como" (teclado/mouse/desactivado), captura de tecla, acción de mouse, y un
  panel "Avanzado" (modo de activación, debounce, modificadores). Botón **Aplicar** por
  tarjeta → `applyBtn` (`src/ui/actions.js`) manda un `CFG:` y actualiza el resumen.
- **Sección de flechas** (`src/ui/actions.js`): modo, orientación, velocidad, aceleración,
  y (en modo individual) una tarjeta por flecha.
- **Captura de teclas** (`src/ui/cards.js`): en desktop escucha `keydown`; en dispositivos
  táctiles usa un `<input>` + **chips** de teclas especiales (Espacio, Enter, Esc,
  flechas, F1–F4…) porque el teclado en pantalla no dispara `keydown` de forma fiable.
- **`S.osMode` Win/Mac** (`src/ui/product.js`): se detecta y se persiste; cambia la
  etiqueta del modificador (⌘ vs Win) y qué manda `%P%` en los presets.
- **Modal "Configuración actual"** (`renderCfgModal` en `src/ui/actions.js`): traduce
  `S.devCfg` a frases legibles ("El botón rojo: Teclado, al presionar — tecla c + Ctrl").
- **Registro de actividad** (`logModal`): consola con todas las líneas TX/RX y un input
  para mandar **comandos crudos** (`sendLogCmd` en `src/ui/connection.js`).
- **Modal de bienvenida animado** al detectar el dispositivo (`showWelcomeDev` en
  `src/ui/connection.js`) con la imagen del producto.
- **Materiales de formación** (`formacionModal`): 3 PDFs del curso "Tecnología Asistiva +
  EpE".
- **Tour guiado** de 6 pasos (`src/ui/tour.js`), se ofrece la primera vez.
- **Idioma:** solo **español**, todo hardcodeado. **No hay i18n** (Fase 2 del plan lo
  contemplaba pero quedó fuera de la separación de UI que se hizo; sigue pendiente).

---

## 10. Deploy y repositorio

- **Remoto:** `github.com/dismascapacidad/Configurador-de-productos-dismascapacidad` (rama `main`).
  Identidad de commits: `Gon Nanzer <dismascapacidad@gmail.com>`.
- **Hosting:** GitHub Pages sirviendo la rama `main` directamente (sin build).
  `push` a `main` = deploy en ~1 min. `.nojekyll` evita el procesado Jekyll.
- **Dominio:** `app.equiparparaequipar.com.ar` (archivo `CNAME`).
- **Requisito de las APIs:** contexto seguro (HTTPS) — cumplido por Pages. Un `file://`
  local **no** sirve: los `import` de módulos ES fallan. Para desarrollo hace falta un
  server local (`npm run serve` = `python -m http.server 8899`).
- **CI:** `.github/workflows/ci.yml` corre `npm run check` (ESLint + tsc `checkJs` + 47
  tests Vitest) en cada push. **Verde y sin warnings** al 2026-09-08. El deploy de Pages
  sigue saliendo de la rama, no de un artefacto de CI.
- **Historial:** ~110 commits. El primer commit trae el grueso; después features (auth
  Supabase, comunidad, presets, autodetección WHO, disHub, disJoystick), fixes de UX
  mobile, y la tanda de refactor (Fases 1–3 + separación de UI, commits `1eda98a`
  → `675fe6a`).

### Cómo trabajar el código

1. `npm install` (una vez, en el clon local — segundos fuera de Drive).
2. Editar. La lógica vive en `src/`; `index.html` es la cáscara + los `onclick` inline.
3. `npm run check` (lint + typecheck + tests) antes de commitear. Debe quedar en verde.
4. Rama por cambio, `git merge --no-ff` a `main`, `git push origin main` → se publica solo.
   Antes: `git fetch` y revisar que la copia local no esté atrás del remoto.
5. Cambios observables en el navegador: `npm run serve` y abrir `http://127.0.0.1:8899/`.

---

## 11. Estado de la deuda técnica

Referencia cruzada: `PLAN_deuda_tecnica.md` (12 puntos, Fases 0–5).

### Resuelto

| # | Punto | Cómo |
|---|---|---|
| 1 | Monolito de ~3.750 líneas en un archivo | **Hecho.** `index.html` → cáscara de 626 líneas. 20 módulos bajo `src/` (6 de lógica pura + 12 de UI + polyfill + `app.js`). `app.js` es un orquestador de ~150 líneas. |
| 2 | Sin tests, tipos ni lint | **Hecho.** Vitest (47 tests sobre los módulos puros), ESLint 9, Prettier, TypeScript `checkJs`. **100% de `src/` pasa por tsc + ESLint en CI**, sin warnings. |
| 3 | Sync de presets "borrar todo + reinsertar" | **Hecho** (lo grueso). `id` uuid estable por preset + upsert por id + delete selectivo **después**. Migración versionada (`db/migrations/001`). Falta el diff incremental y el merge por `updated_at` (menor). |
| 4 | RLS/RPC de Supabase sin versionar + README faltante | **Hecho.** `db/migrations/001_*.sql` + `db/README.md` (esquema + policies verbatim de `pg_policies`). |
| 12 | Assets pesados sin optimizar | **Pendiente** (quick win, sin bloqueos). |

### Pendiente

- **#7 — Web Serial en Android vía polyfill: sin verificar contra hardware** (Xiaomi
  Redmi Pad Pro / Pad SE). Riesgo: driver `cdc_acm` del kernel. Despriorizado ("no es
  urgente") pero el código está.
- **#10 — Protocolo serie sin versión explícita.** Necesita cambio de firmware (que `WHO`
  o un comando nuevo reporte versión de protocolo). Fase 4.
- **#9 — Dos tablas de keycodes** (R009+ y legacy) conviven en `REV_KEY` para leer
  firmware viejo. Se elimina la legacy cuando se defina que ya no hay dispositivos
  pre-R009 activos (decisión de alcance).
- **#6 — disMouth / AdMouse a medias.** Presentes en mapas y copys, sin soporte completo
  de producto. Necesita specs (botones, layout, presets).
- **#5 — "Sección Actualizaciones"** referida en la UI, no implementada. Encaja en el
  proyecto mayor; necesita contenido (links de firmware, pasos de flasheo por producto).
- **#11 — i18n inexistente.** Todo el texto hardcodeado en español. Si el proyecto mayor
  apunta a otros países hay que internacionalizar; el refactor de UI **no** extrajo los
  strings, así que sigue siendo trabajo de "tocar todos los archivos".
- **#8 — iOS** queda afuera por completo (sin USB, sin BLE, sin WebUSB en el navegador).
  Es una decisión de alcance, no una tarea de código.

### Deuda nueva introducida por el refactor (transicional, conocida)

- **Puente `window.*`** (`Object.assign(window, { … })` en `app.js`): los ~53 `onclick=""`
  inline del HTML obligan a exponer las funciones en `window`. Es la próxima capa a
  limpiar (pasar a `addEventListener` o una capa de vista). Mientras exista, un handler
  nuevo en el HTML que no se agregue al puente falla en silencio — así se coló el bug de
  `openSaveModal` (ya corregido).
- **Helper `el(id)` con tipo laxo** en cada módulo de UI: hace que `checkJs` no chille por
  los accesos al DOM, a costa de no tipar esos accesos. Aceptable en la transición.
- **Objeto `S`** global mutable: mejor que `let` sueltos, pero no es un store con
  notificación de cambios. Si la app crece, conviene algo con reactividad.
- **`connectionHooks`**: seam explícito para romper un ciclo de import. Chico y acotado.

### Bugs latentes encontrados y corregidos durante el refactor

- `openSaveModal` (botón "+ Guardar actual" del modal de presets) nunca estuvo en el
  puente `window.*` → el `onclick` tiraba `ReferenceError`. Corregido (`4ac471f`).
- Clase de layout `'S.prod-centered'` en vez de `'prod-centered'` (string roto por un
  find-replace de la migración a `S`) → el layout centrado de disButton/disHub no se
  aplicaba. Corregido (`675fe6a`).

---

## 12. Glosario

| Término | Significado |
|---|---|
| **EpE** | "Equipar para Equipar" — programa/curso de dis+capacidad. |
| **CAA / AAC** | Comunicación Aumentativa y Alternativa. |
| **AsTeRICS Grid, Cboard** | Software de tableros CAA que los presets buscan acompañar. |
| **NUS** | Nordic UART Service — perfil BLE que emula un puerto serie. |
| **CDC-ACM** | Clase USB de "puerto serie". Lo que expone el Arduino Pro Micro. |
| **WHO / GETALL / CFG …** | Comandos del protocolo serie (sección 7). |
| **preset / configuración rápida** | Conjunto de comandos que deja el dispositivo listo para un uso concreto. |
| **BR/BA/BN/BC**, **FU/FD/FL/FR** | Códigos internos de botón: Rojo/Azul/Naranja/Celeste; Flecha Up/Down/Left/Right. |
| **`checkJs`** | Modo de TypeScript que chequea JavaScript sin escribir tipos. |
| **CI** | Continuous Integration — el robot de GitHub Actions que corre `npm run check` en cada push. |
| **puente `window.*`** | La lista de funciones que `app.js` expone en `window` para que los `onclick=""` del HTML las encuentren. |
