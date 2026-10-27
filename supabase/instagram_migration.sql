-- Migración incremental. NO reemplaza schema.sql. Ejecutar después de admin_migration.sql.
alter table public.vehicle_photos add column if not exists source_media_id text;
create unique index if not exists photos_source_uq on public.vehicle_photos(vehicle_id,source_media_id) where source_media_id is not null;

-- Token de Meta: RLS activa y SIN políticas + sin permisos => solo la función de servidor (service_role) lo lee.
create table if not exists public.instagram_connection(id int primary key default 1 check(id=1),ig_user_id text,username text,access_token text,expires_at timestamptz,connected_at timestamptz,last_sync_at timestamptz,last_error text);
create table if not exists public.instagram_posts(
 id uuid primary key default gen_random_uuid(), ig_media_id text unique not null, caption text, media_type text, product_type text, permalink text, posted_at timestamptz,
 thumbnail_url text, media jsonb not null default '[]', status text not null default 'detectada' check(status in('detectada','importada','ignorada')),
 vehicle_id uuid references public.vehicles on delete set null, unavailable boolean not null default false, caption_changed boolean not null default false,
 last_error text, first_seen_at timestamptz default now(), last_seen_at timestamptz default now());
create table if not exists public.instagram_sync_log(id uuid primary key default gen_random_uuid(),started_at timestamptz default now(),finished_at timestamptz,trigger text,ok boolean,fetched int default 0,new_posts int default 0,message text);
alter table public.instagram_connection enable row level security;
alter table public.instagram_posts enable row level security;
alter table public.instagram_sync_log enable row level security;
revoke all on public.instagram_connection,public.instagram_posts,public.instagram_sync_log from anon,authenticated;
grant select on public.instagram_posts,public.instagram_sync_log to authenticated;
grant update(status,vehicle_id) on public.instagram_posts to authenticated;
drop policy if exists "ig posts leer" on public.instagram_posts; drop policy if exists "ig posts editar" on public.instagram_posts; drop policy if exists "ig log leer" on public.instagram_sync_log;
create policy "ig posts leer" on public.instagram_posts for select to authenticated using(public.is_admin());
create policy "ig posts editar" on public.instagram_posts for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "ig log leer" on public.instagram_sync_log for select to authenticated using(public.is_admin());
