# Plan de resolución de deuda técnica — App configurador dis+ / EpE

> Complemento de [`CONTEXTO_app_configurador.md`](CONTEXTO_app_configurador.md), sección 11.
> Estado: 2026-09-07. Alcance: los 12 puntos de deuda listados en el contexto.

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

## 2. Lista priorizada

| # | Punto | Categoría | Imp | Riesgo | Esf | **Prioridad** | Fase |
|---|---|---|:-:|:-:|:-:|:-:|:-:|
| 4 | RLS/RPC de Supabase no versionadas + README faltante | Doc / Infra | 3 | 4 | 2 | **28** | 0 |
| 2 | Sin tests, tipos ni lint | Test | 4 | 4 | 3 | **24** | 1 |
| 3 | Sync de presets "borrar todo + reinsertar" | Arquitectura / Datos | 2 | 4 | 2 | **24** | 3 |
| 7 | Web Serial Android sin verificar en hardware | Infra / Test | 1 | 3 | 1 | **20** | 0 |
| 1 | Monolito de ~3.750 líneas en un archivo | Arquitectura | 5 | 4 | 4 | **18** | 2 |
| 10 | Protocolo serie sin versión explícita | Arquitectura | 3 | 3 | 3 | **18** | 4 |
| 6 | disMouth / AdMouse a medias | Código | 2 | 2 | 2 | **16** | 5 |
| 5 | "Sección Actualizaciones" inexistente | Doc / Producto | 1 | 2 | 2 | **12** | 5 |
| 9 | Dos tablas de keycodes (R009+ y legacy) | Código | 2 | 2 | 3 | **12** | 4 |
| 11 | Sin internacionalización (i18n) | Código | 2 | 2 | 3 | **12** | 2 |
| 12 | Assets pesados sin optimizar | Infra / Perf | 1 | 1 | 1 | **10** | 0 |
| 8 | iOS sin solución web posible | Límite de plataforma | 1 | 2 | 5 | **3** | 0 (decisión) |

---

## 3. Justificación de negocio (resumen por punto)

- **#4** — Hoy nadie salvo quien configuró Supabase puede tocar el backend con seguridad.
  Si las policies RLS se rompen o hay que recrear el proyecto, no existe registro de cómo
  deben quedar → riesgo de fuga de datos entre usuarios, irreversible.
- **#2** — El protocolo serie (lo que puede dejar mal configurado un dispositivo de una
  persona con discapacidad) no tiene ninguna red de seguridad. Cada cambio se prueba a
  mano con hardware. No escala a más de una persona.
- **#3** — Guardar un preset puede **borrar todos** los presets del usuario en la nube si
  el `INSERT` falla tras el `DELETE`. Pérdida de datos real del usuario.
- **#7** — El caso de uso que originó este trabajo (configurar desde tablet sin PC) todavía
  no está confirmado. Media hora de prueba define si el enfoque sirve o si hay que ir a
  cambiar firmware.
- **#1** — Bloquea el trabajo en equipo: merges casi imposibles, imposible reutilizar la
  lógica de conexión/protocolo en el proyecto mayor, herramientas lentas.
- **#10** — Cualquier evolución del protocolo obliga a coordinar dos repos a la vez y no
  se puede distinguir un dispositivo nuevo de uno viejo salvo por la versión de firmware.
- **#6** — Un AdMouse real se configura como si fuera disMouse (puede estar mal); disMouth
  directamente no se puede configurar.
- **#5** — Promesa rota: la UI dice "visitá la sección Actualizaciones" y esa sección no
  existe.
- **#9** — Deuda de una migración de firmware nunca cerrada: cada tecla nueva se piensa en
  dos sistemas de numeración.
- **#11** — Si el proyecto mayor apunta a otros países/idiomas, hoy no hay por dónde
  empezar salvo buscar y reemplazar cientos de strings.
- **#12** — Varios PNG de >1 MB se bajan enteros en cada carga; malo con datos móviles.
- **#8** — Sin Web Serial / WebUSB / Web Bluetooth en iOS **no hay solución web**. Es una
  decisión de alcance, no una tarea de código.

---

## 4. Plan por fases

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
decisiones, acceso a Supabase, y los cambios de firmware. El plan se ordena para que yo
avance en bloque lo mecánico y vos intervengas en puntos concretos.

Los tiempos de abajo son **trabajo mío en sesiones** (no calendario). Al lado, lo que
necesito de vos.

