-- ============================================================
-- 001 — Fase 3: id estable + updated_at en public.presets
--
-- Aplicada en Supabase el 2026-09-08. Idempotente (se puede correr de nuevo).
-- Sin esta migración, la rama refactor/estructura-fase1 rompe el guardado de
-- presets a la nube (src/presets-store.js espera columnas `id` y `updated_at`).
-- ============================================================

-- 1) id uuid (las filas existentes reciben uno al vuelo)
alter table public.presets
  add column if not exists id uuid not null default gen_random_uuid();

-- 2) id como PRIMARY KEY si la tabla no tiene una
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.presets'::regclass and contype = 'p'
  ) then
    alter table public.presets add constraint presets_pkey primary key (id);
  end if;
end $$;

-- 3) updated_at para resolución "último gana" por preset (uso futuro en cliente)
alter table public.presets
  add column if not exists updated_at timestamptz not null default now();

-- 4) trigger que refresca updated_at en cada UPDATE
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists presets_set_updated_at on public.presets;
create trigger presets_set_updated_at
  before update on public.presets
  for each row execute function public.set_updated_at();

-- 5) índice para el sync por usuario
create index if not exists presets_user_id_idx on public.presets (user_id);
