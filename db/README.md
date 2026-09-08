# Base de datos (Supabase)

El backend es un proyecto Supabase: `https://lhpewyblvjijpmcxzcod.supabase.co`
(URL y anon key están en `index.html` — la anon key es pública por diseño; la
seguridad real la dan las políticas RLS de abajo).

## Migraciones

`db/migrations/NNN_*.sql` — correr en orden en el **SQL Editor** de Supabase.
Cada archivo es idempotente. No hay tooling automático todavía; se aplican a mano
y se anota la fecha en el encabezado del archivo.

| # | Qué hace | Aplicada |
|---|---|---|
| 001 | `presets`: `id` uuid PK + `updated_at` + trigger + índice `user_id` | 2026-09-08 |

## Esquema (estado al 2026-09-08)

### Tabla `presets` — presets propios del usuario

| columna | tipo | notas |
|---|---|---|
| `id` | uuid | PK (default `gen_random_uuid()`) |
| `user_id` | uuid | FK → `auth.users(id)` ON DELETE CASCADE |
| `name` | text | |
| `date` | text | string de display (`toLocaleDateString('es-AR')`) |
| `cfg` | jsonb | objeto `devCfg` (ver CONTEXTO §8) |
| `notes` | text | |
| `prod_id` | text | id de `PRODUCTS` o null |
| `created_at` | timestamptz | orden |
| `updated_at` | timestamptz | trigger `presets_set_updated_at` en cada UPDATE |

### Tabla `shared_presets` — compartidos y comunidad

Columnas usadas por el código: `id`, `recipient_id`, `sender_email`,
`sender_name`, `name`, `date`, `prod_id`, `cfg`, `notes`, `is_community`,
`created_at`. (No tocada por la Fase 3.)

### Función RPC

- `get_user_id_by_email(p_email text) → uuid` — resuelve un email a `user_id`
  para compartir presets por email (`shareWithUser`).

## Políticas RLS (estado al 2026-09-08)

Exportadas de `pg_policies`. Versionar acá cualquier cambio.

### `presets`

| policyname | cmd | using (`qual`) | with check |
|---|---|---|---|
| usuarios ven sus propios presets | ALL | `auth.uid() = user_id` | `auth.uid() = user_id` |

`ALL` cubre SELECT/INSERT/UPDATE/DELETE — suficiente para el upsert incremental
de `src/presets-store.js`.

### `shared_presets`

| policyname | cmd | using (`qual`) | with check |
|---|---|---|---|
| ver recibidos y comunidad | SELECT | `auth.uid() = recipient_id OR is_community = true` | — |
| insertar compartidos | INSERT | — | `auth.uid() <> recipient_id OR recipient_id IS NULL` |
| eliminar propios | DELETE | `auth.uid() = recipient_id OR sender_email = auth.email()` | — |

> Falta versionar: definición exacta de la RPC `get_user_id_by_email` y las
> policies como CREATE POLICY reproducibles (esto es un volcado legible, no un
> script de recreación).