### Fase 0 — Decisiones y quick wins

Cosas cortas que no dependen de nada y que **destraban** el resto.

| Tarea | Puntos | Yo | Vos |
|---|---|---|---|
| Probar el polyfill Web Serial con la tablet Xiaomi + un Pro Micro | #7 | preparo checklist | 30 min de prueba real → sí/no; si no, abrimos "plan B firmware WebUSB vendor" |
| Exportar policies RLS + función `get_user_id_by_email` a `db/schema.sql` | #4 | redacto el SQL a partir del código | correrlo en la consola de Supabase y pegarme el resultado real de las policies |
| `README.md` de setup (proyecto Supabase, tablas, RPC, envs) | #4 | lo escribo | revisás que no falte nada del setup que solo vos sabés |
| Comprimir/convertir a WebP los PNG + `loading="lazy"` | #12 | lo hago entero | — |
| **Tus decisiones de alcance** (las anoto en el contexto cuando me las digas): | | | |
| — ¿iOS entra en alcance? Si sí → spike aparte | #8 | | ✅ decisión |
| — ¿i18n es requisito? ¿Qué idiomas? | #11 | | ✅ decisión |
| — ¿Cuándo disMouth y AdMouse? ¿Tenés specs? | #6 | | ✅ decisión |
| — ¿Cuántos dispositivos pre-R009 quedan? → fecha de fin de soporte legacy | #9 | | ✅ decisión |

**Salida de Fase 0:** backend documentado y versionado, assets livianos, decisiones
tomadas, y confirmado si la tablet sirve.

---

### Fase 1 — Red de seguridad · ~2 sesiones

Tiene que ir **antes** del refactor modular. Todo es trabajo mío; vos revisás y mergeás.

| Tarea | Puntos | Nota |
|---|---|---|
| Añadir `package.json`, **Vite** (build de sitio estático), **ESLint** + **Prettier**, **TypeScript** en modo laxo (`allowJs`, `checkJs`) | #2 | el sitio publicado no cambia |
| Extraer la **capa de protocolo** a un módulo puro `src/protocol.ts`: `buildCfg()`, `buildArrows()`, `parseLine()`, tablas de keycodes | #2, #10 | sin tocar UI todavía |
| Tests unitarios (**Vitest**) de `protocol.ts`: comando ↔ respuesta, todos los presets de `FACTORY_CMDS`, ida y vuelta de `devCfg` | #2 | corren sin hardware |
| GitHub Actions: lint + tests + build en cada push; deploy a Pages desde el artefacto (reemplaza el deploy directo de rama) | infra | necesito que me habilites Pages → "GitHub Actions" en Settings del repo |

**Salida de Fase 1:** lo más crítico (el protocolo) tiene tests que corren **sin
hardware**, y el pipeline valida cada cambio antes de que lo mergees.

---

### Fase 2 — Modularización + i18n · ~5–8 sesiones

El bloque grande. Trabajo mío, cortado en pedazos que puedas revisar de a poco.

| Tarea | Puntos | Nota |
|---|---|---|
| Partir `index.html` en módulos ES bajo `src/`: `serial/`, `ble/`, `protocol/`, `presets/`, `supabase/`, `products/`, `ui/`. El `index.html` queda como cáscara + `<div id="app">` | #1 | por módulo, no "big bang" |
| Mover `PRODUCTS`, `PRESET_TABS`, `FACTORY_CMDS`, `FACTORY_CARDS`, `TIP_CONTENT` a datos separados (`src/products/*.ts`) | #1 | |
| Extraer **todos los strings visibles** a `src/i18n/es.json` + helper `t(key)`. Sistema listo aunque haya un solo idioma | #11 | se hace **acá**, tocando los mismos archivos |
| Subir el `tsconfig` a `strict` módulo por módulo a medida que se migran | #2 | |

**De vos en esta fase:** una prueba rápida con hardware al final de cada pedazo grande
(que conectar/leer/aplicar sigue andando), y revisar los diffs antes de mergear.

**Nota:** el build de Vite sigue produciendo un sitio estático → GitHub Pages no cambia.
Mantenemos el `index.html` legacy servible hasta que el modular esté a la par.

**Salida de Fase 2:** código en módulos con tipos, datos separados del código, y todos
los textos en un diccionario.

---

### Fase 3 — Backend robusto · ~2 sesiones (puede ir en paralelo con Fase 2)

