# Contexto — App web "Configurador dis+ / EpE"

> Documento de contexto para el proyecto mayor que va a envolver esta app.
> Vive **dentro del repo** de la app. Estado al **2026-09-07**.
> Fuente: `index.html` (rama `main`, commit `78d8a28`) + rama `refactor/estructura-fase1` en curso.

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
de texto** descrito en la sección 6 es el contrato entre ambos.

---

## 2. Ubicación del código y estructura del repo

**El repo vive en un disco local, NO en Google Drive.** Un proyecto con toolchain de
Node (`node_modules`, ~10k archivos) es inusable en Drive: `npm install` tarda >7 min y
Drive no puede excluir `node_modules` del sync. GitHub (`origin/main`) es el respaldo y
el punto de acceso desde otras máquinas.

- **Remoto:** `github.com/dismascapacidad/Configurador-de-productos-dismascapacidad` (rama `main`).
- **Local:** clonado en un path corto sin espacios (ej. `C:\dev\configurador-dis-epe`).
- La carpeta vieja en Google Drive (`…/Desarrollos web/configurador de dispositivos/`)
  queda **obsoleta** — se puede borrar una vez confirmado que todo está en GitHub.

### Estructura del repo

| Ruta | Qué es |
|---|---|
| `index.html` | **Toda la app legacy** (HTML + CSS + JS en un archivo, ~3.750 líneas). Es lo que publica GitHub Pages. |
| `src/` | Módulos ES nuevos, extraídos del monolito (Fase 1+ del plan). Hoy: `protocol.js`. |
| `tests/` | Tests (`*.test.js`), harness sin dependencias y runner de navegador (`tests/index.html`). |
| `assets/img/` · `assets/docs/` | PNGs de productos + favicon · 3 PDFs de formación. |
| `CNAME` · `.nojekyll` | Dominio de Pages · desactiva Jekyll. |
| `package.json` · `vitest.config.js` · `eslint.config.js` · `tsconfig.json` · `.prettierrc.json` | Toolchain de dev (no afecta el sitio publicado). |
| `CONTEXTO_app_configurador.md` · `PLAN_deuda_tecnica.md` · `DEV.md` | Este documento, el plan de deuda técnica y la guía de desarrollo. |

> **Nomenclatura:** la carpeta del repo se llamaba `configurador_dM_R014` por razones
> históricas. Al clonar local conviene un nombre neutro (`configurador-dis-epe`). El
> nombre del repo en GitHub no cambia por ahora.

> **Proyecto mayor:** también va en disco local, con GitHub como punto común. Puede
> contener esta app como subcarpeta/submódulo, o vivir al lado. No en Google Drive.

---

## 3. Stack técnico

- **Front-end:** HTML + CSS + **JavaScript vanilla**, todo inline en `index.html`.
  Sin framework, sin bundler, sin build, sin tests, sin TypeScript, sin `node_modules`.
- **Única dependencia externa (CDN):** `@supabase/supabase-js@2` (UMD) —
  `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/…">` (`index.html:8`).
- **Fuente:** DM Sans vía `@import` de Google Fonts.
- **APIs del navegador que usa:**
  - **Web Serial API** (`navigator.serial`) — conexión USB. Chrome/Edge desktop.
  - **Polyfill Web Serial sobre WebUSB** (CDC-ACM) embebido — fallback para **Chrome en
    Android** vía cable OTG. Se auto-instala solo si falta `navigator.serial` y hay
    `navigator.usb`. Adaptado de `google/web-serial-polyfill` (Apache-2.0). Bloque
    `<script>` al inicio, ~`index.html:1031`.
  - **Web Bluetooth API** (`navigator.bluetooth`) — conexión BLE (Nordic UART).
  - `localStorage` — presets propios y preferencias.
- **Backend:** **Supabase** (Postgres + Auth + RPC). Ver sección 8.
- **Hosting:** **GitHub Pages** desde la rama `main`. Sin CI (hubo workflows, se
  quitaron; hoy es deploy directo de rama).

