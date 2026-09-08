# Plan de resolución de deuda técnica — App configurador dis+ / EpE

> Complemento de [`CONTEXTO_app_configurador.md`](CONTEXTO_app_configurador.md), sección 11.
> Estado: **2026-09-08**, commit `675fe6a`. Alcance: los 12 puntos de deuda del contexto.
>
> **Novedad respecto de la versión del 2026-09-07:** las Fases 1, 2 y 3 están
> **hechas y mergeadas a `main`**, más la separación completa de la UI en módulos
> (que en el plan original era parte de la Fase 2 pero terminó siendo un bloque
> propio, más grande). Ver §4 para el estado punto por punto.

---

## 1. Cómo se priorizó

Cada punto se puntuó con el marco:

- **Impacto** (1–5): cuánto frena al equipo hoy.
- **Riesgo** (1–5): qué pasa si no se resuelve.
- **Esfuerzo** (1–5): cuán difícil es (5 = muy difícil).
- **Prioridad = (Impacto + Riesgo) × (6 − Esfuerzo)**.

El **orden de ejecución** no es exactamente el del puntaje, porque hay dependencias:
la red de tests tiene que ir **antes** del refactor modular, y varias decisiones de
producto tienen que resolverse antes de tocar código.

---

## 2. Lista priorizada — con estado

| # | Punto | Fase | **Estado (2026-09-08)** |
|---|---|:-:|---|
| 4 | RLS/RPC de Supabase no versionadas + README faltante | 0 | ✅ **Hecho** — `db/migrations/001` + `db/README.md` |
| 2 | Sin tests, tipos ni lint | 1 | ✅ **Hecho** — Vitest (47), ESLint 9, Prettier, tsc `checkJs`; CI en verde, 100% de `src/` cubierto |
| 3 | Sync de presets "borrar todo + reinsertar" | 3 | ✅ **Hecho** (lo grueso) — `id` uuid + upsert por id + delete selectivo después. Falta diff incremental + merge por `updated_at` (menor) |
| 1 | Monolito de ~3.750 líneas en un archivo | 2 | ✅ **Hecho** — `index.html` → cáscara 626 líneas; 20 módulos en `src/`; `app.js` orquestador ~150 líneas; todo `@ts-check` + lint |
| 7 | Web Serial Android sin verificar en hardware | 0 | ⏸️ **Despriorizado** ("no es urgente"). El código está; falta la prueba con la tablet Xiaomi |
| 10 | Protocolo serie sin versión explícita | 4 | ⛔ **Pendiente** — necesita cambio de firmware |
| 6 | disMouth / AdMouse a medias | 5 | ⛔ **Pendiente** — necesita specs |
| 5 | "Sección Actualizaciones" inexistente | 5 | ⛔ **Pendiente** — necesita contenido (links firmware, pasos de flasheo) |
| 9 | Dos tablas de keycodes (R009+ y legacy) | 4 | ⛔ **Pendiente** — necesita decisión de fin de soporte legacy |
| 11 | Sin internacionalización (i18n) | 2 | ⛔ **Pendiente** — el refactor de UI **no** extrajo los strings; sigue siendo "tocar todos los archivos" |
| 12 | Assets pesados sin optimizar | 0 | ⛔ **Pendiente** — quick win sin bloqueos |
| 8 | iOS sin solución web posible | 0 (decisión) | ⛔ **Decisión de alcance pendiente** |

### Deuda **nueva** introducida por el refactor (transicional, conocida)

- **Puente `window.*`** en `app.js`: los ~53 `onclick=""` inline del HTML obligan a
  exponer funciones en `window`. Próxima capa a limpiar. Un handler nuevo en el HTML que
  no se agregue al puente falla en silencio (así se coló el bug de `openSaveModal`).
- **Helper `el(id)` de tipo laxo** en cada módulo de UI — `checkJs` no tipa los accesos
  al DOM. Aceptable en la transición.
- **Objeto `S`** global mutable — mejor que `let` sueltos, pero sin reactividad.
- **`connectionHooks`** — seam para romper un ciclo de import; chico y acotado.