| Tarea | Puntos | Yo | Vos |
|---|---|---|---|
| Modelo de presets: `id` estable (uuid) por preset, columna `updated_at` | #3 | redacto la migración | aplicás en Supabase |
| Reemplazar `pushAllPresetsToSupa` (delete-all + insert-all) por **upsert por id** + delete selectivo | #3 | código entero | — |
| Conflicto multi-dispositivo: "último `updated_at` gana" por preset, no por lista completa | #3 | código entero | probar con la app abierta en dos lados |
| Migraciones SQL versionadas (`db/migrations/`) + README actualizado | #4 | las escribo | aplicarlas y confirmar |

**Salida de Fase 3:** guardar un preset ya no puede borrar los demás; la nube y dos
dispositivos abiertos a la vez no se pisan.

---

### Fase 4 — Protocolo versionado · depende del firmware

El firmware está en otro repo. Si lo tocás vos, esto es coordinación con vos mismo; si lo
toca otra persona, hay que acordarlo con esa persona antes de empezar.

| Tarea | Puntos | Yo | Vos |
|---|---|---|---|
| Diseñar que `WHO` (o un comando nuevo) reporte **versión de protocolo**, ej. `OK:WHO:disMouse:R019:PROTO2` | #10 | propongo el formato | validás y lo implementás en el firmware |
| En la app: capa de **capabilities por versión de protocolo** — qué comandos/campos se usan según `PROTO` | #10 | código entero | — |
| Fecha de fin de soporte (de Fase 0) cumplida → eliminar la tabla de keycodes **legacy** de `REV_KEY` | #9 | lo hago | confirmás que ya no hay dispositivos pre-R009 activos |

**Salida de Fase 4:** la app puede hablarle distinto a dispositivos viejos y nuevos, y el
mapeo de teclas deja de estar duplicado.

---

### Fase 5 — Cierre de funcionalidad prometida · encaja en el proyecto mayor

| Tarea | Puntos | Yo | Vos |
|---|---|---|---|
| Construir la **sección Actualizaciones**: cómo ver la versión, links de descarga de firmware, instrucciones de flasheo por producto | #5 | armo la página | me pasás el contenido: links y pasos reales por producto |
| Completar **disMouth** y **AdMouse** como productos en `PRODUCTS` | #6 | código entero | me pasás specs: botones, layout, presets |
| (Si iOS quedó en alcance) spike de app nativa / companion para iPad | #8 | investigo opciones | decidís si vale la inversión |

---

## 5. Resumen de secuencia

```
Fase 0  [decisiones + quick wins]   #4(parte) #7 #12 #8(decisión)
   │
Fase 1  [red de seguridad]          #2 + CI              ← bloquea Fase 2
   │
   ├── Fase 2  [modularización]      #1 #11 #2(strict)
   │
   └── Fase 3  [backend]             #3 #4(completo)      ← en paralelo con Fase 2
   │
Fase 4  [protocolo versionado]      #10 #9               ← necesita firmware
   │
Fase 5  [funcionalidad prometida]   #5 #6 #8(spike)      ← scope proyecto mayor
```

**Núcleo técnico (Fases 0–3):** del orden de ~10–14 sesiones mías, repartidas según tu
disponibilidad para probar y revisar. El calendario lo marcás vos, no las horas de código.
**Fases 4–5:** dependen del firmware y de tus decisiones de alcance; no se fechan todavía.

---

## 6. Riesgos del propio plan

- **Vos sos el cuello de botella:** el plan avanza al ritmo en que puedas probar con
  hardware, revisar diffs y aplicar SQL en Supabase. Si eso se espacia mucho, los pedazos
  a medio migrar (Fase 2) conviven con el legacy más tiempo del ideal. Mitigación: cortar
  la Fase 2 en pedazos chicos y cerrar cada uno antes de abrir el siguiente.
- **Refactor sin parar el mundo (#1):** por módulos, con el `index.html` legacy servible
  hasta que el modular esté a la par. Nada de "big bang".
- **Fase 4 depende del firmware:** si el firmware no reporta versión de protocolo, #10 y
  #9 quedan trabados. Definilo pronto (aunque la implementación en firmware venga después).
- **i18n tardío (#11):** si se posterga después del refactor, hay que volver a tocar todos
  los archivos. Por eso va **dentro** de la Fase 2, no después.
- **Tests después del refactor:** invertir el orden (Fase 1 antes que Fase 2) es
  innegociable; refactorizar sin red es cómo se rompió la sync de git el 2026-09-07.