---

## 4. Arquitectura de `index.html`

Orden del archivo:

1. `<head>` — meta, favicon, `<script>` de Supabase (CDN), `<style>` con **todo el CSS**
   (variables de tema en `:root`, ~400 líneas, responsive con breakpoint `600px`).
2. `<body>` — **DOM estático completo**: topbar, drawer (menú lateral), status bar,
   `<main>` con las secciones de flechas y botones, y **todos los modales** ya presentes
   en el HTML (ocultos con `style="display:none"`).
3. `<script>` #1 — **polyfill Web Serial → WebUSB**. Expone `window.SerialPolyfill`.
4. `<script>` #2 — **la app** (~2.500 líneas). Al final llama a `init()`.

No hay routing ni estado global formal: todo son **funciones sueltas + variables de
módulo** y manipulación directa del DOM por `id`. Los `onclick` están inline en el HTML.

### Variables de estado principales (`index.html:1584`)

```js
let prod       = null;   // producto activo (objeto de PRODUCTS)
let connType   = 'usb';  // 'usb' | 'ble'
let connected  = false;
let osMode     = 'win';  // 'win' | 'mac' → modificador principal Ctrl/⌘
let port, reader, writer;            // Web Serial / polyfill
let bleDevice, bleTxChar;            // Web Bluetooth
let devCfg = mkCfg();               // config leída del dispositivo (ver §7)
let currentUser = null;             // sesión Supabase
```

---

## 5. Productos soportados (`PRODUCTS`, `index.html:1469`)

Cada producto define qué botones muestra la UI, si tiene "flechas", y qué presets ofrece.

| id | Nombre | Botones principales | Flechas / conectores | Layout |
|---|---|---|---|---|
| `dismouse` | disMouse | BR, BA, BN, BC | FU/FD/FL/FR (flechas) | estándar, `hasArrows` |
| `disjoystick` | disJoystick | BR, BA, BN, BC | FU/FD/FL/FR (flechas) | igual que disMouse |
| `disbutton` | disButton | BR (1 solo) | — | centrado |
| `dishub` | disHub | BR, BA (=conectores 1/8), BN, BC (=2/7) | FU–FR = conectores centrales 3–6 | dos filas |
| `dishubmini` | disHub mini | BR, BA | FU–FR = entradas externas 1–4 | centrado |
| `dishubkeys` | disHub keys | BR, BN, BC, BA | — | estándar |

Mencionados pero **no implementados como producto completo**: **disMouth** (`LATEST_FW`
lo lista como R001), **AdMouse** (en `WHO` mapea a `dismouse`).

Los códigos de botón internos son siempre `BR BA BN BC FU FD FL FR` (índices 0–7).

### Versiones de firmware conocidas (`LATEST_FW`, `index.html:1601`)

```
disMouse R019 · disButton R019 · disHub R013 · disMouth R001
```

Si el dispositivo reporta (por `WHO`) una versión menor a la conocida, la app muestra un
toast "actualizá tu dispositivo" (que apunta a una "sección Actualizaciones" que **todavía
no existe** en la UI).

Nota firmware: **Pro Micro (R019) y nRF52840 (R013) comparten la tabla de keycodes**
`TKEY_*` (ver commit `3e68ff2` y la función `cvKey` / `REV_KEY`).

---

## 6. Conexión a los dispositivos

Dos transportes, misma capa de comandos de texto por encima.

### 6.1 USB — Web Serial (`connectUSB`, `index.html:3026`)