---

## 3. Justificación de negocio (resumen por punto)

- **#4** — Hoy nadie salvo quien configuró Supabase puede tocar el backend con seguridad.
  Si las policies RLS se rompen o hay que recrear el proyecto, no existe registro de cómo
  deben quedar → riesgo de fuga de datos entre usuarios, irreversible. *(Resuelto.)*
- **#2** — El protocolo serie (lo que puede dejar mal configurado un dispositivo de una
  persona con discapacidad) no tenía ninguna red de seguridad. *(Resuelto: tiene 20 tests
  que corren sin hardware, y CI valida cada push.)*
- **#3** — Guardar un preset podía **borrar todos** los presets del usuario en la nube si
  el `INSERT` fallaba tras el `DELETE`. *(Resuelto: upsert por id, el delete corre después
  y es selectivo.)*
- **#1** — Bloqueaba el trabajo en equipo: merges casi imposibles, imposible reutilizar la
  lógica de conexión/protocolo en el proyecto mayor. *(Resuelto: módulos con límites
  claros; `protocol.js`/`transport.js`/`products.js`/`presets-store.js`/`csv.js` son puros
  y reutilizables.)*
- **#7** — El caso de uso que originó este trabajo (configurar desde tablet sin PC)
  todavía no está confirmado. Media hora de prueba define si el enfoque sirve.
- **#10** — Cualquier evolución del protocolo obliga a coordinar dos repos a la vez.
- **#6** — Un AdMouse real se configura como si fuera disMouse (puede estar mal); disMouth
  directamente no se puede configurar.
- **#5** — Promesa rota: la UI dice "visitá la sección Actualizaciones" y no existe.
- **#9** — Deuda de una migración de firmware nunca cerrada.
- **#11** — Si el proyecto mayor apunta a otros países/idiomas, hoy no hay por dónde
  empezar salvo buscar y reemplazar cientos de strings.
- **#12** — Varios PNG de >1 MB se bajan enteros en cada carga; malo con datos móviles.
- **#8** — Sin Web Serial / WebUSB / Web Bluetooth en iOS **no hay solución web**.

---

## 4. Plan por fases — estado

### Quién hace qué

El equipo somos **vos y yo (Claude)**. El reparto real:

| Yo (en sesión) | Vos |
|---|---|
| Escribir/mover código, tests, config de tooling, extraer strings, redactar SQL y READMEs, armar el CI | Probar con hardware real (tablet, Pro Micro, nRF52840) |
| Refactor mecánico (modularizar, tipar, i18n) | Decisiones de producto y de alcance |
| Migraciones y queries de Supabase (redactarlas) | Acceso a la consola de Supabase (aplicar SQL, ver/editar RLS) |
| Cambios en la app que dependen del protocolo | Cambios en el repo del **firmware** |
| — | Revisar y mergear a `main` (= deploy) |

**El cuello de botella no son las horas de código, sos vos:** hardware para probar,
decisiones, acceso a Supabase, y los cambios de firmware.

---

### ✅ Fase 1 — Red de seguridad — HECHA (mergeada a `main`)

| Tarea | Resultado |
|---|---|
| `package.json` + ESLint 9 (flat) + Prettier + TypeScript `checkJs` (laxo) + Vitest | Hecho. `npm run check` = lint + typecheck + tests. |
| Extraer la **capa de protocolo** a `src/protocol.js` (puro): armado de comandos, parseo, tablas de keycodes, `resolvePreset`, `cfgToCommands`, `parseWho` | Hecho. |
| Tests unitarios de `protocol.js` (20) + luego `products.js` (9), `csv.js` (9), `presets-store.js` (9) | Hecho. 47 tests, corren sin hardware. |
| GitHub Actions: `npm run check` en cada push | Hecho (`.github/workflows/ci.yml`). Deploy de Pages sigue saliendo de la rama. |

**Nota:** se decidió **no** meter Vite/bundler. Los módulos ES se cargan directo; Pages
sirve los archivos tal cual. Menos piezas móviles para el tamaño actual.

---

