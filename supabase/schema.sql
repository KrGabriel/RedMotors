create table settings(id int primary key default 1 check(id=1),business_name text default 'Mi Concesionaria',instagram_url text,whatsapp text,location text,accent text default '#e11d48');
insert into settings default values on conflict do nothing;
create table vehicles(
 id uuid primary key default gen_random_uuid(), slug text unique not null,
 brand text not null, model text not null, version text, year int not null, price numeric, currency text default 'ARS',
 mileage int, fuel text, transmission text, color text, body_type text, description text, features text[] default '{}',
 sale_status text not null default 'disponible' check(sale_status in('disponible','reservado','vendido')),
 is_published boolean not null default false, featured boolean not null default false,
 instagram_url text, instagram_media_id text unique, source text default 'manual', sync_status text default 'none',
 published_at timestamptz default now(), updated_at timestamptz default now());
create table vehicle_photos(id uuid primary key default gen_random_uuid(),vehicle_id uuid not null references vehicles on delete cascade,url text not null,position int not null default 0,is_main boolean default false);
create table admin_users(user_id uuid primary key references auth.users on delete cascade);
create function is_admin() returns boolean language sql security definer stable as $$select exists(select 1 from admin_users where user_id=auth.uid())$$;
alter table settings enable row level security; alter table vehicles enable row level security;
alter table vehicle_photos enable row level security; alter table admin_users enable row level security;
create policy "lee config" on settings for select using(true);
create policy "admin config" on settings for all using(is_admin()) with check(is_admin());
create policy "publico ve publicados" on vehicles for select using(is_published or is_admin());
create policy "admin vehiculos" on vehicles for all using(is_admin()) with check(is_admin());
create policy "fotos publicas" on vehicle_photos for select using(exists(select 1 from vehicles v where v.id=vehicle_id and (v.is_published or is_admin())));
create policy "admin fotos" on vehicle_photos for all using(is_admin()) with check(is_admin());
create policy "admin se ve" on admin_users for select using(user_id=auth.uid());
-- Storage: crear bucket público "vehicle-photos"; escritura solo para is_admin().
-- Alta del admin: insert into admin_users select id from auth.users where email='TU@EMAIL';