- `navigator.serial.requestPort()` → `port.open({ baudRate: 9600 })`.
- Lectura: `port.readable.getReader()` en bucle (`readLoopUSB`), se parte por `\n`.
- Escritura: `port.writable.getWriter()`, `writer.write(TextEncoder…)`.
- **Fallback Android (nuevo, commit `78d8a28`):** si no hay `navigator.serial` pero sí
  `navigator.usb`, se usa `window.SerialPolyfill.serial` (mismo API, implementado sobre
  transferencias WebUSB a la interfaz CDC-ACM). Pensado para tablets **Xiaomi Redmi Pad
  Pro / Pad SE** con cable OTG. No verificado todavía contra hardware real; si la ROM
  engancha el driver `cdc_acm` del kernel, `claimInterface` falla y se muestra un aviso.

### 6.2 BLE — Web Bluetooth + Nordic UART Service (`connectBLE`, `index.html:3096`)

- Servicio NUS: `6e400001-b5a3-f393-e0a9-e50e24dcca9e`
  - TX (escritura hacia el dispositivo): `…0002…`
  - RX (notificaciones desde el dispositivo): `…0003…`
- Se escribe en **chunks de 20 bytes** (MTU mínimo).
- Problema conocido en **Windows**: si el dispositivo ya está emparejado en el SO como
  **HID** (mouse), Chrome no puede acceder al GATT → hay que "Quitar dispositivo" desde
  Configuración → Bluetooth. La app detecta el caso y lo explica en el Registro.

### 6.3 Compatibilidad de plataformas

| | USB (Web Serial) | USB (polyfill WebUSB) | BLE (Web Bluetooth) |
|---|---|---|---|
| Chrome/Edge **desktop** (Win/Mac/Linux) | ✅ | no se activa | ✅ |
| Chrome **Android** | ✅ desde Chrome 148 | ✅ (fallback, sin verificar en HW) | ✅ |
| **iOS / iPadOS** (cualquier navegador) | ❌ | ❌ | ❌ (Apple no lo implementa) |
| Firefox / Safari | ❌ | ❌ | ❌ |

`isIOS()` (`index.html:3081`) bloquea BLE y lo avisa; en iOS la única vía es USB desde
una PC/Mac.

---

## 7. Protocolo serie de comandos (contrato con el firmware)

Texto plano, un comando por línea, terminado en `\n`, a 9600 baud (USB) o por NUS (BLE).
La app **envía** comandos y **parsea** las líneas que el dispositivo devuelve (`parseLine`,
`index.html:2847`).

### 7.1 Identificación y lectura

| Enviar | Respuesta esperada | Uso |
|---|---|---|
| `WHO` | `OK:WHO:<modelo>:<version>` (ej. `OK:WHO:disMouse:R019`) | Autodetección de producto tras conectar (`postConnect`, `index.html:2928`, timeout 800 ms). |
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
  o `32`), o un **keycode** de tecla especial. Tabla en `cvKey()` (`index.html:2043`),
  firmware R009+:
  `ENTER 215 · TAB 214 · ESC 216 · BACKSPACE 213 · DELETE 218 · INSERT 217 ·
   HOME 221 · END 222 · PAGE_UP 219 · PAGE_DOWN 220 ·
   UP 209 · DOWN 210 · LEFT 211 · RIGHT 212 · F1–F12 193–204`.
  `REV_KEY` (`index.html:3537`) además conoce una tabla **legacy** (176–205) para leer
  configuraciones de firmware viejo.
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

En los presets de fábrica, el token `%P%` se reemplaza en `applyPreset()` por
`primaryMod()` → `C` (Windows, Ctrl) o `G` (Mac, ⌘), según `osMode`. Ej.: `std_copy`
manda `CFG:BN:K:P:0:c:%P%:-` → Copiar.

---

## 8. Backend Supabase

- **Proyecto:** `https://lhpewyblvjijpmcxzcod.supabase.co` — URL y **anon key** están
  embebidas en `index.html:1215`. (Es la anon key pública; la seguridad real depende de
  las **RLS policies** del proyecto, que no están en este repo.)