### ✅ Fase 2 — Modularización — HECHA (mergeada a `main`), salvo i18n

| Tarea | Resultado |
|---|---|
| Partir `index.html` en módulos ES bajo `src/` | Hecho. `index.html` → cáscara 626 líneas. CSS → `src/app.css`. |
| Módulos de **lógica**: `protocol.js`, `products.js`, `transport.js` (+ `webusb-serial-polyfill.js`), `csv.js`, `presets-store.js`, `supabase-client.js` | Hecho. |
| Módulos de **UI**: `state.js` (objeto `S`), `platform.js`, `dom.js`, `drawer.js`, `tour.js`, `auth.js`, `cards.js`, `connection.js`, `actions.js`, `presets.js`, `product.js` | Hecho. Todos `@ts-check` + lint. |
| `src/app.js` como orquestador (imports + puente `window.*` + `init`), sin `@ts-nocheck` | Hecho. ~150 líneas, `@ts-check`. |
| Mover `PRODUCTS`/`PRESET_TABS`/`FACTORY_*`/`TIP_CONTENT`/`DEV_*` a datos separados | Hecho (`src/products.js`). |
| **Extraer strings visibles a `src/i18n/es.json` + `t(key)`** | ⛔ **NO se hizo.** Sigue todo hardcodeado en español. Ver Fase 2-bis. |
| Subir `tsconfig` a `strict` módulo por módulo | ⛔ Sigue en `strict: false`. Los módulos usan `el(id)` de tipo laxo para el DOM. |

**Verificado con hardware el 2026-09-08** (antes de la separación de UI): Pro Micro (USB)
y nRF52840 (BLE), + Chrome en Mac. **La separación de UI posterior (`connection.js`,
`presets.js`, `cards.js`, `actions.js`, `product.js`) NO se probó contra hardware** — se
verificó paso a paso en el navegador (init, selectProd, modales, tour, comandos sin
conexión), pero falta un smoke test real: conectar → leer config → aplicar preset →
guardar en el dispositivo → login → guardar preset en Supabase.

---

### 🔜 Fase 2-bis — i18n + `strict` (pendiente)

Quedó afuera del refactor de UI. Ahora es más barato que antes (los strings están
repartidos en módulos chicos, no en un archivo de 3.750 líneas), pero sigue siendo
"tocar todos los archivos de UI".

| Tarea | Puntos | Nota |
|---|---|---|
| Extraer todos los textos visibles a `src/i18n/es.json` + helper `t(key)` | #11 | decisión previa: ¿qué idiomas? |
| Subir `tsconfig` a `strict` y tipar los accesos al DOM (sacar los `el(id)` laxos) | #2 | módulo por módulo |
| Reemplazar el puente `window.*` por `addEventListener` (o capa de vista mínima) | deuda nueva | saca los `onclick=""` del HTML |

---

### ✅ Fase 3 — Backend robusto — HECHA (mergeada a `main`)

| Tarea | Resultado |
|---|---|
| `id` uuid estable por preset + columna `updated_at` + trigger | Hecho. Migración `db/migrations/001_presets_id_updated_at.sql`, aplicada en Supabase el 2026-09-08. |
| Reemplazar delete-all + insert-all por **upsert por id** + delete selectivo después | Hecho (`src/presets-store.js` → `pushToCloud`). Test: "si el upsert falla, el delete NO corre". |
| `reconcileIds` para no duplicar al combinar local + nube | Hecho. |
| Migraciones SQL versionadas + README de esquema/RLS | Hecho (`db/migrations/`, `db/README.md` con las policies verbatim de `pg_policies`). |
| Conflicto multi-dispositivo: "último `updated_at` gana" por preset | ⛔ **Falta** (menor). Hoy el cliente pushea la lista completa en cada guardado; no hay merge field-level. Suficiente para uso personal. |

---

### ⛔ Fase 4 — Protocolo versionado — pendiente, depende del firmware