- **Auth** (`index.html:1240`–`1394`): email + contraseña, **Google OAuth**, magic link
  y reset de contraseña. `supa.auth.onAuthStateChange` maneja sesión, `SIGNED_OUT` limpia
  `localStorage`. Redirect de OAuth = URL actual sin query/hash.

### Tablas usadas por el código

**`presets`** — presets propios del usuario (espejo de `localStorage`):

| columna | notas |
|---|---|
| `user_id` | dueño |
| `name`, `date`, `notes` | |
| `prod_id` | id de `PRODUCTS` o `null` |
| `cfg` | jsonb — objeto `devCfg` (ver abajo) |
| `created_at` | orden |

Sincronización (`pushAllPresetsToSupa`, `index.html:1404`): en **cada guardado** hace
`delete` de todos los presets del usuario + `insert` de la lista completa.
⚠️ No escala y puede perder datos si falla a mitad — punto a rediseñar.

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
por email (el código nota "ver instrucciones en README" — **ese README no existe** en el
repo).

### Forma de `cfg` / `devCfg` (`mkCfg`, `index.html:1611`)

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
  `{ name, date, prodId, cfg, notes }` (`loadCustom` / `saveCustomList`, `index.html:2477`).
- Import/export **CSV**: columnas `name,date,prodId,notes,cfg_json` (`downloadCSV` /
  `importCSV`, `index.html:2598`).
- Preferencias sueltas en `localStorage`: `displus_os_mode`, `displus_tour_skip`.

### Presets de fábrica (en el código, no en la nube)

- `FACTORY_CMDS` (`index.html:2133`): id → array de comandos crudos ya listos para enviar.
- `FACTORY_CARDS` (`index.html:2239`): metadata visual (icono, nombre, subtítulo).
- `TIP_CONTENT` (`index.html:2266`): HTML del tooltip explicativo de cada preset.
- `PRESET_TABS` (`index.html:1575`): agrupa productos en pestañas dentro del modal de
  configuraciones rápidas.
- Familias de id: `asterics_*`, `cboard_barrido`, `juego_*`, `std_*` (disMouse/Joystick),
  `db_*` (disButton), `dh_*` (disHub / mini). Orientados a software CAA:
  **AsTeRICS Grid**, **Cboard**, y modos de juego.

---

## 9. Funcionalidades de la interfaz

- **Topbar + drawer** (`index.html:419`, `455`): menú lateral con conexión, configuraciones
  rápidas, leer config, cargar fábrica, formación, tienda, comunidad WhatsApp, registro,
  tour. En mobile el drawer es pantalla completa.
- **Wizard de conexión** (`connModal`, `index.html:846`): paso 1 (producto) oculto porque
  se autodetecta con `WHO`; pasos 2 (tipo USB/BLE) y 3 (conectar + probar + leer config).
- **Tarjetas por botón** (`mkCard`, `index.html:1847`): por cada botón, un selector
  "funciona como" (teclado/mouse/desactivado), captura de tecla, acción de mouse, y un
  panel "Avanzado" (modo de activación, debounce, modificadores). Botón **Aplicar** por
  tarjeta → manda un `CFG:` y actualiza el resumen.
- **Sección de flechas** (`index.html:589`): modo, orientación, velocidad, aceleración, y
  (en modo individual) una tarjeta por flecha.
- **Captura de teclas** (`index.html:1969`): en desktop escucha `keydown`; en dispositivos
  táctiles usa un `<input>` + **chips** de teclas especiales (Espacio, Enter, Esc,
  flechas, F1–F4…) porque el teclado en pantalla no dispara `keydown` de forma fiable.
- **`osMode` Win/Mac** (`index.html:1694`): se detecta y se persiste; cambia la etiqueta
  del modificador (⌘ vs Win) y qué manda `%P%` en los presets.
- **Modal "Configuración actual"** (`renderCfgModal`, `index.html:2973`): traduce `devCfg`
  a frases legibles ("El botón rojo: Teclado, al presionar — tecla c + Ctrl").