| Tarea | Yo | Vos |
|---|---|---|
| Que `WHO` (o un comando nuevo) reporte **versión de protocolo**, ej. `OK:WHO:disMouse:R019:PROTO2` | propongo el formato | validás y lo implementás en el firmware |
| Capa de **capabilities por versión de protocolo** en la app | código entero | — |
| Eliminar la tabla de keycodes **legacy** de `REV_KEY` (#9) | lo hago | confirmás que ya no hay dispositivos pre-R009 activos |

---

### ⛔ Fase 5 — Cierre de funcionalidad prometida — pendiente, encaja en el proyecto mayor

| Tarea | Yo | Vos |
|---|---|---|
| Construir la **sección Actualizaciones** (ver versión, links de firmware, pasos de flasheo por producto) (#5) | armo la página | contenido: links y pasos reales por producto |
| Completar **disMouth** y **AdMouse** en `PRODUCTS` (#6) | código entero | specs: botones, layout, presets |
| (Si iOS entra en alcance) spike de app nativa / companion para iPad (#8) | investigo opciones | decidís si vale la inversión |

---

### ⛔ Fase 0 — Decisiones de alcance — pendientes del usuario

Estas destraban Fases 2-bis, 4 y 5:

- ¿**iOS** entra en alcance? (Si sí → spike aparte, #8.)
- ¿**i18n** es requisito? ¿Qué idiomas? (#11)
- ¿Cuándo **disMouth** y **AdMouse**? ¿Specs? (#6)
- ¿Cuántos dispositivos **pre-R009** quedan activos? → fecha de fin de soporte legacy (#9)
- ¿Se hace la prueba del **polyfill Web Serial en la tablet Xiaomi**? (#7)

Quick win sin decisiones: **comprimir/convertir a WebP los PNG + `loading="lazy"`** (#12).
Y el fix del `@import` de DM Sans (cae a system-ui).

---

## 5. Resumen de secuencia — estado

```
Fase 0  [decisiones + quick wins]     #4 ✅ · #12 ⛔ · #7 ⏸️ · #8 decisión ⛔
   │
Fase 1  [red de seguridad]            #2 ✅ + CI ✅
   │
Fase 2  [modularización]              #1 ✅   (i18n #11 ⛔ → Fase 2-bis)
   │
Fase 3  [backend]                     #3 ✅ (grueso) · #4 ✅
   │
Fase 2-bis [i18n + strict + sacar window.*]   #11 ⛔
   │
Fase 4  [protocolo versionado]        #10 ⛔ · #9 ⛔     ← necesita firmware
   │
Fase 5  [funcionalidad prometida]     #5 ⛔ · #6 ⛔ · #8 ⛔   ← scope proyecto mayor
```

**Núcleo técnico (Fases 0–3): hecho** salvo #12 (quick win) y la parte fina de #3.
El proyecto está en condiciones de **ampliar el configurador con seguridad**: cada archivo
chequeado y testeado, límites de módulo claros, lógica riesgosa con tests.

**Para "cimiento del proyecto paraguas"** falta: Fase 2-bis (i18n, sacar el `window.*`,
`strict`), Fases 4–5, y decisiones de build/tooling que conviene tomar cuando se sepa qué
necesita la plataforma mayor (bundler, framework, config por entorno — hoy las claves de
Supabase están en el fuente).

---

## 6. Riesgos vigentes

- **Vos sos el cuello de botella:** el plan avanza al ritmo en que puedas probar con
  hardware, revisar diffs y aplicar SQL en Supabase.
- **Smoke test de hardware pendiente:** la separación de UI (2 merges) se verificó en
  navegador pero no contra dispositivo. Conviene hacerlo antes de apilar features nuevas.
- **Fase 4 depende del firmware:** si el firmware no reporta versión de protocolo, #10 y
  #9 quedan trabados.
- **i18n tardío (#11):** cada mes que pasa, más strings nuevos que después hay que
  extraer. Menos malo que antes (están en módulos chicos), pero sigue siendo trabajo
  transversal.
- **El puente `window.*`** es frágil por diseño: un `onclick` en el HTML que no esté en la
  lista de `app.js` falla en silencio. Mitigación real: sacarlo (Fase 2-bis).