- **Registro de actividad** (`logModal`): consola con todas las líneas TX/RX y un input
  para mandar **comandos crudos** (`sendLogCmd`, `index.html:3320`).
- **Modal de bienvenida animado** al detectar el dispositivo (`showWelcomeDev`,
  `index.html:2909`) con la imagen del producto.
- **Materiales de formación** (`formacionModal`): 3 PDFs del curso "Tecnología Asistiva +
  EpE".
- **Tour guiado** de 6 pasos (`TOUR`, `index.html:3339`), se ofrece la primera vez.
- **Idioma:** solo **español**, todo hardcodeado. No hay i18n.

---

## 10. Deploy y repositorio

- **Remoto:** `github.com/dismascapacidad/Configurador-de-productos-dismascapacidad` (rama `main`).
  Identidad de commits: `dismascapacidad <dismascapacidad@gmail.com>`.
- **Hosting:** GitHub Pages sirviendo la rama `main` directamente (sin build).
  `push` a `main` = deploy en ~1 min. `.nojekyll` evita el procesado Jekyll.
- **Dominio:** `app.equiparparaequipar.com.ar` (archivo `CNAME`).
- **Requisito de las APIs:** contexto seguro (HTTPS) — cumplido por Pages. Un `file://`
  local sirve para tocar CSS/JS pero **no** para Web Serial/WebUSB/BLE reales; para eso
  hace falta un server local (`python -m http.server` / Vite) o Pages.
- **CI:** hubo workflows de GitHub Actions viejos, todos removidos. La Fase 1 del plan
  agrega uno nuevo (lint + typecheck + tests). El deploy de Pages sigue saliendo de la
  rama hasta que ese pipeline esté firme.
- **Historial:** ~80 commits, casi todo en `main`. El primer commit trae el grueso; el
  resto son features (auth Supabase, comunidad, presets, autodetección WHO, disHub,
  disJoystick) y muchos fixes de UX mobile. Ramas de trabajo actuales:
  `refactor/estructura-fase1`.

### Cómo trabajar el código

1. `npm install` (una vez, en el clon local — segundos fuera de Drive).
2. Editar. La app legacy es `index.html`; los módulos nuevos van en `src/`.
3. `npm run check` (lint + typecheck + tests) antes de commitear.
4. `git push origin main` → se publica solo. Antes: `git fetch` y revisar que la copia
   local no esté atrás del remoto.

---

## 11. Limitaciones y deuda técnica conocida

- **Todo en un archivo de ~3.750 líneas**, sin módulos, sin tests, sin tipos, sin lint.
  Difícil de escalar en equipo.
- **Sync de presets a Supabase por "borrar todo + reinsertar todo"** en cada guardado
  (`pushAllPresetsToSupa`). Frágil y no incremental.
- **Seguridad**: credenciales de Supabase en el cliente (esperable para anon key, pero
  toda la protección depende de RLS que no está versionada acá). El README de setup que
  el código menciona no existe.
- **"Sección Actualizaciones"** referida en varios textos de la UI — **no implementada**.
- **disMouth / AdMouse**: presentes en mapas y copys, sin soporte completo de producto.
- **Web Serial en Android** vía polyfill: implementado pero **sin verificar contra
  hardware** (Xiaomi Redmi Pad Pro / Pad SE). Riesgo: driver `cdc_acm` del kernel.
- **iOS** queda afuera por completo (sin USB, sin BLE, sin WebUSB en el navegador).
- **Dos tablas de keycodes** (R009+ y legacy) conviven para poder leer firmware viejo.
- **Acoplamiento fuerte con el firmware** por un protocolo de texto sin versión explícita
  más allá de `WHO`. Un cambio de protocolo hay que coordinarlo en los dos lados.
- **i18n inexistente** — si el proyecto mayor apunta a otros países, hay que
  internacionalizar desde cero.
- Assets pesados (varios PNG de >1 MB) servidos sin optimizar.

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
